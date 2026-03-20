
import React, { useState, useEffect, useRef } from 'react';
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
  const { t } = useLanguage();
  const editorRef = useRef<HTMLDivElement>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filteredNotes = searchQuery
    ? notes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.subject.toLowerCase().includes(searchQuery.toLowerCase()))
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
    <div className="flex h-screen bg-white dark:bg-slate-900 transition-colors duration-300 relative">
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
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-md shadow-lg z-50 transition-opacity duration-300">
          {toastMessage}
        </div>
      )}
      <div className={`w-1/3 ltr:border-r rtl:border-l border-slate-200 dark:border-white/10 backdrop-blur-xl flex flex-col ${IS_RAMADAN ? 'bg-slate-900/40' : 'bg-slate-50 dark:bg-slate-900/40'}`}>
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-white/10">
          <h2 className={`text-xl font-bold ${IS_RAMADAN ? 'text-gold-gradient' : 'text-slate-800 dark:text-white'}`}>{t('allNotes')}</h2>
          <button onClick={onAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-md shadow-sm transition-colors">
            {ICONS.plus}
          </button>
        </div>
        <div className="flex-grow overflow-y-auto custom-scrollbar">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
              <p className="mb-4">{t('noNotesYet')}</p>
              <button onClick={onAdd} className="text-indigo-500 font-bold hover:underline">{t('addNewNote')}</button>
            </div>
          ) : (
            subjects.map(subject => (
              <div key={subject || 'unassigned'}>
                <h3 className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-white/70 bg-slate-100 dark:bg-white/5 uppercase tracking-wider">{subject || t('other')}</h3>
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
            <div className={`p-6 border-b border-slate-200 dark:border-white/10 ${IS_RAMADAN ? 'bg-transparent' : 'bg-white dark:bg-slate-900/60'}`}>
              <h2 className={`text-3xl font-bold mb-1 ${IS_RAMADAN ? 'text-gold-gradient' : 'text-slate-900 dark:text-white'}`}>{selectedNote.title}</h2>
              <p className="text-sm font-medium text-slate-500 dark:text-gray-400">{selectedNote.subject}</p>
              <div className="mt-4 flex gap-2 flex-wrap touch-manipulation">
                {[
                  { cmd: 'formatBlock', val: '<h1>', label: 'H1' },
                  { cmd: 'formatBlock', val: '<h2>', label: 'H2' },
                  { cmd: 'bold', label: 'B' },
                  { cmd: 'italic', label: 'I' },
                  { cmd: 'insertUnorderedList', label: '•' },
                  { cmd: 'insertOrderedList', label: '1.' },
                ].map((btn, idx) => (
                  <button key={idx} onClick={() => handleFormat(btn.cmd, btn.val)}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-gray-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-medium border border-slate-200 dark:border-slate-700">
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
            <div
              ref={editorRef}
              contentEditable
              onBlur={handleContentBlur}
              className="max-w-4xl mx-auto w-full p-8 flex-grow overflow-y-auto focus:outline-none text-slate-800 dark:text-gray-300 leading-relaxed text-lg prose prose-slate dark:prose-invert custom-scrollbar"
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
  );
};

export default Notes;
