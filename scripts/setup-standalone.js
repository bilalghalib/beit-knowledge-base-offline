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

// Copy data folder to standalone/data
const dataSource = join(projectRoot, 'data');
const dataTarget = join(projectRoot, '.next', 'standalone', 'data');

if (existsSync(dataSource)) {
  try {
    cpSync(dataSource, dataTarget, { recursive: true });
    console.log('✅ Copied data to standalone/data');

    // Verify critical files were copied
    const criticalFiles = [
      'insights_embedded_1024.json',
      'curriculum_embedded_1024.json',
      'metadata_embedded_1024.json'
    ];

    let allPresent = true;
    for (const file of criticalFiles) {
      const filePath = join(dataTarget, file);
      if (!existsSync(filePath)) {
        console.error(`❌ Missing critical file: ${file}`);
        allPresent = false;
      }
    }

    if (allPresent) {
      console.log('✅ All critical embedding files present');
    } else {
      console.error('❌ Some embedding files are missing! Run: npm run precompute-embeddings');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Failed to copy data folder:', error.message);
    process.exit(1);
  }
} else {
  console.error('❌ Data folder not found!');
  console.error('   Run: npm run precompute-embeddings');
  process.exit(1);
}

// Copy models folder to standalone/models
const modelsSource = join(projectRoot, 'models');
const modelsTarget = join(projectRoot, '.next', 'standalone', 'models');

if (existsSync(modelsSource)) {
  try {
    cpSync(modelsSource, modelsTarget, { recursive: true });
    console.log('✅ Copied models to standalone/models');

    // Verify BGE model is present
    const bgeModelPath = join(modelsTarget, 'transformers', 'models--Xenova--bge-large-en-v1.5');
    if (existsSync(bgeModelPath)) {
      console.log('✅ BGE-large-en-v1.5 model present');
    } else {
      console.error('❌ BGE model not found!');
      console.error('   Run: npm run download-transformers-model');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Failed to copy models folder:', error.message);
    process.exit(1);
  }
} else {
  console.error('❌ Models folder not found!');
  console.error('   Run: npm run download-transformers-model');
  process.exit(1);
}

console.log('✅ Standalone setup complete');
