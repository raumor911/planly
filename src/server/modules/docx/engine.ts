import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import PizZip from 'pizzip';
import { DocxPayload, TableMatch, DocxSession } from './types';
import { TemplateInspector } from './inspector';

export class PreservationEngine {
  private parser: XMLParser;
  private builder: XMLBuilder;
  private inspector: TemplateInspector;

  constructor() {
    const commonOptions = {
      ignoreAttributes: false,
      preserveOrder: true,
      parseAttributeValue: true,
      trimValues: false,
    };
    this.parser = new XMLParser(commonOptions);
    this.builder = new XMLBuilder(commonOptions);
    this.inspector = new TemplateInspector();
  }

  public async process(zip: PizZip, payload: DocxPayload): Promise<PizZip> {
    const fileKeys = Object.keys(zip.files);
    
    // Debug info
    const imagesBefore = fileKeys.filter(k => k.startsWith('word/media/')).length;
    const hasHeadersBefore = fileKeys.some(k => k.startsWith('word/header'));
    const hasFootersBefore = fileKeys.some(k => k.startsWith('word/footer'));

    console.log(`[DOCX] Images before: ${imagesBefore}`);
    console.log(`[DOCX] Headers preserved: ${hasHeadersBefore}`);
    console.log(`[DOCX] Footers preserved: ${hasFootersBefore}`);

    for (const key of fileKeys) {
      if (key === 'word/document.xml' || key.startsWith('word/header') || key.startsWith('word/footer')) {
        const xml = zip.file(key).asText();
        const updatedXml = this.processXml(xml, payload, key === 'word/document.xml');
        zip.file(key, updatedXml);
      }
    }

    const imagesAfter = Object.keys(zip.files).filter(k => k.startsWith('word/media/')).length;
    console.log(`[DOCX] Images after: ${imagesAfter}`);
    console.log(`[DOCX] Output generated successfully`);

    return zip;
  }

  private processXml(xml: string, payload: DocxPayload, isMainDoc: boolean): string {
    const jsonObj = this.parser.parse(xml);
    
    // 1. Process Placeholders
    this.injectPlaceholders(jsonObj, payload);

    // 2. Process Tables (Main doc only for now)
    if (isMainDoc) {
      this.injectTables(jsonObj, payload);
    }

    return this.builder.build(jsonObj);
  }

  /**
   * Identifica placeholders y tablas en un fragmento XML sin mutarlo.
   */
  public inspect(xml: string): { placeholders: string[]; tablesCount: number } {
    const jsonObj = this.parser.parse(xml);
    const placeholders = new Set<string>();
    
    // Función recursiva para buscar tokens
    const findTokens = (node: any) => {
      if (!node) return;
      if (Array.isArray(node)) {
        node.forEach(findTokens);
      } else if (typeof node === 'object') {
        Object.keys(node).forEach(key => {
          if (key === 'w:t') {
            const tContent = this.getTNodeText(node[key]);
            const matches = tContent.match(/\{[^{}]+\}/g);
            if (matches) matches.forEach(m => placeholders.add(m));
          } else {
            findTokens(node[key]);
          }
        });
      }
    };

    findTokens(jsonObj);
    const tables = this.findAllNodes(jsonObj, 'w:tbl');

    return {
      placeholders: Array.from(placeholders),
      tablesCount: tables.length
    };
  }

  private getTNodeText(tNode: any): string {
    if (Array.isArray(tNode)) {
      const textItem = tNode.find(item => item['#text'] !== undefined);
      return textItem ? textItem['#text'] : '';
    } else if (typeof tNode === 'object' && tNode['#text'] !== undefined) {
      return tNode['#text'];
    }
    return typeof tNode === 'string' ? tNode : '';
  }

  private injectPlaceholders(node: any, payload: DocxPayload): void {
    if (!node) return;

    if (Array.isArray(node)) {
      node.forEach(item => this.injectPlaceholders(item, payload));
    } else if (typeof node === 'object') {
      Object.keys(node).forEach(key => {
        if (key === 'w:t') {
          const tNode = node[key];
          if (Array.isArray(tNode)) {
            tNode.forEach(t => this.replaceTextInTNode(t, payload));
          } else {
            this.replaceTextInTNode(tNode, payload);
          }
        } else if (typeof node[key] === 'object') {
          this.injectPlaceholders(node[key], payload);
        }
      });
    }
  }

  private replaceTextInTNode(tNode: any, payload: DocxPayload): void {
    let text = '';
    let targetObj: any = null;

    if (Array.isArray(tNode)) {
      const textItem = tNode.find(item => item['#text'] !== undefined);
      if (textItem) {
        text = textItem['#text'];
        targetObj = textItem;
      }
    } else if (typeof tNode === 'object' && tNode['#text'] !== undefined) {
      text = tNode['#text'];
      targetObj = tNode;
    }

    if (!text || !targetObj || typeof text !== 'string') return;

    // Inyección Semántica: Mapeo de tokens a valores del payload
    // Reemplazo directo sin depender de regex complejas que rompan etiquetas
    const tokens: Record<string, string> = {
      '{{NOMBRE_ASIGNATURA}}': payload.course.name || '',
      '{{OBJETIVO_GENERAL}}': payload.course.generalObjective || '',
      '{{CLAVE}}': payload.course.code || '',
    };

    let updatedText = text;
    for (const [token, value] of Object.entries(tokens)) {
      if (updatedText.includes(token)) {
        updatedText = updatedText.split(token).join(value);
      }
    }
    
    // Heurística de detección de campos vacíos (por ejemplo "Materia: ________")
    const labels = [
      { regex: /([Mm]ateria|[Aa]signatura|[Cc]urso)\s*:\s*([_.\-\s]*)$/i, value: payload.course.name },
      { regex: /([Óó]bjetivo\s+[Gg]eneral|[Cc]ompetencia\s+[Gg]eneral)\s*:\s*([_.\-\s]*)$/i, value: payload.course.generalObjective },
      { regex: /([Cc]lave|[Cc][óo]digo)\s*:\s*([_.\-\s]*)$/i, value: payload.course.code }
    ];

    for (const label of labels) {
      if (label.regex.test(updatedText)) {
        updatedText = updatedText.replace(label.regex, `$1: ${label.value}`);
      }
    }

    targetObj['#text'] = updatedText;
  }

  private injectTables(jsonObj: any, payload: DocxPayload): void {
    const analysis = this.inspector.analyzeDocument(this.builder.build(jsonObj));
    console.log(`[DOCX] Tables detected: ${analysis.tables.length}`);

    const tables = this.findAllNodes(jsonObj, 'w:tbl');

    analysis.tables.forEach((match, mIdx) => {
      console.log(`[DOCX] Planning table selected: index ${match.tableIndex} (Type: ${match.type})`);
      const targetTable = tables[match.tableIndex];
      if (!targetTable) return;

      const rows = this.findAllNodes(targetTable, 'w:tr');
      console.log(`[DOCX] Header row index: ${match.headerRowIndex}`);
      
      const headerRow = rows[match.headerRowIndex];
      const headerCells = this.findAllNodes(headerRow, 'w:t');
      const headerTexts = headerCells.map(h => (typeof h === 'string' ? h : h['#text'] || '')).join(', ');
      console.log(`[DOCX] Headers found: ${headerTexts}`);

      const prototypeRowIdx = match.headerRowIndex + 1 < rows.length ? match.headerRowIndex + 1 : match.headerRowIndex;
      console.log(`[DOCX] Base row index: ${prototypeRowIdx}`);

      const prototypeRow = rows[prototypeRowIdx];

      let newRows: any[] = [];
      if (match.type === 'sessions') {
        console.log(`[DOCX] Sessions received: ${payload.sessions.length}`);
        newRows = payload.sessions.map(session => {
          const clonedRow = JSON.parse(JSON.stringify(prototypeRow));
          this.fillRowWithSessionData(clonedRow, session, match.roles);
          return clonedRow;
        });
        console.log(`[DOCX] Rows inserted: ${newRows.length}`);
      } else if (match.type === 'evaluation') {
        const evalItems = [
          ...payload.evaluation.firstPartial.items,
          ...payload.evaluation.secondPartial.items,
          ...payload.evaluation.final.items,
        ];
        console.log(`[DOCX] Evaluation items received: ${evalItems.length}`);
        newRows = evalItems.map(item => {
          const clonedRow = JSON.parse(JSON.stringify(prototypeRow));
          this.fillRowWithSessionData(clonedRow, { tema: item.name, actividad: `${item.percentage}%` } as any, match.roles);
          return clonedRow;
        });
        console.log(`[DOCX] Evaluation rows inserted: ${newRows.length}`);
      }

      this.replaceRowsInTable(targetTable, match.headerRowIndex, newRows);
    });
  }

  private fillRowWithSessionData(row: any, session: DocxSession, roles: any): void {
    const cells = this.findAllNodes(row, 'w:tc');
    cells.forEach((cell, cIdx) => {
      const role = roles[cIdx];
      if (role) {
        const value = String(session[role as keyof DocxSession] || '');
        this.setCellText(cell, value);
      }
    });
  }

  private setCellText(cell: any, text: string): void {
    const tNodes = this.findAllNodes(cell, 'w:t');
    if (tNodes.length > 0) {
      // Surgery: Keep the first w:t content, replace its text, and clear the others
      const firstTContent = tNodes[0];
      if (Array.isArray(firstTContent)) {
        const textItem = firstTContent.find(item => item['#text'] !== undefined);
        if (textItem) {
          textItem['#text'] = text;
        } else {
          firstTContent.push({ '#text': text });
        }
        
        // Clear subsequent w:t nodes text
        for (let i = 1; i < tNodes.length; i++) {
          if (Array.isArray(tNodes[i])) {
            const otherTextItem = tNodes[i].find((item: any) => item['#text'] !== undefined);
            if (otherTextItem) otherTextItem['#text'] = '';
          }
        }
      }
    } else {
      // If no w:t exists, we find the first w:p -> w:r and add a w:t
      const rNodes = this.findAllNodes(cell, 'w:r');
      if (rNodes.length > 0) {
        const firstRContent = rNodes[0];
        if (Array.isArray(firstRContent)) {
          firstRContent.push({ 'w:t': [{ '#text': text }] });
        }
      }
    }
  }

  private replaceRowsInTable(tbl: any, headerIdx: number, newRows: any[]): void {
    // In preserveOrder: true, tbl is an array of objects
    const trIndices: number[] = [];
    tbl.forEach((node: any, idx: number) => {
      if (node['w:tr']) trIndices.push(idx);
    });

    console.log(`[DOCX] Found ${trIndices.length} total rows in table. Header is at row index ${headerIdx} (XML index ${trIndices[headerIdx]})`);

    if (trIndices.length === 0) return;

    // Delete rows after header
    const rowsToDelete = trIndices.slice(headerIdx + 1).reverse();
    console.log(`[DOCX] Deleting ${rowsToDelete.length} existing rows after header...`);
    rowsToDelete.forEach(idx => {
      tbl.splice(idx, 1);
    });

    // Re-calculate indices after deletion
    const currentTrIndices: number[] = [];
    tbl.forEach((node: any, idx: number) => {
      if (node['w:tr']) currentTrIndices.push(idx);
    });

    // Insert new rows
    const insertAt = (currentTrIndices[headerIdx] ?? tbl.length - 1) + 1;
    console.log(`[DOCX] Inserting ${newRows.length} new rows at XML index ${insertAt}...`);
    
    // We insert in reverse or use splice carefully to maintain order
    for (let i = 0; i < newRows.length; i++) {
      tbl.splice(insertAt + i, 0, { 'w:tr': newRows[i] });
    }
    console.log(`[DOCX] Table rows replacement complete.`);
  }

  private findAllNodes(parent: any, name: string): any[] {
    const results: any[] = [];
    if (!parent) return results;

    if (Array.isArray(parent)) {
      parent.forEach(item => {
        if (item[name]) {
          results.push(item[name]);
        } else {
          results.push(...this.findAllNodes(item, name));
        }
      });
    } else if (typeof parent === 'object') {
      Object.keys(parent).forEach(key => {
        if (key === name) {
          results.push(parent[key]);
        } else if (typeof parent[key] === 'object') {
          results.push(...this.findAllNodes(parent[key], name));
        }
      });
    }
    return results;
  }
}
