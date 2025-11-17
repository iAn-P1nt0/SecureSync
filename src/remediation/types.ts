import type { APIChange } from '../analyzer/types.js';

export interface CodeChange {
  line: number;
  column: number;
  old: string;
  new: string;
  applied?: boolean;
}

export interface Migration {
  file: string;
  changes: CodeChange[];
  script: string;           // Executable migration script
  safe: boolean;            // Whether auto-apply is safe
}

export interface TestResult {
  passed: boolean;
  output: string;
  duration: number;
  failedTests?: string[];
  exitCode?: number;
}

export interface UpdateResult {
  success: boolean;
  reason?: string;
  failedTests?: string[];
  migrations?: Migration[];
  rolledBack?: boolean;
}

export interface RemediationOptions {
  autoApply?: boolean;
  runTests?: boolean;
  createBackup?: boolean;
  interactive?: boolean;
}
