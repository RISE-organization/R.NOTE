
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

const Dashboard: React.FC<DashboardProps> = ({ tasks = [], quizzes = [], notes = [], assignments = [], streak = 0, openModal }) => {
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
            {/* Main 2-Column Layout */}
            {/* Main 2-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-6 lg:gap-8">
                <style>{`
                .ramadan-card-border {
                    border-color: ${IS_RAMADAN ? 'rgba(234, 179, 8, 0.3)' : ''} !important;
                }
                .dark .ramadan-card-border {
                    box-shadow: ${IS_RAMADAN ? '0 4px 6px -1px rgba(234, 179, 8, 0.1), 0 2px 4px -1px rgba(234, 179, 8, 0.06)' : ''} !important;
                }
                `}</style>
                {/* Left Column - Main Content (Full width on md, 70% on lg) */}
                <div className="lg:col-span-5 space-y-8">
                    {/* Hero CTA Section */}
                    <div className={`bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 backdrop-blur-xl border border-purple-500/30 rounded-2xl shadow-[0_0_30px_rgba(147,51,234,0.2)] p-6 sm:p-8 text-center ${IS_RAMADAN ? 'shadow-[0_0_30px_rgba(245,158,11,0.15)] border-amber-500/30' : ''}`}>
                        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 flex items-center justify-center gap-2">{ICONS.target} {t('whatShouldIStudyNow')}</h2>
                        <p className="text-white/80 mb-6 text-sm sm:text-base">{t('studyRecommendationDesc') || 'Get personalized study recommendations based on your priorities'}</p>
                        <button
                            onClick={() => setShowSuggestion(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-xl text-base sm:text-lg shadow-lg shadow-blue-500/50 transition-all duration-200 transform hover:scale-105"
                        >
                            {ICONS.rocket} {t('whatShouldIStudyNow')}
                        </button>
                    </div>

                    {/* Main Cards Grid */}
                    <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
                        {/* Today's Tasks */}
                        <div className={`card-royal rounded-2xl p-6 flex flex-col h-full group transition-all duration-300 hover:shadow-2xl hover:border-amber-500/40`}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className={`text-xl font-bold text-slate-800 dark:text-gray-100`}>
                                    <span className={IS_RAMADAN ? 'text-gold-gradient' : ''}>{t('todaysTasks')}</span>
                                </h2>
                                <button onClick={() => openModal('tasks')} className={`p-2 rounded-full transition-all ${IS_RAMADAN ? 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-50/10' : 'text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-700'}`}>
                                    {ICONS.plus}
                                </button>
                            </div>
                            <div className="flex-grow">
                                {todaysTasks.length > 0 ? (
                                    <div className="space-y-3">
                                        {todaysTasks.map(task => (
                                            <div key={task.id} className="flex items-center px-4 py-3 text-sm rounded-xl bg-slate-50 dark:bg-gray-700/50 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors justify-between border border-slate-100 dark:border-gray-600">
                                                <span className="text-slate-700 dark:text-gray-200 font-medium">{task.title}</span>
                                                <PriorityBadge priority={task.priority} />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center py-6">
                                        <p className="text-slate-400 dark:text-gray-500 mb-2 text-4xl">🎉</p>
                                        <p className="text-slate-500 dark:text-gray-400 font-medium">{t('noTasksDueToday')}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Upcoming Quizzes */}
                        <div className={`card-royal rounded-2xl p-6 flex flex-col h-full group transition-all duration-300 hover:shadow-2xl hover:border-amber-500/40`}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className={`text-xl font-bold text-slate-800 dark:text-gray-100`}>
                                    <span className={IS_RAMADAN ? 'text-gold-gradient' : ''}>{t('upcomingQuizzes')}</span>
                                </h2>
                                <button onClick={() => openModal('quizzes')} className={`p-2 rounded-full transition-all ${IS_RAMADAN ? 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-50/10' : 'text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-700'}`}>
                                    {ICONS.plus}
                                </button>
                            </div>
                            <div className="flex-grow">
                                {upcomingQuizzes.length > 0 ? (
                                    <div className="space-y-3">
                                        {upcomingQuizzes.map(quiz => (
                                            <div key={quiz.id} className="flex items-center px-4 py-3 text-sm rounded-xl bg-slate-50 dark:bg-gray-700/50 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors justify-between border border-slate-100 dark:border-gray-600">
                                                <div>
                                                    <p className="font-semibold text-slate-700 dark:text-gray-200">{quiz.subject}</p>
                                                    <div className="flex items-center text-xs text-slate-500 dark:text-gray-400 mt-1">
                                                        <span className="me-2">📅</span>
                                                        {quiz.date && !isNaN(new Date(quiz.date).getTime()) ? new Date(quiz.date).toLocaleDateString() : ''}
                                                    </div>
                                                </div>
                                                {quiz.materialsUrl && <a href={quiz.materialsUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 p-1">{t('materials')}</a>}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center py-6">
                                        <p className="text-slate-400 dark:text-gray-500 mb-2 text-4xl">📚</p>
                                        <p className="text-slate-500 dark:text-gray-400 font-medium">{t('noUpcomingQuizzes')}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Upcoming Assignments */}
                        <div className={`card-royal rounded-2xl p-6 flex flex-col h-full group transition-all duration-300 hover:shadow-2xl hover:border-amber-500/40`}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className={`text-xl font-bold text-slate-800 dark:text-gray-100`}>
                                    <span className={IS_RAMADAN ? 'text-gold-gradient' : ''}>{t('assignments')}</span>
                                </h2>
                                <button onClick={() => openModal('assignments')} className={`p-2 rounded-full transition-all ${IS_RAMADAN ? 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-50/10' : 'text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-700'}`}>
                                    {ICONS.plus}
                                </button>
                            </div>
                            <div className="flex-grow">
                                {upcomingAssignments.length > 0 ? (
                                    <div className="space-y-3">
                                        {upcomingAssignments.map(assignment => (
                                            <div key={assignment.id} className="flex items-center px-4 py-3 text-sm rounded-xl bg-slate-50 dark:bg-gray-700/50 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors justify-between border border-slate-100 dark:border-gray-600">
                                                <div className="flex-1 min-w-0 me-3">
                                                    <p dir="auto" className="font-semibold text-slate-700 dark:text-gray-200 text-start line-clamp-1">{assignment.title}</p>
                                                    <div className="flex items-center text-xs text-slate-500 dark:text-gray-400 mt-1 truncate">
                                                        <span dir="auto" className="me-1 truncate">{assignment.subject}</span>
                                                        <span className="mx-1 shrink-0">•</span>
                                                        <span className="shrink-0">{assignment.dueDate && !isNaN(new Date(assignment.dueDate).getTime()) ? new Date(assignment.dueDate).toLocaleDateString() : 'N/A'}</span>
                                                    </div>
                                                </div>
                                                <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${assignment.status === 'Submitted'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                                                    }`}>
                                                    {assignment.status === 'Submitted' ? t('submitted') : t('pending')}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center py-6">
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 border border-emerald-100 dark:border-emerald-800/50">
                                            <span className="text-emerald-500 text-2xl">✨</span>
                                        </div>
                                        <p className="text-slate-600 dark:text-emerald-200 font-medium">
                                            {language === 'ar' ? 'لا توجد واجبات معلقة، عمل رائع!' : 'No pending assignments. Great job!'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Secondary Content (30% width) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Study Streak */}
                    <div className="relative bg-white dark:bg-white/5 backdrop-blur-2xl rounded-2xl shadow-sm border border-orange-200 dark:border-orange-500/40 p-6 text-slate-800 dark:text-white">
                        <div className="text-center flex flex-col items-center">
                            <div className="text-4xl mb-2 drop-shadow-sm">🔥</div>
                            <h3 className="text-lg font-bold text-orange-700 dark:text-orange-300 mb-1">{t('studyStreak')}</h3>
                            <p className="text-3xl font-extrabold text-orange-600 dark:text-orange-400 mb-1">{streak}</p>
                            <p className="text-sm font-medium text-orange-600/80 dark:text-orange-300 mb-5">{streak === 1 ? t('daysInARow') : t('daysInARowPlural')}</p>
                            
                            <button 
                                onClick={() => setIsLeaderboardOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-sm font-bold rounded-xl transition-all shadow-sm w-full justify-center active:scale-95"
                            >
                                <span className="text-base">🏆</span> 
                                {language === 'ar' ? 'لوحة الأبطال' : 'Leaderboard'}
                            </button>
                        </div>
                    </div>

                    {/* Task Progress Chart */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-gray-200 mb-4 text-center">{t('taskProgress')}</h3>
                        <div className="flex justify-center">
                            <ResponsiveContainer width={180} height={180}>
                                <PieChart>
                                    <Pie
                                        data={taskCompletionData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={70}
                                        fill="#8884d8"
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {taskCompletionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Legend */}
                        <div className="flex justify-center space-x-4 mt-4">
                            {taskCompletionData.map((entry, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                    <div
                                        className="w-3 h-3 rounded-full ring-2 ring-white dark:ring-gray-800"
                                        style={{ backgroundColor: entry.color }}
                                    ></div>
                                    <span className="text-slate-600 dark:text-gray-300 text-xs font-medium">
                                        {entry.name}: {entry.value}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 text-center border-t border-slate-100 dark:border-gray-700 pt-4">
                            <Link to="/analytics" className="inline-flex items-center text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors group">
                                {ICONS.analytics}
                                <span className="ms-2 group-hover:underline">
                                    {t('analytics') || 'View Analytics'}
                                </span>
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
                                <div className="flex items-center px-4 py-2 text-sm rounded-md bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 mb-4">
                                    {ICONS.tasks}
                                    <span className="ms-3">{suggestedTask.title}</span>
                                </div>
                                <p className="mb-2 text-sm"><strong>{t('priorityLabel')}</strong> {suggestedTask.priority}</p>
                                <p className="mb-4 text-sm"><strong>{t('dueLabel')}</strong> {new Date(suggestedTask.dueDate).toLocaleDateString()}</p>
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
                currentUserStreak={streak} 
            />
        </Layout>
    );
};

export default Dashboard;
