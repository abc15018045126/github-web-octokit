import React, { useState, useEffect } from 'react';
import {
    MessageSquare, GitCommit, FileText, CheckCircle2, RotateCw,
    AlertCircle, Trash2, PlusCircle, Pencil, MoreVertical,
    Settings, ShieldAlert, X, Eye, Copy, FolderInput,
    ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitApi } from '../api/git';
import type { FileStatus } from '../api/git';
import { useGitHub } from '../lib/GitHubProvider';
import { useI18n } from '../lib/I18nContext';
// import { Filesystem, Directory } from '@capacitor/filesystem';
import { SoraEditor } from 'capacitor-sora-editor';

interface ChangesViewProps {
    currentBranch: string;
    localPath: string | null;
    owner: string;
    repoName: string;
    onRefresh: () => void;
}

export const ChangesView: React.FC<ChangesViewProps> = ({ currentBranch, localPath, owner, repoName, onRefresh }) => {
    const { t } = useI18n();
    const { token, isAuthenticated } = useGitHub();
    const [summary, setSummary] = useState('');
    const [description, setDescription] = useState('');
    const [changedFiles, setChangedFiles] = useState<FileStatus[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isPushing, setIsPushing] = useState(false);
    const [pushStatus, setPushStatus] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showAutoCommitModal, setShowAutoCommitModal] = useState(false);
    const [activeFileMenu, setActiveFileMenu] = useState<{ path: string, x: number, y: number } | null>(null);

    // Auto-commit settings
    const [autoCommitEnabled, setAutoCommitEnabled] = useState(localStorage.getItem('git_auto_commit_enabled') === 'true');
    const [autoCommitPattern, setAutoCommitPattern] = useState(localStorage.getItem('git_auto_commit_pattern') || 'Update at {Y}-{M}-{D} {h}:{m}');

    const remoteUrl = `https://github.com/${owner}/${repoName}.git`;

    useEffect(() => {
        if (localPath && isAuthenticated) {
            loadChanges();
        }
    }, [localPath, isAuthenticated]);

    const loadChanges = async () => {
        if (!localPath) return;
        setIsLoading(true);
        setError(null);
        try {
            const changes = await GitApi.getChangeList(localPath, currentBranch);
            setChangedFiles(changes);
        } catch (e: any) {
            // console.error('Failed to load changes:', e);
            setError(e.message || t('changes_none'));
        } finally {
            setIsLoading(false);
        }
    };

    const generateAutoMessage = () => {
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        let msg = autoCommitPattern
            .replace('{Y}', now.getFullYear().toString())
            .replace('{M}', pad(now.getMonth() + 1))
            .replace('{D}', pad(now.getDate()))
            .replace('{h}', pad(now.getHours()))
            .replace('{m}', pad(now.getMinutes()))
            .replace('{s}', pad(now.getSeconds()));
        return msg;
    };

    const handleCommitPush = async () => {
        if (!token || !localPath) return;

        let finalSummary = summary;
        if (!finalSummary && autoCommitEnabled) {
            finalSummary = generateAutoMessage();
        }

        if (!finalSummary) {
            setError("Commit summary is required (unless Auto-Commit is enabled)");
            return;
        }

        setIsPushing(true);
        setPushStatus(t('changes_syncing'));
        setError(null);

        try {
            const commitMessage = description ? `${finalSummary}\n\n${description}` : finalSummary;
            await GitApi.push(
                token,
                remoteUrl,
                localPath,
                commitMessage,
                currentBranch
            );

            setPushStatus(t('changes_success'));
            setSummary('');
            setDescription('');
            setChangedFiles([]);
            setTimeout(() => onRefresh(), 500);
            setTimeout(loadChanges, 1500);
        } catch (e: any) {
            // console.error('Push failed:', e);
            setError(`Push Failed: ${e.message}`);
        } finally {
            setIsPushing(false);
            setPushStatus('');
        }
    };

    const handleDiscardAll = async () => {
        if (!localPath || !window.confirm(t('changes_discard_confirm'))) return;
        setShowMoreMenu(false);
        setIsLoading(true);
        try {
            await GitApi.forceRemote(token!, remoteUrl, localPath, currentBranch, (p) => setPushStatus(p));
            onRefresh();
            loadChanges();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
            setPushStatus('');
        }
    };

    // --- Per File Actions ---

    const handleDiscardFile = async (path: string) => {
        if (!localPath || !window.confirm(t('changes_discard_file_confirm'))) return;
        setActiveFileMenu(null);
        setIsLoading(true);
        try {
            await GitApi.discardFile(token!, remoteUrl, localPath, path, currentBranch);
            loadChanges();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleIgnoreFile = async (path: string) => {
        if (!localPath) return;
        setActiveFileMenu(null);
        try {
            await GitApi.ignorePath(localPath, path);
            alert(`Added ${path} to .gitignore`);
            loadChanges();
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleIgnoreFolder = async (path: string) => {
        if (!localPath) return;
        setActiveFileMenu(null);
        const folder = path.includes('/') ? path.substring(0, path.lastIndexOf('/') + 1) : path;
        const ignorePattern = folder.endsWith('/') ? folder : `${folder}/`;
        try {
            await GitApi.ignorePath(localPath, ignorePattern);
            alert(`Added ${ignorePattern} to .gitignore`);
            loadChanges();
        } catch (e: any) {
            setError(e.message);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            alert("Copied to clipboard!");
        } catch (e) {
            alert("Failed to copy. Possibly unsecured context.");
        }
        setActiveFileMenu(null);
    };

    const handleOpenFile = async (path: string) => {
        if (!localPath) return;
        const fullPath = localPath.endsWith('/') ? `${localPath}${path}` : `${localPath}/${path}`;
        try {
            // 直接构建 file:// URI
            let fileUri = fullPath;
            if (!fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
                fileUri = 'file://' + fileUri;
            }

            // console.log('SoraEditor opening from Changes (Direct URI):', fileUri);
            await SoraEditor.openEditor({
                filePath: fileUri,
                autoFocus: true
            });
        } catch (e: any) {
            // console.error('Failed to open file with SoraEditor', e);
            alert("Failed to open file: " + e.message);
        }
        setActiveFileMenu(null);
    };

    const handleShowInExplorer = (path: string) => {
        // Simplified "Explorer" - show the full path info
        const full = localPath?.endsWith('/') ? `${localPath}${path}` : `${localPath}/${path}`;
        alert(`Full path: ${full}\nUse your file manager to navigate to this location.`);
        setActiveFileMenu(null);
    };

    const saveAutoCommitSettings = () => {
        localStorage.setItem('git_auto_commit_enabled', autoCommitEnabled.toString());
        localStorage.setItem('git_auto_commit_pattern', autoCommitPattern);
        setShowAutoCommitModal(false);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'added': return <PlusCircle size={14} color="#2ea043" />;
            case 'deleted': return <Trash2 size={14} color="#cf222e" />;
            case 'modified': return <Pencil size={14} color="#e3b341" />;
            default: return <FileText size={14} color="var(--text-muted)" />;
        }
    };

    const handleFileMoreClick = (e: React.MouseEvent, path: string) => {
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setActiveFileMenu({ path, x: rect.right, y: rect.bottom });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-color)', position: 'relative' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                    {isLoading ? t('changes_loading').toUpperCase() : `${changedFiles.length} ${t('changes_count_suffix')}`}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={loadChanges} disabled={isLoading || isPushing} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <RotateCw size={14} className={isLoading ? 'animate-spin' : ''} />
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>{t('changes_refresh')}</span>
                    </button>
                    <button
                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                        <MoreVertical size={18} />
                    </button>
                </div>
            </div>

            {/* Global More Menu Popover */}
            <AnimatePresence>
                {showMoreMenu && (
                    <>
                        <div style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={() => setShowMoreMenu(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            style={{
                                position: 'absolute', top: '44px', right: '16px', width: '220px',
                                background: 'var(--surface-color)', borderRadius: '12px',
                                border: '1px solid var(--border-color)', zIndex: 110, overflow: 'hidden',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                            }}
                        >
                            <button className="menu-item" onClick={handleDiscardAll}>
                                <ShieldAlert size={16} color="#ff7b72" />
                                <span>{t('changes_more_discard')}</span>
                            </button>
                            <button className="menu-item" style={{ borderTop: '1px solid var(--border-color)' }} onClick={() => { setShowMoreMenu(false); setShowAutoCommitModal(true); }}>
                                <Settings size={16} />
                                <span>{t('changes_more_auto_commit')}</span>
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Per File Context Menu */}
            <AnimatePresence>
                {activeFileMenu && (
                    <>
                        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={() => setActiveFileMenu(null)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={{
                                position: 'fixed',
                                top: Math.min(activeFileMenu.y, window.innerHeight - 300),
                                left: Math.max(16, activeFileMenu.x - 240),
                                width: '220px',
                                background: 'var(--surface-color)', borderRadius: '12px',
                                border: '1px solid var(--border-color)', zIndex: 210, overflow: 'hidden',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                            }}
                        >
                            <button className="menu-item" onClick={() => handleDiscardFile(activeFileMenu.path)}>
                                <RotateCw size={16} color="#e3b341" />
                                <span>{t('changes_file_discard')}</span>
                            </button>
                            <button className="menu-item" onClick={() => handleIgnoreFile(activeFileMenu.path)}>
                                <ShieldAlert size={16} color="var(--text-muted)" />
                                <span>{t('changes_file_ignore')}</span>
                            </button>
                            <button className="menu-item" onClick={() => handleIgnoreFolder(activeFileMenu.path)}>
                                <FolderInput size={16} color="var(--text-muted)" />
                                <span>{t('changes_folder_ignore')}</span>
                            </button>
                            <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
                            <button className="menu-item" onClick={() => copyToClipboard(localPath?.endsWith('/') ? `${localPath}${activeFileMenu.path}` : `${localPath}/${activeFileMenu.path}`)}>
                                <Copy size={16} />
                                <span>{t('changes_copy_full_path')}</span>
                            </button>
                            <button className="menu-item" onClick={() => copyToClipboard(activeFileMenu.path)}>
                                <Copy size={16} />
                                <span>{t('changes_copy_rel_path')}</span>
                            </button>
                            <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
                            <button className="menu-item" onClick={() => handleShowInExplorer(activeFileMenu.path)}>
                                <ExternalLink size={16} />
                                <span>{t('changes_show_explorer')}</span>
                            </button>
                            <button className="menu-item" onClick={() => handleOpenFile(activeFileMenu.path)}>
                                <Eye size={16} />
                                <span>{t('changes_open_file')}</span>
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <style>{`
                .menu-item {
                    width: 100%; display: flex; align-items: center; gap: 12px;
                    padding: 10px 16px; background: none; border: none;
                    color: var(--text-color); font-size: 14px; cursor: pointer; text-align: left;
                }
                .menu-item:active { background: rgba(255,255,255,0.05); }
            `}</style>

            {error && (
                <div style={{ margin: '16px', padding: '12px', background: 'rgba(207, 34, 46, 0.1)', border: '1px solid rgba(207, 34, 46, 0.2)', borderRadius: '6px', color: '#ff7b72', fontSize: '13px', display: 'flex', gap: '10px' }}>
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {changedFiles.map((file, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{getStatusIcon(file.status)}</div>
                        <span style={{ fontSize: '14px', flex: 1, fontWeight: 500, color: 'var(--text-color)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.path}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{file.status}</span>
                            <button
                                onClick={(e) => handleFileMoreClick(e, file.path)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: '4px', cursor: 'pointer' }}
                            >
                                <MoreVertical size={14} />
                            </button>
                        </div>
                    </div>
                ))}

                {!isLoading && changedFiles.length === 0 && !error && (
                    <div style={{ padding: '80px 20px', textAlign: 'center' }}>
                        <CheckCircle2 size={48} color="#2ea043" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                        <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{t('changes_up_to_date')}</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>{t('changes_none')}</p>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {changedFiles.length > 0 && (
                    <motion.div initial={{ y: 200 }} animate={{ y: 0 }} style={{ background: 'var(--surface-color)', borderTop: '1px solid var(--border-color)', padding: '16px', paddingBottom: 'max(24px, env(safe-area-inset-bottom))', boxShadow: '0 -8px 24px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <MessageSquare size={16} color="var(--text-muted)" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <input
                                    type="text"
                                    placeholder={autoCommitEnabled ? `${t('changes_commit_summary')} (${t('repoman_optional')})` : t('changes_commit_summary')}
                                    value={summary}
                                    onChange={(e) => setSummary(e.target.value)}
                                    disabled={isPushing}
                                    style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-color)', fontSize: '15px', fontWeight: 600, outline: 'none', marginBottom: '8px' }}
                                />
                                <textarea placeholder={t('changes_commit_desc')} value={description} onChange={(e) => setDescription(e.target.value)} disabled={isPushing} style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '13px', outline: 'none', resize: 'none', height: '40px' }} />
                            </div>
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%', height: '48px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '15px' }} onClick={handleCommitPush} disabled={(summary === '' && !autoCommitEnabled) || isPushing || !isAuthenticated}>
                            {isPushing ? (
                                <><RotateCw size={18} className="animate-spin" /><span>{pushStatus}</span></>
                            ) : (
                                <><GitCommit size={18} /><span>{t('changes_push_to')} {currentBranch}</span></>
                            )}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Auto-Commit Settings Modal */}
            <AnimatePresence>
                {showAutoCommitModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            style={{
                                width: '90%', maxWidth: '400px', background: 'var(--bg-color)',
                                borderRadius: '24px', padding: '24px', border: '1px solid var(--border-color)',
                                boxShadow: '0 24px 64px rgba(0,0,0,0.8)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{t('changes_more_auto_commit')}</h3>
                                <button onClick={() => setShowAutoCommitModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}><X size={20} /></button>
                            </div>

                            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px' }}>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>{t('changes_auto_commit_enable')}</span>
                                <button
                                    onClick={() => setAutoCommitEnabled(!autoCommitEnabled)}
                                    style={{
                                        width: '44px', height: '24px', borderRadius: '12px',
                                        background: autoCommitEnabled ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)',
                                        border: 'none', position: 'relative', transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', left: autoCommitEnabled ? '23px' : '3px', transition: 'all 0.2s' }} />
                                </button>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>{t('changes_auto_commit_pattern')}</label>
                                <input
                                    className="repo-input"
                                    style={{ marginBottom: '8px' }}
                                    value={autoCommitPattern}
                                    onChange={(e) => setAutoCommitPattern(e.target.value)}
                                    placeholder={t('changes_auto_commit_placeholder')}
                                />
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('changes_auto_commit_desc')}</p>
                            </div>

                            <button className="btn btn-primary" style={{ width: '100%', height: '44px', borderRadius: '12px' }} onClick={saveAutoCommitSettings}>
                                {t('common_save')}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
