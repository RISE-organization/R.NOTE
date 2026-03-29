
import React, { useState } from 'react';
import { Quiz } from '../types';
import { ICONS } from '../constants';
import { useLanguage } from '../LanguageContext';
import { IS_RAMADAN } from '../src/config/theme';
import PageTour from './PageTour';
import ConfirmDialog from './ui/ConfirmDialog';

interface QuizzesProps {
  quizzes: Quiz[];
  onDelete: (id: string) => void;
  onToggleComplete?: (id: string) => void;
  onEdit: (item?: Quiz) => void;
  searchQuery?: string;
}

const Quizzes: React.FC<QuizzesProps> = ({ quizzes, onDelete, onToggleComplete, onEdit, searchQuery = '' }) => {
  const { t, language } = useLanguage();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  
  const sortedQuizzes = [...quizzes]
    .filter(q => !searchQuery || q.subject.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const tzToday = new Date();
      tzToday.setHours(0, 0, 0, 0);

      // Compute A's status
      const dateA = new Date(a.date);
      dateA.setHours(0, 0, 0, 0);
      const aIsPast = Math.ceil((dateA.getTime() - tzToday.getTime()) / (1000 * 60 * 60 * 24)) < 0;
      const aIsCompleted = a.completed || aIsPast;

      // Compute B's status
      const dateB = new Date(b.date);
      dateB.setHours(0, 0, 0, 0);
      const bIsPast = Math.ceil((dateB.getTime() - tzToday.getTime()) / (1000 * 60 * 60 * 24)) < 0;
      const bIsCompleted = b.completed || bIsPast;

      // 1. Pending exams before completed exams
      if (aIsCompleted !== bIsCompleted) {
        return aIsCompleted ? 1 : -1;
      }

      // 2. Chronological Order
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      if (!aIsCompleted) {
        // Pending exams: Ascending (closest dates first)
        return timeA - timeB;
      } else {
        // Completed/Ended exams: Descending (most recent ended first)
        return timeB - timeA;
      }
    });

  const getCountdownBadge = (date: string) => {
    // Determine timezone accurate today
    const tzToday = new Date();
    tzToday.setHours(0, 0, 0, 0);
    const quizDate = new Date(date);
    quizDate.setHours(0, 0, 0, 0);
    
    const diffTime = quizDate.getTime() - tzToday.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="flex items-center gap-1 px-3 py-1 text-xs font-bold leading-5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          {language === 'ar' ? 'انتهى' : (t('ended') || 'Ended')}
        </span>
      );
    }
    
    if (diffDays === 0) {
      return (
        <span className="flex items-center gap-1 px-3 py-1 text-xs font-bold leading-5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-800 animate-pulse">
          {language === 'ar' ? 'اليوم!' : (t('today') || 'Today!')}
        </span>
      );
    }

    // Future
    return (
      <span className="flex items-center gap-1 px-3 py-1 text-xs font-bold leading-5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
        {language === 'ar' ? `باقي ${diffDays} أيام` : (t('daysLeft')?.replace('{0}', diffDays.toString()) || `${diffDays} days left`)}
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {deleteTarget && (
        <ConfirmDialog
          message={t('confirmDeleteQuiz') || 'Delete this quiz?'}
          onConfirm={() => { onDelete(deleteTarget); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      <PageTour
        pageKey="quizzes"
        title={t('tourQuizzesTitle')}
        description={t('tourQuizzesDesc')}
        features={t('tourQuizzesFeatures').split(',')}
      />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className={`text-2xl sm:text-3xl font-bold ${IS_RAMADAN ? 'text-gold-gradient' : 'text-slate-800 dark:text-white'}`}>{t('quizzesAndExams')}</h1>
        <button onClick={() => onEdit()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl inline-flex items-center justify-center transition-colors shadow-sm shadow-indigo-500/20 active:scale-95">
          {ICONS.plus}
          <span className="ms-2 hidden sm:inline">{t('addQuiz')}</span>
        </button>
      </div>

      {sortedQuizzes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-slate-400 dark:text-gray-500 mb-4 text-6xl">📚</p>
            <p className="text-xl text-slate-500 dark:text-gray-400 font-medium">{t('noQuizzes') || 'لاتوجد اختبارات قادمة'}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedQuizzes.map(quiz => {
            const tzToday = new Date();
            tzToday.setHours(0, 0, 0, 0);
            const quizDate = new Date(quiz.date);
            quizDate.setHours(0, 0, 0, 0);
            const diffTime = quizDate.getTime() - tzToday.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            const isPast = diffDays < 0;
            const isCompleted = quiz.completed || isPast;
            
            return (
              <div 
                key={quiz.id} 
                className={`relative overflow-hidden w-full flex flex-col h-full backdrop-blur-xl border transition-all duration-300 rounded-[20px] sm:rounded-[24px] p-5 shadow-sm hover:shadow-md
                  ${IS_RAMADAN ? 'card-royal' : 'bg-white dark:bg-slate-900/60'}
                  ${isCompleted ? 'opacity-60 border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-900/40' : 'border-slate-200 dark:border-white/10 dark:shadow-2xl'}`}
              >
                {/* Header: Title & Status Badge */}
                <div className="flex justify-between items-start gap-3 mb-3 w-full max-w-full">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                     {/* Checkbox */}
                     <button
                        onClick={() => !isPast && onToggleComplete && onToggleComplete(quiz.id)}
                        disabled={isPast}
                        className={`mt-0.5 flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                          ${isCompleted 
                            ? 'bg-emerald-500 border-emerald-500 text-white dark:bg-emerald-600 dark:border-emerald-600' 
                            : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500 dark:hover:border-indigo-400 bg-transparent'}
                          ${isPast ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
                      >
                        {isCompleted && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </button>

                    <div className="flex-1 min-w-0">
                      <h3 dir="auto" className={`text-lg font-bold leading-tight text-start line-clamp-1 transition-colors ${isCompleted ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-white'}`}>
                        {quiz.subject}
                      </h3>
                      <div className="flex items-center text-xs mt-1.5 gap-1.5 truncate">
                        <svg className={`w-4 h-4 shrink-0 ${isCompleted ? 'text-slate-400' : 'text-indigo-500 dark:text-indigo-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className={`truncate font-medium ${isCompleted ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
                          {new Date(quiz.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Countdown Badge top-right */}
                  <div className="flex-shrink-0 whitespace-nowrap flex items-center mt-1 text-end">
                    {getCountdownBadge(quiz.date)}
                  </div>
                </div>

                {/* Body: Study Materials */}
                <div className="flex-1 mb-4 mt-2 w-full flex items-center">
                  {quiz.materialsUrl ? (
                    <a href={quiz.materialsUrl} target="_blank" rel="noopener noreferrer" 
                       className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm font-semibold text-indigo-600 dark:text-indigo-400 transition-colors">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                      {t('studyMaterials') || 'مواد الدراسة'}
                    </a>
                  ) : (
                    <span className="text-sm font-medium text-slate-400 dark:text-gray-500 px-1">
                      {t('noMaterials') || 'لا توجد مواد'}
                    </span>
                  )}
                </div>

                {/* Footer: Actions */}
                <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-100 dark:border-white/10">
                  <div className="flex space-x-2 gap-1 w-full justify-start rtl:space-x-reverse">
                    <button 
                      onClick={() => onEdit(quiz)} 
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 rounded-lg transition-colors"
                      title={t('edit')}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                    <button 
                      onClick={() => setDeleteTarget(quiz.id)} 
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 dark:hover:text-red-400 rounded-lg transition-colors"
                      title={t('delete')}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Quizzes;
