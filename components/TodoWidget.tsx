
import React, { useState, useEffect } from 'react';
import { GlassCard } from './GlassCard';
import { storage, STORAGE_KEYS } from '../services/storageService';
import { TodoTask } from '../types';
import { uiSounds } from '../services/soundService';

// Fix: Declare chrome variable for TypeScript compatibility in extension environments
declare var chrome: any;

interface TodoWidgetProps {
  isDarkMode: boolean;
  focusMode?: boolean;
}

export const TodoWidget: React.FC<TodoWidgetProps> = ({ isDarkMode, focusMode = false }) => {
  const [tasks, setTasks] = useState<TodoTask[]>([]);
  const [newTask, setNewTask] = useState('');
  const [expanded, setExpanded] = useState(false);

  // Carregamento inicial e Sincronização entre abas
  useEffect(() => {
    const loadTasks = async () => {
      const saved = await storage.get<TodoTask[]>(STORAGE_KEYS.TODO_TASKS);
      if (saved) setTasks(saved);
    };
    loadTasks();

    // Ouvir mudanças externas (outras abas)
    const handleStorageChange = (changes: any, area: string) => {
        if (changes[STORAGE_KEYS.TODO_TASKS]) {
            setTasks(changes[STORAGE_KEYS.TODO_TASKS].newValue || []);
        }
    };

    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.onChanged.addListener(handleStorageChange);
        return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }
  }, []);

  const saveTasks = (updated: TodoTask[]) => {
    setTasks(updated);
    storage.set(STORAGE_KEYS.TODO_TASKS, updated);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    uiSounds.click();
    
    const task: TodoTask = {
      id: Date.now().toString(),
      text: newTask,
      completed: false,
      createdAt: Date.now()
    };
    
    saveTasks([...tasks, task]);
    setNewTask('');
  };

  const toggleTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    const isNowCompleted = !task?.completed;
    
    if (isNowCompleted) uiSounds.success(); else uiSounds.click();

    const updated = tasks.map(t => t.id === id ? { 
        ...t, 
        completed: isNowCompleted,
        completedAt: isNowCompleted ? Date.now() : undefined 
    } : t);
    saveTasks(updated);
  };

  const deleteTask = (id: string) => {
    uiSounds.click();
    const updated = tasks.filter(t => t.id !== id);
    saveTasks(updated);
  };

  // Styling
  const textPrimary = isDarkMode ? 'text-white' : 'text-slate-800';
  const textSecondary = isDarkMode ? 'text-white/70' : 'text-slate-500';
  const textCompleted = isDarkMode ? 'text-white/40 line-through decoration-white/30' : 'text-slate-400 line-through decoration-slate-400';
  const inputBg = isDarkMode 
    ? 'bg-black/60 text-white placeholder-white/60 border border-white/50 focus:border-white/70 shadow-inner' 
    : 'bg-white border border-black/20 text-slate-800 placeholder-slate-400 focus:border-black/40 shadow-inner';
  
  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <div className="flex flex-col items-start gap-2 animate-[fadeIn_1s_ease-out] pointer-events-auto">
        <GlassCard 
            isDarkMode={isDarkMode}
            interactive
            className={`!p-0 cursor-pointer flex flex-col justify-start rounded-[24px] ${expanded ? 'w-[340px] h-auto' : 'w-[200px] h-[64px]'}`}
        >
            <div className={`flex items-center justify-between px-5 w-full transition-all duration-300 ${expanded ? 'py-5' : 'h-[64px]'}`} onClick={() => setExpanded(!expanded)}>
                <div className="flex items-center gap-4">
                    <div className={`flex-shrink-0 ${isDarkMode ? 'text-white' : 'text-slate-700'}`}><span className="material-symbols-outlined !text-[24px]">checklist</span></div>
                    <div className="flex flex-col justify-center">
                         <div className="flex items-center gap-2"><span className={`text-sm font-medium leading-none ${textPrimary}`}>Tarefas</span></div>
                         <span className={`text-[10px] mt-1 whitespace-nowrap block ${textSecondary}`}>
                            {expanded ? `${completedCount}/${tasks.length} concluídas` : 'Lista To-Do'}
                         </span>
                    </div>
                </div>
                <div className={`ml-auto transition-transform duration-500 ${expanded ? 'rotate-180' : 'rotate-0'} ${textSecondary}`}><span className="material-symbols-outlined !text-[20px]">expand_more</span></div>
            </div>

            <div className={`transition-all duration-[500ms] ease-[cubic-bezier(0.25,0.8,0.25,1)] overflow-hidden border-t ${isDarkMode ? 'border-white/20' : 'border-black/10'} ${expanded ? 'max-h-[450px] opacity-100' : 'max-h-0 opacity-0 border-t-0'}`}>
                <div className={`px-5 pb-5 pt-3 animate-[fadeIn_0.3s_ease-out_0.1s_both] cursor-default`} onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/30 pr-1 mb-3">
                        {tasks.length === 0 ? (
                             <p className={`text-[11px] italic opacity-50 text-center py-6 ${textPrimary}`}>Nenhuma tarefa pendente.</p>
                        ) : (
                            tasks.map(task => (
                                <div key={task.id} className={`group flex items-center gap-3 p-2 rounded-lg transition-all duration-300 border ${task.completed ? (isDarkMode ? 'bg-black/30 border-transparent opacity-60' : 'bg-gray-200 border-transparent opacity-60') : (isDarkMode ? 'border-white/30 hover:bg-white/10 hover:border-white/50' : 'border-black/20 hover:bg-white hover:border-black/30')}`}>
                                    <button onClick={() => toggleTask(task.id)} className={`w-4 h-4 rounded border flex items-center justify-center transition-all duration-300 ${task.completed ? 'bg-green-500 border-green-500 scale-110' : `border-current opacity-60 hover:opacity-100 hover:border-green-400`}`}>
                                         <span className={`material-symbols-outlined !text-[12px] text-white transition-transform duration-300 ${task.completed ? 'scale-100' : 'scale-0'}`}>check</span>
                                    </button>
                                    <span className={`text-sm flex-1 leading-tight transition-all duration-300 ${task.completed ? textCompleted : textPrimary}`}>{task.text}</span>
                                    <button onClick={() => deleteTask(task.id)} className={`opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition-opacity flex items-center`}><span className="material-symbols-outlined !text-[16px]">delete</span></button>
                                </div>
                            ))
                        )}
                    </div>
                    <form onSubmit={handleAdd} className="flex gap-2">
                        <input type="text" value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Nova tarefa..." className={`flex-1 px-3 py-2 rounded-lg text-xs outline-none transition-colors ${inputBg}`} />
                        <button type="submit" disabled={!newTask.trim()} className={`relative px-3 rounded-lg transition-all duration-300 overflow-hidden flex items-center justify-center disabled:opacity-30 ${isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'}`}>
                             <span className="material-symbols-outlined !text-[18px]">add</span>
                        </button>
                    </form>
                </div>
            </div>
        </GlassCard>
    </div>
  );
};
