import { useState, useEffect } from 'react'
import { Filesystem } from '@capacitor/filesystem'
import { registerPlugin } from '@capacitor/core'
import { FilePicker } from '@capawesome/capacitor-file-picker'
import { GitHubProvider, useGitHub } from './lib/GitHubProvider'
import { History as HistoryIcon, FileText, Settings, Home } from 'lucide-react'
import { HistoryView } from './components/HistoryView'
import { SettingsView } from './components/SettingsView'
import { RepoSelector } from './components/RepoSelector'
import { GlobalHeader } from './components/GlobalHeader'
import { HomeView } from './components/HomeView'
import { ChangesView } from './components/ChangesView'
import { Login } from './api/git/ui/Login'
import './index.css'

interface OpenFolderPlugin {
  requestAllFilesAccess(): Promise<void>;
  open(): Promise<void>;
  resolveUriToPath(options: { uri: string }): Promise<{ path: string }>;
  listFiles(options: { path: string }): Promise<{ files: any[] }>;
}

const OpenFolder = registerPlugin<OpenFolderPlugin>('OpenFolder');

interface Repo {
  name: string;
  owner: { login: string };
  full_name: string;
  html_url: string;
}

type TabType = 'home' | 'changes' | 'history' | 'settings';

import { I18nProvider, useI18n } from './lib/I18nContext'

function AppContent() {
  const { t } = useI18n();
  const { isAuthenticated, isLoading } = useGitHub();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [localPath, setLocalPath] = useState<string | null>(null);
  const [currentBranch, setCurrentBranch] = useState('main');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      const redirect = localStorage.getItem('git_login_redirect');
      if (redirect === 'repomanager') {
        setActiveTab('settings');
        localStorage.setItem('git_repomanager_auto_open', 'true');
        localStorage.removeItem('git_login_redirect');
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedRepo) {
      const path = localStorage.getItem(`git_local_path_${selectedRepo.full_name}`);
      setLocalPath(path);
    }
  }, [selectedRepo]);

  // 应用启动时立即请求文件管理权限
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const result = await Filesystem.checkPermissions();
        if (result.publicStorage !== 'granted') {
          await Filesystem.requestPermissions();
        }

        // 直接请求所有文件访问权限
        await OpenFolder.requestAllFilesAccess();
      } catch (err) {
        console.error('Permission request failed:', err);
      }
    };

    requestPermissions();
  }, []);

  const handlePickPath = async () => {
    if (!selectedRepo) return;
    try {
      const result = await FilePicker.pickDirectory();
      if (result.path) {
        let finalPath = result.path;

        // 如果是 content:// URI，尝试解析为真实路径
        if (finalPath.startsWith('content://')) {
          try {
            const resolved = await OpenFolder.resolveUriToPath({ uri: finalPath });
            if (resolved && resolved.path && !resolved.path.startsWith('content://')) {
              finalPath = resolved.path;
              console.log('Resolved content URI to:', finalPath);
            }
          } catch (e) {
            console.warn('Path resolution failed on native side, using original', e);
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
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', color: 'var(--text-color)' }}>{t('loading')}</div>;
  }

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', flexDirection: 'column', gap: '20px' }}>
        <div style={{ maxWidth: '400px', width: '90%' }}>
          <Login />
        </div>
        <button
          onClick={async () => {
            try {
              console.log('Requesting file permissions...');
              await OpenFolder.requestAllFilesAccess();
              console.log('Permission request completed');
            } catch (err) {
              console.error('Permission request error:', err);
              alert('Error: ' + JSON.stringify(err));
            }
          }}
          style={{
            padding: '12px 24px',
            background: '#58a6ff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600
          }}
        >
          🔓 Request File Permissions (Test)
        </button>
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
          <span>{t('tab_home')}</span>
        </button>
        <button
          className={`tab-item ${activeTab === 'changes' ? 'active' : ''}`}
          onClick={() => setActiveTab('changes')}
        >
          <FileText size={22} />
          <span>{t('tab_changes')}</span>
        </button>
        <button
          className={`tab-item ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <HistoryIcon size={22} />
          <span>{t('tab_history')}</span>
        </button>
        <button
          className={`tab-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={22} />
          <span>{t('tab_settings')}</span>
        </button>
      </nav>
    </div>
  )
}

function App() {
  return (
    <I18nProvider>
      <GitHubProvider>
        <AppContent />
      </GitHubProvider>
    </I18nProvider>
  )
}

export default App
