export enum TimeFrame {
  DAY = 'Past Day',
  WEEK = 'Past Week',
  MONTH = 'Past Month',
  QUARTER = 'Past Quarter',
  YEAR = 'Past Year',
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface RiskReportItem {
  timeFrame: TimeFrame;
  content: string;
  sources: GroundingChunk[];
  timestamp: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
  error?: string;
}

export interface GithubConfig {
  token: string;
  owner: string;
  repo: string;
  path: string;
}

export interface GenerationStatus {
  isGenerating: boolean;
  progress: number; // 0 to 100
  currentAction: string;
}