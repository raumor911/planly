export class PreSanitizer { 
  /** 
   * Limpia el texto crudo extraído de docx-parser antes de pasarlo al syllabus.ts 
   */ 
  public static sanitize(text: string): string { 
    return text 
      // 1. Elimina caracteres de control y saltos de página basura 
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") 
      // 2. Normaliza saltos de línea (evita múltiples saltos que confunden el Regex) 
      .replace(/\r\n|\r/g, "\n") 
      // 3. Elimina espacios en blanco excesivos entre líneas 
      .replace(/[ \t]+/g, " ") 
      // 4. Asegura que cada aparición de "UNIDAD" o "MÓDULO" esté en una línea nueva para el Regex 
      .replace(/(UNIDAD|MÓDULO)/gi, "\n$1") 
      .trim(); 
  } 
 } 
