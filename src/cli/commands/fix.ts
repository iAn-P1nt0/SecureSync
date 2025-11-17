import { Command } from 'commander';
import { scanNpmProject } from '../../scanner/index.js';
import { analyzeBreakingChanges } from '../../analyzer/index.js';
import { generateMigration, testDrivenUpdate } from '../../remediation/index.js';
import { ui } from '../ui.js';
import inquirer from 'inquirer';

export function createFixCommand(): Command {
  const command = new Command('fix');

  command
    .description('Auto-fix vulnerabilities')
    .argument('[path]', 'Project path', process.cwd())
    .option('--auto', 'Automatically apply fixes without prompts', false)
    .option('--no-test', 'Skip running tests', false)
    .option('--max-severity <level>', 'Only fix vulnerabilities up to this severity', 'critical')
    .option('--breaking-changes <action>', 'How to handle breaking changes (skip, warn, allow)', 'warn')
    .action(async (path: string, options: any) => {
      try {
        // Step 1: Scan for vulnerabilities
        ui.startSpinner('Scanning for vulnerabilities...');
        const scanResults = await scanNpmProject(path, {
          projectPath: path,
          includeDevDependencies: false,
        });
        ui.stopSpinner(true, `Found ${scanResults.vulnerabilities.length} vulnerabilities`);

        if (scanResults.vulnerabilities.length === 0) {
          ui.success('No vulnerabilities to fix!');
          return;
        }

        // Filter by severity
        const severityLevels = ['low', 'moderate', 'high', 'critical'];
        const maxSeverityIndex = severityLevels.indexOf(options.maxSeverity.toLowerCase());
        const vulnsToFix = scanResults.vulnerabilities.filter(v => {
          const vulnIndex = severityLevels.indexOf(v.severity);
          return vulnIndex >= maxSeverityIndex;
        });

        ui.info(`Found ${vulnsToFix.length} vulnerabilities matching severity criteria`);

        // Step 2: Group vulnerabilities by package
        const packageUpdates = new Map<string, { current: string; patched: string[] }>();
        for (const vuln of vulnsToFix) {
          if (!packageUpdates.has(vuln.package)) {
            packageUpdates.set(vuln.package, {
              current: vuln.version,
              patched: vuln.patched,
            });
          }
        }

        // Step 3: For each package, analyze breaking changes and generate migrations
        for (const [packageName, update] of packageUpdates) {
          const targetVersion = update.patched[0]; // Use first patched version
          if (!targetVersion) {
            ui.warning(`No patched version available for ${packageName}`);
            continue;
          }

          ui.section(`Processing ${packageName}@${update.current} -> ${targetVersion}`);

          // Analyze breaking changes
          ui.startSpinner('Analyzing breaking changes...');
          const analysis = await analyzeBreakingChanges(
            packageName,
            update.current,
            targetVersion
          );
          ui.stopSpinner(true, 'Analysis complete');

          // Handle breaking changes based on policy
          if (analysis.hasBreakingChanges) {
            if (options.breakingChanges === 'skip') {
              ui.warning(`Skipping ${packageName} due to breaking changes`);
              continue;
            } else if (options.breakingChanges === 'warn' && !options.auto) {
              const { proceed } = await inquirer.prompt([
                {
                  type: 'confirm',
                  name: 'proceed',
                  message: `${packageName} has breaking changes. Continue?`,
                  default: false,
                },
              ]);

              if (!proceed) {
                ui.info(`Skipping ${packageName}`);
                continue;
              }
            }
          }

          // Generate migration
          ui.startSpinner('Generating migration scripts...');
          const migrations = await generateMigration(path, packageName, analysis.changes);
          ui.stopSpinner(true, `Generated ${migrations.length} migration(s)`);

          // Apply update with tests
          ui.startSpinner('Applying update...');
          const result = await testDrivenUpdate(path, packageName, targetVersion, migrations, {
            autoApply: options.auto,
            runTests: options.test,
            createBackup: true,
          });

          if (result.success) {
            ui.stopSpinner(true, `Successfully updated ${packageName}`);
          } else {
            ui.stopSpinner(false, `Failed to update ${packageName}`);
            ui.error(result.reason || 'Unknown error');

            if (result.failedTests) {
              ui.error('Failed tests:');
              for (const test of result.failedTests) {
                console.log(`  - ${test}`);
              }
            }

            if (result.rolledBack) {
              ui.info('Changes have been rolled back');
            }
          }
        }

        ui.success('Fix process complete!');
      } catch (error: any) {
        ui.error(error.message);
        process.exit(1);
      }
    });

  return command;
}
