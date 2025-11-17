import { SecureSync } from '../src/index.js';

async function main() {
  const scanner = new SecureSync({
    projectPath: process.cwd(),
    autoFix: true,
    testBeforeUpdate: true,
    createBackup: true,
  });

  console.log('Auto-fixing vulnerabilities...\n');

  // Run the fix process
  const report = await scanner.fix({
    maxSeverity: 'moderate',
    breakingChanges: 'warn',
    dryRun: false,
  });

  // Print results
  console.log('\nFix Report:');
  console.log('===========');
  console.log(`Total vulnerabilities: ${report.totalVulnerabilities}`);
  console.log(`Vulnerabilities addressed: ${report.vulnerabilitiesFixed}`);
  console.log(`Packages updated: ${report.packagesUpdated}`);
  console.log(`Packages failed: ${report.packagesFailed}\n`);

  // Print details for each package
  console.log('Package Updates:');
  for (const result of report.results) {
    console.log(`\n  ${result.package}`);
    console.log(`    Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);

    if (result.fromVersion && result.toVersion) {
      console.log(`    Version: ${result.fromVersion} → ${result.toVersion}`);
    }

    if (result.migrations && result.migrations.length > 0) {
      console.log(`    Migrations applied: ${result.migrations.length}`);
    }

    if (!result.success) {
      console.log(`    Reason: ${result.reason}`);
      if (result.rolledBack) {
        console.log('    (Changes rolled back)');
      }
    }

    if (result.breakingChanges?.hasBreakingChanges) {
      console.log(`    Breaking changes: ${result.breakingChanges.changes.length}`);
    }
  }
}

main().catch(console.error);
