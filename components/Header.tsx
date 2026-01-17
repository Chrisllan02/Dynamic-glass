
import React, { useState, useRef, useEffect } from 'react';
import { GoogleAppsMenu } from './GoogleAppsMenu';
import { SettingsMenu } from './SettingsMenu';
import { ThemeId, QuickLink, ClockConfig, AnimationStyle, ModuleConfig, ModuleId, ModuleMode, IslandConfig } from '../types';
import { uiSounds } from '../services/soundService';

interface HeaderProps {
  currentTheme?: ThemeId;
  setTheme?: (theme: ThemeId) => void;
  isDarkMode?: boolean;
  // Removed setIsDarkMode
  
  // Link Props
  quickLinks?: QuickLink[];
  showQuickLinks?: boolean;
  setShowQuickLinks?: (show: boolean) => void;
  onAddLink?: (name: string, url: string, icon?: string) => void;
  onRemoveLink?: (id: string) => void;
  onReorderLink?: (id: string, direction: 'up' | 'down') => void;

  // Module Config
  moduleConfig: ModuleConfig;
  setModuleConfig: (config: ModuleConfig) => void;
  
  // Island Config
  islandConfig: IslandConfig;
  setIslandConfig: (config: IslandConfig) => void;

  // Clock Props
  clockConfig?: ClockConfig;
  setClockConfig?: (config: ClockConfig) => void;

  // Animation Override
  animationOverride?: AnimationStyle;
  setAnimationOverride?: (anim: AnimationStyle) => void;

  // Focus
  toggleFocusMode?: () => void;
  focusMode?: boolean;
  
  // Zen
  toggleZenMode?: () => void;
  zenMode?: boolean;

  // User
  userName?: string;
  setUserName?: (name: string) => void;

  // Tour
  onRestartTour?: () => void;

  // Blur
  blurStrength?: number;
  setBlurStrength?: (val: number) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
    currentTheme, 
    setTheme, 
    isDarkMode = true, 
    quickLinks,
    showQuickLinks,
    setShowQuickLinks,
    onAddLink,
    onRemoveLink,
    onReorderLink,
    moduleConfig,
    setModuleConfig,
    islandConfig,
    setIslandConfig,
    clockConfig,
    setClockConfig,
    animationOverride,
    setAnimationOverride,
    toggleFocusMode,
    focusMode = false,
    toggleZenMode,
    zenMode = false,
    userName = '',
    setUserName,
    onRestartTour,
    blurStrength,
    setBlurStrength
}) => {
  const [isAppsOpen, setIsAppsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const appsRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Auto-collapse menus when Focus Mode toggles
  useEffect(() => {
    if (focusMode) {
        setIsAppsOpen(false);
        setIsSettingsOpen(false);
    }
  }, [focusMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (appsRef.current && !appsRef.current.contains(target)) setIsAppsOpen(false);
      if (settingsRef.current && !settingsRef.current.contains(target)) setIsSettingsOpen(false);
    };

    if (isAppsOpen || isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAppsOpen, isSettingsOpen]);

  const iconColor = isDarkMode ? 'text-white/80 group-hover:text-white' : 'text-slate-600 group-hover:text-white';
  const activeIconColor = isDarkMode ? 'text-white' : 'text-slate-900';
  
  const hoverBg = isDarkMode 
    ? 'hover:bg-white/20 hover:border-white/40 border border-white/10' 
    : 'hover:bg-slate-800 hover:shadow-lg border border-transparent';
    
  const activeBg = isDarkMode 
    ? 'bg-white/30 border-white/50 border' 
    : 'bg-slate-200 border-black/20 border';

  return (
    <header 
        className={`
            absolute top-4 right-6 z-50 flex flex-col items-end gap-4 transition-all duration-700
            ${focusMode ? 'opacity-0 pointer-events-none -translate-y-4' : 'opacity-100 pointer-events-auto translate-y-0'}
        `}
    >
        <div className="flex items-center gap-2 animate-[fadeIn_1s_ease-out] pointer-events-auto">
          
          {/* Settings */}
          <div className="relative" ref={settingsRef} id="header-settings-btn">
              <button 
                onClick={() => { setIsSettingsOpen(!isSettingsOpen); setIsAppsOpen(false); }}
                className={`p-3 rounded-full transition-all duration-300 group focus:outline-none flex items-center justify-center ${isSettingsOpen ? `${activeBg} rotate-90` : `${hoverBg} hover:rotate-45`}`}
                title="Configurações"
              >
                 <span className={`material-symbols-outlined !text-[24px] transition-colors ${isSettingsOpen ? activeIconColor : iconColor}`}>settings</span>
              </button>

              {isSettingsOpen && currentTheme && setTheme && (
                <div className="absolute top-full right-0 mt-4 origin-top-right animate-[fadeIn_0.2s_ease-out] z-50">
                   <SettingsMenu 
                     currentTheme={currentTheme} 
                     setTheme={setTheme} 
                     isDarkMode={isDarkMode} 
                     quickLinks={quickLinks || []}
                     showQuickLinks={!!showQuickLinks}
                     setShowQuickLinks={setShowQuickLinks || (() => {})}
                     onAddLink={onAddLink || (() => {})}
                     onRemoveLink={onRemoveLink || (() => {})}
                     onReorderLink={onReorderLink || (() => {})}
                     moduleConfig={moduleConfig}
                     setModuleConfig={setModuleConfig}
                     islandConfig={islandConfig}
                     setIslandConfig={setIslandConfig}
                     clockConfig={clockConfig}
                     setClockConfig={setClockConfig || (() => {})}
                     animationOverride={animationOverride}
                     setAnimationOverride={setAnimationOverride || (() => {})}
                     toggleFocusMode={toggleFocusMode || (() => {})}
                     focusMode={focusMode}
                     toggleZenMode={toggleZenMode}
                     zenMode={zenMode}
                     userName={userName}
                     setUserName={setUserName}
                     onRestartTour={onRestartTour}
                     blurStrength={blurStrength}
                     setBlurStrength={setBlurStrength}
                   />
                </div>
              )}
          </div>

          {/* Google Apps */}
          <div className="relative" ref={appsRef} id="header-apps-btn">
            <button 
              onClick={() => { setIsAppsOpen(!isAppsOpen); setIsSettingsOpen(false); }}
              className={`p-3 rounded-full transition-all duration-300 group focus:outline-none flex items-center justify-center ${isAppsOpen ? activeBg : hoverBg}`}
              title="Google Apps"
            >
              <span className={`material-symbols-outlined !text-[24px] transition-colors ${isAppsOpen ? activeIconColor : iconColor}`}>apps</span>
            </button>

            {isAppsOpen && (
              <div className="absolute top-full right-0 mt-4 origin-top-right animate-[fadeIn_0.2s_ease-out] z-50">
                <GoogleAppsMenu isDarkMode={isDarkMode} />
              </div>
            )}
          </div>

          {/* Avatar */}
          <div className="relative group cursor-pointer ml-2">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full opacity-0 group-hover:opacity-75 blur transition duration-500"></div>
            <div className={`relative h-9 w-9 rounded-full overflow-hidden border-2 border-transparent group-hover:border-white/50 transition-all ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'} flex items-center justify-center`}>
                <img 
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName || 'User')}&background=${isDarkMode ? '334155' : 'cbd5e1'}&color=${isDarkMode ? 'fff' : '1e293b'}&font-size=0.5&bold=true`}
                    alt="User" 
                    className="h-full w-full object-cover opacity-90 group-hover:opacity-100" 
                />
            </div>
          </div>
        </div>
    </header>
  );
};
