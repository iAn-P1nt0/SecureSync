import { Command } from 'commander';
import { scanNpmProject } from '../../scanner/index.js';
import { ui } from '../ui.js';

export function createScanCommand(): Command {
  const command = new Command('scan');

  command
    .description('Scan project for security vulnerabilities')
    .argument('[path]', 'Project path to scan', process.cwd())
    .option('-d, --dev', 'Include dev dependencies', false)
    .option('-r, --reachability', 'Analyze vulnerability reachability', false)
    .option('--enhance', 'Enhance with additional vulnerability databases', false)
    .option('--fail-on <severity>', 'Exit with error code if vulnerabilities of severity or higher found', '')
    .option('--json', 'Output results as JSON', false)
    .action(async (path: string, options: any) => {
      try {
        ui.startSpinner('Scanning dependencies...');

        const results = await scanNpmProject(path, {
          projectPath: path,
          includeDevDependencies: options.dev,
          analyzeReachability: options.reachability,
          enhanceWithOSV: options.enhance,
        });

        ui.stopSpinner(true, 'Scan complete');

        if (options.json) {
          console.log(JSON.stringify(results, null, 2));
        } else {
          ui.printScanResults(results);
        }

        // Handle fail-on option
        if (options.failOn) {
          const severityLevels = ['low', 'moderate', 'high', 'critical'];
          const failIndex = severityLevels.indexOf(options.failOn.toLowerCase());

          if (failIndex === -1) {
            ui.error(`Invalid severity level: ${options.failOn}`);
            process.exit(1);
          }

          const hasFailingSeverity = results.vulnerabilities.some(v => {
            const vulnIndex = severityLevels.indexOf(v.severity);
            return vulnIndex >= failIndex;
          });

          if (hasFailingSeverity) {
            ui.error(`Found vulnerabilities with severity ${options.failOn} or higher`);
            process.exit(1);
          }
        }
      } catch (error: any) {
        ui.stopSpinner(false, 'Scan failed');
        ui.error(error.message);
        process.exit(1);
      }
    });

  return command;
}
