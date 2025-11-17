import { analyzeVersionDiff, shouldAnalyzeBreakingChanges } from './semver.js';
import { parseChangelog, extractMigrations } from './changelog.js';
import { diffAPIs, parseTypeDefinitions, classifyChanges } from './api-diff.js';
import type { BreakingChangeAnalysis, APIChange } from './types.js';

export async function analyzeBreakingChanges(
  packageName: string,
  fromVersion: string,
  toVersion: string
): Promise<BreakingChangeAnalysis> {
  // 1. Compare semantic versions
  const versionDiff = analyzeVersionDiff(fromVersion, toVersion);

  if (!shouldAnalyzeBreakingChanges(versionDiff)) {
    return {
      packageName,
      fromVersion,
      toVersion,
      changes: [],
      hasBreakingChanges: false,
      riskLevel: 'low',
      analyzedAt: new Date(),
    };
  }

  // 2. Download and analyze both package versions
  const oldPackagePath = await downloadPackage(packageName, fromVersion);
  const newPackagePath = await downloadPackage(packageName, toVersion);

  // 3. Parse TypeScript definitions if available
  const oldTypes = await parseTypeDefinitions(oldPackagePath);
  const newTypes = await parseTypeDefinitions(newPackagePath);

  // 4. Diff the public API surface
  const apiDiff = diffAPIs(oldTypes, newTypes);

  // 5. Parse CHANGELOG.md for migration hints
  const changelog = await loadChangelog(newPackagePath);
  const changelogEntries = changelog ? await parseChangelog(changelog) : [];
  const migrations = extractMigrations(changelogEntries, toVersion);

  // 6. Classify changes and add migration hints
  const changes = classifyChanges(apiDiff, migrations);

  // Add breaking changes from changelog that weren't detected in API diff
  const changelogBreaking = changelogEntries.find(e => e.version === toVersion);
  if (changelogBreaking) {
    for (const breaking of changelogBreaking.changes.breaking) {
      // Only add if not already detected
      if (!changes.some(c => c.symbol === breaking)) {
        changes.push({
          type: 'breaking',
          category: 'behavior',
          symbol: breaking,
          before: '',
          after: '',
          confidence: 0.7,
          source: 'changelog',
        });
      }
    }
  }

  // 7. Calculate risk level
  const riskLevel = calculateRiskLevel(changes, versionDiff.expectedBreakingChanges);

  return {
    packageName,
    fromVersion,
    toVersion,
    changes,
    hasBreakingChanges: changes.some(c => c.type === 'breaking'),
    riskLevel,
    analyzedAt: new Date(),
  };
}

async function downloadPackage(packageName: string, version: string): Promise<string> {
  // This would use pacote to download the package
  // For now, return a placeholder path
  return `/tmp/securesync-cache/${packageName}@${version}`;
}

async function loadChangelog(packagePath: string): Promise<string | null> {
  // This would read CHANGELOG.md, HISTORY.md, or similar files
  // For now, return null
  return null;
}

function calculateRiskLevel(
  changes: APIChange[],
  expectedBreaking: boolean
): 'low' | 'medium' | 'high' {
  const breakingChanges = changes.filter(c => c.type === 'breaking');

  if (breakingChanges.length === 0) {
    return 'low';
  }

  if (breakingChanges.length > 5 || !expectedBreaking) {
    return 'high';
  }

  return 'medium';
}

export type { APIChange, BreakingChangeAnalysis, ChangelogEntry } from './types.js';
export { analyzeVersionDiff } from './semver.js';
export { parseChangelog } from './changelog.js';
