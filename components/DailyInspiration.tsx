import React, { useEffect, useState } from 'react';
import { getDailyInspiration } from '../services/geminiService';
import { QuoteData } from '../types';
import { storage, STORAGE_KEYS } from '../services/storageService';

interface DailyInspirationProps {
  isDarkMode?: boolean;
}

export const DailyInspiration: React.FC<DailyInspirationProps> = ({ isDarkMode = true }) => {
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadQuote = async () => {
        const today = new Date().toDateString();
        const cached = await storage.get<QuoteData>(STORAGE_KEYS.QUOTE_CACHE);
        const cachedDate = await storage.get<string>(STORAGE_KEYS.QUOTE_DATE);

        if (cached && cachedDate === today) {
            setQuoteData(cached);
            setLoading(false);
        } else {
            getDailyInspiration().then(data => {
                setQuoteData(data);
                storage.set(STORAGE_KEYS.QUOTE_CACHE, data);
                storage.set(STORAGE_KEYS.QUOTE_DATE, today);
                setLoading(false);
            });
        }
    };

    loadQuote();
  }, []);

  const handleCopy = () => {
    if (quoteData) {
      const text = `"${quoteData.text}" — ${quoteData.author}`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const textColor = isDarkMode ? "text-white/90" : "text-slate-700";
  const authorColor = isDarkMode ? "text-white/50" : "text-slate-500";
  const skeletonColor = isDarkMode ? "bg-white/5" : "bg-slate-400/20";

  return (
    <div 
        className="w-full h-full flex flex-col items-center justify-center relative group animate-[fadeIn_0.5s] cursor-pointer overflow-hidden"
        onClick={handleCopy}
    >
        {loading ? (
          <div className="relative px-8 w-full flex flex-col items-center gap-2">
             <div className={`h-3 rounded-full w-3/4 ${skeletonColor} animate-pulse`}></div>
             <div className={`h-3 rounded-full w-1/2 ${skeletonColor} animate-pulse`}></div>
             <div className={`h-2 rounded-full w-1/4 mt-1 ${skeletonColor} animate-pulse`}></div>
          </div>
        ) : (
          <div className="text-center w-full flex flex-col items-center justify-center h-full px-4 gap-1">
             <div className="flex items-center justify-center gap-2 flex-shrink-0">
                <span className={`text-[9px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-yellow-200' : 'text-yellow-600'}`}>
                   Dose Diária
                </span>
             </div>
            
            <div className="w-full overflow-hidden flex items-center justify-center">
                <p className={`text-xs font-light italic leading-relaxed text-center break-words whitespace-normal line-clamp-4 ${textColor}`}>
                "{quoteData?.text}"
                </p>
            </div>
            
            <p className={`text-[9px] font-medium uppercase tracking-widest transition-colors duration-300 flex-shrink-0 ${authorColor}`}>
              — {quoteData?.author}
            </p>
            
            <div className={`absolute bottom-2 right-2 transition-opacity duration-300 ${copied ? 'opacity-100' : 'opacity-0'}`}>
                 <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            </div>
          </div>
        )}
    </div>
  );
};