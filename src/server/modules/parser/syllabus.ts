import { Type, Schema } from "@google/genai";
import { callGeminiWithRetry } from "../../geminiService";
import { PreSanitizer } from "../docx/test-sanitizer";

export interface SyllabusCourse {
  name: string;
  code: string;
  level: string;
  program: string;
  generalObjective: string;
}

export interface SyllabusTopic {
  number: string;
  title: string;
  subtopics: string[];
}

export interface SyllabusActivity {
  type: "evidencia" | "estrategia";
  description: string;
}

export interface SyllabusEvaluation {
  activity: string;
  percentage: number;
}

export interface SyllabusResult {
  course: {
    name: string;
    generalObjective: string;
    code?: string;
    competencies?: string[];
  };
  sessions: Array<{
    num: number;
    topic: string;
    activities: Array<{
      description: string;
      strategy: string;
      resources: string[];
    }>;
    objective?: string;
    week?: string;
    unit?: string;
    content?: string;
    evidence?: string;
    evaluation?: string;
    bibliography?: string;
    activity?: string; // Para compatibilidad
    resources?: string; // Para compatibilidad
  }>;
  bibliography: string[];
  evaluation: any[];
  warnings: string[];
}

export class SyllabusParser {
  /**
   * Realiza un análisis taxonómico infalible de temarios académicos.
   * La firma se mantiene como Promise<any> por requerimiento técnico.
   */
  public async parse(text: string, numWeeks: number = 14): Promise<any> {
    // PRE-SANITIZER: Limpieza profunda y normalización de texto crudo
    const sanitizedText = PreSanitizer.sanitize(text);

    // PASO 1: EXTRACCIÓN DE SECCIONES CRÍTICAS (Two-Pass Parsing)
    // Buscamos las secciones mediante palabras clave para alimentar el "Conector" de IA
    const sectionKeywords = [
      "CONTENIDO TEMÁTICO", "TEMARIO", "UNIDADES", 
      "ACTIVIDADES DE APRENDIZAJE", "ESTRATEGIAS", 
      "CRITERIOS DE EVALUACIÓN", "EVALUACIÓN"
    ];

    const instructions = `Actúa como un estratega curricular y conector lógico. Tu objetivo es realizar un análisis taxonómico y relacional del temario académico.
    
    ESTRATEGIA DE MAPEO (TWO-PASS PARSING):
    1. Identifica la lista de temas en la sección "CONTENIDO TEMÁTICO".
    2. Identifica la lista de acciones pedagógicas en la sección "ACTIVIDADES DE APRENDIZAJE".
    3. RELACIÓN LÓGICA: Debes mapear cada actividad con el tema correspondiente. No las listes de forma aislada.
    
    INSTRUCCIONES DE PROCESAMIENTO:
    - REGLA DE CANTIDAD ESTRICTA: Debes generar EXACTAMENTE ${numWeeks} sesiones.
    - REGLA DE COBERTURA TOTAL: No omitas ninguna unidad. Si hay 7 unidades, las 7 deben estar en el JSON distribuidas en las ${numWeeks} sesiones.
    
    - CLASIFICACIÓN RELACIONAL: 
      * 'activities': Lista de objetos vinculados AL TEMA de la sesión.
      * 'description': La acción específica (ej. "Análisis de la Ley de Contabilidad").
      * 'strategy': El método (ej. "Investigación documental").
      * 'resources': Herramientas necesarias.
    
    ESPECIFICACIONES DEL FORMATO:
    - REGLA DE OBJETIVOS ESPECÍFICOS: El campo 'objective' de cada sesión DEBE ser un objetivo particular y único basado en el tema de esa sesión.
    - REGLA DE INTEGRIDAD: No omitas unidades. Es preferible que una unidad ocupe múltiples sesiones a que sea ignorada.
    `;

    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        course: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            generalObjective: { type: Type.STRING },
            code: { type: Type.STRING },
            competencies: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["name", "generalObjective"]
        },
        sessions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              num: { type: Type.INTEGER },
              topic: { type: Type.STRING },
              activities: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    description: { type: Type.STRING },
                    strategy: { type: Type.STRING },
                    resources: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    }
                  },
                  required: ["description", "strategy", "resources"]
                }
              },
              objective: { type: Type.STRING },
              week: { type: Type.STRING },
              unit: { type: Type.STRING },
              content: { type: Type.STRING },
              evidence: { type: Type.STRING },
              evaluation: { type: Type.STRING },
              bibliography: { type: Type.STRING }
            },
            required: ["num", "topic", "activities", "objective"]
          }
        },
        bibliography: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        evaluation: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              activity: { type: Type.STRING },
              percentage: { type: Type.INTEGER }
            },
            required: ["activity", "percentage"]
          }
        },
        warnings: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
      required: ["course", "sessions", "bibliography", "evaluation", "warnings"]
    };

    const prompt = `${instructions}

    Analiza taxonómicamente el siguiente temario académico:
    
    ${text}`;

    // Usamos el servicio centralizado con reintentos y modelos corregidos
    const result = await callGeminiWithRetry(prompt, {
      responseMimeType: "application/json",
      responseSchema: responseSchema
    });

    const responseText = result.text;
    
    if (!responseText) {
      throw new Error("La respuesta de la IA está vacía.");
    }

    const resultJson: SyllabusResult = JSON.parse(responseText);

    // Trazas de Logs de Auditoría Curricular
    console.log(`[SYLLABUS] Course name: ${resultJson.course.name}`);
    console.log(`[SYLLABUS] Course code: ${resultJson.course.code}`);
    console.log(`[SYLLABUS] General objective detected: ${!!resultJson.course.generalObjective}`);
    console.log(`[SYLLABUS] Sessions detected: ${resultJson.sessions.length}`);
    if (resultJson.sessions.length > 0) {
      console.log(`[SYLLABUS] Session 1 topic: ${resultJson.sessions[0].topic}`);
    }
    console.log(`[SYLLABUS] Evaluation items detected: ${resultJson.evaluation.length}`);
    console.log(`[SYLLABUS] Bibliography items detected: ${resultJson.bibliography.length}`);
    console.log(`[SYLLABUS] Warnings: ${JSON.stringify(resultJson.warnings)}`);

    return resultJson;
  }

  /**
   * Extrae específicamente los criterios de evaluación del temario.
   */
  public async extractEvaluation(text: string): Promise<any[]> {
    const prompt = `Actúa como un analista de currículo. Tu tarea es extraer EXCLUSIVAMENTE los criterios de evaluación y sus porcentajes del siguiente temario académico.
    
    Busca tablas o listas con porcentajes (ej. "Asistencia 10%", "Examen 40%", etc.).
    
    Formato de salida esperado (JSON):
    {
      "evaluation": [
        { "activity": "Nombre de la actividad", "percentage": 10 }
      ]
    }
    
    Temario:
    ${text}`;

    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        evaluation: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              activity: { type: Type.STRING },
              percentage: { type: Type.INTEGER }
            },
            required: ["activity", "percentage"]
          }
        }
      },
      required: ["evaluation"]
    };

    const result = await callGeminiWithRetry(prompt, {
      responseMimeType: "application/json",
      responseSchema: responseSchema
    });

    const resultJson = JSON.parse(result.text);
    return resultJson.evaluation || [];
  }
}
