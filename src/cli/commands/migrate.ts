import { Command } from 'commander';
import { analyzeBreakingChanges } from '../../analyzer/index.js';
import { generateMigration } from '../../remediation/index.js';
import { ui } from '../ui.js';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export function createMigrateCommand(): Command {
  const command = new Command('migrate');

  command
    .description('Generate migration scripts for a package update')
    .argument('<package>', 'Package name')
    .argument('<to-version>', 'Target version')
    .option('-p, --path <path>', 'Project path', process.cwd())
    .option('--from <version>', 'Current version (auto-detected if not provided)')
    .option('--output <path>', 'Output directory for migration scripts', './migrations')
    .option('--json', 'Output as JSON', false)
    .action(async (packageName: string, toVersion: string, options: any) => {
      try {
        // Detect current version if not provided
        let fromVersion = options.from;
        if (!fromVersion) {
          ui.startSpinner('Detecting current version...');
          fromVersion = await detectCurrentVersion(options.path, packageName);
          ui.stopSpinner(true, `Current version: ${fromVersion}`);
        }

        // Analyze breaking changes
        ui.startSpinner('Analyzing breaking changes...');
        const analysis = await analyzeBreakingChanges(
          packageName,
          fromVersion,
          toVersion
        );
        ui.stopSpinner(true, 'Analysis complete');

        // Generate migrations
        ui.startSpinner('Generating migration scripts...');
        const migrations = await generateMigration(
          options.path,
          packageName,
          analysis.changes
        );
        ui.stopSpinner(true, `Generated ${migrations.length} migration(s)`);

        if (options.json) {
          console.log(JSON.stringify({ analysis, migrations }, null, 2));
          return;
        }

        // Save migration scripts
        if (migrations.length > 0) {
          ui.section('Migration Scripts:');
          for (let i = 0; i < migrations.length; i++) {
            const migration = migrations[i];
            const filename = `${i + 1}-${packageName.replace('/', '-')}-${toVersion}.js`;
            const filepath = join(options.output, filename);

            await writeFile(filepath, migration.script, 'utf-8');
            ui.success(`Saved: ${filepath}`);

            console.log(`\n  File: ${migration.file}`);
            console.log(`  Changes: ${migration.changes.length}`);
            console.log(`  Safe to auto-apply: ${migration.safe ? 'Yes' : 'No'}`);
          }

          ui.info(`\nMigration scripts saved to ${options.output}`);
        } else {
          ui.warning('No migration scripts needed');
        }

        // Print breaking changes summary
        if (analysis.hasBreakingChanges) {
          ui.printBreakingChanges(analysis);
        }
      } catch (error: any) {
        ui.error(error.message);
        process.exit(1);
      }
    });

  return command;
}

async function detectCurrentVersion(projectPath: string, packageName: string): Promise<string> {
  const { readFile } = await import('fs/promises');
  const packageJsonPath = join(projectPath, 'package.json');

  try {
    const content = await readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(content);

    const version =
      packageJson.dependencies?.[packageName] ||
      packageJson.devDependencies?.[packageName];

    if (!version) {
      throw new Error(`Package ${packageName} not found in dependencies`);
    }

    // Remove semver prefix (^, ~, etc.)
    return version.replace(/^[\^~>=<]/, '');
  } catch (error: any) {
    throw new Error(`Failed to detect current version: ${error.message}`);
  }
}
