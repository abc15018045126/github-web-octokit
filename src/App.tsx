import { useState, useEffect } from 'react'
import { Filesystem } from '@capacitor/filesystem'
import { registerPlugin } from '@capacitor/core'
import { FilePicker } from '@capawesome/capacitor-file-picker'
import { GitHubProvider, useGitHub } from './lib/GitHubProvider'
import { History as HistoryIcon, FileText, Settings, Github, Home } from 'lucide-react'
import { HistoryView } from './components/HistoryView'
import { SettingsView } from './components/SettingsView'
import { RepoSelector } from './components/RepoSelector'
import { GlobalHeader } from './components/GlobalHeader'
import { HomeView } from './components/HomeView'
import { ChangesView } from './components/ChangesView'
import './index.css'

interface ExternalStoragePermissionPlugin {
  requestAllFilesAccess(): Promise<void>;
  checkAllFilesAccess(): Promise<{ granted: boolean }>;
  resolveUriToPath(options: { uri: string }): Promise<{ path: string }>;
}

const ExternalStoragePermission = registerPlugin<ExternalStoragePermissionPlugin>('ExternalStoragePermission');

interface Repo {
  name: string;
  owner: { login: string };
  full_name: string;
  html_url: string;
}

type TabType = 'home' | 'changes' | 'history' | 'settings';

function AppContent() {
  const { isAuthenticated, login, isLoading, openWebLogin } = useGitHub();
  const [tokenInput, setTokenInput] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [localPath, setLocalPath] = useState<string | null>(null);
  const [currentBranch, setCurrentBranch] = useState('main');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (selectedRepo) {
      const path = localStorage.getItem(`git_local_path_${selectedRepo.full_name}`);
      setLocalPath(path);
    }
  }, [selectedRepo]);

  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const result = await Filesystem.checkPermissions();
        if (result.publicStorage !== 'granted') {
          await Filesystem.requestPermissions();
        }

        const { granted } = await ExternalStoragePermission.checkAllFilesAccess();
        if (!granted) {
          await ExternalStoragePermission.requestAllFilesAccess();
        }
      } catch (err) {
        console.error('Permission request failed:', err);
      }
    };

    if (isAuthenticated) {
      requestPermissions();
    }
  }, [isAuthenticated]);

  const handlePickPath = async () => {
    if (!selectedRepo) return;
    try {
      const result = await FilePicker.pickDirectory();
      if (result.path) {
        let finalPath = result.path;
        if (finalPath.startsWith('content://')) {
          try {
            const resolved = await ExternalStoragePermission.resolveUriToPath({ uri: finalPath });
            finalPath = resolved.path;
          } catch (e) {
            console.warn('Path resolution failed, using original', e);
          }
        }

        setLocalPath(finalPath);
        localStorage.setItem(`git_local_path_${selectedRepo.full_name}`, finalPath);
      }
    } catch (error) {
      console.error('Pick path failed', error);
    }
  };

  const handleOpenExplorer = () => {
    if (localPath) {
      alert(`Opening Local Explorer: ${localPath}`);
    } else {
      handlePickPath();
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (isLoading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', color: 'var(--text-color)' }}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
        <div className="card" style={{ maxWidth: '400px', width: '90%', textAlign: 'center' }}>
          <Github size={48} style={{ marginBottom: '16px', color: 'var(--text-color)' }} />
          <h2 style={{ marginBottom: '8px' }}>GitHub Web Octokit</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '14px' }}>Sign in to access your repositories</p>

          <button
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '16px', height: '48px', fontSize: '16px' }}
            onClick={openWebLogin}
          >
            Login via Browser
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0', color: 'var(--border-color)' }}>
            <div style={{ flex: 1, height: '1px', background: 'currentColor' }}></div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>OR USE TOKEN</span>
            <div style={{ flex: 1, height: '1px', background: 'currentColor' }}></div>
          </div>

          <input
            type="password"
            placeholder="Paste your Personal Access Token here"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '12px', background: 'var(--bg-color)', color: 'inherit' }}
          />
          <button
            className="btn"
            style={{ width: '100%', background: 'var(--surface-color)', border: '1px solid var(--border-color)' }}
            onClick={() => login(tokenInput)}
          >
            Connect with Token
          </button>

          <p style={{ marginTop: '24px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6', textAlign: 'left', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
            <strong>💡 小白提示：</strong><br />
            1. 点击“Login via Browser”会在浏览器打开 GitHub。<br />
            2. 点击页面底部的绿按钮 <strong>Generate Token</strong>。<br />
            3. 复制生成的令牌（ghp_xxx），回到这里粘贴到上方框内即可。
          </p>
        </div>
      </div>
    );
  }

  if (!selectedRepo) {
    return <RepoSelector onSelect={(repo) => setSelectedRepo(repo as any)} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg-color)' }}>
      <GlobalHeader
        owner={selectedRepo.owner.login}
        repoName={selectedRepo.name}
        currentBranch={currentBranch}
        localPath={localPath}
        onRefresh={handleRefresh}
        onSelectRepo={() => setSelectedRepo(null)}
        onBranchChange={setCurrentBranch}
        onOpenInExplorer={handleOpenExplorer}
        onPickPath={handlePickPath}
        refreshKey={refreshKey}
      />

      <main className="mobile-content" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {activeTab === 'home' && (
          <HomeView
            key={refreshKey} // Force remount on sync
            localPath={localPath}
            onPathSelect={handlePickPath}
          />
        )}
        {activeTab === 'changes' && (
          <ChangesView
            currentBranch={currentBranch}
            localPath={localPath}
            owner={selectedRepo.owner.login}
            repoName={selectedRepo.name}
            onRefresh={handleRefresh}
          />
        )}
        {activeTab === 'history' && <HistoryView owner={selectedRepo.owner.login} repo={selectedRepo.name} />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      <nav className="mobile-tab-bar">
        <button
          className={`tab-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <Home size={22} />
          <span>Home</span>
        </button>
        <button
          className={`tab-item ${activeTab === 'changes' ? 'active' : ''}`}
          onClick={() => setActiveTab('changes')}
        >
          <FileText size={22} />
          <span>Changes</span>
        </button>
        <button
          className={`tab-item ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <HistoryIcon size={22} />
          <span>History</span>
        </button>
        <button
          className={`tab-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={22} />
          <span>Settings</span>
        </button>
      </nav>
    </div>
  )
}

function App() {
  return (
    <GitHubProvider>
      <AppContent />
    </GitHubProvider>
  )
}

export default App
