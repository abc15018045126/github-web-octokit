// Core Providers & Contexts
export * from './lib/GitHubProvider';
export * from './lib/I18nContext';

// Git API (The brain)
export * from './api/git/index';

// UI Components (The beauty)
export * from './api/git/ui/RepoManager';
export * from './api/git/ui/Login';
export * from './components/HistoryView';
export * from './components/RepoSelector';
export * from './components/SettingsView';
export * from './components/HomeView';
export * from './components/ChangesView';
export * from './components/GlobalHeader';

// Main App Entry (The full package)
export { default as App } from './App';
