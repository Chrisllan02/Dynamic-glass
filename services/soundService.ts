
import { storage, STORAGE_KEYS } from './storageService';

let audioCtx: AudioContext | null = null;
let soundEnabled: boolean | null = null;

const initAudio = () => {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

const checkEnabled = async () => {
  if (soundEnabled === null) {
    const enabled = await storage.get<boolean>(STORAGE_KEYS.UI_SOUNDS);
    soundEnabled = enabled !== false; // Default true
  }
  return soundEnabled;
};

// Update cache when settings change
export const refreshSoundSettings = async () => {
    const enabled = await storage.get<boolean>(STORAGE_KEYS.UI_SOUNDS);
    soundEnabled = enabled !== false;
};

const playTone = async (freq: number, type: OscillatorType, duration: number, vol: number = 0.1) => {
  if (!(await checkEnabled())) return;
  const ctx = initAudio();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + duration);
};

export const uiSounds = {
  hover: () => playTone(800, 'sine', 0.05, 0.02), // Ultra quiet tick
  click: () => playTone(600, 'triangle', 0.1, 0.05), // Soft thud
  toggleOn: () => {
      playTone(400, 'sine', 0.1, 0.05);
      setTimeout(() => playTone(600, 'sine', 0.1, 0.05), 50);
  },
  toggleOff: () => {
      playTone(600, 'sine', 0.1, 0.05);
      setTimeout(() => playTone(400, 'sine', 0.1, 0.05), 50);
  },
  success: () => {
      playTone(440, 'sine', 0.1, 0.05);
      setTimeout(() => playTone(554, 'sine', 0.1, 0.05), 100);
      setTimeout(() => playTone(659, 'sine', 0.2, 0.05), 200);
  },
  error: () => {
      playTone(300, 'sawtooth', 0.1, 0.05);
      setTimeout(() => playTone(200, 'sawtooth', 0.2, 0.05), 100);
  }
};
