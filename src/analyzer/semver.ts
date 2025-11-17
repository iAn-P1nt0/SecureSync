import { compare, diff, valid, type ReleaseType } from 'semver';

export interface VersionDiff {
  fromVersion: string;
  toVersion: string;
  diffType: ReleaseType | null;
  isUpgrade: boolean;
  isDowngrade: boolean;
  expectedBreakingChanges: boolean;
}

export function analyzeVersionDiff(fromVersion: string, toVersion: string): VersionDiff {
  if (!valid(fromVersion) || !valid(toVersion)) {
    throw new Error(`Invalid semver versions: ${fromVersion} or ${toVersion}`);
  }

  const compareResult = compare(fromVersion, toVersion);
  const diffType = diff(fromVersion, toVersion);

  return {
    fromVersion,
    toVersion,
    diffType,
    isUpgrade: compareResult < 0,
    isDowngrade: compareResult > 0,
    expectedBreakingChanges: diffType === 'major' || diffType === 'premajor',
  };
}

export function shouldAnalyzeBreakingChanges(versionDiff: VersionDiff): boolean {
  // Always analyze if it's a major version bump
  if (versionDiff.expectedBreakingChanges) {
    return true;
  }

  // Also analyze minor and patch updates as they might have undeclared breaking changes
  return versionDiff.isUpgrade && versionDiff.diffType !== null;
}
