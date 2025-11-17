import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import type {
  ScanResult,
  ScanOptions,
  Vulnerability,
  DependencyTree,
  DependencyNode,
  PackageInfo,
} from './types.js';

export async function scanNpmProject(projectPath: string, options: Partial<ScanOptions> = {}): Promise<ScanResult> {
  // 1. Read package.json and package-lock.json
  const packageJson = await readPackageJson(projectPath);
  const lockfile = await readLockfile(projectPath);

  // 2. Build dependency tree (including transitive deps)
  const depTree = buildDependencyTree(packageJson, lockfile, options.includeDevDependencies ?? false);

  // 3. Query npm audit API for vulnerabilities
  const auditResult = await queryNpmAudit(projectPath, depTree);

  // 4. Enhance with OSV and NVD data (if enabled)
  const enhanced = options.enhanceWithOSV
    ? await enhanceVulnerabilities(auditResult)
    : auditResult;

  // 5. Calculate reachability (are vulnerable packages used?)
  const vulnerabilities = options.analyzeReachability
    ? await analyzeReachability(enhanced, projectPath)
    : enhanced;

  // 6. Build summary
  const summary = {
    critical: vulnerabilities.filter(v => v.severity === 'critical').length,
    high: vulnerabilities.filter(v => v.severity === 'high').length,
    moderate: vulnerabilities.filter(v => v.severity === 'moderate').length,
    low: vulnerabilities.filter(v => v.severity === 'low').length,
  };

  return {
    vulnerabilities,
    totalPackages: depTree.packages.length,
    scannedAt: new Date(),
    dependencies: depTree,
    summary,
  };
}

async function readPackageJson(projectPath: string): Promise<any> {
  const packageJsonPath = join(projectPath, 'package.json');

  if (!existsSync(packageJsonPath)) {
    throw new Error(`package.json not found at ${packageJsonPath}`);
  }

  const content = await readFile(packageJsonPath, 'utf-8');
  return JSON.parse(content);
}

async function readLockfile(projectPath: string): Promise<any> {
  const lockfilePath = join(projectPath, 'package-lock.json');

  if (!existsSync(lockfilePath)) {
    throw new Error(`package-lock.json not found at ${lockfilePath}. Please run 'npm install' first.`);
  }

  const content = await readFile(lockfilePath, 'utf-8');
  return JSON.parse(content);
}

function buildDependencyTree(
  packageJson: any,
  lockfile: any,
  includeDevDeps: boolean
): DependencyTree {
  const packages: PackageInfo[] = [];
  const dependencies = new Map<string, DependencyNode>();

  // Process direct dependencies
  const deps = packageJson.dependencies || {};
  const devDeps = includeDevDeps ? (packageJson.devDependencies || {}) : {};

  for (const [name, version] of Object.entries(deps)) {
    const lockEntry = lockfile.packages?.[`node_modules/${name}`];
    if (lockEntry) {
      dependencies.set(name, {
        name,
        version: lockEntry.version,
        resolved: lockEntry.resolved || '',
        dependencies: buildTransitiveDeps(lockfile, lockEntry),
      });
      packages.push({
        name,
        version: lockEntry.version,
        isDevDependency: false,
        isDirect: true,
      });
    }
  }

  for (const [name, version] of Object.entries(devDeps)) {
    const lockEntry = lockfile.packages?.[`node_modules/${name}`];
    if (lockEntry) {
      dependencies.set(name, {
        name,
        version: lockEntry.version,
        resolved: lockEntry.resolved || '',
        dependencies: buildTransitiveDeps(lockfile, lockEntry),
      });
      packages.push({
        name,
        version: lockEntry.version,
        isDevDependency: true,
        isDirect: true,
      });
    }
  }

  // Collect all packages (including transitive)
  collectAllPackages(dependencies, packages);

  return {
    name: packageJson.name,
    version: packageJson.version,
    dependencies,
    packages,
  };
}

function buildTransitiveDeps(lockfile: any, lockEntry: any): Map<string, DependencyNode> | undefined {
  if (!lockEntry.dependencies) {
    return undefined;
  }

  const transitive = new Map<string, DependencyNode>();
  for (const [name, version] of Object.entries(lockEntry.dependencies)) {
    const transitiveEntry = lockfile.packages?.[`node_modules/${name}`];
    if (transitiveEntry) {
      transitive.set(name, {
        name,
        version: transitiveEntry.version,
        resolved: transitiveEntry.resolved || '',
        dependencies: buildTransitiveDeps(lockfile, transitiveEntry),
      });
    }
  }

  return transitive.size > 0 ? transitive : undefined;
}

function collectAllPackages(deps: Map<string, DependencyNode>, packages: PackageInfo[]): void {
  const seen = new Set<string>(packages.map(p => `${p.name}@${p.version}`));

  function traverse(depMap: Map<string, DependencyNode> | undefined, isDev: boolean): void {
    if (!depMap) return;

    for (const [name, node] of depMap) {
      const key = `${name}@${node.version}`;
      if (!seen.has(key)) {
        seen.add(key);
        packages.push({
          name,
          version: node.version,
          isDevDependency: isDev,
          isDirect: false,
        });
      }
      traverse(node.dependencies, isDev);
    }
  }

  for (const [name, node] of deps) {
    traverse(node.dependencies, false);
  }
}

async function queryNpmAudit(projectPath: string, depTree: DependencyTree): Promise<Vulnerability[]> {
  // This would normally call the npm audit API
  // For now, returning a mock implementation structure
  const vulnerabilities: Vulnerability[] = [];

  try {
    // In a real implementation, this would:
    // 1. Use npm-registry-fetch to query the audit endpoint
    // 2. Parse the audit report
    // 3. Map vulnerabilities to our format

    // Placeholder for actual npm audit API call
    // const auditData = await npmFetch.json('/-/npm/v1/security/audits', {
    //   method: 'POST',
    //   body: JSON.stringify({ /* lockfile data */ })
    // });

    return vulnerabilities;
  } catch (error) {
    console.error('Error querying npm audit:', error);
    return vulnerabilities;
  }
}

async function enhanceVulnerabilities(vulnerabilities: Vulnerability[]): Promise<Vulnerability[]> {
  // This would enhance with OSV and NVD data
  // For now, return as-is
  return vulnerabilities;
}

async function analyzeReachability(
  vulnerabilities: Vulnerability[],
  projectPath: string
): Promise<Vulnerability[]> {
  // This would analyze if vulnerable code is actually imported/used
  // For now, return all vulnerabilities
  return vulnerabilities;
}
