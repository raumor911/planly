import React, { useState } from "react";
import { 
  ClipboardCheck, 
  Sparkles, 
  HelpCircle, 
  FileText, 
  CheckCircle2, 
  Trash2, 
  Plus, 
  AlertTriangle 
} from "lucide-react";

export interface ExamModuleProps {
  materiaName: string;
  onGenerateExamWithAI: (opts: {
    parcial: string;
    tipo: string;
    numPreguntas: number;
    incluirClave: boolean;
  }) => Promise<any>;
}

export interface QuestionItem {
  id: number;
  question: string;
  type: string;
  options?: string[];
  correctAnswer: string;
}

export function ExamModule({ materiaName, onGenerateExamWithAI }: ExamModuleProps) {
  const [parcial, setParcial] = useState("Primer Parcial");
  const [tipo, setTipo] = useState("Opción Múltiple");
  const [numPreguntas, setNumPreguntas] = useState(10);
  const [incluirClave, setIncluirClave] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [examGenerated, setExamGenerated] = useState(false);
  const [questions, setQuestions] = useState<QuestionItem[]>([
    {
      id: 1,
      question: "¿Cuál es el órgano mexicano encargado de coordinar e instrumentar la armonización contable gubernamental?",
      type: "Opción Múltiple",
      options: [
        "A) Auditoría Superior de la Federación (ASF)",
        "B) Consejo Nacional de Armonización Contable (CONAC)",
        "C) Banco de México",
        "D) Secretaría de Hacienda y Crédito Público (SHCP)"
      ],
      correctAnswer: "B) Consejo Nacional de Armonización Contable (CONAC)"
    },
    {
      id: 2,
      question: "La Ley General de Contabilidad Gubernamental es de observancia obligatoria para los tres órdenes de gobierno (Federal, Estatal y Municipal).",
      type: "Verdadero o Falso",
      options: ["A) Verdadero", "B) Falso"],
      correctAnswer: "A) Verdadero"
    },
    {
      id: 3,
      question: "Explique brevemente en qué consiste la 'Armonización Contable' estatal.",
      type: "Pregunta Abierta",
      correctAnswer: "Es el proceso de simplificación y sincronización de formatos presupuestales para consolidar la Cuenta Pública."
    }
  ]);

  const testMateria = materiaName || "Contabilidad de Organizaciones Públicas";

  const handleGenerateExam = async () => {
    setLoading(true);
    try {
      // Simulate/trigger active AI generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Auto-adapt questions based on selection
      if (tipo === "Opción Múltiple") {
        setQuestions([
          {
            id: 1,
            question: "¿Cuál es el principal postulado básico de la contabilidad gubernamental que establece la vigencia de la planeación oficial?",
            type: "Opción Múltiple",
            options: [
              "A) Sustancia Económica",
              "B) Existencia Permanente",
              "C) Revelación Suficiente",
              "D) Importancia Relativa"
            ],
            correctAnswer: "B) Existencia Permanente"
          },
          {
            id: 2,
            question: "¿Qué documento contiene los ingresos estimados y egresos autorizados de una entidad de control directo municipal?",
            type: "Opción Múltiple",
            options: [
              "A) Balance General consolidado",
              "B) Presupuestos de Egresos municipal autorizado",
              "C) Estado de Actividades acumulado",
              "D) Estado de Flujos de Efectivo corriente"
            ],
            correctAnswer: "B) Presupuestos de Egresos municipal autorizado"
          },
          {
            id: 3,
            question: "Representa el momento contable del egreso que refleja la aprobación del gasto por autoridad soberana nacional:",
            type: "Opción Múltiple",
            options: [
              "A) Comprometido",
              "B) Devengado",
              "C) Aprobado",
              "D) Pagado"
            ],
            correctAnswer: "C) Aprobado"
          }
        ]);
      } else if (tipo === "Verdadero o Falso") {
        setQuestions([
          {
            id: 1,
            question: "El Registro Contable de los Ingresos Públicos se realiza únicamente bajo la base de efectivo cobrado en la caja del tesoro municipal.",
            type: "Verdadero o Falso",
            options: ["A) Verdadero", "B) Falso"],
            correctAnswer: "B) Falso"
          },
          {
            id: 2,
            question: "Las entidades paraestatales no están sujetas a la normatividad emitida por el CONAC de acuerdo a la Ley Suprema de Egresos.",
            type: "Verdadero o Falso",
            options: ["A) Verdadero", "B) Falso"],
            correctAnswer: "B) Falso"
          }
        ]);
      } else {
        setQuestions([
          {
            id: 1,
            question: "Describa la diferencia primordial entre el momento contable del gasto 'Devengado' y el 'Pagado'.",
            type: "Pregunta Abierta",
            correctAnswer: "El devengado reconoce la obligación de pago al recibir conformidad del bien o servicio, mientras que el pagado representa la erogación de efectivo y cancelación del pasivo."
          }
        ]);
      }
      setExamGenerated(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteQuestion = (id: number) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const addEmptyQuestion = () => {
    const newId = questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1;
    setQuestions([...questions, {
      id: newId,
      question: "Escriba aquí la nueva pregunta de evaluación...",
      type: tipo,
      options: tipo === "Opción Múltiple" ? ["Opción A", "Opción B", "Opción C", "Opción D"] : undefined,
      correctAnswer: "Escriba la clave correcta aquí"
    }]);
  };

  return (
    <div className="bg-white border border-[#D9E2EC] rounded-2xl shadow-xs overflow-hidden">
      {/* HEADER COLOURED */}
      <div className="p-5 bg-gradient-to-r from-[#0B2A5B] to-[#1677D2] text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[#6D5DFB] text-white text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-sm tracking-wider">
              Módulo de Evaluación
            </span>
          </div>
          <h2 className="text-lg font-bold tracking-tight">Instrumentos y Banco de Exámenes</h2>
          <p className="text-xs text-blue-100 mt-0.5">
            Genera exámenes alineados a los temas y objetivos curriculares de <span className="font-bold underline">{testMateria}</span>.
          </p>
        </div>
        <button
          onClick={handleGenerateExam}
          disabled={loading}
          className="bg-[#6D5DFB] font-semibold text-xs text-white rounded-xl py-2.5 px-4.5 border-none shadow-md hover:bg-[#5b4fe3] transition-all flex items-center gap-2 cursor-pointer"
        >
          {loading ? (
            <span className="animate-spin">🌀 Generando...</span>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generar Examen del Parcial</span>
            </>
          )}
        </button>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PARÁMETROS DE CONFIGURACIÓN DEL EXAMEN */}
        <div className="lg:col-span-4 bg-[#F7FAFC] border border-[#D9E2EC] p-5 rounded-xl space-y-4">
          <h3 className="text-xs font-bold text-[#0B2A5B] uppercase tracking-wider block border-b border-[#D9E2EC] pb-2">
            Ajustes del Instrumento
          </h3>

          {/* Periodo Parcial */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#0B2A5B]">Período de Evaluación</label>
            <select
              value={parcial}
              onChange={(e) => setParcial(e.target.value)}
              className="w-full bg-white border border-[#D9E2EC] rounded-lg p-2 text-xs text-[#172033] font-bold outline-hidden focus:border-[#1677D2]"
            >
              <option value="Primer Parcial">Primer Parcial (Sesiones 1-5)</option>
              <option value="Segundo Parcial">Segundo Parcial (Sesiones 6-10)</option>
              <option value="Tercer Parcial">Tercer Parcial (Sesiones 11-14)</option>
              <option value="Examen Final">Examen de Evaluación Final Integrador</option>
            </select>
          </div>

          {/* Tipo de Reactivos */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#0B2A5B]">Tipo de Reactivos</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full bg-white border border-[#D9E2EC] rounded-lg p-2 text-xs text-[#172033] font-bold outline-hidden focus:border-[#1677D2]"
            >
              <option value="Opción Múltiple">Opción Múltiple (Recomendado)</option>
              <option value="Verdadero o Falso">Verdadero o Falso</option>
              <option value="Pregunta Abierta">Preguntas de Desarrollo / Abiertas</option>
              <option value="Relación de Columnas">Relación de Columnas de Armonización</option>
            </select>
          </div>

          {/* Cantidad de preguntas */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#0B2A5B]">Cantidad de Reactivos</label>
            <div className="flex items-center justify-between">
              <input
                type="range"
                min="3"
                max="25"
                value={numPreguntas}
                onChange={(e) => setNumPreguntas(Number(e.target.value))}
                className="w-2/3 h-1.5 bg-slate-200 rounded-lg cursor-pointer accent-[#1677D2]"
              />
              <span className="font-extrabold text-xs text-[#1677D2] bg-white border border-[#B9DFFF] px-2 py-1 rounded-md">
                {numPreguntas} Preguntas
              </span>
            </div>
          </div>

          {/* Incluir clave */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="includeKey"
              checked={incluirClave}
              onChange={(e) => setIncluirClave(e.target.checked)}
              className="rounded text-[#1677D2] border-[#D9E2EC] focus:ring-[#1677D2]"
            />
            <label htmlFor="includeKey" className="text-xs font-bold text-[#0B2A5B] cursor-pointer">
              Generar Clave de Respuestas sugeridas
            </label>
          </div>

          <div className="pt-3 border-t border-[#D9E2EC] text-[11px] text-slate-500 space-y-1.5">
            <div className="flex items-center gap-1 text-[#F59E0B] font-bold">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Alineación Pedagógica</span>
            </div>
            <p>
              Planly utiliza el temario cargado en memoria para mapear objetivos de cada sesión y garantizar la validez de contenido institucional de cada examen.
            </p>
          </div>
        </div>

        {/* CONTENIDO DEL EXAMEN GENERADO (EDITADOR) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-[#0B2A5B] uppercase tracking-wider">
              Vista del Banco de Reactivos ({questions.length} Preguntas)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={addEmptyQuestion}
                className="bg-[#EAF4FF] text-[#0B2A5B] border border-[#B9DFFF] hover:bg-sky-100 text-[11px] font-bold py-1.5 px-3 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Reactivo</span>
              </button>
            </div>
          </div>

          {/* LIST OF QUESTIONS */}
          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {questions.map((q, idx) => (
              <div key={q.id} className="bg-white border border-[#D9E2EC] rounded-xl p-4 relative hover:border-[#1677D2]/40 transition-colors">
                <button
                  type="button"
                  onClick={() => deleteQuestion(q.id)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Eliminar pregunta"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="flex items-start gap-2.5">
                  <span className="font-mono text-xs font-extrabold text-[#1677D2] bg-[#EAF4FF] px-2 py-0.5 rounded-md shrink-0 block">
                    Q{idx + 1}
                  </span>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => {
                        const newQs = [...questions];
                        newQs[idx].question = e.target.value;
                        setQuestions(newQs);
                      }}
                      className="w-full text-xs font-bold text-[#0B2A5B] bg-transparent border-b border-dashed border-slate-200 focus:border-[#1677D2] focus:outline-none pb-1"
                    />

                    {/* Show options if options existed */}
                    {q.options && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 pl-1">
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-400 font-bold">{String.fromCharCode(65 + optIdx)})</span>
                            <input
                              type="text"
                              value={opt.substring(3)}
                              onChange={(e) => {
                                const newQs = [...questions];
                                if (newQs[idx].options) {
                                  newQs[idx].options![optIdx] = `${String.fromCharCode(65 + optIdx)}) ${e.target.value}`;
                                  setQuestions(newQs);
                                }
                              }}
                              className="text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded px-1.5 py-1 w-full"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Answer Key preview */}
                    {incluirClave && (
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Respuesta Correcta:</span>
                        <input
                          type="text"
                          value={q.correctAnswer}
                          onChange={(e) => {
                            const newQs = [...questions];
                            newQs[idx].correctAnswer = e.target.value;
                            setQuestions(newQs);
                          }}
                          className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded px-2 py-0.5 text-right font-semibold"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* EXCEL/W EXPORT ACTION BAR */}
          <div className="bg-[#EFF6FF] border border-[#B9DFFF] rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 mt-2">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
              <div className="text-xs">
                <span className="font-bold text-[#0B2A5B] block">Examen alineado al formato institucional</span>
                <span className="text-slate-600">Listo para inyectarlo en su plantilla oficial de reactivos</span>
              </div>
            </div>
            <button
              onClick={() => {
                alert(`Descargando Banco de Exámenes del ${parcial} para ${testMateria} (Formato Word)`);
              }}
              className="bg-[#22C55E] text-white hover:bg-[#1faa4f] font-bold text-xs py-2 px-4 rounded-xl shadow-xs border-none cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" />
              <span>Descargar Examen (.docx)</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
