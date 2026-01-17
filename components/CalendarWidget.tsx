
import React, { useState, useEffect } from 'react';
import { GlassCard } from './GlassCard';
import { storage, STORAGE_KEYS } from '../services/storageService';
import { CalendarEvent } from '../types';
import { uiSounds } from '../services/soundService';

interface CalendarWidgetProps {
  isDarkMode: boolean;
  focusMode?: boolean;
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ isDarkMode, focusMode = false }) => {
  const [expanded, setExpanded] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date()); // Real "Now"
  const [displayDate, setDisplayDate] = useState(new Date()); // Navigation View
  const [selectedDate, setSelectedDate] = useState(new Date()); // User Selection
  
  const [events, setEvents] = useState<Record<string, CalendarEvent[]>>({});
  const [newEventTitle, setNewEventTitle] = useState('');
  
  // ICS Import State
  const [showImport, setShowImport] = useState(false);
  const [icsUrl, setIcsUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Auto-collapse
  useEffect(() => {
    setExpanded(false);
    setShowImport(false);
  }, [focusMode]);

  // Load Events
  useEffect(() => {
    const loadEvents = async () => {
        const savedEvents = await storage.get<Record<string, CalendarEvent[]>>(STORAGE_KEYS.CALENDAR_EVENTS);
        if (savedEvents) setEvents(savedEvents);
        
        // Auto-refresh ICS if configured (Logic could be added here later)
    };
    loadEvents();
  }, []);

  // Save Events
  const saveEvents = (updatedEvents: Record<string, CalendarEvent[]>) => {
      setEvents(updatedEvents);
      storage.set(STORAGE_KEYS.CALENDAR_EVENTS, updatedEvents);
  };

  // Helper: Date Key YYYY-MM-DD
  const getDateKey = (date: Date) => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // --- ICS PARSER ENGINE ---
  const parseICS = (icsData: string) => {
      const newEvents: Record<string, CalendarEvent[]> = { ...events };
      const lines = icsData.split(/\r\n|\n|\r/);
      let inEvent = false;
      let currentEvent: any = {};

      const formatDateKey = (icsDate: string) => {
          // Format: 20231025T143000Z or 20231025
          if (!icsDate) return null;
          const year = icsDate.substring(0, 4);
          const month = icsDate.substring(4, 6);
          const day = icsDate.substring(6, 8);
          return `${year}-${month}-${day}`;
      };

      for (const line of lines) {
          if (line.startsWith('BEGIN:VEVENT')) {
              inEvent = true;
              currentEvent = {};
          } else if (line.startsWith('END:VEVENT')) {
              inEvent = false;
              if (currentEvent.DTSTART && currentEvent.SUMMARY) {
                  const key = formatDateKey(currentEvent.DTSTART);
                  if (key) {
                      if (!newEvents[key]) newEvents[key] = [];
                      // Prevent duplicates
                      const exists = newEvents[key].some(e => e.title === currentEvent.SUMMARY);
                      if (!exists) {
                          newEvents[key].push({
                              id: Date.now() + Math.random().toString(),
                              title: currentEvent.SUMMARY,
                              date: key,
                              completed: false
                          });
                      }
                  }
              }
          } else if (inEvent) {
              const [key, ...valueParts] = line.split(':');
              const value = valueParts.join(':');
              if (key.includes('DTSTART')) currentEvent.DTSTART = value;
              if (key.includes('SUMMARY')) currentEvent.SUMMARY = value;
          }
      }
      return newEvents;
  };

  const handleImportICS = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!icsUrl) return;
      
      setIsImporting(true);
      uiSounds.click();

      try {
          // Bypass CORS if possible or hope for the best (Works with many public Google Calendars)
          // Note: In a real production extension, we'd use the background script to fetch to avoid CORS fully.
          const response = await fetch(icsUrl);
          if (!response.ok) throw new Error("Falha ao baixar calendário");
          
          const text = await response.text();
          const parsedEvents = parseICS(text);
          
          saveEvents(parsedEvents);
          setIsImporting(false);
          setShowImport(false);
          setIcsUrl('');
          uiSounds.success();
          alert('Calendário sincronizado com sucesso!');
      } catch (error) {
          console.error("Import Error", error);
          uiSounds.error();
          setIsImporting(false);
          alert('Erro ao importar. Verifique se a URL é um link .ics público válido ou se o servidor permite acesso direto (CORS).');
      }
  };

  const handleAddEvent = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newEventTitle.trim()) return;
      uiSounds.click();

      const key = getDateKey(selectedDate);
      const newEvent: CalendarEvent = {
          id: Date.now().toString(),
          title: newEventTitle,
          date: key,
          completed: false
      };

      const updatedEvents = { ...events };
      if (!updatedEvents[key]) updatedEvents[key] = [];
      updatedEvents[key] = [...updatedEvents[key], newEvent];

      saveEvents(updatedEvents);
      setNewEventTitle('');
  };

  const handleDeleteEvent = (eventId: string) => {
      uiSounds.click();
      const key = getDateKey(selectedDate);
      if (!events[key]) return;
      
      const updatedEvents = { ...events };
      updatedEvents[key] = updatedEvents[key].filter(ev => ev.id !== eventId);
      
      if (updatedEvents[key].length === 0) delete updatedEvents[key];

      saveEvents(updatedEvents);
  };

  const toggleEventComplete = (eventId: string) => {
    uiSounds.click();
    const key = getDateKey(selectedDate);
    if (!events[key]) return;

    const updatedEvents = { ...events };
    updatedEvents[key] = updatedEvents[key].map(ev => 
        ev.id === eventId ? { ...ev, completed: !ev.completed } : ev
    );
    saveEvents(updatedEvents);
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); 
    return { daysInMonth, firstDayOfMonth };
  };

  const { daysInMonth, firstDayOfMonth } = getDaysInMonth(displayDate);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 1));
  };

  const handleDayClick = (e: React.MouseEvent, day: number) => {
    e.stopPropagation();
    uiSounds.click();
    const newDate = new Date(displayDate.getFullYear(), displayDate.getMonth(), day);
    setSelectedDate(newDate);
  };

  const textPrimary = isDarkMode ? 'text-white' : 'text-slate-800';
  const textSecondary = isDarkMode ? 'text-white/70' : 'text-slate-500';
  const btnHover = isDarkMode ? 'hover:bg-white/20 hover:border-white/30 border border-transparent' : 'hover:bg-black/10';
  const inputBg = isDarkMode 
    ? 'bg-black/40 text-white placeholder-white/60 border border-white/30 focus:border-white/50' 
    : 'bg-white text-slate-800 placeholder-slate-400 border border-black/10 focus:border-black/20';

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];

  const isToday = (day: number) => {
    return day === currentDate.getDate() && 
           displayDate.getMonth() === currentDate.getMonth() && 
           displayDate.getFullYear() === currentDate.getFullYear();
  };

  const isSelected = (day: number) => {
      return day === selectedDate.getDate() &&
             displayDate.getMonth() === selectedDate.getMonth() &&
             displayDate.getFullYear() === selectedDate.getFullYear();
  };

  const hasEvents = (day: number) => {
      const key = getDateKey(new Date(displayDate.getFullYear(), displayDate.getMonth(), day));
      return events[key] && events[key].length > 0;
  };

  const selectedKey = getDateKey(selectedDate);
  const currentEvents = events[selectedKey] || [];

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
                         <span className="material-symbols-outlined !text-[24px]">calendar_month</span>
                    </div>

                    <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-2">
                            <span className={`text-lg font-light leading-none ${textPrimary}`}>
                                {currentDate.getDate()} <span className="text-sm uppercase font-bold opacity-60">{monthNames[currentDate.getMonth()].substring(0, 3)}</span>
                            </span>
                        </div>
                        {expanded && (
                             <div className={`overflow-hidden transition-all duration-500 ${expanded ? 'max-h-10 opacity-100' : 'max-h-0 opacity-0'}`}>
                                <span className={`text-[10px] mt-1 whitespace-nowrap block ${textSecondary}`}>
                                    {new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(currentDate)}
                                </span>
                             </div>
                        )}
                         {!expanded && (
                             <span className={`text-[10px] mt-1 whitespace-nowrap block ${textSecondary}`}>
                                 Agenda
                             </span>
                         )}
                    </div>
                </div>

                <div className={`ml-auto transition-transform duration-500 ${expanded ? 'rotate-180' : 'rotate-0'} ${textSecondary}`}>
                     <span className="material-symbols-outlined !text-[20px]">expand_more</span>
                </div>
            </div>

            <div className={`
                transition-all duration-[500ms] ease-[cubic-bezier(0.25,0.8,0.25,1)] overflow-hidden border-t
                ${isDarkMode ? 'border-white/20' : 'border-black/10'}
                ${expanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0 border-t-0'}
            `}>
                <div className="p-5 animate-[fadeIn_0.3s_ease-out_0.1s_both] cursor-default" onClick={(e) => e.stopPropagation()}>
                    
                    {/* Month Navigator */}
                    <div className="flex items-center justify-between mb-5">
                        <button onClick={handlePrevMonth} className={`p-1.5 rounded-full transition-colors ${btnHover} ${textSecondary} flex items-center`}>
                             <span className="material-symbols-outlined !text-[20px]">chevron_left</span>
                        </button>
                        <span className={`text-sm font-bold uppercase tracking-wider ${textPrimary}`}>
                            {monthNames[displayDate.getMonth()]} {displayDate.getFullYear()}
                        </span>
                        <button onClick={handleNextMonth} className={`p-1.5 rounded-full transition-colors ${btnHover} ${textSecondary} flex items-center`}>
                             <span className="material-symbols-outlined !text-[20px]">chevron_right</span>
                        </button>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-7 gap-1.5 text-center mb-5">
                        {weekDays.map((day, i) => (
                            <div key={i} className={`text-[9px] font-bold opacity-50 mb-2 ${textPrimary}`}>{day}</div>
                        ))}
                        {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const today = isToday(day);
                            const selected = isSelected(day);
                            const eventDot = hasEvents(day);
                            return (
                                <div 
                                    key={day}
                                    onClick={(e) => handleDayClick(e, day)}
                                    className={`
                                        relative w-9 h-9 flex items-center justify-center rounded-full text-xs mx-auto cursor-pointer
                                        transition-all duration-300 group
                                        ${today ? 'bg-blue-600 text-white font-bold shadow-md' : selected ? (isDarkMode ? 'bg-white text-black font-bold' : 'bg-slate-800 text-white font-bold') : `${textPrimary} hover:bg-white/20 hover:font-bold`}
                                    `}
                                >
                                    {day}
                                    {eventDot && <div className={`absolute bottom-1.5 w-1 h-1 rounded-full ${today || selected ? 'bg-white' : 'bg-blue-500'}`}></div>}
                                </div>
                            );
                        })}
                    </div>
                    
                    {/* Events Section */}
                    <div className={`pt-4 border-t ${isDarkMode ? 'border-white/20' : 'border-black/10'}`}>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className={`text-[10px] font-bold uppercase tracking-widest ${textSecondary}`}>
                               {selectedDate.getDate()} de {monthNames[selectedDate.getMonth()]}
                            </h3>
                            <button 
                                onClick={() => setShowImport(!showImport)}
                                className={`text-[9px] uppercase font-bold text-blue-400 hover:underline`}
                            >
                                {showImport ? 'Cancelar' : 'Sincronizar'}
                            </button>
                        </div>

                        {/* Import ICS Form */}
                        {showImport && (
                            <div className="mb-4 animate-[fadeIn_0.3s_ease-out]">
                                <form onSubmit={handleImportICS} className="flex flex-col gap-2">
                                    <input 
                                        type="text" 
                                        value={icsUrl}
                                        onChange={(e) => setIcsUrl(e.target.value)}
                                        placeholder="Cole a URL pública do .ics..."
                                        className={`w-full px-3 py-2 rounded-lg text-xs outline-none transition-colors ${inputBg}`}
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <button 
                                            type="submit" 
                                            disabled={!icsUrl || isImporting}
                                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-500 text-white'}`}
                                        >
                                            {isImporting ? 'Baixando...' : 'Importar'}
                                        </button>
                                        <a href="https://support.google.com/calendar/answer/37648?hl=pt-BR" target="_blank" rel="noreferrer" className="text-[10px] opacity-60 hover:opacity-100 flex items-center px-1">Ajuda?</a>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/30 pr-1 mb-3">
                            {currentEvents.length === 0 ? (
                                <p className={`text-[11px] italic opacity-50 ${textPrimary}`}>
                                    Sem eventos.
                                </p>
                            ) : (
                                currentEvents.map(ev => (
                                    <div key={ev.id} className={`group flex items-center gap-2 p-2 rounded-lg transition-colors border border-transparent ${isDarkMode ? 'hover:bg-white/10 hover:border-white/20' : 'hover:bg-black/5 hover:border-black/5'}`}>
                                        <button 
                                            onClick={() => toggleEventComplete(ev.id)}
                                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${ev.completed ? 'bg-blue-500 border-blue-500' : `border-current opacity-50 hover:opacity-100`}`}
                                        >
                                             {ev.completed && <span className="material-symbols-outlined !text-[12px] text-white">check</span>}
                                        </button>
                                        <span className={`text-sm flex-1 truncate ${ev.completed ? 'line-through opacity-50' : ''} ${textPrimary}`}>
                                            {ev.title}
                                        </span>
                                        <button onClick={() => handleDeleteEvent(ev.id)} className={`opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>
                                             <span className="material-symbols-outlined !text-[16px]">delete</span>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {!showImport && (
                            <form onSubmit={handleAddEvent} className="flex gap-2">
                                <input 
                                    type="text"
                                    value={newEventTitle}
                                    onChange={(e) => setNewEventTitle(e.target.value)}
                                    placeholder="Novo evento..."
                                    className={`flex-1 px-3 py-2 rounded-lg text-xs outline-none transition-colors ${inputBg}`}
                                />
                                <button type="submit" disabled={!newEventTitle.trim()} className={`px-3 rounded-lg transition-colors disabled:opacity-30 flex items-center justify-center ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>
                                     <span className="material-symbols-outlined !text-[16px]">add</span>
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </GlassCard>
    </div>
  );
};
