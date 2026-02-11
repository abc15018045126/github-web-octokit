import React, { useState, useEffect } from 'react';
import {
    Folder, File, Download, HardDrive, ArrowLeft,
    Home as HomeIcon, MoreVertical, Search, Clipboard, Plus,
    X, Edit3, Trash2, Info, FilePlus, FolderPlus, Copy, Eye, RefreshCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type FileInfo } from '@capacitor/filesystem';
import { registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';

import { SoraEditor } from 'capacitor-sora-editor';


import { useI18n } from '../lib/I18nContext';

interface OpenFolderPlugin {
    listFiles(options: { path: string }): Promise<{ files: any[] }>;
    writeFile(options: { path: string, data: string }): Promise<void>;
    mkdir(options: { path: string }): Promise<void>;
    rename(options: { from: string, to: string }): Promise<void>;
    delete(options: { path: string, recursive?: boolean }): Promise<void>;
    copy(options: { from: string, to: string }): Promise<void>;
    stat(options: { path: string }): Promise<any>;
}
const OpenFolder = registerPlugin<OpenFolderPlugin>('OpenFolder');

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

    // UI States
    const [activeFileMenu, setActiveFileMenu] = useState<{ name: string, type: string, x: number, y: number } | null>(null);
    const [showDirMoreMenu, setShowDirMoreMenu] = useState(false);
    const [showNewModal, setShowNewModal] = useState<'file' | 'folder' | null>(null);
    const [showRenameModal, setShowRenameModal] = useState<{ oldName: string, type: string } | null>(null);
    const [showPropsModal, setShowPropsModal] = useState<{ name: string, type: string, info: any } | null>(null);
    const [newName, setNewName] = useState('');

    // File Manager States
    const [clipboard, setClipboard] = useState<{ path: string, name: string, type: string, operation: 'copy' | 'move' } | null>(null);

    useEffect(() => {
        setCurrentSubPath('');
        setHistory([]);
        if (localPath) {
            loadFiles(localPath);
        } else {
            setFiles([]);
        }
    }, [localPath]);

    const getFullPath = (subPath: string = currentSubPath) => {
        if (!localPath) return '';
        const base = localPath.endsWith('/') ? localPath : `${localPath}/`;
        return subPath ? `${base}${subPath}` : localPath;
    };

    // Handle Hardware Back Button
    useEffect(() => {
        const backHandler = App.addListener('backButton', () => {
            if (history.length > 0) {
                handleBack();
            }
        });

        return () => {
            backHandler.then(h => h.remove());
        };
    }, [history]);

    const loadFiles = async (path: string) => {
        try {
            setError(null);
            // console.log('Listing files for path:', path);

            // Use native plugin to bypass Capacitor filesystem restrictions on absolute paths
            const result = await OpenFolder.listFiles({ path });
            // console.log('List result:', result);

            if (result && result.files) {
                const mappedFiles = result.files.map((f: any) => ({
                    name: f.name,
                    type: f.type,
                    size: f.size,
                    ctime: f.mtime,
                    mtime: f.mtime,
                    uri: f.uri
                }));

                const sortedFiles = mappedFiles.sort((a: any, b: any) => {
                    if (a.type === b.type) return a.name.localeCompare(b.name);
                    return a.type === 'directory' ? -1 : 1;
                });
                setFiles(sortedFiles);
            } else {
                setFiles([]);
            }
        } catch (e: any) {
            const msg = e.message || JSON.stringify(e);
            // console.error('Failed to read directory', msg);
            // alert('读取目录失败: ' + msg); 
            setError("Error: " + msg);
            setFiles([]);
        }
    };

    const handleFolderClick = (folderName: string) => {
        const newSub = currentSubPath ? `${currentSubPath}/${folderName}` : folderName;
        const fullPath = getFullPath(newSub);

        setHistory([...history, currentSubPath]);
        setCurrentSubPath(newSub);
        loadFiles(fullPath);
    };

    const handleBack = () => {
        if (history.length === 0) return;
        const prevSubPath = history[history.length - 1];
        const newHistory = history.slice(0, -1);
        const fullPath = getFullPath(prevSubPath);

        setHistory(newHistory);
        setCurrentSubPath(prevSubPath);
        loadFiles(fullPath);
    };

    // --- File Operations ---

    const handleOpenFile = async (name: string) => {
        const path = getFullPath() + (getFullPath().endsWith('/') ? name : '/' + name);
        try {
            // 直接构建 file:// URI，因为我们使用的是绝对路径
            let fileUri = path;
            if (!fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
                fileUri = 'file://' + fileUri;
            }

            // console.log('Opening file with SoraEditor:', fileUri);
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

    const handleCopyFile = (name: string, type: string) => {
        const path = getFullPath() + (getFullPath().endsWith('/') ? name : '/' + name);
        setClipboard({ path, name, type, operation: 'copy' });
        setActiveFileMenu(null);
    };

    const handleRenameFile = async () => {
        if (!showRenameModal || !newName) return;
        const oldPath = getFullPath() + (getFullPath().endsWith('/') ? showRenameModal.oldName : '/' + showRenameModal.oldName);
        const newPath = getFullPath() + (getFullPath().endsWith('/') ? newName : '/' + newName);

        try {
            await OpenFolder.rename({ from: oldPath, to: newPath });
            setShowRenameModal(null);
            setNewName('');
            loadFiles(getFullPath());
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleDeleteFile = async (name: string) => {
        if (!window.confirm(t('home_delete_confirm'))) return;
        const path = getFullPath() + (getFullPath().endsWith('/') ? name : '/' + name);
        try {
            const isDir = files.find(f => f.name === name)?.type === 'directory';
            await OpenFolder.delete({ path, recursive: isDir });
            setActiveFileMenu(null);
            loadFiles(getFullPath());
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleShowProperties = async (name: string, type: string) => {
        const path = getFullPath() + (getFullPath().endsWith('/') ? name : '/' + name);
        try {
            const stat = await OpenFolder.stat({ path });
            setShowPropsModal({ name, type, info: stat });
            setActiveFileMenu(null);
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handlePaste = async () => {
        if (!clipboard) return;
        const destPath = getFullPath() + (getFullPath().endsWith('/') ? clipboard.name : '/' + clipboard.name);
        try {
            // Capacitor Filesystem doesn't have a direct "copy" for directories, only files
            // For simplicity, we implement file copy. Move is 'rename'.
            if (clipboard.operation === 'copy') {
                await OpenFolder.copy({ from: clipboard.path, to: destPath });
            } else {
                await OpenFolder.rename({ from: clipboard.path, to: destPath });
                setClipboard(null);
            }
            setShowDirMoreMenu(false);
            loadFiles(getFullPath());
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleQuickCreateFile = async () => {
        let baseName = "Untitled";
        let ext = ".txt";
        let finalName = baseName + ext;
        let counter = 1;

        // Ensure unique name
        while (files.some(f => f.name === finalName)) {
            finalName = `${baseName} ${counter}${ext}`;
            counter++;
        }

        const path = getFullPath() + (getFullPath().endsWith('/') ? finalName : '/' + finalName);
        // console.log('Quick creating file:', path);

        try {
            await OpenFolder.writeFile({ path, data: '' });
            await loadFiles(getFullPath());
            await handleOpenFile(finalName);
        } catch (e: any) {
            // console.error('Quick create failed', e);
            alert('Failed to create file: ' + e.message);
        }
    };

    const handleCreateNew = async () => {
        if (!showNewModal || !newName) return;
        const path = getFullPath() + (getFullPath().endsWith('/') ? newName : '/' + newName);
        try {
            if (showNewModal === 'folder') {
                await OpenFolder.mkdir({ path });
            } else {
                await OpenFolder.writeFile({ path, data: '' });
            }
            setShowNewModal(null);
            setNewName('');
            loadFiles(getFullPath());
        } catch (e: any) {
            alert(e.message);
        }
    };

    const getDisplayPath = () => {
        if (!localPath) return '';
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
            {/* Header / Breadcrumb */}
            <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                {currentSubPath !== '' ? (
                    <button onClick={handleBack} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', padding: '4px' }}>
                        <ArrowLeft size={18} />
                    </button>
                ) : (
                    <div style={{ padding: '4px' }}><HomeIcon size={18} color="var(--text-muted)" /></div>
                )}

                <div style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontSize: '13px', fontWeight: 600 }}>
                    {getDisplayPath()}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setShowDirMoreMenu(!showDirMoreMenu)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: '4px' }}>
                        <MoreVertical size={18} />
                    </button>
                </div>
            </div>

            {/* Action Buttons Floating */}
            <div style={{ position: 'absolute', right: '16px', bottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 10 }}>
                <button
                    onClick={handleQuickCreateFile}
                    style={{ width: '56px', height: '56px', borderRadius: '28px', background: 'var(--accent-color)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                >
                    <Plus size={24} />
                </button>
            </div>

            {/* Directory More Menu */}
            <AnimatePresence>
                {showDirMoreMenu && (
                    <>
                        <div style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={() => setShowDirMoreMenu(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            style={{
                                position: 'absolute', top: '48px', right: '16px', width: '200px',
                                background: 'var(--surface-color)', borderRadius: '12px',
                                border: '1px solid var(--border-color)', zIndex: 110, overflow: 'hidden',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                            }}
                        >
                            <button className="menu-item" onClick={() => { alert("Search not implemented"); setShowDirMoreMenu(false); }}>
                                <Search size={16} /> <span>{t('home_more_search')}</span>
                            </button>
                            <button className="menu-item" onClick={handlePaste} disabled={!clipboard}>
                                <Clipboard size={16} /> <span>{t('home_more_paste_here')}</span>
                            </button>
                            <button className="menu-item" onClick={() => { loadFiles(getFullPath()); setShowDirMoreMenu(false); }}>
                                <RefreshCcw size={16} /> <span>{t('common_refresh') || 'Refresh'}</span>
                            </button>
                            <div style={{ borderTop: '1px solid var(--border-color)' }} />
                            <button className="menu-item" onClick={() => { setShowNewModal('file'); setNewName(''); setShowDirMoreMenu(false); }}>
                                <FilePlus size={16} /> <span>{t('home_new_file')}</span>
                            </button>
                            <button className="menu-item" onClick={() => { setShowNewModal('folder'); setNewName(''); setShowDirMoreMenu(false); }}>
                                <FolderPlus size={16} /> <span>{t('home_new_folder')}</span>
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
                                top: Math.min(activeFileMenu.y, window.innerHeight - 280),
                                left: Math.max(16, activeFileMenu.x - 240),
                                width: '220px',
                                background: 'var(--surface-color)', borderRadius: '12px',
                                border: '1px solid var(--border-color)', zIndex: 210, overflow: 'hidden',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                            }}
                        >
                            <button className="menu-item" onClick={() => handleOpenFile(activeFileMenu.name)}>
                                <Eye size={16} /> <span>{t('home_file_open')}</span>
                            </button>
                            <button className="menu-item" onClick={() => handleCopyFile(activeFileMenu.name, activeFileMenu.type)}>
                                <Copy size={16} /> <span>{t('home_file_copy')}</span>
                            </button>
                            <button className="menu-item" onClick={() => { setShowRenameModal({ oldName: activeFileMenu.name, type: activeFileMenu.type }); setNewName(activeFileMenu.name); setActiveFileMenu(null); }}>
                                <Edit3 size={16} /> <span>{t('home_file_rename')}</span>
                            </button>
                            <button className="menu-item" onClick={() => handleDeleteFile(activeFileMenu.name)} style={{ color: 'var(--danger-color)' }}>
                                <Trash2 size={16} /> <span>{t('home_file_delete')}</span>
                            </button>
                            <div style={{ borderTop: '1px solid var(--border-color)' }} />
                            <button className="menu-item" onClick={() => handleShowProperties(activeFileMenu.name, activeFileMenu.type)}>
                                <Info size={16} /> <span>{t('home_file_properties')}</span>
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {
                error ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
                        <div style={{ color: 'var(--danger-color)', marginBottom: '16px' }}>{t('explorer_access_error')}</div>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>{error}</p>
                        <button className="btn" onClick={onPathSelect}>{t('explorer_change_root')}</button>
                    </div>
                ) : (
                    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
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
                                            onClick={() => file.type === 'directory' ? handleFolderClick(file.name) : handleOpenFile(file.name)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '14px 16px',
                                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                gap: '12px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {file.type === 'directory' ? <Folder size={18} color="#58a6ff" /> : <File size={18} color="var(--text-muted)" />}
                                            <div style={{ flex: 1, fontSize: '14px', fontWeight: 500, color: 'var(--text-color)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setActiveFileMenu({ name: file.name, type: file.type, x: rect.right, y: rect.bottom });
                                                }}
                                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: '4px' }}
                                            >
                                                <MoreVertical size={16} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                )
            }

            {/* Modals */}
            <AnimatePresence>
                {(showNewModal || showRenameModal) && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                            style={{ width: '90%', maxWidth: '400px', background: 'var(--bg-color)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border-color)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
                        >
                            <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 600 }}>{showNewModal ? t('home_new') : t('home_file_rename')}</h3>
                            <input
                                className="repo-input" autoFocus
                                value={newName} onChange={e => setNewName(e.target.value)}
                                placeholder={t('home_new_placeholder')}
                                style={{
                                    marginBottom: '24px',
                                    width: '100%',
                                    height: '52px',
                                    padding: '0 16px',
                                    fontSize: '16px',
                                    borderRadius: '12px',
                                    background: 'var(--surface-color)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-color)',
                                    outline: 'none'
                                }}
                            />
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button className="btn" style={{ flex: 1, height: '44px', borderRadius: '10px', fontSize: '15px', fontWeight: 600 }} onClick={() => { setShowNewModal(null); setShowRenameModal(null); setNewName(''); }}>{t('common_cancel')}</button>
                                <button className="btn btn-primary" style={{ flex: 1, height: '44px', borderRadius: '10px', fontSize: '15px', fontWeight: 600 }} onClick={showNewModal ? handleCreateNew : handleRenameFile}>{t('common_confirm')}</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {showPropsModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                            style={{ width: '85%', maxWidth: '360px', background: 'var(--bg-color)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border-color)' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '18px' }}>{t('home_file_properties')}</h3>
                                <button onClick={() => setShowPropsModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}><X size={20} /></button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Name</span><span>{showPropsModal.name}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>{t('home_prop_type')}</span><span>{showPropsModal.type}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>{t('home_prop_size')}</span><span>{(showPropsModal.info.size / 1024).toFixed(2)} KB</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>{t('home_prop_modified')}</span><span>{new Date(showPropsModal.info.mtime).toLocaleString()}</span></div>
                            </div>
                            <button className="btn btn-primary" style={{ width: '100%', marginTop: '24px' }} onClick={() => setShowPropsModal(null)}>{t('common_confirm')}</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .menu-item {
                    width: 100%; display: flex; align-items: center; gap: 12px;
                    padding: 12px 16px; background: none; border: none;
                    color: var(--text-color); font-size: 14px; cursor: pointer; text-align: left;
                }
                .menu-item:active { background: rgba(255,255,255,0.05); }
                .menu-item:disabled { opacity: 0.3; cursor: not-allowed; }
            `}</style>
        </div >
    );
};
