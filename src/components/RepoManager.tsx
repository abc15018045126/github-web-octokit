import React, { useState, useEffect } from 'react';
import {
    GitBranch, Folder, Clock, RefreshCw, MoreVertical,
    Trash2, CloudDownload, CloudUpload, Zap,
    ChevronLeft, Timer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitApi } from '../api/git';

interface ManagedRepo {
    id: string;
    owner: string;
    repo: string;
    localPath: string;
    lastSync: string;
    cron?: string;
}

export const RepoManager: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [repos, setRepos] = useState<ManagedRepo[]>([]);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [syncingId, setSyncingId] = useState<string | null>(null);
    const [syncStatus, setSyncStatus] = useState<string>('');

    useEffect(() => {
        // Find all local paths stored in localStorage
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
    }, []);

    const handleSync = async (repo: ManagedRepo) => {
        const token = localStorage.getItem('github_token');
        if (!token) return alert('Token missing');

        setSyncingId(repo.id);
        setSyncStatus('Syncing...');
        try {
            await GitApi.smartSync(token, `${repo.owner}/${repo.repo}`, repo.localPath, "Quick Sync from Manager");
            const now = new Date().toLocaleString();
            localStorage.setItem(`git_last_sync_${repo.id}`, now);
            setRepos(prev => prev.map(r => r.id === repo.id ? { ...r, lastSync: now } : r));
            setSyncStatus('Done!');
        } catch (e: any) {
            alert(`Sync Failed: ${e.message}`);
        } finally {
            setTimeout(() => {
                setSyncingId(null);
                setSyncStatus('');
            }, 1500);
        }
    };

    const handleForceSync = async (repo: ManagedRepo, mode: 'remote' | 'local') => {
        const token = localStorage.getItem('github_token');
        if (!token || !window.confirm(`Are you sure you want to FORCE ${mode} sync? This is destructive.`)) return;

        setSyncingId(repo.id);
        try {
            await GitApi.forceSync(token, `${repo.owner}/${repo.repo}`, repo.localPath, undefined, mode, (p) => setSyncStatus(p));
            const now = new Date().toLocaleString();
            localStorage.setItem(`git_last_sync_${repo.id}`, now);
            setRepos(prev => prev.map(r => r.id === repo.id ? { ...r, lastSync: now } : r));
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSyncingId(null);
            setSyncStatus('');
        }
    };

    const handleSetCron = (repo: ManagedRepo) => {
        const cron = window.prompt("Enter Cron expression (e.g. */30 * * * * for every 30m):", repo.cron || "");
        if (cron !== null) {
            if (cron) {
                localStorage.setItem(`git_cron_${repo.id}`, cron);
                // In a real app, we'd trigger the scheduler here. 
                // For now we persist it.
                alert("Cron saved. Requirement: Restart app to active background threads.");
            } else {
                localStorage.removeItem(`git_cron_${repo.id}`);
            }
            setRepos(prev => prev.map(r => r.id === repo.id ? { ...r, cron: cron || undefined } : r));
        }
    };

    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            style={{ position: 'fixed', inset: 0, background: 'var(--bg-color)', zIndex: 200, display: 'flex', flexDirection: 'column' }}
        >
            <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-color)', background: 'var(--surface-color)' }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', padding: '4px' }}>
                    <ChevronLeft size={24} />
                </button>
                <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Managed Repositories</h2>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {repos.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>
                        No local repositories found.
                    </div>
                ) : (
                    repos.map(repo => (
                        <div key={repo.id} className="card" style={{ marginBottom: '16px', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <GitBranch size={16} color="var(--accent-color)" />
                                        <span style={{ fontWeight: 600, fontSize: '15px' }}>{repo.owner}/{repo.repo}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                        <Folder size={12} />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{repo.localPath}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                        <Clock size={12} />
                                        <span>Last sync: {repo.lastSync}</span>
                                    </div>
                                    {repo.cron && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#79c0ff', marginTop: '4px' }}>
                                            <Timer size={12} />
                                            <span>Cron: {repo.cron}</span>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
                                    <button
                                        className="btn-primary"
                                        style={{ padding: '6px 10px', borderRadius: '6px', height: '32px' }}
                                        onClick={() => handleSync(repo)}
                                        disabled={!!syncingId}
                                    >
                                        <RefreshCw size={14} className={syncingId === repo.id ? 'spin' : ''} />
                                        <span style={{ fontSize: '12px' }}>Sync</span>
                                    </button>
                                    <button
                                        style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        onClick={() => setActiveMenu(activeMenu === repo.id ? null : repo.id)}
                                    >
                                        <MoreVertical size={16} />
                                    </button>
                                </div>
                            </div>

                            <AnimatePresence>
                                {activeMenu === repo.id && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        style={{ overflow: 'hidden', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}
                                    >
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', padding: '8px 0' }}>
                                            <MenuBtn icon={<CloudDownload size={14} />} label="Pull" onClick={() => { }} />
                                            <MenuBtn icon={<CloudUpload size={14} />} label="Push" onClick={() => { }} />
                                            <MenuBtn icon={<Zap size={14} />} label="Force Remote" color="#ff7b72" onClick={() => handleForceSync(repo, 'remote')} />
                                            <MenuBtn icon={<Zap size={14} />} label="Force Local" color="#ff7b72" onClick={() => handleForceSync(repo, 'local')} />
                                            <MenuBtn icon={<Timer size={14} />} label="Schedule" onClick={() => handleSetCron(repo)} />
                                            <MenuBtn icon={<Trash2 size={14} />} label="Remove History" onClick={() => { }} />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {syncingId === repo.id && (
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', zIndex: 10 }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <RefreshCw size={24} className="spin" style={{ marginBottom: '8px' }} />
                                        <div style={{ fontSize: '12px' }}>{syncStatus}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </motion.div>
    );
};

const MenuBtn: React.FC<{ icon: React.ReactNode, label: string, onClick: () => void, color?: string }> = ({ icon, label, onClick, color }) => (
    <button
        onClick={onClick}
        style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)',
            borderRadius: '6px', color: color || 'white', fontSize: '12px', textAlign: 'left'
        }}
    >
        {icon}
        {label}
    </button>
);
