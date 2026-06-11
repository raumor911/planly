import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import PizZip from "pizzip";
import { createServer as createViteServer } from "vite";
import mammoth from "mammoth";
import { SyllabusParser } from "./src/server/modules/parser/syllabus";
import { DocxPayload, GenerationSnapshot } from "./src/server/modules/docx/types";
import { DidacticResourceAgent } from "./src/server/modules/agents/DidacticResourceAgent";
import { 
  askGeminiToStructureSyllabus,
  extractSyllabusFromPdf,
  cleanUpRawWordText
} from "./src/server/geminiService";
import { 
  getSessionDate, 
  FidelityTemplateEngine
} from "./src/server/templateEngine";
import { DocxAgentOrchestrator } from "./src/server/modules/docx/orchestrator";

const syllabusParser = new SyllabusParser();
const didacticResourceAgent = new DidacticResourceAgent();
const fidelityEngine = new FidelityTemplateEngine();
const docxOrchestrator = new DocxAgentOrchestrator();

const app = express();
const PORT = 3000;

// Parse json and urlencoded bodies with expanded limits to accept larger custom Word templates
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// --- NEW MODULAR ENDPOINTS ---

app.post("/api/projects/:id/parse-syllabus", async (req, res) => {
  const { text, numWeeks } = req.body;
  try {
    const payload = await syllabusParser.parse(text, numWeeks);
    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/projects/:id/render-docx", async (req, res) => {
  const { templateBase64, payload } = req.body;
  try {
    if (!templateBase64) {
      res.status(400).json({ error: "La plantilla en base64 es obligatoria." });
      return;
    }

    const templateBuffer = Buffer.from(templateBase64, 'base64');
    const zip = new PizZip(templateBuffer);
    
    const outBuffer = await fidelityEngine.process(zip, payload);
    
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", 'attachment; filename="PLAN_DOCENTE.docx"');
    res.send(outBuffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- AGENTIC FLOW ENDPOINTS ---

app.post("/api/docx/preflight", async (req, res) => {
  // --- CAPA DEFENSIVA ESTRICTA ---
  // Normalización: Eliminar prefijo gemini/ y forzar serie 2.5 para obsoletos
  if (req.body.model) {
    if (req.body.model.startsWith("gemini/")) {
      req.body.model = req.body.model.replace(/^gemini\//, "");
    }
    if (!req.body.model.includes("2.0") && !req.body.model.includes("2.5")) {
      req.body.model = "gemini-2.5-flash";
    }
  }

  const { templateBase64 } = req.body;
  try {
    if (!templateBase64) {
      res.status(400).json({ error: "La plantilla en base64 es obligatoria para el análisis preflight." });
      return;
    }
    const result = await docxOrchestrator.runPreflight(templateBase64);
    res.json(result);
  } catch (error: any) {
    console.error("[Preflight Endpoint Error]:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/docx/generate-safe", async (req, res) => {
  // --- CAPA DEFENSIVA ESTRICTA ---
  // Normalización: Eliminar prefijo gemini/ y forzar serie 2.5 para obsoletos
  if (req.body.model) {
    if (req.body.model.startsWith("gemini/")) {
      req.body.model = req.body.model.replace(/^gemini\//, "");
    }
    if (!req.body.model.includes("2.0") && !req.body.model.includes("2.5")) {
      req.body.model = "gemini-2.5-flash";
    }
  }
  if (req.body.userOptions?.preferredModel) {
    if (req.body.userOptions.preferredModel.startsWith("gemini/")) {
      req.body.userOptions.preferredModel = req.body.userOptions.preferredModel.replace(/^gemini\//, "");
    }
    if (!req.body.userOptions.preferredModel.includes("2.0") && !req.body.userOptions.preferredModel.includes("2.5")) {
      req.body.userOptions.preferredModel = "gemini-2.5-flash";
    }
  }

  const snapshot: GenerationSnapshot = req.body;
  try {
    if (!snapshot.templateBase64 || !snapshot.payload) {
      res.status(400).json({ error: "Snapshot incompleto. Se requiere plantilla y payload." });
      return;
    }
    
    const buffer = await docxOrchestrator.runSafeGeneration(snapshot, snapshot.userOptions?.planDraft);
    
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", 'attachment; filename="PLAN_SEGURO.docx"');
    res.send(buffer);
  } catch (error: any) {
    console.error("[Generate Safe Endpoint Error]:", error);
    res.status(500).json({ error: error.message });
  }
});

// --- LEGACY ENDPOINTS ---
app.post("/api/curricula/extract-text", async (req, res) => {
  const { fileBase64, mimeType, fileName } = req.body;

  if (!fileBase64 || !mimeType) {
    res.status(400).json({ error: "Se requiere un documento válido codificado en Base64 y su tipo MIME." });
    return;
  }

  try {
    let resultText = "";

    if (mimeType === "application/pdf") {
      console.log("Processing PDF directly with Gemini mapping...");
      resultText = await extractSyllabusFromPdf(fileBase64);
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
      mimeType === "application/octet-stream" || 
      (fileName && fileName.endsWith(".docx"))
    ) {
      console.log("Extracting raw Word text with mammoth library...");
      const buffer = Buffer.from(fileBase64, "base64");
      const docResult = await mammoth.extractRawText({ buffer });
      const rawText = docResult.value || "";
      
      if (rawText.trim().length === 0) {
        throw new Error("No se pudo extraer ningún texto del documento de Word subido.");
      }
      
      // Se extrae el texto puro sin procesar por IA en esta etapa
      resultText = rawText;
    } else if (mimeType.startsWith("text/")) {
      console.log("Processing TXT/Markdown text document...");
      resultText = Buffer.from(fileBase64, "base64").toString("utf8");
    } else {
      res.status(400).json({ error: "El formato de archivo no es soportado. Por favor, cargue un archivo de Word (.docx) o un PDF (.pdf)." });
      return;
    }

    res.json({
      success: true,
      extractedText: resultText
    });

  } catch (error: unknown) {
    console.error("Error during document parsing/extraction: ", error);
    const errMessage = error instanceof Error ? error.message : "Ocurrió un error inesperado al procesar el archivo.";
    res.status(500).json({ error: errMessage });
  }
});

// Generation controller endpoint separated from the monolithic body
app.post("/api/curricula/generate", async (req, res) => {
  // --- CAPA DEFENSIVA ESTRICTA CONTRA MODELOS OBSOLETOS ---
  const DEFAULT_TARGET = "gemini-2.5-flash";
  
  if (req.body.model) {
    if (req.body.model.startsWith("gemini/")) {
      req.body.model = req.body.model.replace(/^gemini\//, "");
    }
    if (!req.body.model.includes("2.0") && !req.body.model.includes("2.5")) {
      req.body.model = DEFAULT_TARGET;
    }
  }
  
  if (req.body.preferredModel) {
    if (req.body.preferredModel.startsWith("gemini/")) {
      req.body.preferredModel = req.body.preferredModel.replace(/^gemini\//, "");
    }
    if (!req.body.preferredModel.includes("2.0") && !req.body.preferredModel.includes("2.5")) {
      req.body.preferredModel = DEFAULT_TARGET;
    }
  }

  const { 
    temario,
    fechaInicio = "2026-05-11",
    numSesiones = 14,
    examenPct = "30%",
    continuaPct = "40%",
    plataformaPct = "30%",
    exposicionPct = "15%",
    isPreview = false,
    sesionesOverride = null,
    materiaOverride = "",
    templateBase64,
    professor = "",
    period = "26-3",
    group = "",
    term = "",
    schedule = "",
    shift = ""
  } = req.body;

  // Validation of rubric percentages
  const totalPct = (parseInt(examenPct) || 0) + (parseInt(continuaPct) || 0) + (parseInt(plataformaPct) || 0);
  if (totalPct !== 100) {
    console.warn(`[INSTITUTIONAL] Rubric percentages total ${totalPct}%, which differs from the required 100%. Proceeding with caution.`);
  }

  // If there are manual overrides, we skip the Gemini call entirely
  const hasManualOverride = Array.isArray(sesionesOverride) && sesionesOverride.length > 0;

  if (!hasManualOverride && (!temario || typeof temario !== "string" || temario.trim().length === 0)) {
    res.status(400).json({ error: "El contenido del temario es requerido para realizar la planeación." });
    return;
  }

  const sessionsCount = Math.max(1, Math.min(60, Number(numSesiones) || 14));

  try {
    let cleanSubject = "Contabilidad de Organizaciones Públicas";
    let sessions = [];
    let generalObjective = "Analizar y aplicar los principios de contabilidad gubernamental...";
    let courseCode = "N/A";

    if (hasManualOverride) {
      sessions = sesionesOverride;
      cleanSubject = materiaOverride || "Contabilidad de Organizaciones Públicas";
      // Si hay override manual, intentamos recuperar el objetivo y clave si se enviaron (opcional)
      generalObjective = req.body.objetivoOverride || generalObjective;
      courseCode = req.body.claveOverride || courseCode;
    } else {
      // 1. Structure raw text with the new taxonomic SyllabusParser
      const parsedData = await syllabusParser.parse(temario, sessionsCount);

      // Map structured sessions to DocxPayload
      sessions = parsedData.sessions.map((s: any, idx: number) => ({
        num: s.num || (idx + 1),
        week: s.week || String(Math.floor(idx / 1) + 1), // Simplificación: 1 sesión por semana si no viene
        date: getSessionDate(idx, fechaInicio),
        unit: s.unit || "",
        objective: s.objective || "",
        topic: s.topic || "",
        subtopics: s.subtopics || [],
        content: s.content || "",
        activity: s.activity || "",
        activities: s.activities || [],
        resources: s.resources || "",
        evidence: s.evidence || "",
        evaluation: s.evaluation || "",
        bibliography: s.bibliography || ""
      }));

      if (parsedData.course.name) cleanSubject = parsedData.course.name.trim();
      if (parsedData.course.generalObjective) generalObjective = parsedData.course.generalObjective.trim();
      if (parsedData.course.code) courseCode = parsedData.course.code.trim();

      // Enriquecimiento con recursos didácticos
      console.log("[SERVER] Enriqueciendo sesiones con DidacticResourceAgent...");
      sessions = await didacticResourceAgent.enrichSessions(sessions, temario);
      console.log(`[SERVER] Enriquecimiento completado. Primera sesión recursos:`, sessions[0]?.didacticResources);
    }

    // 5. Package payload matching new DocxPayload structure
    const docxPayload: DocxPayload = {
      course: {
        name: cleanSubject,
        code: courseCode,
        generalObjective: generalObjective
      },
      sessions: sessions,
      bibliography: [],
      evaluation: {
        firstPartial: { period: "1er Parcial", items: [{ name: "Examen", percentage: parseInt(examenPct) || 30 }] },
        secondPartial: { period: "2do Parcial", items: [{ name: "Continua", percentage: parseInt(continuaPct) || 40 }] },
        final: { period: "Final", items: [{ name: "Proyecto", percentage: parseInt(plataformaPct) || 30 }] }
      },
      professor,
      period,
      group,
      term,
      schedule,
      shift
    };

    console.log(`[DOCX] Payload sessions count: ${docxPayload.sessions.length}`);

    if (isPreview) {
      console.log("[SERVER] Enviando preview al cliente con", sessions.length, "sesiones.");
      res.json({ 
        success: true, 
        materia: cleanSubject, 
        objetivo: generalObjective,
        clave: courseCode,
        payload: docxPayload 
      });
      return;
    }

    // Identificación y Embalaje de Insumos en el endpoint POST /api/curricula/generate 
    console.log("[DOCX] Compiling ephemeral in-memory output using high-fidelity custom pipeline..."); 
    
    // Candado estricto del Flujo Único Requerido 
    if (!templateBase64) { 
      res.status(400).json({ error: "La carga de la plantilla personalizada institucional (.docx) es obligatoria para este flujo." }); 
      return; 
    } 
 
    // Invocamos el bucle agéntico de generación y sanación a través del orquestador
    const buffer = await docxOrchestrator.runSafeGeneration({
      templateBase64,
      payload: docxPayload
    });
 
    // 4. Transmisión limpia del flujo resultante directo al navegador 
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"); 
    res.setHeader("Content-Disposition", `attachment; filename="Planeacion_${cleanSubject.replace(/\s+/g, '_')}.docx"`); 
    res.send(buffer);

  } catch (error: any) {
    console.error("Endpoint generation error: ", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoints to manage the Word .docx template (Mocked to be purely client-side/in-memory)
app.get("/api/template/info", (req, res) => {
  res.json({ hasCustom: false });
});

app.post("/api/template/upload", (req, res) => {
  res.json({ success: true, meta: { hasCustom: true, fileName: "plantilla_en_memoria.docx" } });
});

app.post("/api/template/reset", (req, res) => {
  res.json({ success: true, message: "Plantilla restablecida." });
});

// Configure Vite integration for serving frontend SPA
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode. Mounting Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode. Serving static files from dist...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EduDoc Engine server is running on http://localhost:${PORT}`);
  });
}

bootstrap();
