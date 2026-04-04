import React, { useState } from 'react';
import { ICONS } from '../constants';
import { useLanguage } from '../LanguageContext';
import { InviteSystem } from './InviteSystem';

interface HeaderProps {
    toggleSidebar: () => void;
    onSearch?: (q: string) => void;
    searchQuery?: string;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, onSearch, searchQuery = '' }) => {
    const { language, t, switchLanguage } = useLanguage();
    const [showSearch, setShowSearch] = useState(false);

    return (
        <header className="bg-white/80 dark:bg-black/50 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors duration-300">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 gap-3">
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <button
                            onClick={toggleSidebar}
                            className="text-slate-500 dark:text-gray-300 focus:outline-none hidden hover:text-slate-700 dark:hover:text-white transition-colors"
                            aria-label="Open sidebar"
                        >
                            {ICONS.menu}
                        </button>
                        <div className="flex items-center">
                            <img src="/logo.png" alt="R.Note Logo" className="h-8 w-8 object-contain" />
                            <span className={`ms-2 text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-orange-500 dark:via-purple-500 dark:to-indigo-500 bg-clip-text text-transparent transition-all duration-300 ${showSearch ? 'hidden sm:inline' : 'inline'}`}>{t('rNote')}</span>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className={`flex-1 max-w-md transition-all duration-300 ${showSearch ? 'opacity-100' : 'opacity-0 pointer-events-none w-0'}`}>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => onSearch?.(e.target.value)}
                            placeholder={t('search') || 'Search tasks, notes, quizzes…'}
                            className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                            autoFocus={showSearch}
                        />
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Search Toggle */}
                        <button
                            onClick={() => { setShowSearch(s => !s); if (showSearch) onSearch?.(''); }}
                            className={`p-2 rounded-xl transition-colors ${showSearch ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/10'}`}
                            aria-label="Toggle search"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>
                        <InviteSystem />
                        <button
                            onClick={() => switchLanguage(language === 'en' ? 'ar' : 'en')}
                            className="px-3 py-1 text-sm bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 rounded-full border border-slate-200 dark:border-gray-700 hover:bg-slate-200 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm"
                        >
                            {language === 'en' ? 'العربية' : 'English'}
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
