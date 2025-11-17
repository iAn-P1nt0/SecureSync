# CLAUDE.md - SecureSync Development Guide

**Project**: SecureSync - Intelligent Dependency Security Scanner with Auto-Fix  
**Purpose**: TypeScript npm package for automated vulnerability detection and remediation  
**Target**: CLI tool + programmatic API  
**Repository**: securesync (npm package name)

---

## 🎯 Project Mission

SecureSync is an intelligent dependency security scanner that goes beyond npm audit by analyzing breaking changes, generating migration scripts, running tests, and finding secure alternatives to abandoned packages. It combines vulnerability detection with automated remediation, making dependency security actionable rather than just informative.

**Core Problem**: npm audit identifies vulnerabilities but doesn't provide actionable solutions for fixing them[271][278][279].

---

## 📋 Core Requirements

### Security & Intelligence
- **Vulnerability detection**: Scan npm, Python, Go, Rust dependencies for CVEs
- **Breaking change analysis**: Detect API changes before updating dependencies[277][280][281]
- **Smart remediation**: Generate migration scripts for breaking API changes[284][288]
- **Alternative finder**: Identify secure replacements for abandoned packages[34][269]
- **Test-driven updates**: Run tests before/after updates, rollback on failure[273][275]

### Performance & Usability
- **Fast scanning**: Dependency graph analysis in < 5 seconds for medium projects[295]
- **Incremental updates**: Only scan changed dependencies
- **CI/CD integration**: GitHub Actions, GitLab CI, Jenkins plugins
- **Interactive CLI**: Beautiful terminal UI with progress indicators
- **Programmatic API**: Use as library in other tools

### Type Safety
- **TypeScript first**: Native TypeScript with strict mode
- **Full type inference**: Comprehensive IntelliSense support
- **Pluggable architecture**: Custom scanners and remediators

---

## 🏗️ Project Architecture

```
securesync/
├── src/
│   ├── scanner/          # Vulnerability scanning engine
│   │   ├── npm.ts        # npm/package.json scanner
│   │   ├── python.ts     # requirements.txt/pyproject.toml
│   │   ├── go.ts         # go.mod scanner
│   │   ├── rust.ts       # Cargo.toml scanner
│   │   └── index.ts      # Scanner orchestrator
│   ├── analyzer/         # Breaking change detection
│   │   ├── api-diff.ts   # API difference analyzer
│   │   ├── semver.ts     # Semantic version analyzer
│   │   ├── changelog.ts  # Changelog parser
│   │   └── index.ts      # Analysis engine
│   ├── remediation/      # Auto-fix engine
│   │   ├── patcher.ts    # Generate patches
│   │   ├── migrator.ts   # Migration script generator
│   │   ├── tester.ts     # Test runner integration
│   │   ├── rollback.ts   # Rollback mechanism
│   │   └── index.ts      # Remediation orchestrator
│   ├── alternatives/     # Package alternative finder
│   │   ├── finder.ts     # Find replacement packages
│   │   ├── scorer.ts     # Score alternatives by quality
│   │   └── index.ts      # Alternative recommendation engine
│   ├── graph/            # Dependency graph builder
│   │   ├── builder.ts    # Build dependency tree
│   │   ├── resolver.ts   # Resolve transitive deps
│   │   └── visualizer.ts # Graph visualization
│   ├── cli/              # Command-line interface
│   │   ├── commands/     # CLI commands
│   │   ├── ui.ts         # Terminal UI components
│   │   └── index.ts      # CLI entry point
│   ├── api/              # Programmatic API
│   ├── utils/            # Shared utilities
│   └── index.ts          # Main entry point
├── tests/
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   ├── fixtures/         # Test fixtures
│   └── e2e/              # End-to-end tests
├── docs/                 # Documentation
├── examples/             # Usage examples
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🛠️ Development Environment

### Required Tools
- **Node.js**: 18+ (for native fetch, test runner)
- **Package Manager**: npm/yarn/pnpm
- **TypeScript**: 5.3+
- **Build Tool**: tsup (fast esbuild-based)
- **Test Runner**: Vitest (fast, native ESM)
- **CLI Framework**: commander.js or oclif

### External APIs/Services
- **npm registry API**: Package metadata and vulnerability data
- **Snyk API**: Enhanced vulnerability database (optional)[276][279]
- **GitHub API**: Repository metadata, release notes, changelogs
- **OSV database**: Open Source Vulnerabilities database[270]
- **NIST NVD**: National Vulnerability Database

### Essential Dependencies
```json
{
  "dependencies": {
    "commander": "^11.0.0",
    "chalk": "^5.0.0",
    "ora": "^7.0.0",
    "inquirer": "^9.0.0",
    "semver": "^7.5.0",
    "pacote": "^17.0.0",
    "npm-registry-fetch": "^16.0.0",
    "fast-diff": "^1.3.0",
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "tsup": "^8.0.0",
    "vitest": "^1.0.0",
    "@types/node": "^20.0.0",
    "@types/semver": "^7.5.0"
  }
}
```

---

## 💻 Coding Standards

### TypeScript Configuration
- **Strict mode**: Enabled (`strict: true`)
- **Target**: ES2022 (top-level await, class fields)
- **Module**: ESNext with node resolution
- **Strict null checks**: Enabled
- **No implicit any**: Enforced

### Code Style
- **Formatting**: Prettier with 2-space indentation
- **Naming**: camelCase for functions, PascalCase for classes/types
- **Exports**: Named exports (tree-shakeable)
- **Error handling**: Explicit error types, no silent failures
- **Logging**: Structured logging with severity levels

### Architecture Patterns
- **Plugin system**: Extensible scanner/remediation plugins
- **Strategy pattern**: Different strategies for different ecosystems
- **Chain of responsibility**: Remediation pipeline
- **Observer pattern**: Progress reporting and events

---

## 🔍 Core Functionality Details

### 1. Vulnerability Scanning Engine

**Purpose**: Scan project dependencies and identify security vulnerabilities[271][274].

**Implementation approach**:
```typescript
// src/scanner/npm.ts
import { parse } from 'path';
import { readFile } from 'fs/promises';
import npmFetch from 'npm-registry-fetch';

export interface Vulnerability {
  id: string;              // CVE-2023-12345
  severity: 'low' | 'moderate' | 'high' | 'critical';
  package: string;         // Package name
  version: string;         // Vulnerable version
  patched: string[];       // Patched versions
  description: string;
  references: string[];
  cvss: number;           // CVSS score
  epss?: number;          // Exploit prediction score
}

export interface ScanResult {
  vulnerabilities: Vulnerability[];
  totalPackages: number;
  scannedAt: Date;
  dependencies: DependencyTree;
}

export async function scanNpmProject(projectPath: string): Promise<ScanResult> {
  // 1. Read package.json and package-lock.json
  const packageJson = await readPackageJson(projectPath);
  const lockfile = await readLockfile(projectPath);
  
  // 2. Build dependency tree (including transitive deps)
  const depTree = buildDependencyTree(packageJson, lockfile);
  
  // 3. Query npm audit API for vulnerabilities
  const auditResult = await queryNpmAudit(depTree);
  
  // 4. Enhance with OSV and NVD data
  const enhanced = await enhanceVulnerabilities(auditResult);
  
  // 5. Calculate reachability (are vulnerable packages used?)
  const reachable = await analyzeReachability(enhanced, projectPath);
  
  return {
    vulnerabilities: reachable,
    totalPackages: depTree.packages.length,
    scannedAt: new Date(),
    dependencies: depTree,
  };
}
```

**Key features**:
- **Transitive dependency scanning**: Scan entire dependency tree, not just direct deps[295][298]
- **Reachability analysis**: Determine if vulnerable code is actually used[298]
- **Multi-source enrichment**: Combine npm audit + OSV + NVD + Snyk data[276][279]
- **CVSS + EPSS scoring**: Use both vulnerability severity and exploitability[298]

---

### 2. Breaking Change Analysis

**Purpose**: Detect API changes before updating to prevent runtime failures[277][280][281][285].

**Implementation approach**:
```typescript
// src/analyzer/api-diff.ts
import { compare } from 'semver';

export interface APIChange {
  type: 'breaking' | 'feature' | 'fix';
  category: 'removed' | 'renamed' | 'signature' | 'behavior';
  symbol: string;          // Function/class/interface name
  before: string;          // Old signature
  after: string;           // New signature
  migration?: string;      // Suggested migration code
  confidence: number;      // 0-1 confidence score
}

export async function analyzeBreakingChanges(
  packageName: string,
  fromVersion: string,
  toVersion: string
): Promise<APIChange[]> {
  // 1. Compare semantic versions
  const versionDiff = compare(fromVersion, toVersion);
  if (versionDiff >= 0) return []; // No upgrade needed
  
  // 2. Download and analyze both package versions
  const oldPackage = await downloadPackage(packageName, fromVersion);
  const newPackage = await downloadPackage(packageName, toVersion);
  
  // 3. Parse TypeScript definitions if available
  const oldTypes = await parseTypeDefinitions(oldPackage);
  const newTypes = await parseTypeDefinitions(newPackage);
  
  // 4. Diff the public API surface
  const apiDiff = diffAPIs(oldTypes, newTypes);
  
  // 5. Parse CHANGELOG.md for migration hints
  const changelog = await parseChangelog(newPackage);
  const migrations = extractMigrations(changelog, apiDiff);
  
  // 6. Classify changes as breaking/non-breaking
  return classifyChanges(apiDiff, migrations);
}
```

**Detection strategies**[284][285][287]:
- **TypeScript definition diff**: Compare .d.ts files
- **Changelog parsing**: Extract breaking changes from CHANGELOG.md
- **Commit analysis**: Analyze git commits for API changes
- **Runtime instrumentation**: Test old code against new package
- **LLM analysis**: Use AI to detect semantic breaking changes[277][280]

---

### 3. Migration Script Generator

**Purpose**: Auto-generate code to migrate from old API to new API[277][281][283][284].

**Implementation approach**:
```typescript
// src/remediation/migrator.ts
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';

export interface Migration {
  file: string;
  changes: CodeChange[];
  script: string;           // Executable migration script
  safe: boolean;            // Whether auto-apply is safe
}

export async function generateMigration(
  projectPath: string,
  changes: APIChange[]
): Promise<Migration[]> {
  const migrations: Migration[] = [];
  
  // 1. Find all files importing the updated package
  const affectedFiles = await findImports(projectPath, changes[0].package);
  
  for (const file of affectedFiles) {
    // 2. Parse file into AST
    const code = await readFile(file, 'utf-8');
    const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
    
    // 3. Find usages of changed APIs
    const usages: CodeChange[] = [];
    traverse(ast, {
      CallExpression(path) {
        const callee = path.node.callee;
        if (isAffectedAPI(callee, changes)) {
          usages.push({
            line: path.node.loc.start.line,
            column: path.node.loc.start.column,
            old: generate(path.node).code,
            new: generateReplacement(path.node, changes),
          });
        }
      },
    });
    
    // 4. Generate migration script
    if (usages.length > 0) {
      migrations.push({
        file,
        changes: usages,
        script: generateScript(file, usages),
        safe: determineSafety(usages),
      });
    }
  }
  
  return migrations;
}
```

**Migration strategies**[284][288]:
- **AST transformation**: Parse and transform code using Babel
- **Codemod generation**: Generate jscodeshift codemods
- **Pattern-based replacement**: Simple find/replace for common patterns
- **LLM-assisted migration**: Use AI for complex semantic changes[277][280]

---

### 4. Test-Driven Update System

**Purpose**: Run tests before/after updates, rollback on failure[273][275].

**Implementation approach**:
```typescript
// src/remediation/tester.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface TestResult {
  passed: boolean;
  output: string;
  duration: number;
  failedTests?: string[];
}

export async function testDrivenUpdate(
  packageName: string,
  newVersion: string,
  migration: Migration[]
): Promise<UpdateResult> {
  // 1. Run tests before update (baseline)
  const baselineTests = await runTests();
  if (!baselineTests.passed) {
    throw new Error('Tests failing before update - fix first');
  }
  
  // 2. Create backup of package.json and lock file
  await createBackup();
  
  try {
    // 3. Update package to new version
    await updatePackage(packageName, newVersion);
    
    // 4. Apply migration scripts
    for (const mig of migration) {
      await applyMigration(mig);
    }
    
    // 5. Run tests after update
    const updatedTests = await runTests();
    
    if (!updatedTests.passed) {
      // 6. Tests failed - rollback everything
      await rollback();
      return {
        success: false,
        reason: 'Tests failed after update',
        failedTests: updatedTests.failedTests,
      };
    }
    
    // 7. Tests passed - commit changes
    await commitChanges();
    return { success: true };
    
  } catch (error) {
    await rollback();
    throw error;
  }
}

async function runTests(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Detect test command from package.json
    const testCommand = await detectTestCommand();
    const { stdout, stderr } = await execAsync(testCommand);
    
    return {
      passed: true,
      output: stdout,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      passed: false,
      output: error.stderr,
      duration: Date.now() - startTime,
      failedTests: parseFailedTests(error.stderr),
    };
  }
}
```

---

### 5. Alternative Package Finder

**Purpose**: Find secure, maintained alternatives to abandoned/vulnerable packages[34][269].

**Implementation approach**:
```typescript
// src/alternatives/finder.ts
export interface Alternative {
  name: string;
  description: string;
  downloads: number;
  lastPublish: Date;
  stars: number;
  issues: number;
  maintainers: number;
  vulnerabilities: number;
  compatibility: number;    // 0-100 compatibility score
  migrationEffort: 'low' | 'medium' | 'high';
}

export async function findAlternatives(
  packageName: string,
  criteria: {
    minDownloads?: number;
    maxAge?: number;        // Days since last publish
    minStars?: number;
    zeroVulnerabilities?: boolean;
  }
): Promise<Alternative[]> {
  // 1. Query npm for similar packages
  const similar = await searchNpm({
    keywords: await extractKeywords(packageName),
    exclude: [packageName],
  });
  
  // 2. Score each alternative
  const scored = await Promise.all(
    similar.map(async (pkg) => ({
      ...pkg,
      score: await scoreAlternative(pkg, packageName),
    }))
  );
  
  // 3. Filter and sort by score
  return scored
    .filter(alt => meetsAcriteria(alt, criteria))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

async function scoreAlternative(
  alternative: Package,
  original: string
): Promise<number> {
  let score = 0;
  
  // Popularity (30%)
  score += (alternative.downloads / 1000000) * 30;
  
  // Maintenance (25%)
  const daysSinceUpdate = daysSince(alternative.lastPublish);
  score += Math.max(0, 25 - daysSinceUpdate / 10);
  
  // Security (25%)
  score += alternative.vulnerabilities === 0 ? 25 : 0;
  
  // API compatibility (20%)
  const compat = await analyzeAPICompatibility(alternative, original);
  score += compat * 20;
  
  return Math.min(100, score);
}
```

---

## 🎨 CLI Design

### Command Structure
```bash
# Scan project for vulnerabilities
securesync scan [path]

# Auto-fix vulnerabilities
securesync fix [options]

# Analyze breaking changes for an update
securesync analyze <package> <from-version> <to-version>

# Find alternatives to a package
securesync alternatives <package>

# Generate migration script
securesync migrate <package> <to-version>

# Interactive mode
securesync interactive
```

### CLI Features
- **Progress indicators**: Ora spinners for long operations
- **Color-coded output**: Chalk for severity levels
- **Interactive prompts**: Inquirer for user decisions
- **Diff visualization**: Beautiful diffs for code changes
- **Summary reports**: Detailed scan reports with statistics

---

## 🧪 Testing Standards

### Test Coverage Requirements
- **Minimum coverage**: 85% for core modules
- **Test types**: Unit, integration, E2E
- **Fixtures**: Real-world project examples
- **Mock external APIs**: Reliable offline testing

### Test Structure
```typescript
// tests/unit/scanner/npm.test.ts
describe('npm scanner', () => {
  describe('scanNpmProject', () => {
    it('detects direct dependency vulnerabilities', async () => {
      const result = await scanNpmProject('./fixtures/vuln-project');
      expect(result.vulnerabilities).toHaveLength(3);
      expect(result.vulnerabilities[0].severity).toBe('high');
    });
    
    it('detects transitive dependency vulnerabilities', async () => {
      const result = await scanNpmProject('./fixtures/transitive-vuln');
      const transitiveVuln = result.vulnerabilities.find(
        v => v.package === 'deep-dependency'
      );
      expect(transitiveVuln).toBeDefined();
    });
    
    it('handles missing package-lock.json', async () => {
      await expect(
        scanNpmProject('./fixtures/no-lockfile')
      ).rejects.toThrow('package-lock.json not found');
    });
  });
});
```

---

## 📦 Package Distribution

### Build Configuration
```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
  target: 'node18',
  banner: {
    js: '#!/usr/bin/env node',  // For CLI executable
  },
});
```

### package.json Configuration
```json
{
  "name": "securesync",
  "version": "1.0.0",
  "description": "Intelligent dependency security scanner with auto-fix",
  "bin": {
    "securesync": "./dist/cli.js"
  },
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## 🔧 Integration Patterns

### GitHub Actions Integration
```yaml
# .github/workflows/securesync.yml
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
      - run: npx securesync fix --auto-merge
```

### Programmatic API Usage
```typescript
import { SecureSync } from 'securesync';

const scanner = new SecureSync({
  projectPath: process.cwd(),
  autoFix: true,
  testBeforeUpdate: true,
});

// Scan for vulnerabilities
const results = await scanner.scan();

// Auto-fix with test verification
const fixes = await scanner.fix({
  maxSeverity: 'moderate',
  breakingChanges: 'warn',
});

// Find alternatives
const alternatives = await scanner.findAlternatives('lodash');
```

---

## 🚨 Critical Design Decisions

### 1. Breaking Change Detection Strategy
**Decision**: Use multi-layered approach combining TypeScript AST analysis, changelog parsing, and optional LLM analysis[277][280][284].

**Rationale**: No single method is 100% accurate. Combining multiple signals increases confidence.

### 2. Test Execution Sandbox
**Decision**: Run tests in isolated environment with rollback capability[273][275].

**Rationale**: Updates can break projects. Must guarantee safe rollback if tests fail.

### 3. Alternative Scoring Algorithm
**Decision**: Weight security (25%) equal to popularity (30%)[34][269].

**Rationale**: Balance between battle-tested packages and secure packages.

### 4. CLI vs API First
**Decision**: Build API first, wrap with CLI[121].

**Rationale**: Enables programmatic usage, CI/CD integration, and testing.

---

## 💡 Tips for Working with Claude

### Effective Prompting
1. **Be specific about ecosystem**: "Scan npm packages" vs "Scan Python packages"
2. **Include security context**: "Prioritize exploitable CVEs using EPSS scores"
3. **Request safe defaults**: "Auto-fix only non-breaking updates by default"
4. **Ask for tests**: "Include test cases for rollback scenarios"

### Iterative Development
1. Start with scanner for single ecosystem (npm)
2. Add breaking change detection
3. Implement test-driven updates
4. Add migration generator
5. Expand to other ecosystems

### Code Review Focus
- Is external API access rate-limited?
- Are tests isolated from network?
- Does rollback restore exact previous state?
- Are breaking changes detected accurately?
- Is the CLI user-friendly?

---

*Last Updated: November 2025*
*For questions or clarifications, consult the repository maintainer or AGENTS.md.*