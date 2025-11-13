#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🔧 Setting up standalone build for production...');

// Copy .next/static to standalone/.next/static
const staticSource = join(projectRoot, '.next', 'static');
const staticTarget = join(projectRoot, '.next', 'standalone', '.next', 'static');

if (!existsSync(staticSource)) {
  console.error('❌ .next/static not found!');
  process.exit(1);
}

const targetDir = dirname(staticTarget);
if (!existsSync(targetDir)) {
  mkdirSync(targetDir, { recursive: true });
}

try {
  cpSync(staticSource, staticTarget, { recursive: true });
  console.log('✅ Copied .next/static to standalone/.next/static');
} catch (error) {
  console.error('❌ Failed to copy static files:', error.message);
  process.exit(1);
}

// Copy public folder to standalone/public
const publicSource = join(projectRoot, 'public');
const publicTarget = join(projectRoot, '.next', 'standalone', 'public');

if (existsSync(publicSource)) {
  try {
    cpSync(publicSource, publicTarget, { recursive: true });
    console.log('✅ Copied public to standalone/public');
  } catch (error) {
    console.warn('⚠️  Failed to copy public folder:', error.message);
  }
}

console.log('✅ Standalone setup complete');
