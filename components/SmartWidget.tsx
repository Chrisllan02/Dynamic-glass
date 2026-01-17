
import React, { useState, useEffect } from 'react';
import { ModuleId } from '../types';
import { GlassCard } from './GlassCard';
import { WeatherWidget } from './WeatherWidget';
import { CalendarWidget } from './CalendarWidget';
import { SoundscapesWidget } from './SoundscapesWidget';
import { RemindersWidget } from './RemindersWidget';
import { DailyInspiration } from './DailyInspiration';
import { HoroscopeCard } from './HoroscopeCard';
import { TechFactCard } from './TechFactCard';
import { BreathingCard } from './BreathingCard';
import { UnifiedPlannerWidget } from './UnifiedPlannerWidget';

interface SmartWidgetProps {
  id: ModuleId;
  isDarkMode: boolean;
  mode: 'widget' | 'carousel'; 
  focusMode?: boolean;
}

export const SmartWidget: React.FC<SmartWidgetProps> = ({ id, isDarkMode, mode, focusMode = false }) => {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [focusMode]);

  const textPrimary = isDarkMode ? 'text-white' : 'text-slate-800';
  const textSecondary = isDarkMode ? 'text-white/60' : 'text-slate-500';

  // 1. NATIVE WIDGETS
  if (mode === 'widget') {
    if (id === 'weather') return <WeatherWidget isDarkMode={isDarkMode} focusMode={focusMode} />;
    if (id === 'planner') return <UnifiedPlannerWidget isDarkMode={isDarkMode} focusMode={focusMode} />;
    if (id === 'calendar') return <CalendarWidget isDarkMode={isDarkMode} focusMode={focusMode} />;
    if (id === 'soundscapes') return <SoundscapesWidget isDarkMode={isDarkMode} mode="widget" focusMode={focusMode} />;
    if (id === 'reminders') return <RemindersWidget isDarkMode={isDarkMode} focusMode={focusMode} />;
  }

  // 2. CONTENT CARDS
  const renderContent = () => {
    switch (id) {
      case 'quote': return <DailyInspiration isDarkMode={isDarkMode} />;
      case 'horoscope': return <HoroscopeCard isDarkMode={isDarkMode} />;
      case 'tech': return <TechFactCard isDarkMode={isDarkMode} />;
      case 'breathe': return <BreathingCard isDarkMode={isDarkMode} />;
      case 'soundscapes': return <SoundscapesWidget isDarkMode={isDarkMode} mode="carousel" focusMode={focusMode} />;
      case 'planner': return <UnifiedPlannerWidget isDarkMode={isDarkMode} focusMode={focusMode} isMini />;
      default: return null;
    }
  };

  const getIcon = () => {
    const iconClass = "material-symbols-outlined !text-[20px]";
    switch (id) {
      case 'quote': return <span className={iconClass}>format_quote</span>;
      case 'horoscope': return <span className={iconClass}>auto_awesome</span>;
      case 'tech': return <span className={iconClass}>memory</span>;
      case 'breathe': return <span className={iconClass}>air</span>;
      case 'soundscapes': return <span className={iconClass}>graphic_eq</span>;
      case 'planner': return <span className={iconClass}>event_note</span>;
      default: return null;
    };
  };

  const getTitle = () => {
    switch (id) {
      case 'quote': return 'Inspiração';
      case 'horoscope': return 'Horóscopo';
      case 'tech': return 'Trivia';
      case 'breathe': return 'Respirar';
      case 'soundscapes': return 'Sons';
      case 'planner': return 'Planejador';
      default: return '';
    }
  };

  if (mode === 'carousel') {
    return (
       <div className="w-full h-full flex items-center justify-center">
         {renderContent()}
       </div>
    );
  }

  // --- WIDGET MODE (GENERIC CONTAINER) ---
  return (
    <div className="flex flex-col items-start gap-2 animate-[fadeIn_1s_ease-out] pointer-events-auto">
        <GlassCard 
            isDarkMode={isDarkMode}
            interactive
            className={`
                !p-0 flex flex-col justify-start rounded-[24px]
                ${expanded ? 'w-[340px]' : 'w-[200px] h-[64px]'}
            `}
        >
            <div 
                className={`flex items-center justify-between px-5 w-full transition-all duration-300 ${expanded ? 'py-5' : 'h-[64px]'}`}
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-4">
                    <div className={`flex-shrink-0 transition-all ${isDarkMode ? 'text-white' : 'text-slate-700'} ${expanded ? 'scale-100' : 'scale-90'}`}>
                        {getIcon()}
                    </div>

                    <div className="flex flex-col justify-center min-w-0">
                         <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium leading-none whitespace-nowrap ${textPrimary}`}>{getTitle()}</span>
                         </div>
                    </div>
                </div>
                
                <div className={`ml-auto transition-transform duration-500 ${expanded ? 'rotate-180' : 'rotate-0'} ${textSecondary}`}>
                     <span className="material-symbols-outlined !text-[20px]">expand_more</span>
                </div>
            </div>

            {/* Expanded Content */}
            <div className={`
                transition-all duration-[500ms] ease-[cubic-bezier(0.25,0.8,0.25,1)] overflow-hidden border-t
                ${isDarkMode ? 'border-white/10' : 'border-black/5'}
                ${expanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0 border-t-0'}
            `}>
                 <div className="px-2 pb-4 pt-2 cursor-default min-h-[100px] flex items-center justify-center w-[340px]" onClick={(e) => e.stopPropagation()}>
                    {renderContent()}
                 </div>
            </div>
        </GlassCard>
    </div>
  );
};
