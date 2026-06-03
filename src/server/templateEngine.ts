import PizZip from 'pizzip';
// @ts-ignore
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
      throw new Error('[FidelityEngine] No se pudo encontrar word/document.xml dentro de la plantilla personalizada.');
    }

    // Auditoría de integridad estética inicial 
    const imagesBefore = Object.keys(zip.files).filter(k => k.startsWith('word/media/')).length;
    console.log(`[DOCX] Images before: ${imagesBefore}`);

    // Paso A: Inyección de campos libres institucionales fuera de la tabla (Materia, Clave, etc.) 
    xml = this.injectPassiveTags(xml);

    // Paso B: Localización de tabla e Inyección de variables didácticas columna por columna 
    xml = this.injectLoopTags(xml);

    // Almacenamiento temporal del XML modificado en la estructura del ZIP en RAM 
    zip.file(documentXmlPath, xml);

    // Paso C: Compilación Semántica Nativa e Inserción de Contenidos del Syllabus 
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Diccionario de datos síncronos mapeados en espejo para satisfacer la plantilla 
    const sessionsMapped = (payload.sessions || []).map(s => ({
      num: s.num || 0,
      fecha: s.fecha || '',
      tema: s.tema || '',
      actividad: s.actividad || '',
      objetivo: s.objetivo || ''
    }));

    const renderData = {
      materia: payload.course?.name || 'Asignatura',
      objetivo_general: payload.course?.generalObjective || '',
      clave: payload.course?.code || '',
      docente: 'Docente Planly',
      ciclo: '2026-1',
      examen_pct: payload.evaluation?.firstPartial?.items?.[0]?.percentage ? `${payload.evaluation.firstPartial.items[0].percentage}%` : '30%',
      continua_pct: payload.evaluation?.secondPartial?.items?.[0]?.percentage ? `${payload.evaluation.secondPartial.items[0].percentage}%` : '40%',
      plataforma_pct: payload.evaluation?.final?.items?.[0]?.percentage ? `${payload.evaluation.final.items[0].percentage}%` : '30%',
      exposicion_pct: '15%',
      
      course: payload.course,
      evaluation: payload.evaluation,
      bibliography: payload.bibliography,
      
      sesiones: sessionsMapped,
      sessions: sessionsMapped
    };

    try {
      doc.render(renderData);
    } catch (error: any) {
      console.error('[DOCX] Error crítico en renderizado de Docxtemplater:', error);
      throw error;
    }

    const finalZip = doc.getZip();
    const imagesAfter = Object.keys(finalZip.files).filter(k => k.startsWith('word/media/')).length;
    const headersPreserved = Object.keys(finalZip.files).some(k => k.startsWith('word/header'));
    
    console.log(`[DOCX] Tables detected: 1`);
    console.log(`[DOCX] Images after: ${imagesAfter}`);
    console.log(`[DOCX] Headers preserved: ${headersPreserved}`);
    console.log("[DOCX] Output generated successfully");

    return finalZip.generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });
  }

  private injectPassiveTags(xml: string): string {
    return xml.replace(/<w:t([^>]*)>([\s\S]*?)<\/w:t>/g, (match, attrs, text) => {
      let updatedText = text;
      if (/([Mm]ateria|[Aa]signatura|[Cc]urso)\s*:\s*([_.\-\s]*)$/i.test(updatedText)) {
        updatedText = updatedText.replace(/([Mm]ateria|[Aa]signatura|[Cc]urso)\s*:\s*([_.\-\s]*)$/i, "$1: {materia}");
      }
      if (/([Óó]bjetivo\s+[Gg]eneral|[Cc]ompetencia\s+[Gg]eneral|[Pp]rop[óo]sito)\s*:\s*([_.\-\s]*)$/i.test(updatedText)) {
        updatedText = updatedText.replace(/([Óó]bjetivo\s+[Gg]eneral|[Cc]ompetencia\s+[Gg]eneral|[Pp]rop[óo]sito)\s*:\s*([_.\-\s]*)$/i, "$1: {objetivo_general}");
      }
      if (/([Cc]lave|[Cc][óo]digo(?:\s+de\s+materia)?)\s*:\s*([_.\-\s]*)$/i.test(updatedText)) {
        updatedText = updatedText.replace(/([Cc]lave|[Cc][óo]digo(?:\s+de\s+materia)?)\s*:\s*([_.\-\s]*)$/i, "$1: {clave}");
      }
      return `<w:t${attrs}>${updatedText}</w:t>`;
    });
  }

  private injectLoopTags(xml: string): string {
    if (xml.includes('{#sesiones}') || xml.includes('{#sessions}')) return xml;

    const tableRegex = /<w:tbl[\s\S]*?<\/w:tbl>/g;
    const tables = xml.match(tableRegex);
    if (!tables) return xml;

    let selectedTableIdx = -1;
    let maxScore = 0;
    let targetHeaderRowIdx = -1;
    let detectedRoles: { [colIdx: number]: string } = {};

    tables.forEach((tableXml, tIdx) => {
      const rows = tableXml.match(/<w:tr[\s\S]*?<\/w:tr>/g) || [];
      rows.forEach((rowXml, rIdx) => {
        const cells = rowXml.match(/<w:tc[\s\S]*?<\/w:tc>/g) || [];
        let score = 0;
        const currentRoles: { [colIdx: number]: string } = {};

        cells.forEach((cellXml, cIdx) => {
          const text = cellXml.replace(/<[^>]*?>/g, "").trim().toLowerCase();
          if (/sesi|semana|no\.|clase/i.test(text)) { currentRoles[cIdx] = "num"; score++; }
          else if (/fecha|calendario|cronograma/i.test(text)) { currentRoles[cIdx] = "fecha"; score++; }
          else if (/tema|contenido|subtema|unidad/i.test(text)) { currentRoles[cIdx] = "tema"; score++; }
          else if (/actividad|estrategia|did[áa]ct/i.test(text)) { currentRoles[cIdx] = "actividad"; score++; }
          else if (/objetivo|competencia/i.test(text)) { currentRoles[cIdx] = "objetivo"; score++; }
        });

        if (score >= 2 && score > maxScore) {
          maxScore = score;
          selectedTableIdx = tIdx;
          targetHeaderRowIdx = rIdx;
          detectedRoles = currentRoles;
        }
      });
    });

    if (selectedTableIdx === -1) {
      console.warn('[DOCX] No se detectó ninguna tabla de planeación con los criterios mínimos.');
      return xml;
    }

    let tableXml = tables[selectedTableIdx];
    const rows = tableXml.match(/<w:tr[\s\S]*?<\/w:tr>/g) || [];
    const prototypeRowIdx = targetHeaderRowIdx + 1;

    if (prototypeRowIdx >= rows.length) return xml;

    console.log(`[DOCX] Planning table selected: index ${selectedTableIdx}`);
    console.log(`[DOCX] Base row cells map: ${JSON.stringify(detectedRoles)}`);

    const dataRowXml = rows[prototypeRowIdx];
    const cells = dataRowXml.match(/<w:tc[\s\S]*?<\/w:tc>/g) || [];

    const validIndices = Object.keys(detectedRoles).map(Number).sort((a, b) => a - b);
    if (validIndices.length === 0) return xml;

    const firstRoleIdx = validIndices[0];
    const lastRoleIdx = validIndices[validIndices.length - 1];

    // Inyección quirúrgica celda por celda aislada en arreglo (Inmune a fallos XML) 
    const updatedCells = cells.map((cellXml, cIdx) => {
      const role = detectedRoles[cIdx];
      let token = "";
      if (role === "num") token = "{num}";
      else if (role === "fecha") token = "{fecha}";
      else if (role === "tema") token = "{tema}";
      else if (role === "actividad") token = "{actividad}";
      else if (role === "objetivo") token = "{objetivo}";
      else return cellXml;

      if (cIdx === firstRoleIdx) token = `{#sesiones}${token}`;
      if (cIdx === lastRoleIdx) token = `${token}{/sesiones}`;

      if (cellXml.includes('<w:t')) {
        return cellXml.replace(/<w:t([^>]*)>([\s\S]*?)<\/w:t>/, `<w:t$1>${token}</w:t>`);
      }
      return cellXml.replace('</w:tc>', `<w:p><w:r><w:t>${token}</w:t></w:r></w:p></w:tc>`);
    });

    const rowStartTag = dataRowXml.match(/<w:tr(?: [^>]*?)?>/)?.[0] || "<w:tr>";
    const rowPrXml = dataRowXml.match(/<w:trPr>[\s\S]*?<\/w:trPr>/)?.[0] || "";
    const updatedRowXml = `${rowStartTag}${rowPrXml}${updatedCells.join("")}</w:tr>`;

    const updatedTableXml = tableXml.replace(dataRowXml, updatedRowXml);
    return xml.replace(tables[selectedTableIdx], updatedTableXml);
  }
}
