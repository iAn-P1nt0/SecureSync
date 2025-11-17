#!/usr/bin/env node

import { Command } from 'commander';
import { createScanCommand } from './commands/scan.js';
import { createAnalyzeCommand } from './commands/analyze.js';
import { createAlternativesCommand } from './commands/alternatives.js';
import { createFixCommand } from './commands/fix.js';
import { createMigrateCommand } from './commands/migrate.js';

const program = new Command();

program
  .name('securesync')
  .description('Intelligent dependency security scanner with auto-fix')
  .version('1.0.0');

// Add commands
program.addCommand(createScanCommand());
program.addCommand(createFixCommand());
program.addCommand(createAnalyzeCommand());
program.addCommand(createAlternativesCommand());
program.addCommand(createMigrateCommand());

// Parse arguments
program.parse(process.argv);
