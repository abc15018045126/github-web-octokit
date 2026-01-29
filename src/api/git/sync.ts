import { pull } from './pull';
import { push } from './push';
import { type ProgressCallback } from './index';

/**
 * 5. SYNC API
 * One-click Pull followed by Push with smart path resolution.
 */
export async function sync(
    token: string,
    remoteInput: string,
    localPath?: string | null,
    commitMessage: string = "Mobile Sync",
    branchOverride?: string,
    onProgress?: ProgressCallback
) {
    onProgress?.('Syncing from Remote...');
    await pull(token, remoteInput, localPath, branchOverride, onProgress);

    onProgress?.('Syncing to Remote...');
    await push(token, remoteInput, localPath, commitMessage, branchOverride);

    onProgress?.('Sync Complete!');
}
