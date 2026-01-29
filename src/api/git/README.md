# Git API Library for Capacitor

A powerful, modular, and easy-to-use Git API designed specifically for Capacitor mobile applications. It handles repository resolution, local/remote state tracking, and provides a sleek React UI.

## 🚀 Quick Usage

```typescript
import { GitApi } from './api/git';

// 1. One-button Sync (Fetch + Pull + Push)
await GitApi.smartSync(token, "owner/repo", "/Documents/my-repo");
```

---

## 🛠️ Detailed API Reference

### 1. Authentication
`login(token: string): Promise<UserData>`
- **Purpose**: Validates a GitHub Personal Access Token (PAT).
- **Returns**: User profile information (avatar, login name, etc.).

### 2. Repository Management
`resolveRepoInfo(token: string, input: string, localPath?: string): Promise<RepoInfo>`
- **Inputs**: Full GitHub URL, `owner/repo` string, or just `repo` (if authenticated).
- **Features**: Automatically handles `/tree/branch` URL formats and suggests default local paths.

`getChangeList(localPath: string, branch: string): Promise<FileStatus[]>`
- **Purpose**: Scans the local directory and compares it against the `.git/index` state to detect added, modified, or deleted files.

### 3. Core Git Operations
`fetch(token: string, remote: string, localPath: string): Promise<void>`
- **Purpose**: Updates the remote SHA without modifying local files.

`pull(token: string, remote: string, localPath: string): Promise<void>`
- **Purpose**: Downloads changes from remote and updates local files to match. Performs a "Mirror Sync" (deletes local files removed on remote).

`push(token: string, remote: string, localPath: string, message: string): Promise<void>`
- **Purpose**: Commits all local changes and pushes them to the remote GitHub repository using the Git Data API.

`sync(token: string, remote: string, localPath: string): Promise<void>`
- **Purpose**: Sequential Pull then Push. Safe synchronization.

### 4. Force (Destructive) Operations
`forceRemote(token: string, remote: string, localPath: string): Promise<void>`
- **Result**: **Local = Remote**. Cleans the entire local folder and performs a fresh pull. Any unpushed local changes are **LOST**.

`forceLocal(token: string, remote: string, localPath: string): Promise<void>`
- **Result**: **Remote = Local**. Force-pushes the current local state as the new truth. Overwrites remote history if necessary (destructive).

`forceSync(token: string, remote: string, localPath: string, branch, mode: 'remote'|'local')`
- **Purpose**: The underlying general function for destructive sync modes.

### 5. Automation
`scheduler: GitScheduler`
- **Purpose**: Manage background sync tasks using Cron expressions.
- **Example**: `GitApi.scheduler.addTask("my-repo", "*/30 * * * *", syncFunc)`

---

## 🎨 UI Components

The library includes high-quality React components styled with modern aesthetics.

```typescript
import { RepoManager } from './api/git/ui/RepoManager';

function MySettings() {
    return <RepoManager onBack={() => window.history.back()} />;
}
```

### Features included in `RepoManager`:
- **Search & Filter**: Quickly find managed repositories.
- **Visual Status**: Last sync time, active Cron schedules, and sync status animations.
- **Integrated Login**: Reusable login redirection logic.
- **Destructive Tools**: Simple UI access to Force Remote/Local operations with safety confirmations.

---

## 📝 Implementation Details
- **Storage**: Uses `@capacitor/filesystem` for cross-platform file access.
- **State Tracking**: Maintains a `.git` directory structure containing:
  - `HEAD`: Current branch reference.
  - `refs/heads/`: Branch commit SHAs.
  - `index`: JSON manifest of all tracked file hashes.
- **Efficiency**: Pulls are performed via Zip download for speed; Pushes use specialized tree-building logic to minimize API calls.
