import PizZip from 'pizzip';
import { DocxPayload } from './types';
import { PreservationEngine } from './engine';
import { ValidationEngine } from '../validation/validator';

export class DocxOrchestrator {
  private engine: PreservationEngine;
  private validator: ValidationEngine;

  constructor() {
    this.engine = new PreservationEngine();
    this.validator = new ValidationEngine();
  }

  public async generate(templateBase64: string, payload: DocxPayload): Promise<{ buffer: Buffer; errors?: string[] }> {
    console.log('[DocxOrchestrator] Starting DOCX generation process...');
    
    try {
      // 1. Load ZIP
      const zip = new PizZip(Buffer.from(templateBase64, 'base64').toString('binary'));

      // 2. Process Preservation
      const processedZip = await this.engine.process(zip, payload);

      // 3. Validate
      const validation = await this.validator.validate(processedZip);
      if (!validation.valid) {
        console.warn('[DocxOrchestrator] Validation warnings:', validation.errors);
      }

      // 4. Export
      console.log('[DocxOrchestrator] Generating final buffer...');
      const buffer = processedZip.generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });

      console.log(`[DocxOrchestrator] DOCX generation completed. Buffer size: ${buffer.length} bytes`);

      return {
        buffer,
        errors: validation.valid ? undefined : validation.errors,
      };
    } catch (error: any) {
      console.error('[DocxOrchestrator] Critical error during DOCX generation:', error);
      throw new Error(`Failed to generate DOCX: ${error.message}`);
    }
  }
}
