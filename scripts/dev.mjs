#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Start Vite dev server
const vite = spawn('npm', ['run', 'dev'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true
});

vite.on('error', (error) => {
  console.error('Failed to start dev server:', error);
  process.exit(1);
});

vite.on('close', (code) => {
  console.log(`Dev server exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down dev server...');
  vite.kill();
});

process.on('SIGTERM', () => {
  vite.kill();
});