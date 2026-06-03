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

      // UMBRAL ACTUALIZADO: score >= 2 para mayor tolerancia
      if (score >= 2 && score > maxScore) {
        maxScore = score;
        selectedTableIdx = idx;
      }
    });

    if (selectedTableIdx === -1) {
      console.warn('[DOCX] No se detectó tabla de planeación con puntuación >= 2');
      return xml;
    }

    console.log(`[DOCX] Planning table selected: index ${selectedTableIdx}`);

    let tableXml = tables[selectedTableIdx];
    const rows = tableXml.match(/<w:tr[\s\S]*?<\/w:tr>/g);

    if (!rows || rows.length < 2) return xml;

    const dataRowXml = rows[1];
    
    // 1. Extraer el arreglo estructurado de celdas
    const cells = dataRowXml.match(/<w:tc[\s\S]*?<\/w:tc>/g) || [];
    if (cells.length === 0) return xml;

    // 2. Mapear cada celda de forma aislada depositando marcadores correspondientes
    const updatedCells = cells.map((cellXml, cIdx) => {
      let token = '';
      switch (cIdx) {
        case 0: token = '{num}'; break;
        case 1: token = '{fecha}'; break;
        case 2: token = '{tema}'; break;
        case 3: token = '{actividad}'; break;
        default: token = '{objetivo}'; break;
      }

      // Envolver perimetralmente los extremos con {#sesiones} y {/sesiones}
      if (cIdx === 0) {
        token = `{#sesiones}${token}`;
      }
      if (cIdx === cells.length - 1) {
        token = `${token}{/sesiones}`;
      }

      // Reemplazar únicamente el contenido de <w:t> sin alterar propiedades de la celda
      return cellXml.replace(/(<w:t[^>]*>)([\s\S]*?)(<\/w:t>)/, `$1${token}$3`);
    });

    // 3. Reensamblar updatedRowXml e inyectarlo de vuelta
    const updatedRowXml = dataRowXml.replace(/<w:tc[\s\S]*?<\/w:tc>/g, () => updatedCells.shift() || '');
    
    const updatedTableXml = tableXml.replace(rows[1], updatedRowXml);
    return xml.replace(tables[selectedTableIdx], updatedTableXml);
  }
}
