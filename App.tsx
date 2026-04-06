
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Modal from './components/Modal';
import FormField from './components/FormField';
import ProtectedRoute from './src/components/ProtectedRoute';
import { ModalContent, AnyItem, Class, Task, Quiz, Assignment, Note, Priority } from './types';
import { useLanguage } from './LanguageContext';
import { useDataManagement } from './hooks/useDataManagement';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { PomodoroProvider, usePomodoro } from './context/PomodoroContext';
import MainLayout from './components/MainLayout';
import { IS_RAMADAN } from './src/config/theme';

// Lazy loaded components
const Dashboard = lazy(() => import('./components/Dashboard'));
const ClassSchedule = lazy(() => import('./components/ClassSchedule'));
const Tasks = lazy(() => import('./components/Tasks'));
const Quizzes = lazy(() => import('./components/Quizzes'));
const Assignments = lazy(() => import('./components/Assignments'));
const Notes = lazy(() => import('./components/Notes'));
const ProfileSettings = lazy(() => import('./components/ProfileSettings'));
const Pomodoro = lazy(() => import('./components/Pomodoro'));
const Analytics = lazy(() => import('./components/Analytics'));
const SmartAssistant = lazy(() => import('./components/SmartAssistant'));
const Login = lazy(() => import('./src/components/Login'));
const ResetPassword = lazy(() => import('./src/components/ResetPassword'));
const PublicNoteView = lazy(() => import('./components/PublicNoteView'));
const PublicScheduleView = lazy(() => import('./components/PublicScheduleView'));

// Full-screen, high-performance loading state
const LoadingSpinner = () => (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 font-sans">
        <div className="relative w-24 h-24 mb-6">
            {/* Pulsing Outer Glow */}
            <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-pulse blur-xl"></div>
            {/* Spinning Rings */}
            <div className="absolute inset-0 border-[3px] border-indigo-500/10 rounded-full"></div>
            <div className="absolute inset-0 border-[3px] border-t-indigo-500 rounded-full animate-spin"></div>
            <div className="absolute inset-4 border-[3px] border-b-purple-500 rounded-full animate-spin-reverse opacity-50"></div>
            
            {/* Center Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
            </div>
        </div>
        <div className="flex flex-col items-center gap-2">
            <h2 className="text-sm font-black text-white italic tracking-[0.3em] uppercase opacity-80">R.Note</h2>
            <div className="flex items-center gap-1">
                {[0, 1, 2].map(i => (
                    <div key={i} className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
            </div>
        </div>
    </div>
);

const App: React.FC = () => {
    return (
        <AuthProvider>
            <ThemeProvider>
                <PomodoroProvider>
                    <AppContent />
                </PomodoroProvider>
            </ThemeProvider>
        </AuthProvider>
    );
};

const AppContent: React.FC = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Hooks must be called unconditionally
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const { t, language } = useLanguage();

    const { classes, tasks, quizzes, assignments, notes, streak, totalXp, handleDelete, handleSave: saveData, handleToggleTask, handleToggleAssignment, handleToggleQuiz, handleNoteUpdate, clearAllData, makeSchedulePublic } = useDataManagement();
    
    // Explicitly destructure just for debugging if needed, but it's ready for use.

    // Search State
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [modalContent, setModalContent] = useState<ModalContent>(null);
    const [currentItem, setCurrentItem] = useState<Partial<AnyItem> | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Toast State
    const [toast, setToast] = useState<{ msg: string; error: boolean } | null>(null);
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), toast.error ? 5000 : 1500);
        return () => clearTimeout(timer);
    }, [toast]);

    useEffect(() => {
        document.documentElement.classList.add('dark');
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // 🔗 Auto-join room via URL parameter
    const { setRoomId, roomId } = usePomodoro();
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const urlRoomId = params.get('room');
        if (urlRoomId && urlRoomId !== roomId) {
            setRoomId(urlRoomId);
            // Remove the param from URL without refreshing to keep it clean
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        }
    }, [location.search, roomId, setRoomId]);

    // Hooks must be called unconditionally above, but we can verify auth state here
    if (loading) {
        return <LoadingSpinner />;
    }

    // Public Routes (No Auth Required)
    if (location.pathname.startsWith('/share/') || location.pathname.startsWith('/share-schedule/') || location.pathname === '/reset-password') {
        return (
            <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                    <Route path="/share/:noteId" element={<PublicNoteView />} />
                    <Route path="/share-schedule/:userId" element={<PublicScheduleView />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                </Routes>
            </Suspense>
        );
    }

    if (!user) {
        return (
            <Suspense fallback={<LoadingSpinner />}>
                <Login />
            </Suspense>
        );
    }

    const handleSave = async () => {
        setToast({ msg: 'Saving...', error: false });

        if (!modalContent || !currentItem) {
            if (process.env.NODE_ENV !== 'production') {
                console.error('Validation failed: missing modalContent or currentItem');
            }
            setToast({ msg: 'Error: Missing data', error: true });
            return;
        }

        setIsSaving(true);
        try {
            const { view, item: originalItem } = modalContent;
            await saveData(view, originalItem, currentItem);

            setToast({ msg: 'Saved successfully!', error: false });
            setTimeout(() => closeModal(), 1500);
        } catch (error: any) {
            if (process.env.NODE_ENV !== 'production') {
                console.error('Failed to save item:', error);
            }
            setToast({ msg: `Error: ${error.message || 'Unknown error'}`, error: true });
        } finally {
            setIsSaving(false);
        }
    };


    // --- Modal Logic ---
    const openModal = (view: ModalContent['view'], item?: AnyItem) => {
        setModalContent({ view, item });
        if (view === 'schedule') {
            // If no item is provided (adding new class), use empty values
            const newItem = item || {
                subject: '',
                time: '',
                day: 'Sunday', // Default day is useful
                instructor: '',
                color: 'bg-blue-500' // Default color is useful for UI
            };
            setCurrentItem(newItem);
        } else if (view === 'tasks') {
            setCurrentItem(item || { title: '', priority: Priority.Medium, completed: false, dueDate: new Date().toISOString().split('T')[0] });
        } else {
            setCurrentItem(item || (view === 'notes' ? { title: '', subject: '', content: '' } : {}));
        }
    };

    const closeModal = () => {
        setModalContent(null);
        setCurrentItem(null);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setCurrentItem(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const renderModalContent = () => {
        if (!modalContent || !currentItem) return null;

        const commonFields = <FormField label={t('subject')} name="subject" type="text" value={(currentItem as any).subject || ''} onChange={handleFormChange} required />;

        switch (modalContent.view) {
            case 'tasks':
                return (
                    <div>
                        <FormField label={t('title')} name="title" type="text" value={(currentItem as Task).title || ''} onChange={handleFormChange} required />
                        <FormField label={t('dueDate')} name="dueDate" type="date" value={(currentItem as Task).dueDate || ''} onChange={handleFormChange} />
                        <FormField label={t('priority')} name="priority" type="select" value={(currentItem as Task).priority || Priority.Medium} onChange={handleFormChange} options={Object.values(Priority).map(p => ({ value: p, label: p }))} />
                    </div>
                );
            case 'notes':
                return (
                    <div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">{t('subject')}</label>
                            <input
                                name="subject"
                                list="note-subjects"
                                value={(currentItem as Note).subject || ''}
                                onChange={handleFormChange}
                                placeholder={t('subject')}
                                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            />
                            <datalist id="note-subjects">
                                {[...new Set(notes.map(n => n.subject).filter(Boolean))].map(s => (
                                    <option key={s} value={s} />
                                ))}
                            </datalist>
                        </div>
                        <FormField label={t('title')} name="title" type="text" value={(currentItem as Note).title || ''} onChange={handleFormChange} required />
                        <FormField label={t('content')} name="content" type="textarea" value={(currentItem as Note).content || ''} onChange={handleFormChange} rows={5} />
                    </div>
                );
            case 'schedule':
                return (
                    <div>
                        <FormField label={t('subject')} name="subject" type="text" value={(currentItem as Class).subject || ''} onChange={handleFormChange} required />
                        <FormField label={t('time')} name="time" type="text" value={(currentItem as Class).time || ''} onChange={handleFormChange} options={
                            // Generate time slots every 15 minutes from 08:00 AM to 08:00 PM
                            Array.from({ length: 49 }).map((_, i) => {
                                const totalMinutes = 8 * 60 + i * 15; // Start at 8:00 AM
                                const hours = Math.floor(totalMinutes / 60);
                                const minutes = totalMinutes % 60;
                                const period = hours >= 12 && hours < 24 ? 'PM' : 'AM';
                                const displayHour = hours % 12 || 12;
                                const timeString = `${displayHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
                                return { value: timeString, label: timeString };
                            })
                        } required />
                        <FormField label={t('day')} name="day" type="select" value={(currentItem as Class).day || 'Sunday'} onChange={handleFormChange} options={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].map(day => ({ value: day, label: t(day.toLowerCase()) }))} />
                        <FormField label={t('instructor')} name="instructor" type="text" value={(currentItem as Class).instructor || ''} onChange={handleFormChange} required />
                        <FormField label={t('color')} name="color" type="select" value={(currentItem as Class).color || 'bg-blue-500'} onChange={handleFormChange} options={[
                            { value: 'bg-red-500', label: t('red') },
                            { value: 'bg-blue-500', label: t('blue') },
                            { value: 'bg-green-500', label: t('green') },
                            { value: 'bg-orange-600', label: t('orange') },
                            { value: 'bg-cyan-600', label: t('cyan') },
                            { value: 'bg-teal-600', label: t('teal') }
                        ]} />
                    </div>
                );
            case 'quizzes':
                return (
                    <div>
                        <FormField label={t('subject')} name="subject" type="text" value={(currentItem as Quiz).subject || ''} onChange={handleFormChange} required />
                        <FormField label={t('date')} name="date" type="date" value={(currentItem as Quiz).date || ''} onChange={handleFormChange} required />
                        <FormField label={t('studyMaterialsUrl')} name="materialsUrl" type="url" value={(currentItem as Quiz).materialsUrl || ''} onChange={handleFormChange} />
                    </div>
                );
            case 'assignments':
                return (
                    <div>
                        <FormField label={t('subject')} name="subject" type="text" value={(currentItem as Assignment).subject || ''} onChange={handleFormChange} required />
                        <FormField label={t('title')} name="title" type="text" value={(currentItem as Assignment).title || ''} onChange={handleFormChange} required />
                        <FormField label={t('description')} name="description" type="textarea" value={(currentItem as Assignment).description || ''} onChange={handleFormChange} rows={3} required />
                        <FormField label={t('dueDate')} name="dueDate" type="datetime-local" value={(currentItem as Assignment).dueDate || ''} onChange={handleFormChange} required />
                    </div>
                );
            default:
                return <div>Form not implemented yet.</div>
        }
    }

    return (
        <MainLayout
            toast={toast}
            language={language}
            isSidebarOpen={isSidebarOpen}
            setSidebarOpen={setSidebarOpen}
            sidebar={<Sidebar isOpen={isSidebarOpen} />}
            header={
                <Header 
                    toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} 
                    onSearch={setSearchQuery} 
                    searchQuery={searchQuery} 
                />
            }
            totalXp={totalXp}
        >
            <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard tasks={tasks} quizzes={quizzes} notes={notes} assignments={assignments} streak={streak} totalXp={totalXp} openModal={openModal} />} />
                    <Route path="/schedule" element={<ClassSchedule classes={classes} tasks={tasks} quizzes={quizzes} assignments={assignments} onDelete={(id) => handleDelete(id, 'schedule')} onEdit={(item) => openModal('schedule', item)} makeSchedulePublic={makeSchedulePublic} />} />
                    <Route path="/tasks" element={<Tasks tasks={tasks} onToggleComplete={handleToggleTask} onDelete={(id) => handleDelete(id, 'tasks')} onEdit={(item) => openModal('tasks', item)} searchQuery={searchQuery} />} />
                    <Route path="/quizzes" element={<Quizzes quizzes={quizzes} onDelete={(id) => handleDelete(id, 'quizzes')} onToggleComplete={handleToggleQuiz} onEdit={(item) => openModal('quizzes', item)} searchQuery={searchQuery} />} />
                    <Route path="/assignments" element={<Assignments assignments={assignments} onToggleComplete={handleToggleAssignment} onDelete={(id) => handleDelete(id, 'assignments')} onEdit={(item) => openModal('assignments', item)} searchQuery={searchQuery} />} />
                    <Route path="/notes" element={<Notes notes={notes} onAdd={() => openModal('notes')} onUpdate={handleNoteUpdate} onDelete={(id) => handleDelete(id, 'notes')} searchQuery={searchQuery} />} />
                    <Route path="/pomodoro" element={<Pomodoro />} />

                    <Route path="/analytics" element={<Analytics tasks={tasks} quizzes={quizzes} assignments={assignments} classes={classes} streak={streak} totalXp={totalXp} />} />
                    <Route path="/profile" element={
                        <ProfileSettings
                            tasks={tasks}
                            classes={classes}
                            notes={notes}
                            assignments={assignments}
                            quizzes={quizzes}
                            clearAllData={clearAllData}
                        />
                    } />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>

                {/* Smart Assistant */}
                <SmartAssistant
                    tasks={tasks}
                    classes={classes}
                    notes={notes}
                    assignments={assignments}
                    quizzes={quizzes}
                    handleSave={handleSave}
                />
            </Suspense>

            {/* Global Modal System */}
            <Modal isOpen={!!modalContent} onClose={closeModal} title={modalContent?.item ? t('editItem') : (
                modalContent?.view === 'tasks' ? t('addNewTask') :
                    modalContent?.view === 'quizzes' ? t('addNewQuiz') :
                        modalContent?.view === 'assignments' ? t('addAssignment') :
                            modalContent?.view === 'notes' ? t('addNewNote') :
                                modalContent?.view === 'schedule' ? t('addClass') :
                                    t('addNewItem')
            )}>
                {renderModalContent()}
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={closeModal} type="button" className="bg-white dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-4 text-sm font-medium text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-600 transition-colors">
                        {t('cancel')}
                    </button>
                    <button onClick={handleSave} type="button" disabled={isSaving} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                        {isSaving ? 'Saving...' : t('save')}
                    </button>
                </div>
            </Modal>
        </MainLayout>
    );
};

export default App;
