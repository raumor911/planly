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
        // 1. Preservar si ya tiene recursos (didacticResources o resources no vacío)
        const hasDidactic = Array.isArray(session.didacticResources) && session.didacticResources.length > 0;
        const hasResources = typeof session.resources === 'string' && session.resources.trim().length > 5;

        if (hasDidactic || hasResources) {
          console.log(`[DidacticResourceAgent] Sesión ${session.num}: Usando recursos existentes.`);
          return {
            ...session,
            didacticResources: hasDidactic ? session.didacticResources : [session.resources as string]
          };
        }

        // 2. Sugerir recursos si está vacío
        const resources = await this.suggestResources(session.topic || "", originalText);
        console.log(`[DidacticResourceAgent] Sesión ${session.num}: Sugeridos ${resources.length} recursos.`);
        
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
    if (!topic || topic.trim().length < 3) return [];

    const prompt = `Actúa como un estratega instruccional experto.
    
    TAREA: Define 3 recursos didácticos específicos y aplicables para una sesión sobre el tema: "${topic}".
    
    REGLAS:
    1. Si en el contexto proporcionado "${originalText ? originalText.substring(0, 1500) : 'N/A'}" ya se mencionan recursos, prioriza y formaliza esos.
    2. Si no hay recursos en el contexto, sugiere 3 recursos innovadores (ej. plataformas interactivas, tipo de ejercicio práctico, herramienta de visualización o repositorio académico).
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
