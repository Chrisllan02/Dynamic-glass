
import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { GlassCard } from './GlassCard';
import { ChatMessage, TodoTask, CalendarEvent } from '../types';
import { getChatResponse, analyzeImage } from '../services/geminiService';
import { storage, STORAGE_KEYS } from '../services/storageService';
import { uiSounds } from '../services/soundService';

interface AIChatWidgetProps {
  isDarkMode: boolean;
}

export interface AIChatWidgetRef {
    handleExternalFile: (file: File) => void;
}

export const AIChatWidget = forwardRef<AIChatWidgetRef, AIChatWidgetProps>(({ isDarkMode }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: 'Olá! Como posso ajudar você hoje?', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  useImperativeHandle(ref, () => ({
      handleExternalFile: (file: File) => {
          if (!isOpen) setIsOpen(true);
          processFile(file);
      }
  }));

  const buildSystemContext = async (): Promise<string> => {
      // Fetch user data for context
      const tasks = await storage.get<TodoTask[]>(STORAGE_KEYS.TODO_TASKS) || [];
      const events = await storage.get<Record<string, CalendarEvent[]>>(STORAGE_KEYS.CALENDAR_EVENTS) || {};
      
      const pendingTasks = tasks.filter(t => !t.completed).map(t => `- ${t.text} (${t.priority})`).join('\n');
      
      const today = new Date();
      const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const todayEvents = (events[dateKey] || []).map(e => `- ${e.title} at ${e.date}`).join('\n');

      return `
      Você é o < AI, um assistente pessoal ultra-inteligente integrado à Nova Guia do navegador do usuário.
      
      CONTEXTO ATUAL DO USUÁRIO:
      Data: ${today.toLocaleDateString('pt-BR')}
      Tarefas Pendentes:
      ${pendingTasks || "Nenhuma tarefa pendente."}
      
      Eventos de Hoje:
      ${todayEvents || "Nenhum evento hoje."}
      
      DIRETRIZES:
      1. Seja extremamente conciso e direto. Evite floreios.
      2. Use emojis com moderação para manter o tom profissional mas amigável.
      3. Se o usuário perguntar "o que tenho pra fazer?", use os dados acima.
      4. Fale sempre em Português do Brasil.
      `;
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    uiSounds.click();

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
        const history = messages.map(m => ({ role: m.role, text: m.text }));
        const systemContext = await buildSystemContext();
        
        const responseText = await getChatResponse(userMsg.text, history, systemContext);
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: responseText, timestamp: Date.now() }]);
        uiSounds.success();
    } catch (err) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Erro de conexão.", timestamp: Date.now() }]);
        uiSounds.error();
    } finally {
        setIsLoading(false);
    }
  };

  const processFile = async (file: File) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: `📷 Analisando imagem: ${file.name}...`,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result as string;
            const base64Data = base64String.split(',')[1];
            const analysis = await analyzeImage(base64Data, file.type);
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: analysis, timestamp: Date.now() }]);
            setIsLoading(false);
            uiSounds.success();
        };
        reader.readAsDataURL(file);
    } catch (error) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Erro ao processar imagem.", timestamp: Date.now() }]);
        setIsLoading(false);
        uiSounds.error();
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const cardBg = isDarkMode ? 'bg-[#202124]/80' : 'bg-white/80';
  const borderColor = isDarkMode ? 'border-white/10' : 'border-black/5';
  const textColor = isDarkMode ? 'text-white' : 'text-slate-800';
  const bubbleUser = isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white';
  const bubbleModel = isDarkMode ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-800';

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 pointer-events-auto">
      {isOpen && (
        <GlassCard className={`w-[350px] h-[500px] flex flex-col !p-0 overflow-hidden border shadow-2xl animate-[fadeIn_0.3s_ease-out_origin-bottom-right] ${cardBg} ${borderColor}`}>
           <div className={`p-4 border-b flex justify-between items-center ${borderColor} backdrop-blur-md`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined !text-[20px] text-blue-400">auto_awesome</span>
                <span className={`font-medium ${textColor}`}>&lt; AI</span>
              </div>
              
              <label className={`hamburger ${textColor} opacity-60 hover:opacity-100 transition-opacity scale-50 -mr-2`}>
                  <input type="checkbox" checked={true} readOnly onClick={() => { setIsOpen(false); uiSounds.click(); }} />
                  <svg viewBox="0 0 32 32">
                      <path className="line line-top-bottom" d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"></path>
                      <path className="line" d="M7 16 27 16"></path>
                  </svg>
              </label>
           </div>

           <div className="flex-1 overflow-y-auto p-4 gap-3 flex flex-col scrollbar-thin scrollbar-thumb-white/20">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-[fadeIn_0.3s_ease-out]`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? bubbleUser + ' rounded-br-none' : bubbleModel + ' rounded-bl-none'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && <div className="flex justify-start animate-pulse"><div className={`p-3 rounded-2xl rounded-bl-none ${bubbleModel} flex gap-1 items-center`}><span className="material-symbols-outlined !text-[16px] animate-spin">progress_activity</span><span className="text-xs ml-2">Pensando...</span></div></div>}
              <div ref={messagesEndRef} />
           </div>

           <form onSubmit={handleSend} className={`p-3 border-t ${borderColor} bg-black/5`}>
              <div className="relative flex items-center">
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isLoading} className={`absolute left-1.5 p-1.5 rounded-full transition-all flex items-center justify-center disabled:opacity-30 hover:bg-black/10 dark:hover:bg-white/10 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}><span className="material-symbols-outlined !text-[20px]">add_photo_alternate</span></button>
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageSelect} />
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Mensagem..." className={`w-full pl-10 pr-10 py-2.5 rounded-full text-sm outline-none transition-colors ${isDarkMode ? 'bg-white/10 text-white placeholder-white/30 focus:bg-white/15' : 'bg-white text-slate-800 placeholder-slate-400 shadow-sm'}`} />
                <button type="submit" disabled={!input.trim() || isLoading} className={`absolute right-1.5 p-1.5 rounded-full transition-all flex items-center justify-center disabled:opacity-30 ${isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-blue-500 text-white hover:bg-blue-600'}`}><span className="material-symbols-outlined !text-[18px]">send</span></button>
              </div>
           </form>
        </GlassCard>
      )}

      <button onClick={() => { uiSounds.click(); setIsOpen(!isOpen); }} className={`group relative flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-white hover:bg-slate-50'}`}>
        <div className={`absolute inset-0 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity ${isDarkMode ? 'bg-blue-500' : 'bg-blue-300'}`}></div>
        <div className="relative z-10 flex items-center justify-center">
           <span className={`material-symbols-outlined !text-[28px] ${isDarkMode ? 'text-white' : 'text-blue-600'}`}>{isOpen ? 'close' : 'chat_bubble'}</span>
        </div>
      </button>
    </div>
  );
});
