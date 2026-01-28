import React, { useState, useEffect } from 'react';
import { Folder, File, Download, ChevronRight, HardDrive } from 'lucide-react';
import { motion } from 'framer-motion';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { Filesystem, type FileInfo } from '@capacitor/filesystem';

interface HomeViewProps {
    localPath: string | null;
    onPathSelect: (path: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ localPath, onPathSelect }) => {
    const [files, setFiles] = useState<FileInfo[]>([]);

    useEffect(() => {
        if (localPath) {
            loadFiles();
        }
    }, [localPath]);

    const loadFiles = async () => {
        try {
            const result = await Filesystem.readdir({
                path: localPath!,
            });
            setFiles(result.files);
        } catch (e) {
            console.error('Failed to read directory', e);
        }
    };

    const handlePickPath = async () => {
        try {
            const result = await FilePicker.pickDirectory();
            if (result.path) {
                onPathSelect(result.path);
            }
        } catch (error) {
            console.error('Pick path failed', error);
        }
    };

    if (!localPath) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px', textAlign: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: 'var(--surface-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', border: '1px solid var(--border-color)' }}>
                    <HardDrive size={40} color="var(--accent-color)" />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Setup Local Explorer</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '32px', maxWidth: '280px' }}>
                    Connect this repository to a local folder on your device to browse and manage files.
                </p>
                <button className="btn btn-primary" style={{ width: '100%', maxWidth: '240px' }} onClick={handlePickPath}>
                    <Download size={18} style={{ marginRight: '8px' }} />
                    Git to Local
                </button>
            </div>
        );
    }

    return (
        <div style={{ paddingBottom: '20px' }}>
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Folder size={18} color="var(--accent-color)" />
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {localPath}
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {files.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Folder size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                        <p>Directory is empty</p>
                    </div>
                ) : (
                    files.map((file, idx) => (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            key={file.name}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '12px 16px',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                gap: '12px'
                            }}
                        >
                            {file.type === 'directory' ? <Folder size={18} color="#58a6ff" /> : <File size={18} color="var(--text-muted)" />}
                            <div style={{ flex: 1, fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                            <ChevronRight size={14} color="rgba(255,255,255,0.2)" />
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
};
