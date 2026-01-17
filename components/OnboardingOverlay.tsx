
import React, { useState } from 'react';
import { GlassCard } from './GlassCard';
import { ThemeId } from '../types';

interface OnboardingOverlayProps {
  onComplete: (name: string, theme: ThemeId, startTour: boolean) => void;
  isDarkMode: boolean;
}

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({ onComplete, isDarkMode }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>('waves');
  const [isExiting, setIsExiting] = useState(false);

  const finish = (startTour: boolean) => {
    setIsExiting(true);
    setTimeout(() => {
      onComplete(name || 'Visitante', selectedTheme, startTour);
    }, 800);
  };

  const handleNext = () => {
    if (step === 1 && !name.trim()) return;
    if (step === 3) finish(true);
    else setStep(step + 1);
  };

  const containerClasses = `
    fixed inset-0 z-[9999] flex items-center justify-center 
    bg-black/90 backdrop-blur-[30px] transition-all duration-1000
    ${isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'}
  `;

  return (
    <div className={containerClasses}>
      <GlassCard isDarkMode={isDarkMode} className={`w-[550px] min-h-[500px] relative overflow-hidden flex flex-col items-center !p-0 shadow-2xl`}>
        <div className="w-full h-1.5 bg-black/10 flex">
            <div className={`h-full bg-blue-500 transition-all duration-500`} style={{ width: `${(step / 3) * 100}%` }}></div>
        </div>

        <div className="absolute top-4 right-4 z-50">
            <label className={`hamburger ${isDarkMode ? 'text-white' : 'text-slate-800'} scale-50`}>
                <input type="checkbox" checked={true} readOnly onClick={() => finish(false)} />
                <svg viewBox="0 0 32 32">
                    <path className="line line-top-bottom" d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"></path>
                    <path className="line" d="M7 16 27 16"></path>
                </svg>
            </label>
        </div>

        <div className="w-full flex-1 flex flex-col items-center justify-center text-center px-12 py-8">
            {step === 1 && (
                <div className="flex flex-col items-center gap-8 animate-[fadeIn_0.5s] w-full">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center bg-blue-500/20"><span className="material-symbols-outlined !text-[40px] animate-wave">waving_hand</span></div>
                    <div className="space-y-2">
                        <h2 className="text-4xl font-bold">Boas-vindas</h2>
                        <p className="opacity-60 text-base">Vamos personalizar o &lt; Chris /&gt; para você.<br/>Como gostaria de ser chamado?</p>
                    </div>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" className="text-2xl text-center bg-transparent border-b-2 border-current outline-none py-3 w-full max-w-xs focus:border-blue-500 transition-colors" onKeyDown={(e) => e.key === 'Enter' && handleNext()} autoFocus />
                </div>
            )}
            {step === 2 && (
                 <div className="flex flex-col items-center gap-8 animate-[fadeIn_0.5s] w-full">
                     <div className="w-20 h-20 rounded-full flex items-center justify-center bg-white/5"><span className="material-symbols-outlined !text-[36px]">palette</span></div>
                    <h2 className="text-3xl font-bold">Escolha o Visual</h2>
                    <div className="grid grid-cols-5 gap-4 py-2">
                         {['liquid', 'minimal', 'nordic', 'waves', 'weather'].map((t) => (
                             <button key={t} onClick={() => setSelectedTheme(t as ThemeId)} className="group flex flex-col items-center gap-2">
                                <div className={`w-14 h-14 rounded-2xl relative overflow-hidden transition-all ${selectedTheme === t ? 'ring-2 ring-blue-500 scale-110' : 'opacity-70 hover:opacity-100'}`}><div className={`absolute inset-0 bg-gradient-to-br ${t === 'liquid' ? 'from-[#4338ca] to-[#ec4899]' : t === 'minimal' ? 'from-zinc-200 to-zinc-600' : t === 'nordic' ? 'from-emerald-500 to-cyan-700' : t === 'waves' ? 'from-blue-600 to-cyan-400' : 'from-blue-400 to-gray-300'}`} /></div>
                             </button>
                         ))}
                    </div>
                </div>
            )}
            {step === 3 && (
                 <div className="flex flex-col items-center gap-8 animate-[fadeIn_0.5s] w-full">
                    <div className="w-24 h-24 rounded-full flex items-center justify-center bg-blue-600 shadow-xl"><span className="material-symbols-outlined !text-[40px] text-white">rocket_launch</span></div>
                    <h2 className="text-4xl font-bold">Tudo Pronto!</h2>
                    <p className="opacity-70 max-w-md">Vamos fazer um tour rápido pelos recursos de <strong>Power User</strong>?</p>
                </div>
            )}
        </div>

        <div className="w-full p-8 flex justify-between items-center border-t border-white/5">
             {step > 1 ? <button onClick={() => setStep(step - 1)} className="text-xs uppercase font-bold opacity-50 hover:opacity-100 transition-opacity">Voltar</button> : <div />}
             
             <button
                type="button"
                onClick={handleNext}
                disabled={step === 1 && !name.trim()}
                className={`flex justify-center gap-2 items-center shadow-xl text-lg bg-gray-50 backdrop-blur-md font-semibold isolation-auto border-gray-50 before:absolute before:w-full before:transition-all before:duration-700 before:hover:w-full before:-left-full before:hover:left-0 before:rounded-full before:bg-emerald-500 hover:text-gray-50 before:-z-10 before:aspect-square before:hover:scale-150 before:hover:duration-700 relative z-10 px-4 py-2 overflow-hidden border-2 rounded-full group transition-all ${step === 1 && !name.trim() ? 'opacity-30 cursor-not-allowed' : 'opacity-100'}`}
              >
                {step === 3 ? 'Explorar' : 'Próximo'}
                <svg
                  className="w-8 h-8 justify-end group-hover:rotate-90 group-hover:bg-gray-50 text-gray-50 ease-linear duration-300 rounded-full border border-gray-700 group-hover:border-none p-2 rotate-45"
                  viewBox="0 0 16 19"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7 18C7 18.5523 7.44772 19 8 19C8.55228 19 9 18.5523 9 18H7ZM8.70711 0.292893C8.31658 -0.0976311 7.68342 -0.0976311 7.29289 0.292893L0.928932 6.65685C0.538408 7.04738 0.538408 7.68054 0.928932 8.07107C1.31946 8.46159 1.95262 8.46159 2.34315 8.07107L8 2.41421L13.6569 8.07107C14.0474 8.46159 14.6805 8.46159 15.0711 8.07107C15.4616 7.68054 15.4616 7.04738 15.0711 6.65685L8.70711 0.292893ZM9 18L9 1H7L7 18H9Z"
                    className="fill-gray-800 group-hover:fill-gray-800"
                  ></path>
                </svg>
              </button>
        </div>
      </GlassCard>
    </div>
  );
};
