import React from 'react';
import { useLanguage } from '../LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../src/context/AuthContext';
import { IS_RAMADAN } from '../src/config/theme';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../src/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useDataManagement } from '../hooks/useDataManagement';

import { Task, Class, Note, Assignment, Quiz } from '../types';
import PageTour from './PageTour';


interface ProfileSettingsProps {
    tasks: Task[];
    classes: Class[];
    notes: Note[];
    assignments: Assignment[];
    quizzes: Quiz[];
    clearAllData: () => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ tasks, classes, notes, assignments, quizzes, clearAllData }) => {
    const { t } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    // Removed local useDataManagement hook call to avoid state desync
    const { logOut, user } = useAuth();
    // Use the hook to get importData
    // We need to pass empty props or mock them if we use useDataManagement here? 
    // Actually, useDataManagement doesn't take props.
    // However, ProfileSettings receives data as props.
    // We only need importData from the hook.
    // BUT call it here might cause double subscription? 
    // Yes, but for import it's fine.
    // Yes, but for import it's fine.
    const { importData } = useDataManagement(true);

    const [avatar, setAvatar] = React.useState<string>(user?.photoURL || '/logo.png');
    const [studentName, setStudentName] = React.useState<string>(user?.displayName || 'Student');
    const [imageError, setImageError] = React.useState<boolean>(false);
    const [nameSaved, setNameSaved] = React.useState(false);

    const handleSaveName = async (e?: React.SyntheticEvent) => {
        if (e) e.preventDefault();
        localStorage.setItem('studentName', studentName);
        if (auth.currentUser) {
            try {
                await updateProfile(auth.currentUser, { displayName: studentName });
                
                // Sync to BOTH collections for Leaderboard & Profile consistency
                await setDoc(doc(db, 'users', auth.currentUser.uid), { displayName: studentName }, { merge: true });
                await setDoc(doc(db, 'user_stats', auth.currentUser.uid), { displayName: studentName }, { merge: true });
            } catch (e) {
                console.error("Failed to sync name to Firebase:", e);
                // Non-critical — localStorage is the fallback
            }
        }
        setNameSaved(true);
        setTimeout(() => setNameSaved(false), 1500);
    };

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

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Prevent huge base64 strings from crashing Firestore (Limit ~1MB)
            if (file.size > 1048576) {
                alert(t('imageTooLarge') || 'Image is too large. Please select a file smaller than 1MB.');
                return;
            }
            const reader = new FileReader();
            reader.onload = async () => {
                const result = reader.result as string;
                setAvatar(result);
                setImageError(false);
                localStorage.setItem('avatar', result);

                if (auth.currentUser) {
                    try {
                        await updateProfile(auth.currentUser, { photoURL: result });
                        
                        // Sync to BOTH collections for Leaderboard & Profile consistency
                        await setDoc(doc(db, 'users', auth.currentUser.uid), { photoURL: result }, { merge: true });
                        await setDoc(doc(db, 'user_stats', auth.currentUser.uid), { photoURL: result }, { merge: true });
                    } catch (e) {
                        console.error("Failed to sync avatar to Firebase:", e);
                    }
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        setStudentName(name);
        localStorage.setItem('studentName', name);
    };

    const exportData = () => {
        const data = { tasks, classes, notes, assignments, quizzes };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rnote-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportClick = () => {
        document.getElementById('import-file')?.click();
    };

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (window.confirm(t('confirmImport'))) {
                await importData(data);
                alert(t('importSuccess'));
            }
        } catch (error: any) {
            console.error('Import failed:', error);
            const errorMessage = error.message || 'Unknown error';
            alert(`${t('importFailed')}\nDetails: ${errorMessage}`);
        } finally {
            // Reset input
            e.target.value = '';
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <PageTour
                pageKey="profile"
                title={t('tourProfileTitle')}
                description={t('tourProfileDesc')}
                features={t('tourProfileFeatures').split(',')}
            />
            <h1 className={`text-3xl font-bold mb-6 ${IS_RAMADAN ? 'text-gold-gradient' : 'text-gray-800 dark:text-white'}`}>{t('profileSettings')}</h1>

            <div className={`max-w-md lg:max-w-lg mx-auto backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-2xl rounded-[32px] p-8 transition-colors duration-300 ${IS_RAMADAN ? 'card-royal' : 'bg-white dark:bg-slate-900/60'}`}>
                <form onSubmit={e => e.preventDefault()}>
                    {/* Profile Picture */}
                    <div className="mb-8 text-center">
                        {(!avatar || imageError) ? (
                            <div className="h-28 w-28 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-700 flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                            </div>
                        ) : (
                            <div className="relative inline-block">
                                <img
                                    src={avatar}
                                    alt="Profile Picture"
                                    className="h-28 w-28 rounded-full object-cover border-4 border-white dark:border-slate-700 mx-auto shadow-lg transition-transform hover:scale-105"
                                    onError={() => setImageError(true)}
                                />
                                <div className="absolute bottom-1 right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800"></div>
                            </div>
                        )}
                        <h2 className={`mt-4 text-xl font-bold flex items-center justify-center gap-2 ${IS_RAMADAN ? 'text-gold-gradient' : 'text-slate-800 dark:text-white'}`}>
                            {studentName} 🦊
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email || 'Student Account'}</p>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <label className="block text-slate-700 dark:text-gray-300 text-sm font-bold mb-2 ml-1" htmlFor="displayName">
                                {t('displayName') || 'Display Name'}
                            </label>
                            <input
                                className="w-full px-4 py-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                id="displayName"
                                type="text"
                                value={studentName}
                                onChange={e => setStudentName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSaveName(e)}
                            />
                            <button
                                type="button"
                                onClick={handleSaveName}
                                className={`mt-4 px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95 ${nameSaved
                                    ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                                    }`}
                            >
                                {nameSaved ? t('saved') : t('saveName')}
                            </button>
                        </div>
                        <div>
                            <label className="block text-slate-700 dark:text-gray-300 text-sm font-bold mb-2 ml-1" htmlFor="username">
                                {t('emailAddress') || 'Email Address'}
                            </label>
                            <input
                                className="w-full px-4 py-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-not-allowed opacity-75"
                                id="username"
                                type="email"
                                value={user?.email || 'student@university.edu'}
                                disabled
                            />
                        </div>
                    </div>
                </form>

                <div className="border-t border-slate-100 dark:border-white/10 pt-6 mt-8 mb-6">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">{t('appPreferences') || 'App Preferences'}</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                            <span className="text-sm font-medium text-slate-700 dark:text-gray-300 flex items-center">
                                <span>{theme === 'dark' ? '🌙' : '☀️'}</span>
                                <span className="ms-3">{t('theme') || 'Theme'}</span>
                            </span>
                            <button
                                onClick={toggleTheme}
                                className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-slate-700 text-yellow-300' : 'bg-white text-orange-500 shadow-sm border border-slate-200'}`}
                            >
                                {theme === 'dark' ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-100 dark:border-white/10 pt-6 mt-8 mb-6">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">{t('community')}</h2>
                    <a
                        href="https://t.me/RISECP1"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-[#24A1DE] hover:bg-[#2090C7] text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-[#24A1DE]/20 active:scale-95"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 shrink-0">
                            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.14-.26.26-.54.26l.198-2.82 5.132-4.641c.223-.198-.048-.307-.34-.112l-6.34 3.993-2.73-.853c-.594-.186-.605-.594.124-.88l10.67-4.113c.493-.186.923.112.746.853z" />
                        </svg>
                        {t('joinCommunity')}
                    </a>
                </div>

                <div className="border-t border-slate-100 dark:border-white/10 pt-6 mb-6">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">{t('dataManagement') || 'Data Management'}</h2>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <button
                                onClick={exportData}
                                className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-bold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30 gap-3"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                {t('exportData')}
                            </button>

                            <button
                                onClick={handleImportClick}
                                className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 font-bold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center border border-emerald-100 dark:border-emerald-900/30 gap-3"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                {t('importData')}
                            </button>
                            <input
                                type="file"
                                id="import-file"
                                className="hidden"
                                accept=".json"
                                onChange={handleImportFile}
                            />
                        </div>

                        <button
                            onClick={() => {
                                if (window.confirm('Are you sure you want to delete ALL data? This action cannot be undone.')) {
                                    clearAllData();
                                    alert('All data has been deleted.');
                                }
                            }}
                            className="w-full bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-bold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center border border-red-100 dark:border-red-900/30 gap-3"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>{t('deleteAllData')}</span>
                        </button>
                    </div>
                </div>



                <div className="border-t border-slate-100 dark:border-white/10 pt-6">
                    <button onClick={logOut} className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white font-bold py-3 px-4 rounded-xl transition-colors">
                        {t('signOut') || 'Sign Out'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileSettings;
