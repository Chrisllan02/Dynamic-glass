
import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  interactive?: boolean;
  isDarkMode?: boolean;
  variant?: 'base' | 'elevated' | 'input';
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  style, 
  interactive = false, 
  isDarkMode = true,
  variant = 'base'
}) => {
  const baseClasses = "relative overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)]";
  
  let bgClasses = "";
  let borderClasses = "";
  let shadowClasses = "";
  let highlightClasses = "";

  // Apple-style Glassmorphism Logic
  if (isDarkMode) {
    if (variant === 'input') {
      bgClasses = "bg-[#1c1c1e]/60"; // iOS dark system gray equivalent
      borderClasses = "border border-white/10 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/30";
    } else {
      // Dark Liquid Glass - Apple Style (High Blur, Saturation Boost, Subtle Border)
      bgClasses = "bg-[#161618]/50 backdrop-saturate-[180%]"; 
      // Borda ultra fina e sutil (hairline)
      borderClasses = "border border-white/[0.08] border-t-white/[0.15]";
      
      shadowClasses = interactive 
        ? "shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6),0_4px_12px_rgba(0,0,0,0.3)]" 
        : "shadow-[0_8px_24px_-6px_rgba(0,0,0,0.3)]";
        
      // Brilho especular sutil no topo (imitando luz ambiente)
      highlightClasses = "after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:bg-gradient-to-b after:from-white/[0.03] after:to-transparent after:pointer-events-none";
    }
  } else {
    if (variant === 'input') {
       bgClasses = "bg-white/70";
       borderClasses = "border border-black/[0.05] focus-within:border-blue-500/40";
    } else {
       // Light Liquid Glass - Frosty
       bgClasses = "bg-white/60 backdrop-saturate-[180%]";
       borderClasses = "border border-white/40 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]";
       shadowClasses = interactive 
        ? "shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1),0_8px_16px_-4px_rgba(0,0,0,0.05)]" 
        : "shadow-[0_4px_12px_-2px_rgba(0,0,0,0.05)]";
       highlightClasses = "after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:bg-gradient-to-b after:from-white/40 after:to-transparent after:pointer-events-none";
    }
  }

  const interactiveClasses = interactive 
    ? "hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] cursor-pointer" 
    : "";

  return (
    <div 
      className={`${baseClasses} ${bgClasses} ${borderClasses} ${shadowClasses} ${highlightClasses} ${interactiveClasses} rounded-[28px] ${className}`} 
      style={{
        backdropFilter: `blur(var(--glass-blur, 50px)) saturate(180%)`, // Apple uses high saturation for glass
        WebkitBackdropFilter: `blur(var(--glass-blur, 50px)) saturate(180%)`,
        ...style
      }}
    >
      {/* Noise Texture - OPTIMIZED: Reduced octaves from 3 to 1 for performance */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay z-0"
           style={{backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='1' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`}}>
      </div>
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  );
};
