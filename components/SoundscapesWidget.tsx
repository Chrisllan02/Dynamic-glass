
import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from './GlassCard';

interface SoundscapesWidgetProps {
  isDarkMode: boolean;
  mode?: 'widget' | 'carousel';
  focusMode?: boolean;
}

type SoundType = 'brown' | 'pink' | 'waves' | 'off';

export const SoundscapesWidget: React.FC<SoundscapesWidgetProps> = ({ isDarkMode, mode = 'widget', focusMode = false }) => {
  const [expanded, setExpanded] = useState(false);
  const [activeSound, setActiveSound] = useState<SoundType>('off');
  const [volume, setVolume] = useState(0.5);

  useEffect(() => {
    setExpanded(false);
  }, [focusMode]);

  useEffect(() => {
      const handleCommand = (e: CustomEvent) => {
          const { type, payload } = e.detail;
          if (type === 'sound-toggle') {
              if (activeSound !== 'off') stopSound();
              else playSound('brown'); 
          }
          if (type === 'volume') {
              setVolume(payload);
          }
      };
      window.addEventListener('lumina-command' as any, handleCommand as any);
      return () => window.removeEventListener('lumina-command' as any, handleCommand as any);
  }, [activeSound]);

  useEffect(() => {
      window.dispatchEvent(new CustomEvent('lumina-update', {
          detail: {
              type: 'sound-update',
              payload: { 
                  activeSound, 
                  isPlaying: activeSound !== 'off' 
              }
          }
      }));
  }, [activeSound]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const waveLfoRef = useRef<OscillatorNode | null>(null);
  const waveGainRef = useRef<GainNode | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
      const gainNode = audioCtxRef.current.createGain();
      gainNode.connect(audioCtxRef.current.destination);
      masterGainRef.current = gainNode;
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const createBrownNoise = (ctx: AudioContext): AudioBuffer => {
      const bufferSize = 5 * ctx.sampleRate;
      const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
          const output = buffer.getChannelData(channel);
          let lastOut = 0;
          for (let i = 0; i < bufferSize; i++) {
              const white = Math.random() * 2 - 1;
              lastOut = (lastOut + (0.02 * white)) / 1.02;
              lastOut *= 3.5;
              output[i] = lastOut;
          }
      }
      return buffer;
  };

  const createPinkNoise = (ctx: AudioContext): AudioBuffer => {
      const bufferSize = 5 * ctx.sampleRate;
      const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
          const output = buffer.getChannelData(channel);
          let b0, b1, b2, b3, b4, b5, b6;
          b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
          for (let i = 0; i < bufferSize; i++) {
              const white = Math.random() * 2 - 1;
              b0 = 0.99886 * b0 + white * 0.0555179;
              b1 = 0.99332 * b1 + white * 0.0750759;
              b2 = 0.96900 * b2 + white * 0.1538520;
              b3 = 0.86650 * b3 + white * 0.3104856;
              b4 = 0.55000 * b4 + white * 0.5329522;
              b5 = -0.7616 * b5 - white * 0.0168980;
              output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
              output[i] *= 0.11; 
              b6 = white * 0.115926;
          }
      }
      return buffer;
  };

  const stopSound = () => {
    const ctx = audioCtxRef.current;
    const now = ctx?.currentTime || 0;
    if (masterGainRef.current) {
        masterGainRef.current.gain.cancelScheduledValues(now);
        masterGainRef.current.gain.setValueAtTime(masterGainRef.current.gain.value, now);
        masterGainRef.current.gain.linearRampToValueAtTime(0, now + 0.5);
    }
    setTimeout(() => {
        if (sourceNodeRef.current) {
            try { sourceNodeRef.current.stop(); sourceNodeRef.current.disconnect(); } catch (e) {}
            sourceNodeRef.current = null;
        }
        if (waveLfoRef.current) {
            try { waveLfoRef.current.stop(); waveLfoRef.current.disconnect(); } catch (e) {}
            waveLfoRef.current = null;
        }
        if (waveGainRef.current) {
            try { waveGainRef.current.disconnect(); } catch(e) {}
            waveGainRef.current = null;
        }
    }, 500);
    setActiveSound('off');
  };

  const playSound = (type: SoundType) => {
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx || !masterGainRef.current) return;
    if (activeSound === type) { stopSound(); return; }
    if (activeSound !== 'off') { if (sourceNodeRef.current) try { sourceNodeRef.current.stop(); } catch(e){} }
    masterGainRef.current.gain.setValueAtTime(0, ctx.currentTime);
    masterGainRef.current.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1);
    let buffer: AudioBuffer | null = null;
    let source = ctx.createBufferSource();
    if (type === 'brown') buffer = createBrownNoise(ctx);
    else if (type === 'pink') buffer = createPinkNoise(ctx);
    else if (type === 'waves') {
        buffer = createPinkNoise(ctx);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        const waveGain = ctx.createGain();
        waveGainRef.current = waveGain;
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.15;
        waveLfoRef.current = lfo;
        source.connect(filter);
        filter.connect(waveGain);
        waveGain.connect(masterGainRef.current);
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.5; 
        lfo.connect(lfoGain);
        lfoGain.connect(waveGain.gain);
        waveGain.gain.value = 0.5;
        lfo.start();
        source.loop = true;
        source.buffer = buffer;
        source.start();
        sourceNodeRef.current = source;
        setActiveSound(type);
        return;
    }
    if (buffer) {
        source.buffer = buffer;
        source.loop = true;
        source.connect(masterGainRef.current);
        source.start();
        sourceNodeRef.current = source;
    }
    setActiveSound(type);
  };

  useEffect(() => {
    if (masterGainRef.current && audioCtxRef.current) {
      const now = audioCtxRef.current.currentTime;
      masterGainRef.current.gain.linearRampToValueAtTime(volume, now + 0.1);
    }
  }, [volume]);

  const textPrimary = isDarkMode ? 'text-white' : 'text-slate-800';
  const textSecondary = isDarkMode ? 'text-white/70' : 'text-slate-500';
  const activeBtn = isDarkMode ? 'bg-white text-black shadow-lg scale-105 border border-white font-bold' : 'bg-slate-800 text-white shadow-lg scale-105 border border-slate-900 font-bold';
  const inactiveBtn = isDarkMode ? 'bg-white/20 text-white border border-white/40 hover:bg-white/30 hover:border-white/60' : 'bg-white text-slate-800 border border-black/20 hover:bg-slate-50 hover:border-black/30 shadow-sm';

  const renderControls = () => (
      <div className="flex flex-col gap-6 w-full">
          <div className="grid grid-cols-3 gap-3">
              <button onClick={(e) => { e.stopPropagation(); playSound('brown'); }} className={`py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 ${activeSound === 'brown' ? activeBtn : inactiveBtn}`}>
                  <span className="material-symbols-outlined !text-[20px]">graphic_eq</span>
                  <span>Foco</span>
              </button>
              <button onClick={(e) => { e.stopPropagation(); playSound('pink'); }} className={`py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 ${activeSound === 'pink' ? activeBtn : inactiveBtn}`}>
                  <span className="material-symbols-outlined !text-[20px]">water_drop</span>
                  <span>Chuva</span>
              </button>
              <button onClick={(e) => { e.stopPropagation(); playSound('waves'); }} className={`py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 ${activeSound === 'waves' ? activeBtn : inactiveBtn}`}>
                  <span className="material-symbols-outlined !text-[20px]">waves</span>
                  <span>Ondas</span>
              </button>
          </div>
          
          {/* VOLUME SLIDER ANIMADO */}
          <div className="px-2">
            <div className="slider">
                <span className={`material-symbols-outlined volume-icon ${textSecondary}`}>volume_up</span>
                <input 
                    type="range" 
                    className="level" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={volume} 
                    onChange={(e) => setVolume(parseFloat(e.target.value))} 
                />
            </div>
          </div>
      </div>
  );

  return (
    <div 
        className="flex flex-col items-start gap-2 animate-[fadeIn_1s_ease-out] pointer-events-auto"
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
    >
        <GlassCard 
            isDarkMode={isDarkMode}
            interactive
            className={`!p-0 cursor-pointer flex flex-col justify-start rounded-[24px] ${expanded || mode === 'carousel' ? 'w-[340px] h-auto' : 'w-[200px] h-[64px]'}`}
        >
            {mode === 'widget' && (
                <div className={`flex items-center justify-between px-5 w-full transition-all duration-300 ${expanded ? 'py-5' : 'h-[64px]'}`} onClick={() => setExpanded(!expanded)}>
                    <div className="flex items-center gap-4">
                        <div className={`flex-shrink-0 ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                           <span className="material-symbols-outlined !text-[24px]">headphones</span>
                        </div>
                        <div className="flex flex-col justify-center">
                            <span className={`text-sm font-medium leading-none ${textPrimary}`}>Sons</span>
                             {expanded && (
                                <span className={`text-[10px] mt-1 whitespace-nowrap block ${textSecondary}`}>
                                    {activeSound === 'off' ? 'Silêncio' : activeSound === 'brown' ? 'Ruído Marrom' : activeSound === 'pink' ? 'Chuva' : 'Ondas'}
                                </span>
                             )}
                             {!expanded && (
                                <span className={`text-[10px] mt-1 whitespace-nowrap block ${textSecondary}`}>Foco & Relaxamento</span>
                             )}
                        </div>
                    </div>
                    <div className={`ml-auto transition-transform duration-500 ${expanded ? 'rotate-180' : 'rotate-0'} ${textSecondary}`}>
                         <span className="material-symbols-outlined !text-[20px]">expand_more</span>
                    </div>
                </div>
            )}
            <div className={`transition-all duration-[500ms] ease-[cubic-bezier(0.25,0.8,0.25,1)] overflow-hidden ${(mode === 'widget') ? (isDarkMode ? 'border-t border-white/20' : 'border-t border-black/10') : ''} ${(expanded || mode === 'carousel') ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0 border-t-0'}`}>
                <div className={`p-5 animate-[fadeIn_0.3s_ease-out_0.1s_both] ${mode === 'carousel' ? 'w-full' : ''}`} onClick={(e) => e.stopPropagation()}>
                    {renderControls()}
                </div>
            </div>
        </GlassCard>
    </div>
  );
};
