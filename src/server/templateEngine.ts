import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { DocxPayload } from './modules/docx/types';

export function getSessionDate(index: number, startDate: string): string {
  const date = new Date(startDate);
  date.setDate(date.getDate() + (index * 7));
  return date.toISOString().split('T')[0];
}

export class FidelityTemplateEngine {
  public async process(zip: PizZip, payload: DocxPayload): Promise<Buffer> {
    const documentXmlPath = 'word/document.xml';
    let xml = zip.file(documentXmlPath)?.asText();
    
    if (!xml) {
      throw new Error('[FidelityEngine] No se pudo encontrar word/document.xml');
    }

    console.log('[DOCX] Inyectando tags semánticos mediante Regex...');

    // 1. Inyección de Campos Libres (Passive Tagging)
    xml = this.injectPassiveTags(xml, payload);

    // 2. Detección de Tabla de Planeación y Marcado de Bucles
    xml = this.injectLoopTags(xml);

    // Guardar XML modificado antes de Docxtemplater
    zip.file(documentXmlPath, xml);

    // 3. Render Final con Docxtemplater
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    const viewData = {
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
      doc.render(viewData);
    } catch (error: any) {
      console.error('[DOCX] Error renderizando con Docxtemplater:', error);
      throw error;
    }

    return doc.getZip().generate({
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
      // Solo inyectamos el tag si la sección existe pero no tiene el tag de Docxtemplater
      if (entry.regex.test(updatedXml) && !updatedXml.includes(entry.tag)) {
        updatedXml = updatedXml.replace(entry.regex, (match, label) => {
          // Buscamos el cierre de <w:t> más cercano para insertar el tag
          return `${label}: ${entry.tag}`;
        });
      }
    });

    return updatedXml;
  }

  private injectLoopTags(xml: string): string {
    // Si ya tiene los tags, no hacemos nada
    if (xml.includes('{#sesiones}')) return xml;

    // Buscamos tablas que parezcan de planeación por sus encabezados
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

    // Asumimos que la primera fila es header y la segunda es la base de datos
    // Buscamos el primer <w:t> de la segunda fila
    let dataRowXml = rows[1];
    
    // Inyectamos {#sesiones} en el primer <w:t>
    dataRowXml = dataRowXml.replace(/(<w:t[^>]*>)/, '$1{#sesiones}');
    
    // Inyectamos {/sesiones} en el último <w:t>
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
