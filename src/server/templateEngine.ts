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

    // 1. Inyección de Campos Libres (Passive Tagging) mediante Regex sobre <w:t>
    xml = this.injectPassiveTags(xml, payload);

    // 2. Detección de Tabla por barrido de filas y Marcado de Bucles
    xml = this.injectLoopTags(xml);

    // Guardar XML modificado en el ZIP
    zip.file(documentXmlPath, xml);

    // 3. Render Final con Docxtemplater
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Mapeo de datos dual (soporta sesiones y sessions, campos planos y estructurados)
    const sessionsMapped = (payload.sessions || []).map(s => ({
      num: s.num || 0,
      fecha: s.fecha || '',
      tema: s.tema || '',
      actividad: s.actividad || '',
      objetivo: s.objetivo || ''
    }));

    const renderData = {
      // Campos planos para reemplazo directo
      materia: payload.course?.name || 'Asignatura',
      objetivo_general: payload.course?.generalObjective || '',
      clave: payload.course?.code || '',
      docente: 'Docente Planly',
      ciclo: '2026-1',
      // Soporte dual para bucles
      sesiones: sessionsMapped,
      sessions: sessionsMapped,
      // Metadatos de curso
      course: {
        name: payload.course?.name || '',
        code: payload.course?.code || '',
        generalObjective: payload.course?.generalObjective || ''
      }
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

    // Reemplazo seguro únicamente dentro del texto plano de los tags <w:t>
    return xml.replace(/(<w:t[^>]*>)([\s\S]*?)(<\/w:t>)/g, (match, openTag, text, closeTag) => {
      let updatedText = text;
      dictionary.forEach(entry => {
        if (entry.regex.test(updatedText) && !updatedText.includes(entry.tag)) {
          updatedText = updatedText.replace(entry.regex, (m: string, label: string) => `${label}: ${entry.tag}`);
        }
      });
      return `${openTag}${updatedText}${closeTag}`;
    });
  }

  private injectLoopTags(xml: string): string {
    if (xml.includes('{#sesiones}')) return xml;

    // 1. Barrido de filas <w:tr> para localizar la cabecera didáctica
    const rowRegex = /<w:tr[\s\S]*?<\/w:tr>/g;
    const allRows = xml.match(rowRegex);
    if (!allRows) return xml;

    const sessionHeaders = ['Sesión', 'Fecha', 'Tema', 'Actividades', 'Objetivo', 'Recursos'];
    let headerRowIdx = -1;

    for (let i = 0; i < allRows.length; i++) {
      let score = 0;
      sessionHeaders.forEach(h => {
        if (new RegExp(h, 'i').test(allRows[i])) score++;
      });

      if (score >= 2) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx === -1 || headerRowIdx + 1 >= allRows.length) {
      console.warn('[DOCX] No se detectó tabla de planeación mediante barrido de filas.');
      return xml;
    }

    console.log(`[DOCX] Planning header row found at index ${headerRowIdx}`);

    // 2. Extraer la fila base (contigua inferior) y sus celdas
    const dataRowXml = allRows[headerRowIdx + 1];
    const cellRegex = /<w:tc[\s\S]*?<\/w:tc>/g;
    const cells = dataRowXml.match(cellRegex) || [];

    if (cells.length === 0) return xml;

    // 3. Mapear cada columna inyectando su variable correspondiente
    const updatedCells = cells.map((cellXml, cIdx) => {
      let token = '';
      switch (cIdx) {
        case 0: token = '{num}'; break;
        case 1: token = '{fecha}'; break;
        case 2: token = '{tema}'; break;
        case 3: token = '{actividad}'; break;
        default: token = '{objetivo}'; break;
      }

      // 4. Anteponer {#sesiones} y anexar {/sesiones} perimetralmente dentro de <w:t>
      if (cIdx === 0) {
        token = `{#sesiones}${token}`;
      }
      if (cIdx === cells.length - 1) {
        token = `${token}{/sesiones}`;
      }

      // Reemplazo limpio intracelda pura sobre el tag <w:t>
      return cellXml.replace(/(<w:t[^>]*>)([\s\S]*?)(<\/w:t>)/, `$1${token}$3`);
    });

    // 5. Reensamblar updatedRowXml e inyectarlo en el documento
    const updatedRowXml = dataRowXml.replace(cellRegex, () => updatedCells.shift() || '');
    return xml.replace(allRows[headerRowIdx + 1], updatedRowXml);
  }
}
