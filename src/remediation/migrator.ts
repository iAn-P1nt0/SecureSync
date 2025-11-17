import { readFile } from 'fs/promises';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import type { APIChange } from '../analyzer/types.js';
import type { Migration, CodeChange } from './types.js';

export async function generateMigration(
  projectPath: string,
  packageName: string,
  changes: APIChange[]
): Promise<Migration[]> {
  const migrations: Migration[] = [];

  // 1. Find all files importing the updated package
  const affectedFiles = await findImports(projectPath, packageName);

  for (const file of affectedFiles) {
    // 2. Parse file into AST
    const code = await readFile(file, 'utf-8');
    let ast;

    try {
      ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
      });
    } catch (error) {
      console.warn(`Failed to parse ${file}:`, error);
      continue;
    }

    // 3. Find usages of changed APIs
    const usages: CodeChange[] = [];
    const breakingChanges = changes.filter(c => c.type === 'breaking');

    traverse(ast, {
      CallExpression(path) {
        const callee = path.node.callee;
        const affectedChange = findAffectedAPI(callee, breakingChanges);

        if (affectedChange) {
          const generated = generate(path.node);
          const replacement = generateReplacement(path.node, affectedChange);

          if (replacement) {
            usages.push({
              line: path.node.loc?.start.line || 0,
              column: path.node.loc?.start.column || 0,
              old: generated.code,
              new: replacement,
            });
          }
        }
      },
      ImportDeclaration(path) {
        if (path.node.source.value === packageName) {
          // Check if any imported names have changed
          for (const specifier of path.node.specifiers) {
            if (specifier.type === 'ImportSpecifier') {
              const importedName = specifier.imported.type === 'Identifier'
                ? specifier.imported.name
                : '';

              const change = breakingChanges.find(
                c => c.symbol === importedName && c.category === 'renamed'
              );

              if (change && change.migration) {
                const generated = generate(specifier);
                usages.push({
                  line: specifier.loc?.start.line || 0,
                  column: specifier.loc?.start.column || 0,
                  old: generated.code,
                  new: change.migration,
                });
              }
            }
          }
        }
      },
    });

    // 4. Generate migration script
    if (usages.length > 0) {
      migrations.push({
        file,
        changes: usages,
        script: generateMigrationScript(file, usages),
        safe: determineSafety(usages, breakingChanges),
      });
    }
  }

  return migrations;
}

async function findImports(_projectPath: string, _packageName: string): Promise<string[]> {
  // This would use a tool like grep or a custom file walker
  // to find all files importing the package
  // For now, return empty array
  return [];
}

function findAffectedAPI(callee: any, changes: APIChange[]): APIChange | null {
  if (callee.type === 'Identifier') {
    return changes.find(c => c.symbol === callee.name) || null;
  }

  if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
    return changes.find(c => c.symbol === callee.property.name) || null;
  }

  return null;
}

function generateReplacement(_node: any, change: APIChange): string | null {
  if (change.migration) {
    // If there's an explicit migration hint, use it
    return change.migration;
  }

  // Try to infer a replacement based on the change type
  if (change.category === 'signature') {
    // Signature changed but we don't have a migration hint
    // Return null to indicate manual intervention needed
    return null;
  }

  return null;
}

function generateMigrationScript(file: string, changes: CodeChange[]): string {
  let script = `// Migration script for ${file}\n\n`;

  script += `import { readFile, writeFile } from 'fs/promises';\n\n`;
  script += `async function migrate() {\n`;
  script += `  const content = await readFile('${file}', 'utf-8');\n`;
  script += `  let updated = content;\n\n`;

  for (const change of changes) {
    script += `  // Line ${change.line}: ${change.old} -> ${change.new}\n`;
    script += `  updated = updated.replace(\n`;
    script += `    ${JSON.stringify(change.old)},\n`;
    script += `    ${JSON.stringify(change.new)}\n`;
    script += `  );\n\n`;
  }

  script += `  await writeFile('${file}', updated, 'utf-8');\n`;
  script += `  console.log('Migration completed for ${file}');\n`;
  script += `}\n\n`;
  script += `migrate().catch(console.error);\n`;

  return script;
}

function determineSafety(changes: CodeChange[], apiChanges: APIChange[]): boolean {
  // Consider it safe if:
  // 1. All changes have high confidence (>0.8)
  // 2. All changes have migration hints
  // 3. Number of changes is small (<= 5)

  if (changes.length > 5) {
    return false;
  }

  const hasLowConfidence = apiChanges.some(c => c.confidence < 0.8);
  if (hasLowConfidence) {
    return false;
  }

  const hasMissingMigrations = changes.some(c => !c.new || c.new === c.old);
  if (hasMissingMigrations) {
    return false;
  }

  return true;
}
