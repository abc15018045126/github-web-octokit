import { Filesystem } from '@capacitor/filesystem';
import { pull } from './pull';
import { push } from './push';
import { resolveRepoInfo, type ProgressCallback } from './index';

/**
 * 6. FORCE SYNC API
 * Destructive overwrite with smart path resolution.
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

        onProgress?.('Fresh Pulling...');
        await pull(token, remoteInput, path, branchOverride, onProgress);
    } else {
        onProgress?.('Force Pushing Local Truth...');
        await push(token, remoteInput, path, "Force Push from App", branchOverride);
    }
}
