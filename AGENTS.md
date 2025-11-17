# AGENTS.md - AI Coding Agent Instructions for SecureSync

**Project**: SecureSync - Dependency Security Scanner with Auto-Fix  
**Type**: TypeScript npm CLI tool + Library  
**Agent Compatibility**: Claude Code, GitHub Copilot, Cursor, Zed, OpenCode  
**Last Updated**: November 2025

---

## 📌 Project Overview

SecureSync is an intelligent dependency security scanner that analyzes vulnerabilities, detects breaking changes, generates migration scripts, runs tests, and finds secure alternatives to abandoned packages. It addresses the gap where npm audit identifies issues but doesn't provide actionable remediation[271][278][279].

**Primary Goals:**
1. Automated vulnerability scanning across multiple package ecosystems
2. Breaking change detection before dependency updates[277][280][285]
3. Auto-generated migration scripts for API changes[284][288]
4. Test-driven updates with automatic rollback[273][275]
5. Intelligent alternative package recommendations[34][269]

---

## 🎯 Agent Objectives

When working on SecureSync, AI agents must:

1. **Prioritize security**: All code must handle untrusted input safely
2. **Write defensive code**: Network failures, API rate limits, corrupted data
3. **Test thoroughly**: Security tools require high reliability (>90% coverage)
4. **Document security decisions**: Explain why certain approaches are used
5. **Handle edge cases**: Abandoned packages, malformed lockfiles, network errors
6. **Respect rate limits**: Cache API responses, implement exponential backoff

---

## 🏗️ Project Structure

```
securesync/
├── src/
│   ├── scanner/              # Vulnerability scanning
│   │   ├── npm.ts           # npm/package.json scanner
│   │   ├── python.ts        # Python requirements scanner
│   │   ├── go.ts            # Go modules scanner
│   │   ├── rust.ts          # Rust Cargo scanner
│   │   ├── registry.ts      # Registry API client
│   │   └── index.ts         # Scanner orchestrator
│   ├── analyzer/             # Breaking change detection
│   │   ├── api-diff.ts      # API difference analysis
│   │   ├── semver.ts        # Semantic version checks
│   │   ├── changelog.ts     # Changelog parser
│   │   ├── types.ts         # TypeScript definition diff
│   │   └── index.ts         # Analysis engine
│   ├── remediation/          # Auto-fix engine
│   │   ├── patcher.ts       # Generate update patches
│   │   ├── migrator.ts      # Migration code generator
│   │   ├── tester.ts        # Test runner integration
│   │   ├── rollback.ts      # Rollback mechanism
│   │   └── index.ts         # Remediation orchestrator
│   ├── alternatives/         # Package finder
│   │   ├── finder.ts        # Find alternatives
│   │   ├── scorer.ts        # Score by quality/security
│   │   ├── matcher.ts       # API compatibility matching
│   │   └── index.ts         # Alternative engine
│   ├── graph/                # Dependency graph
│   │   ├── builder.ts       # Build dependency tree
│   │   ├── resolver.ts      # Resolve transitive deps
│   │   ├── reachability.ts  # Analyze code reachability
│   │   └── visualizer.ts    # Graph visualization
│   ├── cli/                  # CLI interface
│   │   ├── commands/        # CLI command handlers
│   │   │   ├── scan.ts
│   │   │   ├── fix.ts
│   │   │   ├── analyze.ts
│   │   │   └── alternatives.ts
│   │   ├── ui.ts            # Terminal UI components
│   │   ├── reporter.ts      # Report formatters
│   │   └── index.ts         # CLI entry
│   ├── api/                  # Programmatic API
│   │   └── index.ts
│   ├── cache/                # Caching layer
│   │   ├── memory.ts        # In-memory cache
│   │   └── disk.ts          # Disk-based cache
│   ├── utils/                # Utilities
│   │   ├── logger.ts
│   │   ├── http.ts          # HTTP client with retry
│   │   └── fs.ts            # File system helpers
│   └── index.ts              # Main entry
├── tests/
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   ├── e2e/                  # End-to-end tests
│   ├── fixtures/             # Test fixtures
│   │   ├── vulnerable-npm/
│   │   ├── breaking-changes/
│   │   └── abandoned-packages/
│   └── mocks/                # API mocks
├── docs/                     # Documentation
├── examples/                 # Usage examples
├── .github/
│   └── workflows/
│       └── securesync.yml    # Example GH Action
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

---

## 🛠️ Development Setup

### Initial Setup Commands
```bash
# Clone and setup
git clone <repo-url>
cd securesync
npm install

# Run in development mode
npm run dev

# Run tests with coverage
npm run test:coverage

# Build for production
npm run build

# Test CLI locally
npm link
securesync scan ./test-project
```

### Essential Commands
```bash
# Development
npm run dev          # Watch mode build
npm run test:watch   # Watch mode tests

# Quality checks
npm run lint         # ESLint
npm run type-check   # TypeScript
npm test             # Run all tests
npm run test:e2e     # End-to-end tests

# Build & publish
npm run build        # Production build
npm run prepublish   # Pre-publish checks
```

---

## 📝 Coding Standards & Conventions

### TypeScript Configuration
- **Target**: ES2022 (top-level await, class fields)
- **Module**: ESNext with node resolution
- **Strict mode**: Enabled (strict: true)
- **No implicit any**: Enforced
- **Strict null checks**: Enabled

### Code Style Rules

#### Security-First Patterns
```typescript
// ✅ CORRECT: Validate untrusted input
function parsePackageJson(data: unknown): PackageJson {
  if (!isObject(data)) {
    throw new Error('Invalid package.json: not an object');
  }
  
  if (!hasProperty(data, 'name') || typeof data.name !== 'string') {
    throw new Error('Invalid package.json: missing name');
  }
  
  return data as PackageJson;
}

// ❌ WRONG: Trust untrusted input
function parsePackageJson(data: any): PackageJson {
  return data; // Unsafe - no validation
}
```

#### Error Handling
```typescript
// ✅ CORRECT: Typed errors with context
export class VulnerabilityError extends Error {
  constructor(
    message: string,
    public readonly package: string,
    public readonly cve: string
  ) {
    super(message);
    this.name = 'VulnerabilityError';
  }
}

throw new VulnerabilityError(
  'Critical vulnerability found',
  'lodash',
  'CVE-2023-12345'
);

// ❌ WRONG: Generic errors without context
throw new Error('Vulnerability found');
```

#### Async Operations with Retry
```typescript
// ✅ CORRECT: Retry with exponential backoff
async function fetchWithRetry<T>(
  url: string,
  options: FetchOptions = {},
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        // Don't retry client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt) * 1000;
      await sleep(delay);
    }
  }
  
  throw new Error('Max retries exceeded');
}

// ❌ WRONG: No retry logic
async function fetch(url: string) {
  const response = await fetch(url);
  return response.json();
}
```

#### Caching Strategy
```typescript
// ✅ CORRECT: Cache with TTL
class VulnerabilityCache {
  private cache = new Map<string, CachedData>();
  private readonly TTL = 1000 * 60 * 60; // 1 hour
  
  async get(key: string): Promise<Vulnerability[] | null> {
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    if (age > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  set(key: string, data: Vulnerability[]): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }
}

// ❌ WRONG: Cache forever
const cache = new Map();
cache.set(key, data); // Never expires
```

---

## 🔍 Core Feature Implementation Guides

### Feature 1: Vulnerability Scanner

**Goal**: Scan dependencies and report vulnerabilities with severity[271][274].

**Step-by-step implementation**:

1. **Parse dependency files**
```typescript
// src/scanner/npm.ts
import { readFile } from 'fs/promises';

export async function readPackageJson(path: string): Promise<PackageJson> {
  const content = await readFile(`${path}/package.json`, 'utf-8');
  const data = JSON.parse(content);
  return validatePackageJson(data);
}

export async function readLockfile(path: string): Promise<Lockfile> {
  const content = await readFile(`${path}/package-lock.json`, 'utf-8');
  const data = JSON.parse(content);
  return validateLockfile(data);
}
```

2. **Build dependency tree**
```typescript
// src/graph/builder.ts
export function buildDependencyTree(
  packageJson: PackageJson,
  lockfile: Lockfile
): DependencyTree {
  const tree: DependencyTree = {
    packages: [],
    edges: [],
  };
  
  // Add direct dependencies
  for (const [name, version] of Object.entries(packageJson.dependencies || {})) {
    tree.packages.push({ name, version, direct: true });
  }
  
  // Add transitive dependencies from lockfile
  for (const [name, info] of Object.entries(lockfile.packages || {})) {
    if (!tree.packages.find(p => p.name === name)) {
      tree.packages.push({
        name,
        version: info.version,
        direct: false,
      });
    }
    
    // Add edges for dependencies
    for (const dep of Object.keys(info.dependencies || {})) {
      tree.edges.push({ from: name, to: dep });
    }
  }
  
  return tree;
}
```

3. **Query vulnerability databases**
```typescript
// src/scanner/registry.ts
export async function queryNpmAudit(
  dependencies: DependencyTree
): Promise<Vulnerability[]> {
  // Use npm registry audit endpoint
  const response = await fetchWithRetry('https://registry.npmjs.org/-/npm/v1/security/audits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dependencies: formatDepsForAudit(dependencies),
    }),
  });
  
  return parseAuditResponse(response);
}

export async function queryOSV(
  packageName: string,
  version: string
): Promise<Vulnerability[]> {
  const response = await fetchWithRetry(
    `https://api.osv.dev/v1/query`,
    {
      method: 'POST',
      body: JSON.stringify({
        package: { name: packageName, ecosystem: 'npm' },
        version,
      }),
    }
  );
  
  return response.vulns || [];
}
```

4. **Analyze reachability**
```typescript
// src/graph/reachability.ts
export async function analyzeReachability(
  vulnerabilities: Vulnerability[],
  projectPath: string
): Promise<Vulnerability[]> {
  const reachable: Vulnerability[] = [];
  
  for (const vuln of vulnerabilities) {
    // Check if vulnerable package is actually imported
    const isUsed = await isPackageImported(projectPath, vuln.package);
    
    if (isUsed) {
      // Check if vulnerable code path is reachable
      const isReachable = await isVulnerableCodeReachable(
        projectPath,
        vuln.package,
        vuln.affected
      );
      
      if (isReachable) {
        reachable.push({ ...vuln, reachable: true });
      }
    }
  }
  
  return reachable;
}
```

---

### Feature 2: Breaking Change Detector

**Goal**: Analyze API changes between versions[277][280][281][285].

**Implementation steps**:

1. **Download package versions**
```typescript
// src/analyzer/downloader.ts
import pacote from 'pacote';

export async function downloadPackage(
  name: string,
  version: string
): Promise<PackageData> {
  const manifest = await pacote.manifest(`${name}@${version}`);
  const tarball = await pacote.tarball(`${name}@${version}`);
  
  return {
    manifest,
    files: await extractTarball(tarball),
  };
}
```

2. **Parse TypeScript definitions**
```typescript
// src/analyzer/types.ts
import * as ts from 'typescript';

export function parseTypeDefinitions(packageData: PackageData): APIDefinition {
  const dtsFiles = packageData.files.filter(f => f.endsWith('.d.ts'));
  
  const apis: APIDefinition = {
    functions: [],
    classes: [],
    interfaces: [],
  };
  
  for (const file of dtsFiles) {
    const sourceFile = ts.createSourceFile(
      file.path,
      file.content,
      ts.ScriptTarget.Latest
    );
    
    ts.forEachChild(sourceFile, node => {
      if (ts.isFunctionDeclaration(node)) {
        apis.functions.push(parseFunctionSignature(node));
      }
      // ... handle classes, interfaces, etc.
    });
  }
  
  return apis;
}
```

3. **Diff APIs**
```typescript
// src/analyzer/api-diff.ts
export function diffAPIs(
  oldAPI: APIDefinition,
  newAPI: APIDefinition
): APIChange[] {
  const changes: APIChange[] = [];
  
  // Detect removed functions
  for (const oldFn of oldAPI.functions) {
    const newFn = newAPI.functions.find(f => f.name === oldFn.name);
    
    if (!newFn) {
      changes.push({
        type: 'breaking',
        category: 'removed',
        symbol: oldFn.name,
        before: oldFn.signature,
        after: null,
      });
    } else if (oldFn.signature !== newFn.signature) {
      changes.push({
        type: 'breaking',
        category: 'signature',
        symbol: oldFn.name,
        before: oldFn.signature,
        after: newFn.signature,
      });
    }
  }
  
  // Detect added functions (non-breaking)
  for (const newFn of newAPI.functions) {
    const oldFn = oldAPI.functions.find(f => f.name === newFn.name);
    
    if (!oldFn) {
      changes.push({
        type: 'feature',
        category: 'added',
        symbol: newFn.name,
        before: null,
        after: newFn.signature,
      });
    }
  }
  
  return changes;
}
```

4. **Parse changelog for hints**
```typescript
// src/analyzer/changelog.ts
export async function parseChangelog(
  packageData: PackageData
): Promise<ChangelogEntry[]> {
  const changelogFile = packageData.files.find(
    f => f.path.match(/changelog\.md$/i)
  );
  
  if (!changelogFile) return [];
  
  // Parse markdown sections
  const sections = parseMarkdownSections(changelogFile.content);
  
  return sections.map(section => ({
    version: extractVersion(section.heading),
    breaking: section.content.includes('BREAKING') || section.content.includes('breaking change'),
    changes: extractChanges(section.content),
  }));
}
```

---

### Feature 3: Migration Generator

**Goal**: Auto-generate code to migrate APIs[277][284][288].

**Implementation**:

1. **Find affected files**
```typescript
// src/remediation/finder.ts
import { glob } from 'glob';

export async function findImports(
  projectPath: string,
  packageName: string
): Promise<string[]> {
  const files = await glob(`${projectPath}/**/*.{js,ts,jsx,tsx}`, {
    ignore: ['**/node_modules/**', '**/dist/**'],
  });
  
  const affected: string[] = [];
  
  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    
    // Check for imports
    if (
      content.includes(`from '${packageName}'`) ||
      content.includes(`require('${packageName}')`)
    ) {
      affected.push(file);
    }
  }
  
  return affected;
}
```

2. **Generate transformation**
```typescript
// src/remediation/migrator.ts
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';

export function generateMigration(
  code: string,
  changes: APIChange[]
): string {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });
  
  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee;
      
      // Find matching API change
      const change = findMatchingChange(callee, changes);
      
      if (change && change.migration) {
        // Apply transformation
        const newNode = parseExpression(change.migration);
        path.replaceWith(newNode);
      }
    },
  });
  
  return generate(ast).code;
}
```

---

### Feature 4: Test-Driven Updates

**Goal**: Run tests, update, test again, rollback if failed[273][275].

**Implementation**:

1. **Detect test command**
```typescript
// src/remediation/tester.ts
export async function detectTestCommand(
  projectPath: string
): Promise<string> {
  const packageJson = await readPackageJson(projectPath);
  
  // Check package.json scripts
  if (packageJson.scripts?.test) {
    return packageJson.scripts.test;
  }
  
  // Check for common test files
  const hasVitest = await exists(`${projectPath}/vitest.config.ts`);
  if (hasVitest) return 'vitest run';
  
  const hasJest = await exists(`${projectPath}/jest.config.js`);
  if (hasJest) return 'jest';
  
  throw new Error('No test command found');
}
```

2. **Run tests with timeout**
```typescript
export async function runTests(
  projectPath: string,
  timeout = 300000 // 5 minutes
): Promise<TestResult> {
  const testCommand = await detectTestCommand(projectPath);
  const startTime = Date.now();
  
  try {
    const { stdout, stderr } = await execAsync(testCommand, {
      cwd: projectPath,
      timeout,
    });
    
    return {
      passed: true,
      output: stdout,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      passed: false,
      output: error.stderr || error.message,
      duration: Date.now() - startTime,
      failedTests: parseFailedTests(error.stderr),
    };
  }
}
```

3. **Implement rollback**
```typescript
// src/remediation/rollback.ts
export class RollbackManager {
  private backups = new Map<string, string>();
  
  async backup(file: string): Promise<void> {
    const content = await readFile(file, 'utf-8');
    this.backups.set(file, content);
  }
  
  async rollback(): Promise<void> {
    for (const [file, content] of this.backups) {
      await writeFile(file, content, 'utf-8');
    }
    this.backups.clear();
  }
  
  clear(): void {
    this.backups.clear();
  }
}
```

---

## 🧪 Testing Requirements

### Test Coverage Rules
- **Minimum coverage**: 85% for scanner, analyzer, remediation
- **Integration tests**: Test with real npm packages
- **E2E tests**: Full workflow from scan to fix
- **Mock external APIs**: Use nock for HTTP mocking

### Test File Structure
```typescript
// tests/unit/scanner/npm.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { scanNpmProject } from '../../../src/scanner/npm';

describe('npm scanner', () => {
  beforeEach(() => {
    // Reset cache before each test
  });
  
  describe('vulnerability detection', () => {
    it('detects high severity vulnerabilities', async () => {
      const result = await scanNpmProject('./fixtures/vuln-high');
      
      expect(result.vulnerabilities).toHaveLength(1);
      expect(result.vulnerabilities[0].severity).toBe('high');
      expect(result.vulnerabilities[0].package).toBe('lodash');
    });
    
    it('detects transitive vulnerabilities', async () => {
      const result = await scanNpmProject('./fixtures/vuln-transitive');
      
      const transitiveVuln = result.vulnerabilities.find(
        v => !v.direct
      );
      
      expect(transitiveVuln).toBeDefined();
    });
  });
  
  describe('error handling', () => {
    it('throws on missing package.json', async () => {
      await expect(
        scanNpmProject('./fixtures/empty')
      ).rejects.toThrow('package.json not found');
    });
    
    it('handles corrupted package.json', async () => {
      await expect(
        scanNpmProject('./fixtures/corrupted')
      ).rejects.toThrow('Invalid package.json');
    });
  });
});
```

### Mock External APIs
```typescript
// tests/mocks/npm-registry.ts
import nock from 'nock';

export function mockNpmAudit(response: AuditResponse) {
  nock('https://registry.npmjs.org')
    .post('/-/npm/v1/security/audits')
    .reply(200, response);
}

export function mockOSV(packageName: string, vulns: Vulnerability[]) {
  nock('https://api.osv.dev')
    .post('/v1/query')
    .reply(200, { vulns });
}
```

---

## 🚨 Critical Rules (Never Break These)

### 1. Never Trust External Data
```typescript
// ❌ NEVER do this
const pkg: any = await fetchPackage(name);
pkg.version; // Unsafe - could be undefined or non-string

// ✅ ALWAYS validate
const data = await fetchPackage(name);
const pkg = validatePackageData(data);
pkg.version; // Safe - validated string
```

### 2. Always Handle Network Failures
```typescript
// ❌ NEVER assume network succeeds
const data = await fetch(url);

// ✅ ALWAYS retry and handle errors
const data = await fetchWithRetry(url, { maxRetries: 3 });
```

### 3. Rate Limit External APIs
```typescript
// ❌ NEVER spam APIs
for (const pkg of packages) {
  await fetchVulnerabilities(pkg); // Could hit rate limit
}

// ✅ ALWAYS batch and throttle
const batches = chunk(packages, 10);
for (const batch of batches) {
  await Promise.all(batch.map(fetchVulnerabilities));
  await sleep(1000); // Rate limit
}
```

### 4. Always Validate Before Executing
```typescript
// ❌ NEVER run arbitrary commands
await exec(userInput);

// ✅ ALWAYS validate and sanitize
if (!isValidCommand(userInput)) {
  throw new Error('Invalid command');
}
await exec(sanitize(userInput));
```

---

## 📖 Quick Command Reference

```bash
# Development
npm run dev              # Watch mode
npm run test:watch       # Test watch mode
npm run build            # Production build

# Testing
npm test                 # Run all tests
npm run test:unit        # Unit tests only
npm run test:e2e         # E2E tests only
npm run test:coverage    # With coverage

# Quality
npm run lint             # ESLint
npm run type-check       # TypeScript
npm run format           # Prettier

# CLI Testing
npm link                 # Link for local testing
securesync scan ./test   # Test scan command
securesync --help        # View all commands
```

---

## 🎯 Agent Success Criteria

An AI agent is successful on SecureSync when:

1. ✅ All external API calls include retry logic
2. ✅ All untrusted input is validated before use
3. ✅ Tests cover both happy path and error cases
4. ✅ CLI provides clear, actionable error messages
5. ✅ Breaking changes are detected with >80% accuracy
6. ✅ Test-driven updates never leave broken state
7. ✅ Code is documented with security considerations
8. ✅ Performance is acceptable (scan < 10s for typical project)

---

*This file is read automatically by Claude Code and compatible AI coding agents. Keep it updated as the project evolves.*