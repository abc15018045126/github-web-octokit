import React, { useState } from 'react';
import { MessageSquare, GitCommit, FileText, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChangesViewProps {
    currentBranch: string;
}

export const ChangesView: React.FC<ChangesViewProps> = ({ currentBranch }) => {
    const [summary, setSummary] = useState('');
    const [description, setDescription] = useState('');

    // Directly show the files user requested
    const [changedFiles] = useState([
        { name: 'src/App.tsx', status: 'modified' },
        { name: 'src/components/HomeView.tsx', status: 'modified' }
    ]);

    const hasChanges = changedFiles.length > 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-color)' }}>
            {/* Changes Header */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                    {changedFiles.length} CHANGED FILES
                </span>
            </div>

            {/* File List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {changedFiles.map((file, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e3b341', boxShadow: '0 0 8px rgba(227, 179, 65, 0.3)' }}></div>
                        <FileText size={16} color="var(--text-muted)" />
                        <span style={{ fontSize: '14px', flex: 1, fontWeight: 500, color: 'var(--text-color)' }}>{file.name}</span>
                    </div>
                ))}

                {changedFiles.length === 0 && (
                    <div style={{ padding: '80px 20px', textAlign: 'center' }}>
                        <CheckCircle2 size={48} color="var(--success-color)" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                        <h3 style={{ fontSize: '16px', fontWeight: 600 }}>No changes to commit</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>Your working directory is clean.</p>
                    </div>
                )}
            </div>

            {/* Commit Panel */}
            <AnimatePresence>
                {hasChanges && (
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
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <MessageSquare size={16} color="var(--text-muted)" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <input
                                    type="text"
                                    placeholder="Summary (required)"
                                    value={summary}
                                    onChange={(e) => setSummary(e.target.value)}
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
                                    placeholder="Description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
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
                            style={{ width: '100%', height: '48px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '15px' }}
                            disabled={!summary}
                        >
                            <GitCommit size={18} />
                            Commit to {currentBranch}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
