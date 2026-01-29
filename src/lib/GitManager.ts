import JSZip from 'jszip';
import { Filesystem, Encoding } from '@capacitor/filesystem';
import { CapacitorHttp } from '@capacitor/core';
import { Buffer } from 'buffer';
import { sha256 } from 'js-sha256';
import type { Octokit } from 'octokit';

export interface FileStatus {
    path: string;
    status: 'modified' | 'added' | 'deleted' | 'unmodified';
}

export interface SyncStatus {
    remoteSha: string;
    localSha: string;
    isAhead: boolean;  // Remote has new commits
    isDirty: boolean;  // Local has unsaved changes
}

const GIT_DIR = '.git';

export const GitManager = {
    async computeHash(content: string): Promise<string> {
        return sha256(content);
    },

    /**
     * Standard Git Layout Save:
     * .git/HEAD
     * .git/refs/heads/[branch]
     * .git/index (our manifest)
     */
    async saveState(path: string, branch: string, data: { files: { [key: string]: string }, commitSha: string }) {
        const base = path.endsWith('/') ? path : `${path}/`;
        const gitPath = `${base}${GIT_DIR}`;

        // SAFETY: If .git exists but is a FILE, we must delete it to create a .git FOLDER
        try {
            const stat = await Filesystem.stat({ path: gitPath });
            if (stat.type === 'file') {
                await Filesystem.deleteFile({ path: gitPath });
            }
        } catch (e) {
            // Directory doesn't exist yet, which is fine
        }

        // 1. Ensure .git directory and write .git/HEAD
        await Filesystem.writeFile({
            path: `${base}${GIT_DIR}/HEAD`,
            data: `ref: refs/heads/${branch}`,
            encoding: Encoding.UTF8,
            recursive: true
        });

        // 2. Write .git/refs/heads/[branch]
        await Filesystem.writeFile({
            path: `${base}${GIT_DIR}/refs/heads/${branch}`,
            data: data.commitSha,
            encoding: Encoding.UTF8,
            recursive: true
        });

        // 3. Write .git/index (as our JSON manifest)
        await Filesystem.writeFile({
            path: `${base}${GIT_DIR}/index`,
            data: JSON.stringify(data.files),
            encoding: Encoding.UTF8,
            recursive: true
        });
    },

    async loadState(path: string, branch: string): Promise<{ files: { [key: string]: string }, commitSha: string }> {
        const base = path.endsWith('/') ? path : `${path}/`;
        try {
            // Load SHA from its standard path
            const shaRes = await Filesystem.readFile({
                path: `${base}${GIT_DIR}/refs/heads/${branch}`,
                encoding: Encoding.UTF8
            });
            const commitSha = (shaRes.data as string).trim();

            // Load file hashes from index
            const indexRes = await Filesystem.readFile({
                path: `${base}${GIT_DIR}/index`,
                encoding: Encoding.UTF8
            });
            const files = JSON.parse(indexRes.data as string);

            return { files, commitSha };
        } catch (e) {
            return { files: {}, commitSha: '' };
        }
    },

    /**
     * FETCH: Check remote state using Octokit.js
     */
    async fetchStatus(octokit: Octokit, owner: string, repo: string, branch: string, localPath: string): Promise<SyncStatus> {
        // 1. Get Remote SHA
        const { data: refData } = await octokit.rest.git.getRef({
            owner,
            repo,
            ref: `heads/${branch}`,
        });
        const remoteSha = refData.object.sha;

        // 2. Get Local Manifest (New Layout)
        const manifest = await this.loadState(localPath, branch);
        const localSha = manifest.commitSha;

        // 3. Check for Local Changes (isDirty)
        const localChanges = await this.getChangeList(localPath, branch);

        return {
            remoteSha,
            localSha,
            isAhead: remoteSha !== localSha,
            isDirty: localChanges.length > 0
        };
    },

    async getChangeList(localPath: string, branch: string): Promise<FileStatus[]> {
        const manifest = await this.loadState(localPath, branch);
        const manifestFiles = manifest?.files || {};
        const changes: FileStatus[] = [];
        const currentFiles: { [key: string]: string } = {};

        const scanDir = async (dir: string) => {
            const res = await Filesystem.readdir({ path: dir });
            for (const file of res.files) {
                if (file.name === GIT_DIR) continue; // Filter .git folder
                const fullPath = dir.endsWith('/') ? `${dir}${file.name}` : `${dir}/${file.name}`;

                if (file.type === 'directory') {
                    await scanDir(fullPath);
                } else {
                    const contentRes = await Filesystem.readFile({ path: fullPath, encoding: Encoding.UTF8 });
                    const relativePath = fullPath.replace(localPath, '').replace(/^\//, '');
                    const hash = await this.computeHash(contentRes.data as string);
                    currentFiles[relativePath] = hash;

                    if (!manifestFiles[relativePath]) {
                        changes.push({ path: relativePath, status: 'added' });
                    } else if (manifestFiles[relativePath] !== hash) {
                        changes.push({ path: relativePath, status: 'modified' });
                    }
                }
            }
        };

        try {
            await scanDir(localPath);
        } catch (e) { }

        for (const path of Object.keys(manifestFiles)) {
            if (!currentFiles[path]) {
                changes.push({ path, status: 'deleted' });
            }
        }
        return changes;
    },

    /**
     * PUSH: Push local changes using Octokit Git Data API
     */
    async push(octokit: Octokit, owner: string, repo: string, branch: string, localPath: string, message: string) {
        const changes = await this.getChangeList(localPath, branch);
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
            const fullPath = localPath.endsWith('/') ? `${localPath}${change.path}` : `${localPath}/${change.path}`;
            const fileRes = await Filesystem.readFile({ path: fullPath, encoding: Encoding.UTF8 });
            treeItems.push({ path: change.path, mode: '100644' as const, type: 'blob' as const, content: fileRes.data as string });
        }

        const { data: newTree } = await octokit.rest.git.createTree({ owner, repo, base_tree: baseTreeSha, tree: treeItems as any });
        const { data: newCommit } = await octokit.rest.git.createCommit({ owner, repo, message, tree: newTree.sha, parents: [parentSha] });
        await octokit.rest.git.updateRef({ owner, repo, ref: `heads/${branch}`, sha: newCommit.sha });

        // After push, update local manifest to new SHA (New Layout)
        const manifestData = await this.loadState(localPath, branch);
        const manifestFiles = manifestData.files;

        for (const change of changes) {
            if (change.status === 'deleted') {
                delete manifestFiles[change.path];
            } else {
                const fullPath = localPath.endsWith('/') ? `${localPath}${change.path}` : `${localPath}/${change.path}`;
                const fileRes = await Filesystem.readFile({ path: fullPath, encoding: Encoding.UTF8 });
                manifestFiles[change.path] = await this.computeHash(fileRes.data as string);
            }
        }

        await this.saveState(localPath, branch, {
            files: manifestFiles,
            commitSha: newCommit.sha
        });
    },

    /**
     * PULL: Sync download using Official ZIP API
     */
    async pull(token: string, owner: string, repo: string, branch: string, localPath: string, onProgress?: (p: string) => void) {
        onProgress?.('Fetching remote SHA...');
        // We need the commit SHA to store in manifest
        // This is a direct Octokit pattern: get branch info first
        const url = `https://api.github.com/repos/${owner}/${repo}/zipball/${branch}`;

        // 1. Load the state AFTER the last sync (The "Reference" list)
        const oldState = await this.loadState(localPath, branch);
        const oldManifestFiles = oldState.files; // These are files that WERE synced last time

        onProgress?.('Downloading ZIP...');
        const authHeaders = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json', 'User-Agent': 'GitHub-Web-Octokit-App' };
        const branchRes = await CapacitorHttp.request({ method: 'GET', url: `https://api.github.com/repos/${owner}/${repo}/branches/${branch}`, headers: authHeaders });
        const currentSha = branchRes.data.commit.sha;

        const response = await CapacitorHttp.request({ method: 'GET', url: url, headers: authHeaders, responseType: 'arraybuffer' });

        let zipData: ArrayBuffer | Uint8Array;
        if (typeof response.data === 'string') zipData = Buffer.from(response.data, 'base64');
        else if (response.data instanceof ArrayBuffer) zipData = response.data;
        else zipData = new Uint8Array(response.data);

        onProgress?.('Extracting...');
        const zip = await JSZip.loadAsync(zipData);
        const folders = Object.keys(zip.files).filter(path => zip.files[path].dir);
        const filesInZip = Object.keys(zip.files).filter(path => !zip.files[path].dir);
        const rootFolder = folders[0];

        const remoteFilePaths = new Set<string>();
        const newManifestFiles: { [key: string]: string } = {};
        let completed = 0;

        for (const filePath of filesInZip) {
            const relativePath = filePath.replace(rootFolder, '');
            if (!relativePath) continue;

            remoteFilePaths.add(relativePath); // We saw this on remote

            const fileData = await zip.files[filePath].async('uint8array');
            const contentStr = Buffer.from(fileData).toString('utf8');
            newManifestFiles[relativePath] = await this.computeHash(contentStr);

            // Write the file (Update existing or Create new from remote)
            await Filesystem.writeFile({
                path: localPath.endsWith('/') ? `${localPath}${relativePath}` : `${localPath}/${relativePath}`,
                data: Buffer.from(fileData).toString('base64'),
                recursive: true
            });

            completed++;
            if (completed % 10 === 0) onProgress?.(`Progress: ${((completed / filesInZip.length) * 100).toFixed(0)}%`);
        }

        // --- SMART PRUNING ---
        // We ONLY delete a local file if:
        // 1. It was present in our last sync (oldManifestFiles)
        // 2. AND It is NOT present in the new remote ZIP (remoteFilePaths)
        onProgress?.('Pruning remote-deleted files...');
        for (const syncedFilePath of Object.keys(oldManifestFiles)) {
            if (!remoteFilePaths.has(syncedFilePath)) {
                try {
                    const fullPath = localPath.endsWith('/') ? `${localPath}${syncedFilePath}` : `${localPath}/${syncedFilePath}`;
                    await Filesystem.deleteFile({ path: fullPath });
                    console.log(`Pruned remote-deleted file: ${syncedFilePath}`);
                } catch (e) {
                    // File might have been deleted locally already, which is fine
                }
            }
        }

        // Save the new unified state
        await this.saveState(localPath, branch, { files: newManifestFiles, commitSha: currentSha });
        onProgress?.('Done!');
    }
};
