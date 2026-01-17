
import React, { useState, useEffect } from 'react';
import { GlassCard } from './GlassCard';
import { storage, STORAGE_KEYS } from '../services/storageService';

interface PomodoroWidgetProps {
  isDarkMode: boolean;
  focusMode?: boolean;
}

interface TimerState {
    targetTime: number | null; // Unix Timestamp of completion
    isRunning: boolean;
    mode: 'focus' | 'break';
    baseDuration: number; // Duration in seconds (25*60 or 5*60)
    lastUpdated: number;
}

export const PomodoroCard: React.FC<PomodoroWidgetProps> = ({ isDarkMode, focusMode = false }) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [expanded, setExpanded] = useState(false);

  // Auto-collapse
  useEffect(() => {
    setExpanded(false);
  }, [focusMode]);

  // --- PERSISTENCE ENGINE ---
  useEffect(() => {
      const loadState = async () => {
          const saved = await storage.get<TimerState>(STORAGE_KEYS.TIMER_STATE);
          if (saved) {
              setMode(saved.mode);
              if (saved.isRunning && saved.targetTime) {
                  const now = Date.now();
                  const remaining = Math.ceil((saved.targetTime - now) / 1000);
                  
                  if (remaining > 0) {
                      setTimeLeft(remaining);
                      setIsRunning(true);
                  } else {
                      // Timer finished while closed
                      setTimeLeft(0);
                      setIsRunning(false);
                      // Reset state
                      saveState({ ...saved, isRunning: false, targetTime: null });
                  }
              } else {
                  setIsRunning(false);
                  if (saved.baseDuration) setTimeLeft(saved.baseDuration);
                  else setTimeLeft(saved.mode === 'focus' ? 25 * 60 : 5 * 60);
              }
          }
      };
      loadState();
  }, []);

  const saveState = (state: TimerState) => {
      storage.set(STORAGE_KEYS.TIMER_STATE, state);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- TAB TITLE SYNC ---
  useEffect(() => {
      if (isRunning) {
          document.title = `${formatTime(timeLeft)} - ${mode === 'focus' ? 'Foco' : 'Pausa'}`;
      } else {
          document.title = 'Lumina';
      }
      
      return () => {
          // Cleanup only if component unmounts (unlikely) or running stops
          if (!isRunning) document.title = 'Lumina';
      };
  }, [timeLeft, isRunning, mode]);

  // --- LISTEN FOR ISLAND COMMANDS ---
  useEffect(() => {
      const handleCommand = (e: CustomEvent) => {
          const { type, payload } = e.detail;
          if (type === 'timer-toggle') toggleTimer();
          if (type === 'timer-stop') resetTimer();
          if (type === 'timer-adjust') handleAdjustTime(payload);
          if (type === 'timer-set') handleSetTime(payload);
      };
      window.addEventListener('lumina-command' as any, handleCommand as any);
      return () => window.removeEventListener('lumina-command' as any, handleCommand as any);
  }, [isRunning, mode, timeLeft]);

  // --- SYNC WITH ISLAND ---
  useEffect(() => {
    const totalTime = mode === 'focus' ? 25 * 60 : 5 * 60;
    const event = new CustomEvent('lumina-update', {
        detail: {
            type: 'focus-update',
            payload: { timeLeft, isRunning, mode, totalTime: totalTime }
        }
    });
    window.dispatchEvent(event);
  }, [timeLeft, isRunning, mode]);

  // --- TICKER ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
            const next = prev - 1;
            return next;
        });
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      // Completed
      setIsRunning(false);
      saveState({ targetTime: null, isRunning: false, mode, baseDuration: mode === 'focus' ? 25*60 : 5*60, lastUpdated: Date.now() });
      
      window.dispatchEvent(new CustomEvent('lumina-update', {
          detail: { type: 'reminder-alert', payload: { text: mode === 'focus' ? 'Foco Concluído!' : 'Pausa Concluída!' } }
      }));
      setExpanded(true);
      
      // Play sound
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
      
      // Reset Title
      document.title = 'Lumina - Concluído!';
      setTimeout(() => document.title = 'Lumina', 5000);
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, mode]);

  const toggleTimer = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    if (isRunning) {
        // PAUSE
        setIsRunning(false);
        saveState({ targetTime: null, isRunning: false, mode, baseDuration: timeLeft, lastUpdated: Date.now() });
    } else {
        // PLAY
        setIsRunning(true);
        // Calculate target based on current timeLeft
        const target = Date.now() + (timeLeft * 1000);
        saveState({ targetTime: target, isRunning: true, mode, baseDuration: timeLeft, lastUpdated: Date.now() });
    }
  };

  const resetTimer = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const duration = mode === 'focus' ? 25 * 60 : 5 * 60;
    setIsRunning(false);
    setTimeLeft(duration);
    saveState({ targetTime: null, isRunning: false, mode, baseDuration: duration, lastUpdated: Date.now() });
    document.title = 'Lumina';
  };

  const handleAdjustTime = (minutes: number) => {
      const secondsToAdd = minutes * 60;
      let newTime = timeLeft + secondsToAdd;
      if (newTime < 0) newTime = 0;
      if (newTime > 120 * 60) newTime = 120 * 60;
      
      setTimeLeft(newTime);
      // If running, update target time immediately to prevent jump
      if (isRunning) {
          const target = Date.now() + (newTime * 1000);
          saveState({ targetTime: target, isRunning: true, mode, baseDuration: newTime, lastUpdated: Date.now() });
      }
  };

  const handleSetTime = (minutes: number) => {
      const duration = minutes * 60;
      setIsRunning(false);
      setTimeLeft(duration);
      saveState({ targetTime: null, isRunning: false, mode, baseDuration: duration, lastUpdated: Date.now() });
  };

  const switchMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMode = mode === 'focus' ? 'break' : 'focus';
    const duration = newMode === 'focus' ? 25 * 60 : 5 * 60;
    
    setMode(newMode);
    setTimeLeft(duration);
    setIsRunning(false);
    saveState({ targetTime: null, isRunning: false, mode: newMode, baseDuration: duration, lastUpdated: Date.now() });
    document.title = 'Lumina';
  };

  const textPrimary = isDarkMode ? 'text-white' : 'text-slate-800';
  const textSecondary = isDarkMode ? 'text-white/70' : 'text-slate-500';
  const btnBg = isDarkMode 
    ? "bg-white/25 border border-white/50 hover:bg-white/35 hover:border-white/70 text-white shadow-sm" 
    : "bg-white border border-black/20 hover:bg-slate-50 hover:border-black/30 text-slate-800 shadow-sm";

  const totalTime = mode === 'focus' ? 25 * 60 : 5 * 60;
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = totalTime > 0 ? circumference - (timeLeft / totalTime) * circumference : circumference;
  const ringColor = mode === 'focus' ? (isDarkMode ? 'text-red-400' : 'text-red-500') : (isDarkMode ? 'text-green-400' : 'text-green-500');

  return (
    <div className="flex flex-col items-start gap-2 animate-[fadeIn_1s_ease-out] pointer-events-auto">
       <GlassCard 
            isDarkMode={isDarkMode}
            interactive
            className={`
                !p-0 cursor-pointer flex flex-col justify-start rounded-[24px]
                ${expanded ? 'w-[340px] h-auto' : 'w-[200px] h-[64px]'}
            `}
        >
           <div 
                className={`flex items-center justify-between px-5 w-full transition-all duration-300 ${expanded ? 'py-5' : 'h-[64px]'}`}
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-4">
                    <div className={`flex-shrink-0 ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                         <span className="material-symbols-outlined !text-[24px]">timer</span>
                    </div>

                    <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-2">
                            <span className={`text-lg font-medium leading-none tabular-nums ${textPrimary}`}>
                                {formatTime(timeLeft)}
                            </span>
                        </div>
                        <span className={`text-[10px] mt-1 whitespace-nowrap block ${textSecondary}`}>
                            {mode === 'focus' ? 'Modo Foco' : 'Pausa'}
                        </span>
                    </div>
                </div>

                <div className={`ml-auto transition-transform duration-500 ${expanded ? 'rotate-180' : 'rotate-0'} ${textSecondary}`}>
                     <span className="material-symbols-outlined !text-[20px]">expand_more</span>
                </div>
           </div>

           <div className={`
                transition-all duration-[500ms] ease-[cubic-bezier(0.25,0.8,0.25,1)] overflow-hidden border-t
                ${isDarkMode ? 'border-white/20' : 'border-black/10'}
                ${expanded ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0 border-t-0'}
            `}>
                <div className="px-6 pb-6 pt-4 flex flex-col items-center gap-5">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90 transform">
                            <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="3" fill="transparent" className={`${isDarkMode ? 'text-white/10' : 'text-slate-200'}`} />
                            <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="3" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className={`transition-all duration-1000 ease-linear ${ringColor}`} />
                        </svg>
                        {isRunning ? (
                             <div className={`absolute inset-0 flex items-center justify-center ${ringColor} animate-pulse`}>
                                 <span className="material-symbols-outlined !text-[32px]">hourglass_top</span>
                             </div>
                        ) : (
                             <div className={`absolute inset-0 flex items-center justify-center ${textSecondary}`}>
                                <span className="material-symbols-outlined !text-[32px] ml-1">play_arrow</span>
                             </div>
                        )}
                    </div>

                    <div className="flex gap-3 w-full justify-center">
                        <button onClick={toggleTimer} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors ${btnBg}`}>
                            {isRunning ? 'Pausar' : 'Iniciar'}
                        </button>
                        <button onClick={resetTimer} className={`px-4 rounded-xl transition-colors ${btnBg} flex items-center justify-center`} title="Reiniciar">
                             <span className="material-symbols-outlined !text-[20px]">restart_alt</span>
                        </button>
                    </div>

                    <button onClick={switchMode} className={`text-[10px] uppercase font-bold tracking-widest hover:underline ${textSecondary}`}>
                        Alternar para {mode === 'focus' ? 'Pausa' : 'Foco'}
                    </button>
                </div>
            </div>
       </GlassCard>
    </div>
  );
};
