import PizZip from 'pizzip';

export class ValidationEngine {
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

    // 2. Verify images are preserved
    const mediaFiles = fileKeys.filter(k => k.startsWith('word/media/'));
    if (mediaFiles.length === 0) {
      // This is a warning, not necessarily an error, but let's log it if the original had media
      console.warn('No media files found in the generated DOCX.');
    }

    // 3. Verify XML structure (basic check)
    try {
      const docXml = zip.file('word/document.xml').asText();
      if (!docXml.includes('</w:document>')) {
        errors.push('word/document.xml is truncated or malformed.');
      }
    } catch (e) {
      errors.push('Could not read word/document.xml');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
