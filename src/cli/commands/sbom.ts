import { Command } from 'commander';
import { generateSbom } from '../../sbom/index.js';
import type { SbomFormat } from '../../sbom/index.js';
import { ui } from '../ui.js';

const SUPPORTED_FORMATS: SbomFormat[] = ['cyclonedx', 'spdx'];
const SEVERITIES = ['low', 'moderate', 'high', 'critical'];

export function createSbomCommand(): Command {
  const command = new Command('sbom');

  command
    .description('Generate a Software Bill of Materials (SBOM) for the target project')
    .argument('[path]', 'Project path to analyze', process.cwd())
    .option('--format <format>', 'SBOM format to emit (cyclonedx|spdx)', 'cyclonedx')
    .option('-d, --include-dev', 'Include devDependencies in the SBOM', false)
    .option('--attach-vulns', 'Embed vulnerability findings into the SBOM document', false)
    .option('-o, --output <file>', 'Output file path relative to the project root', '')
    .option('--json', 'Print the generated SBOM JSON to stdout', false)
    .option(
      '--fail-on <severity>',
      'Exit with code 1 if vulnerabilities of the given severity or higher are present',
      ''
    )
    .action(async (path: string, options: any) => {
      try {
        const format = options.format.toLowerCase();
        if (!SUPPORTED_FORMATS.includes(format)) {
          ui.error(`Unsupported SBOM format: ${options.format}`);
          process.exit(1);
        }

        ui.startSpinner('Generating SBOM...');
        const result = await generateSbom(path, {
          projectPath: path,
          format,
          includeDevDependencies: options.includeDev,
          attachVulnerabilities: options.attachVulns,
          outputFile: options.output || undefined,
        });
        ui.stopSpinner(true, 'SBOM generated');

        if (options.json) {
          console.log(JSON.stringify(result.document, null, 2));
        } else {
          ui.printSbomSummary(result);
        }

        handleFailOnOption(result, options.failOn);
      } catch (error: any) {
        ui.stopSpinner(false, 'SBOM generation failed');
        ui.error(error.message);
        process.exit(1);
      }
    });

  return command;
}

function handleFailOnOption(result: Awaited<ReturnType<typeof generateSbom>>, failOn?: string): void {
  if (!failOn) {
    return;
  }

  const normalized = failOn.toLowerCase();
  const failIndex = SEVERITIES.indexOf(normalized);
  if (failIndex === -1) {
    ui.error(`Invalid severity level: ${failOn}`);
    process.exit(1);
  }

  const hasFailingSeverity = result.vulnerabilities.some(
    vuln => SEVERITIES.indexOf(vuln.severity) >= failIndex
  );

  if (hasFailingSeverity) {
    ui.error(`Vulnerabilities with severity ${normalized} or higher detected`);
    process.exit(1);
  }
}
