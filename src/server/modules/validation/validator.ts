import PizZip from 'pizzip';
import { XMLParser } from 'fast-xml-parser';

export class ValidationEngine {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      allowBooleanAttributes: true
    });
  }

  public async validate(zip: PizZip): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    // 1. Check if it's a valid ZIP and has main files
    const fileKeys = Object.keys(zip.files);
    
    const requiredFiles = [
      '[Content_Types].xml',
      '_rels/.rels',
      'word/document.xml',
      'word/_rels/document.xml.rels'
    ];

    requiredFiles.forEach(file => {
      if (!fileKeys.includes(file)) {
        errors.push(`Missing required file: ${file}`);
      }
    });

    // 2. Verify XML structure (Deep validation with fast-xml-parser)
    const xmlFilesToCheck = fileKeys.filter(k => k.endsWith('.xml') && (k.startsWith('word/') || k === '[Content_Types].xml'));

    xmlFilesToCheck.forEach(path => {
      try {
        const xmlContent = zip.file(path)?.asText();
        if (!xmlContent) {
          errors.push(`File ${path} is empty or missing content.`);
          return;
        }

        // El parser arrojará un error si el XML está malformado
        this.parser.parse(xmlContent);
        
        // 3. Verificación de estándar XML (Microsoft Word estricto)
        if (xmlContent.startsWith('<?xml')) {
          const versionMatch = xmlContent.match(/version="([^"]+)"/);
          if (versionMatch && versionMatch[1] === '1') {
            errors.push(`Invalid XML version "1" in ${path}. Must be "1.0" for Word compatibility.`);
          }
        }
        
        // Verificación manual de cierre de documento para word/document.xml
        if (path === 'word/document.xml' && !xmlContent.includes('</w:document>')) {
          errors.push('word/document.xml is truncated: missing </w:document> tag.');
        }
      } catch (e: any) {
        errors.push(`XML Corruption in ${path}: ${e.message}`);
      }
    });

    // 3. Verify images are preserved
    const mediaFiles = fileKeys.filter(k => k.startsWith('word/media/'));
    if (mediaFiles.length === 0) {
      console.warn('No media files found in the generated DOCX.');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
