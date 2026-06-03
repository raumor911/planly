import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import PizZip from 'pizzip';
import { DocxPayload, TableMatch, DocxSession } from './modules/docx/types';
import { TemplateInspector } from './modules/docx/inspector';

export interface AuditLog {
  tablesDetected: number;
  tableSelected: number;
  baseRowCells: number;
  imagesBefore: number;
  imagesAfter: number;
  headersPreserved: boolean;
}

export class FidelityTemplateEngine {
  private parser: XMLParser;
  private builder: XMLBuilder;
  private inspector: TemplateInspector;

  constructor() {
    const commonOptions = {
      ignoreAttributes: false,
      preserveOrder: true,
      parseAttributeValue: true,
      trimValues: false,
      attributeNamePrefix: "@_",
    };
    this.parser = new XMLParser(commonOptions);
    this.builder = new XMLBuilder({
      ...commonOptions,
      format: false, // Word prefers compact XML
    });
    this.inspector = new TemplateInspector();
  }

  public async process(zip: PizZip, payload: DocxPayload): Promise<AuditLog> {
    const fileKeys = Object.keys(zip.files);
    const audit: AuditLog = {
      tablesDetected: 0,
      tableSelected: -1,
      baseRowCells: 0,
      imagesBefore: fileKeys.filter(k => k.startsWith('word/media/')).length,
      imagesAfter: 0,
      headersPreserved: fileKeys.some(k => k.startsWith('word/header')),
    };
    
    for (const key of fileKeys) {
      if (key === 'word/document.xml' || key.startsWith('word/header') || key.startsWith('word/footer')) {
        const file = zip.file(key);
        if (!file) continue;
        
        const xml = file.asText();
        // Preserve XML declaration
        const declaration = xml.match(/^<\?xml.*?\?>/)?.[0] || '';
        
        const jsonObj = this.parser.parse(xml);
        
        if (key === 'word/document.xml') {
          // 1. Passive Tagging
          this.autoTagDocumentXml(jsonObj, payload);
          // 2. Table Injection
          this.injectTables(jsonObj, payload, audit);
        } else {
          this.autoTagDocumentXml(jsonObj, payload);
        }

        const updatedXml = declaration + this.builder.build(jsonObj);
        zip.file(key, updatedXml);
      }
    }

    audit.imagesAfter = Object.keys(zip.files).filter(k => k.startsWith('word/media/')).length;
    return audit;
  }

  private autoTagDocumentXml(node: any[], payload: DocxPayload): void {
    if (!node || !Array.isArray(node)) return;

    node.forEach(item => {
      const keys = Object.keys(item);
      keys.forEach(key => {
        if (key === 'w:t') {
          this.applyPassiveReplacement(item[key], payload);
        } else if (typeof item[key] === 'object') {
          this.autoTagDocumentXml(item[key], payload);
        }
      });
    });
  }

  private applyPassiveReplacement(tNode: any, payload: DocxPayload): void {
    const textObj = Array.isArray(tNode) ? tNode.find(item => item['#text'] !== undefined) : tNode;
    if (!textObj || typeof textObj['#text'] !== 'string') return;

    let text = textObj['#text'];

    const dictionary = [
      { regex: /\{materia\}|([Mm]ateria|[Aa]signatura|[Cc]urso)\s*:\s*([_.\-\s]*)$/i, value: payload.course.name },
      { regex: /\{objetivo_general\}|([Oo]bjetivo\s+[Gg]eneral)\s*:\s*([_.\-\s]*)$/i, value: payload.course.generalObjective },
      { regex: /\{clave\}|([Cc]lave|[Cc][oó]digo)\s*:\s*([_.\-\s]*)$/i, value: payload.course.code },
      { regex: /\{docente\}|([Dd]ocente|[Pp]rofesor|[Cc]atedr[aá]tico)\s*:\s*([_.\-\s]*)$/i, value: 'Docente Planly' },
      { regex: /\{ciclo\}|([Cc]iclo|[Pp]eriodo|[Cc]uatrimestre)\s*:\s*([_.\-\s]*)$/i, value: '2026-1' }
    ];

    dictionary.forEach(entry => {
      if (entry.regex.test(text)) {
        if (text.includes('{')) {
          text = text.replace(entry.regex, entry.value || '');
        } else {
          text = text.replace(entry.regex, (_match, p1) => `${p1}: ${entry.value}`);
        }
      }
    });

    textObj['#text'] = text;
  }

  private injectTables(jsonObj: any[], payload: DocxPayload, audit: AuditLog): void {
    const xmlForAnalysis = this.builder.build(jsonObj);
    const analysis = this.inspector.analyzeDocument(xmlForAnalysis);
    audit.tablesDetected = analysis.tables.length;

    const winningMatch = analysis.tables
      .filter(m => m.type === 'sessions' && (m.confidence * 5) >= 4)
      .sort((a, b) => b.confidence - a.confidence)[0];

    if (!winningMatch) return;

    audit.tableSelected = winningMatch.tableIndex;
    const tables = this.findAllNodes(jsonObj, 'w:tbl');
    const targetTable = tables[winningMatch.tableIndex];
    if (!targetTable) return;

    const rows = this.findAllNodes(targetTable, 'w:tr');
    const prototypeRowIdx = winningMatch.headerRowIndex + 1;
    if (prototypeRowIdx >= rows.length) return;

    const prototypeRow = rows[prototypeRowIdx];
    audit.baseRowCells = this.findAllNodes(prototypeRow, 'w:tc').length;

    this.tagLoopMarkers(prototypeRow, winningMatch.roles);

    const newRows = payload.sessions.map(session => {
      const clonedRow = JSON.parse(JSON.stringify(prototypeRow));
      this.fillRowWithSessionData(clonedRow, session, winningMatch.roles);
      return clonedRow;
    });

    this.replaceRowsInTable(targetTable, winningMatch.headerRowIndex, newRows);
  }

  private tagLoopMarkers(row: any, roles: Record<number, string>): void {
    const cells = this.findAllNodes(row, 'w:tc');
    const colIndices = Object.keys(roles).map(Number).sort((a, b) => a - b);
    if (colIndices.length === 0) return;

    if (cells[colIndices[0]]) this.injectMarkerInCell(cells[colIndices[0]], '{#sesiones}');
    if (cells[colIndices[colIndices.length - 1]]) this.injectMarkerInCell(cells[colIndices[colIndices.length - 1]], '{/sesiones}');
  }

  private injectMarkerInCell(cell: any, marker: string): void {
    const tNodes = this.findAllNodes(cell, 'w:t');
    if (tNodes.length > 0) {
      const firstT = tNodes[0];
      const textObj = Array.isArray(firstT) ? firstT.find(i => i['#text'] !== undefined) : firstT;
      if (textObj && typeof textObj['#text'] === 'string') {
        textObj['#text'] = marker + textObj['#text'];
      } else if (textObj && typeof textObj === 'object') {
        textObj['#text'] = marker;
      }
    } else {
      const rNodes = this.findAllNodes(cell, 'w:r');
      if (rNodes.length > 0) {
        const firstR = rNodes[0];
        if (Array.isArray(firstR)) {
          firstR.push({ 'w:t': [{ '#text': marker }] });
        }
      }
    }
  }

  private fillRowWithSessionData(row: any, session: DocxSession, roles: Record<number, string>): void {
    const cells = this.findAllNodes(row, 'w:tc');
    Object.keys(roles).forEach(colIdx => {
      const role = roles[Number(colIdx)];
      const cell = cells[Number(colIdx)];
      if (role && cell) {
        let value = String(session[role as keyof DocxSession] || '');
        value = value.replace(/\{[#/]sesiones\}/g, '');
        this.setCellText(cell, value);
      }
    });
  }

  private setCellText(cell: any, text: string): void {
    const tNodes = this.findAllNodes(cell, 'w:t');
    if (tNodes.length > 0) {
      const firstT = tNodes[0];
      const textObj = Array.isArray(firstT) ? firstT.find(i => i['#text'] !== undefined) : firstT;
      if (textObj) textObj['#text'] = text;
      for (let i = 1; i < tNodes.length; i++) {
        const otherT = tNodes[i];
        const otherTextObj = Array.isArray(otherT) ? otherT.find((i: any) => i['#text'] !== undefined) : otherT;
        if (otherTextObj) otherTextObj['#text'] = '';
      }
    }
  }

  private replaceRowsInTable(tbl: any[], headerIdx: number, newRows: any[]): void {
    const trIndices: number[] = [];
    tbl.forEach((node, idx) => { if (node['w:tr']) trIndices.push(idx); });
    if (trIndices.length === 0) return;

    const rowsToDelete = trIndices.slice(headerIdx + 1).reverse();
    rowsToDelete.forEach(idx => tbl.splice(idx, 1));

    const currentTrIndices: number[] = [];
    tbl.forEach((node, idx) => { if (node['w:tr']) currentTrIndices.push(idx); });

    const insertAt = (currentTrIndices[headerIdx] ?? tbl.length - 1) + 1;
    newRows.forEach((row, i) => tbl.splice(insertAt + i, 0, { 'w:tr': row }));
  }

  private findAllNodes(parent: any, name: string): any[] {
    const results: any[] = [];
    if (!parent) return results;
    if (Array.isArray(parent)) {
      parent.forEach(item => {
        if (item[name]) results.push(item[name]);
        else results.push(...this.findAllNodes(item, name));
      });
    } else if (typeof parent === 'object') {
      Object.keys(parent).forEach(key => {
        if (key === name) results.push(parent[key]);
        else if (typeof parent[key] === 'object') results.push(...this.findAllNodes(parent[key], name));
      });
    }
    return results;
  }
}
