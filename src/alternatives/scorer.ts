import type { PackageMetadata } from './types.js';

export async function scoreAlternative(
  alternative: PackageMetadata,
  _originalPackage: string
): Promise<number> {
  let score = 0;

  // Popularity (30%)
  const popularityScore = calculatePopularityScore(alternative.downloads);
  score += popularityScore * 0.3;

  // Maintenance (25%)
  const maintenanceScore = calculateMaintenanceScore(alternative.lastPublish);
  score += maintenanceScore * 0.25;

  // Security (25%)
  const securityScore = await calculateSecurityScore(alternative.name);
  score += securityScore * 0.25;

  // Quality indicators (20%)
  const qualityScore = await calculateQualityScore(alternative);
  score += qualityScore * 0.2;

  return Math.min(100, Math.round(score));
}

function calculatePopularityScore(downloads: number): number {
  // Scale: 0-100 based on weekly downloads
  // 1M+ downloads = 100
  // 100k downloads = 75
  // 10k downloads = 50
  // 1k downloads = 25
  // <1k downloads = 0-25 scaled

  if (downloads >= 1000000) {
    return 100;
  } else if (downloads >= 100000) {
    return 75 + ((downloads - 100000) / 900000) * 25;
  } else if (downloads >= 10000) {
    return 50 + ((downloads - 10000) / 90000) * 25;
  } else if (downloads >= 1000) {
    return 25 + ((downloads - 1000) / 9000) * 25;
  } else {
    return (downloads / 1000) * 25;
  }
}

function calculateMaintenanceScore(lastPublish: Date): number {
  const daysSinceUpdate = daysSince(lastPublish);

  // Scale: 0-100 based on recency
  // < 30 days = 100
  // < 90 days = 80
  // < 180 days = 60
  // < 365 days = 40
  // < 730 days = 20
  // > 730 days = 0

  if (daysSinceUpdate < 30) {
    return 100;
  } else if (daysSinceUpdate < 90) {
    return 80 + ((90 - daysSinceUpdate) / 60) * 20;
  } else if (daysSinceUpdate < 180) {
    return 60 + ((180 - daysSinceUpdate) / 90) * 20;
  } else if (daysSinceUpdate < 365) {
    return 40 + ((365 - daysSinceUpdate) / 185) * 20;
  } else if (daysSinceUpdate < 730) {
    return 20 + ((730 - daysSinceUpdate) / 365) * 20;
  } else {
    return Math.max(0, 20 - ((daysSinceUpdate - 730) / 365) * 20);
  }
}

async function calculateSecurityScore(_packageName: string): Promise<number> {
  // This would query vulnerability databases
  // For now, return a placeholder
  // In real implementation:
  // 1. Query npm audit for this package
  // 2. Query OSV database
  // 3. Check for known security advisories
  // No vulnerabilities = 100
  // 1 low/moderate = 80
  // 1+ high/critical = 0

  return 100; // Placeholder
}

async function calculateQualityScore(pkg: PackageMetadata): Promise<number> {
  let score = 0;

  // Has description
  if (pkg.description && pkg.description.length > 20) {
    score += 20;
  }

  // Has repository
  if (pkg.repository) {
    score += 20;
  }

  // Has homepage
  if (pkg.homepage) {
    score += 15;
  }

  // Has keywords
  if (pkg.keywords && pkg.keywords.length >= 3) {
    score += 15;
  }

  // Has license
  if (pkg.license) {
    score += 15;
  }

  // TypeScript support (would check for .d.ts files or @types package)
  // score += 15;

  return score;
}

function daysSince(date: Date): number {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
