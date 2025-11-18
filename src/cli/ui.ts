import chalk from 'chalk';
import ora, { Ora } from 'ora';
import type { Vulnerability, ScanResult } from '../scanner/types.js';
import type { BreakingChangeAnalysis } from '../analyzer/types.js';
import type { Alternative } from '../alternatives/types.js';
import type { SbomGenerationResult } from '../sbom/types.js';

export class UI {
  private spinner: Ora | null = null;

  startSpinner(text: string): void {
    this.spinner = ora(text).start();
  }

  stopSpinner(success: boolean = true, text?: string): void {
    if (!this.spinner) return;

    if (success) {
      this.spinner.succeed(text);
    } else {
      this.spinner.fail(text);
    }
    this.spinner = null;
  }

  updateSpinner(text: string): void {
    if (this.spinner) {
      this.spinner.text = text;
    }
  }

  success(message: string): void {
    console.log(chalk.green('✓') + ' ' + message);
  }

  error(message: string): void {
    console.log(chalk.red('✗') + ' ' + message);
  }

  warning(message: string): void {
    console.log(chalk.yellow('⚠') + ' ' + message);
  }

  info(message: string): void {
    console.log(chalk.blue('ℹ') + ' ' + message);
  }

  header(title: string): void {
    console.log('\n' + chalk.bold.underline(title) + '\n');
  }

  section(title: string): void {
    console.log('\n' + chalk.bold(title));
  }

  printScanResults(results: ScanResult): void {
    this.header('Security Scan Results');

    // Summary
    console.log(chalk.bold('Summary:'));
    console.log(`  Total packages scanned: ${results.totalPackages}`);
    console.log(`  Vulnerabilities found: ${results.vulnerabilities.length}`);
    console.log(`  Scanned at: ${results.scannedAt.toLocaleString()}\n`);

    // Severity breakdown
    if (results.summary) {
      console.log(chalk.bold('Severity Breakdown:'));
      if (results.summary.critical > 0) {
        console.log(`  ${chalk.red('Critical')}: ${results.summary.critical}`);
      }
      if (results.summary.high > 0) {
        console.log(`  ${chalk.red('High')}: ${results.summary.high}`);
      }
      if (results.summary.moderate > 0) {
        console.log(`  ${chalk.yellow('Moderate')}: ${results.summary.moderate}`);
      }
      if (results.summary.low > 0) {
        console.log(`  ${chalk.blue('Low')}: ${results.summary.low}`);
      }
      console.log();
    }

    // Detailed vulnerabilities
    if (results.vulnerabilities.length > 0) {
      this.section('Vulnerabilities:');
      for (const vuln of results.vulnerabilities) {
        this.printVulnerability(vuln);
      }
    } else {
      this.success('No vulnerabilities found!');
    }
  }

  printVulnerability(vuln: Vulnerability): void {
    const severityColor = this.getSeverityColor(vuln.severity);
    const severity = severityColor(vuln.severity.toUpperCase());

    console.log(`\n  ${chalk.bold(vuln.id)} [${severity}]`);
    console.log(`  Package: ${chalk.cyan(vuln.package)}@${vuln.version}`);
    console.log(`  Description: ${vuln.description}`);

    if (vuln.patched && vuln.patched.length > 0) {
      console.log(`  Patched in: ${chalk.green(vuln.patched.join(', '))}`);
    }

    if (vuln.path && vuln.path.length > 0) {
      console.log(`  Path: ${vuln.path.join(' > ')}`);
    }

    if (vuln.cvss) {
      console.log(`  CVSS Score: ${vuln.cvss}`);
    }
  }

  printBreakingChanges(analysis: BreakingChangeAnalysis): void {
    this.header(`Breaking Change Analysis: ${analysis.packageName}`);

    console.log(`  From: ${chalk.cyan(analysis.fromVersion)}`);
    console.log(`  To: ${chalk.cyan(analysis.toVersion)}`);
    console.log(`  Risk Level: ${this.getRiskColor(analysis.riskLevel)(analysis.riskLevel.toUpperCase())}`);
    console.log(`  Breaking Changes: ${analysis.hasBreakingChanges ? chalk.red('YES') : chalk.green('NO')}`);
    console.log(`  Changes Found: ${analysis.changes.length}\n`);

    if (analysis.changes.length > 0) {
      this.section('Changes:');
      for (const change of analysis.changes) {
        const typeColor = change.type === 'breaking' ? chalk.red : chalk.green;
        console.log(`\n  ${typeColor(change.type.toUpperCase())}: ${change.symbol}`);
        console.log(`  Category: ${change.category}`);

        if (change.before) {
          console.log(`  Before: ${chalk.gray(change.before)}`);
        }
        if (change.after) {
          console.log(`  After: ${chalk.gray(change.after)}`);
        }
        if (change.migration) {
          console.log(`  Migration: ${chalk.cyan(change.migration)}`);
        }
        console.log(`  Confidence: ${Math.round(change.confidence * 100)}%`);
      }
    }
  }

  printAlternatives(alternatives: Alternative[]): void {
    this.header('Alternative Packages');

    if (alternatives.length === 0) {
      this.warning('No suitable alternatives found.');
      return;
    }

    for (let i = 0; i < alternatives.length; i++) {
      const alt = alternatives[i];
      console.log(`\n${chalk.bold(`${i + 1}. ${alt.name}`)} (Score: ${alt.score}/100)`);
      console.log(`   ${alt.description}`);
      console.log(`   Downloads: ${this.formatNumber(alt.downloads)}/week`);
      console.log(`   Last publish: ${this.formatDate(alt.lastPublish)}`);
      console.log(`   Stars: ${this.formatNumber(alt.stars)}`);
      console.log(`   Vulnerabilities: ${alt.vulnerabilities === 0 ? chalk.green('0') : chalk.red(alt.vulnerabilities)}`);
      console.log(`   API Compatibility: ${alt.compatibility}%`);
      console.log(`   Migration Effort: ${this.getMigrationColor(alt.migrationEffort)(alt.migrationEffort.toUpperCase())}`);
    }
  }

  printSbomSummary(result: SbomGenerationResult): void {
    this.header('SBOM Summary');

    console.log(`  Format: ${result.format.toUpperCase()}`);
    console.log(`  Generated: ${result.generatedAt.toLocaleString()}`);
    console.log(`  Components: ${result.stats.totalComponents}`);
    console.log(`    Direct: ${result.stats.directDependencies}`);
    console.log(`    Dev: ${result.stats.devDependencies}`);

    if (result.outputPath) {
      console.log(`  Output: ${result.outputPath}`);
    }

    if (result.embeddedVulnerabilities && result.vulnerabilities.length > 0) {
      const counts = result.vulnerabilities.reduce<Record<'total' | 'low' | 'moderate' | 'high' | 'critical', number>>(
        (acc, vuln) => {
          acc.total += 1;
          acc[vuln.severity] += 1;
          return acc;
        },
        { total: 0, low: 0, moderate: 0, high: 0, critical: 0 }
      );

      console.log('\nVulnerabilities Embedded:');
      console.log(`  Total: ${counts.total}`);
      console.log(`  Critical: ${counts.critical}`);
      console.log(`  High: ${counts.high}`);
      console.log(`  Moderate: ${counts.moderate}`);
      console.log(`  Low: ${counts.low}`);
    } else if (result.vulnerabilities.length > 0) {
      this.info('Vulnerabilities detected but not embedded. Re-run with --attach-vulns to include them in the SBOM.');
    }
  }

  private getSeverityColor(severity: string): typeof chalk.red {
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'high':
        return chalk.red;
      case 'moderate':
        return chalk.yellow;
      case 'low':
        return chalk.blue;
      default:
        return chalk.gray;
    }
  }

  private getRiskColor(risk: string): typeof chalk.red {
    switch (risk.toLowerCase()) {
      case 'high':
        return chalk.red;
      case 'medium':
        return chalk.yellow;
      case 'low':
        return chalk.green;
      default:
        return chalk.gray;
    }
  }

  private getMigrationColor(effort: string): typeof chalk.red {
    switch (effort.toLowerCase()) {
      case 'low':
        return chalk.green;
      case 'medium':
        return chalk.yellow;
      case 'high':
        return chalk.red;
      default:
        return chalk.gray;
    }
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  private formatDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'today';
    } else if (diffDays === 1) {
      return 'yesterday';
    } else if (diffDays < 30) {
      return `${diffDays} days ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} year${years > 1 ? 's' : ''} ago`;
    }
  }
}

export const ui = new UI();
