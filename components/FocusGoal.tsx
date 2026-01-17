
import React, { useState, useRef, useEffect } from 'react';
import { storage, STORAGE_KEYS } from '../services/storageService';
import { uiSounds } from '../services/soundService';

interface FocusGoalProps {
  goal: string;
  setGoal: (goal: string) => void;
  isDarkMode: boolean;
  onExit: () => void;
}

interface SubTask {
  id: string;
  text: string;
  completed: boolean;
}

export const FocusGoal: React.FC<FocusGoalProps> = ({ goal, setGoal, isDarkMode, onExit }) => {
  const [isEditing, setIsEditing] = useState(!goal);
  const [isCompleted, setIsCompleted] = useState(false);
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  
  // TIMER STATE
  const [timeLeft, setTimeLeft] = useState(25 * 60); 
  const [isRunning, setIsRunning] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [baseMinutes, setBaseMinutes] = useState(25);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load Persisted Data
  useEffect(() => {
    const loadData = async () => {
        const savedSubtasks = await storage.get<SubTask[]>(STORAGE_KEYS.FOCUS_SUBTASKS);
        if (savedSubtasks) setSubtasks(savedSubtasks);
        
        const savedTime = await storage.get<number>('lumina_focus_time_left');
        const savedBase = await storage.get<number>('lumina_focus_base_mins');
        
        if (savedBase !== null) setBaseMinutes(savedBase);
        if (savedTime !== null) setTimeLeft(savedTime);
        else if (savedBase !== null) setTimeLeft(savedBase * 60);
    };
    loadData();
  }, []);

  // Save State
  useEffect(() => { storage.set(STORAGE_KEYS.FOCUS_SUBTASKS, subtasks); }, [subtasks]);
  useEffect(() => { 
    storage.set('lumina_focus_time_left', timeLeft);
    storage.set('lumina_focus_base_mins', baseMinutes);
  }, [timeLeft, baseMinutes]);

  // ESCUTAR COMANDOS DA ILHA DINÂMICA
  useEffect(() => {
    const handleCommand = (e: any) => {
        if (e.detail.type === 'timer-toggle') {
            setIsRunning(prev => !prev);
            uiSounds.click();
        }
        if (e.detail.type === 'timer-stop') {
            resetTimer();
        }
        if (e.detail.type === 'timer-adjust') {
            adjustTime(e.detail.payload);
        }
        if (e.detail.type === 'timer-set') {
            setPreset(e.detail.payload);
        }
    };
    window.addEventListener('lumina-command' as any, handleCommand);
    return () => window.removeEventListener('lumina-command' as any, handleCommand);
  }, []);

  // MOTOR DO TIMER (FIXED)
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            uiSounds.success();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning]);

  // SINCRONIZAÇÃO COM A ILHA DINÂMICA (Master -> Slave)
  useEffect(() => {
    const totalTime = baseMinutes * 60;
    window.dispatchEvent(new CustomEvent('lumina-update', {
        detail: { type: 'focus-update', payload: { timeLeft, isRunning, mode: 'focus', totalTime } }
    }));
  }, [timeLeft, isRunning, baseMinutes]);

  const toggleTimer = () => {
    if (!isRunning) uiSounds.toggleOn(); else uiSounds.toggleOff();
    setIsRunning(!isRunning);
    setIsEditingTime(false);
  };

  const resetTimer = () => {
    uiSounds.click();
    setIsRunning(false);
    setTimeLeft(baseMinutes * 60);
  };

  const setPreset = (mins: number) => {
      uiSounds.click();
      setIsRunning(false);
      setBaseMinutes(mins);
      setTimeLeft(mins * 60);
  };

  const adjustTime = (mins: number) => {
      uiSounds.click();
      const secondsToAdd = mins * 60;
      let newTime = timeLeft + secondsToAdd;
      if (newTime < 0) newTime = 0;
      
      setTimeLeft(newTime);
      if (!isRunning) {
          setBaseMinutes(Math.ceil(newTime / 60));
      }
  };

  const handleApplyTimeInput = (val: string) => {
    const mins = parseInt(val);
    if (!isNaN(mins) && mins > 0) {
        const cappedMins = Math.min(999, mins);
        setBaseMinutes(cappedMins);
        setTimeLeft(cappedMins * 60);
    }
    setIsEditingTime(false);
    uiSounds.success();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleSubtask = (id: string) => {
    uiSounds.click();
    setSubtasks(subtasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const progress = subtasks.length === 0 ? (isCompleted ? 100 : 0) : Math.round((subtasks.filter(t => t.completed).length / subtasks.length) * 100);

  const textColor = isDarkMode ? 'text-white' : 'text-slate-800';
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const totalSeconds = baseMinutes * 60;
  const strokeDashoffset = totalSeconds > 0 ? circumference - (timeLeft / totalSeconds) * circumference : circumference;

  if (isEditing) {
    return (
      <div className="w-full flex flex-col items-center animate-[fadeIn_0.5s_ease-out] pt-12">
        <form onSubmit={(e) => { e.preventDefault(); if(goal.trim()) setIsEditing(false); }} className="w-full max-w-2xl mx-auto">
            <div className="flex flex-col items-center gap-8">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
                    <span className="material-symbols-outlined !text-[32px] text-blue-400">target</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <label className={`text-lg font-medium opacity-40 uppercase tracking-[0.2em] ${textColor}`}>Seu foco atual</label>
                    <input
                        type="text"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        className={`w-full bg-transparent text-center text-4xl md:text-6xl font-black outline-none border-b-2 border-white/5 pb-6 transition-all focus:border-blue-500/50 ${textColor}`}
                        placeholder="O que vamos fazer?"
                        autoFocus
                    />
                </div>
                <button type="submit" disabled={!goal.trim()} className="mt-4 px-14 py-4 rounded-full text-xs font-black uppercase tracking-[0.4em] bg-white text-black hover:bg-blue-400 hover:text-white transition-all transform hover:scale-105 active:scale-95 disabled:opacity-0 shadow-2xl">Iniciar Sessão</button>
            </div>
        </form>
        <button onClick={onExit} className="mt-16 opacity-30 hover:opacity-100 transition-opacity text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"><span className="material-symbols-outlined !text-[14px]">close</span> Sair</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto animate-[fadeIn_0.8s_ease-out] relative">
      <style>{`
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
      `}</style>
      
      {/* TIMER HERO */}
      <div className="relative w-80 h-80 mb-16 flex items-center justify-center group/timer scale-110">
          <svg className="w-full h-full -rotate-90 filter drop-shadow-[0_0_20px_rgba(37,99,235,0.3)]" viewBox="0 0 320 320">
            <defs>
                <linearGradient id="focus-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
            </defs>
            {/* Track */}
            <circle cx="160" cy="160" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="transparent" />
            {/* Progress */}
            <circle 
              cx="160" cy="160" r={radius} stroke="url(#focus-gradient)" strokeWidth="8" fill="transparent" 
              strokeDasharray={circumference} 
              strokeDashoffset={strokeDashoffset} 
              strokeLinecap="round" 
              className={`transition-all duration-[1000ms] ease-linear ${isRunning ? 'animate-pulse' : ''}`} 
            />
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {isEditingTime ? (
               <div className="flex flex-col items-center animate-[scaleIn_0.2s_ease-out] w-full">
                  <input 
                    type="number" 
                    defaultValue={baseMinutes} 
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyTimeInput((e.target as HTMLInputElement).value)}
                    onBlur={(e) => handleApplyTimeInput(e.target.value)}
                    className="w-full bg-transparent text-[5.5rem] leading-none font-black text-center outline-none text-blue-400 placeholder-white/10 caret-blue-400"
                    autoFocus
                    min="1"
                    max="999"
                  />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mt-2 text-white">Minutos</span>
               </div>
            ) : (
              <div 
                className="cursor-pointer group/time flex flex-col items-center transition-transform hover:scale-105 active:scale-95" 
                onClick={() => { setIsEditingTime(true); setIsRunning(false); uiSounds.click(); }}
              >
                <span className={`text-[5.5rem] leading-none font-black tabular-nums tracking-tighter ${textColor} ${isRunning ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300' : ''}`}>
                    {formatTime(timeLeft)}
                </span>
                <div className="flex items-center gap-2 mt-2 opacity-0 group-hover/time:opacity-100 transition-all absolute -bottom-8">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400">Editar</span>
                </div>
              </div>
            )}

            <div className={`flex items-center gap-6 absolute -bottom-16 transition-all duration-300 ${isEditingTime ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <button onClick={() => adjustTime(-5)} className="w-10 h-10 rounded-full bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all border border-white/5 flex items-center justify-center text-[10px] font-bold active:scale-90">-5</button>
                <button 
                    onClick={toggleTimer} 
                    className={`
                        w-16 h-16 rounded-full flex items-center justify-center transition-all transform hover:scale-110 active:scale-90 shadow-2xl 
                        ${isRunning 
                            ? 'bg-white/5 text-white border border-white/20' 
                            : 'bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.3)]'
                        }
                    `}
                >
                    <span className="material-symbols-outlined !text-[36px]">{isRunning ? 'pause' : 'play_arrow'}</span>
                </button>
                <button onClick={() => adjustTime(5)} className="w-10 h-10 rounded-full bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all border border-white/5 flex items-center justify-center text-[10px] font-bold active:scale-90">+5</button>
            </div>
          </div>
      </div>

      <div className="text-center space-y-6 mb-16 w-full px-6 pt-10">
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10">
            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">{isRunning ? 'Foco Ativo' : 'Sessão Pausada'}</span>
        </div>
        <h2 className={`text-5xl md:text-7xl font-black tracking-tighter ${textColor} ${isCompleted ? 'opacity-20 line-through' : ''} leading-tight`}>
          {goal}
        </h2>
        
        <div className="flex flex-col items-center gap-3">
           <div className="h-1.5 w-64 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
              <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-[1000ms] ease-out shadow-[0_0_15px_rgba(59,130,246,0.5)]" style={{ width: `${progress}%` }} />
           </div>
           <div className="flex items-center gap-4">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">{progress}% Concluído</span>
                <div className="w-1 h-1 rounded-full bg-white/10" />
                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">{subtasks.length} Tarefas</span>
           </div>
        </div>
      </div>

      <div className="w-full max-w-xl space-y-4 mb-24 px-6">
          {subtasks.map(t => (
            <div key={t.id} className={`flex items-center gap-5 p-5 rounded-[32px] border transition-all duration-500 ${t.completed ? 'bg-black/40 border-transparent opacity-40 translate-y-1' : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07] hover:border-white/20'}`}>
                <button onClick={() => toggleSubtask(t.id)} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${t.completed ? 'bg-blue-500 border-blue-500 scale-110 shadow-lg shadow-blue-500/30' : 'border-white/20 hover:border-blue-400'}`}>
                    {t.completed && <span className="material-symbols-outlined !text-[18px] text-white font-bold">check</span>}
                </button>
                <span className={`text-xl font-bold flex-1 ${t.completed ? 'line-through' : textColor}`}>{t.text}</span>
                <button onClick={() => setSubtasks(subtasks.filter(st => st.id !== t.id))} className="p-2 text-white/20 hover:text-red-400 transition-all">
                    <span className="material-symbols-outlined !text-[18px]">delete</span>
                </button>
            </div>
          ))}
          
          <form onSubmit={(e) => { e.preventDefault(); if(newSubtask.trim()){ setSubtasks([...subtasks, {id: Date.now().toString(), text: newSubtask, completed: false}]); setNewSubtask(''); uiSounds.success(); } }} className="relative group">
              <input 
                type="text" 
                placeholder="Próxima etapa..." 
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                className="w-full bg-white/[0.02] border-2 border-dashed border-white/10 rounded-[32px] p-5 pl-14 outline-none focus:border-blue-500/30 focus:bg-white/5 transition-all text-white font-bold text-lg"
              />
              <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500 transition-colors">add_circle</span>
          </form>
      </div>

      <div className="fixed bottom-12 flex gap-4 animate-[fadeInUp_1s_ease-out]">
          <button onClick={resetTimer} className="px-8 py-3 rounded-full bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="material-symbols-outlined !text-[16px]">replay</span> Reiniciar
          </button>
          <button onClick={onExit} className="px-10 py-3 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-red-500/10">Finalizar Sessão</button>
      </div>
    </div>
  );
};
