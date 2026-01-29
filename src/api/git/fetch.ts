import { resolveRepoInfo, loadState, getChangeList, type SyncStatus } from './index';

/**
 * 2. FETCH API
 * Smart detection of remote and local status with auto-correction.
 */
export async function fetch(
    token: string,
    remoteInput: string,
    localPath?: string | null,
    branchOverride?: string
): Promise<SyncStatus> {
    const { owner, repo, branch: defaultBranch, octokit, resolvedPath } = await resolveRepoInfo(token, remoteInput, localPath);
    const branch = branchOverride || defaultBranch;
    const path = resolvedPath;

    const { data: refData } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`
    });
    const remoteSha = refData.object.sha;

    const manifest = await loadState(path, branch);
    const localSha = manifest.commitSha;

    const changes = await getChangeList(path, branch);

    return {
        remoteSha,
        localSha,
        isAhead: remoteSha !== localSha,
        isDirty: changes.length > 0
    };
}
