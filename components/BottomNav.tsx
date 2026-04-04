import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ICONS } from '../constants';
import { useLanguage } from '../LanguageContext';
import { IS_RAMADAN } from '../src/config/theme';

const BottomNav: React.FC = () => {
    const { t } = useLanguage();
    const location = useLocation();
    const currentView = location.pathname.substring(1) || 'dashboard';

    const navItems = [
        { id: 'dashboard', name: t('dashboard'), icon: ICONS.dashboard },
        { id: 'schedule', name: t('classSchedule'), icon: ICONS.schedule },
        { id: 'tasks', name: t('tasks'), icon: ICONS.tasks },
        { id: 'pomodoro', name: 'Pomodoro', icon: ICONS.tasks }, // Use tasks icon for now
        { id: 'profile', name: t('profileSettings'), icon: ICONS.profile },
    ];

    return (
        <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-slate-100/95 dark:bg-black/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] transition-all duration-300`}>
            <div className="flex items-center justify-around h-16 px-2">
                {navItems.map((item) => {
                    const isActive = currentView === item.id;
                    return (
                        <Link
                            key={item.id}
                            to={`/${item.id}`}
                            className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 relative ${isActive
                                ? IS_RAMADAN
                                    ? 'text-amber-500 dark:text-amber-400'
                                    : 'text-indigo-600 dark:text-indigo-400'
                                : 'text-slate-500 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-amber-300'
                            }`}
                        >
                            {/* Active Indicator Bar */}
                            {isActive && (
                                <div className={`absolute top-0 w-8 h-1 rounded-full ${IS_RAMADAN ? 'bg-amber-500' : 'bg-indigo-600'}`} />
                            )}
                            
                            <div className={`${isActive ? 'scale-110' : 'scale-100'} transition-transform duration-200`}>
                                {item.icon}
                            </div>
                            <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter">
                                {item.name.split(' ')[0]} {/* Shorten name for mobile */}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
