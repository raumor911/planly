import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { DocxPayload } from './modules/docx/types';

export function getSessionDate(index: number, startDate: string): string {
  const date = new Date(startDate);
  date.setDate(date.getDate() + (index * 7));
  return date.toISOString().split('T')[0];
}

export class FidelityTemplateEngine {
  /**
   * Procesa la plantilla DOCX utilizando manipulación pura de strings (Regex)
   * para inyectar etiquetas semánticas y luego delega el renderizado a Docxtemplater.
   */
  public async process(zip: PizZip, payload: DocxPayload): Promise<Buffer> {
    const documentXmlPath = 'word/document.xml';
    let xml = zip.file(documentXmlPath)?.asText();
    
    if (!xml) {
      throw new Error('[FidelityEngine] No se pudo encontrar word/document.xml');
    }

    // Auditoría de imágenes inicial
    const imagesBefore = Object.keys(zip.files).filter(k => k.startsWith('word/media/')).length;
    console.log(`[DOCX] Images before: ${imagesBefore}`);

    // 1. Inyección de Campos Libres (Passive Tagging) mediante Regex
    xml = this.injectPassiveTags(xml, payload);

    // 2. Detección de Tabla de Planeación y Marcado de Bucles mediante Regex
    xml = this.injectLoopTags(xml);

    // Guardar XML modificado en el ZIP
    zip.file(documentXmlPath, xml);

    // 3. Render Final con Docxtemplater
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Mapeo de datos para que coincidan con las etiquetas inyectadas
    const renderData = {
      materia: payload.course?.name || 'Asignatura',
      objetivo_general: payload.course?.generalObjective || '',
      clave: payload.course?.code || '',
      docente: 'Docente Planly',
      ciclo: '2026-1',
      sesiones: (payload.sessions || []).map(s => ({
        num: s.num || 0,
        fecha: s.fecha || '',
        tema: s.tema || '',
        actividad: s.actividad || '',
        objetivo: s.objetivo || ''
      }))
    };

    try {
      doc.render(renderData);
    } catch (error: any) {
      console.error('[DOCX] Error renderizando con Docxtemplater:', error);
      throw error;
    }

    const finalZip = doc.getZip();
    
    // Auditoría final
    const imagesAfter = Object.keys(finalZip.files).filter(k => k.startsWith('word/media/')).length;
    const headersPreserved = Object.keys(finalZip.files).some(k => k.startsWith('word/header'));
    
    console.log(`[DOCX] Images after: ${imagesAfter}`);
    console.log(`[DOCX] Headers preserved: ${headersPreserved}`);
    console.log("[DOCX] Output generated successfully");

    return finalZip.generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });
  }

  private injectPassiveTags(xml: string, payload: DocxPayload): string {
    const dictionary = [
      { regex: /([Mm]ateria|[Aa]signatura|[Cc]urso)\s*:\s*([_.\-\s]*)/i, tag: '{materia}' },
      { regex: /([Oo]bjetivo\s+[Gg]eneral)\s*:\s*([_.\-\s]*)/i, tag: '{objetivo_general}' },
      { regex: /([Cc]lave|[Cc][oó]digo)\s*:\s*([_.\-\s]*)/i, tag: '{clave}' },
      { regex: /([Dd]ocente|[Pp]rofesor|[Cc]atedr[aá]tico)\s*:\s*([_.\-\s]*)/i, tag: '{docente}' },
      { regex: /([Cc]iclo|[Pp]eriodo|[Cc]uatrimestre)\s*:\s*([_.\-\s]*)/i, tag: '{ciclo}' }
    ];

    let updatedXml = xml;
    dictionary.forEach(entry => {
      if (entry.regex.test(updatedXml) && !updatedXml.includes(entry.tag)) {
        updatedXml = updatedXml.replace(entry.regex, (match, label) => {
          return `${label}: ${entry.tag}`;
        });
      }
    });

    return updatedXml;
  }

  private injectLoopTags(xml: string): string {
    if (xml.includes('{#sesiones}')) return xml;

    const tableRegex = /<w:tbl[\s\S]*?<\/w:tbl>/g;
    const tables = xml.match(tableRegex);

    if (!tables) return xml;

    let selectedTableIdx = -1;
    let maxScore = 0;
    const sessionHeaders = ['Sesión', 'Fecha', 'Tema', 'Actividades', 'Objetivo', 'Recursos'];

    tables.forEach((tableXml, idx) => {
      let score = 0;
      sessionHeaders.forEach(h => {
        if (new RegExp(h, 'i').test(tableXml)) score++;
      });

      if (score >= 4 && score > maxScore) {
        maxScore = score;
        selectedTableIdx = idx;
      }
    });

    if (selectedTableIdx === -1) {
      console.warn('[DOCX] No se detectó tabla de planeación con puntuación >= 4');
      return xml;
    }

    console.log(`[DOCX] Planning table selected: index ${selectedTableIdx}`);

    let tableXml = tables[selectedTableIdx];
    const rows = tableXml.match(/<w:tr[\s\S]*?<\/w:tr>/g);

    if (!rows || rows.length < 2) return xml;

    // Fila base de captura (generalmente la segunda fila)
    let dataRowXml = rows[1];
    
    // Inyectar etiquetas de bucle de Docxtemplater {#sesiones} y {/sesiones}
    // dentro de los nodos <w:t> para preservar el formato OpenXML
    dataRowXml = dataRowXml.replace(/(<w:t[^>]*>)/, '$1{#sesiones}');
    
    const tNodes = dataRowXml.match(/<w:t[^>]*>[\s\S]*?<\/w:t>/g);
    if (tNodes && tNodes.length > 0) {
      const lastT = tNodes[tNodes.length - 1];
      const updatedLastT = lastT.replace(/<\/w:t>$/, '{/sesiones}</w:t>');
      dataRowXml = dataRowXml.split(lastT).join(updatedLastT);
    }

    const updatedTableXml = tableXml.replace(rows[1], dataRowXml);
    return xml.replace(tables[selectedTableIdx], updatedTableXml);
  }
}
