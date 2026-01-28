import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { Octokit } from 'octokit';
import { Browser } from '@capacitor/browser';

interface GitHubContextType {
    octokit: Octokit | null;
    user: any | null;
    isAuthenticated: boolean;
    login: (token: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
    openWebLogin: () => Promise<void>;
}

const GitHubContext = createContext<GitHubContextType | undefined>(undefined);

export const GitHubProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [octokit, setOctokit] = useState<Octokit | null>(null);
    const [user, setUser] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const savedToken = localStorage.getItem('github_token');
        if (savedToken) {
            login(savedToken).finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, []);

    const login = async (token: string) => {
        setIsLoading(true);
        try {
            const client = new Octokit({ auth: token });
            const { data: userData } = await client.rest.users.getAuthenticated();
            setOctokit(client);
            setUser(userData);
            localStorage.setItem('github_token', token);
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
        setUser(null);
        localStorage.removeItem('github_token');
    };

    return (
        <GitHubContext.Provider value={{ octokit, user, isAuthenticated: !!octokit, login, logout, isLoading, openWebLogin }}>
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
