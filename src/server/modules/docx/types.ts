export interface DocxActivity {
  description: string;
  strategy: string;
  resources: string[];
}

export interface DocxSession {
  num: number;
  week?: string;
  date?: string;
  unit?: string;
  objective?: string;
  topic?: string;
  subtopics?: string[];
  content?: string;
  activity?: string; // Mantenido para compatibilidad y vista plana
  strategy?: string; // Mantenido para compatibilidad
  resources?: string; // Mantenido para compatibilidad
  activities?: DocxActivity[]; // Nueva estructura jerárquica
  didacticResources?: string[];
  dateReal?: string;
  notes?: string;
  evidence?: string;
  evaluation?: string;
  bibliography?: string;
}

export type SessionRole = keyof DocxSession;

export interface EvaluationItem {
  name: string;
  percentage: number;
}

export interface EvaluationPeriod {
  period: string;
  items: EvaluationItem[];
}

export interface DocxEvaluation {
  firstPartial: EvaluationPeriod;
  secondPartial: EvaluationPeriod;
  final: EvaluationPeriod;
  rawCriteria?: EvaluationItem[]; // Para criterios extraídos directamente del temario
}

export interface BibliographyItem {
  type: 'basic' | 'complementary';
  reference: string;
}

export interface DocxPayload {
  course: {
    name: string;
    code: string;
    generalObjective: string;
  };
  sessions: DocxSession[];
  bibliography: BibliographyItem[];
  evaluation: DocxEvaluation;
  // Campos institucionales opcionales
  professor?: string;
  period?: string;
  group?: string;
  term?: string;
  schedule?: string;
  shift?: string;
}

export interface TableRoleMap {
  [colIdx: number]: SessionRole;
}

export interface TableMatch {
  tableIndex: number;
  headerRowIndex: number;
  roles: TableRoleMap;
  confidence: number;
  type: 'sessions' | 'evaluation' | 'bibliography';
}

/**
 * Snapshot del estado de generación enviado desde el cliente
 */
export interface GenerationSnapshot {
  templateBase64: string;
  payload: DocxPayload;
  syllabusText?: string; // Texto crudo del temario para extracciones extra
  templateMeta?: {
    fileName?: string;
    fileSize?: number;
    uploadedAt?: string;
  };
  userOptions?: Record<string, any>;
}

/**
 * Resultado del análisis previo (Preflight)
 */
export interface PreflightResult {
  templateFingerprint: string;
  riskScore: number; // 0-100
  issues: string[];
  detectedStructures: {
    placeholders: string[];
    tables: number;
    headers: boolean;
    footers: boolean;
  };
  planDraft: MutationPlan;
}

/**
 * Plan de mutación calculado por el MutationPlannerAgent
 */
export interface MutationPlan {
  filesToMutate: string[];
  placeholders: Record<string, string>;
  tableMutations: {
    tableIndex: number;
    headerRowIndex: number;
    roles: TableRoleMap;
    type: 'sessions' | 'evaluation';
  }[];
  riskyNodes: string[]; // XPath o identificadores de nodos frágiles
}

/**
 * Memoria de ejecución del agente orquestador
 */
export interface ExecutionMemory {
  attempt: number;
  maxAttempts: number;
  templateFingerprint: string;
  detectedPlaceholders: string[];
  riskyNodes: string[];
  mutationPlan?: MutationPlan;
  validationErrors: string[];
  healedFragments: Record<string, string>; // Path -> Fragmento corregido
  touchedFiles: string[];
  finalDecision: 'commit' | 'retry' | 'abort';
}
