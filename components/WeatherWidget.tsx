
import React, { useEffect, useState } from 'react';
import { getWeatherData, getWeatherDescription } from '../services/weatherService';
import { WeatherData } from '../types';
import { GlassCard } from './GlassCard';

interface WeatherWidgetProps {
  isDarkMode: boolean;
  focusMode?: boolean;
}

// --- ÍCONES 3D/REALISTAS (CSS PURO - REFINADO) ---
const RealisticIcon = ({ code, size = 'normal' }: { code: number, size?: 'normal' | 'small' }) => {
    const scale = size === 'small' ? 'scale-[0.6]' : 'scale-[1.0]';
    
    // Sol com mais brilho e profundidade
    const Sun = () => (
        <div className="absolute inset-0 flex items-center justify-center animate-[spin_12s_linear_infinite]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-300 via-orange-400 to-orange-600 shadow-[0_0_25px_rgba(251,191,36,0.8),inset_-2px_-2px_6px_rgba(255,100,0,0.5)]"></div>
        </div>
    );

    // Nuvem com sombreamento volumétrico
    const Cloud = ({ offset = false, dark = false }) => (
        <div className={`absolute ${offset ? 'top-1 left-2 opacity-90 scale-95' : 'top-2 left-0'} w-10 h-6 filter drop-shadow-md`}>
            <div className={`absolute w-6 h-6 rounded-full ${dark ? 'bg-gradient-to-b from-slate-400 to-slate-600' : 'bg-gradient-to-b from-white to-slate-200'} shadow-inner left-0 top-0`}></div>
            <div className={`absolute w-7 h-7 rounded-full ${dark ? 'bg-gradient-to-b from-slate-300 to-slate-500' : 'bg-gradient-to-b from-white to-slate-100'} shadow-inner left-3 -top-1`}></div>
        </div>
    );

    const RainDrops = () => (
        <div className="absolute top-6 left-3 flex gap-1.5">
            <div className="w-1 h-2.5 bg-gradient-to-b from-blue-300 to-blue-500 rounded-full animate-[rain_1s_linear_infinite] delay-0 shadow-[0_2px_4px_rgba(59,130,246,0.3)]"></div>
            <div className="w-1 h-2.5 bg-gradient-to-b from-blue-300 to-blue-500 rounded-full animate-[rain_1.2s_linear_infinite] delay-300 shadow-[0_2px_4px_rgba(59,130,246,0.3)]"></div>
            <div className="w-1 h-2.5 bg-gradient-to-b from-blue-300 to-blue-500 rounded-full animate-[rain_0.8s_linear_infinite] delay-150 shadow-[0_2px_4px_rgba(59,130,246,0.3)]"></div>
        </div>
    );

    const SnowFlakes = () => (
        <div className="absolute top-6 left-2 flex gap-2">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-[snow_2s_linear_infinite] delay-0 blur-[0.5px] shadow-[0_0_5px_white]"></div>
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-[snow_2.5s_linear_infinite] delay-500 blur-[0.5px] shadow-[0_0_5px_white]"></div>
        </div>
    );

    const Lightning = () => (
        <div className="absolute top-5 left-4 z-20">
             <svg width="14" height="20" viewBox="0 0 24 24" fill="url(#bolt-grad)" className="drop-shadow-[0_0_10px_rgba(234,179,8,0.9)] animate-pulse">
                 <defs>
                    <linearGradient id="bolt-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fef08a" />
                        <stop offset="100%" stopColor="#eab308" />
                    </linearGradient>
                 </defs>
                 <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
             </svg>
        </div>
    );

    let IconContent = null;

    if (code === 0) { 
        IconContent = <Sun />;
    } else if (code >= 1 && code <= 3) { 
        IconContent = (
            <div className="relative w-12 h-10">
                {code <= 2 && <div className="absolute -top-1 -right-2 scale-75 z-0"><Sun /></div>}
                <div className="animate-float relative z-10"><Cloud /></div>
            </div>
        );
    } else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) { 
        IconContent = (
            <div className="relative w-12 h-10">
                <Cloud dark={code > 60} />
                <RainDrops />
            </div>
        );
    } else if (code >= 71 && code <= 77) { 
        IconContent = (
            <div className="relative w-12 h-10">
                <Cloud />
                <SnowFlakes />
            </div>
        );
    } else if (code >= 95) { 
        IconContent = (
            <div className="relative w-12 h-10">
                <Cloud dark />
                <RainDrops />
                <Lightning />
            </div>
        );
    } else { 
        IconContent = (
            <div className="relative w-12 h-10 opacity-70">
                <Cloud />
                <div className="absolute bottom-0 w-full h-1.5 bg-gradient-to-r from-transparent via-white/40 to-transparent blur-md rounded-full"></div>
            </div>
        );
    }

    return (
        <div className={`relative w-10 h-10 flex items-center justify-center ${scale} transform-gpu`}>
            {IconContent}
        </div>
    );
};

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ isDarkMode, focusMode = false }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [focusMode]);

  useEffect(() => {
    getWeatherData()
      .then(data => {
        setWeather(data);
        setLoading(false);
        window.dispatchEvent(new CustomEvent('lumina-update', {
            detail: {
                type: 'weather-update',
                payload: { temp: data.currentTemp, city: data.city }
            }
        }));
      })
      .catch(err => {
        console.error("Weather load failed", err);
        setError(true);
        setLoading(false);
      });
  }, []);

  if (error) return null;

  const textPrimary = isDarkMode ? 'text-white' : 'text-slate-800';
  const textSecondary = isDarkMode ? 'text-white/60' : 'text-slate-500/70';
  
  const tempClass = isDarkMode 
    ? 'bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent' 
    : 'text-slate-800';

  const getWeatherGradient = () => {
      if (!weather) return '';
      const code = weather.currentCode;
      if (code === 0) return isDarkMode ? 'bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent' : 'bg-gradient-to-br from-amber-300/40 to-transparent';
      if (code >= 1 && code <= 3) return isDarkMode ? 'bg-gradient-to-br from-slate-500/20 via-blue-900/10 to-transparent' : 'bg-gradient-to-br from-slate-300/40 to-transparent';
      if (code >= 51 && code <= 67) return isDarkMode ? 'bg-gradient-to-br from-blue-600/20 via-cyan-500/10 to-transparent' : 'bg-gradient-to-br from-blue-300/40 to-transparent';
      if (code >= 95) return isDarkMode ? 'bg-gradient-to-br from-purple-600/20 via-indigo-900/10 to-transparent' : 'bg-gradient-to-br from-purple-300/40 to-transparent';
      return '';
  };

  if (loading) {
    return (
        <div className="animate-pulse pointer-events-auto">
            <div className={`h-[64px] w-[200px] rounded-[24px] ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`}></div>
        </div>
    );
  }

  return (
    <div 
        className="flex flex-col items-start gap-2 animate-[fadeIn_1s_ease-out] pointer-events-auto relative"
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
    >
        <style>{`
            @keyframes rain { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(10px); opacity: 0; } }
            @keyframes snow { 0% { transform: translateY(0) translateX(0); opacity: 1; } 50% { transform: translateY(5px) translateX(2px); } 100% { transform: translateY(10px) translateX(0); opacity: 0; } }
            .pulse-slow { animation: pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        `}</style>

        <GlassCard 
            isDarkMode={isDarkMode}
            interactive
            className={`!p-0 cursor-pointer flex flex-col justify-start rounded-[24px] transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${expanded ? 'w-[340px] h-auto scale-[1.02] shadow-2xl' : 'w-[200px] h-[64px]'}`}
        >
            {/* Animated Background Gradient */}
            {expanded && (
                <div className={`absolute inset-0 z-0 ${getWeatherGradient()} opacity-100 transition-opacity duration-1000 pointer-events-none pulse-slow`}></div>
            )}

            {/* HEADER AREA */}
            <div 
                className={`flex items-center justify-between px-5 w-full transition-all duration-300 relative z-10 ${expanded ? 'pt-5 pb-2' : 'h-[64px]'}`}
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-4 w-full">
                    {/* Big Icon */}
                    <div className="flex-shrink-0 -ml-1 transition-transform duration-300" style={{ transform: expanded ? 'scale(1.2)' : 'scale(1)' }}>
                        {weather && <RealisticIcon code={weather.currentCode} />}
                    </div>
                    
                    {/* Current Stats & Info */}
                    <div className="flex-1 flex items-center gap-4">
                        <span className={`text-2xl font-light tracking-tight leading-none ${tempClass}`}>
                            {weather?.currentTemp}°
                        </span>
                        
                        {/* Region & Desc - Left Aligned for Visibility */}
                        {expanded && (
                            <div className="flex flex-col items-start animate-[fadeIn_0.4s_ease-out] flex-1 min-w-0">
                                <span className={`text-[9px] font-bold uppercase tracking-widest ${textPrimary} truncate w-full`}>
                                    {weather?.city}
                                </span>
                                <span className={`text-[8px] font-medium opacity-60 ${textPrimary} truncate w-full mt-0.5`}>
                                    {getWeatherDescription(weather?.currentCode || 0)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Chevron (Hidden when expanded to cleaner look) */}
                {!expanded && (
                    <div className={`ml-4 ${textSecondary}`}>
                         <span className="material-symbols-outlined !text-[20px]">expand_more</span>
                    </div>
                )}
            </div>
                
            {/* EXPANDED CONTENT: FULL WIDTH LIST */}
            {expanded && (
                 <div className="flex flex-col w-full pb-4 animate-[fadeIn_0.5s_ease-out] relative z-10">
                    {/* Divider */}
                    <div className={`w-full h-px mb-2 opacity-10 ${isDarkMode ? 'bg-white' : 'bg-black'}`}></div>
                    
                    <div className="px-2 flex flex-col gap-1">
                        {weather?.daily.slice(0, 5).map((day, idx) => (
                            <div key={idx} className="flex items-center justify-between w-full py-2.5 px-3 hover:bg-white/5 rounded-xl transition-all group cursor-default">
                                
                                {/* 1. Day Name (Left) */}
                                <div className="flex-1 flex items-center">
                                    <span className={`text-[12px] font-bold tracking-tight ${textPrimary} ${idx === 0 ? 'opacity-100' : 'opacity-60'}`}>
                                        {day.dayName}
                                    </span>
                                </div>
                                
                                {/* 2. Icon (Center - Absolute styling for alignment) */}
                                <div className="w-10 flex justify-center">
                                    <div className="scale-90 transform transition-transform group-hover:scale-110">
                                        <RealisticIcon code={day.weatherCode} size="small" />
                                    </div>
                                </div>
                                
                                {/* 3. Temps (Right) */}
                                <div className="flex-1 flex justify-end items-center gap-3">
                                    <span className={`text-sm font-bold tabular-nums ${textPrimary}`}>{day.maxTemp}°</span>
                                    <span className={`text-sm opacity-40 tabular-nums font-medium ${textPrimary}`}>{day.minTemp}°</span>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>
            )}
        </GlassCard>
    </div>
  );
};
