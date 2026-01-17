
import React from 'react';
import { ThemeId } from '../types';
import { GlassCard } from './GlassCard';

interface ThemeSelectorProps {
  currentTheme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

const THEMES: { id: ThemeId; name: string }[] = [
  { id: 'liquid', name: 'Liquid' },
  { id: 'default', name: 'Green Waves' },
  { id: 'fresh', name: 'Glass' }, 
  { id: 'nordic', name: 'Arctic Frost' },
  { id: 'chroma', name: 'Prism Flow' },
  { id: 'waves', name: 'Deep Ocean' },
  { id: 'minimal', name: 'Nexus' },
  { id: 'holo', name: 'Aurora' },
  { id: 'retro', name: 'Ball' }, 
  { id: 'book', name: 'Universe' },
];

const THEME_GRADIENTS: Record<string, string> = {
  liquid: 'linear-gradient(135deg, #2563eb, #9333ea, #06b6d4)',
  default: 'radial-gradient(circle at center, #059669, #000000)',
  nordic: 'radial-gradient(circle at bottom, #fff, transparent), linear-gradient(to top, #1e90ff, #39d24a)',
  fresh: 'linear-gradient(135deg, #E2B0FF 0%, #9F44D3 100%)', 
  chroma: 'conic-gradient(from 0deg at 50% 50%, #2BDEAC, #F028FD, #D8CCE6, #2F2585)',
  waves: 'radial-gradient(circle at top left, #00adef, transparent), linear-gradient(to bottom, #001220, #004e92)',
  minimal: 'radial-gradient(circle at center, #0096ff 0%, #05050a 100%)',
  holo: 'radial-gradient(circle at center, #0f0, #000)',
  retro: 'radial-gradient(circle at center, #333333, #000000)',
  book: 'radial-gradient(circle at center, #ffffff, #000000)',
  mix: 'conic-gradient(from 0deg, red, yellow, green, cyan, blue, magenta, red)',
  weather: 'linear-gradient(to bottom, #60a5fa, #e5e7eb)',
};

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ currentTheme, setTheme }) => {
  const transitionClass = "transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]";
  
  return (
    <div className="flex flex-col items-center gap-2">
      <GlassCard className="!p-2 flex gap-2.5 items-center !rounded-full bg-black/20 border-white/10 backdrop-blur-xl shadow-2xl overflow-x-auto hide-scrollbar max-w-[90vw] md:max-w-full">
        {THEMES.map((theme) => {
          const isActive = currentTheme === theme.id;
          
          return (
            <button 
              key={theme.id} 
              onClick={() => setTheme(theme.id)} 
              className={`relative w-9 h-9 rounded-full flex-shrink-0 group ${transitionClass} ${isActive ? 'scale-110 ring-[3px] ring-white ring-offset-2 ring-offset-transparent shadow-[0_0_20px_rgba(255,255,255,0.4)] opacity-100' : 'scale-100 opacity-60 hover:opacity-100 hover:scale-110'}`}
            >
              {/* Esfera do Tema */}
              <div 
                className="absolute inset-0 rounded-full transition-transform duration-500 group-hover:scale-110" 
                style={{ background: THEME_GRADIENTS[theme.id as string] }}
              />
              
              {/* Volume e Brilho */}
              <div className="absolute inset-0 rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.3)] pointer-events-none" />
              <div className="absolute top-[10%] left-[20%] w-[30%] h-[20%] bg-white/30 rounded-full blur-[1px] pointer-events-none" />
              
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none translate-y-2 group-hover:translate-y-0">
                <div className="bg-black/80 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-white/20 whitespace-nowrap shadow-xl">
                  {theme.name}
                </div>
              </div>

              {isActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px] rounded-full">
                  <div className="w-2 h-2 bg-white rounded-full shadow-sm animate-[popIn_0.3s_ease-out]"></div>
                </div>
              )}
            </button>
          );
        })}
        
        <div className="w-[1px] h-6 bg-white/10 mx-1 flex-shrink-0"></div>
        
        <button 
          onClick={() => setTheme('weather')} 
          className={`relative w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 group bg-gradient-to-br from-blue-400 to-gray-200 ${transitionClass} ${currentTheme === 'weather' ? 'scale-110 ring-[3px] ring-white ring-offset-2 ring-offset-transparent shadow-[0_0_15px_rgba(255,255,255,0.4)] opacity-100' : 'scale-100 opacity-60 hover:opacity-100 hover:scale-110'}`}
        >
          <span className="material-symbols-outlined !text-[18px] text-white drop-shadow-md">partly_cloudy_day</span>
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none translate-y-2 group-hover:translate-y-0">
            <div className="bg-black/80 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-white/20 whitespace-nowrap shadow-xl">
              Tempo Real
            </div>
          </div>
        </button>

        <button 
          onClick={() => setTheme('mix')} 
          className={`relative w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden group bg-[conic-gradient(at_center,_var(--tw-gradient-stops))] from-red-500 via-green-500 via-blue-500 to-purple-500 ${transitionClass} ${currentTheme === 'mix' ? 'scale-110 ring-[3px] ring-white ring-offset-2 ring-offset-transparent shadow-[0_0_15px_rgba(255,255,255,0.4)] opacity-100 animate-spin-slow' : 'scale-100 opacity-60 hover:opacity-100 hover:scale-110'}`}
        >
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none translate-y-2 group-hover:translate-y-0">
            <div className="bg-black/80 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-white/20 whitespace-nowrap shadow-xl">
              Mix Infinito
            </div>
          </div>
          {currentTheme === 'mix' && <div className="absolute inset-0 flex items-center justify-center bg-black/20"><div className="w-2 h-2 bg-white rounded-full shadow-sm"></div></div>}
        </button>
      </GlassCard>
    </div>
  );
};
