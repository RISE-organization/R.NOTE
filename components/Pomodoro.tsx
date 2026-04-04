import React from 'react';
import { ICONS } from '../constants';
import { sendNotification } from '../src/utils/notifications';
import { useLanguage } from '../LanguageContext';
import { IS_RAMADAN } from '../src/config/theme';
import PageTour from './PageTour';
import { usePomodoro } from '../context/PomodoroContext';

const Pomodoro: React.FC = () => {
    const { t, language } = useLanguage();
    const {
        workMin, breakMin, timeLeft, isActive, isBreak, sessions,
        setWorkMin, setBreakMin, toggleTimer, resetTimer
    } = usePomodoro();

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const totalTime = (isBreak ? breakMin : workMin) * 60;
    const progress = (totalTime - timeLeft) / totalTime;

    return (
        <div className="flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-theme(spacing.16))]">
            <PageTour
                pageKey="pomodoro"
                title={t('tourPomodoroTitle')}
                description={t('tourPomodoroDesc')}
                features={t('tourPomodoroFeatures').split(',')}
            />
            <h1 className="text-3xl font-bold mb-8 text-gold-gradient">{t('pomodoroTimer')}</h1>

            <div className={`max-w-md w-full mx-auto shadow-sm dark:shadow-2xl rounded-[32px] p-8 text-center transition-colors duration-300 ${IS_RAMADAN ? 'card-royal' : 'glass-card'}`}>

                {/* Customization Inputs */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-2 uppercase">{t('workDuration')}</label>
                        <input
                            type="number"
                            value={workMin}
                            onChange={(e) => setWorkMin(Math.max(1, Number(e.target.value)))}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white text-center font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-2 uppercase">{t('breakDuration')}</label>
                        <input
                            type="number"
                            value={breakMin}
                            onChange={(e) => setBreakMin(Math.max(1, Number(e.target.value)))}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white text-center font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-2">{t('focusTask')}</label>
                    <input type="text" placeholder={t('whatAreYouWorkingOn')} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                </div>

                {/* Timer Container (Original Simple Design) */}
                <div className="relative w-64 h-64 mx-auto mb-8">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                        {/* Static faint background track */}
                        <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="4" fill="none" className="text-slate-200 dark:text-slate-700" />
                        
                        {/* Dynamic Progress Ring */}
                        <circle 
                            cx="50" cy="50" r="45" 
                            stroke="currentColor" 
                            strokeWidth="4" 
                            fill="none" 
                            strokeDasharray={`${progress * 283} 283`} 
                            strokeLinecap="round" 
                            className="text-amber-500 transition-all duration-1000 ease-linear shadow-[0_0_15px_rgba(245,158,11,0.5)]" 
                            transform="rotate(-90 50 50)" 
                        />
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-6xl font-mono font-bold text-slate-800 dark:text-white tracking-tighter">{formatTime(timeLeft)}</span>
                        <span className="text-sm font-medium text-slate-500 dark:text-gray-400 mt-2 uppercase tracking-widest">{isBreak ? t('breakTime') : t('workTime')}</span>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center mb-8 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                    <span className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400 dark:text-gray-500 mb-1 leading-none">
                        {language === 'ar' ? 'جلسات اليوم' : "Today's Sessions"}
                    </span>
                    <span className="text-3xl font-black text-amber-500 dark:text-amber-400 leading-none tabular-nums">
                        {sessions}
                    </span>
                </div>

                <div className="flex justify-center space-x-4">
                    <button
                        onClick={toggleTimer}
                        className="font-bold py-4 px-10 rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-500/30"
                    >
                        {isActive ? t('pause') : t('start')}
                    </button>
                    <button
                        onClick={resetTimer}
                        className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-white font-bold py-4 px-6 rounded-2xl shadow-sm transition-all duration-300"
                    >
                        {t('reset')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Pomodoro;
