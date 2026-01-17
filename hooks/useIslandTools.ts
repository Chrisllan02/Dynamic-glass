import { useState, useRef, useEffect } from 'react';
import { translateText } from '../services/geminiService';
import { uiSounds } from '../services/soundService';

interface LanguageOption {
    code: string;
    label: string;
    voiceURI?: string;
}

const LANGUAGES: LanguageOption[] = [
    { code: 'pt-BR', label: 'Português' },
    { code: 'en-US', label: 'Inglês' },
    { code: 'es-ES', label: 'Espanhol' },
    { code: 'fr-FR', label: 'Francês' },
    { code: 'de-DE', label: 'Alemão' },
    { code: 'ja-JP', label: 'Japonês' },
    { code: 'it-IT', label: 'Italiano' },
    { code: 'zh-CN', label: 'Chinês' }
];

export const useIslandTools = () => {
    // Translator State
    const [translateData, setTranslateData] = useState({ 
        input: '', 
        output: '', 
        sourceLang: 'pt-BR',
        targetLang: 'en-US', 
        loading: false,
        isListening: false,
        isSpeaking: false // New state for TTS visual feedback
    });

    const recognitionRef = useRef<any>(null);

    const speakText = (text: string, lang: string) => {
        if (!text) return;
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 1; // Natural speed
        utterance.pitch = 1;
        
        // Find best voice
        const voices = window.speechSynthesis.getVoices();
        // Try to find Google voices first as they are usually higher quality
        const preferredVoice = voices.find(v => v.lang === lang && v.name.includes('Google')) || 
                               voices.find(v => v.lang === lang);
                               
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onstart = () => setTranslateData(d => ({ ...d, isSpeaking: true }));
        utterance.onend = () => setTranslateData(d => ({ ...d, isSpeaking: false }));
        utterance.onerror = () => setTranslateData(d => ({ ...d, isSpeaking: false }));

        window.speechSynthesis.speak(utterance);
    };

    const handleTranslate = async (textToTranslate?: string) => {
        const text = textToTranslate || translateData.input;
        if (!text.trim()) return;

        setTranslateData(d => ({ ...d, input: text, loading: true, output: '' }));
        
        const targetLabel = LANGUAGES.find(l => l.code === translateData.targetLang)?.label || 'Inglês';
        
        try {
            const result = await translateText(text, targetLabel);
            setTranslateData(d => ({ ...d, output: result, loading: false }));
            speakText(result, translateData.targetLang);
        } catch (error) {
            setTranslateData(d => ({ ...d, loading: false, output: "Erro na conexão." }));
        }
    };

    const toggleListening = () => {
        if (translateData.isListening) {
            if (recognitionRef.current) recognitionRef.current.stop();
            setTranslateData(d => ({ ...d, isListening: false }));
            return;
        }

        // @ts-ignore
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Seu navegador não suporta reconhecimento de voz.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = translateData.sourceLang;
        recognition.continuous = false; // Stop after one sentence to translate immediately
        recognition.interimResults = true; // SHOW TEXT WHILE SPEAKING

        recognition.onstart = () => {
            uiSounds.toggleOn();
            setTranslateData(d => ({ ...d, isListening: true, input: '' }));
        };

        recognition.onend = () => {
            setTranslateData(d => ({ ...d, isListening: false }));
        };

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            // Update UI immediately with interim results
            if (interimTranscript) {
                setTranslateData(d => ({ ...d, input: interimTranscript }));
            }

            // Trigger translation only on final result
            if (finalTranscript) {
                setTranslateData(d => ({ ...d, input: finalTranscript }));
                uiSounds.success();
                handleTranslate(finalTranscript);
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const swapLanguages = () => {
        uiSounds.click();
        setTranslateData(d => ({
            ...d,
            sourceLang: d.targetLang,
            targetLang: d.sourceLang,
            input: d.output, // Swap text context
            output: d.input
        }));
    };

    const setLanguage = (type: 'source' | 'target', code: string) => {
        setTranslateData(d => ({ 
            ...d, 
            [type === 'source' ? 'sourceLang' : 'targetLang']: code 
        }));
    };

    return {
        translateData,
        setTranslateData,
        handleTranslate,
        toggleListening,
        swapLanguages,
        setLanguage,
        speakText,
        LANGUAGES
    };
};