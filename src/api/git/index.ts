import { Octokit } from 'octokit';
import { Filesystem, Encoding } from '@capacitor/filesystem';
import { sha256 } from 'js-sha256';

// --- Types ---

export interface FileStatus {
    path: string;
    status: 'modified' | 'added' | 'deleted' | 'unmodified';
}

export interface SyncStatus {
    remoteSha: string;
    localSha: string;
    isAhead: boolean;
    isDirty: boolean;
}

export type ProgressCallback = (p: string) => void;

// --- Shared Constants ---

export const GIT_DIR = '.git';

// --- Powerful Auto-Correction Parser ---

/**
 * Resolves owner, repo, and branch from various input formats.
 * ALSO: Resolves localPath if not provided (default: Documents/github/repo)
 */
export async function resolveRepoInfo(token: string, input: string, localPath?: string | null) {
    const octokit = new Octokit({ auth: token });
    let owner = '';
    let repo = '';
    let branch = '';

    // 1. Extract branch from /tree/ if present
    const treeMatch = input.match(/\/tree\/([^\/?#]+)/);
    if (treeMatch) {
        branch = treeMatch[1];
        input = input.replace(/\/tree\/[^\/?#]+/, '');
    }

    // 2. Normalize
    let clean = input
        .replace(/^https?:\/\//, '')
        .replace(/^github\.com[\/:]/, '')
        .replace(/\.git$/, '')
        .replace(/\/$/, '');

    const parts = clean.split('/');

    if (parts.length >= 2) {
        owner = parts[0];
        repo = parts[1];
    } else if (parts[0]) {
        repo = parts[0];
        const { data: user } = await octokit.rest.users.getAuthenticated();
        owner = user.login;
    } else {
        throw new Error("Invalid repository input: " + input);
    }

    if (!branch) {
        try {
            const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
            branch = repoData.default_branch;
        } catch (e) { branch = 'main'; }
    }

    // 3. Resolve Default Local Path if missing
    let resolvedPath = localPath;
    if (!resolvedPath) {
        // In Capacitor, we can't easily get the "absolute" string path of Documents without extra calls 
        // but we'll return a path that our other functions can use.
        // For simplicity and consistency with current app logic, we'll suggest a standard folder:
        resolvedPath = `/Documents/github/${repo}`;
    }

    return { owner, repo, branch, octokit, resolvedPath };
}

// --- Shared Utility Functions ---

export async function computeHash(content: string): Promise<string> {
    return sha256(content);
}

export async function saveState(path: string, branch: string, data: { files: { [key: string]: string }, commitSha: string }) {
    const base = path.endsWith('/') ? path : `${path}/`;
    const gitPath = `${base}${GIT_DIR}`;

    try {
        const stat = await Filesystem.stat({ path: gitPath });
        if (stat.type === 'file') {
            await Filesystem.deleteFile({ path: gitPath });
        }
    } catch (e) { }

    await Filesystem.writeFile({
        path: `${base}${GIT_DIR}/HEAD`,
        data: `ref: refs/heads/${branch}`,
        encoding: Encoding.UTF8,
        recursive: true
    });

    await Filesystem.writeFile({
        path: `${base}${GIT_DIR}/refs/heads/${branch}`,
        data: data.commitSha,
        encoding: Encoding.UTF8,
        recursive: true
    });

    await Filesystem.writeFile({
        path: `${base}${GIT_DIR}/index`,
        data: JSON.stringify(data.files),
        encoding: Encoding.UTF8,
        recursive: true
    });
}

export async function loadState(path: string, branch: string): Promise<{ files: { [key: string]: string }, commitSha: string }> {
    const base = path.endsWith('/') ? path : `${path}/`;
    try {
        const shaRes = await Filesystem.readFile({
            path: `${base}${GIT_DIR}/refs/heads/${branch}`,
            encoding: Encoding.UTF8
        });
        const commitSha = (shaRes.data as string).trim();

        const indexRes = await Filesystem.readFile({
            path: `${base}${GIT_DIR}/index`,
            encoding: Encoding.UTF8
        });
        const files = JSON.parse(indexRes.data as string);

        return { files, commitSha };
    } catch (e) {
        return { files: {}, commitSha: '' };
    }
}

export async function getChangeList(localPath: string, branch: string): Promise<FileStatus[]> {
    const manifest = await loadState(localPath, branch);
    const manifestFiles = manifest?.files || {};
    const changes: FileStatus[] = [];
    const currentFiles: { [key: string]: string } = {};

    const scanDir = async (dir: string) => {
        const res = await Filesystem.readdir({ path: dir });
        for (const file of res.files) {
            if (file.name === GIT_DIR) continue;
            const fullPath = dir.endsWith('/') ? `${dir}${file.name}` : `${dir}/${file.name}`;

            if (file.type === 'directory') {
                await scanDir(fullPath);
            } else {
                const contentRes = await Filesystem.readFile({ path: fullPath, encoding: Encoding.UTF8 });
                const relativePath = fullPath.replace(localPath, '').replace(/^\//, '');
                const hash = await computeHash(contentRes.data as string);
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
}

// --- Re-exporting Main Functions ---
export { login } from './ui/git_login';
export { fetch } from './fetch';
export { push } from './push';
export { pull } from './pull';
export { sync } from './sync';
export { forceSync, forceRemote, forceLocal } from './forceSync';
export { GitScheduler } from './scheduler';

import { login } from './ui/git_login';
import { fetch } from './fetch';
import { push } from './push';
import { pull } from './pull';
import { sync } from './sync';
import { forceSync, forceRemote, forceLocal } from './forceSync';
import { GitScheduler } from './scheduler';

/**
 * Smart Entry: If you just call GitApi.smartSync(token, url), it does everything.
 */
export async function smartSync(token: string, url: string, localPath?: string | null, message: string = "Mobile Sync") {
    return sync(token, url, localPath || null, message);
}

export const GitApi = {
    login,
    fetch,
    push,
    pull,
    sync,
    forceSync,
    forceRemote,
    forceLocal,
    smartSync,
    getChangeList,
    resolveRepoInfo,
    scheduler: GitScheduler
};
