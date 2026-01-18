
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GlassCard } from './GlassCard';
import { storage, STORAGE_KEYS } from '../services/storageService';
import { CalendarEvent, TodoTask, Priority } from '../types';
import { uiSounds } from '../services/soundService';
import { analyzePlannerData, analyzePerformanceHistory } from '../services/geminiService';

// Fix: Declare chrome variable to resolve 'Cannot find name chrome' in browser/extension contexts
declare var chrome: any;

interface UnifiedPlannerWidgetProps {
  isDarkMode: boolean;
  focusMode?: boolean;
  isMini?: boolean;
}

type TabType = 'today' | 'calendar' | 'tasks' | 'notes' | 'history';

const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-400'
};

const CATEGORIES = [
  { label: 'Trabalho', emoji: '💻', desc: 'Foco', color: 'text-blue-400' },
  { label: 'Pessoal', emoji: '🏠', desc: 'Vida', color: 'text-emerald-400' },
  { label: 'Saúde', emoji: '🌿', desc: 'Mente', color: 'text-rose-400' },
  { label: 'Estudo', emoji: '📚', desc: 'Edu', color: 'text-amber-400' }
];

export const UnifiedPlannerWidget: React.FC<UnifiedPlannerWidgetProps> = ({ isDarkMode, focusMode = false, isMini = false }) => {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('today');
  
  const [tasks, setTasks] = useState<TodoTask[]>([]);
  const [events, setEvents] = useState<Record<string, CalendarEvent[]>>({});
  const [noteContent, setNoteContent] = useState('');
  const [noteStatus, setNoteStatus] = useState<'saved' | 'saving'>('saved');
  
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [historyInsight, setHistoryInsight] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [displayDate, setDisplayDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [inputValue, setInputValue] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<Priority>('medium');
  const [selectedCategory, setSelectedCategory] = useState('Trabalho');
  const [selectedTime, setSelectedTime] = useState('');
  const [isListening, setIsListening] = useState(false);

  // DND State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [isDraggingOverDelete, setIsDraggingOverDelete] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [focusMode]);

  useEffect(() => {
    const loadData = async () => {
      const savedTasks = await storage.get<TodoTask[]>(STORAGE_KEYS.TODO_TASKS);
      const savedEvents = await storage.get<Record<string, CalendarEvent[]>>(STORAGE_KEYS.CALENDAR_EVENTS);
      const savedNotes = await storage.get<string>(STORAGE_KEYS.NOTES_CONTENT);
      
      if (savedTasks) setTasks(savedTasks);
      if (savedEvents) setEvents(savedEvents);
      if (savedNotes) setNoteContent(savedNotes);
    };
    loadData();

    const handleStorageChange = (changes: any) => {
        if (changes[STORAGE_KEYS.TODO_TASKS]) setTasks(changes[STORAGE_KEYS.TODO_TASKS].newValue || []);
        if (changes[STORAGE_KEYS.CALENDAR_EVENTS]) setEvents(changes[STORAGE_KEYS.CALENDAR_EVENTS].newValue || {});
        // Note: We don't sync notes real-time here to avoid typing conflicts, we rely on local state + save
    };

    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.onChanged.addListener(handleStorageChange);
        return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }
  }, []);

  const saveTasks = (updated: TodoTask[]) => { setTasks(updated); storage.set(STORAGE_KEYS.TODO_TASKS, updated); };
  const saveEvents = (updated: Record<string, CalendarEvent[]>) => { setEvents(updated); storage.set(STORAGE_KEYS.CALENDAR_EVENTS, updated); };

  // Note Auto-Save Logic
  useEffect(() => {
      const timer = setTimeout(() => {
          if (noteStatus === 'saving') {
              storage.set(STORAGE_KEYS.NOTES_CONTENT, noteContent).then(() => setNoteStatus('saved'));
          }
      }, 1000);
      return () => clearTimeout(timer);
  }, [noteContent, noteStatus]);

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setNoteContent(e.target.value);
      setNoteStatus('saving');
  };

  const handleAiInsight = async () => {
      if (isAiThinking) return;
      uiSounds.click();
      setIsAiThinking(true);
      try {
          if (activeTab === 'today') {
              const todayTasks = tasks.filter(t => !t.completed).map(t => ({ text: t.text, priority: t.priority || 'medium' }));
              const todayEvs = (events[getDateKey(currentDate)] || []).map(e => e.title);
              const insight = await analyzePlannerData(todayTasks, todayEvs);
              setAiInsight(insight);
          } else if (activeTab === 'history') {
              const insight = await analyzePerformanceHistory(last7DaysStats);
              setHistoryInsight(insight);
          }
          uiSounds.success();
      } catch (e) {
          uiSounds.error();
      } finally {
          setIsAiThinking(false);
      }
  };

  const startVoiceRecognition = () => {
    if (isListening) return;
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Voz não suportada.");
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.onstart = () => { setIsListening(true); uiSounds.toggleOn(); };
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => { setInputValue(event.results[0][0].transcript); uiSounds.success(); };
    recognition.start();
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    uiSounds.click();
    if (activeTab === 'calendar') {
        const key = getDateKey(selectedDate);
        const newEvent: CalendarEvent = { id: Date.now().toString(), title: inputValue, date: key, completed: false };
        saveEvents({ ...events, [key]: [...(events[key] || []), newEvent] });
    } else {
        const newTask: TodoTask = { 
            id: Date.now().toString(), 
            text: inputValue, 
            completed: false, 
            createdAt: Date.now(), 
            priority: selectedPriority, 
            category: selectedCategory, 
            time: selectedTime || undefined 
        };
        saveTasks([...tasks, newTask]);
    }
    setInputValue('');
  };

  const toggleTaskComplete = (id: string) => {
      const task = tasks.find(t => t.id === id);
      const isNowCompleted = !task?.completed;
      if (isNowCompleted) uiSounds.success(); else uiSounds.click();
      saveTasks(tasks.map(t => t.id === id ? { ...t, completed: isNowCompleted, completedAt: isNowCompleted ? Date.now() : undefined } : t));
  };

  const startTaskFocus = (task: TodoTask) => {
      uiSounds.toggleOn();
      window.dispatchEvent(new CustomEvent('lumina-command', { detail: { type: 'timer-start-external', payload: { title: task.text } } }));
  };

  const getDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  
  const last7DaysStats = useMemo(() => {
      const stats = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const key = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();
          const dayStart = new Date(d.setHours(0,0,0,0)).getTime();
          const dayEnd = new Date(d.setHours(23,59,59,999)).getTime();
          const count = tasks.filter(t => t.completed && t.completedAt && t.completedAt >= dayStart && t.completedAt <= dayEnd).length;
          stats.push({ day: key, count });
      }
      return stats;
  }, [tasks]);

  const maxTasksInDay = Math.max(...last7DaysStats.map(s => s.count), 1);

  const { daysInMonth, firstDayOfMonth } = (() => {
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    return { daysInMonth: new Date(year, month + 1, 0).getDate(), firstDayOfMonth: new Date(year, month, 1).getDay() };
  })();

  const pendingTasks = tasks.filter(t => !t.completed);
  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];

  const textPrimary = isDarkMode ? 'text-white' : 'text-slate-800';
  const textSecondary = isDarkMode ? 'text-white/60' : 'text-slate-500';

  // DND Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id);
    e.dataTransfer.effectAllowed = 'move';
    uiSounds.click();
  };

  const handleDragOverTask = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedTaskId === targetId || !draggedTaskId) return;
    
    const draggedIdx = tasks.findIndex(t => t.id === draggedTaskId);
    const targetIdx = tasks.findIndex(t => t.id === targetId);
    
    const newTasks = [...tasks];
    const [draggedItem] = newTasks.splice(draggedIdx, 1);
    newTasks.splice(targetIdx, 0, draggedItem);
    setTasks(newTasks);
  };

  const handleDragEnd = () => {
    if (isDraggingOverDelete && draggedTaskId) {
        saveTasks(tasks.filter(t => t.id !== draggedTaskId));
        uiSounds.error();
    } else {
        saveTasks(tasks);
    }
    setDraggedTaskId(null);
    setIsDraggingOverDelete(false);
  };

  if (isMini) {
      return (
          <button 
            onMouseEnter={() => setExpanded(true)}
            onClick={() => setExpanded(true)}
            className="flex flex-col items-center justify-center h-full w-full gap-1 px-4 group hover:scale-105 transition-transform"
          >
              <div className="relative w-12 h-12 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90">
                      <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-white/10" />
                      <circle 
                        cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" fill="transparent" 
                        strokeDasharray="125.6" strokeDashoffset={125.6 - (progressPercent / 100 * 125.6)} 
                        className="text-blue-500 transition-all duration-1000 ease-out" 
                      />
                  </svg>
                  <span className={`absolute text-[10px] font-black ${textPrimary}`}>{Math.round(progressPercent)}%</span>
              </div>
              <span className={`text-[8px] font-bold uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity ${textPrimary}`}>Foco</span>
          </button>
      );
  }

  return (
    <div 
        className="flex flex-col items-start gap-2 animate-[fadeIn_1s_ease-out] pointer-events-auto"
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
    >
        <GlassCard 
            isDarkMode={isDarkMode}
            interactive={!expanded}
            className={`!p-0 cursor-default flex flex-col justify-start rounded-[24px] relative overflow-hidden transition-all duration-700 ${expanded ? 'w-[320px] h-auto shadow-[0_0_50px_-10px_rgba(59,130,246,0.3)]' : 'w-[200px] h-[58px] cursor-pointer'}`}
        >
            {expanded && (
                <div 
                    className="absolute bottom-0 left-0 right-0 bg-blue-500/10 pointer-events-none transition-all duration-1000 ease-in-out" 
                    style={{ height: `${progressPercent}%`, opacity: expanded ? 0.3 : 0 }} 
                />
            )}

            <div className={`flex items-center justify-between px-5 w-full transition-all duration-300 ${expanded ? 'py-3' : 'h-[58px]'}`} onClick={() => !expanded && setExpanded(true)}>
                <div className="flex items-center gap-3">
                    <div className={`flex-shrink-0 ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                        <span className={`material-symbols-outlined !text-[22px] ${expanded ? 'animate-pulse text-blue-400' : ''}`}>
                            {activeTab === 'calendar' ? 'calendar_month' : activeTab === 'tasks' ? 'checklist' : activeTab === 'notes' ? 'edit_note' : activeTab === 'history' ? 'monitoring' : 'dashboard'}
                        </span>
                    </div>
                    <div className="flex flex-col justify-center">
                        <span className={`text-xs font-bold leading-none ${textPrimary}`}>Planner</span>
                        <span className={`text-[9px] mt-0.5 opacity-60 font-medium ${textSecondary}`}>
                            {expanded ? activeTab.toUpperCase() : `${pendingTasks.length} pendências`}
                        </span>
                    </div>
                </div>
                <div 
                    className={`ml-auto p-1 rounded-full hover:bg-white/10 transition-all duration-500 ${expanded ? 'rotate-180' : 'rotate-0'} ${textSecondary}`}
                    onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                >
                     <span className="material-symbols-outlined !text-[16px]">{expanded ? 'close' : 'expand_more'}</span>
                </div>
            </div>

            <div className={`transition-all duration-[500ms] overflow-hidden border-t ${isDarkMode ? 'border-white/10' : 'border-black/5'} ${expanded ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0 border-t-0'}`}>
                <div className="p-3 flex flex-col gap-3">
                    
                    <div className="flex p-0.5 bg-black/20 rounded-lg border border-white/5 shadow-inner">
                        {[
                            { id: 'today', label: 'Hoje', icon: 'auto_awesome' },
                            { id: 'calendar', label: 'Agenda', icon: 'calendar_today' },
                            { id: 'tasks', label: 'Lista', icon: 'checklist' },
                            { id: 'notes', label: 'Notas', icon: 'edit_note' },
                            { id: 'history', label: 'Retrô', icon: 'monitoring' }
                        ].map((tab) => (
                            <button key={tab.id} onClick={() => { setActiveTab(tab.id as TabType); uiSounds.click(); }} className={`flex-1 py-1 flex flex-col items-center gap-0 rounded-md transition-all ${activeTab === tab.id ? 'bg-white/15 text-white shadow border border-white/10' : 'opacity-40 hover:opacity-100 hover:bg-white/5'}`}>
                                <span className="material-symbols-outlined !text-[14px]">{tab.icon}</span>
                                <span className="text-[7px] font-black uppercase tracking-tighter">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="min-h-[180px] max-h-[260px] overflow-y-auto pr-1 glass-scroll">
                        {activeTab === 'today' && (
                            <div className="flex flex-col gap-3 animate-[fadeIn_0.3s]">
                                <div className={`p-2.5 rounded-[16px] border transition-all shadow-sm ${isDarkMode ? 'bg-blue-500/10 border-blue-400/20' : 'bg-blue-50 border-blue-200'}`}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-1.5"><span className="material-symbols-outlined !text-[12px] text-blue-400">psychology</span><span className="text-[8px] font-black uppercase tracking-wider opacity-70">Neural</span></div>
                                        <button onClick={handleAiInsight} disabled={isAiThinking} className="px-1.5 py-0.5 bg-blue-500 text-white rounded-full text-[7px] font-black uppercase hover:bg-blue-400 transition-colors">{isAiThinking ? '...' : 'GERAR'}</button>
                                    </div>
                                    <p className="text-[10px] leading-tight font-medium opacity-90">{aiInsight || "Foque no essencial hoje."}</p>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-[8px] font-black uppercase tracking-[0.1em] opacity-30 px-1">Top Prioridades</h4>
                                    {pendingTasks.slice(0, 2).map(t => (
                                        <div key={t.id} className="group flex items-center gap-2 p-2 bg-white/5 rounded-[14px] border border-white/5 hover:bg-white/10 transition-all">
                                            <div className={`w-0.5 h-6 rounded-full ${PRIORITY_COLORS[t.priority || 'medium']}`}></div>
                                            <div className="flex-1 flex flex-col min-w-0">
                                                <span className="text-[11px] font-bold truncate tracking-tight">{t.text}</span>
                                                <span className="text-[8px] font-medium opacity-50 uppercase mt-0.5">{t.time || '--:--'} • {t.category}</span>
                                            </div>
                                            <button onClick={() => startTaskFocus(t)} className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-blue-500 hover:text-white"><span className="material-symbols-outlined !text-[16px]">play_arrow</span></button>
                                        </div>
                                    ))}
                                    {pendingTasks.length === 0 && <div className="flex flex-col items-center py-4 gap-1 opacity-30 italic text-center"><span className="material-symbols-outlined !text-[24px]">check_circle</span><p className="text-[9px] font-bold">Agenda Vazia.</p></div>}
                                </div>
                            </div>
                        )}

                        {activeTab === 'notes' && (
                            <div className="flex flex-col h-full animate-[fadeIn_0.3s]">
                                <div className="flex justify-between items-center mb-2 px-1">
                                    <span className="text-[8px] font-black uppercase opacity-40">Bloco de Notas</span>
                                    <span className={`text-[8px] font-bold transition-colors ${noteStatus === 'saving' ? 'text-yellow-400' : 'text-green-400 opacity-0'}`}>
                                        {noteStatus === 'saving' ? 'Salvando...' : 'Salvo'}
                                    </span>
                                </div>
                                <textarea 
                                    value={noteContent}
                                    onChange={handleNoteChange}
                                    placeholder="Digite suas ideias..."
                                    className={`w-full h-[200px] bg-white/5 rounded-[14px] p-3 text-xs leading-relaxed outline-none resize-none placeholder-white/20 border border-transparent focus:border-white/10 transition-all ${isDarkMode ? 'text-white' : 'text-slate-800'}`}
                                />
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div className="flex flex-col gap-3 animate-[fadeIn_0.3s]">
                                <div className="p-3 rounded-[16px] bg-white/[0.03] border border-white/5 shadow-inner">
                                    <div className="flex justify-between items-end mb-4 px-1">
                                        <div className="flex flex-col"><h4 className="text-[8px] font-black uppercase tracking-[0.1em] opacity-40">Desempenho</h4><span className="text-xl font-black tracking-tighter">{tasks.filter(t=>t.completed).length} <span className="text-[8px] opacity-40 font-black uppercase">Feitas</span></span></div>
                                    </div>
                                    <div className="h-20 w-full flex items-end justify-between px-1 gap-1 relative">
                                        {last7DaysStats.map((s, i) => {
                                            const heightPerc = (s.count / maxTasksInDay) * 100;
                                            return (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                                                    <div className="w-full bg-white/5 rounded-full overflow-hidden relative flex items-end h-14">
                                                        <div 
                                                            className="w-full rounded-full bg-gradient-to-t from-blue-600 to-blue-300 relative transition-all duration-[800ms]"
                                                            style={{ height: `${heightPerc}%`, opacity: 0.8 }}
                                                        />
                                                    </div>
                                                    <span className="text-[7px] font-black opacity-30 tracking-tight">{s.day}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className={`p-3 rounded-[14px] border transition-all ${isDarkMode ? 'bg-purple-500/10 border-purple-400/20' : 'bg-purple-50 border-purple-200'}`}>
                                    <p className="text-[10px] leading-tight font-medium opacity-90 italic">{historyInsight || "Análise seu ritmo."}</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'tasks' && (
                            <div className="flex flex-col gap-2 animate-[fadeIn_0.3s]">
                                <div className="px-1 mb-1">
                                    <div className="flex justify-between items-center mb-0.5 px-0.5">
                                        <span className="text-[8px] font-black uppercase opacity-40">Progresso</span>
                                        <span className="text-[8px] font-black text-blue-500">{Math.round(progressPercent)}%</span>
                                    </div>
                                    <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }} />
                                    </div>
                                </div>

                                {tasks.map(t => (
                                    <div 
                                        key={t.id} 
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, t.id)}
                                        onDragOver={(e) => handleDragOverTask(e, t.id)}
                                        onDragEnd={handleDragEnd}
                                        className={`group flex items-center gap-2 p-2 rounded-[14px] border transition-all cursor-grab active:cursor-grabbing ${draggedTaskId === t.id ? 'opacity-30 scale-95 border-blue-500/50' : t.completed ? 'opacity-30 bg-black/10' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                    >
                                        <button onClick={() => toggleTaskComplete(t.id)} className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${t.completed ? 'bg-blue-500 border-blue-500' : 'border-white/20 hover:border-blue-400'}`}>
                                            {t.completed && <span className="material-symbols-outlined !text-[9px] font-bold text-white">check</span>}
                                        </button>
                                        <div className="flex-1 flex flex-col min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-[11px] font-bold truncate tracking-tight ${t.completed ? 'line-through' : ''}`}>{t.text}</span>
                                                {t.time && <span className="text-[7px] px-1 rounded-full bg-white/5 border border-white/10 font-bold opacity-60">{t.time}</span>}
                                            </div>
                                        </div>
                                        <div className="material-symbols-outlined !text-[14px] opacity-0 group-hover:opacity-30 transition-opacity">drag_indicator</div>
                                    </div>
                                ))}

                                {draggedTaskId && (
                                    <div 
                                        onDragOver={(e) => { e.preventDefault(); setIsDraggingOverDelete(true); }}
                                        onDragLeave={() => setIsDraggingOverDelete(false)}
                                        className={`mt-1 h-10 rounded-[14px] border-2 border-dashed flex items-center justify-center gap-2 transition-all ${isDraggingOverDelete ? 'bg-red-500/20 border-red-500 scale-105 text-red-500' : 'bg-white/5 border-white/10 text-white/30'}`}
                                    >
                                        <span className="material-symbols-outlined !text-[16px]">delete</span>
                                        <span className="text-[8px] font-black uppercase tracking-widest">Solte</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'calendar' && (
                            <div className="flex flex-col gap-2 animate-[fadeIn_0.3s]">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-1">
                                        <button onClick={() => setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() - 1, 1))} className="p-0.5 hover:bg-white/10 rounded-full"><span className="material-symbols-outlined !text-[16px]">chevron_left</span></button>
                                        <span className="text-[9px] font-black uppercase tracking-[0.1em]">{monthNames[displayDate.getMonth()]}</span>
                                        <button onClick={() => setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 1))} className="p-0.5 hover:bg-white/10 rounded-full"><span className="material-symbols-outlined !text-[16px]">chevron_right</span></button>
                                    </div>
                                    <div className="grid grid-cols-7 gap-0.5 text-center px-0.5">
                                        {weekDays.map(d => <div key={d} className="text-[7px] font-black opacity-20">{d}</div>)}
                                        {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`e-${i}`} />)}
                                        {Array.from({ length: daysInMonth }).map((_, i) => {
                                            const day = i + 1;
                                            const isToday = day === currentDate.getDate() && displayDate.getMonth() === currentDate.getMonth();
                                            const isSel = day === selectedDate.getDate() && displayDate.getMonth() === selectedDate.getMonth();
                                            const hasEv = events[getDateKey(new Date(displayDate.getFullYear(), displayDate.getMonth(), day))]?.length > 0;
                                            return (
                                                <button key={day} onClick={() => { setSelectedDate(new Date(displayDate.getFullYear(), displayDate.getMonth(), day)); uiSounds.click(); }} className={`relative w-7 h-7 rounded-lg text-[9px] flex items-center justify-center transition-all ${isToday ? 'bg-blue-600 text-white font-black shadow z-10' : isSel ? 'bg-white/20 border border-white/20 font-bold' : 'hover:bg-white/5'}`}>
                                                    {day}
                                                    {hasEv && <div className="absolute bottom-0.5 w-0.5 h-0.5 rounded-full bg-blue-400"></div>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="border-t border-white/5 pt-2">
                                        {events[getDateKey(selectedDate)]?.map(e => (
                                            <div key={e.id} className="flex items-center gap-1.5 p-1.5 bg-white/5 rounded-[10px] mb-1 text-[10px] font-bold border border-white/5">
                                                <span className="material-symbols-outlined !text-[12px] text-blue-400">event</span>
                                                <span className="truncate flex-1">{e.title}</span>
                                            </div>
                                        )) || <div className="flex flex-col items-center py-2 opacity-30 italic text-[9px] font-bold">Livre.</div>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={`flex flex-col gap-2 pt-2 border-t ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
                        {activeTab !== 'calendar' && activeTab !== 'notes' && (
                            <div className="flex flex-col gap-2 bg-black/10 p-2.5 rounded-[18px] border border-white/5">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[7px] font-black uppercase opacity-40 ml-0.5">Importância</span>
                                        <div className="flex gap-1.5">
                                            {(['high', 'medium', 'low'] as Priority[]).map(p => (
                                                <button key={p} onClick={() => { setSelectedPriority(p); uiSounds.click(); }} className={`w-7 h-7 rounded-full border transition-all flex items-center justify-center ${selectedPriority === p ? `border-white ${PRIORITY_COLORS[p]} shadow-sm` : 'border-white/10 opacity-30'}`}>
                                                    {selectedPriority === p && <span className="material-symbols-outlined !text-[12px] text-white font-bold">check</span>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col gap-1 flex-1">
                                        <span className="text-[7px] font-black uppercase opacity-40 ml-0.5">Time-Box</span>
                                        <div className="relative group">
                                            <input 
                                                type="time" 
                                                value={selectedTime} 
                                                onChange={(e) => setSelectedTime(e.target.value)} 
                                                className="h-7 w-full bg-white/5 border border-white/15 rounded-full px-2 text-[10px] outline-none text-white focus:border-blue-500 font-bold tabular-nums transition-all appearance-none" 
                                                style={{ colorScheme: 'dark' }}
                                            />
                                            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none !text-[12px]">schedule</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <span className="text-[7px] font-black uppercase opacity-40 ml-0.5">Tema</span>
                                    <div className="relative group">
                                        <select 
                                            value={selectedCategory} 
                                            onChange={(e) => setSelectedCategory(e.target.value)} 
                                            className="h-7 w-full bg-white/5 border border-white/15 rounded-full px-2 text-[10px] outline-none text-white focus:border-blue-500 font-bold appearance-none cursor-pointer"
                                        >
                                            {CATEGORIES.map(c => <option key={c.label} value={c.label} className="bg-[#121212] text-white">{c.emoji} {c.label}</option>)}
                                        </select>
                                        <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none !text-[12px]">unfold_more</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab !== 'notes' && (
                            <form onSubmit={handleQuickAdd} className="flex gap-1.5">
                                <div className="relative flex-1">
                                    <input 
                                        type="text" 
                                        value={inputValue} 
                                        onChange={(e) => setInputValue(e.target.value)} 
                                        placeholder={isListening ? "Gravando..." : activeTab === 'calendar' ? 'Novo Evento' : 'Objetivo...'} 
                                        className={`w-full pl-3 pr-8 py-2 rounded-full text-[11px] font-bold outline-none transition-all ${isDarkMode ? 'bg-black/60 border-white/10 text-white placeholder-white/30' : 'bg-white border-black/5 text-slate-800 placeholder-slate-400'} focus:ring-1 focus:ring-blue-500/50 shadow-sm`} 
                                    />
                                    <button type="button" onClick={startVoiceRecognition} className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-white/40 hover:text-white'}`}><span className="material-symbols-outlined !text-[14px]">mic</span></button>
                                </div>
                                <button type="submit" disabled={!inputValue.trim()} className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-500 transition-all shadow-sm active:scale-95 disabled:opacity-30 flex-shrink-0"><span className="material-symbols-outlined !text-[18px] font-bold">add</span></button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes barSubtleRise { 
                    from { transform: scaleY(0); transform-origin: bottom; opacity: 0; } 
                    to { transform: scaleY(1); opacity: 1; } 
                }
                .glass-scroll::-webkit-scrollbar { width: 2px; }
                .glass-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                
                input[type="time"]::-webkit-calendar-picker-indicator {
                    cursor: pointer;
                    opacity: 0;
                    position: absolute;
                    right: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                }
                
                ::backdrop {
                    backdrop-filter: blur(10px);
                }
                
                select option {
                    padding: 4px;
                    font-size: 11px;
                }
            `}</style>
        </GlassCard>
    </div>
  );
};
