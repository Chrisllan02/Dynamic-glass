

import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from './GlassCard';
import { ModuleId } from '../types';
import { SmartWidget } from './SmartWidget';

interface InfoCarouselProps {
  isDarkMode: boolean;
  activeModules: ModuleId[];
}

export const InfoCarousel: React.FC<InfoCarouselProps> = ({ isDarkMode, activeModules }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const SLIDE_DURATION = 8000; // 8 seconds per slide
  const UPDATE_FREQ = 50; // Smoother updates (50ms)

  // Reset index if modules change
  useEffect(() => {
    if (currentIndex >= activeModules.length) {
      setCurrentIndex(0);
    }
  }, [activeModules.length, currentIndex]);

  const resetProgress = () => {
    setProgress(0);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
  };

  const nextSlide = () => {
    if (activeModules.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % activeModules.length);
    resetProgress();
  };

  const prevSlide = () => {
    if (activeModules.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + activeModules.length) % activeModules.length);
    resetProgress();
  };

  // Automatic Rotation & Progress Bar Logic
  useEffect(() => {
    if (activeModules.length <= 1) return;

    if (!isPaused) {
      // Main rotation timer
      timeoutRef.current = setInterval(() => {
        nextSlide();
      }, SLIDE_DURATION);

      // Progress bar animation
      const step = 100 / (SLIDE_DURATION / UPDATE_FREQ);
      progressIntervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) return 0;
          return prev + step;
        });
      }, UPDATE_FREQ);
    }

    return () => {
      if (timeoutRef.current) clearInterval(timeoutRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isPaused, activeModules.length, currentIndex]);

  // Touch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    setIsPaused(true);
    resetProgress();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
    // Resume after a short delay
    setTimeout(() => setIsPaused(false), 2000);
  };

  const handleManualNav = (idx: number) => {
    resetProgress();
    setIsPaused(true);
    setCurrentIndex(idx);
    // Resume quicker after manual click
    setTimeout(() => setIsPaused(false), 3000);
  };

  if (activeModules.length === 0) return null;

  return (
    <div 
        className="w-full flex flex-col items-center mt-4 relative group max-w-[340px] mx-auto animate-[fadeIn_0.8s_ease-out_0.4s_both]"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
    >
       {/* Navigation Arrows */}
       {activeModules.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prevSlide(); }}
              className={`
                absolute top-1/2 -translate-y-1/2 -left-12 z-30
                p-2 rounded-full backdrop-blur-md border transition-all duration-300
                opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100
                ${isDarkMode 
                  ? 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/20' 
                  : 'bg-white/40 border-white/40 text-slate-500 hover:text-slate-800 hover:bg-white/80'
                }
                hidden md:flex items-center justify-center
              `}
              title="Anterior"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); nextSlide(); }}
              className={`
                absolute top-1/2 -translate-y-1/2 -right-12 z-30
                p-2 rounded-full backdrop-blur-md border transition-all duration-300
                opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100
                ${isDarkMode 
                  ? 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/20' 
                  : 'bg-white/40 border-white/40 text-slate-500 hover:text-slate-800 hover:bg-white/80'
                }
                hidden md:flex items-center justify-center
              `}
              title="Próximo"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
       )}

       {/* Viewport - overflow-hidden masks neighbors */}
       <div className="w-full relative overflow-hidden z-10"> 
          
          {/* Sliding Track */}
          <div 
            className="flex w-full transition-transform duration-[700ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
             {activeModules.map((moduleId, index) => {
                const isActive = index === currentIndex;
                
                return (
                  // Slide Item Wrapper
                  // px-3: Reduced spacing
                  // Changed from min-w-full to w-full to strictly enforce width and prevent content expansion
                  <div key={`${moduleId}-${index}`} className="w-full flex-shrink-0 relative px-3 py-3 box-border"> 
                       
                       {/* Fixed Height: h-40 (160px) to prevent cutoff of longer text cards */}
                       <div className="relative w-full h-40">
                           <GlassCard className={`
                              w-full h-full flex items-center justify-center relative 
                              rounded-[24px] overflow-hidden 
                              border-0 shadow-none ring-0
                              ${isDarkMode 
                                  ? "bg-[#18181b]/40 backdrop-blur-xl" 
                                  : "bg-white/40 backdrop-blur-xl"
                              }
                              transition-all duration-500
                           `}>
                              {/* Content Container */}
                              <div className="w-full h-full flex items-center justify-center">
                                 <SmartWidget 
                                    id={moduleId} 
                                    isDarkMode={isDarkMode} 
                                    mode="carousel" 
                                 />
                              </div>
                           </GlassCard>

                           {/* SVG Border Progress */}
                           <svg 
                             className={`absolute inset-0 w-full h-full pointer-events-none z-20 rounded-[24px] overflow-visible transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`}
                           >
                             {/* Background Track */}
                             <rect
                                x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)"
                                rx="24" ry="24"
                                fill="none"
                                stroke={isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}
                                strokeWidth="1"
                             />
                             
                             {/* Animated Progress Stroke */}
                             <rect
                                x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)"
                                rx="24" ry="24"
                                fill="none"
                                stroke={isDarkMode ? "rgba(255,255,255,0.7)" : "rgba(59, 130, 246, 0.7)"}
                                strokeWidth="1.5"
                                pathLength="100"
                                strokeDasharray="100"
                                strokeDashoffset={100 - progress}
                                strokeLinecap="round"
                                className="transition-all duration-[50ms] ease-linear"
                                style={{ 
                                    filter: isDarkMode ? 'drop-shadow(0 0 3px rgba(255,255,255,0.3))' : 'drop-shadow(0 0 2px rgba(59,130,246,0.3))'
                                }}
                             />
                           </svg>
                       </div>
                  </div>
                );
             })}
          </div>
       </div>

       {/* Pagination Dots */}
       {activeModules.length > 1 && (
          <div className="flex justify-center items-center gap-2 -mt-1 z-20">
             {activeModules.map((_, idx) => (
               <button
                 key={idx}
                 onClick={() => handleManualNav(idx)}
                 className={`
                   transition-all duration-500 ease-out rounded-full
                   ${currentIndex === idx 
                     ? `w-5 h-1 ${isDarkMode ? 'bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.3)]' : 'bg-blue-600/80'} opacity-100` 
                     : `w-1 h-1 ${isDarkMode ? 'bg-white' : 'bg-black'} opacity-10 hover:opacity-40`
                   }
                 `}
                 aria-label={`Go to slide ${idx + 1}`}
               />
             ))}
          </div>
       )}
    </div>
  );
};
