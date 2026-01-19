
import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from './GlassCard';
import { ThemeId, QuickLink, ClockConfig, AnimationStyle, ModuleConfig, ModuleId, IslandConfig, IslandAppId } from '../types';
import { storage, STORAGE_KEYS } from '../services/storageService';
import { uiSounds, refreshSoundSettings } from '../services/soundService';

declare var chrome: any;

interface SettingsMenuProps {
  currentTheme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  isDarkMode: boolean;
  quickLinks: QuickLink[];
  showQuickLinks: boolean;
  setShowQuickLinks: (show: boolean) => void;
  onAddLink: (name: string, url: string, icon?: string) => void;
  onRemoveLink: (id: string) => void;
  onRemoveLinkFromList?: (id: string) => void;
  onReorderLink: (id: string, direction: 'up' | 'down') => void;
  moduleConfig: ModuleConfig;
  setModuleConfig: (config: ModuleConfig) => void;
  islandConfig: IslandConfig;
  setIslandConfig: (config: IslandConfig) => void;
  clockConfig?: ClockConfig;
  setClockConfig?: (config: ClockConfig) => void;
  animationOverride: AnimationStyle;
  setAnimationOverride: (anim: AnimationStyle) => void;
  toggleFocusMode: () => void;
  focusMode?: boolean;
  toggleZenMode?: () => void;
  zenMode?: boolean;
  userName?: string;
  setUserName?: (name: string) => void;
  onRestartTour?: () => void;
  blurStrength?: number;
  setBlurStrength?: (val: number) => void;
}

const APP_VERSION = "3.9.0";

type TabOption = 'general' | 'visual' | 'widgets' | 'island' | 'ia';

const THEME_LABELS: Record<ThemeId, string> = {
  liquid: 'Liquid',
  default: 'Magma',
  fresh: 'Candy', 
  nordic: 'Arctic',
  chroma: 'Grid',
  waves: 'Ocean',
  minimal: 'Glass',
  holo: 'Aurora',
  retro: 'Ballpit',
  mix: 'Shuffle',
  weather: 'Tempo',
  book: 'Space'
};

// CSS Patterns that mimic the 3D/Canvas scenes accurately
const THEME_PREVIEWS: Record<ThemeId, string> = {
  liquid: 'linear-gradient(135deg, #000 0%, #1e1b4b 40%, #4338ca 70%, #ec4899 100%)',
  default: 'radial-gradient(circle at 50% 120%, #f55702 0%, #7c2d12 40%, #000 80%)',
  nordic: 'linear-gradient(to top, #1e90ff 0%, #39d24a 100%)',
  fresh: 'linear-gradient(135deg, #d8b4fe 0%, #f0abfc 50%, #86efac 100%)', 
  chroma: 'linear-gradient(135deg, #2e1065 0%, #000000 50%, #c026d3 100%)',
  waves: 'linear-gradient(180deg, #22d3ee 0%, #0ea5e9 50%, #1e3a8a 100%)',
  minimal: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 50%, #94a3b8 100%)',
  holo: 'linear-gradient(90deg, #3A29FF, #FF94B4, #22c55e)',
  retro: 'radial-gradient(circle at 30% 30%, #ef4444 0%, #ef4444 20%, transparent 21%), radial-gradient(circle at 70% 60%, #3b82f6 0%, #3b82f6 20%, transparent 21%), radial-gradient(circle at 40% 80%, #eab308 0%, #eab308 20%, transparent 21%), #111',
  book: 'radial-gradient(circle, #fff 0.5px, transparent 0.5px) 0 0 / 8px 8px, #000',
  mix: 'conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444)',
  weather: 'linear-gradient(to bottom, #60a5fa 0%, #bfdbfe 50%, #eff6ff 100%)',
};

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ 
    currentTheme, setTheme, isDarkMode, 
    quickLinks, showQuickLinks, setShowQuickLinks,
    moduleConfig, setModuleConfig, islandConfig, setIslandConfig,
    clockConfig, setClockConfig, animationOverride, setAnimationOverride,
    toggleFocusMode, focusMode = false, toggleZenMode, zenMode = false,
    userName = '', setUserName, onRestartTour, blurStrength = 45, setBlurStrength
}) => {
  const [activeTab, setActiveTab] = useState<TabOption>('general');
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // API Key State
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savedKeyMasked, setSavedKeyMasked] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  useEffect(() => {
      storage.get<boolean>(STORAGE_KEYS.UI_SOUNDS).then(enabled => setSoundEnabled(enabled !== false));
      
      // Load stored API key
      storage.get<string>(STORAGE_KEYS.USER_API_KEY).then(key => {
          if (key) {
              setSavedKeyMasked(key.slice(0, 4) + '...' + key.slice(-4));
              setShowKeyInput(false);
          } else {
              setShowKeyInput(true);
          }
      });
  }, []);

  const handleSaveApiKey = async () => {
      uiSounds.click();
      if (!apiKeyInput.trim()) return;
      
      await storage.set(STORAGE_KEYS.USER_API_KEY, apiKeyInput.trim());
      setSavedKeyMasked(apiKeyInput.slice(0, 4) + '...' + apiKeyInput.slice(-4));
      setApiKeyInput('');
      setShowKeyInput(false);
      
      window.dispatchEvent(new Event('lumina-apikey-changed')); // Notify components
      uiSounds.success();
  };

  const handleClearApiKey = async () => {
      uiSounds.click();
      await storage.remove(STORAGE_KEYS.USER_API_KEY);
      setSavedKeyMasked('');
      setShowKeyInput(true);
      window.dispatchEvent(new Event('lumina-apikey-changed'));
  };

  const handleSoundToggle = () => { 
      const newState = !soundEnabled; 
      setSoundEnabled(newState); 
      storage.set(STORAGE_KEYS.UI_SOUNDS, newState).then(() => {
          refreshSoundSettings();
          if (newState) uiSounds.toggleOn(); else uiSounds.toggleOff();
      });
  };

  const styles = {
    text: isDarkMode ? 'text-white' : 'text-slate-900',
    textDim: isDarkMode ? 'text-white/60' : 'text-slate-500',
    input: isDarkMode ? 'bg-black/40 border-white/20 text-white focus:border-blue-500/50' : 'bg-white border-black/10 text-slate-900 focus:border-blue-500/50',
    divider: isDarkMode ? 'border-white/10' : 'border-black/5',
    tabActive: isDarkMode ? 'bg-white/20 text-white border-white/30' : 'bg-white text-blue-600 shadow-sm border-black/5',
  };

  const ModuleToggle = ({ id, label }: { id: ModuleId, label: string }) => {
    const mode = moduleConfig[id];
    return (
      <div className={`flex items-center justify-between py-3 border-b ${styles.divider}`}>
        <span className={`text-xs font-medium ${styles.text}`}>{label}</span>
        <div className="glass-radio-group scale-[0.8] origin-right">
           <input type="radio" name={`glass-${id}`} id={`silver-${id}`} checked={mode === 'off'} onChange={() => { uiSounds.click(); setModuleConfig({...moduleConfig, [id]: 'off'}); }} />
           <label htmlFor={`silver-${id}`}>Off</label>
           <input type="radio" name={`glass-${id}`} id={`gold-${id}`} checked={mode === 'widget'} onChange={() => { uiSounds.click(); setModuleConfig({...moduleConfig, [id]: 'widget'}); }} />
           <label htmlFor={`gold-${id}`}>Fix</label>
           <input type="radio" name={`glass-${id}`} id={`platinum-${id}`} checked={mode === 'carousel'} onChange={() => { uiSounds.click(); setModuleConfig({...moduleConfig, [id]: 'carousel'}); }} />
           <label htmlFor={`platinum-${id}`}>Roll</label>
           <div className="glass-glider"></div>
        </div>
      </div>
    );
  };

  const IslandAppToggle = ({ id, label }: { id: IslandAppId, label: string }) => {
    const isEnabled = islandConfig.enabledApps.includes(id);
    return (
      <div className={`flex items-center justify-between py-3 border-b ${styles.divider}`}>
        <span className={`text-xs font-medium ${styles.text}`}>{label}</span>
        <button 
          onClick={() => {
            uiSounds.click();
            const newEnabled = isEnabled 
              ? islandConfig.enabledApps.filter(app => app !== id)
              : [...islandConfig.enabledApps, id];
            setIslandConfig({ ...islandConfig, enabledApps: newEnabled });
          }}
          className={`w-10 h-5 rounded-full transition-all relative ${isEnabled ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]' : 'bg-white/10 border border-white/10'}`}
        >
          <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all ${isEnabled ? 'left-5.5' : 'left-0.5'}`} style={{ left: isEnabled ? '22px' : '2px' }}></div>
        </button>
      </div>
    );
  };

  return (
    <GlassCard isDarkMode={isDarkMode} className="w-[420px] h-[640px] !p-0 overflow-hidden shadow-2xl backdrop-blur-[60px] border-white/20">
      <div className="flex flex-col h-full">
        <div className={`p-6 border-b ${styles.divider} bg-white/[0.03]`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-xl font-bold tracking-tight ${styles.text}`}>Ajustes</h2>
            <span className={`text-[10px] font-mono opacity-40 ${styles.text}`}>v{APP_VERSION}</span>
          </div>
          <div className="flex p-1 bg-black/20 rounded-2xl border border-white/5 overflow-x-auto hide-scrollbar">
            {(['general', 'visual', 'widgets', 'island', 'ia'] as TabOption[]).map(t => (
              <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 min-w-[60px] py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${activeTab === t ? styles.tabActive : styles.textDim}`}>
                {t === 'general' ? 'Geral' : t === 'visual' ? 'Visual' : t === 'widgets' ? 'Widg' : t === 'ia' ? 'IA' : 'Ilha'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 glass-scroll">
          {activeTab === 'general' && (
            <div className="space-y-8 animate-[fadeIn_0.4s]">
              <div className="space-y-4">
                 <label className={`text-[10px] font-bold uppercase tracking-widest ${styles.textDim}`}>Preferências</label>
                 
                 <div className={`flex items-center justify-between p-4 rounded-2xl bg-black/10 border ${styles.divider}`}>
                    <div className="flex flex-col">
                        <span className={`text-sm font-medium ${styles.text}`}>Sons da Interface</span>
                        <span className={`text-[10px] ${styles.textDim}`}>Cliques e efeitos sonores</span>
                    </div>
                    <div className="pr-2">
                        <button onClick={handleSoundToggle} className={`w-12 h-6 rounded-full transition-all relative ${soundEnabled ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'bg-white/10'}`}>
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${soundEnabled ? 'left-7' : 'left-1'}`}></div>
                        </button>
                    </div>
                 </div>

                 <div className={`flex items-center justify-between p-4 rounded-2xl bg-black/10 border ${styles.divider}`}>
                    <div className="flex flex-col">
                        <span className={`text-sm font-medium ${styles.text}`}>Atalhos Rápidos</span>
                        <span className={`text-[10px] ${styles.textDim}`}>Exibir dock de links no centro</span>
                    </div>
                    <div className="pr-2">
                        <button onClick={() => { uiSounds.click(); setShowQuickLinks(!showQuickLinks); }} className={`w-12 h-6 rounded-full transition-all relative ${showQuickLinks ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'bg-white/10'}`}>
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${showQuickLinks ? 'left-7' : 'left-1'}`}></div>
                        </button>
                    </div>
                 </div>

                 <div className={`flex items-center justify-between p-4 rounded-2xl bg-black/10 border ${styles.divider}`}>
                    <div className="flex flex-col">
                        <span className={`text-sm font-medium ${styles.text}`}>Guia de Usuário</span>
                        <span className={`text-[10px] ${styles.textDim}`}>Reiniciar o tour interativo</span>
                    </div>
                    <div className="pr-2">
                        <button onClick={onRestartTour} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase bg-white/10 hover:bg-white/20 transition-all ${styles.text} border border-white/5`}>Iniciar</button>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'visual' && (
            <div className="space-y-8 animate-[fadeIn_0.4s]">
              <div className="space-y-4">
                <label className={`text-[10px] font-bold uppercase tracking-widest ${styles.textDim}`}>Temas Líquidos</label>
                <div className="grid grid-cols-3 gap-y-4 gap-x-2">
                  {(['liquid', 'default', 'nordic', 'fresh', 'chroma', 'waves', 'minimal', 'holo', 'retro', 'book'] as ThemeId[]).map(t => (
                    <div key={t} className="flex flex-col items-center gap-1.5 group">
                      <button 
                        onClick={() => setTheme(t)} 
                        className={`w-full aspect-[2.2/1] rounded-full border-2 transition-all relative overflow-hidden ${currentTheme === t ? 'border-blue-500 scale-105 shadow-[0_0_12px_rgba(59,130,246,0.4)]' : 'border-white/10 opacity-70 hover:opacity-100 hover:scale-105'}`}
                      >
                        <div 
                          className="absolute inset-0 transition-transform duration-500 group-hover:scale-110 rounded-full" 
                          style={{ background: THEME_PREVIEWS[t] }} 
                        />
                        <div className="absolute inset-0 rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),inset_0_-2px_4px_rgba(0,0,0,0.2)] pointer-events-none" />
                        {currentTheme === t && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] rounded-full">
                                <span className="material-symbols-outlined text-white !text-[14px] font-bold">check</span>
                            </div>
                        )}
                      </button>
                      <span className={`text-[7px] font-bold uppercase tracking-tighter text-center leading-none transition-colors truncate w-full px-0.5 ${currentTheme === t ? 'text-blue-400' : styles.textDim}`}>{THEME_LABELS[t]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'widgets' && (
            <div className="space-y-4 animate-[fadeIn_0.4s]">
              <label className={`text-[10px] font-bold uppercase tracking-widest ${styles.textDim} mb-2 block`}>Gerenciar Módulos</label>
              <div className="space-y-1">
                <ModuleToggle id="weather" label="Clima & Tempo" />
                <ModuleToggle id="planner" label="Planejador Unificado" />
                <ModuleToggle id="quote" label="Inspiração Diária" />
              </div>
            </div>
          )}
          {activeTab === 'island' && (
            <div className="space-y-4 animate-[fadeIn_0.4s]">
              <label className={`text-[10px] font-bold uppercase tracking-widest ${styles.textDim} mb-2 block`}>Configurar Ilha Dinâmica</label>
              <div className="space-y-1">
                <IslandAppToggle id="music" label="Player de Música" />
                <IslandAppToggle id="focus-timer" label="Timer de Foco" />
                <IslandAppToggle id="calendar" label="Agenda" />
                <IslandAppToggle id="calculator" label="Calculadora Rápida" />
                <IslandAppToggle id="camera" label="Conferência / Meet" />
                <IslandAppToggle id="translate" label="Tradutor" />
              </div>
            </div>
          )}
          {activeTab === 'ia' && (
            <div className="space-y-6 animate-[fadeIn_0.4s]">
              <div className="p-5 rounded-3xl bg-blue-500/5 border border-blue-500/20 flex flex-col gap-4 text-center">
                 <div className="w-14 h-14 rounded-full bg-blue-600/20 flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined !text-[28px] text-blue-400">key</span>
                 </div>
                 <div className="space-y-2">
                    <h3 className={`text-sm font-bold ${styles.text}`}>Chave de API do Gemini</h3>
                    <p className={`text-[11px] ${styles.textDim} leading-relaxed`}>
                        Para usar os recursos de Inteligência Artificial, insira sua chave gratuita ou paga do Google AI Studio.
                    </p>
                 </div>

                 {!showKeyInput ? (
                     <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/10">
                         <div className="flex flex-col items-start">
                             <span className="text-[9px] uppercase font-bold text-green-400 tracking-widest">Chave Ativa</span>
                             <span className="text-[10px] font-mono text-white/50">{savedKeyMasked}</span>
                         </div>
                         <button onClick={handleClearApiKey} className="p-2 text-white/30 hover:text-red-400 transition-colors">
                             <span className="material-symbols-outlined !text-[16px]">delete</span>
                         </button>
                     </div>
                 ) : (
                     <div className="flex flex-col gap-3">
                        <div className="relative">
                            <input 
                                type="password" 
                                value={apiKeyInput}
                                onChange={(e) => setApiKeyInput(e.target.value)}
                                placeholder="Cole sua chave aqui..."
                                className={`w-full pl-4 pr-10 py-3 rounded-xl outline-none text-xs font-mono transition-all ${styles.input}`}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-white/20 !text-[16px]">vpn_key</span>
                        </div>
                        <button 
                            onClick={handleSaveApiKey}
                            disabled={!apiKeyInput.trim()}
                            className={`w-full py-3 rounded-xl font-bold text-[10px] uppercase tracking-[0.1em] transition-all ${apiKeyInput.trim() ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-500' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
                        >
                            Salvar Chave
                        </button>
                        
                        <a 
                            href="https://aistudio.google.com/app/apikey" 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-[10px] font-bold text-blue-400 hover:underline flex items-center justify-center gap-1 mt-1"
                        >
                            Obter chave no Google AI Studio <span className="material-symbols-outlined !text-[12px]">open_in_new</span>
                        </a>
                     </div>
                 )}
              </div>

              <div className="p-4 rounded-2xl bg-black/10 border border-white/5 space-y-3">
                  <h4 className={`text-[10px] font-bold uppercase tracking-widest ${styles.textDim}`}>Privacidade</h4>
                  <ul className="space-y-2">
                      <li className="flex gap-2 text-[10px] leading-relaxed opacity-60">
                        <span className="text-blue-400">•</span>
                        <span>Sua chave é armazenada apenas no seu navegador localmente.</span>
                      </li>
                      <li className="flex gap-2 text-[10px] leading-relaxed opacity-60">
                        <span className="text-blue-400">•</span>
                        <span>
                            A chave é enviada diretamente aos servidores do Google (Google GenAI API) sem intermediários.
                        </span>
                      </li>
                  </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
};
