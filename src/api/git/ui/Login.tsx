import React, { useState } from 'react';
import { Github } from 'lucide-react';
import { useGitHub } from '../../../lib/GitHubProvider';
import { useI18n } from '../../../lib/I18nContext';

interface LoginProps {
    onSuccess?: () => void;
    title?: string;
}

export const Login: React.FC<LoginProps> = ({ onSuccess, title }) => {
    const { t } = useI18n();
    const { login, openWebLogin } = useGitHub();
    const [tokenInput, setTokenInput] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleTokenLogin = async () => {
        if (!tokenInput) return;
        setLoading(true);
        setError('');
        try {
            await login(tokenInput);
            if (onSuccess) onSuccess();
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
            <Github size={48} style={{ marginBottom: '16px', color: 'var(--text-color)' }} />
            <h2 style={{ marginBottom: '8px' }}>{title || t('signin_title')}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '14px' }}>{t('signin_subtitle')}</p>

            <button
                className="btn-primary"
                style={{ width: '100%', marginBottom: '16px', height: '48px', fontSize: '16px', borderRadius: '12px' }}
                onClick={openWebLogin}
            >
                {t('login_browser')}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0', width: '100%', color: 'var(--border-color)' }}>
                <div style={{ flex: 1, height: '1px', background: 'currentColor' }}></div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('or_token')}</span>
                <div style={{ flex: 1, height: '1px', background: 'currentColor' }}></div>
            </div>

            <input
                type="password"
                placeholder={t('token_placeholder')}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    marginBottom: '12px',
                    background: 'var(--surface-color)',
                    color: 'inherit',
                    outline: 'none'
                }}
            />

            {error && <div style={{ color: 'var(--danger-color)', fontSize: '12px', marginBottom: '12px' }}>{error}</div>}

            <button
                className="btn-primary"
                style={{ width: '100%', padding: '12px', borderRadius: '10px', height: '48px', fontSize: '14px' }}
                onClick={handleTokenLogin}
                disabled={loading}
            >
                {loading ? t('loading') : t('connect_token')}
            </button>

            <div style={{ marginTop: '24px', textAlign: 'left', width: '100%', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '13px', marginBottom: '8px', color: 'var(--text-color)' }}>{t('tip_title')}</h4>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                    <div>{t('tip_1')}</div>
                    <div>{t('tip_2')}</div>
                    <div style={{ marginTop: '4px' }}>{t('tip_3')}</div>
                </div>
            </div>
        </div>
    );
};
