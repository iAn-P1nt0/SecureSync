import { scanNpmProject, type ScanResult, type ScanOptions } from '../scanner/index.js';
import { analyzeBreakingChanges, type BreakingChangeAnalysis } from '../analyzer/index.js';
import { generateMigration, testDrivenUpdate, type Migration } from '../remediation/index.js';
import { findAlternatives, type Alternative, type SearchCriteria } from '../alternatives/index.js';
import { buildGraph, visualize, type DependencyGraph, type VisualizationOptions } from '../graph/index.js';
import { generateSbom, type SbomGenerationResult, type SbomGenerateOptions } from '../sbom/index.js';

export interface SecureSyncOptions {
  projectPath: string;
  autoFix?: boolean;
  testBeforeUpdate?: boolean;
  createBackup?: boolean;
}

export class SecureSync {
  private options: SecureSyncOptions;

  constructor(options: SecureSyncOptions) {
    this.options = {
      autoFix: false,
      testBeforeUpdate: true,
      createBackup: true,
      ...options,
    };
  }

  /**
   * Scan project dependencies for vulnerabilities
   */
  async scan(scanOptions?: Partial<ScanOptions>): Promise<ScanResult> {
    return scanNpmProject(this.options.projectPath, {
      projectPath: this.options.projectPath,
      ...scanOptions,
    });
  }

  /**
   * Generate a Software Bill of Materials for the project
   */
  async generateSbom(
    options?: Partial<Omit<SbomGenerateOptions, 'projectPath'>>
  ): Promise<SbomGenerationResult> {
    return generateSbom(this.options.projectPath, {
      projectPath: this.options.projectPath,
      ...options,
    });
  }

  /**
   * Analyze breaking changes for a package update
   */
  async analyzeBreakingChanges(
    packageName: string,
    fromVersion: string,
    toVersion: string
  ): Promise<BreakingChangeAnalysis> {
    return analyzeBreakingChanges(packageName, fromVersion, toVersion);
  }

  /**
   * Generate migration scripts for breaking changes
   */
  async generateMigrations(
    packageName: string,
    changes: BreakingChangeAnalysis
  ): Promise<Migration[]> {
    return generateMigration(
      this.options.projectPath,
      packageName,
      changes.changes
    );
  }

  /**
   * Auto-fix vulnerabilities with optional test-driven approach
   */
  async fix(options?: {
    maxSeverity?: 'low' | 'moderate' | 'high' | 'critical';
    breakingChanges?: 'skip' | 'warn' | 'allow';
    dryRun?: boolean;
  }): Promise<FixReport> {
    const scanResults = await this.scan();
    const maxSeverity = options?.maxSeverity || 'critical';
    const dryRun = options?.dryRun || false;

    const severityLevels = ['low', 'moderate', 'high', 'critical'];
    const maxSeverityIndex = severityLevels.indexOf(maxSeverity);

    const vulnsToFix = scanResults.vulnerabilities.filter(v => {
      const vulnIndex = severityLevels.indexOf(v.severity);
      return vulnIndex >= maxSeverityIndex;
    });

    const packageUpdates = new Map<string, { current: string; patched: string[] }>();
    for (const vuln of vulnsToFix) {
      if (!packageUpdates.has(vuln.package)) {
        packageUpdates.set(vuln.package, {
          current: vuln.version,
          patched: vuln.patched,
        });
      }
    }

    const results: FixResult[] = [];

    for (const [packageName, update] of packageUpdates) {
      const targetVersion = update.patched[0];
      if (!targetVersion) {
        results.push({
          package: packageName,
          success: false,
          reason: 'No patched version available',
        });
        continue;
      }

      // Analyze breaking changes
      const analysis = await this.analyzeBreakingChanges(
        packageName,
        update.current,
        targetVersion
      );

      // Handle breaking changes policy
      if (
        analysis.hasBreakingChanges &&
        options?.breakingChanges === 'skip'
      ) {
        results.push({
          package: packageName,
          success: false,
          reason: 'Breaking changes detected (skipped by policy)',
          breakingChanges: analysis,
        });
        continue;
      }

      // Generate migrations
      const migrations = await this.generateMigrations(packageName, analysis);

      if (dryRun) {
        results.push({
          package: packageName,
          success: true,
          dryRun: true,
          fromVersion: update.current,
          toVersion: targetVersion,
          migrations,
          breakingChanges: analysis.hasBreakingChanges ? analysis : undefined,
        });
        continue;
      }

      // Apply update
      const updateResult = await testDrivenUpdate(
        this.options.projectPath,
        packageName,
        targetVersion,
        migrations,
        {
          autoApply: this.options.autoFix,
          runTests: this.options.testBeforeUpdate,
          createBackup: this.options.createBackup,
        }
      );

      results.push({
        package: packageName,
        success: updateResult.success,
        reason: updateResult.reason,
        fromVersion: update.current,
        toVersion: targetVersion,
        migrations: updateResult.migrations,
        failedTests: updateResult.failedTests,
        rolledBack: updateResult.rolledBack,
      });
    }

    return {
      totalVulnerabilities: scanResults.vulnerabilities.length,
      vulnerabilitiesFixed: vulnsToFix.length,
      packagesUpdated: results.filter(r => r.success).length,
      packagesFailed: results.filter(r => !r.success).length,
      results,
    };
  }

  /**
   * Find alternative packages
   */
  async findAlternatives(
    packageName: string,
    criteria?: SearchCriteria
  ): Promise<Alternative[]> {
    return findAlternatives(packageName, criteria);
  }

  /**
   * Build and visualize dependency graph
   */
  async visualizeDependencies(options?: VisualizationOptions): Promise<string> {
    const scanResults = await this.scan();
    const graph = buildGraph(scanResults.dependencies);
    return visualize(graph, options);
  }

  /**
   * Get dependency graph
   */
  async getDependencyGraph(): Promise<DependencyGraph> {
    const scanResults = await this.scan();
    return buildGraph(scanResults.dependencies);
  }
}

export interface FixResult {
  package: string;
  success: boolean;
  reason?: string;
  fromVersion?: string;
  toVersion?: string;
  migrations?: Migration[];
  breakingChanges?: BreakingChangeAnalysis;
  failedTests?: string[];
  rolledBack?: boolean;
  dryRun?: boolean;
}

export interface FixReport {
  totalVulnerabilities: number;
  vulnerabilitiesFixed: number;
  packagesUpdated: number;
  packagesFailed: number;
  results: FixResult[];
}
