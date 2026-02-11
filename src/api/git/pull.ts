import JSZip from 'jszip';
import { Filesystem } from '@capacitor/filesystem';
import { CapacitorHttp } from '@capacitor/core';
import { Buffer } from 'buffer';
import { resolveRepoInfo, loadState, saveState, computeHash, type ProgressCallback } from './index';

/**
 * 4. PULL API
 * Downloads changes with smart path resolution and pruning.
 */
export async function pull(
    token: string,
    remoteInput: string,
    localPath?: string | null,
    branchOverride?: string,
    onProgress?: ProgressCallback
) {
    const { owner, repo, branch: defaultBranch, resolvedPath } = await resolveRepoInfo(token, remoteInput, localPath);
    const branch = branchOverride || defaultBranch;
    const path = resolvedPath;

    const url = `https://api.github.com/repos/${owner}/${repo}/zipball/${branch}`;
    const authHeaders = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'GitHub-Web-Octokit-App'
    };

    onProgress?.('Fetching SHA...');
    const branchRes = await CapacitorHttp.request({
        method: 'GET',
        url: `https://api.github.com/repos/${owner}/${repo}/branches/${branch}`,
        headers: authHeaders
    });
    const currentSha = branchRes.data.commit.sha;

    const oldState = await loadState(path, branch);
    const oldFiles = oldState.files;

    onProgress?.('Downloading ZIP...');
    let response;
    try {
        response = await CapacitorHttp.request({
            method: 'GET',
            url,
            headers: authHeaders,
            responseType: 'arraybuffer'
        });
    } catch (e: any) {
        // console.warn('Initial ZIP download failed, trying fallback URL...', e);
        const fallbackUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`;
        try {
            response = await CapacitorHttp.request({
                method: 'GET',
                url: fallbackUrl,
                headers: authHeaders,
                responseType: 'arraybuffer'
            });
        } catch (e2: any) {
            throw new Error(`Failed to download repository. This is often a network or DNS issue with codeload.github.com. Original error: ${e2.message}`);
        }
    }

    if (!response || response.status !== 200) {
        throw new Error(`Failed to download ZIP (Status: ${response?.status}). GitHub might be blocking the request or the branch name is incorrect.`);
    }

    let zipData: ArrayBuffer | Uint8Array;
    if (typeof response.data === 'string') zipData = Buffer.from(response.data, 'base64');
    else if (response.data instanceof ArrayBuffer) zipData = response.data;
    else zipData = new Uint8Array(response.data);

    onProgress?.('Extracting...');
    const zip = await JSZip.loadAsync(zipData);
    const folders = Object.keys(zip.files).filter(p => zip.files[p].dir);
    const filesInZip = Object.keys(zip.files).filter(p => !zip.files[p].dir);
    const rootFolder = folders[0];

    const remoteFilePaths = new Set<string>();
    const newManifestFiles: { [key: string]: string } = {};
    let completed = 0;

    for (const filePath of filesInZip) {
        const relativePath = filePath.replace(rootFolder, '');
        if (!relativePath) continue;
        remoteFilePaths.add(relativePath);

        const fileData = await zip.files[filePath].async('uint8array');
        const contentStr = Buffer.from(fileData).toString('utf8');
        newManifestFiles[relativePath] = await computeHash(contentStr);

        await Filesystem.writeFile({
            path: path.endsWith('/') ? `${path}${relativePath}` : `${path}/${relativePath}`,
            data: Buffer.from(fileData).toString('base64'),
            recursive: true
        });

        completed++;
        if (completed % 10 === 0) onProgress?.(`Progress: ${((completed / filesInZip.length) * 100).toFixed(0)}%`);
    }

    onProgress?.('Pruning...');
    for (const syncedPath of Object.keys(oldFiles)) {
        if (!remoteFilePaths.has(syncedPath)) {
            try {
                const fullPath = path.endsWith('/') ? `${path}${syncedPath}` : `${path}/${syncedPath}`;
                await Filesystem.deleteFile({ path: fullPath });
            } catch (e) { }
        }
    }

    await saveState(path, branch, { files: newManifestFiles, commitSha: currentSha });
    onProgress?.('Done!');
}
