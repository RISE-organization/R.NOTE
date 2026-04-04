
import React, { ReactNode } from 'react';
import { ICONS } from '../constants';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-xl w-full max-w-md md:max-w-2xl flex flex-col border border-slate-200 dark:border-white/10 transition-colors duration-300" style={{ maxHeight: '90vh' }}>
        <div className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-6 py-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center rounded-t-2xl z-10">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:text-white/70 dark:hover:text-white transition-colors p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10"
          >
            {ICONS.close}
          </button>
        </div>
        <div className="p-6 md:p-8 flex-1 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
