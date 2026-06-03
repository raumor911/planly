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
      // Campos planos para reemplazo directo (Fidelity Mapping)
      materia: payload.course?.name || 'Asignatura',
      objetivo_general: payload.course?.generalObjective || '',
      clave: payload.course?.code || '',
      docente: 'Docente Planly',
      ciclo: '2026-1',
      // Soporte dual para bucles semánticos
      sesiones: sessionsMapped,
      sessions: sessionsMapped,
      // Metadatos de curso estructurados
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
    
    // Auditoría final de integridad binaria
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

    // 1. Barrido de tablas <w:tbl> para localizar la cabecera didáctica
    const tableRegex = /<w:tbl[\s\S]*?<\/w:tbl>/g;
    const allTables = xml.match(tableRegex);
    if (!allTables) return xml;

    const headerMap = [
      { role: 'num', regex: /Sesión|N[o°]|Num/i },
      { role: 'fecha', regex: /Fecha|Día/i },
      { role: 'tema', regex: /Tema|Contenido/i },
      { role: 'actividad', regex: /Actividad|Estrategia|Técnica/i },
      { role: 'objetivo', regex: /Objetivo|Propósito/i }
    ];

    let selectedTableIdx = -1;
    let colRoles: Record<number, string> = {};
    let headerRowXml = '';
    let dataRowXml = '';

    allTables.forEach((tableXml, tIdx) => {
      const rows = tableXml.match(/<w:tr[\s\S]*?<\/w:tr>/g);
      if (!rows || rows.length < 2) return;

      const firstRow = rows[0];
      const cells = firstRow.match(/<w:tc[\s\S]*?<\/w:tc>/g) || [];
      
      let currentTableRoles: Record<number, string> = {};
      let score = 0;

      cells.forEach((cellXml, cIdx) => {
        headerMap.forEach(h => {
          if (h.regex.test(cellXml)) {
            currentTableRoles[cIdx] = h.role;
            score++;
          }
        });
      });

      // UMBRAL ACTUALIZADO: score >= 2 para mayor tolerancia institucional
      if (score >= 2 && score > (Object.keys(colRoles).length)) {
        selectedTableIdx = tIdx;
        colRoles = currentTableRoles;
        headerRowXml = rows[0];
        dataRowXml = rows[1];
      }
    });

    if (selectedTableIdx === -1) {
      console.warn('[DOCX] No se detectó tabla de planeación con puntuación >= 2.');
      return xml;
    }

    console.log(`[DOCX] Planning table selected: index ${selectedTableIdx} with ${Object.keys(colRoles).length} roles.`);

    // 2. Extraer arreglo de celdas de la fila base (dataRowXml)
    const cellRegex = /<w:tc[\s\S]*?<\/w:tc>/g;
    const dataCells = dataRowXml.match(cellRegex) || [];
    if (dataCells.length === 0) return xml;

    // 3. Mapear cada columna inyectando su variable correspondiente ({num}, {fecha}, etc.)
    const colIndices = Object.keys(colRoles).map(Number).sort((a, b) => a - b);
    const firstColIdx = colIndices[0];
    const lastColIdx = colIndices[colIndices.length - 1];

    const updatedCells = dataCells.map((cellXml, cIdx) => {
      const role = colRoles[cIdx];
      let token = role ? `{${role}}` : '';

      // 4. Anteponer {#sesiones} y anexar {/sesiones} perimetralmente
      if (cIdx === firstColIdx) {
        token = `{#sesiones}${token}`;
      }
      if (cIdx === lastColIdx) {
        token = `${token}{/sesiones}`;
      }

      if (!token) return cellXml;

      // Reemplazo quirúrgico únicamente sobre etiquetas nativas de texto <w:t>
      return cellXml.replace(/(<w:t[^>]*>)([\s\S]*?)(<\/w:t>)/, `$1${token}$3`);
    });

    // 5. Reensamblar updatedRowXml e inyectarlo en el documento
    const updatedRowXml = dataRowXml.replace(cellRegex, () => updatedCells.shift() || '');
    const tableXml = allTables[selectedTableIdx];
    const rows = tableXml.match(/<w:tr[\s\S]*?<\/w:tr>/g) || [];
    
    const updatedTableXml = tableXml.replace(rows[1], updatedRowXml);
    return xml.replace(allTables[selectedTableIdx], updatedTableXml);
  }
}
