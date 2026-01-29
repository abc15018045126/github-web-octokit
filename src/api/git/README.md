# 🚀 GitHub Mobile Git API (Octokit Powered)

This is an industrial-grade, auto-correcting Git API layer designed for Capacitor-based mobile applications. It simplifies complex Git operations (Pull, Push, Sync) into easy-to-use functions that handle mobile file system quirks and common user input errors.

## 🛠️ Required Dependencies

To use this API in your project, ensure these libraries are installed:

```bash
npm install octokit jszip js-sha256 buffer
npm install @capacitor/filesystem @capacitor/core
```

---

## 🏗️ Core Architecture (The 7 Modules)

1.  **`index.ts`**: The Brain. Handles SHA calculation, repository URL auto-correction, and `.git` metadata layout.
2.  **`login.ts`**: Authentication handler.
3.  **`fetch.ts`**: Status checker (Ahead/Behind/Dirty).
4.  **`pull.ts`**: Mirroring logic (Downloads ZIP, prunes deleted files).
5.  **`push.ts`**: Committing logic (Uses Git Data API: Tree -> Commit -> Ref).
6.  **`sync.ts`**: High-level two-way sync (Pull then Push).
7.  **`forceSync.ts`**: Recovery logic (Force overwrite local or remote).

---

## 🌟 Powerful Auto-Correction Features

You only need **Token** and **Remote Link**. Everything else is optional and smartly defaulted.

### 1. Smart URL Parsing
Input format flexibility:
- `https://github.com/octokit/octokit.js` (Standard)
- `github.com/octokit/octokit.js` (No protocol)
- `octokit/octokit.js` (Shorthand)
- `octokit.js` (**Auto-detects current user** as owner)
- `.../tree/dev` (Auto-detects branch as `dev`)

### 2. Default Pathing
If `localPath` is not provided, it defaults to:
`Documents/github/[repoName]`

### 3. Default Branching
If no branch is specified in the URL or parameter, the API performs a real-time cloud check to find the repository's **default branch** (main/master/etc).

---

## 📖 API Usage Guide

### 1. Simple One-Click Sync
```typescript
import { GitApi } from './api/git';

// That's it! It will sync to Documents/github/my-notes using default branch.
await GitApi.smartSync(token, "my-notes");
```

### 2. Manual Fetch & Pull
```typescript
const status = await GitApi.fetch(token, "owner/repo");

if (status.isAhead) {
    await GitApi.pull(token, "owner/repo", null, null, (progress) => {
        console.log(progress); // "Downloading...", "Extracting...", etc.
    });
}
```

### 3. Destruction Recovery (Force Sync)
```typescript
// Wipe local folder and re-download everything from remote
await GitApi.forceSync(token, "url", null, "main", "remote");
```

### 4. Scheduled Auto-Sync (Cron)
```typescript
import { GitApi } from './api/git';

// Sync every 30 minutes
GitApi.scheduler.schedule('sync-task', '*/30 * * * *', async () => {
    console.log("Auto-syncing...");
    await GitApi.smartSync(token, "my-repo");
});

// Stop the task
// GitApi.scheduler.stop('sync-task');
```

---

## 🔧 How to Modify / Extend

- **Change Metadata Layout**: If you want to change where `.git` info is stored, edit `saveState` and `loadState` in `index.ts`.
- **Change Default Path**: Modify the `resolveLocalPath` logic inside `resolveRepoInfo` in `index.ts`.
- **Custom Push Logic**: Edit `push.ts`. It currently uses the Git Data API for atomicity. If you want to support LFS or huge files, you might need to implement chunked blob uploads.
- **Scheduler Precision**: The `scheduler.ts` currently checks every 60 seconds. You can decrease the interval in `setInterval` if you need second-level precision (unlikely for Git).

---

## ⚠️ Important Notes for Mobile
- **Buffer/Encoding**: Always use the provided `Buffer` for ZIP handling to ensure binary compatibility on Android/iOS.
- **Recursive Writes**: All `Filesystem` calls use `recursive: true` to handle folder nesting automatically.
