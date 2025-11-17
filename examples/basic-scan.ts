import { SecureSync } from '../src/index.js';

async function main() {
  // Create a new SecureSync instance
  const scanner = new SecureSync({
    projectPath: process.cwd(),
  });

  console.log('Scanning project for vulnerabilities...\n');

  // Scan for vulnerabilities
  const results = await scanner.scan({
    includeDevDependencies: true,
    analyzeReachability: false,
  });

  // Print summary
  console.log('Scan Results:');
  console.log('=============');
  console.log(`Total packages: ${results.totalPackages}`);
  console.log(`Vulnerabilities found: ${results.vulnerabilities.length}\n`);

  // Print severity breakdown
  console.log('Severity Breakdown:');
  console.log(`  Critical: ${results.summary.critical}`);
  console.log(`  High: ${results.summary.high}`);
  console.log(`  Moderate: ${results.summary.moderate}`);
  console.log(`  Low: ${results.summary.low}\n`);

  // Print each vulnerability
  if (results.vulnerabilities.length > 0) {
    console.log('Vulnerabilities:');
    for (const vuln of results.vulnerabilities) {
      console.log(`\n  ${vuln.id} [${vuln.severity.toUpperCase()}]`);
      console.log(`  Package: ${vuln.package}@${vuln.version}`);
      console.log(`  Description: ${vuln.description}`);
      if (vuln.patched && vuln.patched.length > 0) {
        console.log(`  Patched in: ${vuln.patched.join(', ')}`);
      }
    }
  } else {
    console.log('No vulnerabilities found!');
  }
}

main().catch(console.error);
