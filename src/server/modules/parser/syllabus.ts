import { GoogleGenAI, Type } from "@google/genai";
import { DocxPayload } from "../docx/types";
import { getGeminiClient } from "../../geminiService";

export class SyllabusParser {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = getGeminiClient();
  }

  public async parse(text: string, numWeeks: number = 14): Promise<DocxPayload> {
    const prompt = `Analiza el siguiente temario académico y genera una planeación didáctica completa.
    
    Temario:
    ${text}
    
    Debes generar exactamente ${numWeeks} sesiones.
    
    REGLAS:
    1. Identifica el nombre de la materia y el objetivo general.
    2. Divide el contenido en ${numWeeks} sesiones lógicas.
    3. Para la evaluación, asegúrate de que los porcentajes sumen exactamente 100%.
    4. Genera bibliografía básica y complementaria.
    
    Retorna el resultado en el formato JSON especificado.`;

    const config = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          course: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              code: { type: Type.STRING },
              generalObjective: { type: Type.STRING }
            },
            required: ["name", "generalObjective"]
          },
          sessions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                num: { type: Type.INTEGER },
                fecha: { type: Type.STRING },
                tema: { type: Type.STRING },
                actividad: { type: Type.STRING },
                objetivo: { type: Type.STRING }
              },
              required: ["num", "tema", "actividad", "objetivo"]
            }
          },
          bibliography: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ["basic", "complementary"] },
                reference: { type: Type.STRING }
              },
              required: ["type", "reference"]
            }
          },
          evaluation: {
            type: Type.OBJECT,
            properties: {
              firstPartial: this.getEvaluationPeriodSchema(),
              secondPartial: this.getEvaluationPeriodSchema(),
              final: this.getEvaluationPeriodSchema()
            },
            required: ["firstPartial", "secondPartial", "final"]
          }
        },
        required: ["course", "sessions", "bibliography", "evaluation"]
      }
    };

    const ai = getGeminiClient();
    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config
    });

    const responseText = result.text;
    if (!responseText) throw new Error("IA response is empty");
    return JSON.parse(responseText) as DocxPayload;
  }

  private getEvaluationPeriodSchema() {
    return {
      type: Type.OBJECT,
      properties: {
        period: { type: Type.STRING },
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              percentage: { type: Type.INTEGER }
            },
            required: ["name", "percentage"]
          }
        }
      },
      required: ["period", "items"]
    };
  }
}
