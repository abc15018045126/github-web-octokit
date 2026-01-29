import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { Octokit } from 'octokit';
import { Browser } from '@capacitor/browser';
import { GitApi } from '../api/git';

interface GitHubContextType {
    octokit: Octokit | null;
    user: any | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (token: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
    openWebLogin: () => Promise<void>;
}

const GitHubContext = createContext<GitHubContextType | undefined>(undefined);

export const GitHubProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [octokit, setOctokit] = useState<Octokit | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('github_token'));
    const [user, setUser] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (token) {
            login(token).finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, []);

    const login = async (newToken: string) => {
        setIsLoading(true);
        try {
            const userData = await GitApi.login(newToken);
            const client = new Octokit({ auth: newToken });
            setOctokit(client);
            setToken(newToken);
            setUser(userData);
            localStorage.setItem('github_token', newToken);
        } catch (error) {
            console.error('Login failed:', error);
            localStorage.removeItem('github_token');
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const openWebLogin = async () => {
        const url = "https://github.com/settings/tokens/new?description=GitHub%20Web%20Octokit&scopes=repo,user";
        await Browser.open({ url });
    };

    const logout = () => {
        setOctokit(null);
        setToken(null);
        setUser(null);
        localStorage.removeItem('github_token');
    };

    return (
        <GitHubContext.Provider value={{ octokit, user, token, isAuthenticated: !!octokit, login, logout, isLoading, openWebLogin }}>
            {children}
        </GitHubContext.Provider>
    );
};

export const useGitHub = () => {
    const context = useContext(GitHubContext);
    if (context === undefined) {
        throw new Error('useGitHub must be used within a GitHubProvider');
    }
    return context;
};
