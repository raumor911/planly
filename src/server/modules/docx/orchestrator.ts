import PizZip from 'pizzip';
import { DocxPayload } from './types';
import { FidelityTemplateEngine } from '../../templateEngine';

export class DocxOrchestrator {
  private engine: FidelityTemplateEngine;

  constructor() {
    this.engine = new FidelityTemplateEngine();
  }

  public async generate(templateBase64: string, payload: DocxPayload): Promise<{ buffer: Buffer; errors?: string[] }> {
    console.log('[DocxOrchestrator] Starting DOCX generation process...');
    
    try {
      // 1. Load ZIP
      const zip = new PizZip(Buffer.from(templateBase64, 'base64'));

      // 2. Process with Fidelity Engine (Regex + Docxtemplater)
      const buffer = await this.engine.process(zip, payload);

      console.log(`[DocxOrchestrator] DOCX generation completed. Buffer size: ${buffer.length} bytes`);

      return {
        buffer,
      };
    } catch (error: any) {
      console.error('[DocxOrchestrator] Critical error during DOCX generation:', error);
      throw new Error(`Failed to generate DOCX: ${error.message}`);
    }
  }
}
