import path from "path";
import fs from "fs";
import PizZip from "pizzip";
// @ts-ignore
import Docxtemplater from "docxtemplater";
import { StructuredSession } from "./geminiService";

// Helper function to formulate weekly consecutive date labels starting from a customizable date or Monday, May 11, 2026
export function getSessionDate(sessionIndex: number, dateStr?: string): string {
  // sessionIndex is 0-based
  let baseDate = new Date(2026, 4, 11); // Month 4 is May in JS (0-indexed)
  
  if (dateStr) {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const yr = parseInt(parts[0], 10);
      const mo = parseInt(parts[1], 10) - 1;
      const dy = parseInt(parts[2], 10);
      if (!isNaN(yr) && !isNaN(mo) && !isNaN(dy)) {
        baseDate = new Date(yr, mo, dy);
      }
    } else {
      const parsed = Date.parse(dateStr);
      if (!isNaN(parsed)) {
        baseDate = new Date(parsed);
      }
    }
  }

  const sessionDate = new Date(baseDate.getTime() + sessionIndex * 7 * 24 * 60 * 60 * 1000);
  
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  
  const day = sessionDate.getDate();
  const monthName = months[sessionDate.getMonth()];
  const year = sessionDate.getFullYear();
  return `${day} de ${monthName} de ${year}`;
}

// Generate the blank styled CNT FORMATO PLANEACION.docx template domestically if it is not present
export function ensureTemplateExists(): void {
  const filePath = path.resolve(process.cwd(), "CNT FORMATO PLANEACION.docx");
  if (!fs.existsSync(filePath)) {
    console.log("CNT FORMATO PLANEACION.docx template is not present. Initiating generation of a beautifully styled DOCX schema...");

    const zip = new PizZip();

    // Relationship map
    zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

    // Content types descriptor
    zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

    // Complete main document XML defining institutional branding colors (#0B3C5D), margins, fonts, and tags list representation
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <!-- CABECERA PRINCIPAL -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:after="200"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
          <w:b/>
          <w:sz w:val="32"/>
          <w:color w:val="0B3C5D"/>
        </w:rPr>
        <w:t>EDUDOC ENGINE — FORMATO OFICIAL DE PLANEACIÓN DIDÁCTICA</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:pBdr>
          <w:bottom w:val="single" w:sz="18" w:space="8" w:color="0B3C5D"/>
        </w:pBdr>
      </w:pPr>
    </w:p>

    <!-- DETALLES DE ASIGNATURA -->
    <w:p>
      <w:pPr>
        <w:spacing w:before="240" w:after="160"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
          <w:b/>
          <w:sz w:val="24"/>
          <w:color w:val="333333"/>
        </w:rPr>
        <w:t>Materia: </w:t>
      </w:r>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
          <w:sz w:val="24"/>
          <w:color w:val="0B3C5D"/>
          <w:b/>
        </w:rPr>
        <w:t>{materia}</w:t>
      </w:r>
    </w:p>

    <!-- CRITERIOS DE EVALUACIÓN PANEL -->
    <w:p>
      <w:pPr>
        <w:spacing w:before="120" w:after="120"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
          <w:b/>
          <w:sz w:val="20"/>
          <w:color w:val="444444"/>
        </w:rPr>
        <w:t>Esquema de Criterios y Ponderaciones de Evaluación Semestral:</w:t>
      </w:r>
    </w:p>

    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="5000" w:type="pct"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:left w:val="none"/>
          <w:bottom w:val="single" w:sz="10" w:space="0" w:color="0B3C5D"/>
          <w:right w:val="none"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="EDF2F7"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="3000" w:type="pct"/>
            <w:shd w:fill="F7FAFC"/>
          </w:tcPr>
          <w:p>
            <w:r>
              <w:rPr><w:b/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="18"/><w:color w:val="0B3C5D"/></w:rPr>
              <w:t>Criterio o Rubro Evaluado</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="2000" w:type="pct"/>
            <w:shd w:fill="F7FAFC"/>
          </w:tcPr>
          <w:p>
            <w:r>
              <w:rPr><w:b/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="18"/><w:color w:val="0B3C5D"/></w:rPr>
              <w:t>Porcentaje Asignado</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="18"/></w:rPr><w:t>Examen Escrito Planeado</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:p><w:r><w:rPr><w:b/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="18"/><w:color w:val="333333"/></w:rPr><w:t>{examen_pct}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="18"/></w:rPr><w:t>Evaluación Continua y Tareas</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:p><w:r><w:rPr><w:b/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="18"/><w:color w:val="333333"/></w:rPr><w:t>{continua_pct}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="18"/></w:rPr><w:t>Trabajos en Plataforma Académica</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:p><w:r><w:rPr><w:b/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="18"/><w:color w:val="333333"/></w:rPr><w:t>{plataforma_pct}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="18"/></w:rPr><w:t>Exposición Académica</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:p><w:r><w:rPr><w:b/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="18"/><w:color w:val="333333"/></w:rPr><w:t>{exposicion_pct}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <w:p>
      <w:pPr><w:spacing w:before="300" w:after="100"/></w:pPr>
    </w:p>

    <!-- TABLA DE DESGLOSE DE SESIONES -->
    <w:p>
      <w:pPr>
        <w:spacing w:after="160"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
          <w:b/>
          <w:sz w:val="24"/>
          <w:color w:val="0B3C5D"/>
        </w:rPr>
        <w:t>MATRIZ DE INTERVENCIONES Y SESIONES DOCENTES (14 Semanas)</w:t>
      </w:r>
    </w:p>

    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="5000" w:type="pct"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="8" w:space="0" w:color="0B3C5D"/>
          <w:left w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
          <w:bottom w:val="single" w:sz="8" w:space="0" w:color="0B3C5D"/>
          <w:right w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
        </w:tblBorders>
      </w:tblPr>
      
      <!-- Fila de Cabecera -->
      <w:tr>
        <w:trPr><w:cantSplit/></w:trPr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="400" w:type="pct"/>
            <w:shd w:fill="0B3C5D"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r>
              <w:rPr><w:b/><w:color w:val="FFFFFF"/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="18"/></w:rPr>
              <w:t>Semana</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="1200" w:type="pct"/>
            <w:shd w:fill="0B3C5D"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r>
              <w:rPr><w:b/><w:color w:val="FFFFFF"/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="18"/></w:rPr>
              <w:t>Fecha Programada</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="1500" w:type="pct"/>
            <w:shd w:fill="0B3C5D"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="left"/></w:pPr>
            <w:r>
              <w:rPr><w:b/><w:color w:val="FFFFFF"/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="18"/></w:rPr>
              <w:t>Contenido Temático Principal</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="1500" w:type="pct"/>
            <w:shd w:fill="0B3C5D"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="left"/></w:pPr>
            <w:r>
              <w:rPr><w:b/><w:color w:val="FFFFFF"/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="18"/></w:rPr>
              <w:t>Actividades de Aprendizaje</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="1000" w:type="pct"/>
            <w:shd w:fill="0B3C5D"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="left"/></w:pPr>
            <w:r>
              <w:rPr><w:b/><w:color w:val="FFFFFF"/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="18"/></w:rPr>
              <w:t>Objetivo de Aprendizaje</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
      
      <!-- Fila Repetible con docxtemplater -->
      <w:tr>
        <w:trPr><w:cantSplit/></w:trPr>
        <w:tc>
          <w:tcPr><w:tcW w:w="400" w:type="pct"/></w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r>
              <w:rPr><w:b/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="18"/><w:color w:val="333333"/></w:rPr>
              <w:t>{#sesiones}{num}</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="1200" w:type="pct"/></w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r>
              <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="18"/></w:rPr>
              <w:t>{fecha}</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="1500" w:type="pct"/></w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="left"/></w:pPr>
            <w:r>
              <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="18"/></w:rPr>
              <w:t>{tema}</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="1500" w:type="pct"/></w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="left"/></w:pPr>
            <w:r>
              <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="18"/></w:rPr>
              <w:t>{actividad}</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="1000" w:type="pct"/></w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="left"/></w:pPr>
            <w:r>
              <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="18"/></w:rPr>
              <w:t>{objetivo}{/sesiones}</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>`;

    zip.file("word/document.xml", documentXml);

    const buffer = zip.generate({ type: "nodebuffer" });
    fs.writeFileSync(filePath, buffer);
    console.log("Blank styled docx template document compiled and saved on process folder.");
  }
}

export interface RenderingPayload {
  materia: string;
  examen_pct: string;
  continua_pct: string;
  plataforma_pct: string;
  exposicion_pct: string;
  sesiones: {
    num: number;
    fecha: string;
    tema: string;
    actividad: string;
    objetivo: string;
  }[];
}

export interface CustomTemplateMeta {
  hasCustom: boolean;
  fileName?: string;
  fileSize?: number;
  uploadedAt?: string;
}

export function getCustomTemplateMeta(): CustomTemplateMeta {
  const customDocxPath = path.resolve(process.cwd(), "CUSTOM_TEMPLATE.docx");
  const metaPath = path.resolve(process.cwd(), "CUSTOM_TEMPLATE_meta.json");

  if (!fs.existsSync(customDocxPath)) {
    return { hasCustom: false };
  }

  try {
    if (fs.existsSync(metaPath)) {
      const data = fs.readFileSync(metaPath, "utf-8");
      return { hasCustom: true, ...JSON.parse(data) };
    }
  } catch (e) {
    console.warn("Error parsing template meta file:", e);
  }

  // Fallback if file exists but no meta file is found
  const stats = fs.statSync(customDocxPath);
  return {
    hasCustom: true,
    fileName: "plantilla_personalizada.docx",
    fileSize: stats.size,
    uploadedAt: stats.mtime.toISOString()
  };
}

export function saveCustomTemplate(fileBase64: string, fileName: string): CustomTemplateMeta {
  const customDocxPath = path.resolve(process.cwd(), "CUSTOM_TEMPLATE.docx");
  const metaPath = path.resolve(process.cwd(), "CUSTOM_TEMPLATE_meta.json");

  const buffer = Buffer.from(fileBase64, "base64");
  fs.writeFileSync(customDocxPath, buffer);

  const metaData = {
    fileName,
    fileSize: buffer.length,
    uploadedAt: new Date().toISOString()
  };

  fs.writeFileSync(metaPath, JSON.stringify(metaData, null, 2), "utf-8");
  return { hasCustom: true, ...metaData };
}

export function resetCustomTemplate(): void {
  const customDocxPath = path.resolve(process.cwd(), "CUSTOM_TEMPLATE.docx");
  const metaPath = path.resolve(process.cwd(), "CUSTOM_TEMPLATE_meta.json");

  try {
    if (fs.existsSync(customDocxPath)) {
      fs.unlinkSync(customDocxPath);
    }
    if (fs.existsSync(metaPath)) {
      fs.unlinkSync(metaPath);
    }
  } catch (e) {
    console.error("Error resetting custom template files:", e);
  }
}

export function autoTagDocumentXml(documentXml: string): string {
  console.log("[Auto Tag Engine] Starting intelligent OpenXML tagging...");

  // If the document is already tagged, we MUST NOT modify it, as that can corrupt it
  if (documentXml.includes("{materia}") || documentXml.includes("{#sesiones}")) {
    console.log("[Auto Tag Engine] Document already contains tags. Skipping auto-tagging to prevent corruption.");
    return documentXml;
  }

  // 1. Safe replacement inside <w:t> tags to prevent breaking of any general XML tags / styles
  documentXml = documentXml.replace(/<w:t([^>]*)>([\s\S]*?)<\/w:t>/g, (match, attrs, text) => {
    let updatedText = text;
    
    // Replace "Materia: ________" with "Materia: {materia}" safely
    if (/([Mm]ateria|[Aa]signatura|[Cc]urso)\s*:\s*([_.\-\s]*)$/i.test(updatedText)) {
      updatedText = updatedText.replace(/([Mm]ateria|[Aa]signatura|[Cc]urso)\s*:\s*([_.\-\s]*)$/i, "$1: {materia}");
    }
    
    // Replace rubric check lines (e.g. ACTIVIDADES EN CLASES ( _ ) or similar)
    updatedText = updatedText.replace(/ACTIVIDADES EN CLASES\s*\(\s*_\s*\)/gi, "ACTIVIDADES EN CLASES ({continua_pct})");
    updatedText = updatedText.replace(/TAREAS\/INVESTIGACIONES\s*\(\s*_\s*\)/gi, "TAREAS/INVESTIGACIONES ({plataforma_pct})");
    updatedText = updatedText.replace(/PROYECTO\/EXPO\s*\(\s*_\s*\)/gi, "PROYECTO/EXPO ({exposicion_pct})");
    updatedText = updatedText.replace(/EXAMEN\s*\(\s*_\s*\)/gi, "EXAMEN ({examen_pct})");

    updatedText = updatedText.replace(/ACTIVIDADES EN CLASES\s*\(\s*\)/gi, "ACTIVIDADES EN CLASES ({continua_pct})");
    updatedText = updatedText.replace(/TAREAS\/INVESTIGACIONES\s*\(\s*\)/gi, "TAREAS/INVESTIGACIONES ({plataforma_pct})");
    updatedText = updatedText.replace(/PROYECTO\/EXPO\s*\(\s*\)/gi, "PROYECTO/EXPO ({exposicion_pct})");
    updatedText = updatedText.replace(/EXAMEN\s*\(\s*\)/gi, "EXAMEN ({examen_pct})");

    return `<w:t${attrs}>${updatedText}</w:t>`;
  });

  // Support matching tables and cells to insert sessions loops
  const tables: { start: number; end: number; content: string }[] = [];
  let searchIndex = 0;
  while (true) {
    const tblStart = documentXml.indexOf("<w:tbl>", searchIndex);
    if (tblStart === -1) break;
    const tblEnd = documentXml.indexOf("</w:tbl>", tblStart);
    if (tblEnd === -1) break;
    
    const content = documentXml.substring(tblStart, tblEnd + 8);
    tables.push({ start: tblStart, end: tblEnd + 8, content });
    searchIndex = tblEnd + 8;
  }

  console.log(`[Auto Tag Engine] Scanned ${tables.length} tables in word template.`);

  const getRows = (tblXml: string): string[] => {
    const rows: string[] = [];
    let idx = 0;
    while (true) {
      const rowStart = tblXml.indexOf("<w:tr", idx);
      if (rowStart === -1) break;
      const rowEnd = tblXml.indexOf("</w:tr>", rowStart);
      if (rowEnd === -1) break;
      rows.push(tblXml.substring(rowStart, rowEnd + 7));
      idx = rowEnd + 7;
    }
    return rows;
  };

  const getCells = (rowXml: string): string[] => {
    const cells: string[] = [];
    let idx = 0;
    while (true) {
      const cellStart = rowXml.indexOf("<w:tc", idx);
      if (cellStart === -1) break;
      const cellEnd = rowXml.indexOf("</w:tc>", cellStart);
      if (cellEnd === -1) break;
      cells.push(rowXml.substring(cellStart, cellEnd + 7));
      idx = cellEnd + 7;
    }
    return cells;
  };

  const cleanText = (xml: string): string => {
    return xml.replace(/<[^>]*?>/g, "").trim().toLowerCase();
  };

  const injectTagIntoCell = (cellXml: string, tag: string): string => {
    if (cellXml.includes("<w:t")) {
      let replaced = false;
      const withReplacedWt = cellXml.replace(/<w:t([^>]*)>([\s\S]*?)<\/w:t>/, (match, attrs, content) => {
        replaced = true;
        return `<w:t${attrs}>${tag}</w:t>`;
      });
      if (replaced) return withReplacedWt;
    }
    if (cellXml.includes("</w:p>")) {
      return cellXml.replace("</w:p>", `<w:r><w:t>${tag}</w:t></w:r></w:p>`);
    }
    return cellXml.replace("</w:tc>", `<w:p><w:r><w:t>${tag}</w:t></w:r></w:p></w:tc>`);
  };

  let bestTableIndex = -1;
  let bestHeaderRowIndex = -1;
  let maxColumnsMatched = 0;
  let detectedRoles: { [colIdx: number]: string } = {};

  for (let t = 0; t < tables.length; t++) {
    const tblRows = getRows(tables[t].content);
    for (let r = 0; r < tblRows.length; r++) {
      const tblCells = getCells(tblRows[r]);
      let matchesCount = 0;
      const currentRoles: { [colIdx: number]: string } = {};
      
      for (let c = 0; c < tblCells.length; c++) {
        const text = cleanText(tblCells[c]);
        // Simple but highly effective checks
        if (
          text.includes("sesi") || 
          text.includes("semana") || 
          text === "no." || 
          text === "no" || 
          text === "nº" || 
          text === "clase" || 
          text === "no. de sesión"
        ) {
          currentRoles[c] = "num";
          matchesCount++;
        } else if (
          text.includes("fecha") || 
          text.includes("calendario") || 
          text.includes("programada") || 
          text.includes("cronograma")
        ) {
          currentRoles[c] = "fecha";
          matchesCount++;
        } else if (
          text.includes("tema") || 
          text.includes("contenido") || 
          text.includes("subtema") || 
          text.includes("unidad") || 
          text.includes("materia")
        ) {
          currentRoles[c] = "tema";
          matchesCount++;
        } else if (
          text.includes("actividad") || 
          text.includes("estrategia") || 
          text.includes("didáct") || 
          text.includes("propuest")
        ) {
          currentRoles[c] = "actividad";
          matchesCount++;
        } else if (
          text.includes("objetivo") || 
          text.includes("competencia") || 
          text.includes("particular")
        ) {
          currentRoles[c] = "objetivo";
          matchesCount++;
        }
      }
      
      if (matchesCount >= 2 && matchesCount > maxColumnsMatched) {
        maxColumnsMatched = matchesCount;
        bestTableIndex = t;
        bestHeaderRowIndex = r;
        detectedRoles = currentRoles;
      }
    }
  }

  if (bestTableIndex !== -1 && bestHeaderRowIndex !== -1) {
    const targetTable = tables[bestTableIndex];
    console.log(`[Auto Tag Engine] Found target sessions matrix at table index ${bestTableIndex}, header row index ${bestHeaderRowIndex}. Matches count: ${maxColumnsMatched}`);
    console.log("[Auto Tag Engine] Detected roles mapping: ", JSON.stringify(detectedRoles));

    const tblXml = targetTable.content;
    const tblRows = getRows(tblXml);
    
    // Check if there is a data row below the header row
    if (bestHeaderRowIndex + 1 < tblRows.length) {
      const dataRowXml = tblRows[bestHeaderRowIndex + 1];
      const dataRowCells = getCells(dataRowXml);
      
      const updatedCells = dataRowCells.map((cellXml, cIdx) => {
        let tag = "";
        const role = detectedRoles[cIdx];
        if (role === "num") {
          tag = "{num}";
        } else if (role === "fecha") {
          tag = "{fecha}";
        } else if (role === "tema") {
          tag = "{tema}";
        } else if (role === "actividad") {
          tag = "{actividad}";
        } else if (role === "objetivo") {
          tag = "{objetivo}";
        }

        if (tag) {
          return injectTagIntoCell(cellXml, tag);
        }
        return cellXml;
      });

      // Now reconstruct the table row XML
      let rowStartTag = "<w:tr>";
      const originalRowStartMatch = dataRowXml.match(/<w:tr(?: [^>]*?)?>/);
      if (originalRowStartMatch) {
        rowStartTag = originalRowStartMatch[0];
      }
      
      let rowPrXml = "";
      const rowPrMatch = dataRowXml.match(/<w:trPr>[\s\S]*?<\/w:trPr>/);
      if (rowPrMatch) {
        rowPrXml = rowPrMatch[0];
      }

      // Wrap the complete row element externally with docxtemplater loop tags so columns never deform
      const updatedRowXml = `{#sesiones}${rowStartTag}${rowPrXml}${updatedCells.join("")}</w:tr>{/sesiones}`;

      // Reconstruct entire table XML preserving properties and grid
      const firstRowIdx = tblXml.indexOf("<w:tr");
      const tableHeadersXml = firstRowIdx !== -1 ? tblXml.substring(0, firstRowIdx) : "<w:tbl>";
      
      // Update the target row in place in tblRows to preserve ALL remaining rows!
      tblRows[bestHeaderRowIndex + 1] = updatedRowXml;
      
      const newTableXml = `${tableHeadersXml}${tblRows.join("")}</w:tbl>`;

      // Replace old table in documentXml
      documentXml = documentXml.replace(tblXml, newTableXml);
      console.log("[Auto Tag Engine] Automated tagging replacement completed! Loops successfully injected.");
    } else {
      console.warn("[Auto Tag Engine] Header row existed but no row below it was present for tagging.");
    }
  } else {
    console.warn("[Auto Tag Engine] Failed to automatically detect eligible sessions table in template.");
  }

  return documentXml;
}

export function compileDocxWithPayload(payload: RenderingPayload): Buffer {
  // Safe validation
  ensureTemplateExists();

  const customDocxPath = path.resolve(process.cwd(), "CUSTOM_TEMPLATE.docx");
  const defaultDocxPath = path.resolve(process.cwd(), "CNT FORMATO PLANEACION.docx");
  
  const templatePath = fs.existsSync(customDocxPath) ? customDocxPath : defaultDocxPath;
  console.log(`[Template Engine] Compiling docx with template chosen: ${templatePath}`);

  const templateBinary = fs.readFileSync(templatePath, "binary");
  const zip = new PizZip(templateBinary);

  // Auto-tag document XML, headers and footers to support raw, untagged institution word files!
  try {
    const fileKeys = Object.keys(zip.files);
    console.log(`[Template Engine] Dynamic scan detected ${fileKeys.length} files in zip.`);

    for (const key of fileKeys) {
      if (key === "word/document.xml") {
        const originalXml = zip.file(key).asText();
        const taggedXml = autoTagDocumentXml(originalXml);
        zip.file(key, taggedXml);
      } else if (key.startsWith("word/header") || key.startsWith("word/footer")) {
        console.log(`[Template Engine] Auto-tagging header/footer file: ${key}`);
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
    console.error("[Template Engine] Fail during dynamic auto-tag engine processing: ", err);
  }

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render(payload);

  return doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE"
  });
}
