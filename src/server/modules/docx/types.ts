export interface DocxSession {
  num: number;
  fecha: string;
  tema: string;
  actividad: string;
  objetivo: string;
}

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
}

export interface TableRoleMap {
  [colIdx: number]: keyof DocxSession;
}

export interface TableMatch {
  tableIndex: number;
  headerRowIndex: number;
  roles: TableRoleMap;
  confidence: number;
  type: 'sessions' | 'evaluation' | 'bibliography';
}
