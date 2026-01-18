
import { GoogleGenAI, Type } from "@google/genai";
import { QuoteData, HoroscopeData, TechFactData, TodoTask, CalendarEvent } from "../types";
import { storage, STORAGE_KEYS } from "./storageService";

// Helper to get a default quote if API fails
const getDefaultQuote = (): QuoteData => ({
  text: "A simplicidade é o último grau de sofisticação.",
  author: "Leonardo da Vinci"
});

export const getDailyInspiration = async (): Promise<QuoteData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Gere uma frase curta, inspiradora e minimalista para um desenvolvedor ou criativo começar o dia. Em Português. Retorne JSON.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            author: { type: Type.STRING }
          },
          required: ["text", "author"]
        }
      }
    });
    const jsonText = response.text;
    if (!jsonText) return getDefaultQuote();
    return JSON.parse(jsonText) as QuoteData;
  } catch (error) {
    return getDefaultQuote();
  }
};

export const getHoroscope = async (sign: string): Promise<HoroscopeData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Gere um horóscopo muito curto (máximo 20 palavras), místico mas leve, focado em produtividade e criatividade para o signo de ${sign}. Em Português. Retorne JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            mood: { type: Type.STRING }
          },
          required: ["text", "mood"]
        }
      }
    });
    const jsonText = response.text;
    if (!jsonText) throw new Error("No data");
    return { sign, ...JSON.parse(jsonText) };
  } catch (error) {
    return { sign, text: "Sua intuição será seu melhor depurador hoje.", mood: "Intuitivo" };
  }
};

export const getTechFact = async (): Promise<TechFactData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Gere uma curiosidade curta, fascinante e pouco conhecida sobre tecnologia, programação ou história da computação. Máximo 20 palavras. Em Português. Retorne JSON.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fact: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ["fact", "category"]
        }
      }
    });
    return JSON.parse(response.text) as TechFactData;
  } catch (error) {
    return { fact: "O primeiro bug de computador foi um inseto real (uma mariposa) encontrado em um Harvard Mark II em 1947.", category: "Pioneiros" };
  }
};

export const getChatResponse = async (
  message: string, 
  history: { role: string, text: string }[], 
  systemContext?: string,
  mode: 'search' | 'think' = 'search'
): Promise<{ text: string, sources?: { title: string, uri: string }[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const formattedHistory = history.map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] }));
    
    let model = "gemini-3-flash-preview";
    let config: any = {
        systemInstruction: systemContext || "Você é o < Chris /> AI, um assistente pessoal inteligente integrado a uma Nova Guia do navegador. Seja conciso, útil e amigável.",
    };

    if (mode === 'think') {
        // Thinking Mode for complex reasoning
        model = "gemini-3-pro-preview";
        config.thinkingConfig = { thinkingBudget: 32768 };
    } else {
        // Search Grounding Mode (Default)
        config.tools = [{ googleSearch: {} }];
    }

    const chat = ai.chats.create({
      model: model,
      history: formattedHistory as any,
      config: config
    });
    
    const result = await chat.sendMessage({ message });
    
    let sources: { title: string, uri: string }[] = [];
    
    // Extract Grounding Data (Only relevant in search mode)
    const chunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
        sources = chunks
            .filter((c: any) => c.web)
            .map((c: any) => ({ title: c.web.title, uri: c.web.uri }));
    }

    return { text: result.text || "", sources: sources.length > 0 ? sources : undefined };
  } catch (error) {
    console.error(error);
    return { text: "Desculpe, não consegui processar agora." };
  }
};

export const translateText = async (text: string, targetLang: string = "Português"): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Traduza o seguinte texto para ${targetLang}. Retorne APENAS a tradução, sem aspas ou explicações extras: "${text}"`,
    });
    return response.text?.trim() || "Erro na tradução.";
  } catch (error) {
    return "Falha ao conectar com IA.";
  }
};

export const organizeMindDump = async (dump: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analise este fluxo de pensamentos (Mind Dump) e organize-o em tópicos claros, acionáveis e estruturados com emojis. Seja muito conciso. Texto: "${dump}"`,
    });
    return response.text?.trim() || "Não foi possível organizar.";
  } catch (error) {
    return "Erro ao organizar ideias.";
  }
};

export const analyzePlannerData = async (tasks: {text: string, priority: string}[], events: string[]): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const tasksString = tasks.map(t => `${t.text} (Prioridade: ${t.priority})`).join(', ');
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: `Aja como um Coach de Alta Performance. Analise: Tarefas [${tasksString}] e Eventos [${events.join(', ')}]. 
            Crie um plano de ação estratégico de UMA FRASE curta. Comece dizendo qual tarefa é a prioridade número 1 e por que. Seja motivador e direto em Português do Brasil.`
        });
        return response.text?.trim() || "Foque no essencial hoje.";
    } catch (e) {
        return "Organize seu tempo e brilhe!";
    }
};

export const analyzePerformanceHistory = async (historyData: { day: string, count: number }[]): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const stats = historyData.map(h => `${h.day}: ${h.count} tarefas`).join(', ');
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Analise o desempenho semanal do usuário: [${stats}]. Dê um feedback ultra-curto (máximo 15 palavras) sobre a constância dele e um incentivo para a próxima semana. Português do Brasil.`
        });
        return response.text?.trim() || "Mantenha o ritmo!";
    } catch (e) {
        return "Sua jornada de evolução é constante.";
    }
};

export const analyzeImage = async (base64Data: string, mimeType: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { 
              parts: [
                { inlineData: { mimeType, data: base64Data } }, 
                { text: "Aja como um assistente visual inteligente. Analise esta imagem capturada pela webcam do usuário. Se houver texto, transcreva-o. Se houver pessoas, analise a postura ou humor de forma leve. Se houver objetos, identifique-os. Seja conciso e use Português do Brasil." }
              ] 
            }
        });
        return response.text || "Não consegui analisar.";
    } catch (error) { return "Erro ao processar imagem."; }
};

export const summarizeText = async (text: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Resuma: "${text.substring(0, 1000)}"`
        });
        return response.text || "Sem resumo.";
    } catch (error) { return "Erro."; }
};
