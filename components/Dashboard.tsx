
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Task, Quiz, Note, Assignment, Priority, ModalContent } from '../types';
import { ICONS } from '../constants';
import { useLanguage } from '../LanguageContext';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import Layout from './Layout';
import PageTour from './PageTour';
import { IS_RAMADAN } from '../src/config/theme';
import LeaderboardModal from './LeaderboardModal';

interface DashboardProps {
    tasks: Task[];
    quizzes: Quiz[];
    notes: Note[];
    assignments: Assignment[];
    streak: number;
    totalXp: number;
    openModal: (view: ModalContent['view']) => void;
}



const PriorityBadge: React.FC<{ priority: Priority }> = ({ priority }) => {
    const colorClasses = {
        [Priority.High]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
        [Priority.Medium]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        [Priority.Low]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    };
    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClasses[priority]}`}>
            {priority}
        </span>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ tasks = [], quizzes = [], notes = [], assignments = [], streak = 0, totalXp = 0, openModal }) => {
    const { t, language } = useLanguage();
    const [showSuggestion, setShowSuggestion] = useState(false);
    const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

    const today = useMemo(() => new Date().toISOString().split('T')[0], []);

    const suggestedTask = useMemo(() => {
        const incompleteTasks = tasks.filter(task => !task.completed);
        return incompleteTasks.sort((a, b) => {
            const priorityOrder: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
            const priorityDiff = (priorityOrder[b.priority] ?? 0) - (priorityOrder[a.priority] ?? 0);
            if (priorityDiff !== 0) return priorityDiff;
            const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
            const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
            return dateA - dateB;
        })[0];
    }, [tasks]);

    const todaysTasks = (tasks || []).filter(task => task.dueDate === today && !task.completed);
    const upcomingQuizzes = (quizzes || [])
        .filter(quiz => {
            if (quiz.completed) return false;
            if (!quiz.date) return false;
            const date = new Date(quiz.date);
            date.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return !isNaN(date.getTime()) && date.getTime() >= today.getTime();
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 3);

    const upcomingAssignments = (assignments || [])
        .filter(a => a.status !== 'Submitted')
        .sort((a, b) => {
            const dateA = new Date(a.dueDate).getTime();
            const dateB = new Date(b.dueDate).getTime();
            return dateA - dateB;
        }).slice(0, 3);

    const totalTasks = (tasks || []).length;
    const taskCompletionData = [
        { name: t('completed'), value: (tasks || []).filter(t => t.completed).length, color: '#10b981' },
        { name: t('pending'), value: (tasks || []).filter(t => !t.completed).length, color: '#f59e0b' }
    ];

    return (
        <Layout>
            <PageTour
                pageKey="dashboard"
                title={t('tourDashboardTitle')}
                description={t('tourDashboardDesc')}
                features={t('tourDashboardFeatures').split(',')}
            />

            <div className="flex-1 flex flex-col gap-10 relative overflow-hidden" style={{ background: 'transparent !important' }}>

                {/* Row 1: Hero & Study Streak (1/3 : 2/3 Split on XL) */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Hero Section */}
                    <div className={`xl:col-span-2 p-4 sm:p-6 text-center group relative overflow-hidden transition-all duration-700 h-full flex flex-col justify-center rounded-[24px] bg-gradient-to-br from-indigo-800 to-purple-900 shadow-xl border border-purple-500/30 dark:border-purple-500/20`}>
                        <div className="relative z-10">
                            <h2 className="text-2xl lg:text-3xl font-black text-white mb-2 flex items-center justify-center gap-3 drop-shadow-md">
                                <span className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm transition-transform">{ICONS.target}</span>
                                {t('whatShouldIStudyNow')}
                            </h2>
                            <p className="text-white/90 mb-6 text-sm lg:text-base max-w-2xl mx-auto leading-relaxed">
                                {t('studyRecommendationDesc') || 'Get personalized study recommendations based on your priorities to maximize your productivity today.'}
                            </p>
                            <button
                                onClick={() => setShowSuggestion(true)}
                                className="inline-flex items-center gap-3 bg-white/20 text-white hover:bg-white/30 backdrop-blur-md border border-white/30 font-black py-3 px-8 rounded-2xl text-base lg:text-lg shadow-xl transition-all active:scale-95 hover:scale-105"
                            >
                                <span>{ICONS.rocket}</span>
                                {t('whatShouldIStudyNow')}
                            </button>
                        </div>
                        {/* Decorative background effects */}
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-700"></div>
                        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-purple-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/10 transition-all duration-700 delay-100"></div>
                    </div>

                    {/* Study Streak - Integrated Sidebar Metric */}
                    <div className="xl:col-span-1 relative p-5 flex flex-col items-center justify-center transition-all duration-300 hover:scale-[1.01] group min-h-[160px] rounded-[24px] bg-gradient-to-br from-orange-600 to-amber-700 shadow-xl border border-orange-500/30 text-white">
                        <div className="text-center">
                            <div className="text-4xl mb-2 filter drop-shadow-md transform group-hover:scale-110 transition-transform duration-300">🔥</div>
                            <h3 className="text-lg lg:text-xl font-black text-white mb-0.5 leading-tight drop-shadow-sm">{t('studyStreak')}</h3>
                            <p className="text-4xl lg:text-5xl font-black text-white mb-0.5 tabular-nums drop-shadow-md">{streak}</p>
                            <p className="text-xs font-bold text-white/90 mb-3">{streak === 1 ? t('daysInARow') : t('daysInARowPlural')}</p>
                            
                            <div className="flex items-center gap-2 mb-4 bg-white/20 px-3 py-1.5 rounded-xl border border-white/20 backdrop-blur-sm shadow-inner group-hover:bg-white/25 transition-all">
                                <span className="text-amber-200 font-black">⚡</span>
                                <span className="text-lg font-black text-white drop-shadow-sm">{totalXp.toLocaleString()} <span className="text-xs opacity-80">XP</span></span>
                            </div>
                            
                            <button 
                                onClick={() => setIsLeaderboardOpen(true)}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 text-white hover:bg-white/30 backdrop-blur-md border border-white/30 text-sm lg:text-base font-black rounded-xl transition-all shadow-lg w-full justify-center active:scale-95 hover:scale-105"
                            >
                                <span className="text-lg drop-shadow-sm">🏆</span> 
                                {language === 'ar' ? 'لوحة الأبطال' : 'Leaderboard'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Row 2: Metrics & Tasks (4-Column Grid) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                    {/* Today's Tasks */}
                    <div className="glass-card p-5 flex flex-col min-h-[160px] group transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-black flex items-center gap-3">
                                <span className="p-1.5 bg-blue-500/10 rounded-xl">{ICONS.tasks || '📋'}</span>
                                {t('todaysTasks')}
                            </h2>
                            <button onClick={() => openModal('tasks')} className="p-2.5 rounded-xl bg-slate-100 dark:bg-gray-700/50 text-slate-400 hover:text-blue-600 dark:hover:text-white transition-all">
                                {ICONS.plus}
                            </button>
                        </div>
                        <div className="flex-grow">
                            {todaysTasks.length > 0 ? (
                                <div className="space-y-4">
                                    {todaysTasks.map(task => (
                                        <div key={task.id} className="flex items-center px-5 py-4 text-sm rounded-[16px] bg-white dark:bg-gray-700/50 hover:bg-slate-50 dark:hover:bg-gray-700 transition-all justify-between border border-slate-300 dark:border-gray-600 shadow-sm group/item">
                                            <span className="text-slate-900 dark:text-gray-200 font-extrabold group-hover/item:translate-x-1 transition-transform">{task.title}</span>
                                            <PriorityBadge priority={task.priority} />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-60">
                                    <p className="text-6xl mb-4">🎉</p>
                                    <p className="font-bold text-lg">{t('noTasksDueToday')}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Upcoming Quizzes */}
                    <div className="glass-card p-5 flex flex-col min-h-[160px] group transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-black flex items-center gap-3">
                                <span className="p-1.5 bg-emerald-500/10 rounded-xl">{ICONS.quizzes || '📝'}</span>
                                {t('upcomingQuizzes')}
                            </h2>
                            <button onClick={() => openModal('quizzes')} className="p-2.5 rounded-xl bg-slate-100 dark:bg-gray-700/50 text-slate-400 hover:text-emerald-600 dark:hover:text-white transition-all">
                                {ICONS.plus}
                            </button>
                        </div>
                        <div className="flex-grow">
                            {upcomingQuizzes.length > 0 ? (
                                <div className="space-y-4">
                                    {upcomingQuizzes.map(quiz => (
                                        <div key={quiz.id} className="flex items-center px-5 py-4 text-sm rounded-[16px] bg-white dark:bg-gray-700/50 hover:bg-slate-50 dark:hover:bg-gray-700 transition-all justify-between border border-slate-300 dark:border-gray-600 shadow-sm">
                                            <div>
                                                <p className="font-extrabold text-slate-900 dark:text-gray-100 text-base">{quiz.subject}</p>
                                                <div className="flex items-center text-xs text-slate-600 dark:text-gray-400 mt-1 font-bold">
                                                    <span className="me-2 text-sm">📅</span>
                                                    {quiz.date && !isNaN(new Date(quiz.date).getTime()) ? new Date(quiz.date).toLocaleDateString() : ''}
                                                </div>
                                            </div>
                                            {quiz.materialsUrl && <a href={quiz.materialsUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-bold p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">{t('materials')}</a>}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-60">
                                    <p className="text-6xl mb-4">📚</p>
                                    <p className="font-bold text-lg">{t('noUpcomingQuizzes')}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Upcoming Assignments */}
                    <div className="glass-card p-5 flex flex-col min-h-[160px] group transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-black flex items-center gap-3">
                                <span className="p-1.5 bg-amber-500/10 rounded-xl">{ICONS.assignments || '📁'}</span>
                                {t('assignments')}
                            </h2>
                            <button onClick={() => openModal('assignments')} className="p-2.5 rounded-xl bg-slate-100 dark:bg-gray-700/50 text-slate-400 hover:text-amber-600 dark:hover:text-white transition-all">
                                {ICONS.plus}
                            </button>
                        </div>
                        <div className="flex-grow">
                            {upcomingAssignments.length > 0 ? (
                                <div className="space-y-4">
                                    {upcomingAssignments.map(assignment => (
                                        <div key={assignment.id} className="flex items-center px-5 py-4 text-sm rounded-[16px] bg-white dark:bg-gray-700/50 hover:bg-slate-50 dark:hover:bg-gray-700 transition-all justify-between border border-slate-300 dark:border-gray-600 shadow-sm">
                                            <div className="flex-1 min-w-0 me-3">
                                                <p dir="auto" className="font-extrabold text-slate-900 dark:text-gray-100 text-start truncate">{assignment.title}</p>
                                                <div className="flex items-center text-xs text-slate-600 dark:text-gray-400 mt-1 font-bold">
                                                    <span dir="auto" className="truncate">{assignment.subject}</span>
                                                    <span className="mx-2 shrink-0 opacity-40">|</span>
                                                    <span className="shrink-0">{assignment.dueDate && !isNaN(new Date(assignment.dueDate).getTime()) ? new Date(assignment.dueDate).toLocaleDateString() : 'N/A'}</span>
                                                </div>
                                            </div>
                                            <span className={`shrink-0 text-[10px] font-black px-2.5 py-1.5 rounded-xl uppercase tracking-tighter shadow-sm border ${assignment.status === 'Submitted'
                                                ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:border-green-800 dark:text-green-300'
                                                : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/50 dark:border-amber-800 dark:text-amber-300'
                                                }`}>
                                                {assignment.status === 'Submitted' ? t('submitted') : t('pending')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-60">
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 border border-emerald-100 dark:border-emerald-800/50 mx-auto">
                                        <span className="text-emerald-500 text-3xl">✨</span>
                                    </div>
                                    <p className="font-bold text-lg leading-tight p-4">
                                        {language === 'ar' ? 'لا توجد واجبات معلقة، عمل رائع!' : 'No pending assignments. Great job!'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Task Progress Chart - Integrated as a Metric Card */}
                    <div className="glass-card p-6 flex flex-col min-h-[340px] transition-all duration-300">
                        <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                            <span className="p-1.5 bg-indigo-500/10 rounded-xl">{ICONS.analytics}</span>
                            {t('taskProgress')}
                        </h3>
                        <div className="flex-1 flex flex-col items-center justify-center p-2">
                            <div className="relative w-full h-[240px] flex justify-center items-center">
                                {taskCompletionData.some(d => d.value > 0) ? (
                                    <>
                                        <ResponsiveContainer width="100%" height={240}>
                                            <PieChart>
                                                <Pie
                                                    data={taskCompletionData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={8}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    {taskCompletionData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} className="filter drop-shadow-lg outline-none" />
                                                    ))}
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center mt-3">
                                            <p className="text-5xl font-black text-slate-800 dark:text-white leading-none tabular-nums">{totalTasks}</p>
                                            <p className="text-xs text-slate-400 dark:text-gray-500 uppercase font-black tracking-widest mt-2">{t('total') || 'Total'}</p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-center opacity-40">
                                        <div className="text-4xl mb-2">📊</div>
                                        <p className="text-xs font-bold uppercase tracking-widest">{t('noData')}</p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="w-full mt-6 grid grid-cols-2 gap-4">
                                {taskCompletionData.map((entry, index) => (
                                    <div key={index} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></div>
                                        <div className="flex flex-col">
                                            <span className="text-slate-500 dark:text-gray-400 text-[10px] uppercase font-black leading-none mb-1">{entry.name}</span>
                                            <span className="text-slate-800 dark:text-white text-base font-black leading-none tabular-nums">{entry.value}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5">
                            <Link to="/analytics" className="inline-flex items-center gap-3 text-base font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-all p-3 rounded-2xl w-full justify-center group bg-indigo-500/5 hover:bg-indigo-500/10">
                                {t('analytics') || 'Analytics'}
                                <span className="group-hover:translate-x-1 transition-transform">→</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Suggestion Modal */}
            {showSuggestion && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-black/30 backdrop-blur-xl rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold mb-4 text-white">{t('smartSuggestion')}</h3>
                        {suggestedTask ? (
                            <div>
                                <div className="flex items-center px-5 py-3 text-base rounded-2xl bg-indigo-600 text-white mb-6 shadow-lg shadow-indigo-900/20 font-bold border border-white/10">
                                    <span className="text-xl">{ICONS.tasks}</span>
                                    <span className="ms-3">{suggestedTask.title}</span>
                                </div>
                                <p className="mb-2 text-sm text-white/90"><strong>{t('priorityLabel')}</strong> {suggestedTask.priority}</p>
                                <p className="mb-4 text-sm text-white/90"><strong>{t('dueLabel')}</strong> {new Date(suggestedTask.dueDate).toLocaleDateString()}</p>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => {
                                            setShowSuggestion(false);
                                            openModal('tasks');
                                        }}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded text-sm"
                                    >
                                        {t('editTask')}
                                    </button>
                                    <button
                                        onClick={() => setShowSuggestion(false)}
                                        className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded text-sm"
                                    >
                                        {t('close')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center">
                                <p className="text-white mb-6 font-medium text-lg">{t('noPendingTasks')}</p>
                                <button
                                    onClick={() => setShowSuggestion(false)}
                                    className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-8 rounded-lg text-sm transition-colors shadow-lg"
                                >
                                    {t('close')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <LeaderboardModal 
                isOpen={isLeaderboardOpen} 
                onClose={() => setIsLeaderboardOpen(false)} 
                currentUserXP={totalXp} 
            />
        </Layout>
    );
};

export default Dashboard;
