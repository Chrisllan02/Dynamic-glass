import React from 'react';

interface PreviewWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export const PreviewWrapper: React.FC<PreviewWrapperProps> = ({ children, className = "" }) => {
  return (
    <div className={`preview-trigger ${className}`}>
      {/* O Conteúdo Original */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* O Card de Preview Flutuante Refinado */}
      <div className="preview-card">
        <div className="inner-card">
          {/* Marcador Dinâmico */}
          <div className="location"></div>
          
          {/* Camadas de Nuvens Animadas */}
          <div className="cloud"></div>
          <div className="cloud"></div>
          <div className="cloud"></div>
          <div className="cloud"></div>
          
          {/* Fundo de Mapa Líquido (Gradientes Mistos) */}
          <div className="absolute inset-0 z-0 opacity-60">
             <div className="w-full h-full bg-[radial-gradient(circle_at_20%_30%,#b0dbbf_0%,transparent_50%),radial-gradient(circle_at_80%_70%,#9ebbb9_0%,transparent_60%),radial-gradient(circle_at_50%_50%,#daecdd_0%,transparent_100%)]"></div>
          </div>
          
          {/* Detalhes Decorativos Estilo Interface */}
          <div className="absolute bottom-3 left-4 z-20">
             <div className="h-1.5 w-14 bg-white/50 rounded-full mb-1.5 shadow-sm"></div>
             <div className="h-1 w-9 bg-white/30 rounded-full shadow-sm"></div>
          </div>

          {/* Overlay de Brilho */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none"></div>
        </div>
      </div>
    </div>
  );
};