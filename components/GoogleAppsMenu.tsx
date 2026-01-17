
import React, { useState, useEffect, useMemo } from 'react';
import { GlassCard } from './GlassCard';

interface AppItem {
  id: string;
  name: string;
  url: string;
  icon: string;
}

interface GoogleAppsMenuProps {
  isDarkMode?: boolean;
}

// Mapeamento para ícones do Material Symbols (Google Fonts)
const categories = [
  {
    title: "Essenciais",
    items: [
      { id: 'search', name: 'Google', url: 'https://www.google.com/', icon: 'search' },
      { id: 'gmail', name: 'Gmail', url: 'https://mail.google.com/mail/u/0/#inbox', icon: 'mail' },
      { id: 'drive', name: 'Drive', url: 'https://drive.google.com/drive/u/0/my-drive', icon: 'add_to_drive' },
      { id: 'calendar', name: 'Agenda', url: 'https://calendar.google.com/calendar/u/0/r', icon: 'calendar_month' },
      { id: 'maps', name: 'Maps', url: 'https://www.google.com/maps', icon: 'map' },
      { id: 'photos', name: 'Fotos', url: 'https://photos.google.com/', icon: 'photo_library' },
    ]
  },
  {
    title: "Produtividade",
    items: [
      { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com/app', icon: 'auto_awesome' },
      { id: 'docs', name: 'Docs', url: 'https://docs.google.com/document/u/0/', icon: 'description' },
      { id: 'sheets', name: 'Planilhas', url: 'https://docs.google.com/spreadsheets/u/0/', icon: 'table_chart' },
      { id: 'slides', name: 'Apresent.', url: 'https://docs.google.com/presentation/u/0/', icon: 'co_present' },
      { id: 'meet', name: 'Meet', url: 'https://meet.google.com/', icon: 'videocam' },
      { id: 'keep', name: 'Keep', url: 'https://keep.google.com/u/0/', icon: 'lightbulb' },
    ]
  },
  {
    title: "Explorar",
    items: [
      { id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com/', icon: 'smart_display' }, // ou play_circle
      { id: 'news', name: 'Notícias', url: 'https://news.google.com/', icon: 'newspaper' },
      { id: 'play', name: 'Play Store', url: 'https://play.google.com/store', icon: 'shop' }, // ou shopping_bag
      { id: 'translate', name: 'Tradutor', url: 'https://translate.google.com/', icon: 'translate' },
      { id: 'earth', name: 'Earth', url: 'https://earth.google.com/web/', icon: 'public' },
      { id: 'arts', name: 'Arts', url: 'https://artsandculture.google.com/', icon: 'palette' },
    ]
  },
  {
    title: "Utilitários",
    items: [
      { id: 'account', name: 'Conta', url: 'https://myaccount.google.com/', icon: 'account_circle' },
      { id: 'contacts', name: 'Contatos', url: 'https://contacts.google.com/', icon: 'contacts' },
      { id: 'chat', name: 'Chat', url: 'https://chat.google.com/', icon: 'chat' },
      { id: 'finance', name: 'Finanças', url: 'https://www.google.com/finance/', icon: 'show_chart' },
      { id: 'shopping', name: 'Shopping', url: 'https://shopping.google.com/', icon: 'shopping_bag' },
      { id: 'forms', name: 'Forms', url: 'https://docs.google.com/forms/u/0/', icon: 'checklist' },
    ]
  }
];

interface AppTileProps {
  app: AppItem;
  isDarkMode: boolean;
}

const AppTile: React.FC<AppTileProps> = ({ app, isDarkMode }) => {
  // Visual Styles - Refined borders and opacity
  const containerClasses = isDarkMode 
    ? 'bg-gradient-to-br from-white/20 to-white/10 border border-white/50 group-hover:border-white/70 group-hover:from-white/30 group-hover:to-white/20' 
    : 'bg-gradient-to-br from-white/90 to-white/70 border border-black/10 group-hover:border-black/30 group-hover:from-white group-hover:to-white/80 shadow-sm';
    
  const textColor = isDarkMode ? 'text-white/90 group-hover:text-white' : 'text-slate-700 group-hover:text-slate-900';
  
  // Icon Colors
  const iconColor = isDarkMode ? 'text-white/95' : 'text-slate-800';

  return (
    <a
      href={app.url}
      target="_blank"
      rel="noreferrer"
      className={`group flex flex-col items-center gap-2 p-2 rounded-2xl transition-all duration-300 active:scale-95`}
      title={app.name}
    >
      {/* Icon Container (Squircle) */}
      <div className={`
        relative w-14 h-14 rounded-[20px] flex items-center justify-center 
        backdrop-blur-md transition-all duration-300
        ${containerClasses}
        group-hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.3)]
        group-hover:-translate-y-1
      `}>
          <span className={`material-symbols-outlined !text-[30px] transition-transform duration-300 group-hover:scale-110 ${iconColor}`}>
            {app.icon}
          </span>
      </div>

      {/* Label */}
      <span className={`text-[10px] font-medium tracking-tight text-center truncate w-full px-1 transition-colors ${textColor}`}>
          {app.name}
      </span>
    </a>
  );
};

export const GoogleAppsMenu: React.FC<GoogleAppsMenuProps> = ({ isDarkMode = true }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categories;
    const lower = searchTerm.toLowerCase();
    
    return categories.map(cat => ({
      ...cat,
      items: cat.items.filter(item => item.name.toLowerCase().includes(lower))
    })).filter(cat => cat.items.length > 0);
  }, [searchTerm]);

  const sectionTitleColor = isDarkMode ? 'text-white/60' : 'text-slate-500';
  
  // Liquid Input Style - Refined
  const inputBg = isDarkMode 
    ? 'bg-black/40 border-white/30 text-white placeholder-white/60 focus:bg-black/60 focus:border-white/50' 
    : 'bg-white/70 border-black/15 text-slate-800 placeholder-slate-500 focus:bg-white/90 focus:border-black/30';

  // --- REFINED SCROLLBAR ---
  const scrollbarStyles = `
    .google-apps-scroll {
      scrollbar-width: thin;
      scrollbar-color: ${isDarkMode ? 'rgba(255,255,255,0.4) rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.4) rgba(0,0,0,0.05)'};
    }
    .google-apps-scroll::-webkit-scrollbar {
      width: 10px;
    }
    .google-apps-scroll::-webkit-scrollbar-track {
      background: ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
      margin: 4px 0;
    }
    .google-apps-scroll::-webkit-scrollbar-thumb {
      background-color: ${isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'};
      border-radius: 20px;
      border: 2px solid transparent;
      background-clip: content-box;
    }
    .google-apps-scroll::-webkit-scrollbar-thumb:hover {
      background-color: ${isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'};
    }
  `;

  return (
    <GlassCard 
        isDarkMode={isDarkMode}
        className={`!p-0 w-[340px] max-h-[85vh] h-[520px] !rounded-[32px] origin-top-right overflow-hidden backdrop-blur-[40px] shadow-2xl border-opacity-100 ring-1 ring-white/10`}
    >
      <div className="flex flex-col h-full w-full">
        <style>{scrollbarStyles}</style>

        {/* Header & Search - Sticky */}
        <div className={`flex-shrink-0 px-5 pt-5 pb-3 space-y-3 z-20 border-b transition-colors ${isDarkMode ? 'border-white/20 bg-white/[0.08]' : 'border-black/10 bg-white/50'}`}>
           <div className="flex items-center justify-between">
              <h3 className={`text-sm font-semibold pl-1 tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Workspace</h3>
              <div className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${isDarkMode ? 'bg-white/15 border-white/30 text-white/80' : 'bg-black/10 border-black/20 text-black/60'}`}>
                  {categories.reduce((acc, cat) => acc + cat.items.length, 0)} APPS
              </div>
           </div>
           
           {/* Search Bar */}
           <div className="relative group">
              <div className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${isDarkMode ? 'text-white/60 group-focus-within:text-white' : 'text-slate-500 group-focus-within:text-blue-500'}`}>
                  <span className="material-symbols-outlined !text-[20px]">search</span>
              </div>
              <input 
                  type="text" 
                  placeholder="Buscar aplicativo..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-8 py-2.5 rounded-xl text-xs font-medium outline-none border transition-all backdrop-blur-md ${inputBg}`}
                  autoFocus
              />
              {searchTerm && (
                  <button 
                      onClick={() => setSearchTerm('')}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/10 transition-colors ${isDarkMode ? 'text-white/60 hover:text-white hover:bg-white/20' : 'text-slate-400 hover:text-slate-700'}`}
                  >
                      <span className="material-symbols-outlined !text-[18px]">close</span>
                  </button>
              )}
           </div>
        </div>

        {/* Scrollable Grid */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 pt-2 pb-4 google-apps-scroll scroll-smooth relative z-10">
          
          {filteredCategories.length > 0 ? (
              filteredCategories.map((category) => (
              <div key={category.title} className="mb-6 last:mb-2 animate-[fadeIn_0.3s_ease-out] px-2">
                  <h4 className={`px-2 mb-3 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${sectionTitleColor}`}>
                      {category.title}
                      <div className={`h-[1px] flex-1 ${isDarkMode ? 'bg-white/20' : 'bg-black/10'}`}></div>
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                      {category.items.map((app) => (
                          <AppTile 
                              key={app.id} 
                              app={app} 
                              isDarkMode={isDarkMode} 
                          />
                      ))}
                  </div>
              </div>
              ))
          ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-50 pb-10">
                  <div className={`p-4 rounded-full mb-3 ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`}>
                      <span className="material-symbols-outlined !text-[32px] opacity-50">search_off</span>
                  </div>
                  <span className="text-xs font-medium">Nenhum app encontrado</span>
              </div>
          )}

          {/* Footer Link */}
          {!searchTerm && (
              <div className="flex justify-center mt-4 mb-2 transition-opacity duration-500" style={{ opacity: isVisible ? 1 : 0 }}>
                  <a 
                      href="https://about.google/products/" 
                      target="_blank" 
                      rel="noreferrer"
                      className={`
                          text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded-full transition-all duration-300 border backdrop-blur-md
                          hover:shadow-lg hover:scale-105 active:scale-95 no-underline flex items-center gap-2 group
                          ${isDarkMode 
                              ? 'text-white/90 hover:text-white border-white/50 hover:bg-white/25 bg-white/20' 
                              : 'text-slate-700 hover:text-slate-900 border-black/20 hover:bg-white/80 bg-white/50'
                          }
                      `}
                  >
                  <span>Explorar Tudo</span>
                  <span className="material-symbols-outlined !text-[16px] transform group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </a>
              </div>
          )}

        </div>
      </div>
    </GlassCard>
  );
};
