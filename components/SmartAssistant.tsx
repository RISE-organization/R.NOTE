
import React, { useState, useRef, useEffect } from 'react';
import { ICONS } from '../constants';
import { ChatMessage } from '../types';
import { getGeminiResponse } from '../services/geminiService';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useLanguage } from '../LanguageContext';
import { IS_RAMADAN } from '../src/config/theme';
import { useDataManagement } from '../hooks/useDataManagement';
import Card from './ui/Card';

import { Task, Class, Note, Assignment, Quiz, AnyItem } from '../types';

interface SmartAssistantProps {
  isOpen?: boolean;
  onClose?: () => void;
  tasks: Task[];
  classes: Class[];
  notes: Note[];
  assignments: Assignment[];
  quizzes: Quiz[];
  handleSave: (view: 'schedule' | 'tasks' | 'quizzes' | 'assignments' | 'notes', originalItem?: AnyItem, currentItem?: Partial<AnyItem>) => Promise<void>;
}

const SmartAssistant: React.FC<SmartAssistantProps> = ({ isOpen: externalIsOpen, onClose: externalOnClose, tasks, classes, notes, assignments, quizzes, handleSave }) => {
  const { t, language } = useLanguage();
  // Removed local useDataManagement hook call to prevent duplicate listeners
  // const { tasks, classes, notes, assignments, quizzes } = useDataManagement();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0); // 429 Cool-down timer
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Timer for 429 Cool-down
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = externalOnClose || setInternalIsOpen;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      // Use a small timeout to ensure DOM is fully rendered after transition
      const timer = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;
    const userMessage: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await getGeminiResponse(messages, input, language, { tasks, classes, notes, assignments, quizzes });
      
      // Handle Rate Limit (429) - Trigger Cool-down
      if (responseText === "__RATE_LIMIT_EXCEEDED__") {
        setCooldown(60);
        const restingMessage: ChatMessage = { 
          role: 'model', 
          text: language === 'ar' 
            ? "⚠️ المساعد الذكي يستريح الآن لتجنب الضغط الزائد. يرجى الانتظار لمدة دقيقة واحدة وسأكون جاهزاً لمساعدتك!" 
            : "⚠️ The AI is resting for a moment to prevent overload. Please wait a minute and I'll be ready to help!"
        };
        setMessages(prev => [...prev, restingMessage]);
        return;
      }

      let displayText = responseText;
      
      // Parse JSON for Agent Actions
      const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
      const match = responseText.match(jsonRegex);
      
      if (match && match[1]) {
         try {
           const parsed = JSON.parse(match[1]);
           if (parsed.action && parsed.payload) {
             let view: 'schedule' | 'tasks' | 'quizzes' | 'assignments' | 'notes' | null = null;
             let isValid = false;

             if (parsed.action === 'ADD_TASK') {
               view = 'tasks';
               isValid = !!parsed.payload.title;
             } else if (parsed.action === 'ADD_CLASS') {
               view = 'schedule';
               isValid = !!(parsed.payload.subject && parsed.payload.day);
             } else if (parsed.action === 'ADD_NOTE') {
               view = 'notes';
               isValid = !!(parsed.payload.title || parsed.payload.subject);
             } else if (parsed.action === 'ADD_QUIZ') {
               view = 'quizzes';
               isValid = !!(parsed.payload.subject && parsed.payload.date);
             }
             
             if (view && isValid) {
               await handleSave(view, undefined, parsed.payload);
               // Replace the JSON block with a success notification
               displayText = responseText.replace(jsonRegex, '✅ تم الإضافة بنجاح!');
             } else {
                 throw new Error("Validation Error: Missing required payload fields or unknown action.");
             }
           } else {
               throw new Error("Validation Error: Missing action or payload objects.");
           }
         } catch (e) {
           console.warn("Failed to parse or validate AI JSON action:", e);
           // Fallback to error message, overriding the broken JSON text
           displayText = "عذراً، أحتاج تفاصيل أكثر لتنفيذ الأمر. يرجى توضيح المطلوب بدقة.";
         }
      }

      const modelMessage: ChatMessage = { role: 'model', text: displayText };
      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = { role: 'model', text: t('geminiError') };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  if (externalIsOpen !== undefined) {
    // Sidebar mode
    return (
      <div className={`h-full flex flex-col ${IS_RAMADAN ? 'bg-slate-900/80 backdrop-blur-xl' : 'bg-white dark:bg-gray-800'}`}>
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className={`text-xl font-bold flex items-center ${IS_RAMADAN ? 'text-gold-gradient' : 'text-gray-800 dark:text-white'}`}>
            {ICONS.ai} <span className="ms-2">{t('smartAssistant')}</span>
          </h2>
          <button
            onClick={externalOnClose}
            className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors lg:hidden"
            aria-label="Close"
          >
            {ICONS.close}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`rounded-lg px-4 py-2 max-w-sm ${msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                {msg.role === 'model' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(msg.text) as string) }} />
                ) : (
                  <p>{msg.text}</p>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2">
                <span className="animate-pulse">{t('thinking')}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>

        <footer className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={cooldown > 0 
                ? (language === 'ar' ? `يرجى الانتظار (${cooldown}ث)...` : `Please wait (${cooldown}s)...`)
                : (t('askForStudyTips') || "Ask me anything...")
              }
              className="w-full bg-transparent p-3 focus:outline-none text-gray-800 dark:text-white"
              disabled={isLoading || cooldown > 0}
            />
            <button onClick={handleSend} disabled={isLoading || cooldown > 0} className="p-3 text-indigo-500 disabled:text-gray-400">
              {ICONS.send}
            </button>
          </div>
        </footer>
      </div>
    );
  }

  // View Area mode (Full Content Replacement)
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-24 sm:bottom-6 end-6 bg-[#f5f5dc] hover:bg-[#ede0c8] text-slate-800 rounded-full p-2.5 sm:p-3 shadow-lg z-50 transition-all duration-300 hover:scale-110 ring-2 ring-amber-200 ${isOpen ? 'opacity-0 scale-0 pointer-events-none' : 'opacity-100 scale-100'}`}
        aria-label="Open Smart Assistant"
      >
        <span className="scale-90 sm:scale-100 block">{ICONS.ai}</span>
      </button>

      {isOpen && (
        <div className="fixed top-16 end-0 bottom-16 md:bottom-0 start-0 md:start-56 lg:start-64 z-[22] flex flex-col transition-all duration-300 animate-in fade-in">
          <div className="relative w-full h-full flex flex-col overflow-hidden bg-white/20 dark:bg-slate-900/20 backdrop-blur-xl">
            {/* RGB Glow Background - Subtler for full-view */}

            
            <div className="relative w-full h-full flex flex-col theme-transition border-l border-slate-200/50 dark:border-slate-800/50">
              <header className="px-6 py-5 border-b border-gray-200/50 dark:border-gray-700/50 flex justify-between items-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
                    {ICONS.ai}
                  </div>
                  <div>
                    <h2 className={`text-xl sm:text-2xl font-black ${IS_RAMADAN ? 'text-gold-gradient' : 'text-gray-800 dark:text-white'}`}>
                      {t('smartAssistant')}
                    </h2>
                    <p className="text-[10px] sm:text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{language === 'ar' ? 'المساعد الذكي النشط' : 'AI POWERED STUDY COPILOT'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 -mr-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all group"
                  aria-label="Close"
                >
                  <span className="group-hover:rotate-90 block transition-transform duration-300">{ICONS.close}</span>
                </button>
              </header>

              <main className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 scrollbar-hide">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                     <div className="text-6xl text-indigo-500 animate-bounce">{ICONS.ai}</div>
                     <p className="font-black text-xl">{language === 'ar' ? 'كيف يمكنني مساعدتك اليوم؟' : 'How can I help you today?'}</p>
                  </div>
                )}
                {messages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`rounded-2xl px-5 py-3 max-w-[85%] sm:max-w-[70%] shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white font-bold' : 'bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700 text-gray-800 dark:text-gray-200'}`}>
                      {msg.role === 'model' ? (
                        <div className="prose prose-sm sm:prose dark:prose-invert max-w-none prose-p:leading-relaxed" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(msg.text) as string) }} />
                      ) : (
                        <p className="text-sm sm:text-base leading-relaxed">{msg.text}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-end">
                    <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 flex items-center gap-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span className="text-xs font-black animate-pulse text-indigo-500">{t('thinking')}</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </main>

              <footer className="p-4 sm:p-8 border-t border-gray-200 dark:border-gray-700 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
                <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner focus-within:ring-2 focus-within:ring-indigo-500/30 transition-all">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={cooldown > 0 
                      ? (language === 'ar' ? `يرجى الانتظار (${cooldown}ث)...` : `الذكاء الاصطناعي يستريح (${cooldown}ث)...`)
                      : (t('askForStudyTips') || "Ask me about your schedule, notes, or tips...")
                    }
                    className="flex-1 bg-transparent p-3 sm:p-4 focus:outline-none text-gray-800 dark:text-white text-sm sm:text-base font-bold placeholder:opacity-50"
                    disabled={isLoading || cooldown > 0}
                  />
                  <button 
                    onClick={handleSend} 
                    disabled={isLoading || cooldown > 0 || !input.trim()} 
                    className="p-3 sm:p-4 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 disabled:bg-gray-400 disabled:shadow-none transition-all active:scale-95"
                  >
                    {ICONS.send}
                  </button>
                </div>

              </footer>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SmartAssistant;
