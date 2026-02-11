import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>((localStorage.getItem('git_ui_theme') as Theme) || 'dark');

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('git_ui_theme', newTheme);
    };

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    const applyTheme = (currentTheme: string) => {
        const root = document.documentElement;
        root.setAttribute('data-theme', currentTheme);
        if (currentTheme === 'light') {
            root.style.setProperty('--bg-color', '#f6f8fa');
            root.style.setProperty('--surface-color', '#ffffff');
            root.style.setProperty('--text-color', '#1f2328');
            root.style.setProperty('--text-muted', '#657d8a');
            root.style.setProperty('--border-color', '#d0d7de');
            root.style.setProperty('--card-bg', '#ffffff');
            root.style.setProperty('--accent-color', '#0969da');
            root.style.setProperty('--danger-color', '#cf222e');
            root.style.setProperty('--success-color', '#1a7f37');
            root.style.setProperty('--header-bg', '#ffffff');
            root.style.setProperty('--header-text', '#1f2328');
            root.style.setProperty('--tab-bar-bg', 'rgba(255, 255, 255, 0.85)');
        } else {
            root.style.setProperty('--bg-color', '#0d1117');
            root.style.setProperty('--surface-color', '#161b22');
            root.style.setProperty('--text-color', '#e6edf3');
            root.style.setProperty('--text-muted', '#7d8590');
            root.style.setProperty('--border-color', '#30363d');
            root.style.setProperty('--card-bg', '#161b22');
            root.style.setProperty('--accent-color', '#58a6ff');
            root.style.setProperty('--danger-color', '#ff7b72');
            root.style.setProperty('--success-color', '#3fb950');
            root.style.setProperty('--header-bg', '#0d1117');
            root.style.setProperty('--header-text', '#ffffff');
            root.style.setProperty('--tab-bar-bg', 'rgba(13, 17, 23, 0.85)');
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error("useTheme must be used within ThemeProvider");
    return context;
};
