# SecureSync

Intelligent dependency security scanner with auto-fix capabilities. SecureSync goes beyond traditional vulnerability scanners by analyzing breaking changes, generating migration scripts, running tests, and finding secure alternatives to abandoned packages.

## Features

- **Vulnerability Detection**: Scan npm, Python, Go, and Rust dependencies for CVEs
- **Breaking Change Analysis**: Detect API changes before updating dependencies
- **Smart Remediation**: Generate migration scripts for breaking API changes
- **Alternative Finder**: Identify secure replacements for abandoned packages
- **Test-Driven Updates**: Run tests before/after updates, rollback on failure
- **Fast Scanning**: Dependency graph analysis in < 5 seconds for medium projects
- **CI/CD Integration**: GitHub Actions, GitLab CI, Jenkins plugins ready
- **Interactive CLI**: Beautiful terminal UI with progress indicators
- **Programmatic API**: Use as library in other tools

## Installation

```bash
npm install -g securesync
```

Or use with npx:

```bash
npx securesync scan
```

## Quick Start

### Scan for Vulnerabilities

```bash
securesync scan
```

### Auto-Fix Vulnerabilities

```bash
securesync fix
```

### Analyze Breaking Changes

```bash
securesync analyze lodash 4.17.20 4.17.21
```

### Find Alternative Packages

```bash
securesync alternatives moment
```

### Generate Migration Scripts

```bash
securesync migrate react 17.0.0 18.0.0
```

## CLI Usage

### Scan Command

Scan your project for security vulnerabilities:

```bash
securesync scan [path]

Options:
  -d, --dev              Include dev dependencies
  -r, --reachability     Analyze vulnerability reachability
  --enhance              Enhance with additional vulnerability databases
  --fail-on <severity>   Exit with error if vulnerabilities found (low|moderate|high|critical)
  --json                 Output results as JSON
```

### Fix Command

Automatically fix vulnerabilities:

```bash
securesync fix [path]

Options:
  --auto                 Automatically apply fixes without prompts
  --no-test              Skip running tests
  --max-severity <level> Only fix up to this severity (default: critical)
  --breaking-changes <action> Handle breaking changes (skip|warn|allow)
```

### Analyze Command

Analyze breaking changes for a package update:

```bash
securesync analyze <package> <from-version> <to-version>

Options:
  --json    Output results as JSON
```

### Alternatives Command

Find alternative packages:

```bash
securesync alternatives <package>

Options:
  --min-downloads <number>   Minimum weekly downloads
  --max-age <days>           Maximum days since last publish
  --min-stars <number>       Minimum GitHub stars
  --zero-vulns               Only show packages with zero vulnerabilities
  --min-compat <number>      Minimum API compatibility score (0-100)
  --json                     Output results as JSON
```

### Migrate Command

Generate migration scripts:

```bash
securesync migrate <package> <to-version>

Options:
  -p, --path <path>      Project path (default: cwd)
  --from <version>       Current version (auto-detected if not provided)
  --output <path>        Output directory for migration scripts
  --json                 Output as JSON
```

## Programmatic API

Use SecureSync in your own tools:

```typescript
import { SecureSync } from 'securesync';

const scanner = new SecureSync({
  projectPath: process.cwd(),
  autoFix: true,
  testBeforeUpdate: true,
});

// Scan for vulnerabilities
const results = await scanner.scan();
console.log(`Found ${results.vulnerabilities.length} vulnerabilities`);

// Auto-fix with test verification
const fixes = await scanner.fix({
  maxSeverity: 'moderate',
  breakingChanges: 'warn',
});

console.log(`Fixed ${fixes.packagesUpdated} packages`);

// Find alternatives
const alternatives = await scanner.findAlternatives('lodash');
console.log('Top alternatives:', alternatives.slice(0, 3));

// Visualize dependency graph
const graph = await scanner.visualizeDependencies({
  format: 'tree',
  highlightVulnerabilities: true,
});
console.log(graph);
```

## API Reference

### SecureSync Class

```typescript
class SecureSync {
  constructor(options: SecureSyncOptions);

  scan(options?: ScanOptions): Promise<ScanResult>;
  analyzeBreakingChanges(pkg: string, from: string, to: string): Promise<BreakingChangeAnalysis>;
  generateMigrations(pkg: string, changes: BreakingChangeAnalysis): Promise<Migration[]>;
  fix(options?: FixOptions): Promise<FixReport>;
  findAlternatives(pkg: string, criteria?: SearchCriteria): Promise<Alternative[]>;
  visualizeDependencies(options?: VisualizationOptions): Promise<string>;
  getDependencyGraph(): Promise<DependencyGraph>;
}
```

### Standalone Functions

```typescript
// Scanner
import { scanNpmProject } from 'securesync';
const results = await scanNpmProject('/path/to/project');

// Analyzer
import { analyzeBreakingChanges } from 'securesync';
const analysis = await analyzeBreakingChanges('lodash', '4.17.20', '4.17.21');

// Remediation
import { generateMigration, testDrivenUpdate } from 'securesync';
const migrations = await generateMigration('/path', 'lodash', changes);
const result = await testDrivenUpdate('/path', 'lodash', '4.17.21', migrations);

// Alternatives
import { findAlternatives } from 'securesync';
const alternatives = await findAlternatives('moment');

// Graph
import { buildGraph, visualize } from 'securesync';
const graph = buildGraph(dependencyTree);
const output = visualize(graph, { format: 'tree' });
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Security Scan

on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npx securesync scan --fail-on high
      - run: npx securesync fix --auto
```

### GitLab CI

```yaml
security_scan:
  script:
    - npx securesync scan --fail-on high
    - npx securesync fix --auto
```

## Configuration

Create a `.securesyncrc.json` file in your project root:

```json
{
  "autoFix": false,
  "testBeforeUpdate": true,
  "createBackup": true,
  "maxSeverity": "moderate",
  "breakingChanges": "warn",
  "excludePackages": ["package-to-ignore"],
  "includeDevDependencies": false
}
```

## Examples

### Example 1: Scan and Report

```typescript
import { scanNpmProject } from 'securesync';

const results = await scanNpmProject('./my-project');

console.log('Vulnerability Summary:');
console.log(`  Critical: ${results.summary.critical}`);
console.log(`  High: ${results.summary.high}`);
console.log(`  Moderate: ${results.summary.moderate}`);
console.log(`  Low: ${results.summary.low}`);

for (const vuln of results.vulnerabilities) {
  console.log(`\n${vuln.id}: ${vuln.package}@${vuln.version}`);
  console.log(`  Severity: ${vuln.severity}`);
  console.log(`  Patched in: ${vuln.patched.join(', ')}`);
}
```

### Example 2: Safe Update with Rollback

```typescript
import { SecureSync } from 'securesync';

const sync = new SecureSync({
  projectPath: './my-project',
  testBeforeUpdate: true,
  createBackup: true,
});

const report = await sync.fix({
  maxSeverity: 'high',
  breakingChanges: 'skip',
  dryRun: false,
});

if (report.packagesFailed > 0) {
  console.error('Some packages failed to update:');
  for (const result of report.results) {
    if (!result.success) {
      console.error(`  ${result.package}: ${result.reason}`);
      if (result.rolledBack) {
        console.error('    (rolled back)');
      }
    }
  }
}
```

### Example 3: Find and Migrate to Alternative

```typescript
import { findAlternatives } from 'securesync';

const alternatives = await findAlternatives('moment', {
  zeroVulnerabilities: true,
  minDownloads: 100000,
  minCompatibility: 70,
});

console.log('Best alternatives to moment:');
for (const alt of alternatives.slice(0, 3)) {
  console.log(`\n${alt.name} (score: ${alt.score}/100)`);
  console.log(`  Downloads: ${alt.downloads}/week`);
  console.log(`  Migration effort: ${alt.migrationEffort}`);
  console.log(`  Compatibility: ${alt.compatibility}%`);
}
```

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Type Check

```bash
npm run type-check
```

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines and code of conduct.

## Support

- GitHub Issues: [https://github.com/yourusername/securesync/issues](https://github.com/yourusername/securesync/issues)
- Documentation: [https://securesync.dev/docs](https://securesync.dev/docs)

## Acknowledgments

SecureSync builds upon the excellent work of:
- npm audit
- Snyk
- OSV (Open Source Vulnerabilities)
- NIST NVD

---

Made with care for the open source community.
