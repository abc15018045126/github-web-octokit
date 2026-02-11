import React, { useState, useEffect } from 'react';
import {
    GitBranch, Folder, Clock, RefreshCw, MoreVertical,
    Trash2, CloudDownload, CloudUpload, Zap,
    ChevronLeft, Timer, Plus, Search, X, Edit2, Check, Settings,
    UserCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitApi } from '../index';
import { useGitHub } from '../../../lib/GitHubProvider';
import { useI18n } from '../../../lib/I18nContext';
import { Login } from './Login';

interface ManagedRepo {
    id: string; // owner/repo
    owner: string;
    repo: string;
    localPath: string;
    lastSync: string;
    cron?: string;
}

export const RepoManager: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { t } = useI18n();
    const { user, logout: ghLogout, isAuthenticated } = useGitHub();

    // State management for repositories and UI
    const [repos, setRepos] = useState<ManagedRepo[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingRepoId, setEditingRepoId] = useState<string | null>(null);
    const [editPath, setEditPath] = useState('');
    const [showHeaderMenu, setShowHeaderMenu] = useState(false);

    // Add Form State
    const [addForm, setAddForm] = useState({
        token: localStorage.getItem('github_token') || '',
        url: '',
        path: '',
        branch: ''
    });

    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showGlobalSettings, setShowGlobalSettings] = useState(false);
    const [gapCorrectionEnabled, setGapCorrectionEnabled] = useState(localStorage.getItem('git_gap_correction_enabled') !== 'false');
    const [globalCron, setGlobalCron] = useState(localStorage.getItem('git_global_cron') || '*/60 * * * *');
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [syncingId, setSyncingId] = useState<string | null>(null);
    const [syncStatus, setSyncStatus] = useState<string>('');

    useEffect(() => {
        loadRepos();
    }, []);

    // Missed Sync Recovery (Gap-Correction)
    useEffect(() => {
        if (repos.length > 0 && isAuthenticated && gapCorrectionEnabled) {
            checkMissedSyncs();
        }
    }, [repos.length, isAuthenticated, gapCorrectionEnabled]);

    const checkMissedSyncs = async () => {
        const token = localStorage.getItem('github_token');
        if (!token) return;

        for (const repo of repos) {
            const lastSyncTs = parseInt(localStorage.getItem(`git_last_sync_timestamp_${repo.id}`) || '0');
            if (lastSyncTs === 0) continue; // Skip if never synced before

            const ONE_DAY = 24 * 60 * 60 * 1000;
            const now = Date.now();

            let shouldSync = false;

            if (repo.cron) {
                // Use the actual cron schedule if available
                shouldSync = GitApi.scheduler.shouldHaveRunSince(repo.cron, lastSyncTs);
            } else {
                // FALLBACK: If no cron is set, default to a 24-hour safety update
                shouldSync = (now - lastSyncTs >= ONE_DAY);
            }

            if (shouldSync) {
                console.log(`[Sync Recovery] Repo ${repo.id} triggered catch-up sync.`);
                await handleSync(repo);
            }
        }
    };

    const loadRepos = () => {
        const allKeys = Object.keys(localStorage);
        const repoKeys = allKeys.filter(k => k.startsWith('git_local_path_'));

        const loadedRepos: ManagedRepo[] = repoKeys.map(key => {
            const fullName = key.replace('git_local_path_', '');
            const [owner, repo] = fullName.split('/');
            const path = localStorage.getItem(key) || '';
            const lastSync = localStorage.getItem(`git_last_sync_${fullName}`) || 'Never';
            const cron = localStorage.getItem(`git_cron_${fullName}`) || undefined;
            return { id: fullName, owner, repo, localPath: path, lastSync, cron };
        });

        setRepos(loadedRepos);
    };

    const handleAddRepo = async () => {
        if (!addForm.token || !addForm.url) {
            alert(t('repoman_mandatory') + "!");
            return;
        }

        try {
            setSyncStatus(t('header_fetching'));
            const info = await GitApi.resolveRepoInfo(addForm.token, addForm.url, addForm.path || null);
            const fullName = `${info.owner}/${info.repo}`;

            localStorage.setItem(`git_local_path_${fullName}`, info.resolvedPath);
            if (addForm.token) localStorage.setItem('github_token', addForm.token);

            setShowAddModal(false);
            setAddForm({ ...addForm, url: '', path: '', branch: '' });
            loadRepos();
        } catch (e: any) {
            alert(`Failed: ${e.message}`);
        } finally {
            setSyncStatus('');
        }
    };

    const handleSync = async (repo: ManagedRepo) => {
        const token = localStorage.getItem('github_token');
        if (!token) return alert('Token missing');

        setSyncingId(repo.id);
        setSyncStatus(t('changes_syncing'));
        try {
            await GitApi.smartSync(token, `${repo.owner}/${repo.repo}`, repo.localPath, "Quick Sync from Manager");
            const now = new Date().toLocaleString();
            localStorage.setItem(`git_last_sync_${repo.id}`, now);
            localStorage.setItem(`git_last_sync_timestamp_${repo.id}`, Date.now().toString());
            loadRepos();
            setSyncStatus(t('changes_success'));
        } catch (e: any) {
            alert(`Sync Failed: ${e.message}`);
        } finally {
            setTimeout(() => {
                setSyncingId(null);
                setSyncStatus('');
            }, 1000);
        }
    };

    const handleSyncAll = async () => {
        setShowHeaderMenu(false);
        const token = localStorage.getItem('github_token');
        if (!token) return alert('Token missing');

        const nowTs = Date.now().toString();
        for (const repo of repos) {
            setSyncingId(repo.id);
            setSyncStatus(`${t('changes_syncing')} ${repo.repo}...`);
            try {
                await GitApi.smartSync(token, `${repo.owner}/${repo.repo}`, repo.localPath, "All-Sync from Manager");
                const now = new Date().toLocaleString();
                localStorage.setItem(`git_last_sync_${repo.id}`, now);
                localStorage.setItem(`git_last_sync_timestamp_${repo.id}`, nowTs);
            } catch (e) {
                console.error(`Failed to sync ${repo.id}`, e);
            }
        }
        loadRepos();
        setSyncingId(null);
        setSyncStatus(t('changes_success'));
        setTimeout(() => setSyncStatus(''), 2000);
    };

    const handleScheduleAll = async () => {
        setShowHeaderMenu(false);
        const globalCron = localStorage.getItem('git_global_cron') || '*/60 * * * *';
        if (confirm(`${t('repoman_schedule_all')}? (${globalCron})`)) {
            for (const repo of repos) {
                localStorage.setItem(`git_cron_${repo.id}`, globalCron);
            }
            loadRepos();
        }
    };

    const startEdit = (repo: ManagedRepo) => {
        setEditingRepoId(repo.id);
        setEditPath(repo.localPath);
    };

    const saveEdit = (repoId: string) => {
        localStorage.setItem(`git_local_path_${repoId}`, editPath);
        setEditingRepoId(null);
        loadRepos();
    };

    const handleForceSync = async (repo: ManagedRepo, mode: 'remote' | 'local') => {
        const token = localStorage.getItem('github_token');
        if (!token || !window.confirm(t('header_force_remote_confirm'))) return;

        setSyncingId(repo.id);
        try {
            await GitApi.forceSync(token, `${repo.owner}/${repo.repo}`, repo.localPath, undefined, mode, (p: string) => setSyncStatus(p));
            const now = new Date().toLocaleString();
            localStorage.setItem(`git_last_sync_${repo.id}`, now);
            localStorage.setItem(`git_last_sync_timestamp_${repo.id}`, Date.now().toString());
            loadRepos();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSyncingId(null);
            setSyncStatus('');
        }
    };

    const handleSetCron = (repo: ManagedRepo) => {
        const cron = window.prompt(t('repoman_schedule') + " (Cron):", repo.cron || "");
        if (cron !== null) {
            if (cron) {
                localStorage.setItem(`git_cron_${repo.id}`, cron);
            } else {
                localStorage.removeItem(`git_cron_${repo.id}`);
            }
            loadRepos();
        }
    };

    const filteredRepos = repos.filter(r =>
        r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.localPath.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAccountClick = async () => {
        if (isAuthenticated) {
            if (confirm(t('repoman_logout') + "?")) {
                ghLogout();
                setShowHeaderMenu(false);
            }
        } else {
            localStorage.setItem('git_login_redirect', 'repomanager');
            setShowLoginModal(true);
            setShowHeaderMenu(false);
        }
    };

    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="custom-scrollbar"
            style={{
                position: 'fixed', inset: 0, background: 'var(--bg-color)', zIndex: 200,
                display: 'flex', flexDirection: 'column',
                color: 'var(--text-color)'
            }}
        >
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--accent-color); }
                .repo-input { 
                    width: 100%; padding: 12px; background: rgba(255,255,255,0.05); 
                    border: 1px solid var(--border-color); border-radius: 10px; color: var(--text-color); margin-bottom: 12px;
                    outline: none; transition: border-color 0.2s;
                }
                .repo-input:focus { border-color: var(--accent-color); }
                .header-menu-item {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 14px 16px; width: 100%; background: none; border: none;
                    color: var(--text-color); font-size: 14px; text-align: left; border-bottom: 1px solid var(--border-color);
                }
                .header-menu-item:active { background: rgba(255,255,255,0.1); }
                .card { background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            `}</style>

            {/* Header */}
            <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-color)', background: 'var(--surface-color)', position: 'relative', zIndex: 10 }}>
                {!isSearching ? (
                    <>
                        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-color)', padding: '4px' }}>
                            <ChevronLeft size={24} />
                        </button>
                        <h2 style={{ fontSize: '18px', fontWeight: 600, flex: 1 }}>{t('repoman_title')}</h2>
                        <button onClick={() => setIsSearching(true)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}>
                            <Search size={20} />
                        </button>
                        <button onClick={() => setShowHeaderMenu(!showHeaderMenu)} style={{ background: 'none', border: 'none', color: 'var(--text-color)', padding: '4px' }}>
                            <MoreVertical size={24} />
                        </button>
                    </>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <Search size={18} color="var(--text-muted)" />
                        <input
                            autoFocus
                            placeholder={t('repoman_search')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-color)', outline: 'none', fontSize: '16px' }}
                        />
                        <button onClick={() => { setIsSearching(false); setSearchQuery(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}>
                            <X size={20} />
                        </button>
                    </div>
                )}

                <AnimatePresence>
                    {showHeaderMenu && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            style={{
                                position: 'absolute', top: '100%', right: '16px', width: '240px',
                                background: 'var(--surface-color)', borderRadius: '16px',
                                boxShadow: '0 12px 48px rgba(0,0,0,0.6)', overflow: 'hidden',
                                border: '1px solid var(--border-color)', marginTop: '8px'
                            }}
                        >
                            {/* Account Section */}
                            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {isAuthenticated ? (
                                        <>
                                            <img src={user?.avatar_url} style={{ width: '40px', height: '40px', borderRadius: '50%' }} alt="u" />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-color)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.login}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Verified User</div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <UserCircle size={24} color="var(--text-muted)" />
                                            </div>
                                            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{t('repoman_account')}</div>
                                        </>
                                    )}
                                </div>
                                <button
                                    onClick={handleAccountClick}
                                    style={{ width: '100%', marginTop: '12px', padding: '8px', background: isAuthenticated ? 'rgba(255,0,0,0.1)' : 'var(--accent-color)', color: isAuthenticated ? '#ff7b72' : 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}
                                >
                                    {isAuthenticated ? t('repoman_logout') : t('repoman_login')}
                                </button>
                            </div>

                            <button className="header-menu-item" onClick={() => { setShowHeaderMenu(false); setShowAddModal(true); }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Plus size={18} />
                                    <span>{t('repoman_add_repo')}</span>
                                </div>
                            </button>
                            <button className="header-menu-item" onClick={handleSyncAll}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <RefreshCw size={18} />
                                    <span>{t('repoman_sync_all')}</span>
                                </div>
                            </button>
                            <button className="header-menu-item" onClick={handleScheduleAll}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Timer size={18} />
                                    <span>{t('repoman_schedule_all')}</span>
                                </div>
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowHeaderMenu(false);
                                        setShowGlobalSettings(true);
                                    }}
                                    style={{ padding: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}
                                >
                                    <Settings size={14} />
                                </div>
                            </button>

                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* List */}
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '16px' }} onClick={() => setShowHeaderMenu(false)}>
                {filteredRepos.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>
                        {searchQuery ? t('repoman_no_results') : t('repoman_no_repos')}
                    </div>
                ) : (
                    filteredRepos.map(repo => (
                        <div key={repo.id} className="card" style={{ marginBottom: '16px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                        <GitBranch size={16} color="var(--accent-color)" />
                                        <span style={{ fontWeight: 600, fontSize: '15px' }}>{repo.owner}/{repo.repo}</span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                                        <Folder size={12} />
                                        {editingRepoId === repo.id ? (
                                            <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                                                <input
                                                    value={editPath}
                                                    onChange={(e) => setEditPath(e.target.value)}
                                                    style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: '1px solid var(--accent-color)', borderRadius: '4px', color: 'var(--text-color)', padding: '2px 6px', fontSize: '11px', outline: 'none' }}
                                                />
                                                <button onClick={() => saveEdit(repo.id)} style={{ padding: '2px', color: '#3fb950', background: 'none', border: 'none' }}>
                                                    <Check size={14} />
                                                </button>
                                                <button onClick={() => setEditingRepoId(null)} style={{ padding: '2px', color: 'var(--danger-color)', background: 'none', border: 'none' }}>
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, overflow: 'hidden' }}>
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{repo.localPath}</span>
                                                <button onClick={() => startEdit(repo)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: '2px' }}>
                                                    <Edit2 size={12} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                        <Clock size={12} />
                                        <span>{t('repoman_last_sync')}: {repo.lastSync}</span>
                                    </div>
                                    {repo.cron && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#79c0ff', marginTop: '4px', background: 'rgba(121, 192, 255, 0.1)', padding: '2px 6px', borderRadius: '4px', width: 'fit-content' }}>
                                            <Timer size={10} />
                                            <span>{t('repoman_auto_sync')}: {repo.cron}</span>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
                                    <button
                                        className="btn-primary"
                                        style={{ padding: '6px 12px', borderRadius: '8px', height: '36px', minWidth: '70px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                        onClick={() => handleSync(repo)}
                                        disabled={!!syncingId}
                                    >
                                        <RefreshCw size={14} className={syncingId === repo.id ? 'spin' : ''} />
                                        <span style={{ fontSize: '13px', fontWeight: 500 }}>{t('repoman_sync')}</span>
                                    </button>
                                    <button
                                        style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        onClick={() => setActiveMenu(activeMenu === repo.id ? null : repo.id)}
                                    >
                                        <MoreVertical size={18} />
                                    </button>
                                </div>
                            </div>

                            <AnimatePresence>
                                {activeMenu === repo.id && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        style={{ overflow: 'hidden', borderTop: '1px solid var(--border-color)', marginTop: '8px' }}
                                    >
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', padding: '12px 0 4px 0' }}>
                                            <MenuBtn icon={<CloudDownload size={14} />} label={t('repoman_pull')} onClick={() => { }} />
                                            <MenuBtn icon={<CloudUpload size={14} />} label={t('repoman_push')} onClick={() => { }} />
                                            <MenuBtn icon={<Zap size={14} />} label={t('repoman_force_remote')} color="#ff7b72" onClick={() => handleForceSync(repo, 'remote')} />
                                            <MenuBtn icon={<Zap size={14} />} label={t('repoman_force_local')} color="#ff7b72" onClick={() => handleForceSync(repo, 'local')} />
                                            <MenuBtn icon={<Timer size={14} />} label={t('repoman_schedule')} onClick={() => handleSetCron(repo)} />
                                            <MenuBtn icon={<Trash2 size={14} />} label={t('repoman_remove')} color="var(--danger-color)" onClick={() => {
                                                if (confirm(t('repoman_remove') + "?")) {
                                                    localStorage.removeItem(`git_local_path_${repo.id}`);
                                                    loadRepos();
                                                }
                                            }} />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {syncingId === repo.id && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', zIndex: 10 }}
                                >
                                    <div style={{ textAlign: 'center' }}>
                                        <RefreshCw size={28} className="spin" style={{ marginBottom: '12px', color: 'var(--accent-color)' }} />
                                        <div style={{ fontSize: '14px', fontWeight: 500, color: 'white' }}>{syncStatus}</div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Add Repo Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}
                        onClick={() => setShowAddModal(false)}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                width: '100%', background: 'var(--surface-color)',
                                borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
                                padding: '24px', borderTop: '1px solid var(--border-color)',
                                paddingBottom: 'max(24px, env(safe-area-inset-bottom))'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '20px', fontWeight: 700 }}>{t('repoman_add_repo')}</h3>
                                <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}><X size={24} /></button>
                            </div>

                            <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>{t('repoman_mandatory')}</label>
                            <input
                                className="repo-input"
                                placeholder={t('repoman_token')}
                                type="password"
                                value={addForm.token}
                                onChange={(e) => setAddForm({ ...addForm, token: e.target.value })}
                            />
                            <input
                                className="repo-input"
                                placeholder={t('repoman_url')}
                                value={addForm.url}
                                onChange={(e) => setAddForm({ ...addForm, url: e.target.value })}
                            />

                            <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block', marginTop: '8px' }}>{t('repoman_optional')}</label>
                            <input
                                className="repo-input"
                                placeholder={t('repoman_path')}
                                value={addForm.path}
                                onChange={(e) => setAddForm({ ...addForm, path: e.target.value })}
                            />
                            <input
                                className="repo-input"
                                placeholder={t('repoman_branch')}
                                value={addForm.branch}
                                onChange={(e) => setAddForm({ ...addForm, branch: e.target.value })}
                            />

                            <button
                                onClick={handleAddRepo}
                                className="btn-primary"
                                style={{ width: '100%', padding: '16px', borderRadius: '12px', fontSize: '16px', fontWeight: 600, marginTop: '12px' }}
                            >
                                {t('repoman_add_init')}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {syncStatus && !showAddModal && !syncingId && (
                <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: 'var(--accent-color)', color: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '12px', zIndex: 400, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                    <RefreshCw size={14} className="spin" />
                    {syncStatus}
                </div>
            )}

            {/* Login Modal */}
            <AnimatePresence>
                {showLoginModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => setShowLoginModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: '90%', maxWidth: '400px', background: 'var(--bg-color)', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--border-color)' }}
                        >
                            <Login onSuccess={() => setShowLoginModal(false)} />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Global Settings Modal */}
            <AnimatePresence>
                {showGlobalSettings && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => setShowGlobalSettings(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: '90%', maxWidth: '400px', background: 'var(--bg-color)', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--border-color)', padding: '24px' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{t('repoman_global_settings')}</h3>
                                <button onClick={() => setShowGlobalSettings(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}><X size={20} /></button>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>{t('repo_manager_global_cron')}</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        className="repo-input"
                                        style={{ marginBottom: 0 }}
                                        value={globalCron}
                                        onChange={(e) => setGlobalCron(e.target.value)}
                                    />
                                    <button
                                        className="btn-primary"
                                        style={{ padding: '0 16px', borderRadius: '10px' }}
                                        onClick={() => {
                                            localStorage.setItem('git_global_cron', globalCron);
                                            alert(t('changes_success'));
                                        }}
                                    >
                                        {t('common_save')}
                                    </button>
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{t('repoman_gap_correction')}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{t('repoman_gap_correction_desc')}</div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const next = !gapCorrectionEnabled;
                                            setGapCorrectionEnabled(next);
                                            localStorage.setItem('git_gap_correction_enabled', next.toString());
                                        }}
                                        style={{
                                            width: '44px', height: '24px', borderRadius: '12px',
                                            background: gapCorrectionEnabled ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)',
                                            border: 'none', position: 'relative', transition: 'all 0.2s',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div style={{
                                            width: '18px', height: '18px', borderRadius: '50%', background: 'white',
                                            position: 'absolute', top: '3px', left: gapCorrectionEnabled ? '23px' : '3px',
                                            transition: 'all 0.2s'
                                        }} />
                                    </button>
                                </div>
                                <button
                                    className="btn-primary"
                                    style={{ width: '100%', marginTop: '12px', height: '36px', fontSize: '13px', borderRadius: '8px' }}
                                    onClick={() => {
                                        setShowGlobalSettings(false);
                                        checkMissedSyncs();
                                    }}
                                >
                                    {t('repoman_run_check_now')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const MenuBtn: React.FC<{ icon: React.ReactNode, label: string, onClick: () => void, color?: string }> = ({ icon, label, onClick, color }) => (
    <button
        onClick={onClick}
        style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)',
            borderRadius: '10px', color: color || 'var(--text-color)', fontSize: '12px', textAlign: 'left',
            transition: 'background 0.2s',
            fontWeight: 500
        }}
    >
        {icon}
        <span>{label}</span>
    </button>
);
