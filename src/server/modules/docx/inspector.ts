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
      if (match && match.confidence > 0.3) {
        matches.push(match);
      }
    });

    return { tables: matches };
  }

  private analyzeTable(tbl: any, index: number): TableMatch | null {
    const rows = this.findAllNodes(tbl, 'w:tr');
    let bestMatch: TableMatch | null = null;

    rows.forEach((row, rIdx) => {
      const cells = this.findAllNodes(row, 'w:tc');
      
      // Try Sessions detection
      const sessionsRoles = this.detectSessionsRoles(cells);
      if (sessionsRoles.count >= 2) {
        const confidence = sessionsRoles.count / 5;
        if (!bestMatch || (bestMatch.type === 'sessions' && confidence > bestMatch.confidence) || bestMatch.type !== 'sessions') {
          bestMatch = { 
            tableIndex: index, 
            headerRowIndex: rIdx, 
            roles: sessionsRoles.roles, 
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

  private detectSessionsRoles(cells: any[]): { roles: TableRoleMap, count: number } {
    const roles: TableRoleMap = {};
    let count = 0;
    cells.forEach((cell, cIdx) => {
      const text = this.getCellText(cell).toLowerCase();
      if (this.isSessionNum(text)) { roles[cIdx] = 'num'; count++; }
      else if (this.isDate(text)) { roles[cIdx] = 'fecha'; count++; }
      else if (this.isTopic(text)) { roles[cIdx] = 'tema'; count++; }
      else if (this.isActivity(text)) { roles[cIdx] = 'actividad'; count++; }
      else if (this.isObjective(text)) { roles[cIdx] = 'objetivo'; count++; }
    });
    return { roles, count };
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
    return texts.map(t => (typeof t === 'string' ? t : t['#text'] || '')).join(' ');
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

  // Heuristics
  private isSessionNum(text: string): boolean {
    return /sesi[oó]n|semana|no\.|n[uú]m|clase|unidad/i.test(text);
  }

  private isDate(text: string): boolean {
    return /fecha|calendario|programada|cronograma|periodo/i.test(text);
  }

  private isTopic(text: string): boolean {
    return /tema|contenido|subtema|unidad|materia|t[ií]tulo/i.test(text);
  }

  private isActivity(text: string): boolean {
    return /actividad|estrategia|did[aá]ct|propuest|taller|laboratorio/i.test(text);
  }

  private isObjective(text: string): boolean {
    return /objetivo|competencia|particular|prop[oó]sito/i.test(text);
  }
}
