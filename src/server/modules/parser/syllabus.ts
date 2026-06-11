import { Type, Schema } from "@google/genai";
import { callGeminiWithRetry } from "../../geminiService";

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
    activity: string;
    resources: string;
    objective?: string;
    week?: string;
    unit?: string;
    content?: string;
    evidence?: string;
    evaluation?: string;
    bibliography?: string;
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
    const instructions = `Actúa como un clasificador curricular universitario riguroso. Tu objetivo es realizar un análisis taxonómico infalible del temario académico proporcionado.
    
    INSTRUCCIONES DE PROCESAMIENTO:
    - Divide el contenido en exactamente ${numWeeks} sesiones/semanas. 
    - No agrupes todo en una sola sesión. Distribuye los temas de forma lógica a lo largo de las ${numWeeks} sesiones.
    - Normaliza acentos, mayúsculas y espacios para identificar variaciones de cabeceras equivalentes a: DENOMINACIÓN DE LA ASIGNATURA, FINES DEL APRENDIZAJE, CONTENIDO TEMÁTICO, ACTIVIDADES DE APRENDIZAJE y CRITERIOS DE EVALUACIÓN.
    
    REGLAS DE EXCLUSIÓN SEMÁNTICA:
    - REGLA DE EXCLUSIÓN DE TEMAS: Un tema principal válido solo existe si está bajo la sección temática, posee numeración entera o subtemas asociados (ej. 1.1, 1.2). Queda estrictamente PROHIBIDO clasificar actividades, tareas, evidencias, porcentajes, recursos o libros de bibliografía como parte de los 'topics'.
    - REGLA DE RUIDO ESTRUCTURAL: Si aparece una numeración aislada sin título asociado (ej. "2.", "4.", "8."), debe ignorarse por completo. No crees temas vacíos.
    - CLASIFICACIÓN DE ACTIVIDADES: Todo lo que describa diseños de trípticos, mapas sinópticos o análisis de casos debe ser aislado como 'activity' dentro del arreglo de sesiones.
    
    ESPECIFICACIONES DEL FORMATO:
    - Genera una estructura JSON limpia y validable con exactamente ${numWeeks} elementos en el array 'sessions'.
    - Si detectas ambigüedades o los porcentajes de evaluación no suman 100%, deposita una alerta descriptiva en el campo 'warnings'.`;

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
              activity: { type: Type.STRING },
              resources: { type: Type.STRING },
              objective: { type: Type.STRING },
              week: { type: Type.STRING },
              unit: { type: Type.STRING },
              content: { type: Type.STRING },
              evidence: { type: Type.STRING },
              evaluation: { type: Type.STRING },
              bibliography: { type: Type.STRING }
            },
            required: ["num", "topic", "activity", "resources"]
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
}
