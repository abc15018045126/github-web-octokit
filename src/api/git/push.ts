import { Filesystem, Encoding } from '@capacitor/filesystem';
import { resolveRepoInfo, getChangeList, loadState, saveState, computeHash } from './index';

/**
 * 3. PUSH API
 * Commits and pushes local changes with auto-correction for repo and path.
 */
export async function push(
    token: string,
    remoteInput: string,
    localPath?: string | null,
    message: string = "Mobile Push",
    branchOverride?: string
) {
    const { owner, repo, branch: defaultBranch, octokit, resolvedPath } = await resolveRepoInfo(token, remoteInput, localPath);
    const branch = branchOverride || defaultBranch;
    const path = resolvedPath;

    const changes = await getChangeList(path, branch);
    if (changes.length === 0) return;

    const { data: refData } = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${branch}` });
    const parentSha = refData.object.sha;

    const { data: commitData } = await octokit.rest.git.getCommit({ owner, repo, commit_sha: parentSha });
    const baseTreeSha = commitData.tree.sha;

    const treeItems = [];
    for (const change of changes) {
        if (change.status === 'deleted') {
            treeItems.push({ path: change.path, mode: '100644' as const, type: 'blob' as const, sha: null });
            continue;
        }
        const fullPath = path.endsWith('/') ? `${path}${change.path}` : `${path}/${change.path}`;
        const fileRes = await Filesystem.readFile({ path: fullPath, encoding: Encoding.UTF8 });
        treeItems.push({ path: change.path, mode: '100644' as const, type: 'blob' as const, content: fileRes.data as string });
    }

    const { data: newTree } = await octokit.rest.git.createTree({ owner, repo, base_tree: baseTreeSha, tree: treeItems as any });
    const { data: newCommit } = await octokit.rest.git.createCommit({ owner, repo, message, tree: newTree.sha, parents: [parentSha] });
    await octokit.rest.git.updateRef({ owner, repo, ref: `heads/${branch}`, sha: newCommit.sha });

    // Update local manifest
    const manifestData = await loadState(path, branch);
    const manifestFiles = manifestData.files;

    for (const change of changes) {
        if (change.status === 'deleted') {
            delete manifestFiles[change.path];
        } else {
            const fullPath = path.endsWith('/') ? `${path}${change.path}` : `${path}/${change.path}`;
            const fileRes = await Filesystem.readFile({ path: fullPath, encoding: Encoding.UTF8 });
            manifestFiles[change.path] = await computeHash(fileRes.data as string);
        }
    }

    await saveState(path, branch, { files: manifestFiles, commitSha: newCommit.sha });
}
