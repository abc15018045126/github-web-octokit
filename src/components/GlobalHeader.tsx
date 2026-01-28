import React, { useState, useEffect } from 'react';
import { ChevronDown, RefreshCw, GitBranch, ShieldCheck, ArrowUp, ArrowDown, ExternalLink, FolderOpen, Plus, Search } from 'lucide-react';
import { useGitHub } from '../lib/GitHubProvider';
import { Browser } from '@capacitor/browser';
import { motion, AnimatePresence } from 'framer-motion';

interface RepoSummaryProps {
    owner: string;
    repoName: string;
    currentBranch: string;
    localPath: string | null;
    onRefresh: () => void;
    onSelectRepo: () => void;
    onBranchChange: (branch: string) => void;
    onOpenInExplorer: () => void;
}

type SyncState = 'fetch' | 'pull' | 'push' | 'synced';

export const GlobalHeader: React.FC<RepoSummaryProps> = ({
    owner,
    repoName,
    currentBranch,
    localPath,
    onRefresh,
    onSelectRepo,
    onBranchChange,
    onOpenInExplorer
}) => {
    const { octokit } = useGitHub();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [syncState, setSyncState] = useState<SyncState>('fetch');
    const [showBranchMenu, setShowBranchMenu] = useState(false);
    const [branches, setBranches] = useState<string[]>(['main', 'dev', 'feature-login']);
    const [branchSearch, setBranchSearch] = useState('');

    useEffect(() => {
        if (octokit) {
            fetchBranches();
        }
    }, [octokit, owner, repoName]);

    const fetchBranches = async () => {
        try {
            const { data } = await octokit!.rest.repos.listBranches({
                owner,
                repo: repoName,
            });
            setBranches(data.map(b => b.name));
        } catch (e) {
            console.error('Failed to fetch branches', e);
        }
    };

    const handleSyncAction = async () => {
        setIsRefreshing(true);
        await onRefresh();
        setTimeout(() => {
            setIsRefreshing(false);
            const states: SyncState[] = ['fetch', 'pull', 'synced', 'push'];
            const nextIndex = (states.indexOf(syncState) + 1) % states.length;
            setSyncState(states[nextIndex]);
        }, 1500);
    };

    const viewOnGitHub = () => {
        Browser.open({ url: `https://github.com/${owner}/${repoName}` });
    };

    return (
        <div style={{ zIndex: 100, position: 'relative' }}>
            <div style={{
                background: 'var(--header-bg)',
                color: 'white',
                padding: '8px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
                {/* Top Row: Repo & Sync */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div
                        onClick={onSelectRepo}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                    >
                        <div style={{ background: 'rgba(56, 139, 253, 0.15)', padding: '5px', borderRadius: '4px' }}>
                            <ShieldCheck size={16} color="#58a6ff" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase' }}>Current Repository</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '15px', fontWeight: 600 }}>{repoName}</span>
                                <ChevronDown size={14} color="rgba(255,255,255,0.5)" />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleSyncAction}
                        style={{
                            background: 'none', border: 'none', color: 'white', display: 'flex',
                            flexDirection: 'column', alignItems: 'center', cursor: 'pointer', minWidth: '70px'
                        }}
                    >
                        {isRefreshing ? <RefreshCw size={18} className="animate-spin" /> :
                            syncState === 'fetch' ? <RefreshCw size={18} /> :
                                syncState === 'pull' ? <ArrowDown size={18} color="#58a6ff" /> :
                                    syncState === 'push' ? <ArrowUp size={18} color="#2ea043" /> :
                                        <ShieldCheck size={18} color="#238636" />
                        }
                        <span style={{ fontSize: '10px', marginTop: '2px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                            {isRefreshing ? 'Syncing...' : syncState === 'synced' ? 'Synced' : `${syncState.charAt(0).toUpperCase() + syncState.slice(1)} origin`}
                        </span>
                    </button>
                </div>

                {/* Bottom Row: Branch */}
                <div
                    onClick={() => setShowBranchMenu(!showBranchMenu)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', cursor: 'pointer'
                    }}
                >
                    <GitBranch size={16} color="rgba(255,255,255,0.5)" />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase' }}>Current Branch</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 500 }}>{currentBranch}</span>
                            <ChevronDown size={14} color="rgba(255,255,255,0.5)" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions Bar (Right below header) */}
            <AnimatePresence>
                {localPath && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        style={{
                            background: 'var(--surface-color)',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex',
                            padding: '8px 16px',
                            justifyContent: 'flex-end',
                            gap: '16px'
                        }}
                    >
                        <div
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-muted)' }}
                            onClick={onOpenInExplorer}
                        >
                            <FolderOpen size={14} />
                            <span style={{ fontSize: '12px', fontWeight: 500 }}>Explorer</span>
                        </div>
                        <div
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-muted)' }}
                            onClick={viewOnGitHub}
                        >
                            <ExternalLink size={14} />
                            <span style={{ fontSize: '12px', fontWeight: 500 }}>GitHub</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Branch Popover */}
            <AnimatePresence>
                {showBranchMenu && (
                    <>
                        <div
                            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 110 }}
                            onClick={() => setShowBranchMenu(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            style={{
                                position: 'absolute', top: '100px', left: '16px', right: '16px',
                                background: 'var(--surface-color)', border: '1px solid var(--border-color)',
                                borderRadius: '8px', zIndex: 120, boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-color)', borderRadius: '6px', padding: '0 10px', border: '1px solid var(--border-color)' }}>
                                    <Search size={14} color="var(--text-muted)" />
                                    <input
                                        type="text"
                                        placeholder="Filter branches"
                                        value={branchSearch}
                                        onChange={(e) => setBranchSearch(e.target.value)}
                                        style={{ background: 'transparent', border: 'none', color: 'white', padding: '8px', outline: 'none', width: '100%', fontSize: '14px' }}
                                    />
                                </div>
                            </div>

                            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                <div style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>BRANCHES</div>
                                {branches.filter(b => b.includes(branchSearch)).map(b => (
                                    <div
                                        key={b}
                                        onClick={() => { onBranchChange(b); setShowBranchMenu(false); }}
                                        style={{
                                            padding: '10px 16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px',
                                            background: b === currentBranch ? 'rgba(88, 166, 255, 0.1)' : 'transparent',
                                            color: b === currentBranch ? 'var(--accent-color)' : 'white'
                                        }}
                                    >
                                        <GitBranch size={14} />
                                        {b}
                                    </div>
                                ))}

                                <div
                                    style={{
                                        padding: '12px 16px', borderTop: '1px solid var(--border-color)',
                                        display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-color)',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => alert('New branch feature coming soon!')}
                                >
                                    <Plus size={16} />
                                    <span style={{ fontWeight: 600, fontSize: '14px' }}>New branch</span>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
