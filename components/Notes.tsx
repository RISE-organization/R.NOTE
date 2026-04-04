
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Note } from '../types';
import { ICONS } from '../constants';
import { useLanguage } from '../LanguageContext';
import { IS_RAMADAN } from '../src/config/theme';
import PageTour from './PageTour';
import ConfirmDialog from './ui/ConfirmDialog';

interface NotesProps {
  notes: Note[];
  onAdd: () => void;
  onUpdate: (note: Note) => void;
  onDelete: (id: string) => void;
  searchQuery?: string;
}

const Notes: React.FC<NotesProps> = ({ notes, onAdd, onUpdate, onDelete, searchQuery = '' }) => {
  const [selectedNote, setSelectedNote] = useState<Note | null>(notes[0] || null);
  const { t, language } = useLanguage();
  const editorRef = useRef<HTMLDivElement>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const finalSearchQuery = localSearchQuery || searchQuery;

  const filteredNotes = finalSearchQuery
    ? notes.filter(n => n.title.toLowerCase().includes(finalSearchQuery.toLowerCase()) || n.subject.toLowerCase().includes(finalSearchQuery.toLowerCase()))
    : notes;

  useEffect(() => {
    // If selected note is deleted, select the first available note
    if (selectedNote && !notes.find(n => n.id === selectedNote.id)) {
      setSelectedNote(notes[0] || null);
    }
    // If there was no selected note and notes are now available, select the first one.
    else if (!selectedNote && notes.length > 0) {
      setSelectedNote(notes[0]);
    }
  }, [notes, selectedNote]);

  useEffect(() => {
    if (editorRef.current && selectedNote) {
      editorRef.current.innerHTML = selectedNote.content;
    }
  }, [selectedNote]);

  const subjects = [...new Set(filteredNotes.map(n => n.subject))];

  const handleFormat = (command: string, value?: string) => {
    try {
      // execCommand is deprecated but remains the most compatible approach for contentEditable
      document.execCommand(command, false, value);
    } catch (e) {
      // Silently ignore if browser removes support in future
    }
    if (editorRef.current && selectedNote) {
      onUpdate({ ...selectedNote, content: editorRef.current.innerHTML });
    }
  };

  const formatDate = (value: unknown): string => {
    try {
      // Handle Firestore Timestamp objects and plain strings
      const ts = value as any;
      const date = ts?.toDate ? ts.toDate() : new Date(ts as string);
      return isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
    } catch {
      return '—';
    }
  };

  const handleContentBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (selectedNote) {
      onUpdate({ ...selectedNote, content: e.currentTarget.innerHTML });
    }
  };

  const handleShare = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    const noteToShare = notes.find(n => n.id === noteId);
    if (noteToShare && !noteToShare.isPublic) {
      onUpdate({ ...noteToShare, isPublic: true });
    }
    const url = `${window.location.origin}/share/${noteId}`;
    navigator.clipboard.writeText(url).then(() => {
      setToastMessage("Link copied!");
      setTimeout(() => setToastMessage(null), 2000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
      setToastMessage("Failed to copy");
      setTimeout(() => setToastMessage(null), 2000);
    });
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-slate-900 transition-colors duration-300 relative">
      {/* Mobile Top Navigation - Study Selector */}
      <div className="md:hidden sticky top-0 z-20 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md px-4 py-3 border-b border-slate-200 dark:border-slate-800 mb-0">
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
                nav.id === 'notes'
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

      <div className="flex flex-1 overflow-hidden relative">
      {deleteTarget && (
        <ConfirmDialog
          message={t('confirmDeleteNote') || 'Delete this note?'}
          onConfirm={() => { onDelete(deleteTarget); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      <PageTour
        pageKey="notes"
        title={t('tourNotesTitle')}
        description={t('tourNotesDesc')}
        features={t('tourNotesFeatures').split(',')}
      />
      {/* Sidebar List */}
      {toastMessage && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-md shadow-lg z-50 transition-opacity duration-300">
          {toastMessage}
        </div>
      )}
      <div className={`w-1/3 ltr:border-r rtl:border-l border-slate-200 dark:border-white/10 backdrop-blur-xl flex flex-col ${IS_RAMADAN ? 'bg-slate-900/40' : 'bg-slate-50 dark:bg-slate-900/40'}`}>
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-white/10 sticky top-0 z-20 bg-inherit backdrop-blur-md">
          <h2 className={`text-xl font-bold ${IS_RAMADAN ? 'text-gold-gradient' : 'text-slate-800 dark:text-white'}`}>{t('allNotes')}</h2>
          <button onClick={onAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg shadow-sm transition-all hover:scale-105 active:scale-95">
            {ICONS.plus}
          </button>
        </div>
        
        {/* Sticky Search Bar */}
        <div className="p-3 border-b border-slate-100 dark:border-white/5 sticky top-[69px] z-10 bg-inherit backdrop-blur-md">
          <div className="relative">
             <svg className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 transform -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
             </svg>
             <input 
               type="text" 
               placeholder={language === 'ar' ? 'بحث...' : (t('search') || 'Search...')} 
               value={localSearchQuery}
               onChange={(e) => setLocalSearchQuery(e.target.value)}
               className="w-full bg-slate-100 dark:bg-slate-800/80 border-none rounded-xl py-2.5 pl-9 pr-4 rtl:pl-4 rtl:pr-9 text-sm focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white placeholder-slate-400 transition-all outline-none"
             />
          </div>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar relative">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
              <p className="mb-4">{t('noNotesYet')}</p>
              <button onClick={onAdd} className="text-indigo-500 font-bold hover:underline">{t('addNewNote')}</button>
            </div>
          ) : (
            subjects.map(subject => (
              <div key={subject || 'unassigned'} className="mb-2">
                <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-900/40 sticky top-0 z-[5] backdrop-blur-sm shadow-sm border-b border-white/5">
                  <span className="text-xs px-2.5 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold rounded-md uppercase tracking-wide border border-indigo-500/20">{subject || t('other')}</span>
                </div>
                <ul>
                  {filteredNotes.filter(n => n.subject === subject).map(note => (
                    <li key={note.id} onClick={() => setSelectedNote(note)}
                      className={`group relative p-4 cursor-pointer ltr:border-l-4 rtl:border-r-4 transition-all duration-200 ${selectedNote?.id === note.id ? (IS_RAMADAN ? 'border-amber-500 bg-amber-500/10' : 'border-indigo-500 bg-white dark:bg-indigo-900/20 shadow-sm') : 'border-transparent hover:bg-slate-200 dark:hover:bg-white/10'}`}>
                      <h4 className={`font-semibold truncate ${selectedNote?.id === note.id ? (IS_RAMADAN ? 'text-slate-900 dark:text-amber-400' : 'text-indigo-700 dark:text-white') : 'text-slate-700 dark:text-white'}`}>{note.title}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-white/50 mt-1">{formatDate(note.lastUpdated)}</p>
                      <div className="absolute top-2 end-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => handleShare(e, note.id)} className="p-1 text-slate-400 hover:text-indigo-500 dark:text-white/50 dark:hover:text-indigo-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(note.id); }} className="p-1 text-slate-400 hover:text-red-500 dark:text-white/50 dark:hover:text-red-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor Pane */}
      <div className={`w-2/3 flex flex-col backdrop-blur-xl transition-colors duration-300 ${IS_RAMADAN ? 'bg-slate-900/60' : 'bg-white dark:bg-slate-900/60'}`}>
        {selectedNote ? (
          <>
            <div className={`pt-10 px-8 pb-6 ${IS_RAMADAN ? 'bg-transparent' : 'bg-transparent'}`}>
              <div className="flex flex-col items-start gap-4">
                <span className="text-xs px-3 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold rounded-md uppercase tracking-wider border border-indigo-500/20 shadow-sm">{selectedNote.subject || t('other')}</span>
                <h2 dir="auto" className={`text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight ${IS_RAMADAN ? 'text-gold-gradient' : 'text-slate-900 dark:text-white'}`}>{selectedNote.title}</h2>
              </div>
            </div>

            {/* Distinct Formatting Strip */}
            <div className="sticky top-0 z-10 px-8 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-y border-slate-200 dark:border-white/5 shadow-sm">
              <div dir="ltr" className="flex items-center gap-1 flex-wrap touch-manipulation">
                {[
                  { cmd: 'bold', label: 'B', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" /></svg> },
                  { cmd: 'italic', label: 'I', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 4h10M4 20h10M15 4L9 20" /></svg> },
                  { cmd: 'insertUnorderedList', label: '•', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16M8 6H4m4 6H4m4 6H4" /></svg> },
                  { cmd: 'insertOrderedList', label: '1.', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 6h11M9 12h11M9 18h11M5 6v.01M5 12v.01M5 18v.01" /></svg> },
                ].map((btn: any, idx) => (
                  <button key={idx} onMouseDown={(e) => { e.preventDefault(); handleFormat(btn.cmd, btn.val); }}
                    aria-label={btn.label}
                    title={btn.label}
                    className="p-2 w-10 h-10 flex items-center justify-center text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                    {btn.icon || btn.label}
                  </button>
                ))}
              </div>
            </div>
            <div
              ref={editorRef}
              contentEditable
              dir="auto"
              onBlur={handleContentBlur}
              className="max-w-4xl mx-auto w-full p-8 flex-grow overflow-y-auto focus:outline-none text-slate-800 dark:text-gray-300 leading-relaxed text-lg prose prose-slate dark:prose-invert custom-scrollbar rtl:text-right [&_ul]:list-disc [&_ul]:list-inside [&_ol]:list-decimal [&_ol]:list-inside [&_li]:my-1.5 [&_ul]:rtl:ms-2 [&_ol]:rtl:ms-2 [&_ul]:ltr:ms-4 [&_ol]:ltr:ms-4"
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-gray-500">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-lg font-medium">{t('selectNotePrompt')}</p>
          </div>
        )}
      </div>
    </div>
  </div>
);
};

export default Notes;
