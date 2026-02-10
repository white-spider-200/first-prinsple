export enum NodeType {
  ROOT = 'ROOT',
  COMPONENT = 'COMPONENT',
  FUNDAMENTAL = 'FUNDAMENTAL',
  ASSUMPTION = 'ASSUMPTION'
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
  reasoning?: string; // Explanation of why it is this type
}

export interface TreeStructure {
  root: NodeData | null;
}

export interface DecompositionResponse {
  components: Array<{
    name: string;
    description: string;
    isFundamental: boolean;
    reasoning: string;
  }>;
  assumptions: string[];
}

export interface FundamentalCheckResponse {
  isFundamental: boolean;
  reasoning: string;
  subComponents?: Array<{
    name: string;
    description: string;
  }>;
}