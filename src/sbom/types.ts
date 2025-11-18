import type { Vulnerability } from '../scanner/types.js';

export type SbomFormat = 'cyclonedx' | 'spdx';

export interface SbomGenerateOptions {
  projectPath: string;
  format?: SbomFormat;
  includeDevDependencies?: boolean;
  attachVulnerabilities?: boolean;
  outputFile?: string;
  metadata?: {
    supplier?: string;
    componentName?: string;
    componentVersion?: string;
  };
}

export interface SbomStats {
  totalComponents: number;
  directDependencies: number;
  devDependencies: number;
}

export interface SbomGenerationResult {
  format: SbomFormat;
  document: Record<string, any>;
  outputPath?: string;
  generatedAt: Date;
  stats: SbomStats;
  vulnerabilities: Vulnerability[];
  embeddedVulnerabilities: boolean;
}
