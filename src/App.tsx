import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Download,
  FilePlus,
  FileText,
  FileUp,
  History,
  Loader2,
  Percent,
  RefreshCw,
  ScrollText,
  Settings,
  Sliders,
  Sparkles,
  Type,
} from "lucide-react";
import { SidebarMenu } from "./components/SidebarMenu";
import { FormSteps } from "./components/FormSteps";
import { ExamModule } from "./components/ExamModule";
import { PlanlyLogo } from "./components/PlanlyLogo";
import { SYLLABUS_SPECIMEN } from "./constants/specimen";

type TemplateMeta = {
  hasCustom: boolean;
  fileName?: string;
  fileSize?: number;
  uploadedAt?: string;
};

type GeneratedSession = {
  num: number;
  fecha: string;
  tema: string;
  actividad: string;
  objetivo: string;
};

type GeneratePreviewResponse =
  | {
      success: true;
      materia?: string;
      objetivo?: string;
      clave?: string;
      payload: { sessions: GeneratedSession[] };
    }
  | { success: false; error?: string };

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem("planly_activeTab") || "inicio";
    } catch {
      return "inicio";
    }
  });
  const [currentStep, setCurrentStep] = useState(() => {
    try {
      const stored = localStorage.getItem("planly_currentStep");
      return stored ? parseInt(stored, 10) : 1;
    } catch {
      return 1;
    }
  });

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [exportMessage, setExportMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const compileTimeoutRef = React.useRef<any>(null);
  const compileAbortRef = React.useRef<AbortController | null>(null);
  const compileRunIdRef = React.useRef(0);

  const [fileParsing, setFileParsing] = useState(false);
  const [fileParseError, setFileParseError] = useState("");
  const [fileParseSuccess, setFileParseSuccess] = useState(false);

  const [temario, setTemario] = useState(() => {
    try {
      return localStorage.getItem("planly_temario") || "";
    } catch {
      return "";
    }
  });
  const [materiaName, setMateriaName] = useState(() => {
    try {
      return localStorage.getItem("planly_materiaName") || "Contabilidad de Organizaciones Públicas";
    } catch {
      return "Contabilidad de Organizaciones Públicas";
    }
  });
  const [objetivoGeneral, setObjetivoGeneral] = useState(() => {
    try {
      return localStorage.getItem("planly_objetivoGeneral") || "";
    } catch {
      return "";
    }
  });
  const [claveMateria, setClaveMateria] = useState(() => {
    try {
      return localStorage.getItem("planly_claveMateria") || "";
    } catch {
      return "";
    }
  });
  const [nivelEducativo, setNivelEducativo] = useState(() => {
    try {
      return localStorage.getItem("planly_nivelEducativo") || "Licenciatura / Pregrado";
    } catch {
      return "Licenciatura / Pregrado";
    }
  });
  const [fechaInicio, setFechaInicio] = useState(() => {
    try {
      return localStorage.getItem("planly_fechaInicio") || "2026-05-11";
    } catch {
      return "2026-05-11";
    }
  });
  const [numSesiones, setNumSesiones] = useState(() => {
    try {
      const stored = localStorage.getItem("planly_numSesiones");
      return stored ? parseInt(stored, 10) : 14;
    } catch {
      return 14;
    }
  });
  const [examenPct, setExamenPct] = useState(() => {
    try {
      const stored = localStorage.getItem("planly_examenPct");
      return stored ? parseInt(stored, 10) : 30;
    } catch {
      return 30;
    }
  });
  const [continuaPct, setContinuaPct] = useState(() => {
    try {
      const stored = localStorage.getItem("planly_continuaPct");
      return stored ? parseInt(stored, 10) : 40;
    } catch {
      return 40;
    }
  });
  const [plataformaPct, setPlataformaPct] = useState(() => {
    try {
      const stored = localStorage.getItem("planly_plataformaPct");
      return stored ? parseInt(stored, 10) : 30;
    } catch {
      return 30;
    }
  });
  const [exposicionPct, setExposicionPct] = useState(() => {
    try {
      const stored = localStorage.getItem("planly_exposicionPct");
      return stored ? parseInt(stored, 10) : 15;
    } catch {
      return 15;
    }
  });
  const [mecanismo, setMecanismo] = useState(() => {
    try {
      return localStorage.getItem("planly_mecanismo") || "Semanas Consecutivas";
    } catch {
      return "Semanas Consecutivas";
    }
  });
  const [tipografia, setTipografia] = useState(() => {
    try {
      return localStorage.getItem("planly_tipografia") || "Arial / Calibri";
    } catch {
      return "Arial / Calibri";
    }
  });
  const [entregableType, setEntregableType] = useState(() => {
    try {
      return localStorage.getItem("planly_entregableType") || "Programa Operativo Oficial";
    } catch {
      return "Programa Operativo Oficial";
    }
  });

  const [templateBase64, setTemplateBase64] = useState<string>(() => {
    try {
      return localStorage.getItem("planly_templatebase64") || "";
    } catch {
      return "";
    }
  });
  const [templateMeta, setTemplateMeta] = useState<TemplateMeta>(() => {
    try {
      const stored = localStorage.getItem("planly_templateMeta");
      return stored ? (JSON.parse(stored) as TemplateMeta) : { hasCustom: false };
    } catch {
      return { hasCustom: false };
    }
  });
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [templateMsg, setTemplateMsg] = useState("");
  const [templateError, setTemplateError] = useState("");

  const [generatedSessions, setGeneratedSessions] = useState<GeneratedSession[]>(() => {
    try {
      const stored = localStorage.getItem("planly_generatedSessions");
      return stored ? (JSON.parse(stored) as GeneratedSession[]) : [];
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem("planly_activeTab", activeTab);
    } catch {
      // ignore
    }
  }, [activeTab]);
  React.useEffect(() => {
    try {
      localStorage.setItem("planly_currentStep", currentStep.toString());
    } catch {
      // ignore
    }
  }, [currentStep]);
  React.useEffect(() => {
    try {
      localStorage.setItem("planly_temario", temario);
    } catch {
      // ignore
    }
  }, [temario]);
  React.useEffect(() => {
    try {
      localStorage.setItem("planly_materiaName", materiaName);
    } catch {
      // ignore
    }
  }, [materiaName]);
  React.useEffect(() => {
    try {
      localStorage.setItem("planly_objetivoGeneral", objetivoGeneral);
    } catch {
      // ignore
    }
  }, [objetivoGeneral]);
  React.useEffect(() => {
    try {
      localStorage.setItem("planly_claveMateria", claveMateria);
    } catch {
      // ignore
    }
  }, [claveMateria]);
  React.useEffect(() => {
    try {
      localStorage.setItem("planly_nivelEducativo", nivelEducativo);
    } catch {
      // ignore
    }
  }, [nivelEducativo]);
  React.useEffect(() => {
    try {
      localStorage.setItem("planly_fechaInicio", fechaInicio);
    } catch {
      // ignore
    }
  }, [fechaInicio]);
  React.useEffect(() => {
    try {
      localStorage.setItem("planly_numSesiones", numSesiones.toString());
    } catch {
      // ignore
    }
  }, [numSesiones]);
  React.useEffect(() => {
    try {
      localStorage.setItem("planly_examenPct", examenPct.toString());
      localStorage.setItem("planly_continuaPct", continuaPct.toString());
      localStorage.setItem("planly_plataformaPct", plataformaPct.toString());
      localStorage.setItem("planly_exposicionPct", exposicionPct.toString());
    } catch {
      // ignore
    }
  }, [examenPct, continuaPct, plataformaPct, exposicionPct]);
  React.useEffect(() => {
    try {
      localStorage.setItem("planly_mecanismo", mecanismo);
    } catch {
      // ignore
    }
  }, [mecanismo]);
  React.useEffect(() => {
    try {
      localStorage.setItem("planly_tipografia", tipografia);
    } catch {
      // ignore
    }
  }, [tipografia]);
  React.useEffect(() => {
    try {
      localStorage.setItem("planly_entregableType", entregableType);
    } catch {
      // ignore
    }
  }, [entregableType]);
  React.useEffect(() => {
    try {
      if (templateBase64) localStorage.setItem("planly_templatebase64", templateBase64);
      else localStorage.removeItem("planly_templatebase64");
    } catch {
      // ignore
    }
  }, [templateBase64]);
  React.useEffect(() => {
    try {
      localStorage.setItem("planly_templateMeta", JSON.stringify(templateMeta));
    } catch {
      // ignore
    }
  }, [templateMeta]);
  React.useEffect(() => {
    try {
      localStorage.setItem("planly_generatedSessions", JSON.stringify(generatedSessions));
    } catch {
      // ignore
    }
  }, [generatedSessions]);

  const totalPct = useMemo(() => {
    return Number(examenPct) + Number(continuaPct) + Number(plataformaPct) + Number(exposicionPct);
  }, [examenPct, continuaPct, plataformaPct, exposicionPct]);

  const compileIndicator = useMemo(() => {
    if (errorMessage && !downloadUrl) {
      return {
        label: "Error de compilación",
        containerClassName: "bg-rose-50 text-rose-800 border-rose-200",
        dotClassName: "bg-rose-500",
      };
    }
    if (isCompiling) {
      return {
        label: "Compilando en segundo plano...",
        containerClassName: "bg-amber-50 text-amber-800 border-amber-200",
        dotClassName: "bg-amber-500 animate-pulse",
      };
    }
    if (downloadUrl) {
      return {
        label: "Compilación lista",
        containerClassName: "bg-emerald-50 text-emerald-800 border-emerald-200",
        dotClassName: "bg-emerald-500",
      };
    }
    return {
      label: "Pendiente de compilación",
      containerClassName: "bg-slate-50 text-slate-700 border-slate-200",
      dotClassName: "bg-slate-400",
    };
  }, [downloadUrl, errorMessage, isCompiling]);

  const loadSpecimen = () => {
    setTemario(SYLLABUS_SPECIMEN);
    setMateriaName("Contabilidad de Organizaciones Públicas");
    setErrorMessage("");
    setSuccess(false);
  };

  const loadDemoAndStart = () => {
    loadSpecimen();
    setActiveTab("planeacion");
    setCurrentStep(1);
  };

  const handleTemarioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setFileParseError("El archivo supera el límite permitido de 10 MB.");
      setFileParseSuccess(false);
      return;
    }

    setFileParsing(true);
    setFileParseError("");
    setFileParseSuccess(false);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64String = (reader.result as string).split(",")[1];
        const response = await fetch("/api/curricula/extract-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileBase64: base64String,
            mimeType: file.type,
            fileName: file.name,
          }),
        });

        if (!response.ok) {
          const errData = (await response.json()) as { error?: string };
          throw new Error(errData.error || "Error al procesar el temario.");
        }

        const data = (await response.json()) as { success: boolean; extractedText?: string };
        if (data.success && data.extractedText) {
          setTemario(data.extractedText);
          setFileParseSuccess(true);
        } else {
          throw new Error("No se pudo extraer contenido organizado del archivo.");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al leer el archivo.";
        setFileParseError(msg);
      } finally {
        setFileParsing(false);
      }
    };

    reader.onerror = () => {
      setFileParseError("No se pudo leer el archivo binario.");
      setFileParsing(false);
    };

    reader.readAsDataURL(file);
  };

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".docx")) {
      setTemplateError("Por favor, selecciona un archivo válido de Word (.docx).");
      setTemplateMsg("");
      return;
    }

    setUploadingTemplate(true);
    setTemplateError("");
    setTemplateMsg("");

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const base64String = (reader.result as string).split(",")[1];
        setTemplateBase64(base64String);
        setTemplateMeta({
          hasCustom: true,
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
        });
        setTemplateMsg("Plantilla personalizada cargada con éxito. Se usará este formato para compilar.");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al procesar la plantilla.";
        setTemplateError(msg);
      } finally {
        setUploadingTemplate(false);
      }
    };

    reader.onerror = () => {
      setTemplateError("Error al leer el archivo.");
      setUploadingTemplate(false);
    };

    reader.readAsDataURL(file);
  };

  const handleResetTemplate = () => {
    setTemplateBase64("");
    setTemplateMeta({ hasCustom: false });
    setGeneratedSessions([]);
    setIsCompiling(false);
    setExportMessage("");
    setDownloadUrl((prev) => {
      if (prev) window.URL.revokeObjectURL(prev);
      return null;
    });
    try {
      localStorage.removeItem("planly_templatebase64");
      localStorage.removeItem("planly_templateMeta");
      localStorage.removeItem("planly_generatedSessions");
    } catch {
      // ignore
    }
    setTemplateMsg("Se ha restablecido el formato estándar por defecto.");
    setTemplateError("");
  };

  const generateAndCacheDocx = async (sessionsList: GeneratedSession[]) => {
    if (!sessionsList.length) {
      setDownloadUrl((prev) => {
        if (prev) window.URL.revokeObjectURL(prev);
        return null;
      });
      setIsCompiling(false);
      setExportMessage("");
      return;
    }

    if (compileTimeoutRef.current) {
      window.clearTimeout(compileTimeoutRef.current);
    }

    compileTimeoutRef.current = window.setTimeout(async () => {
      const runId = ++compileRunIdRef.current;
      try {
        setIsCompiling(true);
        setErrorMessage("");
        setExportMessage("");

        if (compileAbortRef.current) {
          compileAbortRef.current.abort();
        }
        const abortController = new AbortController();
        compileAbortRef.current = abortController;

        const response = await fetch("/api/curricula/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortController.signal,
          body: JSON.stringify({
            sesionesOverride: sessionsList,
            templateBase64: templateBase64 || undefined,
            materiaOverride: materiaName,
            objetivoOverride: objetivoGeneral,
            claveOverride: claveMateria,
            fechaInicio,
            numSesiones,
            examenPct: `${examenPct}%`,
            continuaPct: `${continuaPct}%`,
            plataformaPct: `${plataformaPct}%`,
            exposicionPct: `${exposicionPct}%`,
            mecanismo,
            tipografia,
          }),
        });

        if (!response.ok) {
          let msg = "No se pudo compilar el archivo en el servidor.";
          try {
            const errData = (await response.json()) as { error?: string };
            if (errData?.error) msg = errData.error;
          } catch {
            // ignore
          }
          throw new Error(msg);
        }

        const blob = await response.blob();
        const newUrl = window.URL.createObjectURL(blob);

        if (compileRunIdRef.current !== runId) {
          window.URL.revokeObjectURL(newUrl);
          return;
        }

        setDownloadUrl((prev) => {
          if (prev) window.URL.revokeObjectURL(prev);
          return newUrl;
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "Error desconocido al pre-compilar el DOCX.";
        setErrorMessage(msg);
      } finally {
        if (compileRunIdRef.current === runId) setIsCompiling(false);
      }
    }, 450);
  };

  const handleGeneratePreview = async () => {
    if (!temario.trim()) {
      setErrorMessage("Por favor, ingresa el contenido de tu temario.");
      setCurrentStep(1);
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccess(false);
    setStatusMessage("Analizando temario y generando sesiones...");

    try {
      const response = await fetch("/api/curricula/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temario,
          fechaInicio,
          numSesiones,
          examenPct: `${examenPct}%`,
          continuaPct: `${continuaPct}%`,
          plataformaPct: `${plataformaPct}%`,
          exposicionPct: `${exposicionPct}%`,
          mecanismo,
          tipografia,
          isPreview: true,
          templateBase64: templateBase64 || undefined,
        }),
      });

      if (!response.ok) {
        const errData = (await response.json()) as { error?: string };
        throw new Error(errData.error || "Error al estructurar sesiones.");
      }

      const resData = (await response.json()) as GeneratePreviewResponse;
      if (resData.success) {
        setMateriaName(resData.materia || materiaName);
        if (resData.objetivo) setObjetivoGeneral(resData.objetivo);
        if (resData.clave) setClaveMateria(resData.clave);
        setGeneratedSessions(resData.payload.sessions || []);
        setCurrentStep(5);
        setSuccess(true);
        await generateAndCacheDocx(resData.payload.sessions || []);
      } else {
        const msg = "error" in resData ? resData.error : undefined;
        throw new Error(msg || "Formato de respuesta desconocido del servidor.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al procesar el temario.";
      setErrorMessage(msg);
      setCurrentStep(4);
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  const handleExportDocx = () => {
    if (errorMessage && !downloadUrl) {
      setExportMessage("");
      return;
    }
    if (!downloadUrl) {
      if (isCompiling) setExportMessage("Compilando en segundo plano... espera un momento.");
      else setExportMessage("Aún no hay un documento listo. Genera la planeación o edita una celda.");
      return;
    }
    setExportMessage("");
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `Planeacion_${materiaName.replace(/\s+/g, "_")}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  React.useEffect(() => {
    if (downloadUrl || errorMessage) setExportMessage("");
  }, [downloadUrl, errorMessage]);

  const handleUpdateSessionRow = (
    idx: number,
    field: "tema" | "actividad" | "objetivo",
    value: string
  ) => {
    const updated = [...generatedSessions];
    if (field === "tema") updated[idx].tema = value;
    else if (field === "actividad") updated[idx].actividad = value;
    else if (field === "objetivo") updated[idx].objetivo = value;
    setGeneratedSessions(updated);
    generateAndCacheDocx(updated);
  };

  const isPlaneacionTab = activeTab === "planeacion";

  return (
    <div className="h-screen w-full bg-[#F7FAFC] text-[#172033] font-sans antialiased flex relative overflow-hidden">
      <SidebarMenu
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setErrorMessage("");
          if (tab === "planeacion") setCurrentStep((s) => (s < 1 ? 1 : s));
        }}
        appName="Planly"
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 flex overflow-hidden relative">
          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            {activeTab === "inicio" && (
              <div className="max-w-4xl mx-auto space-y-8 py-4">
                <div className="bg-linear-to-br from-[#0B2A5B] to-[#1677D2] text-white p-8 md:p-12 rounded-3xl shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 transform rotate-45" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#27C7B8]/15 rounded-full -ml-16 -mb-16" />

                  <div className="relative z-10 max-w-2xl space-y-4">
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
                      Genera planeaciones didácticas en minutos, respetando tu formato institucional
                    </h1>
                    <p className="text-sm md:text-base text-blue-100 leading-relaxed font-medium">
                      Sube tu temario y tu plantilla. Planly estructura sesiones y compila el DOCX con fidelidad visual.
                    </p>

                    <div className="pt-6 flex flex-col sm:flex-row items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("planeacion");
                          setCurrentStep(1);
                        }}
                        className="w-full sm:w-auto bg-gradient-to-b from-[#27C7B8] to-[#1db3a5] text-[#0B2A5B] text-xs font-bold py-3 px-6 rounded-xl border border-white/10 shadow-md shadow-slate-900/10 hover:shadow-lg hover:shadow-slate-900/12 active:scale-[0.98] active:scale-98 hover:-translate-y-0.5 transition-all duration-300 ease-out cursor-pointer inline-flex items-center justify-center gap-1.5"
                      >
                        <FilePlus className="w-4 h-4" />
                        <span>Crear nueva planeación</span>
                      </button>

                      <button
                        type="button"
                        onClick={loadDemoAndStart}
                        className="w-full sm:w-auto bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-bold py-3 px-6 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Cargar Ejemplo COP</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white border border-[#D9E2EC] p-6 rounded-2xl shadow-xs space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-[#EAF4FF] text-[#1677D2] flex items-center justify-center">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-[#0B2A5B] text-sm">Organización de Temas</h3>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      Estructura el contenido en sesiones semanales siguiendo el temario.
                    </p>
                  </div>
                  <div className="bg-white border border-[#D9E2EC] p-6 rounded-2xl shadow-xs space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-[#F1EFFF] text-[#6D5DFB] flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-[#0B2A5B] text-sm">Inyección In-Memory</h3>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      Preserva tablas, colores e imágenes; solo se inyecta texto donde corresponde.
                    </p>
                  </div>
                  <div className="bg-white border border-[#D9E2EC] p-6 rounded-2xl shadow-xs space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-[#EAFBF0] text-[#22C55E] flex items-center justify-center">
                      <Clipboard className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-[#0B2A5B] text-sm">Evaluaciones y Exámenes</h3>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      Alinea ponderaciones escolares y exporta en Word editable.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isPlaneacionTab && (
              <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
                  <div>
                    <h1 className="text-2xl font-extrabold text-[#0B2A5B] tracking-tight">Nueva Planeación</h1>
                    <p className="text-xs text-[#64748B]">
                      IA → sesiones estructuradas → compilación del DOCX en segundo plano.
                    </p>
                  </div>
                  <span
                    role="status"
                    aria-live="polite"
                    className={`inline-flex items-center gap-2 text-[10px] font-extrabold px-3 py-2 rounded-xl border ${compileIndicator.containerClassName}`}
                  >
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${compileIndicator.dotClassName}`} />
                    <span>{compileIndicator.label}</span>
                  </span>
                </div>

                <FormSteps currentStep={currentStep} setStep={setCurrentStep} isCompleted={success} />

                {currentStep === 1 && (
                  <div className="bg-white border border-[#D9E2EC] rounded-2xl shadow-xs overflow-hidden">
                    <div className="p-5 border-b border-[#D9E2EC] flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <ScrollText className="w-4 h-4 text-[#1677D2]" />
                        <h2 className="text-sm font-extrabold text-[#0B2A5B]">Paso 1 — Temario</h2>
                      </div>
                      <button
                        type="button"
                        onClick={loadSpecimen}
                        className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold px-3 py-2 rounded-xl shadow-xs active:scale-[0.98] active:scale-98 hover:-translate-y-0.5 transition-all duration-300 ease-out"
                      >
                        Cargar ejemplo
                      </button>
                    </div>

                    <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                      <div className="lg:col-span-8 space-y-3">
                        <label className="text-xs font-bold text-[#0B2A5B]">Pegue o edite el temario</label>
                        <textarea
                          value={temario}
                          onChange={(e) => setTemario(e.target.value)}
                          className="w-full h-80 text-sm text-[#172033] bg-[#F7FAFC] border border-[#D9E2EC] rounded-xl p-4 font-sans leading-relaxed focus:border-[#1677D2] focus:ring-1 focus:ring-[#1677D2]/30 transition-colors resize-none"
                          placeholder="Pegue aquí el contenido del temario..."
                        />
                        {!!fileParseError && (
                          <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                            {fileParseError}
                          </div>
                        )}
                        {fileParseSuccess && (
                          <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                            <span className="font-bold">Temario indexado correctamente.</span>
                          </div>
                        )}
                      </div>

                      <div className="lg:col-span-4 space-y-4">
                        <div className="premium-dropzone border-2 border-dashed border-[#D9E2EC] bg-[#F7FAFC] rounded-2xl p-6 text-center relative cursor-pointer group shadow-xs shadow-slate-900/5 hover:bg-[#F0F4F8] hover:border-slate-300/70 hover:shadow-md hover:shadow-slate-900/8 hover:scale-[1.002] active:scale-[0.998] transition-all duration-300 ease-out">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.txt"
                            onChange={handleTemarioUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="space-y-2">
                            <div className="w-10 h-10 rounded-xl bg-[#EAF4FF] text-[#1677D2] flex items-center justify-center mx-auto">
                              <FileUp className="w-5 h-5" />
                            </div>
                            <p className="text-xs font-extrabold text-[#0B2A5B]">Subir temario</p>
                            <p className="text-[11px] text-[#64748B] leading-relaxed">
                              PDF o Word. Se extrae texto y se guarda en tu navegador.
                            </p>
                            {fileParsing && (
                              <div className="text-[11px] font-bold text-[#1677D2] flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Procesando...
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="bg-white border border-[#D9E2EC] rounded-2xl p-5 shadow-xs space-y-3">
                          <div className="flex items-center gap-2">
                            <Type className="w-4 h-4 text-[#6D5DFB]" />
                            <p className="text-xs font-extrabold text-[#0B2A5B]">Asignatura</p>
                          </div>
                          <input
                            value={materiaName}
                            onChange={(e) => setMateriaName(e.target.value)}
                            className="planly-input text-xs font-bold"
                            placeholder="Nombre de la asignatura"
                          />
                          <button
                            type="button"
                            onClick={() => setCurrentStep(2)}
                            disabled={!temario.trim() || fileParsing}
                            className={`w-full bg-gradient-to-b from-[#1677D2] to-[#135fb0] hover:to-[#0F4D93] text-xs font-extrabold text-white px-5 py-2.5 rounded-xl border border-white/10 shadow-md shadow-slate-900/10 hover:shadow-lg hover:shadow-slate-900/12 active:scale-[0.98] active:scale-98 hover:-translate-y-0.5 transition-all duration-300 ease-out flex items-center justify-center gap-2 ${
                              (!temario.trim() || fileParsing) ? "opacity-50 cursor-not-allowed hover:translate-y-0 active:scale-100" : ""
                            }`}
                          >
                            <span>Continuar</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="bg-white border border-[#D9E2EC] rounded-2xl shadow-xs overflow-hidden">
                    <div className="p-5 border-b border-[#D9E2EC] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#1677D2]" />
                        <h2 className="text-sm font-extrabold text-[#0B2A5B]">Paso 2 — Plantilla Word (.docx)</h2>
                      </div>
                      <button
                        type="button"
                        onClick={handleResetTemplate}
                        className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold px-3 py-2 rounded-xl shadow-xs active:scale-[0.98] active:scale-98 hover:-translate-y-0.5 transition-all duration-300 ease-out"
                      >
                        Restablecer
                      </button>
                    </div>

                    <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                      <div className="lg:col-span-8">
                        <div className="premium-dropzone border-2 border-dashed border-[#B9DFFF]/90 bg-[#EAF4FF]/20 rounded-2xl p-8 text-center relative cursor-pointer group shadow-xs shadow-slate-900/5 hover:bg-[#EAF4FF]/35 hover:shadow-md hover:shadow-slate-900/8 hover:scale-[1.002] active:scale-[0.998] transition-all duration-300 ease-out">
                          <input
                            type="file"
                            accept=".docx"
                            onChange={handleTemplateUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="space-y-2">
                            <div className="w-12 h-12 rounded-2xl bg-white/60 border border-[#B9DFFF] text-[#1677D2] flex items-center justify-center mx-auto">
                              <FileText className="w-6 h-6" />
                            </div>
                            <p className="text-xs font-extrabold text-[#0B2A5B]">Cargar formato institucional</p>
                            <p className="text-[11px] text-[#64748B] leading-relaxed">
                              Se conserva la fidelidad visual. Solo se inyectan datos en zonas editables.
                            </p>
                            {uploadingTemplate && (
                              <div className="text-[11px] font-bold text-[#1677D2] flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Cargando plantilla...
                              </div>
                            )}
                          </div>
                        </div>

                        {!!templateError && (
                          <div className="mt-4 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                            {templateError}
                          </div>
                        )}
                        {!!templateMsg && (
                          <div className="mt-4 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                            {templateMsg}
                          </div>
                        )}
                      </div>

                      <div className="lg:col-span-4 space-y-4">
                        <div className="bg-white border border-[#D9E2EC] rounded-2xl p-5 shadow-xs space-y-2">
                          <p className="text-xs font-extrabold text-[#0B2A5B]">Estado del formato</p>
                          <div className="text-[11px] text-[#64748B] leading-relaxed">
                            {templateMeta.hasCustom ? (
                              <>
                                <p className="font-bold text-[#0B2A5B]">{templateMeta.fileName || "Plantilla personalizada"}</p>
                                <p>Se usará este molde visual en la compilación.</p>
                              </>
                            ) : (
                              <p>No se ha cargado una plantilla personalizada.</p>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setCurrentStep(3)}
                          disabled={!templateBase64 && !templateMeta.hasCustom}
                          className={`w-full bg-gradient-to-b from-[#1677D2] to-[#135fb0] hover:to-[#0F4D93] text-xs font-extrabold text-white px-5 py-2.5 rounded-xl border border-white/10 shadow-md shadow-slate-900/10 hover:shadow-lg hover:shadow-slate-900/12 active:scale-[0.98] active:scale-98 hover:-translate-y-0.5 transition-all duration-300 ease-out flex items-center justify-center gap-2 cursor-pointer ${
                            (!templateBase64 && !templateMeta.hasCustom) ? "opacity-50 cursor-not-allowed hover:translate-y-0 active:scale-100" : ""
                          }`}
                        >
                          <span>Continuar</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="bg-white border border-[#D9E2EC] rounded-2xl shadow-xs overflow-hidden">
                    <div className="p-5 border-b border-[#D9E2EC] flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-[#1677D2]" />
                      <h2 className="text-sm font-extrabold text-[#0B2A5B]">Paso 3 — Parámetros</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                      <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-[#0B2A5B]">Materia</label>
                          <input value={materiaName} onChange={(e) => setMateriaName(e.target.value)} className="planly-input text-xs font-bold" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-[#0B2A5B]">Nivel</label>
                          <input value={nivelEducativo} onChange={(e) => setNivelEducativo(e.target.value)} className="planly-input text-xs font-bold" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-[#0B2A5B]">Fecha de inicio</label>
                          <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="planly-input text-xs font-bold" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-[#0B2A5B]">Sesiones</label>
                          <input
                            type="number"
                            min={1}
                            max={40}
                            value={numSesiones}
                            onChange={(e) => setNumSesiones(Number(e.target.value))}
                            className="planly-input text-xs font-bold"
                          />
                        </div>
                      </div>

                      <div className="lg:col-span-4 space-y-4">
                        <div className="bg-[#F7FAFC] border border-[#D9E2EC] rounded-2xl p-5 space-y-3">
                          <div className="flex items-center gap-2">
                            <Percent className="w-4 h-4 text-[#1677D2]" />
                            <p className="text-xs font-extrabold text-[#0B2A5B]">Ponderación</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-[11px] font-bold text-[#0B2A5B]">Examen</label>
                              <input type="number" value={examenPct} onChange={(e) => setExamenPct(Number(e.target.value))} className="planly-input text-xs font-bold" />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[11px] font-bold text-[#0B2A5B]">Continua</label>
                              <input type="number" value={continuaPct} onChange={(e) => setContinuaPct(Number(e.target.value))} className="planly-input text-xs font-bold" />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[11px] font-bold text-[#0B2A5B]">Plataforma</label>
                              <input type="number" value={plataformaPct} onChange={(e) => setPlataformaPct(Number(e.target.value))} className="planly-input text-xs font-bold" />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[11px] font-bold text-[#0B2A5B]">Exposición</label>
                              <input type="number" value={exposicionPct} onChange={(e) => setExposicionPct(Number(e.target.value))} className="planly-input text-xs font-bold" />
                            </div>
                          </div>
                          <div className="text-[11px] text-[#64748B]">
                            Total: <span className={`font-extrabold ${totalPct === 100 ? "text-[#22C55E]" : "text-amber-600"}`}>{totalPct}%</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setCurrentStep(4)}
                          className="w-full bg-gradient-to-b from-[#1677D2] to-[#135fb0] hover:to-[#0F4D93] text-xs font-extrabold text-white px-5 py-2.5 rounded-xl border border-white/10 shadow-md shadow-slate-900/10 hover:shadow-lg hover:shadow-slate-900/12 active:scale-[0.98] active:scale-98 hover:-translate-y-0.5 transition-all duration-300 ease-out flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <span>Continuar</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="bg-white border border-[#D9E2EC] rounded-2xl shadow-xs overflow-hidden">
                    <div className="p-5 border-b border-[#D9E2EC] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#6D5DFB]" />
                      <h2 className="text-sm font-extrabold text-[#0B2A5B]">Paso 4 — Generación IA</h2>
                    </div>
                    <div className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="text-xs text-[#64748B] leading-relaxed">
                        <p className="font-bold text-[#0B2A5B]">Listo para estructurar sesiones</p>
                        <p>La IA convierte tu temario en sesiones y se persisten como fuente de verdad.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleGeneratePreview}
                        className="bg-gradient-to-b from-[#6D5DFB] to-[#5241DA] hover:to-[#4636C6] text-xs font-extrabold text-white px-6 py-2.5 rounded-xl border border-white/10 shadow-md shadow-indigo-950/10 hover:shadow-lg hover:shadow-indigo-950/15 active:scale-[0.98] active:scale-98 hover:-translate-y-0.5 transition-all duration-300 ease-out flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Generar Planeación con IA</span>
                      </button>
                    </div>
                    {!!errorMessage && (
                      <div className="px-6 pb-6">
                        <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                          {errorMessage}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {currentStep === 5 && (
                  <div className="space-y-4">
                    {success && (
                      <div className="bg-emerald-50/30 border border-emerald-500/10 p-5 rounded-2xl shadow-xs shadow-slate-900/5 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-6 h-6 text-[#22C55E] shrink-0" />
                          <div className="text-xs">
                            <p className="font-extrabold text-[#0B2A5B]">¡Documento estructurado correctamente!</p>
                            <p className="text-[#64748B]">Edita celdas y el Word se recompila en segundo plano.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                          <button
                            type="button"
                            onClick={() => setCurrentStep(3)}
                            className="w-full md:w-auto bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-xs active:scale-[0.98] active:scale-98 hover:-translate-y-0.5 transition-all duration-300 ease-out"
                          >
                            Modificar parámetros
                          </button>
                          <button
                            type="button"
                            onClick={handleExportDocx}
                            disabled={isCompiling && !downloadUrl}
                            className={`w-full md:w-auto bg-gradient-to-b from-[#22C55E] to-[#1faa4f] hover:to-[#179847] text-white font-extrabold px-5 py-2.5 text-xs rounded-xl border border-white/10 shadow-md shadow-emerald-950/10 hover:shadow-lg hover:shadow-emerald-950/15 active:scale-[0.98] active:scale-98 hover:-translate-y-0.5 transition-all duration-300 ease-out flex items-center justify-center gap-1.5 cursor-pointer ${
                              (isCompiling && !downloadUrl) ? "opacity-70 cursor-wait hover:translate-y-0 active:scale-100" : ""
                            }`}
                          >
                            {isCompiling ? (
                              <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4 shrink-0" />
                            )}
                            <span>{isCompiling ? "Compilando..." : "Descargar Word (.docx)"}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {!!errorMessage && (
                      <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                        {errorMessage}
                      </div>
                    )}
                    {!errorMessage && !!exportMessage && (
                      <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                        {exportMessage}
                      </div>
                    )}

                    <div className="bg-white border border-[#D9E2EC] rounded-2xl shadow-xs overflow-hidden">
                      <div className="p-5 border-b border-[#D9E2EC] flex items-center justify-between">
                        <p className="text-sm font-extrabold text-[#0B2A5B]">Hoja de calibración (sesiones)</p>
                        <span className="text-[11px] text-[#64748B] font-bold">{generatedSessions.length} sesiones</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-[900px] w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-[#EAF4FF] text-[#0B2A5B] text-[11px] font-bold border-b border-slate-200/60">
                              <th className="p-3 w-[70px] text-center">#</th>
                              <th className="p-3 w-[120px]">Fecha</th>
                              <th className="p-3">Tema</th>
                              <th className="p-3">Actividad</th>
                              <th className="p-3">Objetivo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/40 text-xs">
                            {generatedSessions.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-50/70 transition-colors duration-150">
                                <td className="p-3 text-center font-mono font-extrabold text-slate-500">{row.num}</td>
                                <td className="p-3 font-mono text-[11px] text-slate-600">{row.fecha}</td>
                                <td className="p-2">
                                  <textarea
                                    value={row.tema}
                                    onChange={(e) => handleUpdateSessionRow(rIdx, "tema", e.target.value)}
                                    className="premium-cell-textarea w-full bg-transparent outline-none rounded-lg p-2 text-slate-800 font-medium resize-none text-[11.5px] leading-snug placeholder:text-slate-400 focus:bg-white/80 focus:ring-1 focus:ring-[#1677D2]/35 hover:bg-white/40 transition-colors duration-150"
                                    rows={2}
                                  />
                                </td>
                                <td className="p-2">
                                  <textarea
                                    value={row.actividad}
                                    onChange={(e) => handleUpdateSessionRow(rIdx, "actividad", e.target.value)}
                                    className="premium-cell-textarea w-full bg-transparent outline-none rounded-lg p-2 text-slate-600 resize-none text-[11px] leading-snug placeholder:text-slate-400 focus:bg-white/80 focus:ring-1 focus:ring-[#1677D2]/35 hover:bg-white/40 transition-colors duration-150"
                                    rows={2}
                                  />
                                </td>
                                <td className="p-2">
                                  <textarea
                                    value={row.objetivo}
                                    onChange={(e) => handleUpdateSessionRow(rIdx, "objetivo", e.target.value)}
                                    className="premium-cell-textarea w-full bg-transparent outline-none rounded-lg p-2 text-slate-600 resize-none text-[11px] leading-snug placeholder:text-slate-400 focus:bg-white/80 focus:ring-1 focus:ring-[#1677D2]/35 hover:bg-white/40 transition-colors duration-150"
                                    rows={2}
                                  />
                                </td>
                              </tr>
                            ))}
                            {generatedSessions.length === 0 && (
                              <tr>
                                <td colSpan={5} className="p-6 text-center text-xs text-slate-500">
                                  Aún no hay sesiones. Vuelve al Paso 4 para generar la planeación.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "examenes" && (
              <div className="max-w-5xl mx-auto space-y-6">
                <div>
                  <h1 className="text-2xl font-extrabold text-[#0B2A5B] tracking-tight">Exámenes</h1>
                  <p className="text-xs text-[#64748B]">Módulo de evaluación y banco de reactivos.</p>
                </div>
                <ExamModule materiaName={materiaName} onGenerateExamWithAI={async () => ({})} />
              </div>
            )}

            {activeTab === "plantillas" && (
              <div className="max-w-5xl mx-auto space-y-6">
                <div>
                  <h1 className="text-2xl font-extrabold text-[#0B2A5B] tracking-tight">Mis Plantillas</h1>
                  <p className="text-xs text-[#64748B]">Gestiona tu plantilla DOCX institucional.</p>
                </div>
                <div className="bg-white border border-[#D9E2EC] rounded-2xl shadow-xs p-6">
                  <p className="text-sm font-extrabold text-[#0B2A5B]">Plantilla activa</p>
                  <p className="text-xs text-[#64748B] mt-1">
                    {templateMeta.hasCustom ? (templateMeta.fileName || "Plantilla personalizada") : "Sin plantilla cargada"}
                  </p>
                </div>
              </div>
            )}

            {activeTab === "temarios" && (
              <div className="max-w-5xl mx-auto space-y-6">
                <div>
                  <h1 className="text-2xl font-extrabold text-[#0B2A5B] tracking-tight">Historial de Temarios</h1>
                  <p className="text-xs text-[#64748B]">Próximamente: historial local y auditoría.</p>
                </div>
                <div className="bg-white border border-[#D9E2EC] rounded-2xl shadow-xs p-6 text-xs text-slate-600">
                  Este módulo se mostrará aquí.
                </div>
              </div>
            )}

            {activeTab === "historial" && (
              <div className="max-w-5xl mx-auto space-y-6">
                <div>
                  <h1 className="text-2xl font-extrabold text-[#0B2A5B] tracking-tight">Historial de Descargas</h1>
                  <p className="text-xs text-[#64748B]">Próximamente: trazas de compilación y descargas.</p>
                </div>
                <div className="bg-white border border-[#D9E2EC] rounded-2xl shadow-xs p-6 text-xs text-slate-600">
                  Este módulo se mostrará aquí.
                </div>
              </div>
            )}

            {activeTab === "config" && (
              <div className="max-w-5xl mx-auto space-y-6">
                <div>
                  <h1 className="text-2xl font-extrabold text-[#0B2A5B] tracking-tight">Configuración</h1>
                  <p className="text-xs text-[#64748B]">Persistencia local y valores globales.</p>
                </div>
                <div className="bg-white border border-[#D9E2EC] rounded-2xl shadow-xs p-6 text-xs text-slate-600">
                  Este módulo se mostrará aquí.
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0B2A5B]/80 backdrop-blur-xs flex flex-col items-center justify-center z-50 p-6 text-center"
          >
            <div className="bg-white p-8 rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 shadow-sm animate-pulse">
                  <div className="w-12 h-12">
                    <PlanlyLogo variant="icon" className="w-12 h-12" />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-[#0B2A5B]">Procesamiento OpenXML de Planly...</h3>
                <p className="text-[10px] text-[#6D5DFB] font-bold tracking-wider uppercase animate-pulse">
                  Uniendo variables didácticas en memoria
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 w-full text-xs text-slate-600 font-mono shadow-inner leading-relaxed">
                {statusMessage || "Operación didáctica binaria en curso..."}
              </div>

              <p className="text-[10px] text-slate-400">
                Por favor, mantén tu conexión activa; se conservará la estructura impecable.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
