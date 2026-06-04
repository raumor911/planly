import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import PizZip from "pizzip";
// @ts-ignore
import Docxtemplater from "docxtemplater";
import { createServer as createViteServer } from "vite";
import mammoth from "mammoth";
import { SyllabusParser } from "./src/server/modules/parser/syllabus";
import { DocxOrchestrator } from "./src/server/modules/docx/orchestrator";
import { DocxPayload } from "./src/server/modules/docx/types";
import { 
  askGeminiToStructureSyllabus,
  extractSyllabusFromPdf,
  cleanUpRawWordText
} from "./src/server/geminiService";
import { 
  getSessionDate, 
  FidelityTemplateEngine
} from "./src/server/templateEngine";

const syllabusParser = new SyllabusParser();
const docxOrchestrator = new DocxOrchestrator();
const fidelityEngine = new FidelityTemplateEngine();

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
    const result = await docxOrchestrator.generate(templateBase64, payload);
    
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", 'attachment; filename="PLAN_DOCENTE.docx"');
    res.send(result.buffer);
  } catch (error: any) {
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
    templateBase64
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

  const sessionsCount = Math.max(1, Math.min(24, Number(numSesiones) || 14));

  try {
    let cleanSubject = "Contabilidad de Organizaciones Públicas";
    let sessions = [];

    if (hasManualOverride) {
      sessions = sesionesOverride;
      cleanSubject = materiaOverride || "Contabilidad de Organizaciones Públicas";
    } else {
      // 1. Structure raw text with the new taxonomic SyllabusParser
      const parsedData = await syllabusParser.parse(temario, sessionsCount);

      // Map taxonomic topics to sessions for the DOCX engine
      sessions = parsedData.topics.map((topic: any, idx: number) => ({
        num: idx + 1,
        fecha: getSessionDate(idx, fechaInicio),
        tema: topic.title,
        actividad: parsedData.activities[idx % parsedData.activities.length]?.description || "Análisis de contenido",
        objetivo: parsedData.course.generalObjective
      }));

      if (parsedData.course.name) cleanSubject = parsedData.course.name.trim();
    }

    // 5. Package payload matching new DocxPayload structure
    const docxPayload: DocxPayload = {
      course: {
        name: cleanSubject,
        code: "CPP09",
        generalObjective: "Al término del curso, el estudiante construirá estados financieros y presupuestales..."
      },
      sessions: sessions.map((s: any, idx: number) => ({
        num: s.num || (idx + 1),
        fecha: s.fecha || getSessionDate(idx, fechaInicio),
        tema: s.tema || "",
        actividad: s.actividad || "",
        objetivo: s.objetivo || ""
      })),
      bibliography: [],
      evaluation: {
        firstPartial: { period: "1er Parcial", items: [{ name: "Examen", percentage: parseInt(examenPct) || 30 }] },
        secondPartial: { period: "2do Parcial", items: [{ name: "Continua", percentage: parseInt(continuaPct) || 40 }] },
        final: { period: "Final", items: [{ name: "Proyecto", percentage: parseInt(plataformaPct) || 30 }] }
      }
    };

    console.log(`[DOCX] Payload sessions count: ${docxPayload.sessions.length}`);

    if (isPreview) {
      res.json({ success: true, materia: cleanSubject, payload: docxPayload });
      return;
    }

    // Identificación y Embalaje de Insumos en el endpoint POST /api/curricula/generate 
    console.log("[DOCX] Compiling ephemeral in-memory output using high-fidelity custom pipeline..."); 
    
    // Candado estricto del Flujo Único Requerido 
    if (!templateBase64) { 
      res.status(400).json({ error: "La carga de la plantilla personalizada institucional (.docx) es obligatoria para este flujo." }); 
      return; 
    } 
 
    // 1. Tomar la plantilla personalizada del docente y convertirla a Buffer binario de RAM 
    const templateBuffer = Buffer.from(templateBase64, 'base64'); 
    
    // 2. Inicializar el contenedor zip en la memoria efímera del servidor 
    const zip = new PizZip(templateBuffer); 
    
    // 3. El diccionario de datos (docxPayload) ejecuta la cirugía in-place e inserta la información 
    const outBuffer = await fidelityEngine.process(zip, docxPayload); 
 
    // 4. Transmisión limpia del flujo resultante directo al navegador 
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"); 
    res.setHeader("Content-Disposition", `attachment; filename="Planeacion_${cleanSubject.replace(/\s+/g, '_')}.docx"`); 
    res.send(outBuffer);

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
