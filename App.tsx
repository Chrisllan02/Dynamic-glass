
import React, { useState, useEffect, useRef } from 'react';
import { AnimatedBackground } from './components/AnimatedBackground';
import { Clock } from './components/Clock';
import { SearchBar } from './components/SearchBar';
import { InfoCarousel } from './components/InfoCarousel';
import { QuickLinks } from './components/QuickLinks';
import { Header } from './components/Header';
import { FocusGoal } from './components/FocusGoal';
import { SmartWidget } from './components/SmartWidget';
import { DynamicIsland } from './components/DynamicIsland'; 
import { OnboardingOverlay } from './components/OnboardingOverlay'; 
import { GuidedTour } from './components/GuidedTour'; 
import { ThemeId, QuickLink, ClockConfig, AnimationStyle, ModuleId, ZoneId, LayoutConfig, ModuleConfig, IslandConfig } from './types';
import { storage, STORAGE_KEYS } from './services/storageService';
import { uiSounds } from './services/soundService';

declare var chrome: any;

const AVAILABLE_THEMES: ThemeId[] = ['default', 'retro', 'fresh', 'chroma', 'waves', 'minimal', 'nordic', 'holo', 'weather', 'book', 'liquid'];

const DEFAULT_LINKS: QuickLink[] = [
  { id: '1', name: 'Gmail', url: 'https://mail.google.com' },
  { id: '2', name: 'YouTube', url: 'https://youtube.com' },
  { id: '3', name: 'GitHub', url: 'https://github.com' },
  { id: '4', name: 'LinkedIn', url: 'https://linkedin.com' }
];

const DEFAULT_CLOCK_CONFIG: ClockConfig = {
  format: '24h',
  scale: 1,
  position: 'center',
  fontWeight: 'black', 
  font: 'inter', 
  colorMode: 'theme',
  fontSize: 'large'
};

const DEFAULT_LAYOUT: LayoutConfig = {
  'top-left': ['weather'], 
  'top-right': [],
  'bottom-left': [],
  'bottom-right': []
};

const DEFAULT_MODULE_CONFIG: ModuleConfig = {
  weather: 'widget',
  planner: 'off',
  calendar: 'off',
  todo: 'off',
  reminders: 'off',      
  soundscapes: 'off', 
  pomodoro: 'off',
  notes: 'off',
  quote: 'off',
  horoscope: 'off',
  tech: 'off',
  breathe: 'off'
};

const DEFAULT_ISLAND_CONFIG: IslandConfig = {
    enabledApps: ['music', 'focus-timer', 'calculator', 'translate', 'camera', 'calendar']
};

interface DraggableWidgetProps {
  id: ModuleId;
  isDarkMode: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  children: React.ReactNode;
}

const DraggableWidget: React.FC<DraggableWidgetProps> = ({ id, isDarkMode, onDragStart, onDragEnd, children }) => {
  return (
    <div 
      draggable={true}
      data-widget-id={id}
      onDragStart={(e) => {
        // Prevent dragging if interacting with inputs, textareas, or scrollbars
        const target = e.target as HTMLElement;
        if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(target.tagName) || target.isContentEditable) {
            e.preventDefault();
            return;
        }
        
        uiSounds.click();
        onDragStart();
        e.dataTransfer.setData('widgetId', id);
        e.dataTransfer.effectAllowed = 'move';
        
        // Visual feedback
        e.currentTarget.style.opacity = '0.4';
        e.currentTarget.style.transform = 'scale(0.95)';
      }}
      onDragEnd={(e) => {
         onDragEnd();
         e.currentTarget.style.opacity = '1';
         e.currentTarget.style.transform = 'scale(1)';
      }}
      className={`
        relative group/drag transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)] rounded-[24px] z-0
        hover:z-10
      `}
    >
      {/* Hover Drag Handle Indicator */}
      <div className={`
        absolute -top-3 left-1/2 -translate-x-1/2 
        w-12 h-1.5 rounded-full 
        opacity-0 group-hover/drag:opacity-100 transition-all duration-300
        z-30 cursor-grab active:cursor-grabbing
        ${isDarkMode ? 'bg-white/20 hover:bg-white/40' : 'bg-black/10 hover:bg-black/30'}
        pointer-events-none group-hover/drag:pointer-events-auto
      `}></div>
      
      <div>
         {children}
      </div>
    </div>
  );
};

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false); 
  const [showTour, setShowTour] = useState(false); 
  
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>('fresh');
  const [displayTheme, setDisplayTheme] = useState<ThemeId>('fresh');
  const [isThemeTransitioning, setIsThemeTransitioning] = useState(false);

  // Forced Dark Mode
  const isDarkMode = true;

  const [animationOverride, setAnimationOverride] = useState<AnimationStyle>('auto');
  const [moduleConfig, setModuleConfig] = useState<ModuleConfig>(DEFAULT_MODULE_CONFIG);
  const [islandConfig, setIslandConfig] = useState<IslandConfig>(DEFAULT_ISLAND_CONFIG);
  const [showQuickLinks, setShowQuickLinks] = useState(false);
  
  const [focusMode, setFocusMode] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [focusGoal, setFocusGoal] = useState('');
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>(DEFAULT_LINKS);
  const [clockConfig, setClockConfig] = useState<ClockConfig>(DEFAULT_CLOCK_CONFIG);
  const [layout, setLayout] = useState<LayoutConfig>(DEFAULT_LAYOUT);
  
  // Dragging State
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverZone, setDragOverZone] = useState<ZoneId | null>(null);
  
  const [userName, setUserName] = useState('');
  // Removed isEditMode state as it is now implicit
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [blurStrength, setBlurStrength] = useState(45); 

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync missing widgets to layout when enabled
  useEffect(() => {
    if (!loaded) return;

    const activeWidgetIds = (Object.keys(moduleConfig) as ModuleId[]).filter(
        id => moduleConfig[id] === 'widget'
    );

    setLayout(prevLayout => {
        const currentIds = Object.values(prevLayout).flat();
        const missingIds = activeWidgetIds.filter(id => !currentIds.includes(id));

        if (missingIds.length === 0) return prevLayout;

        // Add missing widgets to top-right by default to balance the layout
        const newLayout = { ...prevLayout };
        newLayout['top-right'] = [...newLayout['top-right'], ...missingIds];
        
        return newLayout;
    });
  }, [moduleConfig, loaded]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'f' || e.key === 'F')) {
            e.preventDefault();
            setFocusMode(prev => !prev);
        }
        if (e.key === 'z' || e.key === 'Z') {
            if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                setZenMode(prev => !prev);
                uiSounds.toggleOn();
            }
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === '.' || e.key === '>')) {
            e.preventDefault();
            const settingsBtn = document.querySelector('#header-settings-btn button') as HTMLButtonElement;
            if (settingsBtn) settingsBtn.click();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        // --- ONBOARDING LOGIC UPDATE ---
        let onboardingDone = await storage.get<boolean>(STORAGE_KEYS.ONBOARDING_COMPLETED);
        
        // If onboarding flag is missing, assume it's done (as per user request)
        if (!onboardingDone) {
            await storage.set(STORAGE_KEYS.ONBOARDING_COMPLETED, true);
            await storage.set(STORAGE_KEYS.USER_NAME, 'Visitante');
            onboardingDone = true;
        }

        if (onboardingDone) {
            const savedName = await storage.get<string>(STORAGE_KEYS.USER_NAME);
            if (savedName) setUserName(savedName);
        }

        const tourCompleted = await storage.get<boolean>(STORAGE_KEYS.TOUR_COMPLETED);
        if (!tourCompleted && onboardingDone) { 
             setTimeout(() => setShowTour(true), 1500);
        }
        const savedTheme = await storage.get<ThemeId>(STORAGE_KEYS.THEME);
        if (savedTheme) {
          setSelectedTheme(savedTheme);
          if (savedTheme !== 'mix') setDisplayTheme(savedTheme);
        } else {
          setSelectedTheme('fresh');
          setDisplayTheme('fresh');
        }
        // Removed dark mode loading
        const savedAnim = await storage.get<AnimationStyle>(STORAGE_KEYS.ANIMATION);
        if (savedAnim) setAnimationOverride(savedAnim);
        
        // --- LINKS LOADING LOGIC ---
        const savedLinks = await storage.get<QuickLink[]>(STORAGE_KEYS.LINKS);
        if (savedLinks && savedLinks.length > 0) {
          setQuickLinks(savedLinks);
        } else {
          if (typeof chrome !== 'undefined' && chrome.topSites) {
            chrome.topSites.get((sites: any[]) => {
              if (sites && sites.length > 0) {
                const fetchedLinks = sites.slice(0, 8).map((s, i) => ({
                  id: `ts-${i}`,
                  name: s.title || 'Site',
                  url: s.url
                }));
                setQuickLinks(fetchedLinks);
                storage.set(STORAGE_KEYS.LINKS, fetchedLinks);
              } else {
                setQuickLinks(DEFAULT_LINKS);
              }
            });
          } else {
            setQuickLinks(DEFAULT_LINKS);
          }
        }

        const savedShowLinks = await storage.get<boolean>(STORAGE_KEYS.SHOW_LINKS);
        if (savedShowLinks !== null) setShowQuickLinks(savedShowLinks);
        const savedClock = await storage.get<ClockConfig>(STORAGE_KEYS.CLOCK_CONFIG);
        if (savedClock) setClockConfig({...DEFAULT_CLOCK_CONFIG, ...savedClock});
        const savedLayout = await storage.get<LayoutConfig>(STORAGE_KEYS.LAYOUT_CONFIG);
        if (savedLayout) setLayout(savedLayout);
        const savedModules = await storage.get<ModuleConfig>(STORAGE_KEYS.MODULE_CONFIG);
        if (savedModules) setModuleConfig({...DEFAULT_MODULE_CONFIG, ...savedModules});
        const savedIsland = await storage.get<IslandConfig>(STORAGE_KEYS.ISLAND_CONFIG);
        if (savedIsland) setIslandConfig({...DEFAULT_ISLAND_CONFIG, ...savedIsland});
        const savedBlur = await storage.get<number>(STORAGE_KEYS.GLASS_BLUR);
        if (savedBlur !== null) setBlurStrength(savedBlur);
      } catch (error) {
        console.error("Failed to load preferences:", error);
      } finally {
        setLoaded(true);
      }
    };
    loadPreferences();
  }, []);

  const handleOnboardingComplete = (name: string, theme: ThemeId, startTour: boolean = true) => {
    setUserName(name);
    storage.set(STORAGE_KEYS.USER_NAME, name);
    handleThemeChange(theme);
    storage.set(STORAGE_KEYS.ONBOARDING_COMPLETED, true);
    setShowOnboarding(false);
    if (startTour) {
        setTimeout(() => setShowTour(true), 500);
    } else {
        storage.set(STORAGE_KEYS.TOUR_COMPLETED, true);
    }
  };

  const handleTourComplete = () => {
    setShowTour(false);
    storage.set(STORAGE_KEYS.TOUR_COMPLETED, true);
  };
  
  const restartTour = () => {
    setShowTour(true);
  };

  useEffect(() => {
     if (selectedTheme === 'default') {
         document.body.style.backgroundColor = 'transparent';
         document.documentElement.style.backgroundColor = 'transparent';
     } else {
         document.body.style.backgroundColor = isDarkMode ? '#0f172a' : '#f8fafc';
         document.documentElement.style.backgroundColor = isDarkMode ? '#0f172a' : '#f8fafc';
     }
  }, [isDarkMode, selectedTheme]);

  useEffect(() => {
      document.documentElement.style.setProperty('--glass-blur', `${blurStrength}px`);
  }, [blurStrength]);

  // Removed dark mode storage effect
  useEffect(() => { if (loaded) storage.set(STORAGE_KEYS.ANIMATION, animationOverride); }, [animationOverride, loaded]);
  useEffect(() => { if (loaded) storage.set(STORAGE_KEYS.LINKS, quickLinks); }, [quickLinks, loaded]);
  useEffect(() => { if (loaded) storage.set(STORAGE_KEYS.SHOW_LINKS, showQuickLinks); }, [showQuickLinks, loaded]);
  useEffect(() => { if (loaded) storage.set(STORAGE_KEYS.CLOCK_CONFIG, clockConfig); }, [clockConfig, loaded]);
  useEffect(() => { if (loaded) storage.set(STORAGE_KEYS.LAYOUT_CONFIG, layout); }, [layout, loaded]);
  useEffect(() => { if (loaded) storage.set(STORAGE_KEYS.MODULE_CONFIG, moduleConfig); }, [moduleConfig, loaded]);
  useEffect(() => { if (loaded) storage.set(STORAGE_KEYS.ISLAND_CONFIG, islandConfig); }, [islandConfig, loaded]);
  useEffect(() => { if (loaded) storage.set(STORAGE_KEYS.USER_NAME, userName); }, [userName, loaded]);
  useEffect(() => { if (loaded) storage.set(STORAGE_KEYS.GLASS_BLUR, blurStrength); }, [blurStrength, loaded]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    if (selectedTheme === 'mix') {
      let currentIndex = 0;
      const rotateTheme = () => {
        currentIndex = (currentIndex + 1) % AVAILABLE_THEMES.length;
        const rotationThemes = AVAILABLE_THEMES.filter(t => t !== 'mix' && t !== 'weather');
        setDisplayTheme(rotationThemes[currentIndex % rotationThemes.length]);
      };
      intervalId = setInterval(rotateTheme, 10000);
    } else {
      setDisplayTheme(selectedTheme);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [selectedTheme]);

  const handleThemeChange = (theme: ThemeId) => {
    if (theme === selectedTheme) return;
    setIsThemeTransitioning(true);
    setSelectedTheme(theme);
    if (loaded) storage.set(STORAGE_KEYS.THEME, theme);
    setTimeout(() => {
        setDisplayTheme(theme);
        setTimeout(() => setIsThemeTransitioning(false), 50);
    }, 600); 
  };

  const handleAddLink = (name: string, url: string, icon?: string) => {
    setQuickLinks([...quickLinks, { id: Date.now().toString(), name, url, icon }]);
  };

  const handleRemoveLink = (id: string) => {
    setQuickLinks(quickLinks.filter(link => link.id !== id));
  };

  const handleReorderLink = (id: string, direction: 'up' | 'down') => {
    const index = quickLinks.findIndex(l => l.id === id);
    if (index === -1) return;
    const newLinks = [...quickLinks];
    if (direction === 'up' && index > 0) [newLinks[index], newLinks[index - 1]] = [newLinks[index - 1], newLinks[index]];
    else if (direction === 'down' && index < newLinks.length - 1) [newLinks[index], newLinks[index + 1]] = [newLinks[index + 1], newLinks[index]];
    setQuickLinks(newLinks);
  };

  const handleDragStart = () => setIsDragging(true);
  const handleDragEnd = () => { setIsDragging(false); setDragOverZone(null); };
  const handleDragOver = (e: React.DragEvent, zoneId: ZoneId) => { 
      if (!isDragging) return; 
      e.preventDefault(); 
      if (dragOverZone !== zoneId) setDragOverZone(zoneId); 
  };
  const handleDragLeave = (e: React.DragEvent, zoneId: ZoneId) => { e.preventDefault(); setDragOverZone(null); };
  
  const handleDrop = (e: React.DragEvent, targetZone: ZoneId) => {
    e.preventDefault();
    if (!isDragging) return;
    const widgetId = e.dataTransfer.getData('widgetId') as ModuleId;
    handleDragEnd();
    if (!widgetId) return;
    let sourceZone: ZoneId | undefined;
    Object.entries(layout).forEach(([zone, widgets]) => { if ((widgets as ModuleId[]).includes(widgetId)) sourceZone = zone as ZoneId; });
    if (!sourceZone) return;
    const dropTarget = e.target as HTMLElement;
    const closestWidget = dropTarget.closest('[data-widget-id]');
    const newLayout = { ...layout };
    newLayout[sourceZone] = newLayout[sourceZone].filter(w => w !== widgetId);
    if (closestWidget) {
        const targetWidgetId = closestWidget.getAttribute('data-widget-id') as ModuleId;
        const targetIndex = newLayout[targetZone].indexOf(targetWidgetId);
        if (targetIndex !== -1) {
            const rect = closestWidget.getBoundingClientRect();
            const offset = e.clientY - rect.top - (rect.height / 2);
            if (offset < 0) newLayout[targetZone].splice(targetIndex, 0, widgetId);
            else newLayout[targetZone].splice(targetIndex + 1, 0, widgetId);
        } else newLayout[targetZone].push(widgetId);
    } else newLayout[targetZone].push(widgetId);
    setLayout(newLayout);
    uiSounds.click(); 
  };

  const renderWidget = (id: ModuleId) => {
    if (moduleConfig[id] !== 'widget') return null;
    return (
        <DraggableWidget key={id} id={id} isDarkMode={isDarkMode} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <SmartWidget id={id} isDarkMode={isDarkMode} mode="widget" focusMode={focusMode} />
        </DraggableWidget>
    );
  };

  const renderZone = (zoneId: ZoneId, extraClasses: string = '') => {
      const isOver = dragOverZone === zoneId;
      // Show dashed border only when dragging
      let zoneClasses = `flex flex-col gap-6 transition-all duration-300 rounded-3xl p-4 min-w-[240px] min-h-[120px] relative ${extraClasses} `;
      
      if (isDragging) {
          zoneClasses += isDarkMode ? 'border-2 border-dashed border-white/20 bg-white/5 ' : 'border-2 border-dashed border-black/10 bg-black/5 ';
          if (isOver) zoneClasses += isDarkMode ? '!border-blue-400/50 !bg-blue-500/10 shadow-xl scale-[1.02]' : '!border-blue-500/50 !bg-blue-500/10 shadow-xl scale-[1.02]';
      }

      const widgetsToRender = layout[zoneId].filter(id => moduleConfig[id] === 'widget');
      
      // If empty and not dragging, collapse slightly but keep layout structure
      if (widgetsToRender.length === 0 && !isDragging) {
          return <div className={`flex flex-col gap-6 p-4 min-w-[240px] min-h-[50px] relative ${extraClasses}`} 
                      onDragOver={(e) => handleDragOver(e, zoneId)} 
                      onDragLeave={(e) => handleDragLeave(e, zoneId)} 
                      onDrop={(e) => handleDrop(e, zoneId)} />;
      }

      return (
        <div className={zoneClasses} onDragOver={(e) => handleDragOver(e, zoneId)} onDragLeave={(e) => handleDragLeave(e, zoneId)} onDrop={(e) => handleDrop(e, zoneId)}>
            {widgetsToRender.map(widgetId => renderWidget(widgetId))}
            {/* Visual placeholder for empty zone when dragging */}
            {widgetsToRender.length === 0 && isDragging && (
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold uppercase opacity-30 tracking-widest pointer-events-none">
                    Soltar aqui
                </div>
            )}
        </div>
      );
  };

  const carouselModules = (Object.keys(moduleConfig) as ModuleId[]).filter(id => moduleConfig[id] === 'carousel');
  const hideInterface = focusMode || zenMode;

  return (
    <main className={`relative w-screen h-screen overflow-hidden smooth-theme-transition selection:bg-blue-500/30 bg-transparent ${isDarkMode ? 'text-white' : 'text-slate-700 light-mode'}`}>
      
      {showOnboarding && <OnboardingOverlay onComplete={handleOnboardingComplete} isDarkMode={isDarkMode} />}
      {showTour && <GuidedTour onComplete={handleTourComplete} isDarkMode={isDarkMode} />}

      <DynamicIsland islandConfig={islandConfig} isDarkMode={isDarkMode} isHidden={zenMode} />

      <div className={`
          absolute inset-0 z-0
          transition-all duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)]
          ${focusMode ? 'brightness-[0.2] saturate-[0.5] blur-[20px] scale-[1.1]' : ''}
          ${zenMode ? 'scale-100 brightness-90' : ''}
          ${isThemeTransitioning ? 'opacity-0 scale-100 blur-2xl' : 'opacity-100 scale-100 blur-0'}
      `}>
         <AnimatedBackground theme={displayTheme} isDarkMode={isDarkMode} animationOverride={selectedTheme === 'mix' ? 'auto' : animationOverride} />
      </div>

      <div className={`absolute top-4 right-6 z-50 flex flex-col items-end gap-4 pointer-events-none transition-all duration-700`}>
          <Header 
            currentTheme={selectedTheme} setTheme={handleThemeChange} isDarkMode={isDarkMode} 
            quickLinks={quickLinks} showQuickLinks={showQuickLinks} setShowQuickLinks={setShowQuickLinks}
            onAddLink={handleAddLink} onRemoveLink={handleRemoveLink} onReorderLink={handleRemoveLink}
            moduleConfig={moduleConfig} setModuleConfig={setModuleConfig}
            islandConfig={islandConfig} setIslandConfig={setIslandConfig}
            clockConfig={clockConfig} setClockConfig={setClockConfig}
            animationOverride={animationOverride} setAnimationOverride={setAnimationOverride}
            toggleFocusMode={() => setFocusMode(!focusMode)} focusMode={focusMode}
            toggleZenMode={() => setZenMode(!zenMode)} zenMode={zenMode}
            userName={userName} setUserName={setUserName}
            onRestartTour={restartTour} 
            blurStrength={blurStrength} setBlurStrength={setBlurStrength}
          />
      </div>

      <div className={`absolute inset-0 z-40 transition-all duration-700 pointer-events-none overflow-y-auto workspace-scroll ${hideInterface ? 'opacity-0' : 'opacity-100'}`}>
          <div className="w-full h-full min-h-screen pt-24 pb-8 px-4 md:px-8 grid grid-cols-1 md:grid-cols-2 gap-8 pointer-events-none">
              <div className="flex flex-col justify-between gap-8 h-full">
                  <div id="intro-widgets-area" className="flex flex-col items-start gap-4 pointer-events-auto">{renderZone('top-left')}</div>
                  <div className="flex flex-col items-start gap-4 pointer-events-auto">{renderZone('bottom-left')}</div>
              </div>
              <div className="flex flex-col justify-between gap-8 h-full">
                  <div className="flex flex-col items-end gap-4 pointer-events-auto">{renderZone('top-right', 'items-end')}</div>
                  <div className="flex flex-col items-end gap-4 pointer-events-auto">{renderZone('bottom-right', 'items-end')}</div>
              </div>
          </div>
      </div>

      <div className={`relative z-10 flex flex-col items-center justify-center w-full h-full transition-all duration-1000 pointer-events-none ${loaded ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-105 blur-2xl'}`}>
        <div className="w-full max-w-5xl px-6 flex flex-col items-center relative pointer-events-auto">
          <div className={`w-full transition-all duration-1000 mb-6 md:mb-10 z-0 ${focusMode ? 'scale-[0.5] -translate-y-[25vh] opacity-0 blur-xl pointer-events-none' : zenMode ? 'scale-125 translate-y-[5vh]' : 'scale-100'}`}>
            <Clock isDarkMode={isDarkMode} config={clockConfig} />
          </div>
          
          {/* FOCUS GOAL OVERLAY - IMPROVED */}
          <div className={`w-full flex justify-center mt-0 z-[100] transition-all duration-1000 absolute top-[10%] left-0 right-0 ${focusMode ? 'opacity-100 pointer-events-auto translate-y-0 scale-100' : 'opacity-0 pointer-events-none translate-y-20 scale-90 blur-xl'}`}>
              <FocusGoal goal={focusGoal} setGoal={setFocusGoal} isDarkMode={isDarkMode} onExit={() => setFocusMode(false)} />
          </div>

          <div className={`w-full flex flex-col items-center gap-6 transition-all duration-700 transform z-10 ${hideInterface ? 'opacity-0 translate-y-20 pointer-events-none blur-md' : 'opacity-100 translate-y-0 blur-0'}`}>
             <div className="w-full"><SearchBar isDarkMode={isDarkMode} /></div>
            {showQuickLinks && <div className="w-full mt-2"><QuickLinks links={quickLinks} isDarkMode={isDarkMode} /></div>}
            {carouselModules.length > 0 && <div className="w-full mt-4"><InfoCarousel isDarkMode={isDarkMode} activeModules={carouselModules} /></div>}
          </div>
        </div>
      </div>
      
      {zenMode && (
          <button onClick={() => setZenMode(false)} className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 transition-all duration-300 pointer-events-auto animate-[fadeIn_1s_ease-out] group">
              <span className="material-symbols-outlined !text-[16px] text-white/50 group-hover:text-white transition-colors">close</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 group-hover:text-white transition-colors">Sair do Modo Zen</span>
          </button>
      )}
    </main>
  );
}
