
import React, { useState } from 'react';
import { Assignment, SubmissionStatus } from '../types';
import { ICONS } from '../constants';
import { useLanguage } from '../LanguageContext';
import { IS_RAMADAN } from '../src/config/theme';
import PageTour from './PageTour';
import ConfirmDialog from './ui/ConfirmDialog';

interface AssignmentsProps {
  assignments: Assignment[];
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (item?: Assignment) => void;
  searchQuery?: string;
}

const StatusBadge: React.FC<{ status: SubmissionStatus }> = ({ status }) => {
  const { t } = useLanguage();
  
  if (status === SubmissionStatus.Submitted) {
    return (
      <span className="flex items-center gap-1 px-3 py-1 text-xs font-bold leading-5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
        {t('submitted')}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 px-3 py-1 text-xs font-bold leading-5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      {t('notSubmitted')}
    </span>
  );
};

const Assignments: React.FC<AssignmentsProps> = ({ assignments, onToggleComplete, onDelete, onEdit, searchQuery = '' }) => {
  const { t } = useLanguage();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  
  const visibleAssignments = [...assignments]
    .filter(a =>
      !searchQuery || a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.subject.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const aIsCompleted = a.status === SubmissionStatus.Submitted;
      const bIsCompleted = b.status === SubmissionStatus.Submitted;

      // 1. Pending assignments before completed assignments
      if (aIsCompleted !== bIsCompleted) {
        return aIsCompleted ? 1 : -1;
      }

      // 2. Chronological Order
      const timeA = new Date(a.dueDate).getTime();
      const timeB = new Date(b.dueDate).getTime();
      if (!aIsCompleted) {
        // Pending: Ascending (closest due dates first)
        return timeA - timeB;
      } else {
        // Completed: Descending (most recently due/ended first)
        return timeB - timeA;
      }
    });

  const getDueDateColor = (assignment: Assignment) => {
    if (assignment.status === SubmissionStatus.Submitted) return 'text-slate-400 dark:text-slate-500';
    const daysLeft = Math.ceil((new Date(assignment.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft > 3) return 'text-slate-500 dark:text-slate-400';
    return 'text-red-500 dark:text-red-400 font-semibold';
  };
  
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {deleteTarget && (
        <ConfirmDialog
          message={t('confirmDeleteAssignment') || 'Delete this assignment?'}
          onConfirm={() => { onDelete(deleteTarget); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      
      <PageTour
        pageKey="assignments"
        title={t('tourAssignmentsTitle')}
        description={t('tourAssignmentsDesc')}
        features={t('tourAssignmentsFeatures').split(',')}
      />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className={`text-2xl sm:text-3xl font-bold ${IS_RAMADAN ? 'text-gold-gradient' : 'text-slate-800 dark:text-white'}`}>{t('assignments')}</h1>
        <button onClick={() => onEdit()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl inline-flex items-center justify-center transition-colors shadow-sm shadow-indigo-500/20 active:scale-95">
          {ICONS.plus}
          <span className="ms-2">{t('addAssignment')}</span>
        </button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {visibleAssignments.map(assignment => {
          const isCompleted = assignment.status === SubmissionStatus.Submitted;
          
          return (
            <div 
              key={assignment.id} 
              className={`relative overflow-hidden w-full flex flex-col h-full backdrop-blur-xl border transition-all duration-300 rounded-[20px] sm:rounded-[24px] p-5 shadow-sm hover:shadow-md
                ${IS_RAMADAN ? 'card-royal' : 'bg-white dark:bg-slate-900/60'}
                ${isCompleted ? 'opacity-60 border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-900/40' : 'border-slate-200 dark:border-white/10 dark:shadow-2xl'}`}
            >
              {/* Header: Title & Status Badge */}
              <div className="flex justify-between items-start gap-3 mb-3 w-full max-w-full">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Custom Checkbox Toggle */}
                  <button
                    onClick={() => onToggleComplete(assignment.id)}
                    className={`mt-0.5 flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                      ${isCompleted 
                        ? 'bg-emerald-500 border-emerald-500 text-white dark:bg-emerald-600 dark:border-emerald-600' 
                        : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500 dark:hover:border-indigo-400 bg-transparent'}`}
                  >
                    {isCompleted && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </button>

                  <div className="flex-1 min-w-0">
                    <h3 dir="auto" className={`text-lg font-bold leading-tight text-start line-clamp-1 transition-colors ${isCompleted ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-white'}`}>
                      {assignment.title}
                    </h3>
                    <p dir="auto" className={`text-sm mt-0.5 font-medium text-start line-clamp-1 ${isCompleted ? 'text-slate-400' : 'text-slate-500 dark:text-indigo-300'}`}>
                      {assignment.subject}
                    </p>
                  </div>
                </div>
                
                {/* Badge top-right */}
                <div className="flex-shrink-0 whitespace-nowrap flex items-center">
                  <StatusBadge status={assignment.status} />
                </div>
              </div>

              {/* Body: Description */}
              <div className="flex-1 mb-4 w-full">
                <p className={`text-sm leading-relaxed break-words whitespace-normal line-clamp-2 ${isCompleted ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-300'}`}>
                  {assignment.description}
                </p>
              </div>

              {/* Footer: Due Date & Actions */}
              <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-100 dark:border-white/10">
                <div className="flex items-center text-sm font-medium">
                  {/* Calendar / Timer Icon */}
                  <svg className={`w-4 h-4 me-1.5 ${getDueDateColor(assignment)}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className={`${getDueDateColor(assignment)}`}>
                    {new Date(assignment.dueDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                
                {/* Actions */}
                <div className="flex space-x-2 gap-1">
                  <button 
                    onClick={() => onEdit(assignment)} 
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 rounded-lg transition-colors"
                    title={t('edit')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  </button>
                  <button 
                    onClick={() => setDeleteTarget(assignment.id)} 
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 dark:hover:text-red-400 rounded-lg transition-colors"
                    title={t('delete')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Assignments;
