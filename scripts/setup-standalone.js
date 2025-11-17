#!/usr/bin/env node
import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const { cpSync, existsSync, mkdirSync, readdirSync } = fs;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  🔧 STANDALONE BUILD SETUP - WITH COMPREHENSIVE LOGGING      ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log('📁 Project root:', projectRoot);
console.log('📍 Current working directory:', process.cwd());
console.log('');

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

console.log('📦 STEP 1: Copying static files...');
console.log('   Source:', staticSource);
console.log('   Target:', staticTarget);

try {
  const startTime = Date.now();
  cpSync(staticSource, staticTarget, { recursive: true });
  const duration = Date.now() - startTime;

  // Count files copied
  const countFiles = (dir) => {
    let count = 0;
    const items = readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory()) {
        count += countFiles(join(dir, item.name));
      } else {
        count++;
      }
    }
    return count;
  };

  const fileCount = countFiles(staticTarget);
  console.log(`✅ Copied .next/static (${fileCount} files) in ${duration}ms`);
} catch (error) {
  console.error('❌ Failed to copy static files:', error.message);
  process.exit(1);
}
console.log('');

// Copy public folder to standalone/public
const publicSource = join(projectRoot, 'public');
const publicTarget = join(projectRoot, '.next', 'standalone', 'public');

console.log('📦 STEP 2: Copying public assets...');
console.log('   Source:', publicSource);
console.log('   Target:', publicTarget);

if (existsSync(publicSource)) {
  try {
    cpSync(publicSource, publicTarget, { recursive: true });
    const fileCount = readdirSync(publicSource).length;
    console.log(`✅ Copied public folder (${fileCount} items)`);
  } catch (error) {
    console.warn('⚠️  Failed to copy public folder:', error.message);
  }
} else {
  console.warn('⚠️  Public folder not found, skipping');
}
console.log('');

// Copy data folder to standalone/data
const dataSource = join(projectRoot, 'data');
const dataTarget = join(projectRoot, '.next', 'standalone', 'data');

console.log('📦 STEP 3: Copying data files (embeddings)...');
console.log('   Source:', dataSource);
console.log('   Target:', dataTarget);

if (existsSync(dataSource)) {
  try {
    cpSync(dataSource, dataTarget, { recursive: true });

    // List all data files with sizes
    const dataFiles = readdirSync(dataTarget).filter(f => f.endsWith('.json'));
    console.log(`✅ Copied data folder (${dataFiles.length} JSON files)`);

    console.log('\n📊 Data files copied:');
    for (const file of dataFiles) {
      const filePath = join(dataTarget, file);
      const stats = fs.statSync(filePath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`   • ${file.padEnd(40)} ${sizeMB.padStart(8)} MB`);
    }

    // Verify critical files were copied
    console.log('\n🔍 Verifying critical embedding files...');
    const criticalFiles = [
      'insights_embedded_1024.json',
      'curriculum_embedded_1024.json',
      'metadata_embedded_1024.json'
    ];

    let allPresent = true;
    for (const file of criticalFiles) {
      const filePath = join(dataTarget, file);
      if (!existsSync(filePath)) {
        console.error(`   ❌ Missing: ${file}`);
        allPresent = false;
      } else {
        const stats = fs.statSync(filePath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`   ✅ Present: ${file} (${sizeMB} MB)`);
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
console.log('');

// Copy models folder to standalone/models
const modelsSource = join(projectRoot, 'models');
const modelsTarget = join(projectRoot, '.next', 'standalone', 'models');

console.log('📦 STEP 4: Copying models (Transformers.js / BGE)...');
console.log('   Source:', modelsSource);
console.log('   Target:', modelsTarget);

if (existsSync(modelsSource)) {
  try {
    const startTime = Date.now();
    cpSync(modelsSource, modelsTarget, { recursive: true });
    const duration = Date.now() - startTime;

    // Calculate total size of models directory
    const getDirectorySize = (dirPath) => {
      let size = 0;
      const items = readdirSync(dirPath, { withFileTypes: true });
      for (const item of items) {
        const itemPath = join(dirPath, item.name);
        if (item.isDirectory()) {
          size += getDirectorySize(itemPath);
        } else {
          size += fs.statSync(itemPath).size;
        }
      }
      return size;
    };

    const totalSize = getDirectorySize(modelsTarget);
    const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);

    console.log(`✅ Copied models folder (${sizeMB} MB) in ${duration}ms`);

    // List directory structure
    console.log('\n📂 Models directory structure:');
    const listDirectory = (dirPath, indent = '') => {
      const items = readdirSync(dirPath, { withFileTypes: true });
      for (const item of items) {
        const itemPath = join(dirPath, item.name);
        if (item.isDirectory()) {
          console.log(`${indent}📁 ${item.name}/`);
          // Only recurse 2 levels deep
          if (indent.length < 6) {
            listDirectory(itemPath, indent + '  ');
          } else {
            const subItems = readdirSync(itemPath);
            console.log(`${indent}   (${subItems.length} items inside)`);
          }
        } else {
          const stats = fs.statSync(itemPath);
          const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
          const sizeDisplay = stats.size > 1024 * 1024 ? `${sizeMB} MB` : `${(stats.size / 1024).toFixed(1)} KB`;
          console.log(`${indent}📄 ${item.name} (${sizeDisplay})`);
        }
      }
    };
    listDirectory(modelsTarget);

    // Verify model files exist (be flexible about structure)
    console.log('\n🔍 Verifying model files...');

    const hasTransformersDir = existsSync(join(modelsTarget, 'transformers'));
    const hasModelFiles = existsSync(join(modelsTarget, 'tokenizer.json')) ||
                         existsSync(join(modelsTarget, 'vocab.txt'));

    console.log(`   • transformers/ directory: ${hasTransformersDir ? '✅ Found' : '❌ Missing'}`);
    console.log(`   • Root model files: ${hasModelFiles ? '✅ Found' : '❌ Missing'}`);

    // Check for model in transformers subdirectory
    let modelFound = false;
    let modelDetails = [];

    if (hasTransformersDir) {
      const transformersDir = join(modelsTarget, 'transformers');
      const entries = readdirSync(transformersDir, { withFileTypes: true });

      // Look for any models--Xenova directory or onnx files
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('models--')) {
          modelFound = true;
          modelDetails.push(`${entry.name}`);
        } else if (entry.name.endsWith('.onnx')) {
          modelFound = true;
          const stats = fs.statSync(join(transformersDir, entry.name));
          modelDetails.push(`${entry.name} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
        } else if (entry.name.includes('bge')) {
          modelFound = true;
          modelDetails.push(entry.name);
        }
      }
    }

    if (modelFound) {
      console.log('   • BGE model files: ✅ Found');
      for (const detail of modelDetails) {
        console.log(`     - ${detail}`);
      }
    } else if (hasModelFiles) {
      console.log('   • Model files: ⚠️  Only basic files found (tokenizer, vocab)');
      console.warn('\n⚠️  WARNING: BGE model may be incomplete!');
      console.warn('   Expected structure: models/transformers/models--Xenova--bge-large-en-v1.5/');
      console.warn('   Current size: ' + sizeMB + ' MB (expected ~300-500 MB for full model)');
      console.warn('   The app will attempt to download the model at runtime');
      console.warn('   For fully offline builds, run: npm run download-transformers-model');
    } else {
      console.warn('\n⚠️  WARNING: Model structure may be incomplete');
      console.warn('   Expected BGE model files not found in typical locations');
      console.warn('   The app will attempt to download the model at runtime');
      console.warn('   For fully offline builds, ensure model is downloaded first');
    }

    // Final size check
    if (totalSize < 100 * 1024 * 1024) {  // Less than 100MB
      console.warn('\n⚠️  WARNING: Models directory is only ' + sizeMB + ' MB');
      console.warn('   A full BGE-large model should be ~300-500 MB');
      console.warn('   ⚡ ACTION REQUIRED: Run "npm run download-transformers-model" before building!');
    } else {
      console.log('\n✅ Model size looks good (' + sizeMB + ' MB)');
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
console.log('');

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  ✅ STANDALONE BUILD SETUP COMPLETE                          ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// Calculate total bundle size
const getDirectorySize = (dirPath) => {
  let size = 0;
  try {
    const items = readdirSync(dirPath, { withFileTypes: true });
    for (const item of items) {
      const itemPath = join(dirPath, item.name);
      if (item.isDirectory()) {
        size += getDirectorySize(itemPath);
      } else {
        size += fs.statSync(itemPath).size;
      }
    }
  } catch (err) {
    // Directory doesn't exist or can't be read
  }
  return size;
};

const standaloneDir = join(projectRoot, '.next', 'standalone');
const totalSize = getDirectorySize(standaloneDir);
const totalSizeGB = (totalSize / (1024 * 1024 * 1024)).toFixed(2);

console.log('📊 Build Summary:');
console.log(`   • Total bundle size: ${totalSizeGB} GB`);
console.log(`   • Location: ${standaloneDir}`);
console.log('');

console.log('📋 Next steps:');
console.log('   1. electron-builder will package this into distributable app');
console.log('   2. The app will include all data and models for offline use');
console.log('   3. First launch will validate all files are present');
console.log('');
