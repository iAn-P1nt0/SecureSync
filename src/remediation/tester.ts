import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { TestResult, UpdateResult, RemediationOptions } from './types.js';
import type { Migration } from './types.js';

const execAsync = promisify(exec);

export async function testDrivenUpdate(
  projectPath: string,
  packageName: string,
  newVersion: string,
  migrations: Migration[],
  options: RemediationOptions = {}
): Promise<UpdateResult> {
  const shouldRunTests = options.runTests ?? true;
  const shouldCreateBackup = options.createBackup ?? true;

  // 1. Run tests before update (baseline)
  if (shouldRunTests) {
    const baselineTests = await runTests(projectPath);
    if (!baselineTests.passed) {
      return {
        success: false,
        reason: 'Tests failing before update - please fix existing test failures first',
        failedTests: baselineTests.failedTests,
      };
    }
  }

  // 2. Create backup of package.json and lock file
  if (shouldCreateBackup) {
    await createBackupFiles(projectPath);
  }

  try {
    // 3. Update package to new version
    await updatePackage(projectPath, packageName, newVersion);

    // 4. Apply migration scripts
    if (options.autoApply && migrations.length > 0) {
      for (const migration of migrations) {
        if (migration.safe || options.interactive === false) {
          await applyMigration(migration);
        }
      }
    }

    // 5. Run tests after update
    if (shouldRunTests) {
      const updatedTests = await runTests(projectPath);

      if (!updatedTests.passed) {
        // 6. Tests failed - rollback everything
        await rollback(projectPath);
        return {
          success: false,
          reason: 'Tests failed after update',
          failedTests: updatedTests.failedTests,
          migrations,
          rolledBack: true,
        };
      }
    }

    // 7. Tests passed - commit changes
    return {
      success: true,
      migrations,
    };
  } catch (error) {
    if (shouldCreateBackup) {
      await rollback(projectPath);
    }
    throw error;
  }
}

export async function runTests(projectPath: string): Promise<TestResult> {
  const startTime = Date.now();

  try {
    // Detect test command from package.json
    const testCommand = await detectTestCommand(projectPath);

    if (!testCommand) {
      return {
        passed: true,
        output: 'No test command found, skipping tests',
        duration: Date.now() - startTime,
      };
    }

    const { stdout } = await execAsync(testCommand, {
      cwd: projectPath,
      env: { ...process.env, CI: 'true' },
    });

    return {
      passed: true,
      output: stdout,
      duration: Date.now() - startTime,
      exitCode: 0,
    };
  } catch (error: any) {
    return {
      passed: false,
      output: error.stderr || error.stdout || error.message,
      duration: Date.now() - startTime,
      failedTests: parseFailedTests(error.stderr || error.stdout || ''),
      exitCode: error.code,
    };
  }
}

async function detectTestCommand(projectPath: string): Promise<string | null> {
  try {
    const packageJsonPath = join(projectPath, 'package.json');
    const content = await readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(content);

    return packageJson.scripts?.test || null;
  } catch {
    return null;
  }
}

function parseFailedTests(output: string): string[] {
  const failed: string[] = [];

  // Common test failure patterns
  const patterns = [
    /FAIL\s+(.+)/g,
    /✖\s+(.+)/g,
    /×\s+(.+)/g,
    /ERROR\s+(.+)/g,
  ];

  for (const pattern of patterns) {
    const matches = output.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && !failed.includes(match[1])) {
        failed.push(match[1].trim());
      }
    }
  }

  return failed;
}

async function createBackupFiles(projectPath: string): Promise<void> {
  const { copyFile } = await import('fs/promises');

  try {
    await copyFile(
      join(projectPath, 'package.json'),
      join(projectPath, 'package.json.backup')
    );

    await copyFile(
      join(projectPath, 'package-lock.json'),
      join(projectPath, 'package-lock.json.backup')
    );
  } catch (error) {
    console.warn('Failed to create backup files:', error);
  }
}

async function updatePackage(
  projectPath: string,
  packageName: string,
  version: string
): Promise<void> {
  await execAsync(`npm install ${packageName}@${version}`, {
    cwd: projectPath,
  });
}

async function applyMigration(migration: Migration): Promise<void> {
  const { readFile, writeFile } = await import('fs/promises');

  try {
    let content = await readFile(migration.file, 'utf-8');

    // Apply each change
    for (const change of migration.changes) {
      content = content.replace(change.old, change.new);
    }

    await writeFile(migration.file, content, 'utf-8');
  } catch (error) {
    console.error(`Failed to apply migration to ${migration.file}:`, error);
    throw error;
  }
}

async function rollback(projectPath: string): Promise<void> {
  const { copyFile, unlink } = await import('fs/promises');

  try {
    // Restore from backup
    await copyFile(
      join(projectPath, 'package.json.backup'),
      join(projectPath, 'package.json')
    );

    await copyFile(
      join(projectPath, 'package-lock.json.backup'),
      join(projectPath, 'package-lock.json')
    );

    // Reinstall original dependencies
    await execAsync('npm install', { cwd: projectPath });

    // Clean up backup files
    await unlink(join(projectPath, 'package.json.backup'));
    await unlink(join(projectPath, 'package-lock.json.backup'));
  } catch (error) {
    console.error('Failed to rollback changes:', error);
    throw error;
  }
}
