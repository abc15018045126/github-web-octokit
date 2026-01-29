import React, { useState, useEffect } from 'react';
import { ChevronDown, RefreshCw, GitBranch, ShieldCheck, Search, MoreHorizontal, ArrowDown, ExternalLink, FolderOpen, Download } from 'lucide-react';
import { GitApi } from '../api/git';
import type { SyncStatus } from '../api/git';
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
    onPickPath: () => void;
    refreshKey?: number;
}

export const GlobalHeader: React.FC<RepoSummaryProps> = ({
    owner,
    repoName,
    currentBranch,
    localPath,
    onRefresh,
    onSelectRepo,
    onBranchChange,
    onOpenInExplorer,
    onPickPath,
    refreshKey
}) => {
    const { octokit, token } = useGitHub();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [status, setStatus] = useState<SyncStatus | null>(null);
    const [syncStatusText, setSyncStatusText] = useState('');
    const [showBranchMenu, setShowBranchMenu] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [branches, setBranches] = useState<string[]>(['main']);
    const [branchSearch, setBranchSearch] = useState('');

    const remoteUrl = `https://github.com/${owner}/${repoName}.git`;

    useEffect(() => {
        if (octokit) {
            fetchBranches();
            if (localPath) handleFetch();
        }
    }, [octokit, owner, repoName, localPath, refreshKey]);

    const fetchBranches = async () => {
        try {
            const { data } = await octokit!.rest.repos.listBranches({
                owner,
                repo: repoName,
            });
            if (Array.isArray(data)) {
                setBranches(data.map((b: any) => b.name));
            }
        } catch (e) {
            console.error('Failed to fetch branches', e);
        }
    };

    const handleFetch = async () => {
        if (!token || !localPath) return; // GitApi needs token
        setIsRefreshing(true);
        setSyncStatusText('Fetching...');
        try {
            const s = await GitApi.fetch(token, remoteUrl, localPath, currentBranch);
            if (s) setStatus(s);
        } catch (e) {
            console.error('Fetch failed', e);
        } finally {
            setIsRefreshing(false);
            setSyncStatusText('');
        }
    };

    const handleSyncAction = async () => {
        if (!localPath || !token) {
            if (!localPath) onPickPath();
            return;
        }

        setIsRefreshing(true);
        try {
            if (status?.isAhead && status?.isDirty) {
                // SYNC: Integrated in GitApi
                setSyncStatusText('Syncing...');
                await GitApi.sync(token, remoteUrl, localPath, 'Two-way sync from Mobile', currentBranch, setSyncStatusText);
            } else if (status?.isAhead) {
                // PULL
                setSyncStatusText('Pulling...');
                await GitApi.pull(token, remoteUrl, localPath, currentBranch, setSyncStatusText);
            } else if (!status) {
                // INITIAL FETCH/CLONE
                setSyncStatusText('Fetching...');
                await GitApi.pull(token, remoteUrl, localPath, currentBranch, setSyncStatusText);
            } else {
                // UP TO DATE
                await handleFetch();
            }
            onRefresh();
            await handleFetch();
        } catch (e: any) {
            alert(`Action Failed: ${e.message}`);
        } finally {
            setIsRefreshing(false);
            setSyncStatusText('');
        }
    };

    const viewOnGitHub = () => {
        Browser.open({ url: `https://github.com/${owner}/${repoName}` });
        setShowMoreMenu(false);
    };

    const getSyncIcon = () => {
        if (isRefreshing) return <RefreshCw size={18} className="animate-spin" />;
        if (!localPath) return <Download size={18} />;
        if (!status) return <RefreshCw size={18} />;
        if (status.isAhead && status.isDirty) return <RefreshCw size={18} color="#e3b341" />;
        if (status.isAhead) return <ArrowDown size={18} color="#58a6ff" />;
        return <ShieldCheck size={18} color="#2ea043" />;
    };

    const getSyncLabel = () => {
        if (isRefreshing) return syncStatusText || 'Loading...';
        if (!localPath) return 'Fetch'; // No path = need to fetch
        if (!status) return 'Fetch';
        if (status.isAhead && status.isDirty) return 'Sync';
        if (status.isAhead) return 'Pull';
        return 'Origin'; // Or 'Synced'
    };

    return (
        <div style={{ zIndex: 100, position: 'relative' }}>
            <div style={{
                background: 'var(--header-bg)', color: 'white', padding: '8px 16px',
                display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div onClick={onSelectRepo} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <div style={{ background: 'rgba(56, 139, 253, 0.15)', padding: '5px', borderRadius: '4px' }}>
                            <ShieldCheck size={16} color="#58a6ff" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>CURRENT REPOSITORY</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '15px', fontWeight: 600 }}>{repoName}</span>
                                <ChevronDown size={14} color="rgba(255,255,255,0.5)" />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleSyncAction}
                        style={{ background: 'none', border: 'none', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', minWidth: '70px' }}
                    >
                        {getSyncIcon()}
                        <span style={{ fontSize: '10px', marginTop: '2px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                            {getSyncLabel()}
                        </span>
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div onClick={() => setShowBranchMenu(!showBranchMenu)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', cursor: 'pointer', flex: 1 }}>
                        <GitBranch size={16} color="rgba(255,255,255,0.5)" />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>BRANCH</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '14px', fontWeight: 500 }}>{currentBranch}</span>
                                <ChevronDown size={14} color="rgba(255,255,255,0.5)" />
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setShowMoreMenu(!showMoreMenu)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MoreHorizontal size={18} />
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>More</span>
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {showBranchMenu && (
                    <>
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 110 }} onClick={() => setShowBranchMenu(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={{ position: 'absolute', top: '100px', left: '16px', right: '16px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 120, overflow: 'hidden' }}>
                            <div style={{ padding: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-color)', borderRadius: '6px', padding: '0 10px', border: '1px solid var(--border-color)' }}>
                                    <Search size={14} color="var(--text-muted)" />
                                    <input type="text" placeholder="Filter branches" value={branchSearch} onChange={(e) => setBranchSearch(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'white', padding: '8px', outline: 'none', width: '100%' }} />
                                </div>
                            </div>
                            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                {branches.filter(b => b.toLowerCase().includes(branchSearch.toLowerCase())).map(b => (
                                    <div key={b} onClick={() => { onBranchChange(b); setShowBranchMenu(false); }} style={{ padding: '12px 16px', background: b === currentBranch ? 'rgba(88, 166, 255, 0.1)' : 'transparent', color: b === currentBranch ? 'var(--accent-color)' : 'white' }}>{b}</div>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showMoreMenu && (
                    <>
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 110 }} onClick={() => setShowMoreMenu(false)} />
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} style={{ position: 'absolute', top: '100px', right: '16px', width: '220px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 120, overflow: 'hidden' }}>
                            <div style={{ padding: '8px 0' }}>
                                <div onClick={() => { onPickPath(); setShowMoreMenu(false); }} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                    <Download size={16} color={localPath ? "#2ea043" : "var(--text-muted)"} />
                                    <span style={{ fontSize: '14px' }}>{localPath ? 'Change Path' : 'Set Local Path'}</span>
                                </div>
                                <div onClick={() => { onOpenInExplorer(); setShowMoreMenu(false); }} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                    <FolderOpen size={16} color="var(--text-muted)" />
                                    <span style={{ fontSize: '14px' }}>Show in Explorer</span>
                                </div>
                                <div onClick={viewOnGitHub} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid var(--border-color)', cursor: 'pointer' }}>
                                    <ExternalLink size={16} color="var(--text-muted)" />
                                    <span style={{ fontSize: '14px' }}>View on GitHub</span>
                                </div>
                                <div onClick={async () => {
                                    if (window.confirm("Force Remote will DELETE all local changes. Continue?")) {
                                        setIsRefreshing(true);
                                        try {
                                            await GitApi.forceSync(token!, remoteUrl, localPath!, currentBranch, 'remote', setSyncStatusText);
                                            onRefresh();
                                            await handleFetch();
                                        } catch (e: any) {
                                            alert(`Force Sync Failed: ${e.message}`);
                                        } finally {
                                            setIsRefreshing(false);
                                            setSyncStatusText('');
                                        }
                                    }
                                    setShowMoreMenu(false);
                                }} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid var(--border-color)', cursor: 'pointer', color: '#ff7b72' }}>
                                    <RefreshCw size={16} />
                                    <span style={{ fontSize: '14px' }}>Force Remote (Destructive)</span>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
