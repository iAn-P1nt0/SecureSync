import type { APIChange } from './types.js';

export interface TypeDefinition {
  kind: 'function' | 'class' | 'interface' | 'type' | 'variable';
  name: string;
  signature: string;
  exported: boolean;
}

export function diffAPIs(oldTypes: TypeDefinition[], newTypes: TypeDefinition[]): APIChange[] {
  const changes: APIChange[] = [];

  // Create maps for efficient lookup
  const oldMap = new Map(oldTypes.map(t => [t.name, t]));
  const newMap = new Map(newTypes.map(t => [t.name, t]));

  // Find removed or modified APIs
  for (const [name, oldType] of oldMap) {
    if (!oldType.exported) continue;

    const newType = newMap.get(name);

    if (!newType) {
      // API was removed
      changes.push({
        type: 'breaking',
        category: 'removed',
        symbol: name,
        before: oldType.signature,
        after: '',
        confidence: 1.0,
        source: 'typescript',
      });
    } else if (newType.signature !== oldType.signature) {
      // API signature changed
      changes.push({
        type: 'breaking',
        category: 'signature',
        symbol: name,
        before: oldType.signature,
        after: newType.signature,
        confidence: 0.9,
        source: 'typescript',
      });
    }
  }

  // Find added APIs (features, not breaking)
  for (const [name, newType] of newMap) {
    if (!newType.exported) continue;

    if (!oldMap.has(name)) {
      changes.push({
        type: 'feature',
        category: 'signature',
        symbol: name,
        before: '',
        after: newType.signature,
        confidence: 1.0,
        source: 'typescript',
      });
    }
  }

  return changes;
}

export async function parseTypeDefinitions(packagePath: string): Promise<TypeDefinition[]> {
  // This would parse .d.ts files using TypeScript compiler API
  // For now, return empty array as placeholder
  const definitions: TypeDefinition[] = [];

  // In a real implementation:
  // 1. Find .d.ts files in the package
  // 2. Parse them using TypeScript compiler API
  // 3. Extract exported symbols and their signatures
  // 4. Return as TypeDefinition[]

  return definitions;
}

export function classifyChanges(
  apiDiff: APIChange[],
  migrations: Map<string, string>
): APIChange[] {
  return apiDiff.map(change => {
    // Add migration hints from changelog
    if (change.category === 'removed' || change.category === 'renamed') {
      const migration = migrations.get(change.symbol);
      if (migration) {
        return {
          ...change,
          migration: `Replace \`${change.symbol}\` with \`${migration}\``,
          confidence: Math.min(change.confidence + 0.1, 1.0),
        };
      }
    }

    return change;
  });
}
