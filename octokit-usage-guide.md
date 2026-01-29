# Octokit.js Usage Guide for GitHub Web Octokit

This document outlines the specific Octokit.js API patterns and endpoints used in this project to implement Git-like functionality (Sync, Push, Pull, Status) using official GitHub REST APIs.

## 1. Authentication & Initialization
We use a Personal Access Token (PAT) for authentication.

```typescript
import { Octokit } from "octokit";

const octokit = new Octokit({ auth: token });
// Get authenticated user
const { data: user } = await octokit.rest.users.getAuthenticated();
```

## 2. Sync Status Perception (Fetch)
To detect if the local repository is out of sync with the remote, we compare the local commit SHA with the remote branch Ref.

### Get Remote Branch SHA
Used in `GitManager.fetchStatus` to see if the remote has new commits.
```typescript
const { data: refData } = await octokit.rest.git.getRef({
  owner,
  repo,
  ref: `heads/${branch}`,
});
const remoteSha = refData.object.sha;
```

## 3. Pulling Changes (Download)
We use the Zipball API to download the entire repository at once, which is the most reliable way to sync on mobile.

### Download ZIP Archive
Used in `GitManager.pull`.
```typescript
const response = await octokit.rest.repos.downloadZipballArchive({
  owner,
  repo,
  ref: branch,
});
// Note: On mobile, we manually use CapacitorHttp for the actual binary download
// to bypass CORS and handle large binary streams reliably.
```

## 4. Pushing Changes (Commit & Push)
Pushing is implemented using the Git Data API, creating a new commit on top of the current branch.

### Step 1: Get Parent Commit & Tree
```typescript
const { data: refData } = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${branch}` });
const parentSha = refData.object.sha;

const { data: commitData } = await octokit.rest.git.getCommit({ owner, repo, commit_sha: parentSha });
const baseTreeSha = commitData.tree.sha;
```

### Step 2: Create a New Tree
We construct a new tree containing modified, added, or deleted files.
```typescript
const { data: newTree } = await octokit.rest.git.createTree({
  owner,
  repo,
  base_tree: baseTreeSha,
  tree: [
    { path: 'file.txt', mode: '100644', type: 'blob', content: 'new content' },
    { path: 'deleted.txt', mode: '100644', type: 'blob', sha: null } // Delete pattern
  ],
});
```

### Step 3: Create Commit & Update Ref
```typescript
const { data: newCommit } = await octokit.rest.git.createCommit({
  owner,
  repo,
  message: "Commit message",
  tree: newTree.sha,
  parents: [parentSha],
});

await octokit.rest.git.updateRef({
  owner,
  repo,
  ref: `heads/${branch}`,
  sha: newCommit.sha,
});
```

## 5. Repository & Branch Exploration
Used in `RepoSelector` and `GlobalHeader`.

### List User Repositories
```typescript
const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
  sort: 'updated',
  per_page: 100
});
```

### List Branches
```typescript
const { data: branches } = await octokit.rest.repos.listBranches({
  owner,
  repo,
});
```

## 6. Future Considerations (File Editing)
To read raw file content without downloading the whole ZIP.

### Get Raw Content
```typescript
const { data } = await octokit.rest.repos.getContent({
  owner,
  repo,
  path,
  mediaType: { format: "raw" },
});
```
