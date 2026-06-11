import PizZip from 'pizzip';
import { 
  DocxPayload, 
  GenerationSnapshot, 
  PreflightResult, 
  MutationPlan, 
  ExecutionMemory 
} from './types';
import { PreservationEngine } from './engine';
import { InsertionAgent } from '../agents/InsertionAgent';
import { ValidationEngine } from '../validation/validator';
import { askAgentToHealXML, askAgentToInspectXML } from '../../geminiService';

/**
 * Agente Orquestador y Sanador de Documentos (v2 - Arquitectura Agéntica Proactiva)
 * Implementa fases de Preflight, Planning, Simulation, Reflection y Healing.
 */
export class DocxAgentOrchestrator {
  private preservationEngine: PreservationEngine;
  private insertionAgent: InsertionAgent;
  private validationEngine: ValidationEngine;

  constructor() {
    this.preservationEngine = new PreservationEngine();
    this.insertionAgent = new InsertionAgent();
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
    const technicalInfo = this.insertionAgent.inspect(documentXml);

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
      templateFingerprint: `hash_${Date.now()}`, 
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

    // 1. PreservationEngine prepara el documento base (Preserva media, rels, etc)
    const templateBuffer = Buffer.from(snapshot.templateBase64, 'base64');
    const preservedBuffer = await this.preservationEngine.preserve(templateBuffer);

    while (memory.attempt <= memory.maxAttempts) {
      console.log(`[DocxAgentOrchestrator] --- Execution Cycle ${memory.attempt}/${memory.maxAttempts} ---`);
      
      try {
        // 2. InsertionAgent realiza la inyección de datos del syllabus
        // Normalización de datos: Aseguramos que pasamos lo que el agente necesita
        const syllabusData = snapshot.payload;
        const sesiones = (syllabusData as any).sesiones || syllabusData;
        
        const resultBuffer = this.insertionAgent.compile(preservedBuffer, sesiones);
        
        // Recargamos el ZIP para validación
        const zip = new PizZip(resultBuffer);
        memory.touchedFiles = ['word/document.xml'];

        // 3. REFLECT: Bucle de Reflexión/Crítica (Validación final)
        const validation = await this.validationEngine.validate(zip);
        
        if (validation.valid) {
          console.log('[DocxAgentOrchestrator] Reflection: Document is valid. CommitAgent activated.');
          memory.finalDecision = 'commit';
          return resultBuffer;
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
   * Legacy wrapper para compatibilidad
   */
  public async generate(templateBase64: string, payload: DocxPayload): Promise<{ buffer: Buffer; errors?: string[] }> {
    const buffer = await this.runSafeGeneration({ templateBase64, payload });
    return { buffer };
  }
}
