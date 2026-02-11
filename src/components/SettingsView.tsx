import React from 'react';
import { useGitHub } from '../lib/GitHubProvider';
import { LogOut, User, Github, ExternalLink, HardDrive, Globe } from 'lucide-react';
import { RepoManager } from '../api/git/ui/RepoManager';
import { AnimatePresence } from 'framer-motion';
import { useI18n } from '../lib/I18nContext';
import { Browser } from '@capacitor/browser';

export const SettingsView: React.FC = () => {
    const { t } = useI18n();
    const { user, logout } = useGitHub();
    const [showRepoManager, setShowRepoManager] = React.useState(false);
    const [openMode, setOpenMode] = React.useState<'app' | 'web'>(
        (localStorage.getItem('git_open_mode') as 'app' | 'web') || 'app'
    );

    React.useEffect(() => {
        if (localStorage.getItem('git_repomanager_auto_open') === 'true') {
            setShowRepoManager(true);
            localStorage.removeItem('git_repomanager_auto_open');
        }
    }, []);

    const toggleOpenMode = () => {
        const next = openMode === 'app' ? 'web' : 'app';
        setOpenMode(next);
        localStorage.setItem('git_open_mode', next);
    };

    const handleOpenProfile = () => {
        if (!user) return;
        const url = user.html_url;
        if (openMode === 'web') {
            window.open(`${url}?mobile=0`, '_system');
        } else {
            Browser.open({ url });
        }
    };

    if (!user) return null;

    return (
        <div style={{ padding: '16px' }}>
            <AnimatePresence>
                {showRepoManager && (
                    <RepoManager onBack={() => setShowRepoManager(false)} />
                )}
            </AnimatePresence>
            <div className="card" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <img src={user.avatar_url} style={{ width: '64px', height: '64px', borderRadius: '50%' }} alt="profile" />
                <div>
                    <h3 style={{ fontSize: '18px' }}>{user.name || user.login}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>@{user.login}</p>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <User size={20} color="var(--text-muted)" />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 500 }}>{t('settings_public_repos')}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user.public_repos}</div>
                    </div>
                </div>
                <div
                    onClick={() => setShowRepoManager(true)}
                    style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                >
                    <HardDrive size={20} color="var(--accent-color)" />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{t('settings_manage_repos')}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('settings_manage_repos_desc')}</div>
                    </div>
                </div>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Github size={20} color="var(--text-muted)" />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 500 }}>{t('settings_github_profile')}</div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <span
                                onClick={handleOpenProfile}
                                style={{ fontSize: '12px', color: 'var(--accent-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                {t('settings_view_web')} <ExternalLink size={10} />
                            </span>
                        </div>
                    </div>
                </div>

                {/* Open Mode Preference */}
                <div
                    onClick={toggleOpenMode}
                    style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                >
                    <Globe size={20} color="var(--text-muted)" />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 500 }}>{t('settings_ext_links')}</div>
                        <div style={{ fontSize: '12px', color: 'var(--accent-color)', fontWeight: 600 }}>
                            {openMode === 'app' ? t('settings_ext_links_app') : t('settings_ext_links_web')}
                        </div>
                    </div>
                </div>

                <button
                    onClick={logout}
                    style={{
                        width: '100%',
                        padding: '16px',
                        border: 'none',
                        background: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        color: 'var(--danger-color)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 600
                    }}
                >
                    <LogOut size={20} />
                    {t('settings_sign_out')}
                </button>
            </div>

            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', marginTop: '32px' }}>
                GitHub Web Octokit v0.0.4<br />
                Built with Octokit.js
            </p>
        </div>
    );
};
