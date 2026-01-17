import React, { useEffect, useState } from 'react';
import { storage, STORAGE_KEYS } from '../services/storageService';
import { getTechFact } from '../services/geminiService';
import { TechFactData } from '../types';

interface TechFactCardProps {
  isDarkMode: boolean;
}

export const TechFactCard: React.FC<TechFactCardProps> = ({ isDarkMode }) => {
  const [data, setData] = useState<TechFactData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFact = async () => {
      const today = new Date().toDateString();
      const cached = await storage.get<TechFactData>(STORAGE_KEYS.TECH_FACT_CACHE);
      const cachedDate = await storage.get<string>(STORAGE_KEYS.TECH_FACT_DATE);

      if (cached && cachedDate === today) {
        setData(cached);
        setLoading(false);
      } else {
        const newData = await getTechFact();
        setData(newData);
        storage.set(STORAGE_KEYS.TECH_FACT_CACHE, newData);
        storage.set(STORAGE_KEYS.TECH_FACT_DATE, today);
        setLoading(false);
      }
    };
    loadFact();
  }, []);

  const textColor = isDarkMode ? "text-white/90" : "text-slate-700";
  const accentColor = isDarkMode ? "text-blue-300" : "text-blue-600";

  return (
    <div className="w-full h-full flex flex-col items-center justify-center animate-[fadeIn_0.5s] overflow-hidden">
      {loading ? (
        <div className={`animate-pulse flex flex-col items-center gap-2 w-full px-8`}>
             <div className={`h-3 w-16 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-black/5'}`}></div>
             <div className={`h-8 w-full rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`}></div>
        </div>
      ) : (
        <div className="w-full px-4 text-center flex flex-col items-center justify-center h-full gap-2">
           <div className="flex items-center gap-2 flex-shrink-0">
             <span className={`text-[9px] font-bold uppercase tracking-widest ${accentColor}`}>
               Trivia • {data?.category}
             </span>
           </div>
           
          <div className="w-full overflow-hidden flex items-center justify-center">
              <p className={`text-xs font-light leading-relaxed text-center break-words whitespace-normal line-clamp-5 ${textColor}`}>
                  {data?.fact}
              </p>
          </div>
        </div>
      )}
    </div>
  );
};