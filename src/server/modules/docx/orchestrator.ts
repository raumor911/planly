import PizZip from 'pizzip';
import { 
  DocxPayload, 
  GenerationSnapshot, 
  PreflightResult, 
  MutationPlan, 
  ExecutionMemory 
} from './types';
import { PreservationEngine } from './engine';
import { ValidationEngine } from '../validation/validator';
import { askAgentToHealXML, askAgentToInspectXML } from '../../geminiService';

/**
 * Agente Orquestador y Sanador de Documentos (v2 - Arquitectura Agéntica Proactiva)
 * Implementa fases de Preflight, Planning, Simulation, Reflection y Healing.
 */
export class DocxAgentOrchestrator {
  private preservationEngine: PreservationEngine;
  private validationEngine: ValidationEngine;

  constructor() {
    this.preservationEngine = new PreservationEngine();
    this.validationEngine = new ValidationEngine();
  }

  /**
   * FASE 1: PREFLIGHT - Inspección proactiva de la plantilla
   */
  public async runPreflight(templateBase64: string): Promise<PreflightResult> {
    console.log('[DocxAgentOrchestrator] Running Preflight Analysis...');
    const zip = new PizZip(Buffer.from(templateBase64, 'base64'));
    const documentXml = zip.file('word/document.xml')?.asText() || '';

    // Tools: Inspección técnica local
    const technicalInfo = this.preservationEngine.inspect(documentXml);

    // Agente: Inspección inteligente con Gemini
    const agentInspection = await askAgentToInspectXML(documentXml);

    // MutationPlannerAgent: Generación de borrador de plan
    const planDraft: MutationPlan = {
      filesToMutate: ['word/document.xml'],
      placeholders: {}, // Se llenará en la fase de generación real
      tableMutations: [], // Se detectará en caliente o mediante el inspector
      riskyNodes: agentInspection.riskyNodes
    };

    return {
      templateFingerprint: `hash_${Date.now()}`, // En producción usar un hash real del buffer
      riskScore: agentInspection.riskScore,
      issues: agentInspection.issues,
      detectedStructures: {
        placeholders: technicalInfo.placeholders,
        tables: technicalInfo.tablesCount,
        headers: Object.keys(zip.files).some(k => k.startsWith('word/header')),
        footers: Object.keys(zip.files).some(k => k.startsWith('word/footer'))
      },
      planDraft
    };
  }

  /**
   * FASE 2: GENERACIÓN SEGURA - Bucle agéntico de mutación y sanación
   */
  public async runSafeGeneration(snapshot: GenerationSnapshot, preflightPlan?: MutationPlan): Promise<Buffer> {
    console.log('[DocxAgentOrchestrator] Starting Safe Generation Flow...');
    
    // MEMORY: Inicialización del estado de ejecución
    const memory: ExecutionMemory = {
      attempt: 1,
      maxAttempts: 3,
      templateFingerprint: 'current_gen',
      detectedPlaceholders: [],
      riskyNodes: preflightPlan?.riskyNodes || [],
      mutationPlan: preflightPlan,
      validationErrors: [],
      healedFragments: {},
      touchedFiles: [],
      finalDecision: 'retry'
    };

    let zip = new PizZip(Buffer.from(snapshot.templateBase64, 'base64'));

    while (memory.attempt <= memory.maxAttempts) {
      console.log(`[DocxAgentOrchestrator] --- Execution Cycle ${memory.attempt}/${memory.maxAttempts} ---`);
      
      try {
        // ACTION: Safe Simulation / Mutation
        // El PreservationEngine aplica el plan (o usa heurísticas si no hay plan)
        zip = await this.preservationEngine.process(zip, snapshot.payload);
        memory.touchedFiles = ['word/document.xml']; // Simplificado para este ejemplo

        // REFLECT: Bucle de Reflexión/Crítica
        const validation = await this.validationEngine.validate(zip);
        
        if (validation.valid) {
          console.log('[DocxAgentOrchestrator] Reflection: Document is valid. CommitAgent activated.');
          memory.finalDecision = 'commit';
          return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
        }

        // Reflection Negativa: Analizar fallos
        console.warn(`[DocxAgentOrchestrator] Reflection: Corruption detected in attempt ${memory.attempt}.`, validation.errors);
        memory.validationErrors.push(...validation.errors);

        if (memory.attempt >= memory.maxAttempts) {
          memory.finalDecision = 'abort';
          throw new Error(`Max healing attempts reached. Corruption persists: ${validation.errors.join(', ')}`);
        }

        // ACTION: HealingAgent - Sanación proactiva con IA
        console.log('[DocxAgentOrchestrator] HealingAgent: Repairing damaged fragments...');
        await this.healDamagedFiles(zip, validation.errors.join('\n'), memory);
        
        memory.attempt++;

      } catch (error: any) {
        console.error(`[DocxAgentOrchestrator] Cycle Error (Attempt ${memory.attempt}):`, error.message);
        if (memory.attempt >= memory.maxAttempts) throw error;
        memory.attempt++;
      }
    }

    throw new Error('Agentic loop ended unexpectedly without commit.');
  }

  /**
   * HealingAgent: Identifica y repara archivos dañados
   */
  private async healDamagedFiles(zip: PizZip, errorLog: string, memory: ExecutionMemory): Promise<void> {
    // Por ahora nos enfocamos en document.xml que es donde ocurre el 90% de la corrupción
    const path = 'word/document.xml';
    const currentXml = zip.file(path)?.asText();
    
    if (!currentXml) return;

    // Llamada al agente experto
    const healedXml = await askAgentToHealXML(currentXml, errorLog);
    
    // Memory Update
    memory.healedFragments[path] = healedXml;
    
    // ZIP Reinjection Tool
    zip.file(path, healedXml);
    console.log(`[DocxAgentOrchestrator] File ${path} healed and re-injected.`);
  }

  /**
   * Legacy wrapper para compatibilidad (si es necesario)
   */
  public async generate(templateBase64: string, payload: DocxPayload): Promise<{ buffer: Buffer; errors?: string[] }> {
    const buffer = await this.runSafeGeneration({ templateBase64, payload });
    return { buffer };
  }
}
