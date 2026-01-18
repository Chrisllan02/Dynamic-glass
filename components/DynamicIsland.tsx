
import React, { useState, useEffect, useRef } from 'react';
import { IslandConfig, IslandState, ChatMessage, CalendarEvent } from '../types';
import { uiSounds } from '../services/soundService';
import { useMusicPlayer } from '../hooks/useMusicPlayer';
import { useIslandTools } from '../hooks/useIslandTools';
import { getChatResponse } from '../services/geminiService';
import { storage, STORAGE_KEYS } from '../services/storageService';

interface DynamicIslandProps {
    islandConfig?: IslandConfig;
    isDarkMode?: boolean;
    isHidden?: boolean;
}

const Waveform: React.FC<{ isActive: boolean, color?: string }> = ({ isActive, color = '#fff' }) => (
    <div className="flex items-center gap-[3px] h-3.5 justify-center">
        <div className={`w-[3px] rounded-full bg-current transition-all duration-300 ${isActive ? 'animate-wave-1' : 'h-[3px]'}`} style={{ color, animationPlayState: isActive ? 'running' : 'paused' }} />
        <div className={`w-[3px] rounded-full bg-current transition-all duration-300 ${isActive ? 'animate-wave-2' : 'h-[3px]'}`} style={{ color, animationPlayState: isActive ? 'running' : 'paused' }} />
        <div className={`w-[3px] rounded-full bg-current transition-all duration-300 ${isActive ? 'animate-wave-3' : 'h-[3px]'}`} style={{ color, animationPlayState: isActive ? 'running' : 'paused' }} />
        <div className={`w-[3px] rounded-full bg-current transition-all duration-300 ${isActive ? 'animate-wave-4' : 'h-[3px]'}`} style={{ color, animationPlayState: isActive ? 'running' : 'paused' }} />
        <div className={`w-[3px] rounded-full bg-current transition-all duration-300 ${isActive ? 'animate-wave-5' : 'h-[3px]'}`} style={{ color, animationPlayState: isActive ? 'running' : 'paused' }} />
    </div>
);

const AiLiquidIcon: React.FC<{ scale?: number }> = ({ scale = 1 }) => (
  <div className="ai-loader" style={{ '--size': scale } as any}>
    <div className="box"></div>
    <svg width="100" height="100">
      <defs>
        <mask id="clipping-ai">
          <polygon points="50,50 75,25 100,50 75,75" /><polygon points="50,50 25,25 0,50 25,75" /><polygon points="50,50 75,75 50,100 25,75" /><polygon points="50,50 25,25 50,0 75,25" /><polygon points="50,50 65,35 85,35 75,55" /><polygon points="50,50 35,65 35,85 55,75" /><polygon points="50,50 35,35 15,35 25,55" />
        </mask>
      </defs>
    </svg>
  </div>
);

export const DynamicIsland: React.FC<DynamicIslandProps> = ({ isDarkMode = true, isHidden = false, islandConfig }) => {
  const [state, setState] = useState<IslandState>('idle');
  const [contentVisible, setContentVisible] = useState(true);
  const [isMusicSessionActive, setIsMusicSessionActive] = useState(false); 
  const [outputCopied, setOutputCopied] = useState(false); 
  const [hasApiKey, setHasApiKey] = useState(false);
  const islandRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const lastActiveApp = useRef<IslandState>('menu');
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isThinkingMode, setIsThinkingMode] = useState(false); // Toggle for Deep Research
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Timer Edit State
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [inputTime, setInputTime] = useState('');

  // Camera State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // Calendar State
  const [calendarEvents, setCalendarEvents] = useState<Record<string, CalendarEvent[]>>({});
  const [newEventInput, setNewEventInput] = useState('');
  const [displayDate, setDisplayDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Calculator State
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcHistory, setCalcHistory] = useState('');

  // Custom Hooks
  const { 
      audioRef, playerState, currentTrack, 
      toggleMusic, nextTrack, prevTrack, 
      handleTimeUpdate, handleLoadedMetadata, onTrackEnded,
      seek, changeVolume, toggleShuffle
  } = useMusicPlayer();

  const {
      translateData, setTranslateData, handleTranslate, toggleListening, swapLanguages, setLanguage, speakText, LANGUAGES
  } = useIslandTools();

  // Focus Timer State
  const [focusData, setFocusData] = useState({ timeLeft: 25 * 60, isRunning: false, totalTime: 25 * 60 });

  // Listen for Focus updates
  useEffect(() => {
      const handleFocusUpdate = (e: CustomEvent) => {
          const { timeLeft, isRunning, totalTime } = e.detail.payload;
          setFocusData({ 
              timeLeft, 
              isRunning, 
              totalTime: totalTime || (timeLeft > 25*60 ? timeLeft : 25*60)
          });
      };
      window.addEventListener('lumina-update' as any, handleFocusUpdate as any);
      return () => window.removeEventListener('lumina-update' as any, handleFocusUpdate as any);
  }, []);

  // Listen for AI Search Trigger (from SearchBar)
  useEffect(() => {
      const handleAiSearch = (e: CustomEvent) => {
          const query = e.detail.query;
          handleStateChange('ask-ai');
          if (query) {
              setChatInput(query);
              setTimeout(() => handleChatSend(undefined, query), 500); // Small delay to allow UI transition
          }
      };
      window.addEventListener('lumina-ai-search' as any, handleAiSearch as any);
      return () => window.removeEventListener('lumina-ai-search' as any, handleAiSearch as any);
  }, []);

  // Initialize: Load last state
  useEffect(() => {
      const loadState = async () => {
          const savedState = await storage.get<IslandState>(STORAGE_KEYS.LAST_ISLAND_APP);
          if (savedState && savedState !== 'idle') {
              lastActiveApp.current = savedState;
          }
      };
      loadState();
  }, []);

  // Listen for API Key updates
  useEffect(() => {
      const checkApiKey = async () => {
          if (window.aistudio) {
              const hasKey = await window.aistudio.hasSelectedApiKey();
              setHasApiKey(hasKey);
          }
      };
      checkApiKey();
      
      const handleKeyUpdate = () => checkApiKey();
      window.addEventListener('lumina-apikey-changed', handleKeyUpdate);
      return () => window.removeEventListener('lumina-apikey-changed', handleKeyUpdate);
  }, []);

  // Sync Sphere with Playing State
  useEffect(() => {
      if (playerState.isPlaying) {
          setIsMusicSessionActive(true);
      }
  }, [playerState.isPlaying]);

  // Chat Auto Scroll
  useEffect(() => {
      if (state === 'ask-ai') {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
  }, [chatMessages, state]);

  // Camera Lifecycle
  useEffect(() => {
    if (state === 'camera') {
        startCamera();
    } else {
        stopCamera();
    }
  }, [state]);

  // Ensure video element gets stream when it renders
  useEffect(() => {
      if (state === 'camera' && videoRef.current && cameraStream) {
          videoRef.current.srcObject = cameraStream;
      }
  }, [state, cameraStream]);

  // CALENDAR DATA LOADING
  useEffect(() => {
      if (state === 'calendar' || state === 'idle') {
          loadCalendarEvents();
      }
  }, [state]);

  const getDateKey = (date: Date) => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const loadCalendarEvents = async () => {
      const allEvents = await storage.get<Record<string, CalendarEvent[]>>(STORAGE_KEYS.CALENDAR_EVENTS) || {};
      setCalendarEvents(allEvents);
  };

  const handleAddEvent = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newEventInput.trim()) return;
      
      uiSounds.click();
      const key = getDateKey(selectedDate);
      
      const newEvent: CalendarEvent = {
          id: Date.now().toString(),
          title: newEventInput,
          date: key,
          completed: false
      };

      const updatedDay = [...(calendarEvents[key] || []), newEvent];
      const updatedAll = { ...calendarEvents, [key]: updatedDay };
      
      await storage.set(STORAGE_KEYS.CALENDAR_EVENTS, updatedAll);
      setCalendarEvents(updatedAll);
      setNewEventInput('');
      uiSounds.success();
  };

  const toggleEventComplete = async (id: string) => {
      uiSounds.click();
      const key = getDateKey(selectedDate);
      const eventsForDay = calendarEvents[key] || [];
      
      const updatedDay = eventsForDay.map(ev => 
          ev.id === id ? { ...ev, completed: !ev.completed } : ev
      );
      
      const updatedAll = { ...calendarEvents, [key]: updatedDay };
      await storage.set(STORAGE_KEYS.CALENDAR_EVENTS, updatedAll);
      setCalendarEvents(updatedAll);
  };

  // --- CALCULATOR LOGIC ---
  const handleCalcInput = (val: string) => {
      uiSounds.click();
      if (val === 'AC') {
          setCalcDisplay('0');
          setCalcHistory('');
      } else if (val === 'DEL') {
          setCalcDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
      } else if (val === '=') {
          try {
              // Safety clean before eval
              const cleanExp = calcDisplay.replace(/[^0-9+\-*/().]/g, '');
              // eslint-disable-next-line no-new-func
              const res = new Function('return ' + cleanExp)();
              setCalcHistory(calcDisplay + ' =');
              setCalcDisplay(String(res));
              uiSounds.success();
          } catch (e) {
              setCalcDisplay('Erro');
              uiSounds.error();
          }
      } else {
          // Prevent multiple operators
          const lastChar = calcDisplay.slice(-1);
          const isOp = ['+', '-', '*', '/'].includes(val);
          const lastIsOp = ['+', '-', '*', '/'].includes(lastChar);
          
          if (isOp && lastIsOp) {
              setCalcDisplay(prev => prev.slice(0, -1) + val);
          } else {
              setCalcDisplay(prev => prev === '0' && !isOp ? val : prev + val);
          }
      }
  };

  const handleStateChange = (newState: IslandState) => {
      // Remember non-idle, non-menu states
      if (newState !== 'idle' && newState !== 'menu') {
          lastActiveApp.current = newState;
          storage.set(STORAGE_KEYS.LAST_ISLAND_APP, newState);
      }

      if ((state === 'idle' && newState === 'menu') || (state === 'menu' && newState === 'idle')) {
          setState(newState);
          setContentVisible(true);
      } else {
          setContentVisible(false);
          setTimeout(() => {
              setState(newState);
              setContentVisible(true);
          }, 150); 
      }
  };

  const closeMusicSession = (e: React.MouseEvent) => {
      e.stopPropagation();
      uiSounds.click();
      setIsMusicSessionActive(false); 
      if (playerState.isPlaying) toggleMusic();
  };

  const showSphere = isMusicSessionActive && state !== 'music';
  const showFocusSphere = focusData.isRunning && state !== 'focus-timer';

  const handleMouseEnter = () => {
      if (closeTimerRef.current) {
          clearTimeout(closeTimerRef.current);
          closeTimerRef.current = null;
      }

      if (state === 'idle') {
          uiSounds.hover();
          // Restore last activity or go to menu
          setState(lastActiveApp.current);
          setContentVisible(true);
      }
  };

  const handleMouseLeave = () => {
      // PERSISTENT STATES: Do not auto-close if in camera or calculator mode
      if (state === 'camera' || state === 'calculator') return;

      closeTimerRef.current = setTimeout(() => {
          if (state !== 'idle') {
              handleStateChange('idle');
          }
      }, 450); 
  };

  const handleChatSend = async (e?: React.FormEvent, overrideInput?: string) => {
      e?.preventDefault();
      const input = overrideInput || chatInput;
      if (!input.trim() || isChatLoading) return;
      uiSounds.click();

      const userMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'user',
          text: input,
          timestamp: Date.now()
      };

      setChatMessages(prev => [...prev, userMsg]);
      setChatInput('');
      setIsChatLoading(true);

      try {
          const history = chatMessages.map(m => ({ role: m.role, text: m.text }));
          const response = await getChatResponse(
              userMsg.text, 
              history, 
              "Você é o assistente da Ilha Dinâmica. Responda de forma extremamente concisa, direta e útil. Use emojis. Se estiver no modo de pesquisa, priorize fontes recentes.",
              isThinkingMode ? 'think' : 'search'
          );
          setChatMessages(prev => [...prev, { 
              id: Date.now().toString(), 
              role: 'model', 
              text: response.text, 
              timestamp: Date.now(),
              sources: response.sources 
          }]);
          uiSounds.success();
      } catch (err) {
          setChatMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Erro ao conectar.", timestamp: Date.now() }]);
          uiSounds.error();
      } finally {
          setIsChatLoading(false);
      }
  };

  // Timer Controls
  const toggleTimer = (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      uiSounds.click();
      window.dispatchEvent(new CustomEvent('lumina-command', { detail: { type: 'timer-toggle' } }));
  };

  const resetTimer = () => {
      uiSounds.click();
      window.dispatchEvent(new CustomEvent('lumina-command', { detail: { type: 'timer-stop' } }));
  };

  const adjustTimer = (minutes: number) => {
      uiSounds.click();
      window.dispatchEvent(new CustomEvent('lumina-command', { detail: { type: 'timer-adjust', payload: minutes } }));
  };

  const startEditingTime = () => {
      uiSounds.click();
      setIsEditingTime(true);
      // Guess minutes from current seconds
      setInputTime(Math.ceil(focusData.timeLeft / 60).toString());
  };

  const submitTime = () => {
      const mins = parseInt(inputTime);
      if (!isNaN(mins) && mins > 0) {
          window.dispatchEvent(new CustomEvent('lumina-command', { detail: { type: 'timer-set', payload: mins } }));
          uiSounds.success();
      }
      setIsEditingTime(false);
  };

  // Camera Controls
  const startCamera = async () => {
      setCameraError('');

      try {
          // Tentativa 1: Vídeo + Áudio
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
              setCameraStream(stream);
              setIsMicMuted(false);
              setIsVideoOff(false);
          } catch (initialErr) {
              // Tentativa 2: Apenas Vídeo (Fallback se mic for negado/inexistente)
              console.warn("Tentando fallback apenas para vídeo:", initialErr);
              const stream = await navigator.mediaDevices.getUserMedia({ video: true });
              setCameraStream(stream);
              setIsMicMuted(true); // Forçar mudo visualmente
              setIsVideoOff(false);
          }
      } catch (err: any) {
          console.error("Camera access error:", err);
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
              setCameraError('Permissão negada. Verifique se o acesso à câmera está permitido no navegador.');
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
              setCameraError('Nenhuma câmera encontrada.');
          } else {
              setCameraError('Erro ao acessar a câmera: ' + (err.message || 'Desconhecido'));
          }
          uiSounds.error();
      }
  };

  const stopCamera = () => {
      if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
          setCameraStream(null);
      }
  };

  const toggleMic = () => {
      if (cameraStream) {
          const audioTrack = cameraStream.getAudioTracks()[0];
          if (audioTrack) {
              audioTrack.enabled = !audioTrack.enabled;
              setIsMicMuted(!audioTrack.enabled);
              uiSounds.click();
          }
      }
  };

  const toggleCam = () => {
      if (cameraStream) {
          const videoTrack = cameraStream.getVideoTracks()[0];
          if (videoTrack) {
              videoTrack.enabled = !videoTrack.enabled;
              setIsVideoOff(!videoTrack.enabled);
              uiSounds.click();
          }
      }
  };

  const togglePiP = async () => {
      uiSounds.click();
      if (videoRef.current) {
          if (document.pictureInPictureElement) {
              await document.exitPictureInPicture();
          } else {
              await videoRef.current.requestPictureInPicture();
          }
      }
  };

  const handleClipboardPaste = async () => {
      if (textAreaRef.current) textAreaRef.current.focus();
      try {
          const text = await navigator.clipboard.readText();
          if (text) {
              setTranslateData(d => ({ ...d, input: text }));
              uiSounds.click();
              handleTranslate(text);
          }
      } catch (e) {
          uiSounds.error();
          setTranslateData(d => ({ ...d, output: "Use Ctrl+V para colar." }));
      }
  };

  const handleCopyOutput = () => {
      if (translateData.output) {
          navigator.clipboard.writeText(translateData.output);
          uiSounds.success();
          setOutputCopied(true);
          setTimeout(() => setOutputCopied(false), 2000);
      }
  };

  const handleManualTranslate = () => {
      uiSounds.click();
      handleTranslate();
  };

  const clearTranslation = () => {
      uiSounds.click();
      setTranslateData(d => ({ ...d, input: '', output: '' }));
  };

  const getDimensions = () => {
      switch(state) {
          case 'idle': 
              return (playerState.isPlaying || focusData.isRunning) 
                  ? { w: 240, h: 48, r: 24 } 
                  : { w: 130, h: 40, r: 20 };
          case 'menu': return { w: hasApiKey ? 440 : 360, h: 90, r: 45 }; 
          case 'music': return { w: 600, h: 180, r: 40 };
          case 'translate': return { w: 500, h: 320, r: 44 };
          case 'focus-timer': return { w: 380, h: 200, r: 48 }; 
          case 'ask-ai': return { w: 480, h: 360, r: 44 };
          case 'camera': return { w: 400, h: 320, r: 32 };
          case 'calendar': return { w: 480, h: 280, r: 40 };
          case 'calculator': return { w: 300, h: 440, r: 40 }; // Calculator dimensions
          default: return { w: 130, h: 40, r: 20 };
      }
  };

  const dims = getDimensions();
  const sphereMarginRight = (dims.w / 2) + 8; // Music Sphere (Right)
  const sphereMarginLeft = -((dims.w / 2) + 8 + 48); // Focus Sphere (Left) - negative to move left

  const formatTime = (seconds: number) => {
      if (!seconds && seconds !== 0) return "0:00";
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const themeColor = currentTrack.color || '#ffffff';

  // SVG Calculation for Timer (144px box -> r=54 fits well)
  const timerRadius = 54; 
  const timerCircumference = 2 * Math.PI * timerRadius;
  const timerOffset = timerCircumference - (focusData.timeLeft / (focusData.totalTime || 1)) * timerCircumference;

  // Small Satellite Timer Calc
  const satRadius = 18;
  const satCircumference = 2 * Math.PI * satRadius;
  const satOffset = satCircumference - (focusData.timeLeft / (focusData.totalTime || 1)) * satCircumference;

  // --- CALENDAR HELPERS ---
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); 
    return { daysInMonth, firstDayOfMonth };
  };

  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];

  // Reusable Back Button
  const BackButton = () => (
    <button 
        onClick={() => { handleStateChange('menu'); uiSounds.click(); }}
        className="absolute top-4 left-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all backdrop-blur-md group"
        title="Voltar ao Menu"
    >
        <span className="material-symbols-outlined !text-[16px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
    </button>
  );

  // Dynamic Backlight Color Logic
  const getBacklightColor = () => {
      if (state === 'music') return themeColor;
      if (state === 'focus-timer' || focusData.isRunning) return '#3b82f6'; // Blue
      if (state === 'ask-ai') return '#a855f7'; // Purple
      if (state === 'translate') return '#60a5fa'; // Light Blue
      if (state === 'camera') return '#ffffff'; // White/Red handled elsewhere
      if (state === 'calculator') return '#f97316'; // Orange
      return '#ffffff'; // Default White
  };

  return (
    <div id="dynamic-island-container" className={`fixed top-4 left-1/2 z-[2147483647] transition-all duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] ${isHidden ? 'opacity-0 -translate-y-24' : 'opacity-100'}`}>
        
        {/* --- BACKLIGHT ILLUMINATION --- */}
        <div 
            className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 rounded-[60px] transition-all duration-500 ease-in-out pointer-events-none z-0"
            style={{
                width: `${dims.w + 40}px`,
                height: `${dims.h + 40}px`,
                backgroundColor: getBacklightColor(),
                opacity: (state === 'idle' && !playerState.isPlaying && !focusData.isRunning) ? 0.15 : 0.4,
                filter: 'blur(40px)',
            }}
        />

        {/* --- MAIN ISLAND (CENTER) --- */}
        <div 
            ref={islandRef} 
            id="dynamic-island-pill"
            className={`
                relative z-20 bg-black text-white 
                ${isDarkMode ? 'shadow-[0_40px_80px_-15px_rgba(0,0,0,0.9)]' : 'shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8)]'}
                ring-1 ring-white/10 
                transition-all duration-[500ms] ease-[cubic-bezier(0.19,1,0.22,1)] overflow-hidden 
                -translate-x-1/2 transform-gpu will-change-[width,height,border-radius]
            `}
            style={{
                width: `${dims.w}px`,
                height: `${dims.h}px`,
                borderRadius: `${dims.r}px`
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* AMBILIGHT GLOW BACKDROP INSIDE */}
            {state === 'music' && (
                <div 
                    className="absolute inset-0 z-0 opacity-40 blur-[80px] transition-colors duration-1000 bg-gradient-to-r from-transparent via-transparent to-black"
                    style={{ backgroundColor: themeColor }}
                />
            )}

            <div className={`w-full h-full relative z-10 transition-all duration-300 ${contentVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                
                {/* IDLE STATE */}
                {state === 'idle' && (
                    <div 
                        className={`w-full h-full flex items-center cursor-pointer ${
                            (playerState.isPlaying || focusData.isRunning) ? 'justify-between px-5' : 'justify-center'
                        }`} 
                        onClick={() => handleStateChange('menu')}
                    >
                        {(playerState.isPlaying || focusData.isRunning) ? (
                            <>
                                <div className="flex items-center gap-3">
                                    {playerState.isPlaying ? <Waveform isActive={true} color={themeColor} /> : <div className="w-2 h-2 rounded-full bg-white/20" />}
                                    
                                    {playerState.isPlaying && !showSphere && (
                                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 truncate max-w-[80px]">
                                            {currentTrack.title}
                                        </span>
                                    )}
                                </div>
                                {focusData.isRunning && !showFocusSphere && <span className="text-[11px] font-mono text-blue-400 font-bold tracking-wider">{Math.floor(focusData.timeLeft / 60)}:{Math.floor(focusData.timeLeft % 60).toString().padStart(2, '0')}</span>}
                            </>
                        ) : null}
                    </div>
                )}

                {/* MENU STATE */}
                {state === 'menu' && (
                    <div className="w-full h-full flex items-center justify-evenly px-4">
                        {[
                            { id: 'music', icon: 'music_note', label: 'Music', show: islandConfig?.enabledApps?.includes('music') ?? true },
                            { id: 'translate', icon: 'translate', label: 'Tradutor', show: islandConfig?.enabledApps?.includes('translate') ?? true },
                            { id: 'calendar', icon: 'event', label: 'Agenda', show: islandConfig?.enabledApps?.includes('calendar') ?? true },
                            { id: 'ask-ai', icon: 'auto_awesome', label: 'IA', show: hasApiKey }, 
                            { id: 'focus-timer', icon: 'timer', label: 'Foco', show: islandConfig?.enabledApps?.includes('focus-timer') ?? true },
                            { id: 'camera', icon: 'videocam', label: 'Câmera', show: islandConfig?.enabledApps?.includes('camera') ?? true },
                            { id: 'calculator', icon: 'calculate', label: 'Calc', show: islandConfig?.enabledApps?.includes('calculator') ?? true }
                        ].filter(app => app.show).map(app => (
                            <button key={app.id} onClick={() => handleStateChange(app.id as IslandState)} className="flex flex-col items-center gap-1.5 group">
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-white/20 transition-all group-hover:scale-110">
                                    <span className="material-symbols-outlined !text-[24px]">{app.icon}</span>
                                </div>
                                <span className="text-[8px] font-bold uppercase tracking-widest opacity-40 group-hover:opacity-100">{app.label}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* ASK AI - FUNCTIONAL CHAT */}
                {state === 'ask-ai' && (
                  <div className="w-full h-full p-0 flex relative bg-black/40 backdrop-blur-md">
                      {/* Sidebar */}
                      <div className="w-16 h-full border-r border-white/5 flex flex-col items-center py-4 bg-black/20">
                          <AiLiquidIcon scale={0.4} />
                          <div className="mt-auto">
                              <button onClick={() => handleStateChange('menu')} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/20 transition-all">
                                  <span className="material-symbols-outlined !text-[16px] opacity-60">arrow_back</span>
                              </button>
                          </div>
                      </div>

                      {/* Chat Area */}
                      <div className="flex-1 flex flex-col min-w-0">
                          {/* Messages */}
                          <div className="flex-1 overflow-y-auto p-4 space-y-3 glass-scroll relative">
                              {chatMessages.length === 0 && (
                                  <div className="h-full flex items-center justify-center opacity-30 text-center text-xs">
                                      <p>Pergunte qualquer coisa à IA.<br/>Respostas rápidas e concisas.</p>
                                  </div>
                              )}
                              
                              {/* MODE TOGGLE IN HEADER AREA */}
                              <div className="absolute top-2 right-4 z-20">
                                  <button 
                                     onClick={() => { uiSounds.click(); setIsThinkingMode(!isThinkingMode); }}
                                     className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all shadow-lg backdrop-blur-md ${isThinkingMode ? 'bg-purple-600 border-purple-400 text-white' : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20'}`}
                                     title={isThinkingMode ? "Modo Pensamento Ativo" : "Ativar Modo Pensamento"}
                                  >
                                     <span className="material-symbols-outlined !text-[12px]">{isThinkingMode ? 'psychology' : 'search'}</span>
                                     <span className="text-[9px] font-bold uppercase tracking-wider">{isThinkingMode ? 'Pensando' : 'Pesquisa'}</span>
                                  </button>
                              </div>

                              {chatMessages.map(msg => (
                                  <div key={msg.id} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-[fadeIn_0.2s]`}>
                                      <div className={`max-w-[85%] p-2.5 rounded-2xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white/10 text-white rounded-bl-none'}`}>
                                          {msg.text}
                                      </div>
                                      {/* Source Chips */}
                                      {msg.sources && msg.sources.length > 0 && (
                                          <div className="flex flex-wrap gap-1.5 max-w-[85%] mt-1">
                                              {msg.sources.map((src, idx) => (
                                                  <a 
                                                    key={idx} 
                                                    href={src.uri} 
                                                    target="_blank" 
                                                    rel="noreferrer" 
                                                    className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-1 rounded-full text-[9px] text-white/70 hover:text-blue-300 transition-colors"
                                                  >
                                                      <span className="material-symbols-outlined !text-[10px]">public</span>
                                                      <span className="truncate max-w-[120px]">{src.title}</span>
                                                  </a>
                                              ))}
                                          </div>
                                      )}
                                  </div>
                              ))}
                              {isChatLoading && (
                                  <div className="flex justify-start animate-pulse">
                                      <div className="bg-white/5 p-2 rounded-xl flex gap-1 items-center">
                                          <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce"></div>
                                          <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce delay-75"></div>
                                          <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce delay-150"></div>
                                          {isThinkingMode && <span className="ml-2 text-[9px] uppercase font-bold opacity-50 tracking-wider">Raciocinando...</span>}
                                      </div>
                                  </div>
                              )}
                              <div ref={chatEndRef} />
                          </div>

                          {/* Input */}
                          <div className="p-3 border-t border-white/5 bg-black/20">
                              <form onSubmit={(e) => handleChatSend(e)} className="relative flex items-center gap-2">
                                  <input 
                                      type="text" 
                                      value={chatInput}
                                      onChange={(e) => setChatInput(e.target.value)}
                                      placeholder={isThinkingMode ? "Pergunta complexa..." : "Pesquisar ou perguntar..."}
                                      className="w-full bg-white/5 rounded-full pl-4 pr-10 py-2 text-xs outline-none text-white placeholder-white/30 focus:bg-white/10 transition-colors"
                                      autoFocus
                                  />
                                  <button 
                                      type="submit" 
                                      disabled={!chatInput.trim() || isChatLoading}
                                      className="absolute right-1 p-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-0 disabled:scale-0 transition-all flex items-center justify-center"
                                  >
                                      <span className="material-symbols-outlined !text-[14px]">send</span>
                                  </button>
                              </form>
                          </div>
                      </div>
                  </div>
                )}
            </div>
        </div>

        {/* ... SATELLITES (Focus/Music) kept unchanged ... */}
        {/* --- FOCUS TIMER SPHERE (LEFT SATELLITE) --- */}
        <div 
            className={`
                absolute top-0 left-0
                h-[48px] w-[48px]
                transition-all duration-[600ms] ease-[cubic-bezier(0.19,1,0.22,1)]
                ${showFocusSphere ? 'opacity-100 scale-100' : 'opacity-0 pointer-events-none scale-0'}
                z-0 group/timer
                hover:scale-110
            `}
            style={{
                marginLeft: `${sphereMarginLeft}px`, 
                transform: showFocusSphere ? 'translate(0, 0)' : 'translate(40px, 0)'
            }}
        >
            <div 
                className="w-full h-full rounded-full bg-black border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden relative flex items-center justify-center cursor-pointer"
                onClick={() => handleStateChange('focus-timer')}
                style={{ boxShadow: `0 0 20px -5px rgba(59,130,246,0.3)` }}
            >
                <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90 p-1" viewBox="0 0 48 48">
                       <circle cx="24" cy="24" r={satRadius} stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="transparent" />
                       <circle 
                            cx="24" cy="24" r={satRadius} 
                            stroke="#3b82f6" strokeWidth="3" fill="transparent" 
                            strokeDasharray={satCircumference} 
                            strokeDashoffset={satOffset} 
                            strokeLinecap="round" 
                            className="transition-all duration-1000 ease-linear"
                       />
                    </svg>
                    <span className="absolute text-[9px] font-bold tabular-nums tracking-tighter group-hover/timer:opacity-0 transition-opacity">
                        {Math.ceil(focusData.timeLeft / 60)}m
                    </span>
                </div>

                <div className="absolute inset-0 z-30 bg-black/80 opacity-0 group-hover/timer:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm rounded-full" onClick={(e) => e.stopPropagation()}>
                    <button onClick={toggleTimer} className="text-white hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined !text-[20px]">{focusData.isRunning ? 'pause' : 'play_arrow'}</span>
                    </button>
                </div>
            </div>
        </div>

        {/* --- MUSIC SPHERE (RIGHT SATELLITE) --- */}
        <div 
            className={`
                absolute top-0 left-0
                h-[48px] w-[48px]
                transition-all duration-[600ms] ease-[cubic-bezier(0.19,1,0.22,1)]
                ${showSphere ? 'opacity-100 scale-100' : 'opacity-0 pointer-events-none scale-0'}
                z-0 group/player
                hover:scale-110
            `}
            style={{
                marginLeft: `${sphereMarginRight}px`, 
                transform: showSphere ? 'translate(0, 0)' : 'translate(-40px, 0)'
            }}
        >
            <div 
                className="w-full h-full rounded-full bg-black border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden relative flex items-center justify-center cursor-pointer"
                onClick={() => handleStateChange('music')}
                style={{ boxShadow: `0 0 20px -5px ${themeColor}30` }}
            >
                <div className={`absolute inset-0.5 rounded-full overflow-hidden z-10 ${playerState.isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
                    <img src={currentTrack.cover} alt="Cover" className="w-full h-full object-cover" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-black rounded-full border border-white/20 z-20"></div>
                </div>

                <div className="absolute inset-0 z-30 bg-black/60 opacity-0 group-hover/player:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-1 backdrop-blur-sm rounded-full" onClick={(e) => e.stopPropagation()}>
                    <button onClick={prevTrack} className="text-white/70 hover:text-white transition-colors"><span className="material-symbols-outlined !text-[16px]">skip_previous</span></button>
                    <button onClick={toggleMusic} className="text-white hover:scale-110 transition-transform"><span className="material-symbols-outlined !text-[20px]">{playerState.isPlaying ? 'pause' : 'play_arrow'}</span></button>
                    <button onClick={nextTrack} className="text-white/70 hover:text-white transition-colors"><span className="material-symbols-outlined !text-[16px]">skip_next</span></button>
                </div>

                <button 
                    onClick={closeMusicSession}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-white hover:bg-red-500 hover:text-white text-black rounded-full flex items-center justify-center transition-all opacity-0 group-hover/player:opacity-100 z-50 scale-0 group-hover/player:scale-100 shadow-sm"
                    title="Fechar"
                >
                    <span className="material-symbols-outlined !text-[10px]">close</span>
                </button>
            </div>
        </div>
        
        <audio 
            ref={audioRef} 
            onTimeUpdate={handleTimeUpdate} 
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={onTrackEnded}
            src={currentTrack.src}
        />
    </div>
  );
};
