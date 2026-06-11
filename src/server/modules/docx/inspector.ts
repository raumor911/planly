import { XMLParser } from 'fast-xml-parser';
import { TableMatch, TableRoleMap } from './types';

export class TemplateInspector {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      preserveOrder: true,
      parseAttributeValue: true,
      trimValues: true,
    });
  }

  public analyzeDocument(xml: string): { tables: TableMatch[] } {
    const jsonObj = this.parser.parse(xml);
    const body = this.findNode(jsonObj, 'w:body');
    if (!body) return { tables: [] };

    const tables = this.findAllNodes(body, 'w:tbl');
    const matches: TableMatch[] = [];

    tables.forEach((tbl, index) => {
      const match = this.analyzeTable(tbl, index);
      if (match) {
        console.log(`[TemplateInspector] Table ${index} analysis: type=${match.type}, confidence=${match.confidence}`);
        if (match.confidence > 0.3) {
          matches.push(match);
        }
      } else {
        console.log(`[TemplateInspector] Table ${index} analysis: No match found.`);
      }
    });

    return { tables: matches };
  }

  private analyzeTable(tbl: any, index: number): TableMatch | null {
    const rows = this.findAllNodes(tbl, 'w:tr');
    let bestMatch: TableMatch | null = null;

    rows.forEach((row, rIdx) => {
      const cells = this.findAllNodes(row, 'w:tc');
      
      // Modo B: Detección Semántica con Sistema de Puntaje
      const sessionsAnalysis = this.scoreSessionsTable(cells);
      if (sessionsAnalysis.score >= 4) { // Umbral mínimo para considerar tabla probable
        const confidence = sessionsAnalysis.score / 15; // Score normalizado
        if (!bestMatch || (bestMatch.type === 'sessions' && confidence > bestMatch.confidence) || bestMatch.type !== 'sessions') {
          bestMatch = { 
            tableIndex: index, 
            headerRowIndex: rIdx, 
            roles: sessionsAnalysis.roles, 
            confidence, 
            type: 'sessions' 
          };
        }
      }

      // Try Evaluation detection
      const evalRoles = this.detectEvaluationRoles(cells);
      if (evalRoles.count >= 1 && (!bestMatch || bestMatch.type !== 'sessions')) {
        const confidence = evalRoles.count / 2;
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { 
            tableIndex: index, 
            headerRowIndex: rIdx, 
            roles: evalRoles.roles, 
            confidence, 
            type: 'evaluation' 
          };
        }
      }
    });

    return bestMatch;
  }

  private scoreSessionsTable(cells: any[]): { roles: TableRoleMap, score: number } {
    const roles: TableRoleMap = {};
    let score = 0;
    
    cells.forEach((cell, cIdx) => {
      const text = this.getCellText(cell).toLowerCase();
      
      // Sistema de puntaje semántico
      if (this.isRole(text, ['num', 'semana', 'clase', 'no.', 'número', 'sesión', 'encuentro', 'secuencia'])) {
        roles[cIdx] = 'num';
        score += 2;
      } else if (this.isRole(text, ['fecha', 'fecha programada', 'calendario', 'cronograma', 'periodo', 'programada'])) {
        roles[cIdx] = 'date';
        score += 2;
      } else if (this.isRole(text, ['fecha real', 'fecha realizada', 'fecha de ejecución', 'ejecución'])) {
        roles[cIdx] = 'dateReal';
        score += 2;
      } else if (this.isRole(text, ['objetivo', 'objetivo particular', 'propósito', 'competencia', 'aprendizaje esperado', 'particular'])) {
        roles[cIdx] = 'objective';
        score += 3;
      } else if (this.isRole(text, ['tema', 'temas', 'subtemas', 'contenido', 'unidad', 'saber', 'eje temático', 'temario', 'subtema'])) {
        roles[cIdx] = 'topic';
        score += 3;
      } else if (this.isRole(text, ['actividad', 'actividades', 'estrategia', 'didáctica', 'secuencia didáctica', 'desarrollo', 'aprendizaje', 'enseñanza'])) {
        roles[cIdx] = 'activity';
        score += 3;
      } else if (this.isRole(text, ['recurso', 'recursos', 'material', 'materiales', 'plataforma', 'tic', 'didáctico', 'didácticos'])) {
        roles[cIdx] = 'resources';
        score += 2;
      } else if (this.isRole(text, ['evidencia', 'producto', 'entregable'])) {
        roles[cIdx] = 'evidence';
        score += 2;
      } else if (this.isRole(text, ['evaluación', 'criterios', 'instrumento', 'ponderación'])) {
        roles[cIdx] = 'evaluation';
        score += 2;
      } else if (this.isRole(text, ['bibliografía', 'referencias', 'fuentes', 'consulta'])) {
        roles[cIdx] = 'bibliography';
        score += 1;
      }
    });

    return { roles, score };
  }

  private isRole(text: string, keywords: string[]): boolean {
    const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const normalizedText = normalize(text);
    return keywords.some(kw => {
      const normalizedKw = normalize(kw);
      return normalizedText.includes(normalizedKw);
    });
  }

  private detectEvaluationRoles(cells: any[]): { roles: TableRoleMap, count: number } {
    const roles: TableRoleMap = {};
    let count = 0;
    cells.forEach((cell, cIdx) => {
      const text = this.getCellText(cell).toLowerCase();
      if (/criterio|rubro|aspecto|actividad|item|evaluaci[oó]n/i.test(text)) { roles[cIdx] = 'tema' as any; count++; }
      else if (/porcentaje|valor|ponderaci[oó]n|%|puntos/i.test(text)) { roles[cIdx] = 'actividad' as any; count++; }
    });
    return { roles, count };
  }

  private getCellText(cell: any): string {
    const texts = this.findAllNodes(cell, 'w:t');
    return texts.map(t => {
      if (typeof t === 'string') return t;
      if (Array.isArray(t)) {
        const textItem = t.find(item => item['#text'] !== undefined);
        return textItem ? String(textItem['#text']) : '';
      }
      return '';
    }).join(' ');
  }

  private findNode(parent: any, name: string): any {
    if (!parent) return null;
    if (Array.isArray(parent)) {
      for (const item of parent) {
        if (item[name]) return item[name];
        const found = this.findNode(item, name);
        if (found) return found;
      }
    } else if (typeof parent === 'object') {
      if (parent[name]) return parent[name];
      for (const key in parent) {
        const found = this.findNode(parent[key], name);
        if (found) return found;
      }
    }
    return null;
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
