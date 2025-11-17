#!/usr/bin/env node

/**
 * Pre-Build Verification Script
 *
 * This script verifies that all required files are present before building
 * the Electron app, so you don't waste time on a build that will fail.
 *
 * Run this BEFORE building:
 *   node scripts/verify-build-prerequisites.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

let errorCount = 0;
let warningCount = 0;

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║                                                              ║');
console.log('║  🔍 PRE-BUILD VERIFICATION                                   ║');
console.log('║  Checking all prerequisites before building...              ║');
console.log('║                                                              ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log('📁 Project root:', projectRoot);
console.log('');

// Helper function to get directory size
function getDirectorySize(dirPath) {
  let size = 0;
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        size += getDirectorySize(itemPath);
      } else {
        size += fs.statSync(itemPath).size;
      }
    }
  } catch (err) {
    // Ignore errors
  }
  return size;
}

// 1. Check Next.js build
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📦 STEP 1: Checking Next.js build');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const nextDir = path.join(projectRoot, '.next');
if (!fs.existsSync(nextDir)) {
  console.error('❌ .next directory is missing');
  console.error('   Run: npm run build');
  errorCount++;
} else {
  console.log('✅ .next directory exists');

  const standaloneDir = path.join(nextDir, 'standalone');
  if (!fs.existsSync(standaloneDir)) {
    console.error('❌ .next/standalone directory is missing');
    console.error('   The Next.js build may not have completed successfully');
    console.error('   Run: npm run build');
    errorCount++;
  } else {
    console.log('✅ .next/standalone directory exists');

    const serverJs = path.join(standaloneDir, 'server.js');
    if (!fs.existsSync(serverJs)) {
      console.error('❌ .next/standalone/server.js is missing');
      errorCount++;
    } else {
      console.log('✅ server.js exists');
    }
  }
}
console.log('');

// 2. Check data directory
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📦 STEP 2: Checking data directory (embeddings)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const dataDir = path.join(projectRoot, 'data');
if (!fs.existsSync(dataDir)) {
  console.error('❌ data/ directory is missing');
  console.error('   Run: npm run precompute-embeddings:transformers');
  errorCount++;
} else {
  console.log('✅ data/ directory exists');

  const requiredDataFiles = [
    'insights_embedded_1024.json',
    'curriculum_embedded_1024.json',
    'metadata_embedded_1024.json'
  ];

  console.log('\n📊 Checking required embedding files:\n');

  for (const file of requiredDataFiles) {
    const filePath = path.join(dataDir, file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Missing: ${file}`);
      console.error('   Run: npm run precompute-embeddings:transformers');
      errorCount++;
    } else {
      const stats = fs.statSync(filePath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

      if (stats.size < 100000) {
        console.error(`❌ Too small (corrupted?): ${file} (${stats.size} bytes)`);
        errorCount++;
      } else {
        console.log(`✅ ${file.padEnd(40)} ${sizeMB.padStart(8)} MB`);
      }
    }
  }

  const totalDataSize = getDirectorySize(dataDir);
  const totalDataMB = (totalDataSize / 1024 / 1024).toFixed(2);
  console.log(`\n💾 Total data size: ${totalDataMB} MB`);
}
console.log('');

// 3. Check models directory
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📦 STEP 3: Checking models directory (Transformers.js)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const modelsDir = path.join(projectRoot, 'models');
if (!fs.existsSync(modelsDir)) {
  console.error('❌ models/ directory is missing');
  console.error('   Run: npm run download-transformers-model');
  errorCount++;
} else {
  console.log('✅ models/ directory exists');

  const transformersDir = path.join(modelsDir, 'transformers');
  if (!fs.existsSync(transformersDir)) {
    console.error('❌ models/transformers/ subdirectory is missing');
    console.error('   Run: npm run download-transformers-model');
    errorCount++;
  } else {
    console.log('✅ models/transformers/ subdirectory exists');

    const totalModelsSize = getDirectorySize(transformersDir);
    const totalModelsMB = (totalModelsSize / 1024 / 1024).toFixed(2);

    console.log(`\n💾 Total models size: ${totalModelsMB} MB`);

    // Check for BGE model
    const bgeModelDir = path.join(transformersDir, 'models--Xenova--bge-large-en-v1.5');
    if (!fs.existsSync(bgeModelDir)) {
      console.error('\n❌ BGE model directory not found');
      console.error('   Expected: models/transformers/models--Xenova--bge-large-en-v1.5/');
      console.error('   Run: npm run download-transformers-model');
      errorCount++;
    } else {
      console.log('\n✅ BGE model directory found');

      const modelFiles = fs.readdirSync(bgeModelDir);
      console.log(`   Model contains ${modelFiles.length} items`);

      // Check for key files
      const hasOnnx = modelFiles.some(f => f.includes('onnx'));
      const hasConfig = modelFiles.some(f => f.includes('config'));
      const hasTokenizer = modelFiles.some(f => f.includes('tokenizer'));

      console.log(`   ONNX model: ${hasOnnx ? '✅' : '❌'}`);
      console.log(`   Config: ${hasConfig ? '✅' : '❌'}`);
      console.log(`   Tokenizer: ${hasTokenizer ? '✅' : '❌'}`);

      if (!hasOnnx || !hasConfig || !hasTokenizer) {
        console.error('\n⚠️  Model appears incomplete!');
        console.error('   Run: npm run download-transformers-model');
        warningCount++;
      }
    }

    // Size check
    if (totalModelsSize < 100 * 1024 * 1024) {
      console.error(`\n❌ Models directory is only ${totalModelsMB} MB`);
      console.error('   A full BGE-large model should be ~300-500 MB');
      console.error('   Run: npm run download-transformers-model');
      errorCount++;
    } else {
      console.log(`\n✅ Model size looks good (${totalModelsMB} MB)`);
    }

    // List what's in transformers directory
    console.log('\n📂 Models directory contents:');
    const transformersContents = fs.readdirSync(transformersDir);
    for (const item of transformersContents.slice(0, 10)) {
      const itemPath = path.join(transformersDir, item);
      const isDir = fs.statSync(itemPath).isDirectory();
      if (isDir) {
        const size = getDirectorySize(itemPath);
        const sizeMB = (size / 1024 / 1024).toFixed(2);
        console.log(`   📁 ${item}/ (${sizeMB} MB)`);
      } else {
        const stats = fs.statSync(itemPath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`   📄 ${item} (${sizeMB} MB)`);
      }
    }
    if (transformersContents.length > 10) {
      console.log(`   ... and ${transformersContents.length - 10} more items`);
    }
  }
}
console.log('');

// 4. Check electron files
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📦 STEP 4: Checking Electron files');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const electronFiles = [
  'electron/main.js',
  'electron/preload.js',
  'electron/loading.html',
  'electron/error.html'
];

for (const file of electronFiles) {
  const filePath = path.join(projectRoot, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing: ${file}`);
    errorCount++;
  } else {
    console.log(`✅ ${file}`);
  }
}
console.log('');

// 5. Summary
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  📊 VERIFICATION SUMMARY                                     ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

if (errorCount === 0 && warningCount === 0) {
  console.log('✅ ALL CHECKS PASSED!');
  console.log('');
  console.log('🎉 Your project is ready to build!');
  console.log('');
  console.log('Next steps:');
  console.log('  • For Mac:     npm run electron:build:mac');
  console.log('  • For Windows: npm run electron:build:win');
  console.log('');
} else {
  console.log(`Found ${errorCount} error(s) and ${warningCount} warning(s)\n`);

  if (errorCount > 0) {
    console.error('🔴 CRITICAL ERRORS - BUILD WILL FAIL');
    console.error('   Fix all errors before building\n');
  }

  if (warningCount > 0) {
    console.warn('⚠️  WARNINGS - Build may succeed but app may not work correctly\n');
  }

  console.log('Common fixes:');
  console.log('  1. Download models:    npm run download-transformers-model');
  console.log('  2. Generate embeddings: npm run precompute-embeddings:transformers');
  console.log('  3. Build Next.js:      npm run build');
  console.log('');

  process.exit(1);
}
