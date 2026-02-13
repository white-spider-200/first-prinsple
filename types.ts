
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
  isMastered?: boolean; // Learning feature: Tracking understanding
  children?: NodeData[];
  assumptions?: string[];
  reasoning?: string;
  core_concept?: string;
  analogy?: string;
  why_important?: string;
  imageUrl?: string;
  sources?: Array<{ title: string; uri: string }>;
  detailedExplanation?: string;
  isElaborating?: boolean;
  learningQuestion?: string; // Socratic learning
  isGeneratingQuestion?: boolean;
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
  predictedTopics?: string[];
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
