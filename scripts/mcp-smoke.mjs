#!/usr/bin/env node

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Get page name from command line argument
const pageName = process.argv[2];
if (!pageName) {
  console.error('Usage: node mcp-smoke.mjs <page-name>');
  console.error('Available pages: dashboard, test-bank, reports, analytics');
  process.exit(1);
}

// Map page names to routes
const routes = {
  'dashboard': '/',
  'test-bank': '/test-bank', 
  'reports': '/reports',
  'analytics': '/analytics'
};

const route = routes[pageName];
if (!route) {
  console.error(`Unknown page: ${pageName}`);
  console.error('Available pages:', Object.keys(routes).join(', '));
  process.exit(1);
}

console.log(`\n🧪 Running MCP smoke test for ${pageName} page...`);
console.log(`📍 Route: ${route}`);
console.log(`📄 Instructions: docs/instructions/${pageName}.md`);

// Note: This script demonstrates the structure for MCP testing
// Actual MCP implementation would use Claude Code's Playwright MCP tools
// For now, we'll log what we would test

try {
  const instructionsPath = join(rootDir, 'docs', 'instructions', `${pageName}.md`);
  const instructions = await readFile(instructionsPath, 'utf-8');
  
  // Extract test selectors from instructions (basic regex)
  const selectorMatches = instructions.match(/\[data-testid="[^"]*"\]/g) || [];
  const selectors = [...new Set(selectorMatches)];
  
  console.log(`\n✅ Found ${selectors.length} test selectors in instructions:`);
  selectors.slice(0, 10).forEach(selector => {
    console.log(`  - ${selector}`);
  });
  
  if (selectors.length > 10) {
    console.log(`  ... and ${selectors.length - 10} more`);
  }
  
  console.log(`\n🤖 MCP Test Steps (would execute):`);
  console.log(`  1. Launch Playwright browser`);
  console.log(`  2. Navigate to http://localhost:5173${route}`);
  console.log(`  3. Wait for page to load`);
  console.log(`  4. Verify page title and main container`);
  console.log(`  5. Test key selectors for visibility`);
  console.log(`  6. Execute EPU-specific interactions`);
  console.log(`  7. Assert expected outcomes`);
  console.log(`  8. Close browser`);
  
  console.log(`\n✨ Smoke test plan ready for ${pageName} page`);
  console.log(`   To run actual MCP test: Use Claude Code with Playwright MCP integration`);
  
} catch (error) {
  console.error(`❌ Failed to load instructions: ${error.message}`);
  process.exit(1);
}