// Main entry point for programmatic API
export { SecureSync } from './api/SecureSync.js';
export type { SecureSyncOptions, FixResult, FixReport } from './api/SecureSync.js';

// Scanner exports
export { scanNpmProject } from './scanner/index.js';
export type {
  Vulnerability,
  DependencyTree,
  DependencyNode,
  PackageInfo,
  ScanResult,
  ScanOptions,
} from './scanner/index.js';

// Analyzer exports
export { analyzeBreakingChanges, analyzeVersionDiff, parseChangelog } from './analyzer/index.js';
export type {
  APIChange,
  BreakingChangeAnalysis,
  ChangelogEntry,
} from './analyzer/index.js';

// Remediation exports
export { generateMigration, testDrivenUpdate, runTests } from './remediation/index.js';
export type {
  CodeChange,
  Migration,
  TestResult,
  UpdateResult,
  RemediationOptions,
} from './remediation/index.js';

// Alternatives exports
export { findAlternatives, scoreAlternative } from './alternatives/index.js';
export type {
  Alternative,
  SearchCriteria,
  PackageMetadata,
  GitHubMetadata,
} from './alternatives/index.js';

// Graph exports
export {
  buildGraph,
  findDependencyPath,
  getDepth,
  getDirectDependencies,
  getTransitiveDependencies,
  visualize,
  printSummary,
} from './graph/index.js';
export type {
  GraphNode,
  DependencyGraph,
  VisualizationOptions,
} from './graph/index.js';

// SBOM exports
export { generateSbom } from './sbom/index.js';
export type {
  SbomGenerateOptions,
  SbomGenerationResult,
  SbomFormat,
  SbomStats,
} from './sbom/index.js';
