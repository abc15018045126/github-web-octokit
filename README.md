# GitHub Web Octokit 🚀

> **Modular Git Engine & Reusable UI for Capacitor Mobile Apps**

`github-web-octokit` is a powerful, highly flexible library designed for building Git-connected mobile applications using React and Capacitor. It provides a robust Git API engine and a set of premium UI components that can be "mixed and matched" to create any Git workflow.

---

## 🔥 Key Highlights

- **🧠 Modular Git Engine**: Core functions like `pull`, `push`, `fetch`, and `sync` can be used independently or combined into custom logic.
- **🎨 Mix-and-Match UI**: Every page you see in the standalone APK (Repo Manager, Changes, History, Settings) is available as a reusable component.
- **📱 Built for Mobile**: Specifically optimized for `@capacitor/filesystem`, handling mobile storage permissions and path resolution automatically.
- **🌐 Global i18n**: Built-in support for English and Chinese, with easy expansion to other languages.
- **⚡ Performance**: Optimized diffing algorithms and zip-based pulling for low bandwidth and high speed on mobile devices.

---

## 📦 Installation

```bash
npm install github-web-octokit
```

*Note: Requires `@capacitor/core` and `@capacitor/filesystem` as peer dependencies.*

---

## 🛠️ 1. The Git API (Mental Model)

You can use the `GitApi` as a "Black Box" or cherry-pick specific functions.

### The "Smart" Approach
If you want the library to handle everything (login, path selection, syncing), just use:

```typescript
import { GitApi } from 'github-web-octokit';

// One-line sync: Fetch + Pull (Mirror) + Push
await GitApi.smartSync(token, "owner/repo", "/local/path");
```

### The "Surgical" Approach
Need fine-grained control? Use the individual modules:

```typescript
import { pull, push, fetch, forceRemote } from 'github-web-octokit';

await fetch(token, "owner/repo", path);      // Update SHA only
await pull(token, "owner/repo", path);       // Sync local to remote truth
await forceRemote(token, "owner/repo", path);// DELETE local and redownload
```

---

## 🎨 2. The Reusable UI Components

The library provides high-level components that you can drop into any part of your app. They are fully responsive and support Dark/Light modes.

### 🗂️ RepoManager (Total Control)
The brain of the UI. Manages multiple repositories, cron schedules, and sync status.

```tsx
import { RepoManager } from 'github-web-octokit';

function MyTab() {
  return <RepoManager onBack={() => console.log('Closed')} />;
}
```

### 🔐 Login UI
A premium login experience supporting both Browser OAuth (via Capacitor Browser) and manual Token entry.

```tsx
import { Login } from 'github-web-octokit';

function AuthPage() {
  return <Login title="Custom Welcome" onSuccess={() => goHome()} />;
}
```

---

## 🌟 3. "Mix-and-Match" - Infinite Possibilities

This is the core philosophy of `github-web-octokit`. You aren't just getting an app; you're getting a construction kit.

### Example: Custom Home Dashboard
You can combine the internal views to create a completely new user experience:

```tsx
import { GlobalHeader, HomeView, ChangesView } from 'github-web-octokit';

function MyCustomDashboard() {
  return (
    <div>
      <GlobalHeader repoName="my-docs" owner="dev" />
      <div className="layout-split">
        {/* View local files on the left */}
        <HomeView localPath="/docs" />
        
        {/* Keep track of changes on the right */}
        <ChangesView localPath="/docs" repoName="my-docs" owner="dev" />
      </div>
    </div>
  );
}
```

**Available Modular Components:**
- `<HomeView />`: File explorer for the local repo.
- `<ChangesView />`: Diff viewer and commit interface.
- `<HistoryView />`: Commit history list.
- `<RepoSelector />`: Beautiful repo picking interface.
- `<SettingsView />`: Profile and management hub.
- `<GlobalHeader />`: Integrated repo status and action menu.

---

## 🌍 Internationalization (i18n)

The library includes a global `I18nProvider`. Wrapping your app in it ensures all internal strings (and your own) follow the chosen language.

```tsx
import { I18nProvider, useI18n } from 'github-web-octokit';

function Root() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}

// Access in your own components:
const { t, setLang, lang } = useI18n();
console.log(t('loading')); // "Loading..." or "加载中..."
```

---

## ⚙️ Requirements & Permissions

On Android/iOS, you must ensure the following permissions are handled in your native project:

**Android (`AndroidManifest.xml`):**
```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.MANAGE_EXTERNAL_STORAGE" />
```

---

## 📜 License

MIT © [Octokit Contributors]
