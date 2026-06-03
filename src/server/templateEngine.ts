import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import PizZip from 'pizzip';
import { DocxPayload, TableMatch, DocxSession } from './types';
import { TemplateInspector } from './inspector';

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
    };
    this.parser = new XMLParser(commonOptions);
    this.builder = new XMLBuilder(commonOptions);
    this.inspector = new TemplateInspector();
  }

  public async process(zip: PizZip, payload: DocxPayload): Promise<PizZip> {
    const fileKeys = Object.keys(zip.files);
    
    // Audit Logs - Before
    const imagesBefore = fileKeys.filter(k => k.startsWith('word/media/')).length;
    const hasHeadersBefore = fileKeys.some(k => k.startsWith('word/header'));
    
    // In-memory process
    for (const key of fileKeys) {
      if (key === 'word/document.xml' || key.startsWith('word/header') || key.startsWith('word/footer')) {
        const xml = zip.file(key).asText();
        const updatedXml = this.processXml(xml, payload, key === 'word/document.xml');
        zip.file(key, updatedXml);
      }
    }

    // Audit Logs - After
    const imagesAfter = Object.keys(zip.files).filter(k => k.startsWith('word/media/')).length;
    
    // Final Audit Output
    // These will be called from server.ts to match the specific audit format requested
    return zip;
  }

  private processXml(xml: string, payload: DocxPayload, isMainDoc: boolean): string {
    const jsonObj = this.parser.parse(xml);
    
    // 1. Passive Tagging (Firewall de Fidelidad Visual)
    this.autoTagDocumentXml(jsonObj, payload);

    // 2. Matrix Scoring & Table Injection
    if (isMainDoc) {
      this.injectTables(jsonObj, payload);
    }

    return this.builder.build(jsonObj);
  }

  private autoTagDocumentXml(node: any, payload: DocxPayload): void {
    if (!node) return;

    if (Array.isArray(node)) {
      node.forEach(item => this.autoTagDocumentXml(item, payload));
    } else if (typeof node === 'object') {
      Object.keys(node).forEach(key => {
        if (key === 'w:t') {
          const tNode = node[key];
          if (Array.isArray(tNode)) {
            tNode.forEach(t => this.applyPassiveReplacement(t, payload));
          } else {
            this.applyPassiveReplacement(tNode, payload);
          }
        } else if (typeof node[key] === 'object') {
          this.autoTagDocumentXml(node[key], payload);
        }
      });
    }
  }

  private applyPassiveReplacement(tNode: any, payload: DocxPayload): void {
    let textObj: any = null;
    if (Array.isArray(tNode)) {
      textObj = tNode.find(item => item['#text'] !== undefined);
    } else if (typeof tNode === 'object' && tNode['#text'] !== undefined) {
      textObj = tNode;
    }

    if (!textObj || typeof textObj['#text'] !== 'string') return;

    let text = textObj['#text'];

    // Dictionary of synonyms and markers
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
          // Placeholder direct replacement
          text = text.replace(entry.regex, entry.value || '');
        } else {
          // Passive heuristic replacement (keeping the label)
          text = text.replace(entry.regex, (match, p1) => `${p1}: ${entry.value}`);
        }
      }
    });

    textObj['#text'] = text;
  }

  private injectTables(jsonObj: any, payload: DocxPayload): void {
    const analysis = this.inspector.analyzeDocument(this.builder.build(jsonObj));
    const tables = this.findAllNodes(jsonObj, 'w:tbl');

    // Implementation of Matrix Scoring Algorithm (Matches >= 4)
    const winningMatch = analysis.tables
      .filter(m => m.type === 'sessions' && m.confidence * 5 >= 4) // Confidence is count/5
      .sort((a, b) => b.confidence - a.confidence)[0];

    if (!winningMatch) {
      console.warn('[DOCX] No planning table found with matrix score >= 4');
      return;
    }

    console.log(`[DOCX] Planning table selected: index ${winningMatch.tableIndex}`);
    const targetTable = tables[winningMatch.tableIndex];
    if (!targetTable) return;

    const rows = this.findAllNodes(targetTable, 'w:tr');
    const prototypeRowIdx = winningMatch.headerRowIndex + 1;
    const prototypeRow = rows[prototypeRowIdx];

    if (!prototypeRow) return;

    // Tag loop markers strictly within native <w:t> nodes
    this.tagLoopMarkers(prototypeRow, winningMatch.roles);

    const newRows = payload.sessions.map(session => {
      const clonedRow = JSON.parse(JSON.stringify(prototypeRow));
      this.fillRowWithSessionData(clonedRow, session, winningMatch.roles);
      return clonedRow;
    });

    this.replaceRowsInTable(targetTable, winningMatch.headerRowIndex, newRows);
  }

  private tagLoopMarkers(row: any, roles: any): void {
    const cells = this.findAllNodes(row, 'w:tc');
    const colIndices = Object.keys(roles).map(Number).sort((a, b) => a - b);
    
    if (colIndices.length === 0) return;

    const firstColIdx = colIndices[0];
    const lastColIdx = colIndices[colIndices.length - 1];

    // Inject markers inside w:t
    this.injectMarkerInCell(cells[firstColIdx], '{#sesiones}');
    this.injectMarkerInCell(cells[lastColIdx], '{/sesiones}');
  }

  private injectMarkerInCell(cell: any, marker: string): void {
    const tNodes = this.findAllNodes(cell, 'w:t');
    if (tNodes.length > 0) {
      const firstT = tNodes[0];
      const textObj = Array.isArray(firstT) ? firstT.find(i => i['#text'] !== undefined) : firstT;
      if (textObj && typeof textObj['#text'] === 'string') {
        textObj['#text'] = marker + textObj['#text'];
      }
    }
  }

  private fillRowWithSessionData(row: any, session: DocxSession, roles: any): void {
    const cells = this.findAllNodes(row, 'w:tc');
    Object.keys(roles).forEach(colIdx => {
      const role = roles[Number(colIdx)];
      const cell = cells[Number(colIdx)];
      if (role && cell) {
        let value = String(session[role as keyof DocxSession] || '');
        // Remove markers if present in the value (they are only for template structure)
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
      if (textObj) {
        textObj['#text'] = text;
      }
      // Clear others
      for (let i = 1; i < tNodes.length; i++) {
        const otherT = tNodes[i];
        const otherTextObj = Array.isArray(otherT) ? otherT.find(i => i['#text'] !== undefined) : otherT;
        if (otherTextObj) otherTextObj['#text'] = '';
      }
    }
  }

  private replaceRowsInTable(tbl: any, headerIdx: number, newRows: any[]): void {
    const trIndices: number[] = [];
    tbl.forEach((node: any, idx: number) => {
      if (node['w:tr']) trIndices.push(idx);
    });

    if (trIndices.length === 0) return;

    // Delete rows after header
    const rowsToDelete = trIndices.slice(headerIdx + 1).reverse();
    rowsToDelete.forEach(idx => tbl.splice(idx, 1));

    // Re-calculate and Insert
    const currentTrIndices: number[] = [];
    tbl.forEach((node: any, idx: number) => {
      if (node['w:tr']) currentTrIndices.push(idx);
    });

    const insertAt = (currentTrIndices[headerIdx] ?? tbl.length - 1) + 1;
    newRows.forEach((row, i) => {
      tbl.splice(insertAt + i, 0, { 'w:tr': row });
    });
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
