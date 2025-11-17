export interface Alternative {
  name: string;
  description: string;
  downloads: number;
  lastPublish: Date;
  stars: number;
  issues: number;
  maintainers: number;
  vulnerabilities: number;
  compatibility: number;    // 0-100 compatibility score
  migrationEffort: 'low' | 'medium' | 'high';
  score: number;            // Overall score 0-100
}

export interface SearchCriteria {
  minDownloads?: number;
  maxAge?: number;          // Days since last publish
  minStars?: number;
  zeroVulnerabilities?: boolean;
  minCompatibility?: number;
}

export interface PackageMetadata {
  name: string;
  description: string;
  version: string;
  downloads: number;
  lastPublish: Date;
  repository?: string;
  homepage?: string;
  keywords: string[];
  license?: string;
}

export interface GitHubMetadata {
  stars: number;
  forks: number;
  issues: number;
  lastCommit: Date;
  contributors: number;
}
