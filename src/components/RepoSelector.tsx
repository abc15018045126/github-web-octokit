import React, { useEffect, useState } from 'react';
import { useGitHub } from '../lib/GitHubProvider';
import { Search, Book } from 'lucide-react';
import { useI18n } from '../lib/I18nContext';

interface Repo {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    description: string;
}

export const RepoSelector: React.FC<{ onSelect: (repo: Repo) => void }> = ({ onSelect }) => {
    const { t } = useI18n();
    const { octokit } = useGitHub();
    const [repos, setRepos] = useState<Repo[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        const fetchRepos = async () => {
            if (!octokit) return;
            try {
                const { data } = await octokit.rest.repos.listForAuthenticatedUser({
                    sort: 'updated',
                    per_page: 100,
                });
                setRepos(data as Repo[]);
            } catch (error) {
                console.error('Failed to fetch repos:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchRepos();
    }, [octokit]);

    const filteredRepos = repos.filter(repo =>
        repo.full_name.toLowerCase().includes(filter.toLowerCase())
    );

    if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>{t('selector_loading')}</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
                <h2 style={{ marginBottom: '12px', fontSize: '18px' }}>{t('selector_title')}</h2>
                <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder={t('selector_filter')}
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 10px 10px 36px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-color)',
                            color: 'inherit'
                        }}
                    />
                </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {filteredRepos.map(repo => (
                    <div
                        key={repo.id}
                        onClick={() => onSelect(repo)}
                        style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid var(--border-color)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}
                    >
                        <Book size={20} color={repo.private ? '#e3b341' : '#8b949e'} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, fontSize: '14px' }}>{repo.full_name}</span>
                            {repo.description && <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>{repo.description}</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
