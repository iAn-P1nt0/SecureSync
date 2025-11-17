export interface APIChange {
  type: 'breaking' | 'feature' | 'fix';
  category: 'removed' | 'renamed' | 'signature' | 'behavior';
  symbol: string;          // Function/class/interface name
  before: string;          // Old signature
  after: string;           // New signature
  migration?: string;      // Suggested migration code
  confidence: number;      // 0-1 confidence score
  source: 'typescript' | 'changelog' | 'commit' | 'runtime';
}

export interface BreakingChangeAnalysis {
  packageName: string;
  fromVersion: string;
  toVersion: string;
  changes: APIChange[];
  hasBreakingChanges: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  analyzedAt: Date;
}

export interface ChangelogEntry {
  version: string;
  date?: string;
  changes: {
    breaking: string[];
    features: string[];
    fixes: string[];
    other: string[];
  };
}
