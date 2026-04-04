import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Task, Priority } from '../types';
import { ICONS } from '../constants';
import { useLanguage } from '../LanguageContext';
import Layout from './Layout';
import { IS_RAMADAN } from '../src/config/theme';
import PageTour from './PageTour';
import ConfirmDialog from './ui/ConfirmDialog';

interface TasksProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (item?: Task) => void;
  searchQuery?: string;
}

type FilterType = 'all' | 'pending' | 'completed' | 'high' | 'medium' | 'low';

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

const Tasks: React.FC<TasksProps> = ({ tasks, onToggleComplete, onDelete, onEdit, searchQuery = '' }) => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<FilterType>('all');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handlePrint = () => window.print();

  const filtered = tasks.filter(task => {
    // Search filter
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    // Tab filter
    if (filter === 'pending') return !task.completed;
    if (filter === 'completed') return task.completed;
    if (filter === 'high') return task.priority === Priority.High;
    if (filter === 'medium') return task.priority === Priority.Medium;
    if (filter === 'low') return task.priority === Priority.Low;
    return true;
  });

  const sortedTasks = [...filtered].sort((a, b) => {
    const completionDiff = (a.completed ? 1 : 0) - (b.completed ? 1 : 0);
    if (completionDiff !== 0) return completionDiff;
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  const filterButtons: { key: FilterType; label: string }[] = [
    { key: 'all', label: t('all') || 'All' },
    { key: 'pending', label: t('pending') || 'Pending' },
    { key: 'completed', label: t('completed') || 'Completed' },
    { key: 'high', label: t('high') || 'High' },
    { key: 'medium', label: t('medium') || 'Medium' },
    { key: 'low', label: t('low') || 'Low' },
  ];

  return (
    <Layout>
      {/* Mobile Top Navigation - Study Selector */}
      <div className="md:hidden sticky top-0 z-20 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md px-4 py-3 border-b border-slate-200 dark:border-slate-800 -mx-4 mb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'tasks', name: t('tasks'), icon: ICONS.tasks, path: '/tasks' },
            { id: 'notes', name: t('notes'), icon: ICONS.notes, path: '/notes' },
            { id: 'assignments', name: t('assignments'), icon: ICONS.assignments, path: '/assignments' },
            { id: 'quizzes', name: t('quizzes'), icon: ICONS.quizzes, path: '/quizzes' },
          ].map((nav) => (
            <Link
              key={nav.id}
              to={nav.path}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all ${
                nav.id === 'tasks'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span className="text-lg">{nav.icon}</span>
              {nav.name}
            </Link>
          ))}
        </div>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          message={t('confirmDeleteTask') || 'Are you sure you want to delete this task?'}
          onConfirm={() => { onDelete(deleteTarget); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      <PageTour
        pageKey="tasks"
        title={t('tourTasksTitle')}
        description={t('tourTasksDesc')}
        features={t('tourTasksFeatures').split(',')}
      />
      <div className="p-4 sm:p-6 lg:p-8 flex justify-between items-center mb-6">
        <h1 className={`text-2xl sm:text-3xl font-bold ${IS_RAMADAN ? 'text-gold-gradient' : 'text-slate-800 dark:text-white'}`}>{t('tasks')}</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handlePrint}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white font-bold py-2 px-4 rounded-xl inline-flex items-center justify-center transition-colors"
          >
            {ICONS.pdf}
            <span className="ms-2 hidden sm:inline">{t('exportPdf') || 'Print'}</span>
          </button>
          <button onClick={() => onEdit()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl inline-flex items-center justify-center transition-colors shadow-sm">
            {ICONS.plus}
            <span className="ms-2">{t('addTask')}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 sm:px-6 lg:px-8 mb-4 flex flex-wrap gap-2">
        {filterButtons.map(btn => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${filter === btn.key
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10'
              }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div className={`backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-2xl rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 transition-colors duration-300 mx-2 sm:mx-6 lg:mx-8 ${IS_RAMADAN ? 'card-royal' : 'bg-white dark:bg-slate-900/40'}`}>
        <div id="tasks-list" className="space-y-3">
          {sortedTasks.length === 0 && (
            <p className="text-center text-gray-500 py-10">{t('noTasksFound') || 'No tasks found. Add a new task!'}</p>
          )}
          {sortedTasks.map(task => (
            <div key={task.id} className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between transition-all duration-200 group shadow-sm hover:shadow-md rounded-2xl backdrop-blur-sm ${IS_RAMADAN ? 'bg-white/5 border border-amber-500/20 hover:border-amber-500/40 hover:bg-white/8' : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10'} ${task.completed ? 'opacity-60' : ''}`}>
              <div className="flex items-center mb-2 sm:mb-0">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => onToggleComplete(task.id)}
                  className="h-5 w-5 rounded-md border-slate-300 dark:border-gray-500 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-colors"
                />
                <div className="ms-4">
                  <p className={`text-base font-bold ${task.completed ? 'text-slate-600 line-through decoration-slate-500' : (IS_RAMADAN ? 'text-slate-900 dark:text-amber-400' : 'text-slate-900 dark:text-white')}`}>{task.title}</p>
                  <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5">{t('due')}: {new Date(task.dueDate).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end space-x-4 mt-2 sm:mt-0">
                <PriorityBadge priority={task.priority} />
                <div className="flex space-x-2">
                  <button onClick={() => onEdit(task)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-white/5 sm:opacity-0 sm:group-hover:opacity-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                  </button>
                  <button onClick={() => setDeleteTarget(task.id)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-white/5 sm:opacity-0 sm:group-hover:opacity-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Tasks;
