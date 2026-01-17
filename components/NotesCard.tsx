
import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from './GlassCard';
import { storage, STORAGE_KEYS } from '../services/storageService';

// Fix: Declare chrome variable to avoid TypeScript errors in extension environment
declare var chrome: any;

interface NotesWidgetProps {
  isDarkMode: boolean;
  focusMode?: boolean;
}

export const NotesCard: React.FC<NotesWidgetProps> = ({ isDarkMode, focusMode = false }) => {
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'saved' | 'saving' | 'syncing'>('saved');
  const [expanded, setExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setExpanded(false);
  }, [focusMode]);

  useEffect(() => {
    const loadNote = async () => {
      const savedNote = await storage.get<string>(STORAGE_KEYS.NOTES_CONTENT);
      if (savedNote !== null) setNote(savedNote);
    };
    loadNote();

    const handleStorageChange = (changes: any) => {
        if (changes[STORAGE_KEYS.NOTES_CONTENT]) {
            setStatus('syncing');
            setNote(changes[STORAGE_KEYS.NOTES_CONTENT].newValue || '');
            setTimeout(() => setStatus('saved'), 1000);
        }
    };

    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.onChanged.addListener(handleStorageChange);
        return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNote(e.target.value);
    setStatus('saving');
  };

  useEffect(() => {
    const timer = setTimeout(() => {
        if (status === 'saving') {
            storage.set(STORAGE_KEYS.NOTES_CONTENT, note).then(() => setStatus('saved'));
        }
    }, 800);
    return () => clearTimeout(timer);
  }, [note, status]);

  const textPrimary = isDarkMode ? 'text-white' : 'text-slate-800';
  const textSecondary = isDarkMode ? 'text-white/60' : 'text-slate-500';

  return (
    <div className="flex flex-col items-start gap-2 animate-[fadeIn_1s_ease-out] pointer-events-auto">
        <GlassCard 
            isDarkMode={isDarkMode}
            interactive
            className={`!p-0 cursor-pointer flex flex-col justify-start rounded-[24px] ${expanded ? 'w-[340px] h-auto' : 'w-[200px] h-[64px]'}`}
        >
            <div className={`flex items-center justify-between px-5 w-full transition-all duration-300 ${expanded ? 'py-5' : 'h-[64px]'}`} onClick={() => setExpanded(!expanded)}>
                <div className="flex items-center gap-4">
                    <div className={`flex-shrink-0 ${isDarkMode ? 'text-white' : 'text-slate-700'}`}><span className="material-symbols-outlined !text-[24px]">description</span></div>
                    <div className="flex flex-col justify-center">
                         <span className={`text-sm font-medium leading-none ${textPrimary}`}>Notas</span>
                         <span className={`text-[10px] mt-1 whitespace-nowrap block transition-colors ${status === 'saving' ? 'text-yellow-400' : status === 'syncing' ? 'text-blue-400' : textSecondary}`}>
                            {status === 'saving' ? 'Salvando...' : status === 'syncing' ? 'Sincronizando...' : 'Anotações'}
                         </span>
                    </div>
                </div>
                <div className={`ml-auto transition-transform duration-500 ${expanded ? 'rotate-180' : 'rotate-0'} ${textSecondary}`}><span className="material-symbols-outlined !text-[20px]">expand_more</span></div>
            </div>

            <div className={`transition-all duration-[500ms] ease-[cubic-bezier(0.25,0.8,0.25,1)] overflow-hidden border-t ${isDarkMode ? 'border-white/10' : 'border-black/5'} ${expanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0 border-t-0'}`}>
                <div className={`px-5 pb-5 pt-3 cursor-default`} onClick={(e) => e.stopPropagation()}>
                    <textarea
                        ref={textareaRef}
                        value={note}
                        onChange={handleChange}
                        placeholder="Escreva seus pensamentos..."
                        className={`w-full h-64 bg-transparent resize-none outline-none text-sm font-light leading-relaxed scrollbar-thin ${isDarkMode ? 'scrollbar-thumb-white/10' : 'scrollbar-thumb-black/10'} ${textPrimary} placeholder-white/20`}
                        spellCheck={false}
                    />
                </div>
            </div>
        </GlassCard>
    </div>
  );
};
