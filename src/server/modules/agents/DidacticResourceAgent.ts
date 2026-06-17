import { callGeminiWithRetry } from "../../geminiService";
import { DocxSession } from "../docx/types";
import { Type } from "@google/genai";

/**
 * Agente de Recursos Didácticos
 * Se encarga de extraer o inferir recursos pedagógicos para cada sesión.
 */
export class DidacticResourceAgent {
  /**
   * Enriquece una lista de sesiones con recursos didácticos sugeridos o extraídos por actividad.
   */
  public async enrichSessions(sessions: DocxSession[], originalText?: string): Promise<DocxSession[]> {
    console.log(`[DidacticResourceAgent] Enriqueciendo ${sessions.length} sesiones con recursos didácticos por actividad...`);

    const enrichedSessions = await Promise.all(
      sessions.map(async (session) => {
        if (session.activities && session.activities.length > 0) {
          const enrichedActivities = await this.enrichActivities(session.activities, session.topic || "", originalText);
          
          // Aplanar recursos para compatibilidad con la vista plana y DOCX simple
          const allResources = Array.from(new Set(enrichedActivities.flatMap(a => a.resources)));
          
          return {
            ...session,
            activities: enrichedActivities,
            didacticResources: allResources,
            resources: allResources.join('\n')
          };
        }

        // Fallback si no hay actividades estructuradas (mantiene lógica anterior)
        const hasDidactic = Array.isArray(session.didacticResources) && session.didacticResources.length > 0;
        const hasResources = typeof session.resources === 'string' && session.resources.trim().length > 5;

        if (hasDidactic || hasResources) {
          return {
            ...session,
            didacticResources: hasDidactic ? session.didacticResources : [session.resources as string]
          };
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
   * Enriquece una lista de actividades con recursos específicos basados en su descripción y estrategia.
   */
  private async enrichActivities(activities: any[], topic: string, originalText?: string): Promise<any[]> {
    return Promise.all(activities.map(async (act) => {
      if (act.resources && act.resources.length > 0) return act;

      const prompt = `Actúa como un estratega instruccional experto.
      
      TAREA: Para la actividad "${act.description}" con estrategia pedagógica "${act.strategy}" dentro del tema "${topic}", sugiere 2-3 recursos didácticos específicos.
      
      REGLAS:
      1. Prioriza recursos que faciliten la ejecución de la estrategia mencionada.
      2. Devuelve exclusivamente un JSON: {"resources": ["recurso1", "recurso2"]}.
      
      Respuesta JSON:`;

      try {
        const config = {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              resources: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["resources"]
          }
        };
        const response = await callGeminiWithRetry(prompt, config);
        const result = JSON.parse(response.text.replace(/```json\n?|```/g, "").trim() || '{"resources": []}');
        return { ...act, resources: result.resources };
      } catch (error) {
        console.error(`[DidacticResourceAgent] Error enriqueciendo actividad:`, error);
        return act;
      }
    }));
  }

  /**
   * Consulta a la IA para sugerir recursos basados en el tema y el contexto original.
   */
  private async suggestResources(topic: string, originalText?: string): Promise<string[]> {
    if (!topic || topic.trim().length < 3) return ["Pizarrón", "Proyector", "Material de lectura"];

    const prompt = `Actúa como un estratega instruccional experto.
    
    TAREA: Define 3 recursos didácticos específicos y aplicables para una sesión sobre el tema: "${topic}".
    
    REGLAS:
    1. Si en el contexto proporcionado "${originalText ? originalText.substring(0, 1500) : 'N/A'}" ya se mencionan recursos, prioriza y formaliza esos.
    2. Si no hay recursos en el contexto, sugiere 3 recursos innovadores y prácticos (ej. "Simulador de estados financieros", "Software de auditoría", "Caso de estudio de la SHCP", "Plataforma Kahoot para evaluación rápida").
    3. Asegura que cada recurso tenga una relación directa y lógica con la naturaleza del tema.
    4. Respuesta: Devuelve exclusivamente un JSON con este formato: {"resources": ["recurso1", "recurso2", "recurso3"]}. No añadas explicaciones adicionales.
    
    Respuesta JSON:`;

    const config = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          resources: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["resources"]
      }
    };

    try {
      const response = await callGeminiWithRetry(prompt, config);
      const text = response.text || "";
      
      // Limpieza defensiva del JSON por si Gemini incluye markdown
      const cleanJson = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const result = JSON.parse(cleanJson || '{"resources": []}');
      
      return Array.isArray(result.resources) ? result.resources : [];
    } catch (error) {
      console.error(`[DidacticResourceAgent] Error sugiriendo recursos para "${topic}":`, error);
      return [];
    }
  }
}
