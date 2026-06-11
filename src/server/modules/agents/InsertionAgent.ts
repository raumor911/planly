import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import PizZip from 'pizzip';
import { DocxPayload, DocxSession } from '../docx/types';
import { TemplateInspector } from '../docx/inspector';

export class InsertionAgent {
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

  /**
   * P2: Sanitizador de Tag Splitting
   * Une fragmentos de placeholders que Word rompió con etiquetas de corrección u otros nodos.
   */
  public sanitizeTagSplitting(xml: string): string {
    let cleaned = xml;
    
    const applyReplacement = (pattern: RegExp, replacement: string): void => {
      cleaned = cleaned.replace(pattern, replacement);
    };
    
    // 1. Unir llaves iniciales split: { ... {  -> {{
    applyReplacement(/\{<\/w:t>(?:<[^>]+>|\s)*<w:t>\{/g, '{{');
    
    // 2. Unir llaves finales split: } ... } -> }}
    applyReplacement(/\}<\/w:t>(?:<[^>]+>|\s)*<w:t>\}/g, '}}');
    
    // 3. Unir contenido de placeholders split: {{ ... tema ... }}
    let prev = '';
    do {
      prev = cleaned;
      applyReplacement(/(\{\{[^{}]*)<\/w:t>(?:<[^>]+>|\s)*<w:t>([^{}]*\}\})/g, '$1$2');
      applyReplacement(/(\{\{[^{}]*)<\/w:t>(?:<[^>]+>|\s)*<w:t>([^{}]*)<\/w:t>(?:<[^>]+>|\s)*<w:t>/g, '$1$2');
    } while (cleaned !== prev);

    return cleaned;
  }

  /**
   * C2: Escapado XML Estricto
   */
  public escapeXml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Normaliza el texto para asegurar compatibilidad con DOCX
   */
  public normalizeDocxText(text: string): string {
    return this.escapeXml(String(text || ''));
  }

  /**
   * Inspecciona el XML para extraer información técnica básica
   */
  public inspect(xml: string): { placeholders: string[], tablesCount: number } {
    const sanitized = this.sanitizeTagSplitting(xml);
    const jsonObj = this.parser.parse(sanitized);
    
    const tNodes = this.findAllNodes(jsonObj, 'w:t');
    const placeholders: string[] = [];
    tNodes.forEach(t => {
      let text = '';
      if (typeof t === 'string') text = t;
      else if (Array.isArray(t)) {
        const textItem = t.find(item => item['#text'] !== undefined);
        text = textItem ? String(textItem['#text']) : '';
      }
      const matches = text.match(/\{\{[^{}]+\}\}/g);
      if (matches) placeholders.push(...matches);
    });

    const tables = this.findAllNodes(jsonObj, 'w:tbl');
    
    return {
      placeholders: Array.from(new Set(placeholders)),
      tablesCount: tables.length
    };
  }

  /**
   * Método principal de compilación e inyección
   */
  public compile(templateBuffer: Buffer, payload: any): Buffer {
    console.log("[DEBUG] Payload recibido en InsertionAgent:", JSON.stringify(payload, null, 2));
    const zip = new PizZip(templateBuffer);
    const fileKeys = Object.keys(zip.files);

    for (const key of fileKeys) {
      if (key === 'word/document.xml' || key.startsWith('word/header') || key.startsWith('word/footer')) {
        const xml = zip.file(key).asText();
        const updatedXml = this.processXml(xml, payload, key === 'word/document.xml');
        zip.file(key, updatedXml);
      }
    }

    return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  private processXml(xml: string, payload: any, isMainDoc: boolean): string {
    const sanitizedXml = this.sanitizeTagSplitting(xml);
    const jsonObj = this.parser.parse(sanitizedXml);
    
    // Normalización defensiva: Si recibimos solo el array de sesiones, creamos un payload mínimo
    const finalPayload: DocxPayload = Array.isArray(payload) 
      ? { 
          sessions: payload, 
          course: { name: '', code: '', generalObjective: '' }, 
          bibliography: [], 
          evaluation: { 
            firstPartial: { period: '', items: [] }, 
            secondPartial: { period: '', items: [] }, 
            final: { period: '', items: [] } 
          } 
        }
      : payload;

    // 1. Inyectar placeholders simples
    this.injectPlaceholders(jsonObj, finalPayload);

    // 2. Inyectar tablas (Solo en documento principal)
    if (isMainDoc) {
      this.injectTables(jsonObj, finalPayload);
    }

    const result = this.builder.build(jsonObj);
    
    // C3: Corrección Quirúrgica de Cabecera XML (OpenXML Expert)
    const validHeader = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    let cleanXml = result;
    cleanXml = cleanXml.replace(/<\?xml.*\?>/i, validHeader);
    if (!cleanXml.trim().startsWith('<?xml')) {
        cleanXml = validHeader + cleanXml;
    }
    
    return cleanXml;
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
    let targetObj: any = null;

    if (Array.isArray(tNode)) {
      targetObj = tNode.find(item => item['#text'] !== undefined);
    } else if (typeof tNode === 'object' && tNode['#text'] !== undefined) {
      targetObj = tNode;
    }

    if (!targetObj || typeof targetObj['#text'] !== 'string') return;

    let text = targetObj['#text'];
    const tokens: Record<string, string> = {
      '{{NOMBRE_ASIGNATURA}}': payload.course.name || '',
      '{{MATERIA}}': payload.course.name || '',
      '{{ASIGNATURA}}': payload.course.name || '',
      '{{OBJETIVO_GENERAL}}': payload.course.generalObjective || '',
      '{{OBJETIVO}}': payload.course.generalObjective || '',
      '{{FINES_APRENDIZAJE}}': payload.course.generalObjective || '',
      '{{CLAVE}}': payload.course.code || '',
      '{{CODIGO}}': payload.course.code || '',
      // Tokens adicionales basados en el screenshot institucional
      '{{PROFESOR}}': (payload as any).professor || '',
      '{{NOMBRE_PROFESOR}}': (payload as any).professor || '',
      '{{PERIODO}}': (payload as any).period || '26-3',
      '{{CICLO}}': (payload as any).period || '26-3',
      '{{GRUPO}}': (payload as any).group || '',
      '{{CUATRIMESTRE}}': (payload as any).term || '',
      '{{HORARIO}}': (payload as any).schedule || '',
      '{{TURNO}}': (payload as any).shift || '',
      '{{TOTAL_SESIONES}}': String(payload.sessions.length),
    };

    const upperText = text.toUpperCase();
    for (const [token, value] of Object.entries(tokens)) {
      // Crear regex flexible que permita espacios opcionales: {{ tema }} o {{tema}}
      const escapedToken = token
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\\\{\\\{/g, '\\{\\{\\s*')
        .replace(/\\\}\\\}/g, '\\s*\\}\\}');
      
      const regex = new RegExp(escapedToken, 'gi');
      if (regex.test(text)) {
        console.log(`[InsertionAgent] Replacing placeholder ${token} with ${value.substring(0, 20)}...`);
        text = text.replace(regex, this.normalizeDocxText(value));
      }
    }
    
    targetObj['#text'] = text;
  }

  private injectTables(jsonObj: any, payload: DocxPayload): void {
    const xmlContent = this.builder.build(jsonObj);
    const analysis = this.inspector.analyzeDocument(xmlContent);
    const tables = this.findAllNodes(jsonObj, 'w:tbl');

    // Validación de fila molde (OpenXML Expert)
    const rowRegex = /(<w:tr\b[^>]*>[\s\S]*?\{\{\s*tema\s*\}\}[\s\S]*?<\/w:tr>)/i;
    const match = xmlContent.match(rowRegex);
    console.log(`[DOCX] Template row found: ${!!match}`);
    if (match) {
      console.log("[InsertionAgent] Inyectando en fila:", match[0].substring(0, 50));
    }

    analysis.tables.forEach((match, tMatchIdx) => {
      console.log(`[InsertionAgent] Processing table match ${tMatchIdx + 1}: type=${match.type}, confidence=${match.confidence}`);
      const targetTable = tables[match.tableIndex];
      if (!targetTable) {
        console.warn(`[InsertionAgent] Table at index ${match.tableIndex} not found in jsonObj`);
        return;
      }

      const rows = this.findAllNodes(targetTable, 'w:tr');
      console.log(`[InsertionAgent] Table has ${rows.length} rows. Header at ${match.headerRowIndex}`);
      const prototypeRowIdx = match.headerRowIndex + 1 < rows.length ? match.headerRowIndex + 1 : match.headerRowIndex;
      const prototypeRow = rows[prototypeRowIdx];

      let newRows: any[] = [];
      if (match.type === 'sessions') {
        console.log(`[InsertionAgent] Injecting ${payload.sessions.length} sessions`);
        newRows = payload.sessions.map(session => {
          const clonedRow = JSON.parse(JSON.stringify(prototypeRow));
          this.fillRowWithSessionData(clonedRow, session, match.roles);
          return clonedRow;
        });
      } else if (match.type === 'evaluation') {
        const evalItems = [
          ...payload.evaluation.firstPartial.items,
          ...payload.evaluation.secondPartial.items,
          ...payload.evaluation.final.items,
        ];
        console.log(`[InsertionAgent] Injecting ${evalItems.length} evaluation items`);
        newRows = evalItems.map(item => {
          const clonedRow = JSON.parse(JSON.stringify(prototypeRow));
          this.fillRowWithSessionData(clonedRow, { tema: item.name, actividad: `${item.percentage}%` } as any, match.roles);
          return clonedRow;
        });
      }

      if (newRows.length > 0) {
        this.replaceRowsInTable(targetTable, match.headerRowIndex, newRows);
        console.log(`[InsertionAgent] Successfully replaced rows in table ${tMatchIdx + 1}`);
      }
    });
  }

  private fillRowWithSessionData(row: any, session: DocxSession, roles: any): void {
    const cells = this.findAllNodes(row, 'w:tc');
    cells.forEach((cell, cIdx) => {
      const role = roles[cIdx];
      if (role) {
        const value = String(session[role as keyof DocxSession] || '');
        this.setCellText(cell, this.normalizeDocxText(value));
      }
    });
  }

  private setCellText(cell: any, escapedText: string): void {
    const tNodes = this.findAllNodes(cell, 'w:t');
    if (tNodes.length > 0) {
      // Usar el primer nodo w:t para inyectar el texto
      const firstTContent = tNodes[0];
      if (Array.isArray(firstTContent)) {
        const textItem = firstTContent.find(item => item['#text'] !== undefined);
        if (textItem) {
          textItem['#text'] = escapedText;
        } else {
          firstTContent.push({ '#text': escapedText });
        }
        
        // Limpiar otros nodos de texto en la misma celda para evitar duplicados
        for (let i = 1; i < tNodes.length; i++) {
          const otherT = tNodes[i];
          if (Array.isArray(otherT)) {
            const item = otherT.find((it: any) => it['#text'] !== undefined);
            if (item) item['#text'] = '';
          }
        }
      }
    } else {
      // Si no hay w:t, intentamos encontrar un w:p para insertar uno
      const pNodes = this.findAllNodes(cell, 'w:p');
      if (pNodes.length > 0) {
        const p = pNodes[0]; // El contenido del primer párrafo
        if (Array.isArray(p)) {
          p.push({
            'w:r': [
              { 'w:t': [{ '#text': escapedText }] }
            ]
          });
        }
      }
    }
  }

  private replaceRowsInTable(tbl: any, headerIdx: number, newRows: any[]): void {
    const trIndices: number[] = [];
    tbl.forEach((node: any, idx: number) => {
      if (node['w:tr']) trIndices.push(idx);
    });

    if (trIndices.length === 0) return;

    // Eliminar filas después del header
    const rowsToDelete = trIndices.slice(headerIdx + 1).reverse();
    rowsToDelete.forEach(idx => tbl.splice(idx, 1));

    // Insertar nuevas
    const currentTrIndices: number[] = [];
    tbl.forEach((node: any, idx: number) => {
      if (node['w:tr']) currentTrIndices.push(idx);
    });

    const insertAt = (currentTrIndices[headerIdx] ?? tbl.length - 1) + 1;
    for (let i = 0; i < newRows.length; i++) {
      tbl.splice(insertAt + i, 0, { 'w:tr': newRows[i] });
    }
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
