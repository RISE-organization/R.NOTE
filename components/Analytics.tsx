import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { Task, Assignment, Quiz, Class } from '../types';
import { ICONS } from '../constants';
import { useLanguage } from '../LanguageContext';
import { IS_RAMADAN } from '../src/config/theme';
import { Link } from 'react-router-dom';
import { db, auth } from '../src/lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

interface AnalyticsProps {
    tasks: Task[];
    assignments: Assignment[];
    quizzes: Quiz[];
    classes: Class[];
    streak: number;
    totalXp: number;
}

const Analytics: React.FC<AnalyticsProps> = ({ tasks, assignments, quizzes, classes, streak, totalXp }) => {
    const { t, language } = useLanguage();
    const [pomodoroData, setPomodoroData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const isRTL = language === 'ar';

    useEffect(() => {
        const fetchPomodoroData = async () => {
            const user = auth.currentUser;
            if (!user) return;

            try {
                // Remove orderBy to avoid 'Missing Index' requirement
                const q = query(collection(db, 'user_stats', user.uid, 'pomodoro_daily'));
                const querySnapshot = await getDocs(q);
                
                // Sort and Limit on client side for small datasets
                const data = querySnapshot.docs.map(doc => ({
                    date: doc.id.split('-').slice(1).join('/'),
                    fullDate: doc.id,
                    count: doc.data().count || 0,
                    xp: doc.data().xp || 0
                }))
                .sort((a, b) => a.fullDate.localeCompare(b.fullDate))
                .slice(-30); // Keep last 30 days

                setPomodoroData(data);
            } catch (error: any) {
                console.error("Error fetching analytics:", error);
                if (error.code === 'permission-denied') {
                    alert("⚠️ Permission Denied: Please run 'firebase deploy --only firestore:rules' to enable analytics.");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchPomodoroData();
    }, []);

    // 1. Task Completion Data
    const completedTasks = tasks.filter(t => t.completed).length;
    const pendingTasks = tasks.length - completedTasks;
    const taskData = [
        { name: t('completed'), value: completedTasks },
        { name: t('pending'), value: pendingTasks },
    ];
    const COLORS = ['#10B981', '#F59E0B']; // Green, Amber

    // 2. Assignments Status
    const submittedAssignments = assignments.filter(a => a.status === 'Submitted').length;
    const pendingAssignments = assignments.length - submittedAssignments;
    const assignmentData = [
        { name: t('submitted'), value: submittedAssignments },
        { name: t('pending'), value: pendingAssignments },
    ];
    const ASSIGNMENT_COLORS = ['#3B82F6', '#EF4444']; // Blue, Red

    // 3. Classes Distribution (by Day)
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
    const classDistribution = days.map(day => ({
        name: t(day),
        classes: classes.filter(c => c.day.toLowerCase() === day).length
    }));

    // Productivity Metrics
    const totalXpLast7 = pomodoroData.slice(-7).reduce((acc, curr) => acc + curr.xp, 0);
    const avgXpPerDay = pomodoroData.length > 0 ? (pomodoroData.reduce((acc, curr) => acc + curr.xp, 0) / pomodoroData.length).toFixed(0) : 0;
    const bestXpDay = pomodoroData.length > 0 ? [...pomodoroData].sort((a, b) => b.xp - a.xp)[0] : null;

    const totalSessionsLast7 = pomodoroData.slice(-7).reduce((acc, curr) => acc + curr.count, 0);

    return (
        <Layout>
            <div className="animate-fadeIn pb-20">
                <div className="flex items-center justify-between mb-8">
                    <h1 className={`text-3xl font-black flex items-center gap-3 ${IS_RAMADAN ? 'text-gold-gradient' : 'text-gray-900 dark:text-white'}`}>
                        <span className="p-2 bg-indigo-500/10 rounded-xl">{ICONS.analytics}</span>
                        {t('advancedAnalytics')}
                    </h1>
                    <Link to="/dashboard" className="flex items-center text-sm font-bold text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors bg-white dark:bg-white/5 py-2 px-4 rounded-xl shadow-sm border border-gray-100 dark:border-white/5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 me-2 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        {t('backToDashboard')}
                    </Link>
                </div>

                {/* Productivity Summary Card */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <div className={`lg:col-span-2 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-white/10 ${IS_RAMADAN ? 'card-royal' : 'bg-white dark:bg-slate-800/50 backdrop-blur-xl'}`}>
                        <h3 className="text-xl font-black text-gray-800 dark:text-gray-100 mb-8 flex items-center gap-2">
                            <span className="text-amber-500">⚡</span>
                            {language === 'ar' ? 'اتجاهات الإنتاجية (بومودورو)' : 'Productivity Trends (Pomodoro)'}
                        </h3>
                        <div className="h-72 w-full">
                            {loading ? (
                                <div className="h-full w-full flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                                </div>
                            ) : pomodoroData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={pomodoroData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                                        <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip 
                                            cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} 
                                            contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px', color: '#f3f4f6' }} 
                                        />
                                        <Bar dataKey="count" fill="#6366F1" radius={[6, 6, 0, 0]} barSize={30} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full w-full flex flex-col items-center justify-center text-gray-400">
                                    <p className="text-4xl mb-2">📊</p>
                                    <p>{language === 'ar' ? 'لا توجد بيانات بومودورو بعد' : 'No Pomodoro data yet'}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={`p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-white/10 flex flex-col justify-between ${IS_RAMADAN ? 'card-royal' : 'bg-white dark:bg-slate-800/50 backdrop-blur-xl'}`}>
                        <h3 className="text-xl font-black text-gray-800 dark:text-gray-100 mb-6">{language === 'ar' ? 'ملخص الإنتاجية' : 'Productivity Summary'}</h3>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl">
                                <span className="text-gray-600 dark:text-gray-400 font-bold">{language === 'ar' ? 'إجمالي XP (الأسبوع)' : 'Total XP (Weekly)'}</span>
                                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                                    <span className="text-sm">⚡</span> {totalXpLast7.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl">
                                <span className="text-gray-600 dark:text-gray-400 font-bold">{language === 'ar' ? 'أفضل يوم (نقاط)' : 'Peak Points'}</span>
                                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                    <span className="text-sm">⭐</span> {bestXpDay ? bestXpDay.xp : 0}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-500/10 rounded-2xl">
                                <span className="text-gray-600 dark:text-gray-400 font-bold">{language === 'ar' ? 'متوسط XP اليومي' : 'Avg Daily XP'}</span>
                                <span className="text-2xl font-black text-amber-600 dark:text-amber-400 flex items-center gap-2">
                                    <span className="text-sm">⚡</span> {avgXpPerDay}
                                </span>
                            </div>
                        </div>
                        <div className="mt-8 text-center bg-slate-900 text-white p-4 rounded-2xl">
                            <p className="text-xs uppercase font-bold tracking-widest opacity-60 mb-1">{language === 'ar' ? 'معدل الإنجاز العام' : 'Overall Match'}</p>
                            <p className="text-3xl font-black">{Math.round((completedTasks / (tasks.length || 1)) * 100)}%</p>
                        </div>
                    </div>
                </div>

                {/* Classic Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <div className={`p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-white/10 ${IS_RAMADAN ? 'card-royal' : 'bg-white dark:bg-slate-800/50'}`}>
                        <div className="text-slate-500 dark:text-gray-400 text-xs font-black uppercase tracking-widest mb-2">{language === 'ar' ? 'إجمالي النقاط' : 'TOTAL XP'}</div>
                        <div className="text-3xl font-black text-orange-600 dark:text-orange-400 flex items-center gap-2">
                            {totalXp.toLocaleString()} <span className="text-lg">⚡</span>
                        </div>
                    </div>
                    {/* ... other top stats ... */}
                </div>

                {/* Grid for other charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className={`p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-white/10 ${IS_RAMADAN ? 'card-royal' : 'bg-white dark:bg-slate-800/50'}`}>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6">{t('taskCompletionRate')}</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={taskData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value">
                                        {taskData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px', color: '#f3f4f6' }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className={`p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-white/10 ${IS_RAMADAN ? 'card-royal' : 'bg-white dark:bg-slate-800/50'}`}>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6">{t('weeklyClassLoad')}</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={classDistribution}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                    <XAxis dataKey="name" stroke="#9CA3AF" />
                                    <YAxis stroke="#9CA3AF" />
                                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px', color: '#f3f4f6' }} />
                                    <Bar dataKey="classes" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Analytics;
