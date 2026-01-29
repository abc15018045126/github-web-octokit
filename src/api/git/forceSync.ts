import { Filesystem } from '@capacitor/filesystem';
import { pull } from './pull';
import { push } from './push';
import { resolveRepoInfo, type ProgressCallback } from './index';

/**
 * 6. FORCE SYNC API
 * Destructive overwrite with smart path resolution.
 * mode: 'remote' (Local = Remote) or 'local' (Remote = Local)
 */
export async function forceSync(
    token: string,
    remoteInput: string,
    localPath?: string | null,
    branchOverride?: string,
    mode: 'remote' | 'local' = 'remote',
    onProgress?: ProgressCallback
) {
    const { resolvedPath } = await resolveRepoInfo(token, remoteInput, localPath);
    const path = resolvedPath;

    if (mode === 'remote') {
        onProgress?.('Cleaning local folder...');
        try {
            const res = await Filesystem.readdir({ path });
            for (const file of res.files) {
                const fullPath = path.endsWith('/') ? `${path}${file.name}` : `${path}/${file.name}`;
                if (file.type === 'directory') {
                    await Filesystem.rmdir({ path: fullPath, recursive: true });
                } else {
                    await Filesystem.deleteFile({ path: fullPath });
                }
            }
        } catch (e) { }

        onProgress?.('Fresh Pulling from Remote...');
        await pull(token, remoteInput, path, branchOverride, onProgress);
    } else {
        onProgress?.('Force Pushing Local Truth to Remote...');
        await push(token, remoteInput, path, "Force Push from App", branchOverride);
    }
}

/**
 * Convienence: Force Remote (Local becomes a mirror of Remote)
 */
export async function forceRemote(token: string, remoteInput: string, localPath?: string | null, branch?: string, onProgress?: ProgressCallback) {
    return forceSync(token, remoteInput, localPath, branch, 'remote', onProgress);
}

/**
 * Convienence: Force Local (Remote becomes a mirror of Local)
 */
export async function forceLocal(token: string, remoteInput: string, localPath?: string | null, branch?: string, onProgress?: ProgressCallback) {
    return forceSync(token, remoteInput, localPath, branch, 'local', onProgress);
}
