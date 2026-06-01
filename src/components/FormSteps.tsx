import React from "react";
import { Check, Edit, FileText, Settings, Sparkles, Trophy } from "lucide-react";

export interface FormStepsProps {
  currentStep: number;
  setStep: (step: number) => void;
  isCompleted: boolean;
}

export function FormSteps({ currentStep, setStep, isCompleted }: FormStepsProps) {
  const stepsList = [
    { num: 1, label: "Temario", desc: "Contenido curricular", icon: Edit },
    { num: 2, label: "Plantilla", desc: "Formatos oficiales", icon: FileText },
    { num: 3, label: "Configurar", desc: "Semanas y ponderación", icon: Settings },
    { num: 4, label: "Generación IA", desc: "Adaptar estructura", icon: Sparkles },
    { num: 5, label: "Resultado", desc: "Ver y descargar", icon: Trophy },
  ];

  return (
    <div className="bg-white border border-[#D9E2EC] rounded-2xl p-5 shadow-xs mb-6 select-none">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-2">
        {stepsList.map((st, idx) => {
          const StepIcon = st.icon;
          const isActive = currentStep === st.num;
          const isDone = currentStep > st.num || isCompleted;
          
          return (
            <React.Fragment key={st.num}>
              {/* Step indicator node */}
              <button
                type="button"
                onClick={() => setStep(st.num)}
                className="flex items-center gap-3 text-left focus:outline-none focus:ring-2 focus:ring-[#1677D2]/20 rounded-lg p-1.5 transition-all text-[#172033]"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                  isDone 
                    ? "bg-[#EAFBF0] text-[#22C55E] border border-[#22C55E]/30"
                    : isActive
                      ? "bg-[#EAF4FF] text-[#1677D2] border-2 border-[#1677D2]"
                      : "bg-[#F7FAFC] text-[#64748B] border border-[#D9E2EC]"
                }`}>
                  {isDone ? <Check className="w-4 h-4 font-black" /> : <StepIcon className="w-4 h-4" />}
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[12px] font-bold ${
                      isActive ? "text-[#1677D2]" : "text-[#0B2A5B]"
                    }`}>
                      {st.label}
                    </span>
                    {st.num === 4 && (
                      <span className="bg-[#F1EFFF] text-[#6D5DFB] text-[8px] font-extrabold px-1 rounded-sm tracking-wider uppercase">
                        AI
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#64748B] block mt-0.5">
                    {st.desc}
                  </span>
                </div>
              </button>

              {/* Progress Connector line */}
              {idx < stepsList.length - 1 && (
                <div className="hidden md:block flex-1 min-w-[20px] h-[2px] bg-slate-100 mx-3 rounded">
                  <div className={`h-full transition-all duration-300 ${
                    isDone ? "bg-[#22C55E]" : isActive ? "bg-[#1677D2]/50" : "bg-slate-100"
                  }`} style={{ width: isDone ? "100%" : isActive ? "50%" : "0%" }} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
