import React from 'react';
import { useGitHub } from '../lib/GitHubProvider';
import { LogOut, User, Github, ExternalLink, HardDrive, Globe, Sun, Languages } from 'lucide-react';
import { RepoManager } from '../api/git/ui/RepoManager';
import { AnimatePresence } from 'framer-motion';
import { useI18n } from '../lib/I18nContext';
import { useTheme } from '../lib/ThemeContext';
import { Browser } from '@capacitor/browser';

export const SettingsView: React.FC = () => {
    const { t, lang, setLang } = useI18n();
    const { theme, setTheme } = useTheme();
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

    const languages = [
        { code: 'en', name: 'English', native: 'English' },
        { code: 'zh', name: 'Chinese', native: '中文' },
        { code: 'ar', name: 'Arabic', native: 'العربية' },
        { code: 'fr', name: 'French', native: 'Français' },
        { code: 'ru', name: 'Russian', native: 'Русский' },
        { code: 'es', name: 'Spanish', native: 'Español' },
    ] as const;

    return (
        <div style={{ padding: '16px', paddingBottom: '40px' }}>
            <AnimatePresence>
                {showRepoManager && (
                    <RepoManager onBack={() => setShowRepoManager(false)} />
                )}
            </AnimatePresence>

            {/* Profile Header */}
            <div className="card" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px', padding: '16px' }}>
                <img src={user.avatar_url} style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid var(--border-color)' }} alt="profile" />
                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{user.name || user.login}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>@{user.login}</p>
                </div>
            </div>

            {/* Appearance Section */}
            <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', marginLeft: '4px' }}>
                {t('settings_appearance')}
            </h4>
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Sun size={20} color="var(--text-muted)" />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{t('settings_theme')}</div>
                    </div>
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '4px', gap: '4px' }}>
                        <button
                            onClick={() => setTheme('light')}
                            style={{
                                padding: '6px 12px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 600,
                                background: theme === 'light' ? 'var(--accent-color)' : 'transparent',
                                color: theme === 'light' ? 'white' : 'var(--text-muted)',
                                transition: 'all 0.2s'
                            }}
                        >
                            {t('settings_light')}
                        </button>
                        <button
                            onClick={() => setTheme('dark')}
                            style={{
                                padding: '6px 12px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 600,
                                background: theme === 'dark' ? 'var(--accent-color)' : 'transparent',
                                color: theme === 'dark' ? 'white' : 'var(--text-muted)',
                                transition: 'all 0.2s'
                            }}
                        >
                            {t('settings_dark')}
                        </button>
                    </div>
                </div>

                <div style={{ padding: '16px', borderBottom: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <Languages size={20} color="var(--text-muted)" />
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{t('settings_language')}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                        {languages.map((l) => (
                            <button
                                key={l.code}
                                onClick={() => setLang(l.code as any)}
                                style={{
                                    padding: '10px 8px', borderRadius: '10px', fontSize: '13px', fontWeight: 500,
                                    background: lang === l.code ? 'var(--accent-color)' : 'rgba(255,255,255,0.03)',
                                    color: lang === l.code ? 'white' : 'var(--text-color)',
                                    border: lang === l.code ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                                    transition: 'all 0.2s', textAlign: 'center'
                                }}
                            >
                                <div style={{ fontSize: '14px' }}>{l.native}</div>
                                <div style={{ fontSize: '10px', opacity: 0.7 }}>{l.name}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Repositories Section */}
            <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', marginLeft: '4px' }}>
                {t('tab_home')}
            </h4>
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '16px' }}>
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
                <div style={{ padding: '12px 16px', borderBottom: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            </div>

            {/* Advanced Section */}
            <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', marginLeft: '4px' }}>
                {t('repoman_global_settings')}
            </h4>
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '16px' }}>
                <div
                    onClick={toggleOpenMode}
                    style={{ padding: '12px 16px', borderBottom: 'none', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                >
                    <Globe size={20} color="var(--text-muted)" />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 500 }}>{t('settings_ext_links')}</div>
                        <div style={{ fontSize: '12px', color: 'var(--accent-color)', fontWeight: 600 }}>
                            {openMode === 'app' ? t('settings_ext_links_app') : t('settings_ext_links_web')}
                        </div>
                    </div>
                </div>
            </div>

            {/* Logout Button */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '32px' }}>
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

            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                GitHub Web Octokit v0.0.5<br />
                Built with Octokit.js
            </p>
        </div>
    );
};

