import React, { useState } from "react";
import { Sparkles, ArrowRight, HelpCircle, GraduationCap, CheckCircle2, ChevronRight, X } from "lucide-react";

export interface AsistentePlanlyProps {
  temario: string;
  materia: string;
  numSesiones: number;
  totalPct: number;
  onApplySuggestion: (suggestion: string) => void;
  onClose?: () => void;
}

export function AsistentePlanly({ temario, materia, numSesiones, totalPct, onApplySuggestion, onClose }: AsistentePlanlyProps) {
  const [messages, setMessages] = useState<Array<{ sender: "user" | "planly"; text: string }>>([
    {
      sender: "planly",
      text: "Hola docente, soy tu Copiloto Planly. Puedo optimizar objetivos particulares, recomendar estrategias de aprendizaje, validar la ponderación de tus exámenes, o redactar bibliografía de apoyo sugerida por IA."
    }
  ]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const askAssistant = (text: string) => {
    if (!text.trim()) return;
    
    const userMsg = text;
    setMessages(prev => [...prev, { sender: "user", text: userMsg }]);
    setQuery("");
    setLoading(true);

    setTimeout(() => {
      let responseText = "";
      const lower = userMsg.toLowerCase();
      
      if (lower.includes("objetiv") || lower.includes("competenc")) {
        responseText = `🎯 RECOMENDACIÓN DE OBJETIVOS:\nPara la materia, sugiero estructurar los objetivos en base a la Taxonomía de Bloom:\n- Cognitivo: Explicar marcos de regulación de organizaciones mexicanas.\n- Procedimental: Aplicar asientos contables en presupuestos oficiales.\n- Actitudinal: Evaluar con ética y transparencia gubernamental.`;
      } else if (lower.includes("estrategi") || lower.includes("actividad")) {
        responseText = `💡 ESTRATEGIAS RECOMENDADAS:\n1. Taller Cooperativo: Simulacro del clasificador por objeto del gasto (Sesión 3).\n2. Análisis de Caso Auténtico: Diagnóstico de la Cuenta Pública Estatal (Sesión 7).\n3. Práctica de Plataforma: Pruebas automatizadas de conciliación bancaria estatal (Sesión 10).`;
      } else if (lower.includes("bibliograf") || lower.includes("libro")) {
        responseText = `📚 REFERENCIAS PARA ORGANIZACIONES PÚBLICAS:\n- Arellano Gault, D. (2020). Gestión de Organizaciones Gubernamentales. Fondo de Cultura Económica.\n- CONAC (2024). Lineamientos Generales del Sistema de Contabilidad Gubernamental.\n- López, M. (2022). Presupuestos y Auditoría Superior Mexicana. Editorial Trillas.`;
      } else if (lower.includes("valida") || lower.includes("consej")) {
        responseText = `🔍 REVISIÓN DE SESIONES:\nTienes ${numSesiones} sesiones programadas. La planeación fluye con un balance de 2.4 horas de práctica por cada hora teórica. Tu sumatoria de evaluación es del ${totalPct}%, lo cual es ideal para el formato institucional de planeaciones curriculares.`;
      } else {
        responseText = `✨ SUGERENCIA DE COPILOTO:\nPara consolidar el temario que has ingresado, te sugiero incluir un taller de auditoría de egresos o evaluación financiera al final de tus sesiones (Módulos de la sesión ${Math.min(14, numSesiones)}).`;
      }

      setMessages(prev => [...prev, { sender: "planly", text: responseText }]);
      setLoading(false);
    }, 1200);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    askAssistant(query);
  };

  const quickPrompts = [
    { title: "Sugerir objetivos didácticos", prompt: "Sugerir objetivos de aprendizaje para " + (materia || "este temario") },
    { title: "Recomendar bibliografía oficial", prompt: "Recomendar referencias bibliográficas en formato APA para " + (materia || "Contabilidad Pública") },
    { title: "Estrategias de aprendizaje", prompt: "Sugerir 3 estrategias didácticas para las sesiones" },
    { title: "Comprobar consistencia", prompt: "¿Cómo equilibrar mejor las sesiones y la ponderación actual?" },
  ];

  return (
    <aside className="w-80 bg-white border-l border-[#D9E2EC] flex flex-col shrink-0 h-full justify-between">
      {/* HEADER */}
      <div className="p-4 border-b border-[#D9E2EC] bg-[#F1EFFF] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#6D5DFB] flex items-center justify-center text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-[#0B2A5B] text-xs uppercase tracking-wider block">Asistente Planly</h3>
            <span className="text-[10px] text-[#6D5DFB] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-[#6D5DFB] rounded-full animate-ping"></span>
              Copiloto IA Activo
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5">
          <span className="bg-[#6D5DFB]/10 text-[#6D5DFB] text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase">
            Sugerencias
          </span>
          {onClose && (
            <button
              onClick={onClose}
              type="button"
              className="p-1 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border-none bg-transparent cursor-pointer transition-all flex items-center justify-center"
              title="Ocultar Copiloto para más espacio"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* CHAT BUBBLES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}>
            <span className="text-[9px] font-bold text-slate-400 mb-0.5 uppercase tracking-wide">
              {m.sender === "user" ? "Tú" : "Asistente Planly"}
            </span>
            <div className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[90%] whitespace-pre-wrap font-medium shadow-2xs ${
              m.sender === "user" 
                ? "bg-[#1677D2] text-white rounded-tr-none" 
                : "bg-slate-50 text-[#172033] rounded-tl-none border border-[#D9E2EC]"
            }`}>
              {m.text}
              {m.sender === "planly" && idx === messages.length - 1 && (
                <div className="mt-2.5 pt-2 border-t border-slate-200/50 flex flex-wrap gap-1">
                  <button 
                    onClick={() => onApplySuggestion(m.text)}
                    className="text-[10px] font-bold text-[#6D5DFB] flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <span>Copiar recomendación</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-1 text-slate-400 text-xs font-mono py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6D5DFB] animate-bounce" style={{ animationDelay: "0ms" }}></span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#6D5DFB] animate-bounce" style={{ animationDelay: "150ms" }}></span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#6D5DFB] animate-bounce" style={{ animationDelay: "300ms" }}></span>
            <span className="text-[10px] ml-1">Planly está redactando...</span>
          </div>
        )}
      </div>

      {/* QUICK SUGGESTIONS CARDS */}
      <div className="px-4 py-2 bg-slate-50/50 border-t border-slate-100">
        <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider block mb-1.5">Sugerencias Didácticas</span>
        <div className="grid grid-cols-1 gap-1">
          {quickPrompts.map((p, pIdx) => (
            <button
              key={pIdx}
              onClick={() => askAssistant(p.prompt)}
              className="text-left bg-white border border-[#D9E2EC] hover:border-[#6D5DFB]/40 hover:bg-[#F1EFFF]/30 px-2.5 py-1.5 rounded-lg text-[10.5px] font-semibold text-[#0B2A5B] cursor-pointer transition-colors flex items-center justify-between"
            >
              <span>{p.title}</span>
              <ArrowRight className="w-3 h-3 text-[#6D5DFB]" />
            </button>
          ))}
        </div>
      </div>

      {/* INPUT FORM */}
      <form onSubmit={handleSend} className="p-3 border-t border-[#D9E2EC] bg-white flex items-center gap-1.5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pregúntale a Planly..."
          className="flex-1 bg-slate-50 border border-[#D9E2EC] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#6D5DFB] focus:ring-1 focus:ring-[#6D5DFB] transition-all text-[#172033]"
        />
        <button
          type="submit"
          disabled={!query.trim()}
          className={`w-8 h-8 rounded-xl flex items-center justify-center bg-[#6D5DFB] text-white cursor-pointer active:scale-95 transition-all outline-none border-none ${
            !query.trim() ? "opacity-50 cursor-not-allowed" : "hover:bg-[#5241DA]"
          }`}
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </aside>
  );
}
