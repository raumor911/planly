import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not defined. Please add the secret or API Key in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

export interface StructuredSession {
  num: number;
  tema: string;
  actividad: string;
  objetivo: string;
}

export interface StructuredSyllabus {
  materia: string;
  sesiones: StructuredSession[];
}

/**
 * Helper to pause execution
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const DEFAULT_MODEL = "gemini-2.0-flash";

/**
 * Robust retry utility to call Gemini API, attempting multiple models and retries before giving up.
 */
export async function callGeminiWithRetry(
  contents: any,
  config: any,
  preferredModel: string = DEFAULT_MODEL
): Promise<any> {
  const ai = getGeminiClient();

  // Sanitización inicial del parámetro preferredModel
  if (preferredModel.includes("1.5") || preferredModel.includes("flash-latest") || preferredModel.includes("pro-latest")) {
    console.log(`[Gemini Engine] Sanitizing preferredModel "${preferredModel}" -> "${DEFAULT_MODEL}"`);
    preferredModel = DEFAULT_MODEL;
  }

  // Modelos vigentes de la familia moderna de Google Gemini (Serie 2.0)
  const modelsToTry = [
    preferredModel,
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite"
  ];

  const maxRetriesPerModel = 2;
  let lastError: any = null;

  for (let model of modelsToTry) {
    // Desinfectar el objeto config para evitar que arrastre modelos viejos o inexistentes
    const finalConfig = { ...config };
    if (finalConfig.model && (finalConfig.model.includes("1.5") || finalConfig.model.includes("flash-latest") || finalConfig.model.includes("pro-latest"))) {
      console.log(`[Gemini Engine] Sanitizing config model "${finalConfig.model}" -> "${DEFAULT_MODEL}"`);
      finalConfig.model = DEFAULT_MODEL;
    }

    // Forzar el uso de modelos vigentes si se detecta basura externa o modelos obsoletos
    if (model.includes("1.5") || model.includes("flash-latest") || model.includes("pro-latest")) {
      console.log(`[Gemini Engine] Sanitizing obsolete model in loop "${model}" -> "${DEFAULT_MODEL}"`);
      model = DEFAULT_MODEL;
    }

    for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
      try {
        console.log(`[Gemini Engine] Attempting call with model "${model}" - (Attempt ${attempt}/${maxRetriesPerModel})...`);
        
        // Usamos el patrón que funciona en el resto del proyecto con el modelo sanitizado
        const response = await (ai as any).models.generateContent({
          model: model,
          contents: contents,
          config: finalConfig
        });
        
        console.log(`[Gemini Engine] Success! Called with model "${model}"`);
        return response;
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini Engine Warning] Error on model "${model}" (attempt ${attempt}): ${err?.message || err}`);
        
        if (attempt < maxRetriesPerModel) {
          const waitMs = attempt * 1500;
          await delay(waitMs);
        }
      }
    }
    await delay(500);
  }

  throw lastError || new Error("Se agotaron los modelos de inteligencia artificial disponibles.");
}

/**
 * Text-processing offline fallback
 */
function fallbackCleanUpRawWordText(rawText: string): string {
  return rawText
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith("---") && !line.startsWith("***"))
    .join("\n");
}

/**
 * HEURISTIC STRUCTURAL SYLLABUS GENERATOR (Bulletproof Local Offline Generator)
 * Acts as the ultimate backup if the entire Gemini API is experiencing 503 errors or is completely down.
 */
export function heuristicStructureSyllabus(temarioText: string, numSesiones: number = 14): StructuredSyllabus {
  console.log(`[Heuristic Handler] Handing over to local heuristic generator for ${numSesiones} sessions...`);
  
  const lines = temarioText
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith("---") && !l.startsWith("***"));

  // 1. Infer subject / materia
  let inferredMateria = "";
  for (const line of lines) {
    const cleanLine = line.toLowerCase();
    if (cleanLine.includes("materia:") || cleanLine.includes("asignatura:") || cleanLine.includes("curso:") || cleanLine.includes("temario de")) {
      inferredMateria = line.replace(/^(materia|asignatura|curso|temario de|temario)\s*:\s*/i, "").trim();
      break;
    }
  }
  
  if (!inferredMateria && lines.length > 0) {
    const firstLine = lines[0];
    if (firstLine.split(/\s+/).length <= 10) {
      inferredMateria = firstLine;
    }
  }
  
  if (!inferredMateria) {
    inferredMateria = "Contabilidad de Organizaciones Públicas";
  }

  // 2. Extract candidate topics
  const candidateTopics: string[] = [];
  const topicFilterRegex = /^(unidad|tema|modulo|módulo|capítulo|sección|seccion|\d+[\.\-\)]|\d+\.\d+)\s+/i;
  
  for (const line of lines) {
    if (line.length > 5 && line.length < 150) {
      if (topicFilterRegex.test(line) || line.startsWith("-") || line.startsWith("*") || line.startsWith("•")) {
        const cleaned = line.replace(/^(unidad|tema|modulo|módulo|capítulo|sección|seccion|\d+[\.\-\)]|\d+\.\d+)\s*/i, "")
          .replace(/^[\-\*\•\s]*/, "")
          .trim();
        if (cleaned.length > 2) {
          candidateTopics.push(cleaned);
        }
      }
    }
  }

  if (candidateTopics.length < 4) {
    for (const line of lines) {
      if (line.length > 10 && line.length < 120 && !line.toLowerCase().includes("materia:") && !line.toLowerCase().includes("asignatura:")) {
        candidateTopics.push(line);
      }
    }
  }

  const uniqueTopics = Array.from(new Set(candidateTopics));
  const sessions: StructuredSession[] = [];
  const totalTopics = uniqueTopics.length;

  // 3. Extrapolate sessions up to numSesiones
  for (let s = 1; s <= numSesiones; s++) {
    let topicName = "";
    if (totalTopics > 0) {
      if (numSesiones === totalTopics) {
        topicName = uniqueTopics[s - 1];
      } else if (totalTopics > numSesiones) {
        topicName = uniqueTopics[s - 1];
      } else {
        const topicIdx = Math.floor(((s - 1) / numSesiones) * totalTopics);
        topicName = uniqueTopics[topicIdx];
        if (s > totalTopics) {
          topicName = `${topicName} (Análisis continuo y casos aplicados)`;
        }
      }
    }

    if (!topicName || topicName.trim().length === 0) {
      const defaultConceptsByIndex = [
        "Estructura de los estados financieros gubernamentales",
        "Normas de información financiera aplicadas al sector público",
        "Presupuesto y contabilidad en dependencias de gobierno",
        "Marco jurídico y leyes de fiscalización contable",
        "Rendición de cuentas de los recursos públicos",
        "Auditoría gubernamental y control interno",
        "Sistemas integrales de administración financiera",
        "Análisis de la cuenta pública y transparencia",
        "Evaluación de metas y desempeño institucional",
        "Casos de estudio prácticos en el sector hacendario",
        "Conclusiones, examen integral y debate grupal"
      ];
      topicName = defaultConceptsByIndex[(s - 1) % defaultConceptsByIndex.length];
    }

    const limitWords = (str: string, max: number): string => {
      const words = str.split(/\s+/);
      if (words.length > max) return words.slice(0, max).join(" ") + "...";
      return str;
    };

    const cleanTopic = limitWords(topicName, 12);

    const activitiesList = [
      `Análisis de lecturas y debate grupal sobre ${cleanTopic}`,
      `Estudio de casos reales aplicados y resolución dirigida sobre ${cleanTopic}`,
      `Taller técnico guiado en clase y desarrollo de ejercicios prácticos sobre ${cleanTopic}`,
      `Discusión en mesas redondas y puesta en común sobre ${cleanTopic}`,
      `Exposición interactiva de conceptos y retroalimentación interactiva sobre ${cleanTopic}`,
      `Prácticas virtuales estructuradas y ensayo reflexivo breve sobre ${cleanTopic}`,
      `Simulación práctica integradora por equipos para modelar ${cleanTopic}`
    ];
    const activityStr = limitWords(activitiesList[(s - 1) % activitiesList.length], 12);

    const objectivesList = [
      `Comprender los fundamentos conceptuales y metodologías prácticas aplicadas a ${cleanTopic}`,
      `Aplicar herramientas analíticas específicas para estructurar y resolver problemas de ${cleanTopic}`,
      `Identificar riesgos críticos de implementación y control normativo relativos a ${cleanTopic}`,
      `Evaluar críticamente los alcances e implicaciones de las decisiones sobre ${cleanTopic}`,
      `Estructurar informes detallados fundamentados bajo la estructura de ${cleanTopic}`,
      `Analizar con rigor técnico la normatividad nacional e internacional de ${cleanTopic}`,
      `Desarrollar competencias integradoras y de análisis crítico enfocadas en ${cleanTopic}`
    ];
    const objectiveStr = limitWords(objectivesList[(s - 1) % objectivesList.length], 12);

    sessions.push({
      num: s,
      tema: cleanTopic,
      actividad: activityStr,
      objetivo: objectiveStr
    });
  }

  return {
    materia: inferredMateria,
    sesiones: sessions
  };
}

export async function askGeminiToStructureSyllabus(temarioText: string, numSesiones: number = 14): Promise<StructuredSyllabus> {
  const contents = `Analiza el siguiente temario académico. Diseña y distribuye el contenido de forma lógica en exactamente ${numSesiones} temas semanales (sesiones) para la materia correspondiente del temario.
  
  Temario:
  ${temarioText}

  Para cada una de las ${numSesiones} sesiones, genera:
  - 'tema': Contenido o tema principal (máximo 15 palabras).
  - 'actividad': Estrategia académica, actividad práctica, lectura o taller asociado (máximo 15 palabras).
  - 'objetivo': El objetivo detallado específico de esa sesión (máximo 15 palabras).

  REGLAS DE FORMATO:
  - Los textos de cada campo deben ser claros, coherentes, y estar limpios de saltos de línea (\\n), marcas Markdown (*, _) o caracteres especiales extraños.
  - Limita estrictamente cada campo text a un máximo de 15 palabras.
  - Debes retornar una lista de exactamente ${numSesiones} sesiones secuenciadas.`;

  const config = {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        materia: {
          type: Type.STRING,
          description: "Nombre de la materia, por ejemplo 'Contabilidad de Organizaciones Públicas' o lo inferido del temario."
        },
        sesiones: {
          type: Type.ARRAY,
          description: `Array que contiene exactamente ${numSesiones} ítems para las sesiones consecutivas de curso`,
          items: {
            type: Type.OBJECT,
            properties: {
              num: {
                type: Type.INTEGER,
                description: `Número correlativo de la sesión del 1 al ${numSesiones}`
              },
              tema: {
                type: Type.STRING,
                description: "Título o tema simplificado de la sesión. Máximo 15 palabras."
              },
              actividad: {
                type: Type.STRING,
                description: "Actividad didáctica a realizar (máximo 15 palabras)."
              },
              objetivo: {
                type: Type.STRING,
                description: "Resultado de aprendizaje de la sesión (máximo 15 palabras)."
              }
            },
            required: ["num", "tema", "actividad", "objetivo"]
          }
        }
      },
      required: ["materia", "sesiones"]
    }
  };

  try {
    const completion = await callGeminiWithRetry(contents, config);
    const responseText = completion.text;
    
    if (!responseText) {
      throw new Error("Respuesta de IA vacía.");
    }
    return JSON.parse(responseText.trim()) as StructuredSyllabus;
  } catch (error: any) {
    console.error(`[askGeminiToStructureSyllabus Fail] Falling back to high-quality local heuristic parsing. Error:`, error?.message || error);
    
    // Smooth fallback to local heuristic structuring
    return heuristicStructureSyllabus(temarioText, numSesiones);
  }
}

export async function extractSyllabusFromPdf(pdfBase64: string): Promise<string> {
  console.log("Extracting syllabus from PDF directly using robust Gemini retry pipeline...");
  
  const pdfPart = {
    inlineData: {
      mimeType: "application/pdf",
      data: pdfBase64,
    },
  };

  const contents = [
    pdfPart,
    `Aquí tienes un documento PDF del temario oficial de la materia. 
    Por favor, extrae de forma limpia, estructurada y organizada únicamente los temas principales, unidades, subtemas, y objetivos pedagógicos/generales importantes.
    Elimina cualquier ruido como logos, pies de página o cabeceras, firmas, reglamento interno, datos de contacto, etc.
    
    Devuelve ÚNICAMENTE el temario estructurado resultante en texto plano legible en español, respetando el orden cronológico original. No incluyas explicaciones iniciales ni bloques de introducción, ve directo al grano.`
  ];

  try {
    const response = await callGeminiWithRetry(contents, {});
    return response.text || "No se pudo extraer contenido del PDF.";
  } catch (error: any) {
    console.error("[extractSyllabusFromPdf Fail] Error while processing PDF:", error);
    throw new Error(
      "El servicio de Inteligencia Artificial para extraer PDFs está experimentando alta demanda. " +
      "Por favor, intenta subir un archivo de Word (.docx), pegar el contenido de tu temario " +
      "como texto directamente en el editor, o vuelve a intentar en unos momentos."
    );
  }
}

export async function cleanUpRawWordText(rawText: string): Promise<string> {
  console.log("Cleaning up raw Word text using robust Gemini retry pipeline...");

  const contents = `Aquí tienes el texto extraído en crudo de un documento Word que contiene el temario escolar. 
    Por favor, límpialo, organízalo y estructúralo de forma ultra-limpia en español. 
    Identifica las unidades, temas principales, subtemas y objetivos generales de aprendizaje.
    Elimina cualquier ruido innecesario como reglas administrativas de la escuela, logos de cabecera, datos de contacto o espaciados rotos.
    
    Texto bruto del documento:
    ---
    ${rawText}
    ---
    
    Devuelve ÚNICAMENTE el temario estructurado resultante en texto plano legible, optimizado para poder ser editado y ajustado por un docente.`;

  try {
    const response = await callGeminiWithRetry(contents, {});
    return response.text || rawText;
  } catch (error: any) {
    console.error("[cleanUpRawWordText Fail] Error during raw text cleanup. Falling back to local regex formatting:", error);
    return fallbackCleanUpRawWordText(rawText);
  }
}

/**
 * Agente Inspector de XML (Preflight Agent)
 * Analiza el XML de una plantilla para identificar riesgos estructurales.
 */
export async function askAgentToInspectXML(xmlContent: string): Promise<{ riskScore: number; issues: string[]; riskyNodes: string[] }> {
  console.log("[Preflight Agent] Inspecting XML for structural risks...");
  
  const contents = `Actúa como un Auditor Senior de OpenXML. 
  Tu tarea es inspeccionar el siguiente fragmento de XML de un documento de Word (.docx) e identificar riesgos potenciales de corrupción ANTES de realizar cualquier inyección de datos.
  
  FRAGMENTO XML A INSPECCIONAR:
  ---
  ${xmlContent.substring(0, 15000)} // Limitamos el tamaño para el prompt
  ---
  
  RIESGOS A BUSCAR:
  1. "Tag Splitting": Placeholders que están divididos en múltiples nodos <w:t> por culpa de cambios de formato en Word (ej: { {NOMBRE} }).
  2. Tablas con estructuras complejas o celdas combinadas que podrían romperse al clonar filas.
  3. Etiquetas XML mal anidadas o truncadas.
  
  DEBES RETORNAR UN JSON ESTRICTO con:
  - 'riskScore': Un número de 0 a 100 indicando el nivel de riesgo (0 = seguro, 100 = crítico).
  - 'issues': Un array de strings describiendo los problemas encontrados.
  - 'riskyNodes': Un array de fragmentos de texto o identificadores de los nodos que presentan riesgo.`;

  const config = {
    responseMimeType: "application/json",
    temperature: 0.2,
  };

  try {
    const response = await callGeminiWithRetry(contents, config, DEFAULT_MODEL);
    const result = JSON.parse(response.text || '{"riskScore": 0, "issues": [], "riskyNodes": []}');
    console.log(`[Preflight Agent] Inspection complete. Risk Score: ${result.riskScore}`);
    return result;
  } catch (error: any) {
    console.error("[Preflight Agent Fail] Error during XML inspection:", error);
    return { riskScore: 0, issues: ["Error en inspección agéntica"], riskyNodes: [] };
  }
}

/**
 * Agente Sanador de XML (Healing Agent)
 * Recibe un fragmento de XML corrupto y el log de errores, y devuelve el XML corregido.
 */
export async function askAgentToHealXML(xmlCorrupto: string, errorLog: string): Promise<string> {
  console.log("[Healing Agent] Activating XML repair loop...");
  
  const contents = `Actúa como un Experto en OpenXML y Esquemas de Microsoft Word. 
  Tu misión es reparar un fragmento de XML de un documento .docx que ha sido identificado como CORRUPTO o malformado tras una inyección de datos.
  
  ERROR LOG DEL VALIDADOR:
  ---
  ${errorLog}
  ---
  
  FRAGMENTO XML CORRUPTO:
  ---
  ${xmlCorrupto}
  ---
  
  INSTRUCCIONES ESTRICTAS:
  1. Analiza el error log para identificar etiquetas sin cerrar (Tag Splitting), atributos malformados o estructuras XML inválidas.
  2. Reconstruye el XML asegurando que todas las etiquetas <w:p>, <w:r>, <w:t>, <w:tr>, <w:tc> y <w:tbl> estén correctamente anidadas y cerradas.
  3. Preserva el contenido textual inyectado.
  4. NO incluyas ninguna explicación, preámbulo o marcas Markdown (\`\`\`xml).
  5. Retorna ÚNICAMENTE el código XML puro y válido.
  
  REPARACIÓN REQUERIDA:`;

  const config = {
    temperature: 0.1, // Baja temperatura para mayor precisión técnica
    topP: 0.95,
  };

  try {
    const response = await callGeminiWithRetry(contents, config, DEFAULT_MODEL);
    let repairedXml = response.text || xmlCorrupto;
    
    // Limpieza de posibles marcas markdown si la IA las incluye por error
    repairedXml = repairedXml.replace(/```xml\n?/g, "").replace(/```\n?/g, "").trim();
    
    console.log("[Healing Agent] XML repair completed.");
    return repairedXml;
  } catch (error: any) {
    console.error("[Healing Agent Fail] Error during XML healing:", error);
    return xmlCorrupto; // Fallback al original si falla la IA
  }
}
