import { XMLParser } from 'fast-xml-parser';
import { TableRoleMap, SessionRole } from './types';

export interface ScanResult {
  tableIndex: number;
  headerRowIndex: number;
  mapping: TableRoleMap;
  score: number;
}

export class TemplateScanner {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      preserveOrder: true,
      parseAttributeValue: true,
      trimValues: true,
    });
  }

  /**
   * Escanea el XML buscando la tabla que mejor se ajuste al esquema de sesiones.
   */
  public scan(xml: string): ScanResult | null {
    const jsonObj = this.parser.parse(xml);
    const body = this.findNode(jsonObj, 'w:body');
    if (!body) return null;

    const tables = this.findAllNodes(body, 'w:tbl');
    let winner: ScanResult | null = null;

    tables.forEach((tbl, index) => {
      const result = this.analyzeTable(tbl, index);
      if (result && (!winner || result.score > winner.score)) {
        winner = result;
      }
    });

    if (winner) {
      console.log(`[TemplateScanner] Ganadora detectada: Tabla ${winner.tableIndex} con score ${winner.score}`);
    }

    return winner;
  }

  private analyzeTable(tbl: any, index: number): ScanResult | null {
    const rows = this.findAllNodes(tbl, 'w:tr');
    let bestRowResult: ScanResult | null = null;

    rows.forEach((row, rIdx) => {
      const cells = this.findAllNodes(row, 'w:tc');
      const analysis = this.scoreRow(cells);
      
      if (analysis.score > 0) {
        if (!bestRowResult || analysis.score > bestRowResult.score) {
          bestRowResult = {
            tableIndex: index,
            headerRowIndex: rIdx,
            mapping: analysis.roles,
            score: analysis.score
          };
        }
      }
    });

    return bestRowResult;
  }

  private scoreRow(cells: any[]): { roles: TableRoleMap, score: number } {
    const roles: TableRoleMap = {};
    let score = 0;

    cells.forEach((cell, cIdx) => {
      const text = this.getCellText(cell).toLowerCase();

      // Reglas de puntaje semántico (basado en diseño universal)
      if (this.isRole(text, ['num', 'semana', 'clase', 'no.', 'número', 'sesión'])) {
        roles[cIdx] = 'num';
        score += 2;
      } else if (this.isRole(text, ['objetivo', 'propósito', 'competencia'])) {
        roles[cIdx] = 'objective';
        score += 3;
      } else if (this.isRole(text, ['tema', 'contenido', 'unidad', 'eje'])) {
        roles[cIdx] = 'topic';
        score += 3;
      } else if (this.isRole(text, ['actividad', 'estrategia', 'didáctica', 'enseñanza'])) {
        roles[cIdx] = 'activity';
        score += 3;
      } else if (this.isRole(text, ['recursos', 'materiales', 'bibliografía', 'tic'])) {
        roles[cIdx] = 'resources';
        score += 2;
      } else if (this.isRole(text, ['fecha', 'calendario', 'cronograma'])) {
        roles[cIdx] = 'date' as any;
        score += 2;
      } else if (this.isRole(text, ['evidencia', 'producto', 'entregable'])) {
        roles[cIdx] = 'evidence';
        score += 2;
      }
    });

    return { roles, score };
  }

  private isRole(text: string, keywords: string[]): boolean {
    return keywords.some(kw => text.includes(kw));
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
