import PizZip from 'pizzip';
import { DocxPayload } from './modules/docx/types';
import { DocxAgentOrchestrator } from './modules/docx/orchestrator';

/**
 * Normaliza cualquier valor a string para evitar errores de .replace()
 */
function normalizeDocxText(value: unknown): string {
  if (value === null || value === undefined) return "";

  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== null && item !== undefined)
      .map((item) => normalizeDocxText(item))
      .filter(Boolean)
      .join("\n");
  }

  if (typeof value === "object") {
    try {
      return Object.values(value as Record<string, unknown>)
        .map((item) => normalizeDocxText(item))
        .filter(Boolean)
        .join("\n");
    } catch {
      return "";
    }
  }

  return String(value);
}

export function getSessionDate(index: number, startDate: string): string {
  const date = new Date(startDate);
  date.setDate(date.getDate() + (index * 7));
  return date.toISOString().split('T')[0];
}

export class FidelityTemplateEngine {
  private orchestrator: DocxAgentOrchestrator;

  constructor() {
    this.orchestrator = new DocxAgentOrchestrator();
  }
  
  /**
   * Procesa la plantilla DOCX utilizando el Agente Orquestador.
   * Se elimina la dependencia de Regex y Docxtemplater para evitar corrupción por Tag Splitting.
   */
  public async process(zip: PizZip, payload: DocxPayload): Promise<Buffer> {
    console.log('[FidelityTemplateEngine] Delegating processing to Agent Orchestrator...');
    
    // Convertimos el ZIP actual (que puede venir de un buffer inicial) a base64 para el orquestador
    const templateBase64 = zip.generate({ type: 'base64' });
    
    // Invocamos el bucle agéntico de generación y sanación
    const result = await this.orchestrator.generate(templateBase64, payload);
    
    return result.buffer;
  }
}
