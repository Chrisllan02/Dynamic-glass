
import React, { useEffect, useState } from 'react';

interface BreathingCardProps {
  isDarkMode: boolean;
}

export const BreathingCard: React.FC<BreathingCardProps> = ({ isDarkMode }) => {
  const [phase, setPhase] = useState<'Inspire' | 'Segure' | 'Expire'>('Inspire');

  useEffect(() => {
    const cycle = () => {
      setPhase('Inspire');
      setTimeout(() => {
        setPhase('Segure');
        setTimeout(() => {
          setPhase('Expire');
        }, 2000); // Hold for 2s
      }, 4000); // Inhale for 4s
    };

    cycle();
    const interval = setInterval(cycle, 10000); // Total 10s cycle (4+2+4)
    return () => clearInterval(interval);
  }, []);

  const textColor = isDarkMode ? "text-white/90" : "text-slate-700";
  const circleColor = isDarkMode ? "bg-blue-400/20 border-blue-400/50" : "bg-blue-500/20 border-blue-500/50";

  return (
    <div className="flex items-center justify-center h-full w-full gap-4 animate-[fadeIn_0.5s]">
       {/* Visual Circle */}
       <div className="relative flex items-center justify-center w-14 h-14 flex-shrink-0">
          <div className={`
            absolute inset-0 rounded-full border-2 transition-all duration-[4000ms] ease-in-out
            ${circleColor}
            ${phase === 'Inspire' ? 'scale-150 opacity-100' : phase === 'Segure' ? 'scale-150 opacity-80' : 'scale-75 opacity-50'}
          `}></div>
          <div className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-white' : 'bg-slate-800'}`}></div>
       </div>

       {/* Text Instruction - Flex-shrink prevents it from pushing out */}
       <div className="flex flex-col items-start min-w-[80px]">
          <span className={`text-[10px] font-bold uppercase tracking-widest opacity-50 ${textColor}`}>
            Respire
          </span>
          <span className={`text-xl font-medium transition-all duration-500 ${textColor}`}>
             {phase}
          </span>
       </div>
    </div>
  );
};
