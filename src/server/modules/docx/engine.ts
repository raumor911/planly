import PizZip from 'pizzip';
import { DocxPayload } from './types';

/**
 * PreservationEngine
 * Se enfoca exclusivamente en la preservación de la integridad visual y estructural del ZIP.
 * Delega la inyección de datos complejos al InsertionAgent.
 */
export class PreservationEngine {
  constructor() {}

  /**
   * Preserva la estructura institucional del DOCX.
   * Retorna un Buffer con el contenido del ZIP procesado.
   */
  public async preserve(templateBuffer: Buffer): Promise<Buffer> {
    const zip = new PizZip(templateBuffer);
    const fileKeys = Object.keys(zip.files);
    
    // Debug info para asegurar fidelidad
    const imagesBefore = fileKeys.filter(k => k.startsWith('word/media/')).length;
    const hasHeadersBefore = fileKeys.some(k => k.startsWith('word/header'));
    const hasFootersBefore = fileKeys.some(k => k.startsWith('word/footer'));

    console.log(`[PreservationEngine] Images detected: ${imagesBefore}`);
    console.log(`[PreservationEngine] Headers preserved: ${hasHeadersBefore}`);
    console.log(`[PreservationEngine] Footers preserved: ${hasFootersBefore}`);

    return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  }
}
