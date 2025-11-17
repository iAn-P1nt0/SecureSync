import type { ChangelogEntry } from './types.js';

export async function parseChangelog(changelogContent: string): Promise<ChangelogEntry[]> {
  const entries: ChangelogEntry[] = [];

  // Split by version headers (common formats: ## [1.0.0], # 1.0.0, etc.)
  const versionRegex = /^##?\s*\[?(\d+\.\d+\.\d+[^\]]*)\]?.*$/gm;
  const matches = [...changelogContent.matchAll(versionRegex)];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const version = match[1];
    const startIndex = match.index! + match[0].length;
    const endIndex = i < matches.length - 1 ? matches[i + 1].index! : changelogContent.length;
    const content = changelogContent.slice(startIndex, endIndex);

    entries.push({
      version,
      date: extractDate(match[0]),
      changes: categorizeChanges(content),
    });
  }

  return entries;
}

function extractDate(headerLine: string): string | undefined {
  const dateRegex = /\d{4}-\d{2}-\d{2}/;
  const match = headerLine.match(dateRegex);
  return match ? match[0] : undefined;
}

function categorizeChanges(content: string): ChangelogEntry['changes'] {
  const changes = {
    breaking: [] as string[],
    features: [] as string[],
    fixes: [] as string[],
    other: [] as string[],
  };

  const lines = content.split('\n');
  let currentCategory: keyof typeof changes = 'other';

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect category headers
    if (/^###?\s*(breaking|breaking changes)/i.test(trimmed)) {
      currentCategory = 'breaking';
      continue;
    } else if (/^###?\s*(features?|added)/i.test(trimmed)) {
      currentCategory = 'features';
      continue;
    } else if (/^###?\s*(fix(es)?|bug\s*fix(es)?)/i.test(trimmed)) {
      currentCategory = 'fixes';
      continue;
    }

    // Extract bullet points
    if (/^[-*]\s/.test(trimmed)) {
      const change = trimmed.replace(/^[-*]\s/, '').trim();
      if (change) {
        changes[currentCategory].push(change);
      }
    }
  }

  return changes;
}

export function extractMigrations(changelog: ChangelogEntry[], targetVersion: string): Map<string, string> {
  const migrations = new Map<string, string>();

  const entry = changelog.find(e => e.version === targetVersion);
  if (!entry) {
    return migrations;
  }

  // Look for migration hints in breaking changes
  for (const change of entry.changes.breaking) {
    const migrationHint = extractMigrationHint(change);
    if (migrationHint) {
      migrations.set(migrationHint.from, migrationHint.to);
    }
  }

  return migrations;
}

function extractMigrationHint(change: string): { from: string; to: string } | null {
  // Look for patterns like "replace X with Y" or "use Y instead of X"
  const replacePattern = /replace\s+`?(\w+)`?\s+with\s+`?(\w+)`?/i;
  const insteadPattern = /use\s+`?(\w+)`?\s+instead\s+of\s+`?(\w+)`?/i;

  let match = change.match(replacePattern);
  if (match) {
    return { from: match[1], to: match[2] };
  }

  match = change.match(insteadPattern);
  if (match) {
    return { from: match[2], to: match[1] };
  }

  return null;
}
