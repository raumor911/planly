import { callGeminiWithRetry } from "../../geminiService";
import { DocxSession } from "../docx/types";
import { Type } from "@google/genai";

/**
 * Agente de Recursos Didácticos
 * Se encarga de extraer o inferir recursos pedagógicos para cada sesión.
 */
export class DidacticResourceAgent {
  /**
   * Enriquece una lista de sesiones con recursos didácticos sugeridos o extraídos.
   */
  public async enrichSessions(sessions: DocxSession[], originalText?: string): Promise<DocxSession[]> {
    console.log(`[DidacticResourceAgent] Enriqueciendo ${sessions.length} sesiones con recursos didácticos...`);

    const enrichedSessions = await Promise.all(
      sessions.map(async (session) => {
        // Si ya tiene recursos y no están vacíos, los respetamos
        if (session.didacticResources && session.didacticResources.length > 0) {
          return session;
        }

        const resources = await this.suggestResources(session.topic || "", originalText);
        return {
          ...session,
          didacticResources: resources,
          resources: resources.join('\n')
        };
      })
    );

    return enrichedSessions;
  }

  /**
   * Consulta a la IA para sugerir recursos basados en el tema y el contexto original.
   */
  private async suggestResources(topic: string, originalText?: string): Promise<string[]> {
    if (!topic) return [];

    const prompt = `Analiza el siguiente tema de clase: '${topic}'. 
    
    ${originalText ? `Primero, revisa si en el texto fuente del temario se mencionan recursos específicos para este tema. Texto fuente: "${originalText.substring(0, 2000)}..."` : ""}
    
    Si no se mencionan explícitamente, actúa como un diseñador instruccional experto y genera 3 recursos didácticos de alta calidad (ej. enlaces a herramientas, tipos de ejercicios, materiales visuales, simuladores, bibliografía específica) que sean altamente relevantes y prácticos para este tema.
    
    Devuelve solo una lista JSON con el formato: {"recursos": ["recurso1", "recurso2", "recurso3"]}.`;

    const config = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          recursos: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["recursos"]
      }
    };

    try {
      const response = await callGeminiWithRetry(prompt, config);
      const result = JSON.parse(response.text || '{"recursos": []}');
      return result.recursos || [];
    } catch (error) {
      console.error(`[DidacticResourceAgent] Error sugiriendo recursos para "${topic}":`, error);
      return [];
    }
  }
}
