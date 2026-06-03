import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ScrollText, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Sparkles,
  Download,
  Plus,
  Trash2,
  Calendar,
  Percent,
  Type,
  ChevronRight,
  ArrowRight,
  BookOpen,
  Clipboard,
  History,
  Home,
  FilePlus,
  Settings,
  HelpCircle,
  FileText,
  Sliders,
  Award,
  Check,
  FileUp
} from "lucide-react";
import { SYLLABUS_SPECIMEN } from "./constants/specimen";
import { SidebarMenu } from "./components/SidebarMenu";
import { FormSteps } from "./components/FormSteps";
import { ExamModule } from "./components/ExamModule";
import { PlanlyLogo } from "./components/PlanlyLogo";

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
  const [success, setSuccess] = useState(false);

  // File parsing states
  const [fileParsing, setFileParsing] = useState(false);
  const [fileParseError, setFileParseError] = useState("");
  const [fileParseSuccess, setFileParseSuccess] = useState(false);

  // Input states representing Planly's customizable parameters
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

  // Template custom manager states
  const [templateBase64, setTemplateBase64] = useState<string>("");
  const [templateMeta, setTemplateMeta] = useState<{
    hasCustom: boolean;
    fileName?: string;
    fileSize?: number;
    uploadedAt?: string;
  }>({ hasCustom: false });
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [templateMsg, setTemplateMsg] = useState("");
  const [templateError, setTemplateError] = useState("");

  const fetchTemplateInfo = async () => {
    try {
      const response = await fetch("/api/template/info");
      if (response.ok) {
        const data = await response.json();
        setTemplateMeta(data);
      }
    } catch (e) {
      console.warn("No se pudo obtener la metadata de la plantilla:", e);
    }
  };

  React.useEffect(() => {
    fetchTemplateInfo();
  }, []);

  // Sync state items to localStorage on any modification
  React.useEffect(() => {
    try { localStorage.setItem("planly_activeTab", activeTab); } catch (e) { console.warn(e); }
  }, [activeTab]);

  React.useEffect(() => {
    try { localStorage.setItem("planly_currentStep", currentStep.toString()); } catch (e) { console.warn(e); }
  }, [currentStep]);

  React.useEffect(() => {
    try { localStorage.setItem("planly_temario", temario); } catch (e) { console.warn(e); }
  }, [temario]);

  React.useEffect(() => {
    try { localStorage.setItem("planly_materiaName", materiaName); } catch (e) { console.warn(e); }
  }, [materiaName]);

  React.useEffect(() => {
    try { localStorage.setItem("planly_nivelEducativo", nivelEducativo); } catch (e) { console.warn(e); }
  }, [nivelEducativo]);

  React.useEffect(() => {
    try { localStorage.setItem("planly_fechaInicio", fechaInicio); } catch (e) { console.warn(e); }
  }, [fechaInicio]);

  React.useEffect(() => {
    try { localStorage.setItem("planly_numSesiones", numSesiones.toString()); } catch (e) { console.warn(e); }
  }, [numSesiones]);

  React.useEffect(() => {
    try { localStorage.setItem("planly_examenPct", examenPct.toString()); } catch (e) { console.warn(e); }
  }, [examenPct]);

  React.useEffect(() => {
    try { localStorage.setItem("planly_continuaPct", continuaPct.toString()); } catch (e) { console.warn(e); }
  }, [continuaPct]);

  React.useEffect(() => {
    try { localStorage.setItem("planly_plataformaPct", plataformaPct.toString()); } catch (e) { console.warn(e); }
  }, [plataformaPct]);

  React.useEffect(() => {
    try { localStorage.setItem("planly_exposicionPct", exposicionPct.toString()); } catch (e) { console.warn(e); }
  }, [exposicionPct]);

  React.useEffect(() => {
    try { localStorage.setItem("planly_mecanismo", mecanismo); } catch (e) { console.warn(e); }
  }, [mecanismo]);

  React.useEffect(() => {
    try { localStorage.setItem("planly_tipografia", tipografia); } catch (e) { console.warn(e); }
  }, [tipografia]);

  React.useEffect(() => {
    try { localStorage.setItem("planly_entregableType", entregableType); } catch (e) { console.warn(e); }
  }, [entregableType]);

  // Output generated sessions state (The centerpiece spreadsheet table)
  const [generatedSessions, setGeneratedSessions] = useState<Array<{
    num: number;
    fecha: string;
    tema: string;
    actividad: string;
    objetivo: string;
  }>>(() => {
    try {
      const stored = localStorage.getItem("planly_generatedSessions");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem("planly_generatedSessions", JSON.stringify(generatedSessions));
    } catch (e) {
      console.warn(e);
    }
  }, [generatedSessions]);

  const loadSpecimen = () => {
    setTemario(SYLLABUS_SPECIMEN);
    setMateriaName("Contabilidad de Organizaciones Públicas");
    setErrorMessage("");
    setSuccess(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 10MB)
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
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            fileBase64: base64String,
            mimeType: file.type,
            fileName: file.name
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Error al procesar el temario.");
        }

        const data = await response.json();
        if (data.success && data.extractedText) {
          setTemario(data.extractedText);
          setFileParseSuccess(true);
          
          // Beautifully infer matière name from filename if possible
          if (file.name) {
            const cleanName = file.name
              .replace(/\.[^/.]+$/, "") // remove extension
              .replace(/[-_]/g, " ") // replace dash/underscore with spaces
              .trim();
            // Capitalize basic parts
            if (cleanName.length > 3 && cleanName.length < 50 && !cleanName.toLowerCase().includes("temario")) {
              setMateriaName(cleanName.replace(/\b\w/g, c => c.toUpperCase()));
            }
          }
        } else {
          throw new Error("No se pudo extraer contenido organizado del archivo.");
        }
      } catch (err: any) {
        setFileParseError(err.message || "Error al leer el archivo.");
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
          uploadedAt: new Date().toISOString()
        });
        setTemplateMsg("¡Plantilla personalizada cargada con éxito en memoria! Se respetará este formato para todas las descargas.");
      } catch (err: any) {
        setTemplateError(err.message || "Error al procesar la plantilla.");
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
    setTemplateMsg("Se ha restablecido el formato estándar por defecto.");
    setTemplateError("");
  };

  const loadDemoAndStart = () => {
    loadSpecimen();
    setActiveTab("planeacion");
    setCurrentStep(1);
  };

  // Live total percentages validator
  const totalPct = Number(examenPct) + Number(continuaPct) + Number(plataformaPct) + Number(exposicionPct);

  // Step 4 trigger - structures raw syllabus content with Gemini through /api/curricula/generate
  const handleGeneratePreview = async () => {
    if (!temario.trim()) {
      setErrorMessage("Por favor, ingresa el contenido de tu temario.");
      setCurrentStep(1);
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccess(false);
    
    // Smooth status intervals matching official checkpoints
    setStatusMessage("Analizando estructura de contenidos en Temario...");
    
    const statusIntervals = [
      setTimeout(() => setStatusMessage("Detectando estructura de plantilla oficial (.docx)..."), 1000),
      setTimeout(() => setStatusMessage("Llamando a Gemini 3.5 Flash para estructurar las sesiones..."), 2200),
      setTimeout(() => setStatusMessage(`Generando exactamente ${numSesiones} sesiones con límite de 15 palabras por descripción...`), 3800),
      setTimeout(() => setStatusMessage("Integrando estrategias didácticas y preservando colores de tabla..."), 5400),
      setTimeout(() => setStatusMessage("Validando que el formato institucional se mantenga intacto..."), 7000),
    ];

    try {
      const response = await fetch("/api/curricula/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
          isPreview: true // Dynamic preview JSON fetch
        }),
      });

      statusIntervals.forEach(clearTimeout);

      if (!response.ok) {
        let errData;
        try {
          errData = await response.json();
        } catch {
          errData = { error: "Ocurrió un error con el servidor del motor ." };
        }
        throw new Error(errData.error || "Error al estructurar sesiones.");
      }

      const resData = await response.json();
      if (resData.success && resData.payload) {
        setMateriaName(resData.materia || materiaName);
        setGeneratedSessions(resData.payload.sessions || []);
        setCurrentStep(5); // Transition to Paso 5: Resultado
        setSuccess(true);
      } else {
        throw new Error("Formato de respuesta desconocido del servidor");
      }
    } catch (err: any) {
      statusIntervals.forEach(clearTimeout);
      setErrorMessage(err.message || "Error al procesar el temario. Intenta de nuevo.");
      setCurrentStep(3); // Bring back to configuration
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  // Triggers official DOCX compilation with actual manual updates done on the spreadsheet table by the user
  const handleDownloadDocx = async () => {
    setLoading(true);
    setStatusMessage("Compilando nuevo archivo Word con tus modificaciones manuales...");

    try {
      const response = await fetch("/api/curricula/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
          sesionesOverride: generatedSessions, // Handover of custom edited table rows
          materiaOverride: materiaName,
          templateBase64: templateBase64 || undefined
        }),
      });

      if (!response.ok) {
        throw new Error("No se pudo obtener el archivo binario del servidor.");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `Planeacion_${materiaName.replace(/\s+/g, "_")}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

    } catch (err: any) {
      setErrorMessage("Error al descargar: " + err.message);
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  // Helper inside spreadsheet to edit a row's values
  const handleUpdateSessionRow = (idx: number, field: "tema" | "actividad" | "objetivo", value: string) => {
    const updated = [...generatedSessions];
    updated[idx][field] = value;
    setGeneratedSessions(updated);
  };

  return (
    <div className="h-screen w-full bg-[#F7FAFC] text-[#172033] font-sans antialiased flex relative overflow-hidden">
      
      {/* 1. LEFT SIDEBAR */}
      <SidebarMenu 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setErrorMessage("");
        }} 
        appName="Planly" 
      />

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* WORK AREA BODY */}
        <div className="flex-1 flex overflow-hidden relative">
          
          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            
            {/* VIEW TAB 1: INICIO (Splash dashboard home) */}
            {activeTab === "inicio" && (
              <div className="max-w-4xl mx-auto space-y-8 py-4">

                {/* Hero Card */}
                <div className="bg-linear-to-br from-[#0B2A5B] to-[#1677D2] text-white p-8 md:p-12 rounded-3xl shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 transform rotate-45" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#27C7B8]/15 rounded-full -ml-16 -mb-16" />
                  
                  <div className="relative z-10 max-w-2xl space-y-4">
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
                      Genera planeaciones didácticas en minutos, respetando tu formato institucional
                    </h1>
                    <p className="text-sm md:text-base text-blue-100 leading-relaxed font-medium">
                      Sube tu temario y tu plantilla. Planly organiza sesiones, estrategias, recursos, evaluaciones y bibliografía de apoyo de manera exacta sin alterar logos, colores, imágenes ni tablas.
                    </p>
                    
                    <div className="pt-6 flex flex-col sm:flex-row items-center gap-3">
                      <button
                        onClick={() => {
                          setActiveTab("planeacion");
                          setCurrentStep(1);
                        }}
                        className="w-full sm:w-auto bg-[#27C7B8] text-[#0B2A5B] hover:bg-[#1db3a5] text-xs font-bold py-3 px-6 rounded-xl border-none transition-all cursor-pointer shadow-md inline-flex items-center justify-center gap-1.5"
                      >
                        <FilePlus className="w-4 h-4" />
                        <span>Crear nueva planeación</span>
                      </button>
                      
                      <button
                        onClick={loadDemoAndStart}
                        className="w-full sm:w-auto bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-bold py-3 px-6 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Cargar Ejemplo COP</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Features Grid and Badges */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white border border-[#D9E2EC] p-6 rounded-2xl shadow-xs space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-[#EAF4FF] text-[#1677D2] flex items-center justify-center">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-[#0B2A5B] text-sm">Organización de Temas</h3>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      Estructura el contenido de forma automática en sesiones semanales correlativas siguiendo el temario oficial.
                    </p>
                  </div>

                  <div className="bg-white border border-[#D9E2EC] p-6 rounded-2xl shadow-xs space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-[#F1EFFF] text-[#6D5DFB] flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-[#0B2A5B] text-sm">Inyección In-Memory</h3>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      Conserva exactamente las tablas oficiales y tipografías deseadas inyectando datos directamente por OpenXML.
                    </p>
                  </div>

                  <div className="bg-white border border-[#D9E2EC] p-6 rounded-2xl shadow-xs space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-[#EAFBF0] text-[#22C55E] flex items-center justify-center">
                      <Clipboard className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-[#0B2A5B] text-sm">Evaluaciones y Exámenes</h3>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      Sincroniza porcentajes de evaluación escolar y genera baterías de reactivos de opción múltiple con claves detalladas.
                    </p>
                  </div>
                </div>


              </div>
            )}

            {/* VIEW TAB 2: NUEVA PLANEACION */}
            {activeTab === "planeacion" && (
              <div className="max-w-4xl mx-auto space-y-6">
                
                {/* Wizard steps horizontal line indicator */}
                <FormSteps 
                  currentStep={currentStep} 
                  setStep={(step) => {
                    if (step <= 3 || generatedSessions.length > 0) {
                      setCurrentStep(step);
                    }
                  }} 
                  isCompleted={generatedSessions.length > 0} 
                />

                <div className="bg-white border border-[#D9E2EC] rounded-2xl p-6 shadow-xs">
                  
                  {/* STEP 1: LOAD SYLLABUS */}
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-lg font-bold text-[#0B2A5B]">Paso 1: Sube o escribe tu temario</h2>
                        <p className="text-xs text-[#64748B]">Sube el temario oficial de tu institución en formato Word o PDF. Planly extraerá de forma inteligente la estructura analítica, omitiendo información administrativa irrelevante.</p>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Side: Rich text area for direct adjustment and verification */}
                        <div className="lg:col-span-2 space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-[#0B2A5B] uppercase tracking-wider block">
                              Contenidos analizados del temario (Alcance)
                            </label>
                            <span className="text-[10px] text-slate-500 font-medium">Puedes modificar el texto de abajo para afinar o complementar</span>
                          </div>
                          
                          <div className="relative">
                            <textarea
                              id="temario-textarea"
                              value={temario}
                              onChange={(e) => setTemario(e.target.value)}
                              placeholder="Aquí aparecerá el temario mapeado. También puedes escribirlo o pegarlo manualmente si lo prefieres para proceder..."
                              className="w-full h-96 text-sm text-[#172033] bg-[#F7FAFC] border border-[#D9E2EC] rounded-xl p-4 font-sans leading-relaxed focus:border-[#1677D2] focus:ring-1 focus:ring-[#1677D2] transition-colors resize-none"
                            />
                            <div className="absolute bottom-3 right-3 bg-[#0B2A5B]/10 text-[#0B2A5B] px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                              {temario ? `${temario.split(/\s+/).filter(Boolean).length} palabras` : "0 palabras"}
                            </div>
                          </div>
                        </div>

                        {/* Right Side: Multi-format loading zone and quick tools */}
                        <div className="space-y-4">
                          <label className="text-xs font-bold text-[#0B2A5B] uppercase tracking-wider block">
                            Cargar archivo de temario
                          </label>

                          {/* Interactive File upload area */}
                          <div className="relative border-2 border-dashed border-[#B9DFFF] bg-[#EAF4FF]/40 hover:bg-[#EAF4FF]/70 rounded-2xl p-6 text-center transition-all">
                            <input
                              type="file"
                              accept=".docx,.pdf,.txt"
                              onChange={handleFileUpload}
                              disabled={fileParsing}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />

                            <div className="w-12 h-12 bg-white border border-[#B9DFFF] rounded-xl flex items-center justify-center text-[#1677D2] mx-auto shadow-xs mb-3">
                              <FileUp className="w-6 h-6" />
                            </div>

                            <p className="text-xs font-bold text-[#0B2A5B] mb-0.5">Sube tu Word o PDF</p>
                            <p className="text-[10px] text-[#64748B] leading-relaxed mb-3">
                              Admite archivos de formato <b>.docx</b>, <b>.pdf</b> o texto plano (máx. 10MB).
                            </p>

                            <span className="inline-block bg-[#1677D2] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg border-none hover:bg-[#135fb0] pointer-events-none transition-all">
                              Explorar Archivos
                            </span>
                          </div>

                          {/* Async state displays */}
                          {fileParsing && (
                            <div className="bg-gradient-to-r from-[#F1EFFF] to-[#EAF4FF] border border-[#6D5DFB]/10 p-3.5 rounded-xl flex items-start gap-3 animate-pulse">
                              <Loader2 className="w-4 h-4 text-[#6D5DFB] animate-spin shrink-0 mt-0.5" />
                              <div className="text-[11px]">
                                <p className="font-bold text-[#140F3E]">Mapeando contenido escolar con IA...</p>
                                <p className="text-slate-600">Procesando estructura y omitiendo metadatos.</p>
                              </div>
                            </div>
                          )}

                          {fileParseSuccess && (
                            <div className="bg-[#EAFBF0] border border-[#22C55E]/10 p-3.5 rounded-xl flex items-start gap-2.5">
                              <CheckCircle2 className="w-4.5 h-4.5 text-[#22C55E] shrink-0 mt-0.5" />
                              <div className="text-[11px]">
                                <p className="font-bold text-emerald-800">¡Temario analizado correctamente!</p>
                                <p className="text-emerald-700">El alcance ha sido mapeado e importado con éxito al editor.</p>
                              </div>
                            </div>
                          )}

                          {fileParseError && (
                            <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl flex items-start gap-2.5">
                              <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
                              <div className="text-[11px]">
                                <p className="font-bold text-rose-800">Error en el análisis</p>
                                <p className="text-rose-700">{fileParseError}</p>
                              </div>
                            </div>
                          )}

                          {/* Standard Sample Template triggers */}
                          <div className="bg-[#F7FAFC] border border-[#D9E2EC] p-4 rounded-xl space-y-2">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-[#1677D2]" />
                              <span>¿No tienes un temario?</span>
                            </p>
                            <p className="text-[11px] text-[#64748B] leading-relaxed">
                              Usa nuestro ejemplo de <b>Contabilidad Pública</b> diseñado para validar el flujo completo al instante.
                            </p>
                            
                            <button
                              type="button"
                              onClick={loadSpecimen}
                              className="w-full bg-white hover:bg-[#EAF4FF] hover:border-[#B9DFFF] text-[#0B2A5B] text-xs font-bold py-2 px-3 rounded-xl border border-[#D9E2EC] cursor-pointer transition-all flex items-center justify-center gap-1.5"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-[#1677D2]" />
                              <span>Cargar Temario COP</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-[#64748B] flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#6D5DFB] shrink-0" />
                        <span>Planly analizará el contenido mapeado y lo distribuirá exactamente en las sesiones deseadas de tu formato oficial.</span>
                      </div>

                      {/* Footer flow actions */}
                      <div className="pt-4 border-t border-slate-100 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setCurrentStep(2)}
                          disabled={!temario.trim() || fileParsing}
                          className={`bg-[#1677D2] hover:bg-[#135fb0] text-xs font-bold text-white px-5 py-2.5 rounded-xl border-none shadow-xs flex items-center gap-2 cursor-pointer transition-all ${
                            (!temario.trim() || fileParsing) ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          <span>Siguiente: Subir Formato</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: LOAD FORMAT/TEMPLATE */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                          <h2 className="text-lg font-bold text-[#0B2A5B]">Paso 2: Sintoniza tu formato institucional</h2>
                          <p className="text-xs text-[#64748B]">Carga tu propio archivo de Word (.docx). Planly inyectará contenidos respetando tablas, logotipos y estilos institucionales.</p>
                        </div>
                        {templateMeta.hasCustom && (
                          <button
                            type="button"
                            onClick={handleResetTemplate}
                            className="bg-white hover:bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remover Personalizada</span>
                          </button>
                        )}
                      </div>

                      {/* Status alerts for current template */}
                      {templateMsg && (
                        <div className="bg-[#EAFBF0] border border-[#22C55E]/30 text-[#1E7E34] text-xs p-3.5 rounded-xl flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                          <p className="font-medium">{templateMsg}</p>
                        </div>
                      )}
                      {templateError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-xl flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <p className="font-medium">{templateError}</p>
                        </div>
                      )}

                      {/* Active Template card display */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={`p-4 rounded-xl border transition-all ${!templateMeta.hasCustom ? "border-2 border-[#27C7B8] bg-teal-50/10 shadow-xs" : "border-[#D9E2EC] bg-white opacity-60"}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex gap-3">
                              <div className="w-9 h-9 rounded-lg bg-[#EAF4FF] text-[#1677D2] flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-[#0B2A5B]">Formato Original Oficial (Planly)</h4>
                                <p className="text-[10px] text-slate-500 mt-0.5">Estructura certificada multilayout de 14 semanas con rúbricas automatizadas.</p>
                              </div>
                            </div>
                            {!templateMeta.hasCustom && (
                              <span className="bg-[#EAFBF0] text-[#22C55E] text-[8px] font-extrabold px-1.5 py-0.5 rounded-full border border-[#22C55E]/20 shrink-0">
                                Activo
                              </span>
                            )}
                          </div>
                        </div>

                        <div className={`p-4 rounded-xl border transition-all ${templateMeta.hasCustom ? "border-2 border-[#27C7B8] bg-teal-50/10 shadow-xs" : "border-dashed border-[#D9E2EC] bg-slate-50/40 text-slate-400"}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex gap-3">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${templateMeta.hasCustom ? "bg-teal-50 text-[#27C7B8]" : "bg-slate-100 text-slate-400"}`}>
                                <FileUp className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-[#0B2A5B] truncate max-w-[180px]">
                                  {templateMeta.hasCustom ? templateMeta.fileName : "Tu archivo personalizado (.docx)"}
                                </h4>
                                <p className="text-[10px] mt-0.5 truncate">
                                  {templateMeta.hasCustom 
                                    ? `Cargado: ${( (templateMeta.fileSize || 0) / 1024 ).toFixed(1)} KB • Listo` 
                                    : "Sube tu formato para una personalización completa y exacta."}
                                </p>
                              </div>
                            </div>
                            {templateMeta.hasCustom && (
                              <span className="bg-[#EAFBF0] text-[#22C55E] text-[8px] font-extrabold px-1.5 py-0.5 rounded-full border border-[#22C55E]/20 flex items-center gap-0.5 shrink-0">
                                <Check className="w-2 h-2" /> Activo
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Dropzone container inside wizard */}
                      <div className="border-2 border-dashed border-[#B9DFFF] bg-[#EAF4FF]/20 rounded-2xl p-6 text-center relative cursor-pointer group hover:bg-[#EAF4FF]/35 transition-all">
                        <input
                          type="file"
                          accept=".docx"
                          onChange={handleTemplateUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        
                        {uploadingTemplate ? (
                          <div className="space-y-3 py-2">
                            <Loader2 className="w-8 h-8 text-[#1677D2] animate-spin mx-auto" />
                            <span className="font-bold text-xs text-[#0B2A5B] block">Validando e importando tu estructura de Word...</span>
                          </div>
                        ) : (
                          <div className="space-y-2 py-1">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mx-auto text-[#1677D2] border border-slate-200 group-hover:scale-105 transition-transform shadow-xs">
                              <FileUp className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-bold text-xs text-[#0B2A5B] block">Haz clic o arrastra tu plantilla institucional aquí (.docx)</span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">Soporta cualquier plantilla de Word (.docx) con logotipos de hasta 10 MB</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 space-y-2 text-[11px] text-[#64748B]">
                        <p className="font-bold text-[#0B2A5B] flex items-center gap-1">
                          <span>💡 Guía rápida para inyección exacta:</span>
                        </p>
                        <p className="leading-relaxed">
                          La plantilla puede llevar cualquier diseño institucional, tablas personalizadas y combinaciones de colores. Planly respeta todos los textos estáticos e inyectará los contenidos calculados en las siguientes etiquetas opcionales:
                        </p>
                        <div className="flex flex-wrap gap-1.5 py-1">
                          <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono text-[9px] text-[#0B2A5B] font-bold">{`{materia}`}</span>
                          <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono text-[9px] text-[#0B2A5B] font-bold">{`{examen_pct}`}</span>
                          <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono text-[9px] text-[#0B2A5B] font-bold">{`{continua_pct}`}</span>
                          <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono text-[9px] text-[#0B2A5B] font-bold">{`{#sesiones}...{/sesiones}`}</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-200 flex justify-between">
                        <button
                          type="button"
                          onClick={() => setCurrentStep(1)}
                          className="bg-[#EAF4FF] text-[#0B2A5B] border border-[#B9DFFF] hover:bg-sky-100 text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer transition-all"
                        >
                          Volver al Temario
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setCurrentStep(3)}
                          className="bg-[#1677D2] hover:bg-[#135fb0] text-xs font-bold text-white px-5 py-2.5 rounded-xl border-none shadow-xs flex items-center gap-2 cursor-pointer transition-all"
                        >
                          <span>Siguiente: Configurar</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: CONFIGURE PARAMETERS */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-lg font-bold text-[#0B2A5B]">Paso 3: Parámetros del Documento</h2>
                        <p className="text-xs text-[#64748B]">Configura de forma manual las variables para que el resultado de tu planeación académica sea completamente escalable.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Asignatura */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-[#0B2A5B]">Nombre de la Asignatura</label>
                          <input
                            type="text"
                            value={materiaName}
                            onChange={(e) => setMateriaName(e.target.value)}
                            className="planly-input text-xs font-bold"
                            placeholder="Ej: Contabilidad de Organizaciones Públicas"
                          />
                        </div>

                        {/* Nivel Educativo */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-[#0B2A5B]">Nivel Educativo de Destino</label>
                          <input
                            type="text"
                            value={nivelEducativo}
                            onChange={(e) => setNivelEducativo(e.target.value)}
                            className="planly-input text-xs font-bold"
                          />
                        </div>

                        {/* Fecha Inicio */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-[#0B2A5B] flex items-center justify-between">
                            <span>Fecha de Inicio</span>
                            <Calendar className="w-3.5 h-3.5 text-[#1677D2]" />
                          </label>
                          <input
                            type="date"
                            value={fechaInicio}
                            onChange={(e) => setFechaInicio(e.target.value)}
                            className="planly-input text-xs font-bold"
                          />
                        </div>

                        {/* Mecanismo */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-[#0B2A5B]">Mecanismo Temporal de Avance</label>
                          <select
                            value={mecanismo}
                            onChange={(e) => setMecanismo(e.target.value)}
                            className="planly-input text-xs font-bold bg-white"
                          >
                            <option value="Semanas Consecutivas">Semanas Consecutivas (Predefinido)</option>
                            <option value="Sesiones Bisemanales">Sesiones Bisemanales</option>
                            <option value="Módulos Quincenales">Módulos Quincenales</option>
                            <option value="Formato Intensivo">Planificación Intensiva Diaria</option>
                          </select>
                        </div>

                        {/* Cantidad de Sesiones slider */}
                        <div className="flex flex-col gap-1.5 col-span-1 md:col-span-2 bg-[#F7FAFC] p-4 rounded-xl border border-[#D9E2EC]">
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-bold text-[#0B2A5B]">Semanas/Sesiones a Planear</label>
                            <span className="text-xs font-extrabold text-[#1677D2] bg-[#EAF4FF] px-2.5 py-0.5 rounded-lg border border-[#B9DFFF]">
                              {numSesiones} Sesiones programadas
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="24"
                            value={numSesiones}
                            onChange={(e) => setNumSesiones(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer accent-[#1677D2]"
                          />
                          <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                            <span>Min: 1</span>
                            <span>Medio: 12</span>
                            <span>Máx: 24 Sesiones</span>
                          </div>
                        </div>

                        {/* Tipografía Deseada */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-[#0B2A5B] flex items-center justify-between">
                            <span>Tipografía Inyectada en el documento</span>
                            <Type className="w-3.5 h-3.5 text-slate-400" />
                          </label>
                          <input
                            type="text"
                            value={tipografia}
                            onChange={(e) => setTipografia(e.target.value)}
                            className="planly-input text-xs font-bold"
                          />
                        </div>

                        {/* Entregable type */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-[#0B2A5B]">Tipo de Entregable Oficial</label>
                          <input
                            type="text"
                            value={entregableType}
                            onChange={(e) => setEntregableType(e.target.value)}
                            className="planly-input text-xs font-bold"
                          />
                        </div>
                      </div>

                      {/* EVALUATION PERCENTAGES SECTION */}
                      <div className="bg-[#EAF4FF] border border-[#B9DFFF] rounded-xl p-5 space-y-4">
                        <div className="flex justify-between items-baseline">
                          <h3 className="text-xs font-extrabold text-[#0B2A5B] uppercase tracking-wider">
                            Ponderación de Criterios de Evaluación
                          </h3>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            totalPct === 100 || totalPct === 115 
                              ? "bg-emerald-100 text-emerald-800" 
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            Sumatoria total: {totalPct}% (Objetivo ideal: 100% o 115%)
                          </span>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-white border border-[#D9E2EC] p-3 rounded-xl flex flex-col justify-center">
                            <span className="text-[11px] font-semibold text-[#64748B]">Examen Escrito</span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <input
                                type="number"
                                value={examenPct}
                                onChange={(e) => setExamenPct(Number(e.target.value) || 0)}
                                className="w-full bg-slate-50 border border-[#D9E2EC] rounded p-1 text-xs font-extrabold text-right text-[#0B2A5B]"
                              />
                              <span className="text-xs font-bold">%</span>
                            </div>
                          </div>

                          <div className="bg-white border border-[#D9E2EC] p-3 rounded-xl flex flex-col justify-center">
                            <span className="text-[11px] font-semibold text-[#64748B]">Ev. Continua / Tareas</span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <input
                                type="number"
                                value={continuaPct}
                                onChange={(e) => setContinuaPct(Number(e.target.value) || 0)}
                                className="w-full bg-slate-50 border border-[#D9E2EC] rounded p-1 text-xs font-extrabold text-right text-[#0B2A5B]"
                              />
                              <span className="text-xs font-bold">%</span>
                            </div>
                          </div>

                          <div className="bg-white border border-[#D9E2EC] p-3 rounded-xl flex flex-col justify-center">
                            <span className="text-[11px] font-semibold text-[#64748B]">Plataforma Académica</span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <input
                                type="number"
                                value={plataformaPct}
                                onChange={(e) => setPlataformaPct(Number(e.target.value) || 0)}
                                className="w-full bg-slate-50 border border-[#D9E2EC] rounded p-1 text-xs font-extrabold text-right text-[#0B2A5B]"
                              />
                              <span className="text-xs font-bold">%</span>
                            </div>
                          </div>

                          <div className="bg-white border border-[#D9E2EC] p-3 rounded-xl flex flex-col justify-center">
                            <span className="text-[11px] font-semibold text-[#64748B]">Exposición</span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <input
                                type="number"
                                value={exposicionPct}
                                onChange={(e) => setExposicionPct(Number(e.target.value) || 0)}
                                className="w-full bg-slate-50 border border-[#D9E2EC] rounded p-1 text-xs font-extrabold text-right text-[#0B2A5B]"
                              />
                              <span className="text-xs font-bold">%</span>
                            </div>
                          </div>
                        </div>

                        {totalPct !== 100 && totalPct !== 115 && (
                          <div className="text-[10px] text-[#F59E0B] font-semibold flex items-center gap-1">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>La sumatoria de los criterios no coincide con 100% o 115%. Planly adaptará las ponderaciones estimadas.</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-slate-200 flex justify-between">
                        <button
                          type="button"
                          onClick={() => setCurrentStep(2)}
                          className="bg-[#EAF4FF] text-[#0B2A5B] border border-[#B9DFFF] hover:bg-sky-100 text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer transition-all"
                        >
                          Volver al Formato
                        </button>
                        
                        <button
                          type="button"
                          onClick={handleGeneratePreview}
                          className="bg-[#6D5DFB] hover:bg-[#5241DA] text-xs font-bold text-white px-6 py-2.5 rounded-xl border-none shadow-xs flex items-center gap-2 cursor-pointer transition-all animate-pulse"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>Generar Planeación con IA</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: PROCESSING OVERLAY CHRONICLER INLINE */}
                  {currentStep === 4 && (
                    <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-[#6D5DFB] animate-spin" />
                        <Sparkles className="w-6 h-6 text-[#6D5DFB] absolute inset-0 m-auto animate-pulse" />
                      </div>
                      
                      <div className="space-y-1.5">
                        <p className="text-base font-bold text-[#0B2A5B]">Diseñando Planeación Curricular...</p>
                        <p className="text-xs text-[#6D5DFB] tracking-wider uppercase font-bold animate-pulse">
                          Llamando a Gemini 3.5 Flash & Inyectando Nodos
                        </p>
                      </div>

                      <div className="bg-[#F7FAFC] border border-[#D9E2EC] p-3 max-w-md w-full rounded-xl text-xs font-mono text-slate-600 shadow-inner">
                        {statusMessage || "Estructurando sesiones didácticas consecutivas..."}
                      </div>

                      <p className="text-[10px] text-[#64748B] italic">
                        El proceso es en tiempo real y conserva el formato intacto.
                      </p>
                    </div>
                  )}

                  {/* STEP 5: DETAILED EDITABLE RESULTS OUTCOME */}
                  {currentStep === 5 && (
                    <div className="space-y-6">
                      
                      {/* Success block */}
                      <div className="bg-[#EAFBF0] border border-[#22C55E]/30 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-6 h-6 text-[#22C55E] shrink-0" />
                          <div className="text-xs">
                            <p className="font-bold text-[#0B2A5B]">¡Documento estructurado correctamente!</p>
                            <p className="text-slate-600">Planly identificó {generatedSessions.length} sesiones continuas que se conservaron en perfecto formato.</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="bg-[#EAF4FF] text-[#1677D2] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#B9DFFF]">
                            Formato Conservado
                          </span>
                          <span className="bg-[#F1EFFF] text-[#6D5DFB] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#6D5DFB]/20">
                            Fórmula de Puntos Correcta
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                          <div>
                            <h3 className="font-extrabold text-[#0B2A5B] text-sm uppercase tracking-wider">
                              Tabla del Programa Operativo Generado
                            </h3>
                            <p className="text-[11px] text-slate-500">
                              Puedes hacer clic sobre los campos directamente en la hoja para modificar temas u objetivos antes de su descarga.
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                const nextNum = generatedSessions.length + 1;
                                setGeneratedSessions([
                                  ...generatedSessions,
                                  {
                                    num: nextNum,
                                    fecha: "Siguiente lunes",
                                    tema: "Nuevo tema adicional de contabilidad gubernamental...",
                                    actividad: "Actividades prácticas con plantillas de Excel en la plataforma",
                                    objetivo: "Describir el proceso final de auditoría superior"
                                  }
                                ]);
                              }}
                              className="bg-[#EAF4FF] text-[#1677D2] border border-[#B9DFFF] hover:bg-sky-100 text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Agregar Tema</span>
                            </button>
                          </div>
                        </div>

                        {/* HIGH FIDELITY INTERACTIVE SHEET TABLE */}
                        <div className="border border-[#D9E2EC] rounded-xl overflow-hidden shadow-xs">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-[#EAF4FF] text-[#0B2A5B] text-[11px] font-bold border-b border-[#D9E2EC]">
                                  <th className="p-3 w-12 text-center">N°</th>
                                  <th className="p-3 w-32">Fecha</th>
                                  <th className="p-3">Tema Principal</th>
                                  <th className="p-3">Actividad</th>
                                  <th className="p-3">Objetivo Académico</th>
                                  <th className="p-3 w-12 text-center">Acción</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#D9E2EC] text-xs">
                                {generatedSessions.map((row, rIdx) => (
                                  <tr key={rIdx} className="hover:bg-[#F7FAFC] transition-colors">
                                    <td className="p-3 text-center font-mono font-bold text-slate-500">
                                      {row.num}
                                    </td>
                                    <td className="p-3">
                                      <span className="inline-block bg-slate-100 font-bold px-1.5 py-0.5 rounded text-slate-700 text-[10px] font-mono">
                                        {row.fecha}
                                      </span>
                                    </td>
                                    
                                    {/* Tema inline editor */}
                                    <td className="p-2">
                                      <textarea
                                        value={row.tema}
                                        onChange={(e) => handleUpdateSessionRow(rIdx, "tema", e.target.value)}
                                        className="w-full bg-transparent border-none outline-none focus:bg-white focus:ring-1 focus:ring-[#1677D2] rounded p-1 text-slate-800 font-medium resize-none text-[11.5px]"
                                        rows={2}
                                      />
                                    </td>

                                    {/* Actividad inline editor */}
                                    <td className="p-2">
                                      <textarea
                                        value={row.actividad}
                                        onChange={(e) => handleUpdateSessionRow(rIdx, "actividad", e.target.value)}
                                        className="w-full bg-transparent border-none outline-none focus:bg-white focus:ring-1 focus:ring-[#1677D2] rounded p-1 text-slate-600 resize-none text-[11px]"
                                        rows={2}
                                      />
                                    </td>

                                    {/* Objetivo inline editor */}
                                    <td className="p-2">
                                      <textarea
                                        value={row.objetivo}
                                        onChange={(e) => handleUpdateSessionRow(rIdx, "objetivo", e.target.value)}
                                        className="w-full bg-transparent border-none outline-none focus:bg-white focus:ring-1 focus:ring-[#1677D2] rounded p-1 text-slate-600 resize-none text-[11px]"
                                        rows={2}
                                      />
                                    </td>

                                    <td className="p-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setGeneratedSessions(generatedSessions.filter((_, itemIdx) => itemIdx !== rIdx));
                                        }}
                                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                        title="Eliminar tema"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                      </div>

                      {/* Download box */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="text-xs">
                          <p className="font-bold text-[#0B2A5B]">¿Quieres inyectar y descargar tu avance?</p>
                          <p className="text-slate-500">Planly generará el archivo con tus cambios respetando colores, bordes y tipografías deseadas.</p>
                        </div>

                        <div className="flex gap-2 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentStep(3);
                              setSuccess(false);
                            }}
                            className="w-full sm:w-auto bg-white border border-[#D9E2EC] text-slate-700 font-bold px-4 py-2 text-xs rounded-xl hover:bg-slate-100 cursor-pointer transition-all"
                          >
                            Modificar Parámetros
                          </button>
                          
                          <button
                            type="button"
                            onClick={handleDownloadDocx}
                            className="w-full sm:w-auto bg-[#22C55E] text-white font-extrabold px-5 py-2.5 text-xs rounded-xl border-none hover:bg-[#1faa4f] flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                          >
                            <FileText className="w-4 h-4 shrink-0" />
                            <span>Descargar Word (.docx)</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  )}

                </div>

              </div>
            )}

            {/* VIEW TAB 3: EXAMEN MODULE */}
            {activeTab === "examenes" && (
              <ExamModule 
                materiaName={materiaName} 
                onGenerateExamWithAI={async (opts) => {
                  console.log("Mock triggering exam generation", opts);
                  return true;
                }} 
              />
            )}

            {/* VIEW TAB 4: MIS PLANTILLAS (Formato de subida e historial) */}
            {activeTab === "plantillas" && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-[#0B2A5B]">Mis Plantillas Oficiales</h1>
                    <p className="text-xs text-[#64748B]">Sube tu propio formato de Word (.docx) para inyectar tus planeaciones respetando tus tablas, logos y color institucional.</p>
                  </div>
                  
                  {templateMeta.hasCustom && (
                    <button
                      type="button"
                      onClick={handleResetTemplate}
                      className="bg-white hover:bg-red-50 text-red-600 border border-red-200 px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Restablecer Todo</span>
                    </button>
                  )}
                </div>

                {/* Status messages for custom template uploads */}
                {templateMsg && (
                  <div className="bg-[#EAFBF0] border border-[#22C55E]/30 text-[#1E7E34] text-xs p-4 rounded-xl flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="font-medium">{templateMsg}</p>
                  </div>
                )}
                {templateError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-4 rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="font-medium">{templateError}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Default institutional template */}
                  <div className={`p-6 rounded-2xl bg-white border transition-all relative ${!templateMeta.hasCustom ? "border-2 border-[#27C7B8] shadow-sm" : "border-[#D9E2EC] opacity-60"}`}>
                    {!templateMeta.hasCustom && (
                      <span className="absolute top-4 right-4 bg-[#EAFBF0] text-[#22C55E] text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-[#22C55E]/20">
                        Activa por Defecto
                      </span>
                    )}
                    {templateMeta.hasCustom && (
                      <span className="absolute top-4 right-4 bg-[#F0F4F8] text-[#627D98] text-[9px] font-bold px-2 py-0.5 rounded-full border border-[#D9E2EC]">
                        Inactiva
                      </span>
                    )}
                    
                    <div className="w-10 h-10 rounded-xl bg-[#EAF4FF] text-[#1677D2] flex items-center justify-center mb-4">
                      <FileText className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-[#0B2A5B] text-sm">Formato Original Planly</h3>
                    <p className="text-xs text-slate-500 mt-1">Esquema oficial de 14 sesiones con desglose diario y matriz de criterios de evaluación.</p>
                    
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Uso: Formato de respaldo</span>
                      <span className="text-slate-600 font-mono">1.2 MB • DOCX</span>
                    </div>

                    {templateMeta.hasCustom && (
                      <button
                        onClick={handleResetTemplate}
                        className="mt-3.5 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold py-2 rounded-lg cursor-pointer transition-all"
                      >
                        Volver a usar formato original
                      </button>
                    )}
                  </div>

                  {/* Personal teacher template (Customized) */}
                  <div className={`p-6 rounded-2xl bg-white border transition-all relative ${templateMeta.hasCustom ? "border-2 border-[#27C7B8] shadow-sm" : "border-dashed border-[#D9E2EC] bg-slate-50/50"}`}>
                    {templateMeta.hasCustom ? (
                      <>
                        <span className="absolute top-4 right-4 bg-[#EAFBF0] text-[#22C55E] text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-[#22C55E]/20 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Activa
                        </span>
                        <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#27C7B8] flex items-center justify-center mb-4">
                          <FileUp className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-[#0B2A5B] text-sm truncate max-w-[200px]" title={templateMeta.fileName}>
                          {templateMeta.fileName}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Plantilla institucional cargada con éxito. Listo para inyectar contenido con OpenXML.</p>
                        
                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                          <span>Subido: {templateMeta.uploadedAt ? new Date(templateMeta.uploadedAt).toLocaleDateString() : "Hoy"}</span>
                          <span className="text-slate-600 font-mono">{( (templateMeta.fileSize || 0) / 1024 ).toFixed(1)} KB • DOCX</span>
                        </div>
                      </>
                    ) : (
                      <div className="h-full flex flex-col justify-between">
                        <div>
                          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
                            <Sliders className="w-5 h-5" />
                          </div>
                          <h3 className="font-bold text-slate-400 text-sm">Tu propia plantilla (.docx)</h3>
                          <p className="text-xs text-slate-400 mt-1">Aún no has cargado un formato personalizado. Se utiliza la plantilla predeterminada.</p>
                        </div>
                        
                        <div className="pt-4 border-t border-dashed border-slate-200 mt-4 text-[11px] text-slate-400">
                          Ningún formato personalizado activo
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload drag drop placeholder */}
                <div className="bg-white border border-[#D9E2EC] rounded-2xl p-6 shadow-xs">
                  <h3 className="font-bold text-sm text-[#0B2A5B] mb-1">Cargar nueva plantilla institucional</h3>
                  <p className="text-xs text-[#64748B] mb-4">
                    Sube un documento de Microsoft Word (.docx). Para que Planly inyecte la información correctamente, tu documento puede incluir etiquetas como <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[#0B2A5B] font-bold text-[10px]">{`{materia}`}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[#0B2A5B] font-bold text-[10px]">{`{examen_pct}`}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[#0B2A5B] font-bold text-[10px]">{`{continua_pct}`}</code>, y un bloque repetitivo para las sesiones como <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[#0B2A5B] font-bold text-[10px]">{`{#sesiones}...{/sesiones}`}</code>.
                  </p>

                  <div className="border-2 border-dashed border-[#D9E2EC] bg-[#F7FAFC] hover:bg-[#F0F4F8] transition-all rounded-xl p-8 text-center relative cursor-pointer group">
                    <input
                      type="file"
                      accept=".docx"
                      onChange={handleTemplateUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    
                    {uploadingTemplate ? (
                      <div className="space-y-3">
                        <Loader2 className="w-8 h-8 text-[#1677D2] animate-spin mx-auto" />
                        <span className="font-bold text-xs text-[#0B2A5B] block">Procesando y guardando plantilla...</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto text-[#1677D2] border border-slate-200 group-hover:scale-105 transition-transform shadow-xs">
                          <FileUp className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <span className="font-bold text-xs text-[#0B2A5B] block">Haz clic o arrastra tu archivo .docx aquí</span>
                          <span className="text-[10px] text-slate-400 block">Soporta formatos Word .docx de hasta 10 MB</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW TAB 5: HISTORIAL TEMARIOS */}
            {activeTab === "temarios" && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-[#0B2A5B]">Mis Temarios Archivados</h1>
                  <p className="text-xs text-[#64748B]">Boveda de programas de asignatura procesados previamente para su consulta.</p>
                </div>

                <div className="bg-white border border-[#D9E2EC] rounded-2xl overflow-hidden shadow-xs divide-y divide-[#D9E2EC]">
                  <div className="p-4 hover:bg-[#F7FAFC] flex justify-between items-center gap-4 text-xs">
                    <div>
                      <p className="font-bold text-[#0B2A5B]">Contabilidad de Organizaciones Públicas</p>
                      <p className="text-slate-500 text-[11px]">4 Unidades de aprendizaje • 21 líneas analíticas de CONAC</p>
                    </div>
                    <button
                      onClick={() => {
                        loadSpecimen();
                        setActiveTab("planeacion");
                        setCurrentStep(2);
                      }}
                      className="text-xs font-bold text-[#1677D2] hover:underline cursor-pointer"
                    >
                      Cargar en editor
                    </button>
                  </div>

                  <div className="p-4 hover:bg-[#F7FAFC] flex justify-between items-center gap-4 text-xs">
                    <div>
                      <p className="font-bold text-slate-500">Introducción a las Finanzas del Estado</p>
                      <p className="text-slate-500 text-[11px]">Asignatura de tronco común • Procesada por última vez en Mayo 2026</p>
                    </div>
                    <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded font-bold">
                      Archivado
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW TAB 6: HISTORIAL DESCARGAS */}
            {activeTab === "historial" && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-[#0B2A5B]">Historial de Descargas</h1>
                  <p className="text-xs text-[#64748B]">Registro de auditoría institucional de documentos Word compilados.</p>
                </div>

                <div className="bg-white border border-[#D9E2EC] rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-[#D9E2EC]">
                        <th className="p-4">Fecha</th>
                        <th className="p-4">Asignatura</th>
                        <th className="p-4">Acciones e Inyecciones</th>
                        <th className="p-4">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-4 font-mono text-slate-400">Hoy 21:30</td>
                        <td className="p-4 font-bold text-[#0B2A5B]">{materiaName || "Contabilidad Pública"}</td>
                        <td className="p-4">Inyección Ponderaciones: Examen {examenPct}%, Continua {continuaPct}%</td>
                        <td className="p-4">
                          <span className="bg-[#EAFBF0] text-[#22C55E] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#22C55E]/10">
                            Descargado
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW TAB 7: CONFIGURACIÓN GLOBAL */}
            {activeTab === "config" && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-[#0B2A5B]">Configuración del Sistema</h1>
                  <p className="text-xs text-[#64748B]">Establece valores fijos globales e indicadores de tu cuenta de docente.</p>
                </div>

                {/* Subscribed Planly Brand Info Plate */}
                <div className="bg-white border border-[#D9E2EC] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="w-48 h-12 shrink-0">
                    <PlanlyLogo variant="horizontal" className="w-full h-full" />
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-bold text-[#0B2A5B]">Planly - Un producto de RAUVIA Consulting</p>
                    <p className="text-[#64748B]">Licencia Corporativa Enterprise</p>
                  </div>
                </div>

                <div className="bg-white border border-[#D9E2EC] rounded-2xl p-6 shadow-xs space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-[#0B2A5B]">Correo de Usuario Docente</label>
                      <input
                        type="text"
                        disabled
                        value="docente@planly.app"
                        className="planly-input text-xs font-bold bg-slate-50 text-slate-400 cursor-not-allowed"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-[#0B2A5B]">Nivel de Suscripción</label>
                      <input
                        type="text"
                        disabled
                        value="SaaS Enterprise Institucional (Ilimitado)"
                        className="planly-input text-xs font-bold bg-slate-50 text-slate-400 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <h3 className="text-xs font-bold text-[#0B2A5B] uppercase tracking-wider mb-2">Llave Gemini 1.5/3.5 Flash</h3>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      La clave de la API está gestionada de forma centralizada en el servidor, por lo que no necesitas preocuparte por costos de cómputo individuales o límites de tokens en tu navegador.
                    </p>
                  </div>
                </div>

                {/* PERSISTENCE LAYER CONTROLLER */}
                <div className="bg-white border border-[#D9E2EC] rounded-2xl p-6 shadow-xs space-y-4">
                  <div>
                    <h3 className="font-bold text-[#0B2A5B] text-sm">Persistencia y Almacenamiento Local (Navegador)</h3>
                    <p className="text-xs text-[#64748B] mt-1">
                      Planly guarda automáticamente tu progreso en tiempo real (temarios, planes de clase estructurados, ponderaciones de evaluación y parámetros personales) utilizando la memoria de tu navegador <strong>(localStorage)</strong>. Esto evita que pierdas los datos al recargar la página.
                    </p>
                  </div>

                  <div className="bg-amber-50/60 border border-amber-200/50 p-4 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-800 leading-relaxed space-y-1">
                      <p className="font-bold">¿Deseas reiniciar tu planeación e información guardada?</p>
                      <p>
                        Al restablecer el almacenamiento, se limpiarán todos tus cambios manuales en el temario, el histórico de sesiones del plan de clase actual y la configuración de porcentajes del navegador, devolviendo los valores por defecto iniciales.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("¿Estás seguro de que deseas borrar toda la información guardada en tu navegador? Esta acción no se puede deshacer y recargará la aplicación.")) {
                          try {
                            const keys = [
                              "planly_activeTab",
                              "planly_currentStep",
                              "planly_temario",
                              "planly_materiaName",
                              "planly_nivelEducativo",
                              "planly_fechaInicio",
                              "planly_numSesiones",
                              "planly_examenPct",
                              "planly_continuaPct",
                              "planly_plataformaPct",
                              "planly_exposicionPct",
                              "planly_mecanismo",
                              "planly_tipografia",
                              "planly_entregableType",
                              "planly_generatedSessions"
                            ];
                            keys.forEach(k => localStorage.removeItem(k));
                            window.location.reload();
                          } catch (e) {
                            console.error(e);
                          }
                        }
                      }}
                      className="bg-[#FFEBEB] text-rose-700 hover:bg-rose-100 border border-rose-200 px-4 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Limpiar Memoria Persistente del Navegador</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </main>

        </div>

      </div>

      {/* DETAILED PROCESSING OVERLAY LOAD SCREEN */}
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
                Por favor, mantén tu conexión activa, se conservará la estructura impecable.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
