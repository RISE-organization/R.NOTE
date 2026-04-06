import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataManagement } from '../hooks/useDataManagement';
import { Class } from '../types';
import { useAuth } from '../src/context/AuthContext';
import { useLanguage } from '../LanguageContext';
import { ICONS } from '../constants';

const timeSlots = [
    '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM'
];

const PublicScheduleView: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const { getPublicSchedule, importSchedule } = useDataManagement();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { t } = useLanguage();

    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);

    useEffect(() => {
        // Ensure dark mode
        document.documentElement.classList.add('dark');

        const fetchSchedule = async () => {
            if (!userId) return;
            try {
                const fetchedClasses = await getPublicSchedule(userId);
                setClasses(fetchedClasses);
            } catch (err) {
                console.error("Failed to load schedule", err);
            } finally {
                setLoading(false);
            }
        };

        fetchSchedule();
    }, [userId, getPublicSchedule]);

    const handleImport = async () => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (classes.length === 0) return;

        setImporting(true);
        try {
            await importSchedule(classes);
            alert(t('scheduleImported'));
            navigate('/schedule');
        } catch (error) {
            console.error(error);
            alert("Failed to import schedule.");
        } finally {
            setImporting(false);
        }
    };

    const days = [t('sunday'), t('monday'), t('tuesday'), t('wednesday'), t('thursday')];
    const originalDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col font-sans relative overflow-hidden text-white">
            {/* Background Effects */}
            <div className="absolute inset-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-900/10 blur-[100px] rounded-full mix-blend-screen opacity-30"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-purple-900/10 blur-[100px] rounded-full mix-blend-screen opacity-30"></div>
            </div>

            {/* Header */}
            <header className="bg-slate-900/60 backdrop-blur-xl border-b border-white/5 sticky top-0 z-20 shadow-sm p-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="R.Note Logo" className="h-10 w-10" />
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                            {t('rNote')}
                        </h1>
                    </div>
                    {user ? (
                        <button
                            onClick={handleImport}
                            disabled={importing || classes.length === 0}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-xl transition-all shadow-lg shadow-indigo-500/30 flex items-center gap-2"
                        >
                            {importing ? (
                                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                            ) : ICONS.plus}
                            <span>{t('importSchedule')}</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => navigate('/login')}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-xl transition-all"
                        >
                            {t('importSchedule')} ({t('login') || 'Login'})
                        </button>
                    )}
                </div>
            </header>

            <main className="flex-grow p-4 sm:p-8 relative z-10">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-white mb-2">{t('viewingScheduleOf')} {userId ? `@${userId.slice(0, 8)}` : t('aStudent') || 'a student'}</h2>
                        <p className="text-gray-400">{classes.length} {classes.length === 1 ? t('session') : t('sessions')}</p>
                    </div>

                    <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl rounded-[32px] overflow-x-auto p-4 relative">
                        <div className="grid grid-cols-6 min-w-[1000px]">
                            {/* Empty corner cell */}
                            <div className="bg-slate-900/60 z-10 sticky left-0 top-0 border-b border-r border-white/20"></div>

                            {/* Day headers */}
                            {days.map((day) => (
                                <div key={day} className="text-center font-bold text-white py-4 border-b border-white/20 bg-white/5">
                                    {day}
                                </div>
                            ))}

                            {/* Time slots and schedule cells */}
                            {timeSlots.map((time, timeIndex) => (
                                <React.Fragment key={time}>
                                    <div className={`text-center text-xs font-semibold text-white/70 pe-2 py-4 ltr:border-r rtl:border-l border-white/20 bg-slate-900/60 sticky left-0 flex items-center justify-center ${timeIndex !== timeSlots.length - 1 ? 'border-b' : ''}`}>
                                        {time}
                                    </div>
                                    {originalDays.map((day) => {
                                        const parseTime = (tStr: string) => {
                                            const [timePart, meridiem] = (tStr || '').split(' ');
                                            const [hour] = (timePart || '').split(':');
                                            return {
                                                hour: parseInt(hour, 10),
                                                meridiem: meridiem?.toUpperCase()
                                            };
                                        };

                                        const classItem = classes.find(c => {
                                            if (c.day !== day) return false;
                                            const slotTime = parseTime(time);
                                            const classTime = parseTime(c.time);
                                            return slotTime.hour === classTime.hour && slotTime.meridiem === classTime.meridiem;
                                        });

                                        const getColorClass = (colorClass: string | undefined) => {
                                            const safeColorClass = colorClass || 'bg-indigo-600';
                                            let finalColor = safeColorClass;

                                            // Map legacy/problematic colors to new high-contrast ones
                                            if (safeColorClass.includes('yellow')) finalColor = 'bg-orange-600';
                                            else if (safeColorClass.includes('pink') || safeColorClass.includes('rose')) finalColor = 'bg-teal-600';
                                            else if (safeColorClass.includes('purple') || safeColorClass.includes('indigo')) finalColor = 'bg-cyan-600';

                                            return `${finalColor} dark:${finalColor}/80`;
                                        };

                                        return (
                                            <div key={`${day}-${time}`} className="border-b ltr:border-r rtl:border-l border-white/20 h-24 p-1 group relative transition-colors hover:bg-white/5">
                                                {classItem && (
                                                    <div className={`rounded-xl p-3 h-full flex flex-col justify-between ${getColorClass(classItem.color)} text-white shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden`}>
                                                        <div className="overflow-hidden">
                                                            <p className="font-bold text-sm truncate leading-tight">{classItem.subject}</p>
                                                            <p className="text-xs opacity-90 truncate mt-0.5">{classItem.time}</p>
                                                            <p className="text-xs opacity-75 truncate mt-1">{classItem.instructor}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PublicScheduleView;
