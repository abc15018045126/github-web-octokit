import React, { useState, useEffect } from 'react';
import { MessageSquare, GitCommit, FileText, CheckCircle2, RotateCw, AlertCircle, Trash2, PlusCircle, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitManager } from '../lib/GitManager';
import type { FileStatus } from '../lib/GitManager';
import { useGitHub } from '../lib/GitHubProvider';

interface ChangesViewProps {
    currentBranch: string;
    localPath: string | null;
    owner: string;
    repoName: string;
}

export const ChangesView: React.FC<ChangesViewProps> = ({ currentBranch, localPath, owner, repoName }) => {
    const { octokit, isAuthenticated } = useGitHub();
    const [summary, setSummary] = useState('');
    const [description, setDescription] = useState('');
    const [changedFiles, setChangedFiles] = useState<FileStatus[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isPushing, setIsPushing] = useState(false);
    const [pushStatus, setPushStatus] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (localPath) {
            loadChanges();
        }
    }, [localPath]);

    const loadChanges = async () => {
        if (!localPath) return;
        setIsLoading(true);
        setError(null);
        try {
            const changes = await GitManager.getStatus(localPath);
            setChangedFiles(changes);
        } catch (e: any) {
            console.error('Failed to load changes:', e);
            setError(e.message || 'Failed to detect local changes.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCommitPush = async () => {
        if (!octokit || !localPath || !summary) return;

        setIsPushing(true);
        setPushStatus('Preparing commit...');
        setError(null);

        try {
            await GitManager.pushChanges(
                octokit,
                owner,
                repoName,
                currentBranch,
                changedFiles,
                summary,
                localPath
            );

            setPushStatus('Synced successfully!');
            setSummary('');
            setDescription('');
            setChangedFiles([]);

            // Auto reload changes after 2 seconds to show clean state
            setTimeout(loadChanges, 2000);
        } catch (e: any) {
            console.error('Push failed:', e);
            setError(`Sync Failed: ${e.message}`);
        } finally {
            setIsPushing(false);
            setPushStatus('');
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'added': return <PlusCircle size={14} color="#2ea043" />;
            case 'deleted': return <Trash2 size={14} color="#cf222e" />;
            case 'modified': return <Pencil size={14} color="#e3b341" />;
            default: return <FileText size={14} color="var(--text-muted)" />;
        }
    };

    if (!localPath) {
        return (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <AlertCircle size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                <p>No local path selected. Please set a local path in Home view.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-color)' }}>
            {/* Changes Header */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                    {isLoading ? 'SCANNING...' : `${changedFiles.length} CHANGED FILES`}
                </span>
                <button
                    onClick={loadChanges}
                    disabled={isLoading || isPushing}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                    <RotateCw size={14} className={isLoading ? 'animate-spin' : ''} />
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Refresh</span>
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div style={{ margin: '16px', padding: '12px', background: 'rgba(207, 34, 46, 0.1)', border: '1px solid rgba(207, 34, 46, 0.2)', borderRadius: '6px', color: '#ff7b72', fontSize: '13px', display: 'flex', gap: '10px' }}>
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
            )}

            {/* File List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {changedFiles.map((file, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {getStatusIcon(file.status)}
                        </div>
                        <span style={{ fontSize: '14px', flex: 1, fontWeight: 500, color: 'var(--text-color)', fontFamily: 'monospace' }}>
                            {file.path}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                            {file.status}
                        </span>
                    </div>
                ))}

                {!isLoading && changedFiles.length === 0 && !error && (
                    <div style={{ padding: '80px 20px', textAlign: 'center' }}>
                        <CheckCircle2 size={48} color="#2ea043" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                        <h3 style={{ fontSize: '16px', fontWeight: 600 }}>No changes to commit</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>Your working directory is clean or manifest is missing.</p>
                        <button
                            className="btn btn-primary"
                            style={{ marginTop: '20px' }}
                            onClick={loadChanges}
                        >
                            Check Again
                        </button>
                    </div>
                )}
            </div>

            {/* Commit Panel */}
            <AnimatePresence>
                {changedFiles.length > 0 && (
                    <motion.div
                        initial={{ y: 200 }}
                        animate={{ y: 0 }}
                        style={{
                            background: 'var(--surface-color)',
                            borderTop: '1px solid var(--border-color)',
                            padding: '16px',
                            paddingBottom: '24px',
                            boxShadow: '0 -8px 24px rgba(0,0,0,0.3)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <MessageSquare size={16} color="var(--text-muted)" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <input
                                    type="text"
                                    placeholder="Commit summary"
                                    value={summary}
                                    onChange={(e) => setSummary(e.target.value)}
                                    disabled={isPushing}
                                    style={{
                                        width: '100%',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'white',
                                        fontSize: '15px',
                                        fontWeight: 600,
                                        outline: 'none',
                                        marginBottom: '8px'
                                    }}
                                />
                                <textarea
                                    placeholder="Optional description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    disabled={isPushing}
                                    style={{
                                        width: '100%',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-muted)',
                                        fontSize: '13px',
                                        outline: 'none',
                                        resize: 'none',
                                        height: '40px'
                                    }}
                                />
                            </div>
                        </div>
                        <button
                            className="btn btn-primary"
                            style={{
                                width: '100%',
                                height: '48px',
                                borderRadius: '8px',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                fontSize: '15px',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onClick={handleCommitPush}
                            disabled={!summary || isPushing || !isAuthenticated}
                        >
                            {isPushing ? (
                                <>
                                    <RotateCw size={18} className="animate-spin" />
                                    <span>{pushStatus}</span>
                                </>
                            ) : (
                                <>
                                    <GitCommit size={18} />
                                    <span>Commit & Push to {currentBranch}</span>
                                </>
                            )}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
