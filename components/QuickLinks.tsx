
import React, { useState } from 'react';
import { QuickLink } from '../types';
import { GlassCard } from './GlassCard';

interface QuickLinksProps {
  isDarkMode?: boolean;
  links: QuickLink[];
}

export const QuickLinks: React.FC<QuickLinksProps> = ({ isDarkMode = true, links }) => {
  if (links.length === 0) return null;

  const getInitial = (name: string) => name ? name.charAt(0).toUpperCase() : '?';

  const renderIcon = (link: QuickLink) => {
    // 1. Check for defined icon (SVG or Material Symbol Name)
    if (link.icon) {
        if (React.isValidElement(link.icon)) return link.icon;
        if (typeof link.icon === 'string') {
            const trimmedIcon = link.icon.trim();
            
            // Render SVG Path (Heroicons/Custom)
            if (trimmedIcon.startsWith('M') || trimmedIcon.startsWith('m')) {
                return (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d={trimmedIcon} />
                    </svg>
                );
            }
            // Render URL
            if (trimmedIcon.startsWith('http') || trimmedIcon.startsWith('data:')) {
                return (
                    <img src={trimmedIcon} alt={link.name} className="w-6 h-6 object-contain" loading="lazy" />
                );
            }
            // Render Material Symbol Name
            return (
                <span className="material-symbols-outlined !text-[22px]">{trimmedIcon}</span>
            );
        }
    }

    // 2. Favicon Fetching with robust error handling
    const faviconUrl = `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(link.url)}&size=64`;
    
    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <img 
                src={faviconUrl} 
                alt={link.name} 
                className="w-5 h-5 object-contain z-10 group-hover:scale-110 transition-transform duration-300"
                loading="lazy"
                onError={(e) => { 
                    // Hide failed image
                    e.currentTarget.style.display = 'none';
                    // Show fallback initial via CSS selector
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.opacity = '1';
                }}
            />
            {/* Fallback inteligente: Inicial do nome do site */}
            <span 
                className={`absolute inset-0 flex items-center justify-center text-[14px] font-black tracking-tighter opacity-0 transition-opacity ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}
                style={{ opacity: 0 }} // Starts hidden, becomes visible on error
            >
                {getInitial(link.name)}
            </span>
        </div>
    );
  };

  return (
    <div className="flex justify-center w-full pb-2 mt-6 animate-[fadeIn_1s_ease-out]">
        <div className="relative group/dock">
            <GlassCard 
                isDarkMode={isDarkMode}
                className="!rounded-full mx-auto shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)] backdrop-blur-[40px] border-white/20"
            >
                <div className="flex flex-row items-center justify-center gap-4 px-5 py-3">
                    {links.map((link) => (
                        <a
                        key={link.id}
                        href={link.url}
                        target="_self"
                        rel="noreferrer"
                        className="group relative flex flex-col items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] hover:-translate-y-2 hover:scale-110"
                        title={link.name}
                        >
                            <div className={`
                                w-11 h-11 rounded-2xl flex items-center justify-center
                                transition-all duration-500 border
                                ${isDarkMode 
                                    ? 'bg-white/10 border-white/20 group-hover:bg-white/25 group-hover:border-white/50 text-white shadow-lg' 
                                    : 'bg-white/80 border-black/5 group-hover:bg-white group-hover:border-black/10 text-slate-700 shadow-md'
                                }
                            `}>
                                {renderIcon(link)}
                            </div>
                            
                            {/* Label Flutuante */}
                            <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 pointer-events-none z-50">
                                <span className={`text-[9px] font-black uppercase tracking-[0.2em] whitespace-nowrap px-3 py-1.5 rounded-xl backdrop-blur-md shadow-2xl ${isDarkMode ? 'bg-black/90 text-white border border-white/20' : 'bg-white/95 text-slate-900 border border-black/10'}`}>
                                    {link.name}
                                </span>
                            </div>

                            {/* Indicador de Active App */}
                            <div className="absolute -bottom-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-0 group-hover:scale-100">
                                <div className={`w-1.5 h-1.5 rounded-full ${isDarkMode ? 'bg-blue-400 shadow-[0_0_8px_#60a5fa]' : 'bg-blue-600'}`}></div>
                            </div>
                        </a>
                    ))}
                </div>
            </GlassCard>
        </div>
    </div>
  );
};
