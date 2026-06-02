import express from "express";
import path from "path";
import fs from "fs";
import PizZip from "pizzip";
// @ts-ignore
import Docxtemplater from "docxtemplater";
import { createServer as createViteServer } from "vite";
import mammoth from "mammoth";
import { 
  askGeminiToStructureSyllabus,
  extractSyllabusFromPdf,
  cleanUpRawWordText
} from "./src/server/geminiService";
import { 
  ensureTemplateExists, 
  getSessionDate, 
  compileDocxWithPayload,
  getCustomTemplateMeta,
  saveCustomTemplate,
  resetCustomTemplate,
  autoTagDocumentXml
} from "./src/server/templateEngine";

const app = express();
const PORT = 3000;

// Parse json and urlencoded bodies with expanded limits to accept larger custom Word templates
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Make sure the base document template is loaded on initialization
ensureTemplateExists();

// Endpoint to extract plain text from uploaded Word (.docx) or PDF (.pdf) and structure it via Gemini
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
      
      // Pass raw extracted text to Gemini to make it extremely clean and remove meta-fluff
      resultText = await cleanUpRawWordText(rawText);
    } else if (mimeType.startsWith("text/")) {
      console.log("Processing TXT/Markdown text document...");
      const text = Buffer.from(fileBase64, "base64").toString("utf8");
      resultText = await cleanUpRawWordText(text);
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
    materiaOverride = ""
  } = req.body;

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
      // 1. Structure raw text with the Gemini AI service wrapper, querying exactly sessionsCount nodes
      const parsedData = await askGeminiToStructureSyllabus(temario, sessionsCount);

      // 2. Extract and fill sessions array ensuring exactly sessionsCount nodes
      sessions = parsedData.sesiones || [];
      if (!Array.isArray(sessions) || sessions.length === 0) {
        throw new Error("No se encontraron sesiones estructuradas.");
      }

      if (parsedData.materia && typeof parsedData.materia === "string" && parsedData.materia.trim().length > 0) {
        cleanSubject = parsedData.materia.trim();
      }
    }

    // Guard requested sessionsCount structure
    if (sessions.length < sessionsCount) {
      const originalLen = sessions.length;
      for (let i = originalLen; i < sessionsCount; i++) {
        sessions.push({
          num: i + 1,
          tema: `Módulo complementario sobre Gestión Pública (Sesión ${i + 1})`,
          actividad: "Análisis grupal de casos gubernamentales y normativas contables actuales",
          objetivo: "Explicar los lineamientos prácticos del control gubernamental complementario"
        });
      }
    } else if (sessions.length > sessionsCount) {
      sessions = sessions.slice(0, sessionsCount);
    }

    // 3. String cleaner helper
    const cleanString = (str: string, maxWords: number, fallback: string): string => {
      if (!str || typeof str !== "string") return fallback;
      const cleaned = str
        .replace(/[\n\r]/g, " ")
        .replace(/[\*_`#]/g, "")
        .trim();
      const words = cleaned.split(/\s+/);
      if (words.length > maxWords) {
        return words.slice(0, maxWords).join(" ") + "...";
      }
      return cleaned;
    };

    // Helper to format percentage strings nicely
    const formatPercent = (val: string | number | null | undefined, fallback: string): string => {
      if (val === undefined || val === null) return fallback;
      const s = String(val).trim();
      if (!s) return fallback;
      return s.endsWith("%") ? s : `${s}%`;
    };

    interface CurriculaSession {
      tema?: string;
      actividad?: string;
      objetivo?: string;
    }

    // 4. Fill weekly chronological dates starting from dynamic fechaInicio
    const cleanedSessions = sessions.map((s: CurriculaSession, idx: number) => {
      const numValue = idx + 1;
      return {
        num: numValue,
        fecha: getSessionDate(idx, fechaInicio),
        tema: cleanString(s.tema || "", 15, `Desarrollo de Contabilidad Gubernamental para sesión ${numValue}`),
        actividad: cleanString(s.actividad || "", 15, "Estudio autónomo y resolución de ejercicios en la plataforma"),
        objetivo: cleanString(s.objetivo || "", 15, "Identificar los componentes contables específicos en el sector oficial")
      };
    });

    // 5. Package payload matching original template exactly
    const wordPayload = {
      materia: cleanSubject,
      examen_pct: formatPercent(examenPct, "30%"),
      continua_pct: formatPercent(continuaPct, "40%"),
      plataforma_pct: formatPercent(plataformaPct, "30%"),
      exposicion_pct: formatPercent(exposicionPct, "15%"),
      sesiones: cleanedSessions
    };

    console.log("Orchestrating zip file and autotag in server.ts...");
    ensureTemplateExists();

    const customDocxPath = path.resolve(process.cwd(), "CUSTOM_TEMPLATE.docx");
    const defaultDocxPath = path.resolve(process.cwd(), "CNT FORMATO PLANEACION.docx");
    const templatePath = fs.existsSync(customDocxPath) ? customDocxPath : defaultDocxPath;
    
    console.log(`[ZIP Orchestration] Compiling docx with template: ${templatePath}`);
    const templateBinary = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(templateBinary);

    try {
      const fileKeys = Object.keys(zip.files);
      console.log(`[ZIP Orchestration] Scanning ${fileKeys.length} files in template package.`);

      for (const key of fileKeys) {
        if (key === "word/document.xml") {
          const originalXml = zip.file(key).asText();
          const taggedXml = autoTagDocumentXml(originalXml);
          zip.file(key, taggedXml);
        } else if (key.startsWith("word/header") || key.startsWith("word/footer")) {
          console.log(`[ZIP Orchestration] Auto-tagging header/footer file: ${key}`);
          const originalXml = zip.file(key).asText();
          
          // Safe regex tag preservation to map header/footer tokens safely preserving original fonts and logotypes style
          const taggedXml = originalXml.replace(/<w:t([^>]*)>([\s\S]*?)<\/w:t>/g, (match, attrs, text) => {
            let updatedText = text;
            if (/([Mm]ateria|[Aa]signatura|[Cc]urso)\s*:\s*([_.\-\s]*)$/i.test(updatedText)) {
              updatedText = updatedText.replace(/([Mm]ateria|[Aa]signatura|[Cc]urso)\s*:\s*([_.\-\s]*)$/i, "$1: {materia}");
            }
            return `<w:t${attrs}>${updatedText}</w:t>`;
          });
          
          zip.file(key, taggedXml);
        }
      }
    } catch (err) {
      console.error("[ZIP Orchestration] Error processing headers/footers in server.ts: ", err);
    }

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.render(wordPayload);

    const outBuffer = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE"
    });

    if (isPreview) {
      // In preview mode we deliver BOTH JSON representation and base64 encoded document binary
      res.json({
        success: true,
        materia: cleanSubject,
        payload: wordPayload,
        fileBase64: outBuffer.toString("base64")
      });
    } else {
      console.log("Success! Delivering binary output stream in response headers...");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", 'attachment; filename="PROGRAMA_OPERATIVO_LLENADO.docx"');
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
      res.send(outBuffer);
    }

  } catch (error: unknown) {
    console.error("Endpoint generation error: ", error);
    const errMessage = error instanceof Error ? error.message : "Ocurrió un error inesperado al estructurar la planeación.";
    res.status(500).json({ error: errMessage });
  }
});

// Endpoints to manage the Word .docx template
app.get("/api/template/info", (req, res) => {
  try {
    const meta = getCustomTemplateMeta();
    res.json(meta);
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : "No se pudo obtener información de la plantilla.";
    res.status(500).json({ error: errMessage });
  }
});

app.post("/api/template/upload", (req, res) => {
  const { fileBase64, fileName } = req.body;
  if (!fileBase64 || !fileName) {
    res.status(400).json({ error: "Faltan datos requeridos (fileBase64 o fileName)." });
    return;
  }
  try {
    const meta = saveCustomTemplate(fileBase64, fileName);
    res.json({ success: true, meta });
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : "No se pudo guardar la plantilla personalizada.";
    res.status(500).json({ error: errMessage });
  }
});

app.post("/api/template/reset", (req, res) => {
  try {
    resetCustomTemplate();
    res.json({ success: true, message: "Plantilla restablecida al formato institucional predeterminado." });
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : "No se pudo restablecer la plantilla.";
    res.status(500).json({ error: errMessage });
  }
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
