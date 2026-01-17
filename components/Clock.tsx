
import React, { useState, useEffect } from 'react';
import { ClockConfig } from '../types';

interface ClockProps {
  isDarkMode?: boolean;
  config?: ClockConfig;
}

export const Clock: React.FC<ClockProps> = ({ 
    isDarkMode = true,
    config = { format: '24h', scale: 1, position: 'center', fontWeight: 'black', font: 'rounded', colorMode: 'theme', fontSize: 'large' }
}) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const syncTimer = () => {
        const now = new Date();
        setTime(now);
        const delay = 1000 - now.getMilliseconds();
        setTimeout(() => {
            setTime(new Date());
            setInterval(() => setTime(new Date()), 1000);
        }, delay);
    };
    syncTimer();
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: config.format === '12h'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const getAlignClass = () => {
      switch(config.position) {
          case 'left': return 'items-start text-left';
          case 'right': return 'items-end text-right';
          case 'center': default: return 'items-center text-center';
      }
  };

  const getFontClass = () => {
      switch(config.font) {
          case 'serif': return 'font-[Playfair_Display] tracking-tight'; 
          case 'elegant': return 'font-[DM_Serif_Display] tracking-normal'; 
          case 'slab': return 'font-[Roboto_Slab] tracking-tight'; 
          case 'mono': return 'font-[JetBrains_Mono] tracking-tighter'; 
          case 'rounded': return 'font-[Nunito] tracking-normal'; 
          case 'modern': return 'font-[Outfit] tracking-tight'; 
          case 'condensed': return 'font-[Oswald] tracking-tight'; 
          case 'tall': return 'font-[Bebas_Neue] tracking-widest leading-[0.8]'; 
          case 'heavy': return 'font-[Abril_Fatface] tracking-wide'; 
          case 'inter': default: return 'font-[Inter] tracking-tighter'; 
      }
  };

  const getSizeClass = () => {
      switch(config.fontSize) {
          case 'small': return 'text-5xl md:text-6xl';
          case 'medium': return 'text-7xl md:text-8xl';
          case 'large': return 'text-8xl md:text-9xl';
          case 'huge': return 'text-9xl md:text-[10rem]';
          case 'massive': return 'text-[10rem] md:text-[12rem]';
          default: return 'text-8xl md:text-9xl';
      }
  };
  
  const getWeightClass = () => {
      switch(config.fontWeight) {
          case 'thin': return 'font-thin'; 
          case 'light': return 'font-light'; 
          case 'regular': return 'font-normal';
          case 'bold': return 'font-bold';
          case 'extra-bold': return 'font-extrabold';
          case 'black': return 'font-black';
          default: return 'font-black';
      }
  };

  const getColorClass = () => {
      // Liquid Glass Effect: Gradient transparency + Clip + Subtle Shadow
      return 'bg-gradient-to-b from-white via-white/80 to-white/20 text-transparent bg-clip-text drop-shadow-[0_4px_12px_rgba(0,0,0,0.1)]';
  };

  return (
    <div className={`w-full flex flex-col relative z-0 ${getAlignClass()} ${getFontClass()} animate-[fade-in_1.2s_var(--fluid-easing)]`}>
      <div 
          className={`flex flex-col select-none transition-all duration-1000 ease-[cubic-bezier(0.19,1,0.22,1)] ${getAlignClass()}`}
          style={{ 
            transform: `scale(${config.scale})`, 
            transformOrigin: config.position === 'center' ? 'center top' : config.position === 'left' ? 'left top' : 'right top' 
          }}
      >
        <div className={`
            relative group
            flex flex-col ${config.position === 'center' ? 'items-center' : config.position === 'left' ? 'items-start' : 'items-end'} justify-center
            py-4 px-4
            transition-all duration-500
        `}>
            <div className={`flex flex-col gap-0.5 mb-1 z-10 ${config.position === 'center' ? 'items-center' : config.position === 'left' ? 'items-start' : 'items-end'}`}>
                <p className={`text-sm md:text-base font-bold uppercase tracking-[0.3em] text-white/70 animate-[fade-in_1s_var(--fluid-easing)] drop-shadow-md`}>
                    {formatDate(time)}
                </p>
            </div>

            <h1 className={`${getSizeClass()} leading-[0.9] ${getWeightClass()} ${getColorClass()} z-20 transition-all duration-700`}>
                {formatTime(time)}
            </h1>
        </div>
      </div>
    </div>
  );
};
