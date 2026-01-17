
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GlassCard } from './GlassCard';

interface GuidedTourProps {
  onComplete: () => void;
  isDarkMode: boolean;
}

interface TourStep {
  targetId: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'auto';
}

const STEPS: TourStep[] = [
  { targetId: 'dynamic-island-pill', title: 'Central de Comando', content: 'A Ilha Dinâmica expande para revelar apps e player de música.', position: 'bottom' },
  { targetId: 'intro-widgets-area', title: 'Widgets Inteligentes', content: 'Acesso rápido ao Clima, Planejador e Notas. Clique para expandir.', position: 'right' },
  { targetId: 'header-apps-btn', title: 'Google Workspace', content: 'Gmail, Drive e Calendar sem sair da tela.', position: 'left' },
  { targetId: 'header-edit-btn', title: 'Modo de Edição', content: 'Mova os widgets ativando a edição aqui.', position: 'left' },
  { targetId: 'header-settings-btn', title: 'Ajustes', content: 'Personalize temas e sons aqui.', position: 'left' }
];

export const GuidedTour: React.FC<GuidedTourProps> = ({ onComplete, isDarkMode }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => { const timer = setTimeout(() => setIsReady(true), 600); return () => clearTimeout(timer); }, []);

  const updateRect = useCallback(() => {
    const el = document.getElementById(STEPS[currentStepIndex].targetId);
    if (el) {
        const rect = el.getBoundingClientRect();
        const padding = 12;
        setTargetRect({ x: rect.left - padding, y: rect.top - padding, w: rect.width + (padding * 2), h: rect.height + (padding * 2) });
    } else {
        handleNext();
    }
  }, [currentStepIndex]);

  useEffect(() => { 
      if (isReady) {
          updateRect();
          window.addEventListener('resize', updateRect);
          return () => window.removeEventListener('resize', updateRect);
      } 
  }, [currentStepIndex, isReady, updateRect]);

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) setCurrentStepIndex(prev => prev + 1);
    else { setIsReady(false); setTimeout(onComplete, 500); }
  };

  const handleSkip = () => { setIsReady(false); setTimeout(onComplete, 500); };

  if (!isReady || !targetRect) return null;
  const step = STEPS[currentStepIndex];

  return (
    <div className="fixed inset-0 z-[10000] pointer-events-auto">
        <svg className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-700">
            <defs><mask id="tour-mask"><rect x="0" y="0" width="100%" height="100%" fill="white" /><rect x={targetRect.x} y={targetRect.y} width={targetRect.w} height={targetRect.h} rx="20" fill="black" className="transition-all duration-500" /></mask></defs>
            <rect x="0" y="0" width="100%" height="100%" fill="rgba(0, 0, 0, 0.7)" mask="url(#tour-mask)" />
        </svg>

        <div className="absolute transition-all duration-500" style={{ transform: `translate(${Math.max(20, Math.min(targetRect.x, window.innerWidth - 340))}px, ${targetRect.y + targetRect.h + 20}px)` }}>
             <GlassCard isDarkMode={true} className="w-[340px] !p-6 bg-[#121212]/90 border border-white/20 shadow-2xl backdrop-blur-xl">
                 <div className="flex justify-between items-start mb-3">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-[10px] font-bold text-white">{currentStepIndex + 1}</span>
                    
                    <label className="hamburger text-white scale-[0.4] -mt-3 -mr-3">
                        <input type="checkbox" checked={true} readOnly onClick={handleSkip} />
                        <svg viewBox="0 0 32 32">
                            <path className="line line-top-bottom" d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"></path>
                            <path className="line" d="M7 16 27 16"></path>
                        </svg>
                    </label>
                 </div>
                 <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                 <p className="text-sm text-white/80 leading-relaxed mb-6 font-light">{step.content}</p>
                 <div className="flex justify-between items-center border-t border-white/10 pt-4">
                     <button onClick={handleSkip} className="text-xs font-medium text-white/40 hover:text-white transition-colors">Pular</button>
                     <button
                        type="button"
                        onClick={handleNext}
                        className="flex justify-center gap-2 items-center shadow-xl text-sm bg-gray-50 backdrop-blur-md font-semibold isolation-auto border-gray-50 before:absolute before:w-full before:transition-all before:duration-700 before:hover:w-full before:-left-full before:hover:left-0 before:rounded-full before:bg-emerald-500 hover:text-gray-50 before:-z-10 before:aspect-square before:hover:scale-150 before:hover:duration-700 relative z-10 px-4 py-1.5 overflow-hidden border-2 rounded-full group transition-all"
                      >
                        {currentStepIndex === STEPS.length - 1 ? 'Começar' : 'Próximo'}
                        <svg
                          className="w-7 h-7 justify-end group-hover:rotate-90 group-hover:bg-gray-50 text-gray-50 ease-linear duration-300 rounded-full border border-gray-700 group-hover:border-none p-1.5 rotate-45"
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
    </div>
  );
};
