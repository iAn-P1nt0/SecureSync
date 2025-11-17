import { Command } from 'commander';
import { findAlternatives } from '../../alternatives/index.js';
import { ui } from '../ui.js';

export function createAlternativesCommand(): Command {
  const command = new Command('alternatives');

  command
    .description('Find alternative packages')
    .argument('<package>', 'Package name to find alternatives for')
    .option('--min-downloads <number>', 'Minimum weekly downloads', parseInt)
    .option('--max-age <days>', 'Maximum days since last publish', parseInt)
    .option('--min-stars <number>', 'Minimum GitHub stars', parseInt)
    .option('--zero-vulns', 'Only show packages with zero vulnerabilities', false)
    .option('--min-compat <number>', 'Minimum API compatibility score (0-100)', parseInt)
    .option('--json', 'Output results as JSON', false)
    .action(async (packageName: string, options: any) => {
      try {
        ui.startSpinner(`Finding alternatives for ${packageName}...`);

        const alternatives = await findAlternatives(packageName, {
          minDownloads: options.minDownloads,
          maxAge: options.maxAge,
          minStars: options.minStars,
          zeroVulnerabilities: options.zeroVulns,
          minCompatibility: options.minCompat,
        });

        ui.stopSpinner(true, `Found ${alternatives.length} alternative(s)`);

        if (options.json) {
          console.log(JSON.stringify(alternatives, null, 2));
        } else {
          ui.printAlternatives(alternatives);
        }
      } catch (error: any) {
        ui.stopSpinner(false, 'Search failed');
        ui.error(error.message);
        process.exit(1);
      }
    });

  return command;
}
