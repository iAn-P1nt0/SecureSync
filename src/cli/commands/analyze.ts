import { Command } from 'commander';
import { analyzeBreakingChanges } from '../../analyzer/index.js';
import { ui } from '../ui.js';

export function createAnalyzeCommand(): Command {
  const command = new Command('analyze');

  command
    .description('Analyze breaking changes for a package update')
    .argument('<package>', 'Package name')
    .argument('<from-version>', 'Current version')
    .argument('<to-version>', 'Target version')
    .option('--json', 'Output results as JSON', false)
    .action(async (packageName: string, fromVersion: string, toVersion: string, options: any) => {
      try {
        ui.startSpinner(`Analyzing breaking changes for ${packageName}...`);

        const analysis = await analyzeBreakingChanges(
          packageName,
          fromVersion,
          toVersion
        );

        ui.stopSpinner(true, 'Analysis complete');

        if (options.json) {
          console.log(JSON.stringify(analysis, null, 2));
        } else {
          ui.printBreakingChanges(analysis);
        }

        // Exit with error code if breaking changes found
        if (analysis.hasBreakingChanges) {
          process.exit(1);
        }
      } catch (error: any) {
        ui.stopSpinner(false, 'Analysis failed');
        ui.error(error.message);
        process.exit(1);
      }
    });

  return command;
}
