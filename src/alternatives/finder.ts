import type { Alternative, SearchCriteria, PackageMetadata } from './types.js';
import { scoreAlternative } from './scorer.js';

export async function findAlternatives(
  packageName: string,
  criteria: SearchCriteria = {}
): Promise<Alternative[]> {
  // 1. Query npm for similar packages
  const keywords = await extractKeywords(packageName);
  const similar = await searchNpm({
    keywords,
    exclude: [packageName],
  });

  // 2. Score each alternative
  const scored: Alternative[] = await Promise.all(
    similar.map(async (pkg): Promise<Alternative> => {
      const score = await scoreAlternative(pkg, packageName);
      const compatibility = await analyzeAPICompatibility(pkg, packageName);
      const migrationEffort = determineMigrationEffort(compatibility, score);

      return {
        name: pkg.name,
        description: pkg.description,
        downloads: pkg.downloads,
        lastPublish: pkg.lastPublish,
        stars: 0, // TODO: fetch from GitHub API
        issues: 0, // TODO: fetch from GitHub API
        maintainers: 0, // TODO: fetch from npm registry
        vulnerabilities: 0, // TODO: fetch from security databases
        compatibility,
        migrationEffort,
        score,
      };
    })
  );

  // 3. Filter and sort by score
  return scored
    .filter(alt => meetsCriteria(alt, criteria))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

async function extractKeywords(packageName: string): Promise<string[]> {
  try {
    const metadata = await fetchPackageMetadata(packageName);
    return metadata.keywords || [];
  } catch {
    // If we can't fetch metadata, derive keywords from package name
    return packageName.split('-').filter(k => k.length > 2);
  }
}

async function searchNpm(_options: {
  keywords: string[];
  exclude: string[];
}): Promise<PackageMetadata[]> {
  // This would use npm-registry-fetch to search for packages
  // For now, return empty array as placeholder
  const results: PackageMetadata[] = [];

  // In a real implementation:
  // 1. Build search query from keywords
  // 2. Query npm registry search API
  // 3. Parse and normalize results
  // 4. Fetch additional metadata for each result
  // 5. Filter out excluded packages

  return results;
}

async function fetchPackageMetadata(packageName: string): Promise<PackageMetadata> {
  // This would use npm-registry-fetch to get package metadata
  // For now, return placeholder data
  return {
    name: packageName,
    description: '',
    version: '1.0.0',
    downloads: 0,
    lastPublish: new Date(),
    keywords: [],
  };
}

async function analyzeAPICompatibility(
  _alternative: PackageMetadata,
  _original: string
): Promise<number> {
  // This would analyze how similar the APIs are
  // Could use:
  // 1. TypeScript definition comparison
  // 2. README/documentation similarity
  // 3. Common function names
  // 4. Similar exports

  // For now, return a placeholder value
  return 50; // 0-100 scale
}

function determineMigrationEffort(
  compatibility: number,
  _score: number
): 'low' | 'medium' | 'high' {
  if (compatibility >= 80) {
    return 'low';
  } else if (compatibility >= 50) {
    return 'medium';
  } else {
    return 'high';
  }
}

function meetsCriteria(alternative: Alternative, criteria: SearchCriteria): boolean {
  if (criteria.minDownloads && alternative.downloads < criteria.minDownloads) {
    return false;
  }

  if (criteria.maxAge) {
    const daysSincePublish = daysSince(alternative.lastPublish);
    if (daysSincePublish > criteria.maxAge) {
      return false;
    }
  }

  if (criteria.minStars && alternative.stars < criteria.minStars) {
    return false;
  }

  if (criteria.zeroVulnerabilities && alternative.vulnerabilities > 0) {
    return false;
  }

  if (criteria.minCompatibility && alternative.compatibility < criteria.minCompatibility) {
    return false;
  }

  return true;
}

function daysSince(date: Date): number {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
