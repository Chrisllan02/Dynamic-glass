
import React, { useState, useEffect } from 'react';
import { GlassCard } from './GlassCard';
import { storage, STORAGE_KEYS } from '../services/storageService';
import { Reminder } from '../types';

interface RemindersWidgetProps {
  isDarkMode: boolean;
  focusMode?: boolean;
}

export const RemindersWidget: React.FC<RemindersWidgetProps> = ({ isDarkMode, focusMode = false }) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [newReminder, setNewReminder] = useState('');
  const [expanded, setExpanded] = useState(false);

  // Auto-collapse
  useEffect(() => {
    setExpanded(false);
  }, [focusMode]);

  useEffect(() => {
    const loadReminders = async () => {
      const saved = await storage.get<Reminder[]>(STORAGE_KEYS.REMINDERS_DATA);
      if (saved) setReminders(saved);
    };
    loadReminders();
  }, []);

  const saveReminders = (updated: Reminder[]) => {
    setReminders(updated);
    storage.set(STORAGE_KEYS.REMINDERS_DATA, updated);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminder.trim()) return;
    
    const item: Reminder = {
      id: Date.now().toString(),
      text: newReminder,
      completed: false,
      createdAt: Date.now()
    };
    
    saveReminders([...reminders, item]);
    setNewReminder('');
  };

  const toggleReminder = (id: string) => {
    const updated = reminders.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    saveReminders(updated);
  };

  const deleteReminder = (id: string) => {
    const updated = reminders.filter(t => t.id !== id);
    saveReminders(updated);
  };

  // Styling
  const textPrimary = isDarkMode ? 'text-white' : 'text-slate-800';
  const textSecondary = isDarkMode ? 'text-white/70' : 'text-slate-500';
  const textCompleted = isDarkMode ? 'text-white/40 line-through decoration-white/30' : 'text-slate-400 line-through decoration-slate-400';
  
  // More visible input
  const inputBg = isDarkMode 
    ? 'bg-black/40 text-white placeholder-white/60 border border-white/30 focus:border-white/50' 
    : 'bg-white border border-black/10 text-slate-800 placeholder-slate-400 focus:border-black/20';
  
  const activeCount = reminders.filter(t => !t.completed).length;

  return (
    <div 
        className="flex flex-col items-start gap-2 animate-[fadeIn_1s_ease-out] pointer-events-auto"
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
    >
        <GlassCard 
            isDarkMode={isDarkMode}
            interactive
            className={`
                !p-0 cursor-pointer flex flex-col justify-start rounded-[24px]
                ${expanded ? 'w-[340px] h-auto' : 'w-[200px] h-[64px]'}
            `}
        >
            {/* Header */}
            <div 
                className={`flex items-center justify-between px-5 w-full transition-all duration-300 ${expanded ? 'py-5' : 'h-[64px]'}`}
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-4">
                    <div className={`flex-shrink-0 ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                         <span className="material-symbols-outlined !text-[24px]">notifications</span>
                    </div>

                    <div className="flex flex-col justify-center">
                         <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium leading-none ${textPrimary}`}>Lembretes</span>
                         </div>
                         {expanded && (
                             <div className={`overflow-hidden transition-all duration-500 ${expanded ? 'max-h-10 opacity-100' : 'max-h-0 opacity-0'}`}>
                                <span className={`text-[10px] mt-1 whitespace-nowrap block ${textSecondary}`}>
                                    {activeCount} pendentes
                                </span>
                             </div>
                         )}
                         {!expanded && (
                             <span className={`text-[10px] mt-1 whitespace-nowrap block ${textSecondary}`}>
                                 Alertas
                             </span>
                         )}
                    </div>
                </div>
                
                <div className={`ml-auto transition-transform duration-500 ${expanded ? 'rotate-180' : 'rotate-0'} ${textSecondary}`}>
                     <span className="material-symbols-outlined !text-[20px]">expand_more</span>
                </div>
            </div>

            {/* List */}
            <div className={`
                transition-all duration-[500ms] ease-[cubic-bezier(0.25,0.8,0.25,1)] overflow-hidden border-t
                ${isDarkMode ? 'border-white/20' : 'border-black/10'}
                ${expanded ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0 border-t-0'}
            `}>
                <div className={`px-5 pb-5 pt-3 animate-[fadeIn_0.3s_ease-out_0.1s_both] cursor-default`} onClick={(e) => e.stopPropagation()}>
                    
                    <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/30 pr-1 mb-3">
                        {reminders.length === 0 ? (
                             <p className={`text-[11px] italic opacity-50 text-center py-2 ${textPrimary}`}>
                                Nenhum lembrete.
                            </p>
                        ) : (
                            reminders.map(item => (
                                <div 
                                    key={item.id} 
                                    className={`
                                        group flex items-center gap-3 p-2 rounded-lg transition-all duration-300 border
                                        ${item.completed 
                                            ? (isDarkMode ? 'bg-black/20 border-transparent opacity-60' : 'bg-gray-100 border-transparent opacity-60')
                                            : (isDarkMode ? 'border-white/20 hover:bg-white/10 hover:border-white/40' : 'border-black/10 hover:bg-white hover:border-black/20')
                                        }
                                    `}
                                >
                                    <button 
                                        onClick={() => toggleReminder(item.id)}
                                        className={`
                                            w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-300
                                            ${item.completed 
                                                ? 'bg-yellow-500 border-yellow-500 scale-110' 
                                                : `border-current opacity-60 hover:opacity-100 hover:border-yellow-400`
                                            }
                                        `}
                                    >
                                         <span className={`material-symbols-outlined !text-[12px] text-white transition-transform duration-300 ${item.completed ? 'scale-100' : 'scale-0'}`}>
                                            check
                                         </span>
                                    </button>
                                    <span className={`text-sm flex-1 leading-tight transition-all duration-300 ${item.completed ? textCompleted : textPrimary}`}>
                                        {item.text}
                                    </span>
                                    <button 
                                        onClick={() => deleteReminder(item.id)}
                                        className={`opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition-opacity`}
                                    >
                                         <span className="material-symbols-outlined !text-[16px]">delete</span>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <form onSubmit={handleAdd} className="flex gap-2">
                        <input 
                            type="text"
                            value={newReminder}
                            onChange={(e) => setNewReminder(e.target.value)}
                            placeholder="Novo lembrete..."
                            className={`flex-1 px-3 py-2 rounded-lg text-xs outline-none transition-colors ${inputBg}`}
                        />
                        <button 
                            type="submit"
                            disabled={!newReminder.trim()}
                            className={`px-3 rounded-lg transition-colors disabled:opacity-30 flex items-center justify-center ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                        >
                             <span className="material-symbols-outlined !text-[16px]">add</span>
                        </button>
                    </form>

                </div>
            </div>
        </GlassCard>
    </div>
  );
};
