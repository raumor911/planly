import PizZip from 'pizzip';
// @ts-ignore
import Docxtemplater from 'docxtemplater';
import { DocxPayload } from './modules/docx/types';
import { TemplateInspector } from './modules/docx/inspector';

/**
 * Compila un documento DOCX utilizando Docxtemplater para asegurar la integridad 
 * de los namespaces y estructuras nativas de Microsoft Word.
 */
export async function compileDocxWithPayload(payload: DocxPayload, templateBase64: string): Promise<Buffer> {
  const zip = new PizZip(Buffer.from(templateBase64, 'base64'));
  
  // 1. Inyección Semántica Quirúrgica de Marcadores de Bucle
  // Si la plantilla no tiene los tags, los inyectamos directamente en el XML antes de pasar a Docxtemplater
  injectLoopTagsIfMissing(zip);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  // Mapeo de datos para compatibilidad con tags de Docxtemplater
  const viewData = {
    materia: payload.course.name,
    objetivo_general: payload.course.generalObjective,
    clave: payload.course.code,
    docente: 'Docente Planly',
    ciclo: '2026-1',
    sesiones: payload.sessions.map(s => ({
      num: s.num,
      fecha: s.fecha,
      tema: s.tema,
      actividad: s.actividad,
      objetivo: s.objetivo
    }))
  };

  try {
    doc.render(viewData);
  } catch (error: any) {
    console.error('[Docxtemplater] Error rendering document:', error);
    throw error;
  }

  return doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });
}

/**
 * Localiza la tabla de planeación e inyecta los tags {#sesiones} y {/sesiones} 
 * directamente en los nodos <w:t> para habilitar el bucle semántico.
 */
function injectLoopTagsIfMissing(zip: PizZip): void {
  const documentXmlPath = 'word/document.xml';
  let xml = zip.file(documentXmlPath)?.asText();
  if (!xml) return;

  // Si ya tiene los tags, no hacemos nada
  if (xml.includes('{#sesiones}')) return;

  const inspector = new TemplateInspector();
  const analysis = inspector.analyzeDocument(xml);
  
  // Buscamos la tabla de sesiones con confianza matricial
  const winningMatch = analysis.tables
    .filter(m => m.type === 'sessions' && (m.confidence * 5) >= 4)
    .sort((a, b) => b.confidence - a.confidence)[0];

  if (!winningMatch) {
    console.warn('[TemplateEngine] No se detectó tabla de planeación para inyección de bucles.');
    return;
  }

  // Cirugía XML por Regex para evitar destruir el árbol DOM
  // Buscamos la fila de datos (después del header)
  const tableXmls = xml.match(/<w:tbl[\s\S]*?<\/w:tbl>/g);
  if (!tableXmls || !tableXmls[winningMatch.tableIndex]) return;

  let tableXml = tableXmls[winningMatch.tableIndex];
  const rows = tableXml.match(/<w:tr[\s\S]*?<\/w:tr>/g);
  if (!rows || rows.length <= winningMatch.headerRowIndex + 1) return;

  const dataRowIdx = winningMatch.headerRowIndex + 1;
  let dataRowXml = rows[dataRowIdx];

  // Inyectamos {#sesiones} en el primer <w:t> de la fila
  dataRowXml = dataRowXml.replace(/<w:t(.*?)>/, '<w:t$1>{#sesiones}');
  
  // Inyectamos {/sesiones} en el último <w:t> de la fila
  const tMatches = dataRowXml.match(/<w:t[\s\S]*?<\/w:t>/g);
  if (tMatches && tMatches.length > 0) {
    const lastT = tMatches[tMatches.length - 1];
    const updatedLastT = lastT.replace(/<\/w:t>$/, '{/sesiones}</w:t>');
    dataRowXml = dataRowXml.split(lastT).join(updatedLastT);
  }

  // Re-ensamblamos el XML del documento
  const updatedTableXml = tableXml.replace(rows[dataRowIdx], dataRowXml);
  const updatedDocumentXml = xml.replace(tableXmls[winningMatch.tableIndex], updatedTableXml);

  zip.file(documentXmlPath, updatedDocumentXml);
}

// Mantener interfaces para compatibilidad con server.ts
export function getSessionDate(index: number, startDate: string): string {
  const date = new Date(startDate);
  date.setDate(date.getDate() + (index * 7));
  return date.toISOString().split('T')[0];
}
