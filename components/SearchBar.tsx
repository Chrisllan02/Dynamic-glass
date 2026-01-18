
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { uiSounds } from '../services/soundService';

interface SearchBarProps {
  isDarkMode?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ isDarkMode = true }) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<{ text: string, type: 'google' | 'bookmark', url?: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isListening, setIsListening] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
        setSuggestions([]);
        return;
    }

    const timer = setTimeout(async () => {
        const results: { text: string, type: 'google' | 'bookmark', url?: string }[] = [];
        
        // 1. Search Bookmarks first (if available)
        // @ts-ignore
        if (typeof chrome !== 'undefined' && chrome.bookmarks) {
             // @ts-ignore
             const bookmarkResults = await new Promise<any[]>((resolve) => {
                 // @ts-ignore
                 chrome.bookmarks.search(query, (res) => resolve(res || []));
             });
             
             bookmarkResults.slice(0, 3).forEach((b: any) => {
                 if (b.url) results.push({ text: b.title, type: 'bookmark', url: b.url });
             });
        }

        try {
            const res = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 1) {
                    data[1].slice(0, 5).forEach((s: string) => results.push({ text: s, type: 'google' }));
                }
            }
        } catch (error) {
            console.warn("Autosuggest blocked", error);
        }
        
        setSuggestions(results);
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
      setShowSuggestions(isFocused && suggestions.length > 0);
  }, [isFocused, suggestions]);

  const handleSearch = useCallback((e?: React.FormEvent, overrideQuery?: string, overrideUrl?: string) => {
    if (e) e.preventDefault();
    if (overrideUrl) { window.location.href = overrideUrl; return; }

    const finalQuery = overrideQuery || query;
    if (finalQuery.trim()) {
      if (/^(http|https):\/\/[^ "]+$/.test(finalQuery)) {
          window.location.href = finalQuery;
      } else if (/^[^ "]+\.[a-z]{2,}(?:\/[^ "]*)?$/.test(finalQuery)) {
           window.location.href = `https://${finalQuery}`;
      } else {
          window.location.href = `https://www.google.com/search?q=${encodeURIComponent(finalQuery)}`;
      }
    }
  }, [query]);

  const toggleVoiceSearch = () => {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.lang = 'pt-BR';
          recognition.onstart = () => setIsListening(true);
          recognition.onend = () => setIsListening(false);
          recognition.onresult = (event: any) => {
              setQuery(event.results[0][0].transcript);
              setIsFocused(true);
          };
          recognition.start();
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, -1));
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
          e.preventDefault();
          const selected = suggestions[selectedIndex];
          setQuery(selected.text);
          handleSearch(undefined, selected.text, selected.url);
      }
  };

  const handleAiSearch = (e: React.MouseEvent) => {
      e.preventDefault();
      uiSounds.click();
      window.dispatchEvent(new CustomEvent('lumina-ai-search', { 
          detail: { query: query } 
      }));
  };

  return (
    <div className="relative w-full max-w-[600px] mx-auto z-50" ref={containerRef}>
      <div className={`transition-all duration-500 ${isFocused ? 'scale-[1.02]' : ''}`}>
        <form 
          onSubmit={handleSearch} 
          className={`
            relative flex items-center w-full h-[52px] 
            rounded-full border 
            transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]
            ${isDarkMode 
              ? `border-white/30 ${isFocused ? 'bg-black/90 border-white/60 shadow-[0_30px_60px_-15px_rgba(0,0,0,1)]' : 'bg-black/60 hover:border-white/50 shadow-xl'}`
              : `border-slate-200 ${isFocused ? 'bg-white border-blue-400 shadow-[0_20px_40px_-10px_rgba(31,38,135,0.18)]' : 'bg-white/95 hover:border-slate-300 shadow-md'}`
            }
            backdrop-blur-2xl z-50
          `}
        >
          <div className="pl-5 pr-3 flex items-center justify-center">
            <span className={`material-symbols-outlined !text-[22px] transition-all duration-500 ${isFocused ? (isDarkMode ? 'text-white scale-110' : 'text-blue-600 scale-110') : (isDarkMode ? 'text-white/40' : 'text-slate-400')}`}>search</span>
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(-1); }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            onKeyDown={handleKeyDown}
            className={`flex-grow bg-transparent border-none outline-none text-[16px] h-full font-medium ${isDarkMode ? 'text-white placeholder-white/40' : 'text-slate-800 placeholder-slate-400'}`}
            placeholder={isListening ? "Ouvindo..." : "Pesquise ou digite um URL"}
          />

          <div className="flex items-center pr-3 gap-1 h-full">
            {query && (
              <button type="button" onClick={() => setQuery('')} className={`p-2 hover:opacity-100 transition-opacity ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}><span className="material-symbols-outlined !text-[20px]">close</span></button>
            )}
            <button type="button" className={`p-2 transition-all rounded-full ${isListening ? 'bg-red-500 text-white animate-pulse' : (isDarkMode ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100')}`} onClick={toggleVoiceSearch}><span className="material-symbols-outlined !text-[20px]">{isListening ? 'mic_off' : 'mic'}</span></button>
            
             <button 
                onClick={handleAiSearch}
                className="ai-mode-button ml-2" 
                type="button"
                title="Pesquisar com IA (Google Search Data)"
             >
                <div className="gradient-layer">
                    <div className="rotating-gradient"></div>
                </div>
                <div className="inner-bg"></div>
                <div className="button-content">
                  <div className="icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                        <path d="M19 3l-1.6 3.6L14 8l3.4 1.4L19 13l1.6-3.6L24 8l-3.4-1.4z"/>
                    </svg>
                  </div>
                  <div className="label">Modo IA</div>
                </div>
             </button>
          </div>
        </form>

        {showSuggestions && (
          <div className={`absolute top-full mt-3 left-0 w-full py-2 rounded-3xl border shadow-2xl overflow-hidden backdrop-blur-3xl animate-[fadeIn_0.3s_ease-out] ${isDarkMode ? 'bg-black/90 border-white/20' : 'bg-white border-slate-200'}`}>
            {suggestions.map((s, i) => (
                <div 
                  key={i} 
                  className={`px-5 py-3 flex items-center gap-4 cursor-pointer transition-all ${i === selectedIndex ? (isDarkMode ? 'bg-white/10' : 'bg-slate-100') : (isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50')}`}
                  onClick={() => { setQuery(s.text); handleSearch(undefined, s.text, s.url); }}
                >
                  <span className={`material-symbols-outlined !text-[18px] ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>{s.type === 'bookmark' ? 'bookmark' : 'search'}</span>
                  <div className="flex flex-col overflow-hidden">
                      <span className={`text-sm truncate ${isDarkMode ? 'text-white' : 'text-slate-900'} ${i === selectedIndex ? 'font-bold' : 'font-medium'}`}>{s.text}</span>
                      {s.type === 'bookmark' && <span className={`text-[10px] truncate opacity-50 ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>{s.url}</span>}
                  </div>
                </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
