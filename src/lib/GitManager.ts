import JSZip from 'jszip';
import { Filesystem, Encoding } from '@capacitor/filesystem';
import { CapacitorHttp } from '@capacitor/core';
import { Buffer } from 'buffer';
import { sha256 } from 'js-sha256';
import type { Octokit } from 'octokit';

// A simple interface for file status
export interface FileStatus {
    path: string;
    status: 'modified' | 'added' | 'deleted' | 'unmodified';
}

const MANIFEST_FILE = '.git_manifest.json';

export const GitManager = {
    /**
     * Check if the directory is "synced" (we check for a hidden marker or just files)
     */
    async checkIsRepo(path: string) {
        if (!path) return false;
        try {
            // We check for any files in the directory
            const result = await Filesystem.readdir({ path });
            return result.files.length > 0;
        } catch (e) {
            return false;
        }
    },

    /**
     * Helper to compute hash of a file content
     */
    computeHash(content: string): string {
        return sha256(content);
    },

    /**
     * Save the manifest state (snapshot of current files)
     */
    async saveManifest(path: string, files: { [key: string]: string }) {
        await Filesystem.writeFile({
            path: path.endsWith('/') ? `${path}${MANIFEST_FILE}` : `${path}/${MANIFEST_FILE}`,
            data: JSON.stringify(files),
            encoding: Encoding.UTF8
        });
    },

    /**
     * Load the manifest state
     */
    async loadManifest(path: string): Promise<{ [key: string]: string }> {
        try {
            const result = await Filesystem.readFile({
                path: path.endsWith('/') ? `${path}${MANIFEST_FILE}` : `${path}/${MANIFEST_FILE}`,
                encoding: Encoding.UTF8
            });
            return JSON.parse(result.data as string);
        } catch (e) {
            return {};
        }
    },

    /**
     * Get changed files by comparing current files with manifest
     * Note: This is an expensive operation as it recursively reads all files.
     * Optimizations can be done, but for now we keep it simple.
     */
    async getStatus(localPath: string): Promise<FileStatus[]> {
        const manifest = await this.loadManifest(localPath);
        const changes: FileStatus[] = [];
        const currentFiles: { [key: string]: string } = {};

        // Helper to recurse
        const scanDir = async (dir: string) => {
            const res = await Filesystem.readdir({ path: dir });
            for (const file of res.files) {
                if (file.name.startsWith('.')) continue; // Ignore dotfiles/dirs
                const fullPath = dir.endsWith('/') ? `${dir}${file.name}` : `${dir}/${file.name}`;

                if (file.type === 'directory') {
                    await scanDir(fullPath);
                } else {
                    // Read file content
                    const contentRes = await Filesystem.readFile({ path: fullPath, encoding: Encoding.UTF8 });
                    const content = contentRes.data as string;
                    const relativePath = fullPath.replace(localPath, '').replace(/^\//, '');
                    const hash = this.computeHash(content);
                    currentFiles[relativePath] = hash;

                    if (!manifest[relativePath]) {
                        changes.push({ path: relativePath, status: 'added' });
                    } else if (manifest[relativePath] !== hash) {
                        changes.push({ path: relativePath, status: 'modified' });
                    }
                }
            }
        };

        try {
            await scanDir(localPath);
        } catch (e) {
            console.error('Scan failed', e);
        }

        // Check for deleted
        for (const path of Object.keys(manifest)) {
            if (!currentFiles[path]) {
                changes.push({ path, status: 'deleted' });
            }
        }

        return changes;
    },

    /**
     * Using Octokit API to push changes
     */
    async pushChanges(
        octokit: Octokit,
        owner: string,
        repo: string,
        branch: string,
        changes: FileStatus[],
        message: string,
        localPath: string
    ) {
        // 1. Get latest commit SHA
        const { data: refData } = await octokit.rest.git.getRef({
            owner,
            repo,
            ref: `heads/${branch}`,
        });
        const latestCommitSha = refData.object.sha;

        // 2. Get the tree SHA of the latest commit
        const { data: commitData } = await octokit.rest.git.getCommit({
            owner,
            repo,
            commit_sha: latestCommitSha,
        });
        const baseTreeSha = commitData.tree.sha;

        // 3. Create Blob for each file
        const treeItems = [];
        for (const change of changes) {
            if (change.status === 'deleted') {
                treeItems.push({
                    path: change.path,
                    mode: '100644' as const,
                    type: 'blob' as const,
                    sha: null // Deletes the file
                });
                continue;
            }

            // Read local file
            const fullPath = localPath.endsWith('/') ? `${localPath}${change.path}` : `${localPath}/${change.path}`;
            const fileRes = await Filesystem.readFile({ path: fullPath, encoding: Encoding.UTF8 });
            const content = fileRes.data as string;

            // We can upload content directly in createTree for text files, or create blobs.
            // createTree has a limit, better to create blobs if content is large.
            // For simplicity, we directly put content if it's text.
            treeItems.push({
                path: change.path,
                mode: '100644' as const,
                type: 'blob' as const,
                content: content
            });
        }

        // 4. Create new tree
        const { data: newTree } = await octokit.rest.git.createTree({
            owner,
            repo,
            base_tree: baseTreeSha,
            tree: treeItems as any,
        });

        // 5. Create new commit
        const { data: newCommit } = await octokit.rest.git.createCommit({
            owner,
            repo,
            message,
            tree: newTree.sha,
            parents: [latestCommitSha],
        });

        // 6. Update Ref
        await octokit.rest.git.updateRef({
            owner,
            repo,
            ref: `heads/${branch}`,
            sha: newCommit.sha,
        });

        // 7. Update local manifest
        const manifest = await this.loadManifest(localPath);
        for (const change of changes) {
            if (change.status === 'deleted') {
                delete manifest[change.path];
            } else {
                const fullPath = localPath.endsWith('/') ? `${localPath}${change.path}` : `${localPath}/${change.path}`;
                const fileRes = await Filesystem.readFile({ path: fullPath, encoding: Encoding.UTF8 });
                manifest[change.path] = this.computeHash(fileRes.data as string);
            }
        }
        await this.saveManifest(localPath, manifest);
    },

    /**
     * Sync download
     */
    async sync(token: string, owner: string, repo: string, branch: string, localPath: string, onProgress?: (p: string) => void) {
        if (!localPath) throw new Error('Local path is not set');

        try {
            onProgress?.('Fetching ZIP from GitHub...');

            const url = `https://api.github.com/repos/${owner}/${repo}/zipball/${branch}`;

            const response = await CapacitorHttp.request({
                method: 'GET',
                url: url,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json',
                    'User-Agent': 'GitHub-Web-Octokit-App'
                },
                responseType: 'arraybuffer'
            });

            if (response.status >= 400) {
                throw new Error(`GitHub API Error: ${response.status} ${response.data ? JSON.stringify(response.data) : ''}`);
            }

            onProgress?.('Processing download...');

            let zipData: ArrayBuffer | Uint8Array;
            if (typeof response.data === 'string') {
                zipData = Buffer.from(response.data, 'base64');
            } else if (response.data instanceof ArrayBuffer) {
                zipData = response.data;
            } else {
                zipData = new Uint8Array(response.data);
            }

            onProgress?.('Extracting files...');
            const zip = await JSZip.loadAsync(zipData);

            const folders = Object.keys(zip.files).filter(path => zip.files[path].dir);
            const files = Object.keys(zip.files).filter(path => !zip.files[path].dir);

            const rootFolder = folders[0];

            let completed = 0;
            const manifest: { [key: string]: string } = {};

            for (const filePath of files) {
                const relativePath = filePath.replace(rootFolder, '');
                if (!relativePath) continue;

                // Skip binary file hashing for manifest optimization in this demo? No, we need it.
                // We read as text to hash for simple text comparison. Binary hashing is trickier with JS strings.
                // For this demo, let's assume text mainly.
                const fileData = await zip.files[filePath].async('uint8array');
                const contentStr = Buffer.from(fileData).toString('utf8');
                manifest[relativePath] = this.computeHash(contentStr);

                const base64Content = Buffer.from(fileData).toString('base64');

                const fullLocalPath = localPath.endsWith('/') ? `${localPath}${relativePath}` : `${localPath}/${relativePath}`;

                await Filesystem.writeFile({
                    path: fullLocalPath,
                    data: base64Content,
                    recursive: true
                });

                completed++;
                if (completed % 10 === 0 || completed === files.length) {
                    onProgress?.(`Syncing: ${((completed / files.length) * 100).toFixed(0)}%`);
                }
            }

            // Save manifest
            await this.saveManifest(localPath, manifest);

            // Create dummy .git
            await Filesystem.writeFile({
                path: localPath.endsWith('/') ? `${localPath}.git` : `${localPath}/.git`,
                data: Buffer.from('GitHub Octokit Sync Marker').toString('base64')
            });

            onProgress?.('Synced!');
        } catch (error: any) {
            console.error('Octokit Sync failed:', error);
            throw new Error(`Sync failed: ${error.message}`);
        }
    }
};
