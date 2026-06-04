import { GoogleGenAI, Type, Schema } from "@google/genai";
import { getGeminiClient } from "../../geminiService";

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
  course: SyllabusCourse;
  topics: SyllabusTopic[];
  activities: SyllabusActivity[];
  evaluation: SyllabusEvaluation[];
  resources: string[];
  warnings: string[];
}

export class SyllabusParser {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = getGeminiClient();
  }

  /**
   * Realiza un análisis taxonómico infalible de temarios académicos.
   * La firma se mantiene como Promise<any> por requerimiento técnico.
   */
  public async parse(text: string, numWeeks: number = 14): Promise<any> {
    const systemPrompt = `Actúa como un clasificador curricular universitario riguroso. Tu objetivo es realizar un análisis taxonómico infalible del temario académico proporcionado.
    
    INSTRUCCIONES DE PROCESAMIENTO:
    - Normaliza acentos, mayúsculas y espacios para identificar variaciones de cabeceras equivalentes a: DENOMINACIÓN DE LA ASIGNATURA, FINES DEL APRENDIZAJE, CONTENIDO TEMÁTICO, ACTIVIDADES DE APRENDIZAJE y CRITERIOS DE EVALUACIÓN.
    
    REGLAS DE EXCLUSIÓN SEMÁNTICA:
    - REGLA DE EXCLUSIÓN DE TEMAS: Un tema principal válido solo existe si está bajo la sección temática, posee numeración entera o subtemas asociados (ej. 1.1, 1.2). Queda estrictamente PROHIBIDO clasificar actividades, tareas, evidencias, porcentajes, recursos o libros de bibliografía como parte de los 'topics'.
    - REGLA DE RUIDO ESTRUCTURAL: Si aparece una numeración aislada sin título asociado (ej. "2.", "4.", "8."), debe ignorarse por completo. No crees temas vacíos.
    - CLASIFICACIÓN DE ACTIVIDADES: Todo lo que describa diseños de trípticos, mapas sinópticos o análisis de casos debe ser aislado como 'estrategia' o 'evidencia' dentro del arreglo de actividades.
    
    ESPECIFICACIONES DEL FORMATO:
    - Genera una estructura JSON limpia y validable.
    - Si detectas ambigüedades o los porcentajes de evaluación no suman 100%, deposita una alerta descriptiva en el campo 'warnings'.`;

    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        course: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            code: { type: Type.STRING },
            level: { type: Type.STRING },
            program: { type: Type.STRING },
            generalObjective: { type: Type.STRING }
          },
          required: ["name", "code", "level", "program", "generalObjective"]
        },
        topics: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              number: { type: Type.STRING },
              title: { type: Type.STRING },
              subtopics: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["number", "title", "subtopics"]
          }
        },
        activities: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: ["evidencia", "estrategia"] },
              description: { type: Type.STRING }
            },
            required: ["type", "description"]
          }
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
        resources: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        warnings: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
      required: ["course", "topics", "activities", "evaluation", "resources", "warnings"]
    };

    const prompt = `Analiza taxonómicamente el siguiente temario académico:
    
    ${text}`;

    const result = await this.ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
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
    console.log(`[SYLLABUS] Topics detected: ${resultJson.topics.length}`);
    if (resultJson.topics.length > 0) {
      console.log(`[SYLLABUS] Topic 1: ${resultJson.topics[0].title}`);
      console.log(`[SYLLABUS] Subtopics for topic 1: ${resultJson.topics[0].subtopics.length}`);
    }
    console.log(`[SYLLABUS] Activities detected: ${resultJson.activities.length}`);
    console.log(`[SYLLABUS] Evaluation items detected: ${resultJson.evaluation.length}`);
    console.log(`[SYLLABUS] Resources detected: ${resultJson.resources.length}`);
    console.log(`[SYLLABUS] Warnings: ${JSON.stringify(resultJson.warnings)}`);

    return resultJson;
  }
}
