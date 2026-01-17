import React, { useEffect, useState } from 'react';
import { storage, STORAGE_KEYS } from '../services/storageService';
import { getHoroscope } from '../services/geminiService';
import { HoroscopeData } from '../types';

interface HoroscopeCardProps {
  isDarkMode: boolean;
}

const SIGNS = [
  "Áries", "Touro", "Gêmeos", "Câncer", "Leão", "Virgem", 
  "Libra", "Escorpião", "Sagitário", "Capricórnio", "Aquário", "Peixes"
];

export const HoroscopeCard: React.FC<HoroscopeCardProps> = ({ isDarkMode }) => {
  const [sign, setSign] = useState<string | null>(null);
  const [data, setData] = useState<HoroscopeData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSign = async () => {
      const savedSign = await storage.get<string>(STORAGE_KEYS.USER_SIGN);
      if (savedSign) {
        setSign(savedSign);
        fetchData(savedSign);
      }
    };
    loadSign();
  }, []);

  const fetchData = async (userSign: string) => {
    setLoading(true);
    const today = new Date().toDateString();
    const cached = await storage.get<HoroscopeData>(STORAGE_KEYS.HOROSCOPE_CACHE);
    const cachedDate = await storage.get<string>(STORAGE_KEYS.HOROSCOPE_DATE);

    if (cached && cachedDate === today && cached.sign === userSign) {
      setData(cached);
      setLoading(false);
    } else {
      const newData = await getHoroscope(userSign);
      setData(newData);
      storage.set(STORAGE_KEYS.HOROSCOPE_CACHE, newData);
      storage.set(STORAGE_KEYS.HOROSCOPE_DATE, today);
      setLoading(false);
    }
  };

  const handleSignSelect = (newSign: string) => {
    setSign(newSign);
    storage.set(STORAGE_KEYS.USER_SIGN, newSign);
    fetchData(newSign);
  };

  const textColor = isDarkMode ? "text-white/90" : "text-slate-700";
  const accentColor = isDarkMode ? "text-purple-300" : "text-purple-600";

  if (!sign) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 animate-[fadeIn_0.5s] w-full px-6 overflow-hidden">
        <p className={`text-[9px] uppercase tracking-widest opacity-70 ${textColor}`}>Escolha seu Signo</p>
        <select 
          onChange={(e) => handleSignSelect(e.target.value)}
          className={`
            p-1.5 rounded-lg outline-none border cursor-pointer transition-all text-xs w-full max-w-[160px]
            ${isDarkMode ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-white/50 border-black/10 text-slate-800 hover:bg-white/80'}
          `}
          defaultValue=""
        >
          <option value="" disabled>Selecionar...</option>
          {SIGNS.map(s => <option key={s} value={s} className="text-black">{s}</option>)}
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full animate-[fadeIn_0.5s] w-full relative group overflow-hidden">
      {loading ? (
        <div className={`animate-pulse flex flex-col items-center gap-2 w-full px-8`}>
          <div className={`h-3 w-20 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-black/5'}`}></div>
          <div className={`h-8 w-full rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`}></div>
        </div>
      ) : (
        <div className="w-full px-4 text-center flex flex-col items-center justify-center h-full gap-2">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-[9px] font-bold uppercase tracking-widest ${accentColor}`}>{sign}</span>
            <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-black/5'} ${textColor} opacity-70`}>
              {data?.mood}
            </span>
          </div>
          
          <div className="w-full overflow-hidden flex items-center justify-center">
              <p className={`text-xs font-light italic leading-relaxed text-center break-words whitespace-normal line-clamp-4 ${textColor}`}>
                  "{data?.text}"
              </p>
          </div>

          <button 
            onClick={() => setSign(null)} 
            className={`absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${textColor}`}
            title="Alterar Signo"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>
      )}
    </div>
  );
};