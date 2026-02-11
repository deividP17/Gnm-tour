
import { GoogleGenAI } from "@google/genai";
import React, { useState, useRef, useEffect } from 'react';
import { DEFAULT_LEGAL } from '../constants';

interface LegalAgentProps {
  isEmbedded?: boolean;
  onClose?: () => void;
}

const LegalAgent: React.FC<LegalAgentProps> = ({ isEmbedded = false, onClose }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: '¡Hola! Soy el asistente legal de GNM TOUR. ¿En qué puedo ayudarte hoy respecto a nuestras normativas, el salón de Niño Jesús o nuestros tours?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsTyping(true);

    try {
      // Inicialización siguiendo las guías oficiales de @google/genai
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      const systemInstruction = `
        Eres el Oficial de Cumplimiento Legal de GNM TOUR (Operador: Gerardo Ramón Lafuente).
        
        DATOS CLAVE:
        - Ubicación del Salón/Quincho: Pasaje Niño Jesús 1252, Corrientes Capital.
        - Capacidad Máxima: 60 personas.
        - Horario Límite: 02:00 AM.
        - Tours: Sistema de kilómetros y membresías.
        
        TU MISIÓN:
        1. Responder dudas sobre los Términos y Condiciones proporcionados.
        2. Mantener un tono ejecutivo, serio pero cordial.
        3. Siempre priorizar la seguridad y el cumplimiento del reglamento.
        
        REGLAMENTO LEGAL:
        ${DEFAULT_LEGAL.terms}
        ${DEFAULT_LEGAL.privacy}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.3,
          topP: 0.8,
        },
      });

      const responseText = response.text || 'Lo siento, hubo un problema al procesar la consulta legal. Por favor, comuníquese directamente con la administración.';
      setMessages(prev => [...prev, { role: 'ai', text: responseText }]);
    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, { role: 'ai', text: 'Servicio de IA temporalmente fuera de línea. Por favor, verifique los Términos y Condiciones en el pie de página o contacte a soporte.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="w-[320px] sm:w-[420px] h-[500px] sm:h-[600px] bg-white rounded-[2.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.35)] border border-slate-200 overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 duration-500">
      {/* Header Premium */}
      <div className="bg-slate-950 p-6 text-white flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-blue-600/20">
            <i className="fa-solid fa-gavel"></i>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Consultoría Legal</p>
            <p className="text-base font-black italic tracking-tight">GNM ASISTENTE</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        )}
      </div>

      {/* Cuerpo del Chat */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-5 rounded-[1.8rem] text-[13px] font-medium leading-relaxed shadow-sm ${
              m.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white p-5 rounded-[1.8rem] rounded-tl-none border border-slate-200 flex gap-1.5">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
      </div>

      {/* Input de Mensaje */}
      <div className="p-5 bg-white border-t border-slate-100">
        <div className="relative group">
          <input
            type="text"
            placeholder="Escribe tu consulta legal aquí..."
            className="w-full pl-6 pr-14 py-4 bg-slate-100 border-2 border-transparent rounded-2xl text-xs font-bold focus:bg-white focus:border-blue-600 outline-none transition-all"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-950 text-white rounded-xl flex items-center justify-center hover:bg-blue-600 transition-all disabled:opacity-20 shadow-lg"
          >
            <i className="fa-solid fa-paper-plane text-xs"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LegalAgent;
