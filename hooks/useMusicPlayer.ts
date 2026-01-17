
import React, { useState, useRef, useEffect } from 'react';
import { uiSounds } from '../services/soundService';

declare var chrome: any;

// Fallback visual
const DEFAULT_TRACK = { 
    title: 'Aguardando Mídia...', 
    artist: 'Nenhuma aba ativa', 
    src: '', 
    color: '#333333', 
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop&q=80' 
};

export const useMusicPlayer = () => {
    const audioRef = useRef<HTMLAudioElement | null>(null); // Kept for type safety, unused
    const [playerState, setPlayerState] = useState({ 
        isPlaying: false, 
        trackIndex: 0, 
        currentTime: 0, 
        duration: 100,
        volume: 0.5,
        isShuffle: false,
        repeatMode: 'off' as 'off' | 'all' | 'one'
    });

    const [currentTrack, setCurrentTrack] = useState(DEFAULT_TRACK);
    const [connected, setConnected] = useState(false);

    // Polling status from background script
    useEffect(() => {
        if (typeof chrome === 'undefined' || !chrome.runtime) return;

        const syncStatus = () => {
            chrome.runtime.sendMessage({ type: 'MEDIA_CONTROL', action: 'status' }, (response: any) => {
                if (chrome.runtime.lastError) return;
                
                if (response && !response.error) {
                    setConnected(true);
                    setPlayerState(prev => ({
                        ...prev,
                        isPlaying: response.isPlaying,
                        currentTime: response.currentTime || 0,
                        duration: response.duration || 100
                    }));
                    
                    setCurrentTrack({
                        title: response.title || 'Mídia Externa',
                        artist: response.artist || 'Navegador',
                        src: '',
                        color: response.isPlaying ? '#22c55e' : '#64748b', // Green if playing
                        cover: response.cover || 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=300&h=300&fit=crop&q=80'
                    });
                } else {
                    setConnected(false);
                    setPlayerState(prev => ({ ...prev, isPlaying: false }));
                }
            });
        };

        const interval = setInterval(syncStatus, 1000); // Poll every second
        syncStatus(); // Initial check

        return () => clearInterval(interval);
    }, []);

    const sendCommand = (action: string, value?: any) => {
        uiSounds.click();
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage({ type: 'MEDIA_CONTROL', action, value }, (response: any) => {
                // Optimistic UI update
                if (action === 'playPause') {
                    setPlayerState(p => ({ ...p, isPlaying: !p.isPlaying }));
                }
            });
        }
    };

    const toggleMusic = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        sendCommand('playPause');
    };

    const nextTrack = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        sendCommand('next');
    };

    const prevTrack = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        sendCommand('prev');
    };

    const seek = (time: number) => {
        setPlayerState(p => ({ ...p, currentTime: time }));
        sendCommand('seek', time);
    };

    const changeVolume = (val: number) => {
        // Not implemented for external tabs easily due to security, but we keep state
        setPlayerState(p => ({ ...p, volume: val }));
    };

    const toggleShuffle = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setPlayerState(p => ({ ...p, isShuffle: !p.isShuffle }));
    };

    // Stubs for compatibility
    const handleTimeUpdate = () => {};
    const handleLoadedMetadata = () => {};
    const onTrackEnded = () => {};

    return {
        audioRef,
        playerState,
        currentTrack,
        toggleMusic,
        nextTrack,
        prevTrack,
        handleTimeUpdate,
        handleLoadedMetadata,
        onTrackEnded,
        seek,
        changeVolume,
        toggleShuffle,
        toggleRepeat: () => {}
    };
};
