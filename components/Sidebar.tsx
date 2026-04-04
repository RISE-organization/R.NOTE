import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ICONS } from '../constants';
import { useLanguage } from '../LanguageContext';
import { useAuth } from '../src/context/AuthContext';
import { IS_RAMADAN } from '../src/config/theme';
import { usePWAInstall } from '../src/hooks/usePWAInstall';

interface SidebarProps {
    isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const location = useLocation();
    const currentView = location.pathname.substring(1) || 'dashboard';
    const { isInstallable, install } = usePWAInstall();
    const [avatar, setAvatar] = React.useState<string>(user?.photoURL || '/logo.png');
    const [studentName, setStudentName] = React.useState<string>(user?.displayName || 'Student');
    const [imageError, setImageError] = React.useState<boolean>(false);

    React.useEffect(() => {
        if (user?.photoURL) {
            setAvatar(user.photoURL);
            setImageError(false);
        }
        if (user?.displayName) setStudentName(user.displayName);
        const savedAvatar = localStorage.getItem('avatar');
        if (savedAvatar && !user?.photoURL) {
            setAvatar(savedAvatar);
            setImageError(false);
        }
        const savedName = localStorage.getItem('studentName');
        if (savedName && !user?.displayName) setStudentName(savedName);
    }, [user]);

    const navItems = [
        { id: 'dashboard', name: t('dashboard'), icon: ICONS.dashboard },
        { id: 'schedule', name: t('classSchedule'), icon: ICONS.schedule },
        { id: 'tasks', name: t('tasks'), icon: ICONS.tasks },
        { id: 'quizzes', name: t('quizzes'), icon: ICONS.quizzes },
        { id: 'assignments', name: t('assignments'), icon: ICONS.assignments },
        { id: 'notes', name: t('notes'), icon: ICONS.notes },
        { id: 'pomodoro', name: 'Pomodoro', icon: ICONS.tasks }, // Use tasks icon for now
        { id: 'profile', name: t('profileSettings'), icon: ICONS.profile },
    ];

    const baseClasses = "hidden md:flex flex-col bg-slate-100/80 dark:bg-black/30 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 shadow-lg h-full transition-all duration-300 ease-in-out z-40 w-56 lg:w-64";

    // Positioning and Visibility logic
    const isRTL = language === 'ar';
    const positionClasses = isRTL ? 'right-0' : 'left-0';
    
    // Mobile transform logic (only applies when sidebar is a drawer)
    const transformClasses = isOpen
        ? 'translate-x-0'
        : isRTL ? 'translate-x-full' : '-translate-x-full';

    // Desktop/Tablet (lg+) specific behavior: Reset fixed positioning and transforms
    const responsiveClasses = "lg:static lg:h-screen lg:sticky lg:top-0 lg:translate-x-0 lg:shadow-none lg:z-30";

    return (
        <aside className={`${baseClasses} fixed inset-y-0 ${positionClasses} ${transformClasses} ${responsiveClasses} flex flex-col`}>
            {/* Student Info Header */}
            <div className={`pt-32 pb-4 px-4 bg-gradient-to-b ${IS_RAMADAN ? 'from-emerald-900/10 dark:from-gold-500/10' : 'from-white/20 dark:from-black/20'} to-transparent`}>
                <div className="flex flex-col items-center relative">

                    {/* Ramadan Crescent 🌙 */}
                    {IS_RAMADAN && (
                        <div className="absolute top-0 right-10 text-2xl animate-pulse filter drop-shadow-md z-50 transform -rotate-12" title={t('ramadanKareem')}>
                            🌙
                        </div>
                    )}
                    {(!avatar || imageError) ? (
                        <div className={`h-16 w-16 rounded-full bg-white dark:bg-slate-800 border-2 ${IS_RAMADAN ? 'border-amber-500/50 shadow-[0_0_15px_rgba(251,191,36,0.2)]' : 'border-slate-200 dark:border-slate-600'} flex items-center justify-center mb-3 shadow-md`}>
                            <span className="text-2xl text-slate-400 dark:text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                            </span>
                        </div>
                    ) : (
                        <img
                            src={avatar}
                            alt="Student Avatar"
                            className={`h-16 w-16 rounded-full object-cover border-2 ${IS_RAMADAN ? 'border-amber-500/50 shadow-[0_0_15px_rgba(251,191,36,0.2)]' : 'border-white dark:border-white/20'} mb-3 shadow-md`}
                            onError={() => setImageError(true)}
                        />
                    )}
                    <div className="text-center">
                        <p className={`font-bold text-lg tracking-wide ${IS_RAMADAN ? 'text-gold-gradient drop-shadow-sm' : 'text-slate-800 dark:text-white'}`}>{studentName}</p>
                        <p className="text-slate-500 dark:text-gray-400 text-xs uppercase tracking-wider font-medium">Student 🦊</p>
                    </div>
                </div>
            </div>
            <nav className="px-2 py-4 space-y-1">
                {navItems.map((item) => (
                    <Link
                        key={item.id}
                        to={`/${item.id}`}
                        className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${currentView === item.id
                            ? IS_RAMADAN
                                ? 'bg-indigo-100 text-indigo-900 border-r-2 border-indigo-700 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500 dark:shadow-[0_0_15px_rgba(251,191,36,0.2)]'
                                : 'bg-white dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 shadow-sm ring-1 ring-slate-300 dark:ring-indigo-700'
                            : 'text-slate-600 hover:text-indigo-800 hover:bg-slate-200 dark:hover:text-amber-200 dark:hover:bg-white/5'
                            }`}
                    >
                        {item.icon}
                        <span className="ms-3">{item.name}</span>
                    </Link>
                ))}
            </nav>
            <div className="mt-auto py-4 px-4 text-center space-y-3">
                {/* PWA Install Button - only shows when installable */}
                {isInstallable && (
                    <button
                        onClick={install}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${IS_RAMADAN
                            ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 hover:border-amber-400 hover:shadow-[0_0_12px_rgba(251,191,36,0.2)]'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md hover:shadow-indigo-500/40 dark:bg-indigo-500/20 dark:hover:bg-indigo-500/30 dark:text-indigo-300 dark:border dark:border-indigo-500/40'
                            }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        {language === 'ar' ? 'تثبيت التطبيق' : 'Install App'}
                    </button>
                )}
                <p className="text-xs text-slate-400 dark:text-gray-600">v2.2.0</p>
                <div className="text-[10px] text-slate-500 dark:text-gray-500">
                    Built with <span className="text-red-500">♥</span> by <a href="https://fahadwm101.github.io/FAHAD.GITHUP/" target="_blank" rel="noopener noreferrer" className="font-bold hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors">CHEETAH</a>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;