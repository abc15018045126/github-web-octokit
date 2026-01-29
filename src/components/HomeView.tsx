import React, { useState, useEffect } from 'react';
import { Folder, File, Download, ChevronRight, HardDrive, ArrowLeft, Home as HomeIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filesystem, type FileInfo } from '@capacitor/filesystem';

import { useI18n } from '../lib/I18nContext';

interface HomeViewProps {
    localPath: string | null;
    onPathSelect: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ localPath, onPathSelect }) => {
    const { t } = useI18n();
    const [currentSubPath, setCurrentSubPath] = useState<string>('');
    const [files, setFiles] = useState<FileInfo[]>([]);
    const [history, setHistory] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setCurrentSubPath('');
        setHistory([]);
        if (localPath) {
            loadFiles(localPath);
        } else {
            setFiles([]);
        }
    }, [localPath]);

    const loadFiles = async (path: string) => {
        try {
            setError(null);
            const result = await Filesystem.readdir({
                path: path,
            });
            // Sort: folders first, then files
            const sortedFiles = [...result.files].sort((a, b) => {
                if (a.type === b.type) return a.name.localeCompare(b.name);
                return a.type === 'directory' ? -1 : 1;
            });
            setFiles(sortedFiles);
        } catch (e: any) {
            console.error('Failed to read directory', e);
            setError(e.message || 'Access denied or directory not found');
            setFiles([]);
        }
    };

    const handleFolderClick = (folderName: string) => {
        const newPath = currentSubPath ? `${currentSubPath}/${folderName}` : folderName;
        const fullPath = localPath!.endsWith('/') ? `${localPath}${newPath}` : `${localPath}/${newPath}`;

        setHistory([...history, currentSubPath]);
        setCurrentSubPath(newPath);
        loadFiles(fullPath);
    };

    const handleBack = () => {
        if (history.length === 0) return;
        const prevSubPath = history[history.length - 1];
        const newHistory = history.slice(0, -1);

        const fullPath = prevSubPath
            ? (localPath!.endsWith('/') ? `${localPath}${prevSubPath}` : `${localPath}/${prevSubPath}`)
            : localPath!;

        setHistory(newHistory);
        setCurrentSubPath(prevSubPath);
        loadFiles(fullPath);
    };

    const getDisplayPath = () => {
        if (!localPath) return '';
        // Simplify content:// URI display for the user
        if (localPath.startsWith('content://')) {
            const parts = localPath.split('%3A');
            const rootName = parts[parts.length - 1] || 'Root';
            return `[Storage] > ${rootName}${currentSubPath ? ' > ' + currentSubPath.replace(/\//g, ' > ') : ''}`;
        }
        return `${localPath.split('/').pop()}${currentSubPath ? ' / ' + currentSubPath : ''}`;
    };

    if (!localPath) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px', textAlign: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: 'var(--surface-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', border: '1px solid var(--border-color)' }}>
                    <HardDrive size={40} color="var(--accent-color)" />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>{t('explorer_title')}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '32px', maxWidth: '280px' }}>
                    {t('explorer_subtitle')}
                </p>
                <button className="btn btn-primary" style={{ width: '100%', maxWidth: '240px', height: '48px' }} onClick={onPathSelect}>
                    <Download size={18} style={{ marginRight: '8px' }} />
                    {t('explorer_select_btn')}
                </button>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Breadcrumb / Navigation Header */}
            <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                {currentSubPath !== '' && (
                    <button
                        onClick={handleBack}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                    >
                        <ArrowLeft size={18} />
                    </button>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                    <HomeIcon size={14} color="var(--text-muted)" />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-color)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {getDisplayPath()}
                    </span>
                </div>
            </div>

            {error ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--danger-color)', marginBottom: '16px' }}>{t('explorer_access_error')}</div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>{error}</p>
                    <button className="btn" onClick={onPathSelect}>{t('explorer_change_root')}</button>
                </div>
            ) : (
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentSubPath}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {files.length === 0 ? (
                                <div style={{ padding: '80px 40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <Folder size={48} style={{ opacity: 0.1, marginBottom: '16px', margin: '0 auto' }} />
                                    <p style={{ fontSize: '14px' }}>{t('explorer_empty')}</p>
                                </div>
                            ) : (
                                files.map((file) => (
                                    <div
                                        key={file.name}
                                        onClick={() => file.type === 'directory' ? handleFolderClick(file.name) : null}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '14px 16px',
                                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                                            gap: '12px',
                                            cursor: file.type === 'directory' ? 'pointer' : 'default',
                                            background: 'transparent'
                                        }}
                                    >
                                        {file.type === 'directory' ? <Folder size={18} color="#58a6ff" /> : <File size={18} color="var(--text-muted)" />}
                                        <div style={{ flex: 1, fontSize: '14px', fontWeight: 500, color: 'var(--text-color)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                                        {file.type === 'directory' && <ChevronRight size={14} color="rgba(255,255,255,0.1)" />}
                                    </div>
                                ))
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};
