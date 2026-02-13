
export enum NodeType {
  ROOT = 'ROOT',
  COMPONENT = 'COMPONENT',
  FUNDAMENTAL = 'FUNDAMENTAL',
  ASSUMPTION = 'ASSUMPTION'
}

export enum SearchMode {
  CONCEPT = 'CONCEPT',
  PROBLEM = 'PROBLEM',
  COMPARE = 'COMPARE',
  WHY = 'WHY'
}

export interface NodeData {
  id: string;
  name: string;
  description: string;
  type: NodeType;
  level: number;
  isExpanded?: boolean;
  isLoading?: boolean;
  children?: NodeData[];
  assumptions?: string[];
  reasoning?: string;
  core_concept?: string;
  analogy?: string;
  why_important?: string;
  imageUrl?: string;
  sources?: Array<{ title: string; uri: string }>;
  // New field for on-demand details
  detailedExplanation?: string;
  isElaborating?: boolean;
}

export interface TreeStructure {
  root: NodeData | null;
}

export interface QueryAnalysisResponse {
  originalQuery: string;
  correctedQuery: string;
  intent: SearchMode;
  domain: string;
  isAmbiguous: boolean;
  ambiguityOptions?: string[];
  enrichment: string;
  predictedTopics?: string[]; // For previewing what will be analyzed
  dataSource?: 'AI' | 'FALLBACK';
}

export interface DecompositionResponse {
  core_concept: string;
  analogy: string;
  why_important: string;
  components: Array<{
    name: string;
    description: string;
    isFundamental: boolean;
    reasoning: string;
  }>;
  assumptions: string[];
  sources?: Array<{ title: string; uri: string }>;
  dataSource?: 'AI' | 'FALLBACK';
}

export interface FundamentalCheckResponse {
  isFundamental: boolean;
  reasoning: string;
  subComponents?: Array<{
    name: string;
    description: string;
  }>;
}
