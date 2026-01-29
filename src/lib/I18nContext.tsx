import React, { createContext, useContext, useState, type ReactNode } from 'react';

type Language = 'en' | 'zh';

const TRANSLATIONS: Record<Language, Record<string, string>> = {
    en: {
        loading: "Loading...",
        signin_title: "GitHub Web Octokit",
        signin_subtitle: "Sign in to access your repositories",
        login_browser: "Login via Browser",
        or_token: "OR USE TOKEN",
        token_placeholder: "Paste your Personal Access Token here",
        connect_token: "Connect with Token",
        tip_title: "💡 Pro Tip:",
        tip_1: "1. Click 'Login via Browser' to open GitHub.",
        tip_2: "2. Click 'Generate Token' at the bottom of the page.",
        tip_3: "3. Copy the token (ghp_xxx) and paste it above.",

        settings_public_repos: "Public Repos",
        settings_manage_repos: "Manage Git Repositories",
        settings_manage_repos_desc: "Configured local paths and sync history",
        settings_github_profile: "GitHub Profile",
        settings_view_web: "View on Web",
        settings_sign_out: "Sign Out",

        tab_home: "Home",
        tab_changes: "Changes",
        tab_history: "History",
        tab_settings: "Settings",

        explorer_title: "Local Explorer",
        explorer_subtitle: "Select a local folder to browse and manage repository files.",
        explorer_select_btn: "Select Local Folder",
        explorer_access_error: "⚠️ Access Error",
        explorer_change_root: "Change Root Folder",
        explorer_empty: "This folder is empty",

        changes_title: "Local Changes",
        changes_remote: "Remote URL",
        changes_no_path: "No local path selected",
        changes_loading: "Scanning for changes...",
        changes_none: "No local changes detected.",
        changes_up_to_date: "Up to date",
        changes_count_suffix: "CHANGED FILES",
        changes_refresh: "Refresh",
        changes_commit_summary: "Commit summary",
        changes_commit_desc: "Optional description",
        changes_push_to: "Push to",
        changes_syncing: "Syncing...",
        changes_success: "Success!",

        header_current_repo: "CURRENT REPOSITORY",
        header_branch: "BRANCH",
        header_more: "More",
        header_filter_branches: "Filter branches",
        header_fetching: "Fetching...",
        header_fetch: "Fetch",
        header_sync: "Sync",
        header_pull: "Pull",
        header_change_path: "Change Path",
        header_set_path: "Set Local Path",
        header_show_explorer: "Show in Explorer",
        header_view_github: "View on GitHub",
        header_force_remote: "Force Remote (Destructive)",
        header_force_remote_confirm: "Force Remote will DELETE all local changes. Continue?",

        history_loading: "Loading history...",
        history_committed_on: "committed on",

        selector_loading: "Loading repositories...",
        selector_title: "Select Repository",
        selector_filter: "Filter repositories",

        repoman_title: "Repo Manager",
        repoman_search: "Search repos or paths...",
        repoman_no_results: "No results found.",
        repoman_no_repos: "No repositories managed yet.",
        repoman_last_sync: "Last sync",
        repoman_auto_sync: "Auto-Sync",
        repoman_sync: "Sync",
        repoman_pull: "Pull",
        repoman_push: "Push",
        repoman_force_remote: "Force Remote",
        repoman_force_local: "Force Local",
        repoman_schedule: "Schedule",
        repoman_remove: "Remove",
        repoman_add_repo: "Add Repository",
        repoman_sync_all: "Sync All",
        repoman_schedule_all: "Schedule All",
        repoman_account: "Account",
        repoman_login: "Login",
        repoman_logout: "Logout",
        repoman_theme: "Theme",
        repoman_theme_light: "Light Mode",
        repoman_theme_dark: "Dark Mode",
        repoman_language: "Language",
        repoman_lang_en: "English",
        repoman_lang_zh: "Chinese",
        repoman_mandatory: "Mandatory Parameters",
        repoman_optional: "Optional Parameters",
        repoman_add_init: "Add & Initialize",
        repoman_token: "GitHub Token (PAT)",
        repoman_url: "Remote URL (e.g. owner/repo)",
        repoman_path: "Local Path",
        repoman_branch: "Branch",

        settings_title: "Settings",
        settings_appearance: "Appearance",
        settings_language: "Language",
        settings_theme: "Theme",
        settings_light: "Light",
        settings_dark: "Dark",
        settings_about: "About",
        settings_version: "Version",
        settings_logout: "Logout",

        common_confirm: "Confirm",
        common_cancel: "Cancel",
        common_save: "Save",
        common_delete: "Delete",
        common_edit: "Edit",
        common_add: "Add",
        common_search: "Search",
        common_back: "Back",

        repo_manager_title: "Repo Manager",
        repo_manager_add: "Add Repository",
        repo_manager_sync_all: "Sync All",
        repo_manager_schedule_all: "Schedule All",
        repo_manager_global_cron: "Global Sync Interval (Cron)",
        repo_manager_account: "Account",
        repo_manager_last_sync: "Last sync",
        repo_manager_auto_sync: "Auto-Sync",
    },
    zh: {
        loading: "加载中...",
        signin_title: "GitHub Web Octokit",
        signin_subtitle: "登录以访问您的仓库",
        login_browser: "通过浏览器登录",
        or_token: "或使用令牌",
        token_placeholder: "在此粘贴您的个人访问令牌 (PAT)",
        connect_token: "连接令牌",
        tip_title: "💡 小白提示：",
        tip_1: "1. 点击“通过浏览器登录”会在浏览器打开 GitHub。",
        tip_2: "2. 点击页面底部的绿按钮 Generate Token。",
        tip_3: "3. 复制生成的令牌 (ghp_xxx)，回到这里粘贴到上方框内即可。",

        settings_public_repos: "公开仓库",
        settings_manage_repos: "管理 Git 仓库",
        settings_manage_repos_desc: "配置本地路径和同步记录",
        settings_github_profile: "GitHub 个人资料",
        settings_view_web: "在网页查看",
        settings_sign_out: "退出登录",

        tab_home: "主页",
        tab_changes: "变更",
        tab_history: "历史",
        tab_settings: "设置",

        explorer_title: "本地浏览器",
        explorer_subtitle: "选择一个本地文件夹来浏览和管理仓库文件。",
        explorer_select_btn: "选择本地文件夹",
        explorer_access_error: "⚠️ 访问错误",
        explorer_change_root: "更改根文件夹",
        explorer_empty: "此文件夹为空",

        changes_title: "本地变更",
        changes_remote: "远程地址",
        changes_no_path: "未选择本地路径",
        changes_loading: "正在扫描变更...",
        changes_none: "未检测到本地变更。",
        changes_up_to_date: "已是最新",
        changes_count_suffix: "个变更文件",
        changes_refresh: "刷新",
        changes_commit_summary: "提交概要",
        changes_commit_desc: "补充说明 (可选)",
        changes_push_to: "推送到",
        changes_syncing: "正在同步...",
        changes_success: "成功！",

        header_current_repo: "当前仓库",
        header_branch: "分支",
        header_more: "更多",
        header_filter_branches: "筛选分支",
        header_fetching: "正在拉取...",
        header_fetch: "拉取",
        header_sync: "同步",
        header_pull: "拉取",
        header_change_path: "更改路径",
        header_set_path: "设置本地路径",
        header_show_explorer: "打开浏览器",
        header_view_github: "在 GitHub 查看",
        header_force_remote: "强制远程 (毁灭性)",
        header_force_remote_confirm: "强制远程将删除所有本地修改。是否继续？",

        history_loading: "正在加载历史记录...",
        history_committed_on: "提交于",

        selector_loading: "正在加载仓库...",
        selector_title: "选择仓库",
        selector_filter: "筛选仓库",

        repoman_title: "仓库管理器",
        repoman_search: "搜索仓库或路径...",
        repoman_no_results: "未找到结果。",
        repoman_no_repos: "暂无管理的仓库。",
        repoman_last_sync: "最后同步",
        repoman_auto_sync: "自动同步",
        repoman_sync: "同步",
        repoman_pull: "拉取",
        repoman_push: "推送",
        repoman_force_remote: "强制远程",
        repoman_force_local: "强制本地",
        repoman_schedule: "定时",
        repoman_remove: "移除",
        repoman_add_repo: "添加仓库",
        repoman_sync_all: "全部同步",
        repoman_schedule_all: "全部定时",
        repoman_account: "账号",
        repoman_login: "登录",
        repoman_logout: "退出登录",
        repoman_theme: "主题",
        repoman_theme_light: "浅色模式",
        repoman_theme_dark: "深色模式",
        repoman_language: "语言选择",
        repoman_lang_en: "英文 (English)",
        repoman_lang_zh: "中文 (Chinese)",
        repoman_mandatory: "必填参数",
        repoman_optional: "可选参数",
        repoman_add_init: "添加并初始化",
        repoman_token: "GitHub 令牌 (PAT)",
        repoman_url: "远程 URL (例如 owner/repo)",
        repoman_path: "本地路径",
        repoman_branch: "分支",

        settings_title: "设置",
        settings_appearance: "显示设置",
        settings_language: "语言",
        settings_theme: "主题",
        settings_light: "浅色",
        settings_dark: "深色",
        settings_about: "关于",
        settings_version: "版本",
        settings_logout: "退出登录",

        common_confirm: "确认",
        common_cancel: "取消",
        common_save: "保存",
        common_delete: "删除",
        common_edit: "编辑",
        common_add: "添加",
        common_search: "搜索",
        common_back: "返回",

        repo_manager_title: "仓库管理器",
        repo_manager_add: "添加仓库",
        repo_manager_sync_all: "全部同步",
        repo_manager_schedule_all: "全部定时",
        repo_manager_global_cron: "全局同步周期 (Cron)",
        repo_manager_account: "账号",
        repo_manager_last_sync: "最后同步",
        repo_manager_auto_sync: "自动同步",
    }
};

interface I18nContextType {
    lang: Language;
    setLang: (lang: Language) => void;
    changeLanguage: () => void;
    t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [lang, setLangState] = useState<Language>((localStorage.getItem('git_ui_lang') as Language) || 'en');

    const setLang = (newLang: Language) => {
        setLangState(newLang);
        localStorage.setItem('git_ui_lang', newLang);
    };

    const changeLanguage = () => {
        const next = lang === 'en' ? 'zh' : 'en';
        setLang(next);
    };

    const t = (key: string): string => {
        return TRANSLATIONS[lang][key] || key;
    };

    return (
        <I18nContext.Provider value={{ lang, setLang, changeLanguage, t }}>
            {children}
        </I18nContext.Provider>
    );
};

export const useI18n = () => {
    const context = useContext(I18nContext);
    if (!context) throw new Error("useI18n must be used within I18nProvider");
    return context;
};
