import React, { useEffect, useState } from 'react';
import { useGitHub } from '../lib/GitHubProvider';
import { User } from 'lucide-react';
import { useI18n } from '../lib/I18nContext';

interface Commit {
    sha: string;
    commit: {
        message: string;
        author: {
            name: string;
            date: string;
        };
    };
    author: {
        avatar_url: string;
        login: string;
    } | null;
}

export const HistoryView: React.FC<{ owner: string; repo: string }> = ({ owner, repo }) => {
    const { t } = useI18n();
    const { octokit } = useGitHub();
    const [commits, setCommits] = useState<Commit[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCommits = async () => {
            if (!octokit) return;
            setLoading(true);
            try {
                const { data } = await octokit.rest.repos.listCommits({
                    owner,
                    repo,
                    per_page: 30,
                });
                setCommits(data as Commit[]);
            } catch (error) {
                console.error('Failed to fetch commits:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchCommits();
    }, [octokit, owner, repo]);

    if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>{t('history_loading')}</div>;

    return (
        <div style={{ background: 'var(--bg-color)', minHeight: '100%' }}>
            {commits.map((c) => (
                <div
                    key={c.sha}
                    style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border-color)',
                        background: 'var(--surface-color)',
                        display: 'flex',
                        gap: '12px'
                    }}
                >
                    {c.author ? (
                        <img src={c.author.avatar_url} style={{ width: '32px', height: '32px', borderRadius: '50%' }} alt="author" />
                    ) : (
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={16} />
                        </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.commit.message.split('\n')[0]}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <span style={{ fontWeight: 500 }}>{c.author?.login || c.commit.author.name}</span>
                            <span>{t('history_committed_on')} {new Date(c.commit.author.date).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--accent-color)' }}>
                        {c.sha.substring(0, 7)}
                    </div>
                </div>
            ))}
        </div>
    );
};
