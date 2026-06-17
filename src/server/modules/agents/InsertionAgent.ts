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
   * C2: Escapado XML Estricto y manejo de saltos de línea
   */
  public escapeXml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .replace(/\n/g, '<w:br/>'); // Convertir saltos de línea a etiquetas Word
  }

  /**
   * Normaliza el texto para asegurar compatibilidad con DOCX
   */
  public normalizeDocxText(text: string): string {
    return this.escapeXml(String(text || ''));
  }

  /**
   * Resuelve el valor de una celda basado en su rol semántico
   */
  private resolveCellValue(session: DocxSession, role: string): string {
    switch (role) {
      case 'num':
        return String(session.num || '');
      case 'date':
        return session.date || '';
      case 'dateReal':
        return session.dateReal || '';
      case 'unit':
        return session.unit || '';
      case 'week':
        return session.week || '';
      case 'objective':
        return session.objective || '';
      case 'topic':
        let topicText = session.topic || '';
        if (session.subtopics && session.subtopics.length > 0) {
          topicText += '\n' + session.subtopics.map(s => `• ${s}`).join('\n');
        }
        return topicText;
      case 'content':
        return session.content || '';
      case 'activity':
      case 'actividad':
      case 'ACTIVIDADES':
        if (session.activities && session.activities.length > 0) {
          // SEPARACIÓN ESTRICTA: Solo descripción y estrategia
          return session.activities.map((a, i) => `${session.activities!.length > 1 ? (i + 1) + '. ' : ''}${a.description}${a.strategy ? ' (' + a.strategy + ')' : ''}`).join('\n');
        }
        return session.activity || session.strategy || '';
      case 'resources':
      case 'recursos':
      case 'RECURSOS':
      case 'didacticResources':
        // SEPARACIÓN ESTRICTA: Solo HERRAMIENTAS
        if (session.didacticResources && session.didacticResources.length > 0) {
          return Array.from(new Set(session.didacticResources)).join(', ');
        }
        if (session.activities && session.activities.length > 0) {
          const tools = session.activities.flatMap(a => a.resources || []);
          if (tools.length > 0) return Array.from(new Set(tools)).join(', ');
        }
        return session.resources || '';
      case 'evidence':
        return session.evidence || '';
      case 'evaluation':
        return session.evaluation || '';
      case 'bibliography':
        return session.bibliography || '';
      case 'notes':
        return session.notes || '';
      default:
        return '';
    }
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
   * Método principal de compilación e inyección (v2 - Motor Universal)
   */
  public compile(
    templateBuffer: Buffer, 
    payload: any, 
    mapping: { mode: 'A' | 'B' | 'C', columns?: Record<number, string> } = { mode: 'A' }
  ): Buffer {
    const zip = new PizZip(templateBuffer);
    let xml = zip.file("word/document.xml")?.asText() || "";

    // Normalización defensiva del payload
    const docxPayload: DocxPayload = Array.isArray(payload) 
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

    const sesiones = docxPayload.sessions || [];

    // SANEAMIENTO: Elimina etiquetas de formato dentro de los {{ placeholders }}
    xml = xml.replace(/\{\{([\s\S]*?)\}\}/g, (match, content) => {
        const clean = content.replace(/<\/?w:[a-z]+[^>]*>/g, "").replace(/\s+/g, "");
        return `{{${clean}}}`;
    });

    if (mapping.mode === 'A') {
      // MODO A: Búsqueda tolerante de fila molde con {{tema}}
      const rowMatch = xml.match(/(<w:tr\b[^>]*>[\s\S]*?\{\{tema\}\}[\s\S]*?<\/w:tr>)/i);
      
      if (!rowMatch) {
          console.error("[InsertionAgent] CRÍTICO: No se encontró la fila con {{tema}}.");
          return this.legacyCompile(templateBuffer, docxPayload);
      }

      const rowTemplate = rowMatch[1];
      let generatedRowsXml = "";

      // Generación de filas
      for (const session of sesiones) {
          let row = rowTemplate;
          const replacements = {
              num: session.num || "",
              tema: session.topic || (session as any).tema || "",
              topic: session.topic || (session as any).tema || "",
              actividad: this.resolveCellValue(session, 'activity'),
              activity: this.resolveCellValue(session, 'activity'),
              ACTIVIDADES: this.resolveCellValue(session, 'ACTIVIDADES'),
              objetivo: session.objective || (session as any).objetivo || "",
              objective: session.objective || (session as any).objetivo || "",
              recursos: this.resolveCellValue(session, 'resources'),
              resources: this.resolveCellValue(session, 'resources'),
              RECURSOS: this.resolveCellValue(session, 'RECURSOS'),
              RECURSOS_DIDACTICOS: this.resolveCellValue(session, 'RECURSOS'),
              DIDACTIC_RESOURCES: this.resolveCellValue(session, 'RECURSOS')
          };

          for (const [key, val] of Object.entries(replacements)) {
              row = row.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), () => this.escapeXml(String(val)));
          }
          generatedRowsXml += row;
      }

      xml = xml.replace(rowTemplate, () => generatedRowsXml);
      
      // Inyectar placeholders de curso (fuera de la tabla)
      const courseInfo = (docxPayload.course || {}) as any;
      const courseReplacements: Record<string, string> = {
        'NOMBRE_ASIGNATURA': courseInfo.name || "",
        'OBJETIVO_GENERAL': courseInfo.generalObjective || "",
        'CLAVE': courseInfo.code || "",
        'TOTAL_SESIONES': String(sesiones.length),
        'SESIONES_TOTALES': String(sesiones.length),
        'SESIONES_POR_CUATRIMESTRE': String(sesiones.length),
        'SESIONES_POR_SEMESTRE': String(sesiones.length),
        'SESIONES_POR_CICLO': String(sesiones.length),
      };

      for (const [key, val] of Object.entries(courseReplacements)) {
        xml = xml.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), this.escapeXml(String(val)));
      }

      zip.file("word/document.xml", xml);
      return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
    } else {
      // MODO B/C: Usar lógica de mapeo semántico (Legacy/Mejorado)
      return this.legacyCompile(templateBuffer, docxPayload, mapping);
    }
  }

  /**
   * Mantiene la lógica original para compatibilidad y modos complejos
   */
  private legacyCompile(
    templateBuffer: Buffer, 
    payload: any, 
    mapping?: { mode: 'A' | 'B' | 'C', columns?: Record<number, string> }
  ): Buffer {
    const zip = new PizZip(templateBuffer);
    const fileKeys = Object.keys(zip.files);

    for (const key of fileKeys) {
      if (key === 'word/document.xml' || key.startsWith('word/header') || key.startsWith('word/footer')) {
        const xml = zip.file(key).asText();
        const updatedXml = this.processXml(xml, payload, key === 'word/document.xml', mapping);
        zip.file(key, updatedXml);
      }
    }

    return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  private processXml(
    xml: string, 
    payload: any, 
    isMainDoc: boolean,
    mapping?: { mode: 'A' | 'B' | 'C', columns?: Record<number, string> }
  ): string {
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
      this.injectTables(jsonObj, finalPayload, mapping);
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
      '{{SESIONES_TOTALES}}': String(payload.sessions.length),
      '{{SESIONES_POR_CUATRIMESTRE}}': String(payload.sessions.length),
      '{{SESIONES_POR_SEMESTRE}}': String(payload.sessions.length),
      '{{SESIONES_POR_CICLO}}': String(payload.sessions.length),
      '{{EVALUACION}}': (payload as any).evaluationCriteriaText || '',
      '{{CRITERIOS_EVALUACION}}': (payload as any).evaluationCriteriaText || '',
    };

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

  private injectTables(
    jsonObj: any, 
    payload: DocxPayload,
    mapping?: { mode: 'A' | 'B' | 'C', columns?: Record<number, string> }
  ): void {
    const xmlContent = this.builder.build(jsonObj);
    const tables = this.findAllNodes(jsonObj, 'w:tbl');

    let tableMatches: any[] = [];

    // Si recibimos un mapping externo (vía Orchestrator/TemplateScanner), lo priorizamos
    if (mapping && mapping.mode === 'B' && mapping.columns) {
      console.log(`[InsertionAgent] Usando mapping externo (Modo B) con ${Object.keys(mapping.columns).length} columnas.`);
      
      // Intentamos encontrar la tabla basándonos en el mapping
      // Como el mapping viene de TemplateScanner, y TemplateScanner busca la mejor tabla,
      // aquí deberíamos saber a qué tabla se refiere.
      // Pero TemplateScanner solo devuelve el índice de la tabla en el XML.
      
      // Para simplificar, si hay un mapping, lo aplicamos a la tabla detectada por el inspector
      // o usamos el índice proporcionado por el scanner si pudiéramos (pero mapping no lo trae).
      
      // Mejor: Si hay mapping, lo usamos para complementar el análisis del inspector.
      const analysis = this.inspector.analyzeDocument(xmlContent);
      tableMatches = analysis.tables.map(match => {
        if (match.type === 'sessions') {
          return { ...match, roles: { ...match.roles, ...mapping.columns } };
        }
        return match;
      });
    } else {
      const analysis = this.inspector.analyzeDocument(xmlContent);
      tableMatches = analysis.tables;
    }

    tableMatches.forEach((match, tMatchIdx) => {
      const mode = match.confidence > 0.8 ? 'MODO A (Placeholders)' : 'MODO B (Semántico)';
      console.log(`[DOCX] Table ${tMatchIdx + 1} analysis:`);
      console.log(`  - Mode: ${mode}`);
      console.log(`  - Type: ${match.type}`);
      console.log(`  - Roles identified: ${JSON.stringify(match.roles)}`);
      console.log(`  - Header row: ${match.headerRowIndex}`);
      
      const targetTable = tables[match.tableIndex];
      if (!targetTable) return;

      const rows = this.findAllNodes(targetTable, 'w:tr');
      const prototypeRowIdx = match.headerRowIndex + 1 < rows.length ? match.headerRowIndex + 1 : match.headerRowIndex;
      const prototypeRow = rows[prototypeRowIdx];

      let newRows: any[] = [];
      if (match.type === 'sessions') {
        const sesiones = payload.sessions || (Array.isArray(payload) ? payload : []);
        
        newRows = sesiones.map((session: any) => {
          const clonedRow = JSON.parse(JSON.stringify(prototypeRow));
          this.fillRowWithSessionData(clonedRow, session, match.roles);
          return clonedRow;
        });
      } else if (match.type === 'evaluation') {
        const evaluation = (payload.evaluation || {}) as any;
        // Priorizar criterios extraídos directamente del temario (rawCriteria)
        const evalItems = (evaluation.rawCriteria && evaluation.rawCriteria.length > 0)
          ? evaluation.rawCriteria
          : [
              ...(evaluation.firstPartial?.items || []),
              ...(evaluation.secondPartial?.items || []),
              ...(evaluation.final?.items || []),
            ];
            
        newRows = evalItems.map(item => {
          const clonedRow = JSON.parse(JSON.stringify(prototypeRow));
          this.fillRowWithEvaluationData(clonedRow, item, match.roles);
          return clonedRow;
        });
      }

      if (newRows.length > 0) {
        this.replaceRowsInTable(targetTable, match.headerRowIndex, newRows);
      }
    });
  }

  /**
   * Mapea criterios de evaluación dinámicos a la tabla
   */
  private fillRowWithEvaluationData(row: any, item: any, roles: any): void {
    const cells = this.findAllNodes(row, 'w:tc');
    cells.forEach((cell, cIdx) => {
      const role = roles[cIdx];
      
      if (role === 'activity' || role === 'tema' || role === 'actividad') {
        this.setCellText(cell, this.normalizeDocxText(item.name || ''));
      } else if (role === 'evaluation' || role === 'percentage' || role === 'porcentaje') {
        this.setCellText(cell, this.normalizeDocxText(`${item.percentage}%`));
      }
    });
  }

  private fillRowWithSessionData(row: any, session: DocxSession, roles: any): void {
    const cells = this.findAllNodes(row, 'w:tc');
    cells.forEach((cell, cIdx) => {
      const role = roles[cIdx];
      
      // MODO A: Si la celda tiene placeholders específicos de sesión
      const cellXml = this.builder.build(cell);
      const sessionPlaceholderRegex = /\{\{\s*(num|week|date|unit|objective|topic|subtopics|content|activity|strategy|resources|recursos|didacticResources|recursos_didacticos|evidence|evaluation|bibliography|dateReal|notes)\s*\}\}/i;
      
      if (sessionPlaceholderRegex.test(cellXml)) {
        this.injectSessionPlaceholders(cell, session);
      } 
      // MODO B: Si no hay placeholders pero detectamos un rol por encabezado
      else if (role) {
        const value = this.resolveCellValue(session, role);
        this.setCellText(cell, this.normalizeDocxText(value));
      }
    });
  }

  private injectSessionPlaceholders(cell: any, session: DocxSession): void {
    const tNodes = this.findAllNodes(cell, 'w:t');
    tNodes.forEach(tNode => {
      let targetObj: any = null;
      if (Array.isArray(tNode)) {
        targetObj = tNode.find(item => item['#text'] !== undefined);
      } else if (typeof tNode === 'object' && tNode['#text'] !== undefined) {
        targetObj = tNode;
      }

      if (targetObj && typeof targetObj['#text'] === 'string') {
        let text = targetObj['#text'];
        
        // Mapear cada campo de la sesión a su placeholder
        Object.keys(session).forEach(key => {
      const value = this.resolveCellValue(session, key);
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, 'gi');
      if (regex.test(text)) {
        text = text.replace(regex, this.normalizeDocxText(value));
      }
    });

    // Mapeo manual para aliases comunes si la key no coincide exactamente con el objeto
    const aliases: Record<string, string> = {
      'recursos': this.resolveCellValue(session, 'resources'),
      'recursos_didacticos': this.resolveCellValue(session, 'didacticResources'),
      'didactic_resources': this.resolveCellValue(session, 'didacticResources'),
      'RECURSOS': this.resolveCellValue(session, 'resources'),
      'RECURSOS_DIDACTICOS': this.resolveCellValue(session, 'didacticResources'),
      'ACTIVIDAD': this.resolveCellValue(session, 'activity'),
      'TEMA': this.resolveCellValue(session, 'topic'),
      'OBJETIVO': this.resolveCellValue(session, 'objective'),
    };

    for (const [alias, value] of Object.entries(aliases)) {
      const regex = new RegExp(`\\{\\{\\s*${alias}\\s*\\}\\}`, 'gi');
      if (regex.test(text)) {
        text = text.replace(regex, this.normalizeDocxText(value));
      }
    }

    targetObj['#text'] = text;
      }
    });
  }

  private setCellText(cell: any, escapedText: string): void {
    // Si el texto contiene <w:br/>, debemos procesarlo como nodos XML, no como texto plano
    const hasBr = escapedText.includes('<w:br/>');
    const parts = hasBr ? escapedText.split('<w:br/>') : [escapedText];

    const tNodes = this.findAllNodes(cell, 'w:t');
    if (tNodes.length > 0) {
      const firstTContent = tNodes[0];
      if (Array.isArray(firstTContent)) {
        // Limpiar contenido previo
        firstTContent.length = 0;
        
        parts.forEach((part, idx) => {
          if (part) {
            firstTContent.push({ '#text': part });
          }
          if (idx < parts.length - 1) {
            // Necesitamos insertar un w:br, pero w:t solo acepta texto.
            // Los w:br van a nivel de w:r, fuera de w:t.
            // Esto requiere una manipulación más profunda del árbol XML.
          }
        });
      }
    } else {
      // ... (lógica de creación de nodos si no existen)
    }
    
    // Simplificación: Para manejar w:br correctamente, es mejor inyectar a nivel de párrafo o run
    this.injectTextWithBr(cell, parts);
  }

  private injectTextWithBr(cell: any, parts: string[]): void {
    const pNodes = this.findAllNodes(cell, 'w:p');
    if (pNodes.length === 0) return;
    
    const p = pNodes[0];
    if (!Array.isArray(p)) return;

    // Limpiar todos los w:r actuales del primer párrafo
    const rIndices = p.map((node, idx) => node['w:r'] ? idx : -1).filter(idx => idx !== -1);
    rIndices.reverse().forEach(idx => p.splice(idx, 1));

    // Crear un nuevo w:r con el contenido
    const newR: any[] = [];
    parts.forEach((part, idx) => {
      if (part) {
        newR.push({ 'w:t': [{ '#text': part }] });
      }
      if (idx < parts.length - 1) {
        newR.push({ 'w:br': [] });
      }
    });

    p.push({ 'w:r': newR });
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
