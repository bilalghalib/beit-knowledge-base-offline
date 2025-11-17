#!/usr/bin/env node
/**
 * Comprehensive Build Validation Script
 *
 * Tests the built Electron app to ensure:
 * 1. All files are present in the package
 * 2. Models and data are correctly bundled
 * 3. App starts successfully
 * 4. API endpoints work
 * 5. Search functionality works offline
 */

import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function formatSize(bytes) {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(2)} MB` : `${(bytes / 1024).toFixed(2)} KB`;
}

function getDirSize(dir) {
  let size = 0;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = join(dir, item.name);
    if (item.isFile()) {
      size += fs.statSync(fullPath).size;
    } else if (item.isDirectory()) {
      size += getDirSize(fullPath);
    }
  }
  return size;
}

let errors = 0;
let warnings = 0;

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║                                                              ║');
console.log('║  🧪 COMPREHENSIVE BUILD VALIDATION                           ║');
console.log('║  Testing packaged app for Windows                           ║');
console.log('║                                                              ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// ============================================================================
// PHASE 1: Static File Validation
// ============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
log('📦 PHASE 1: Static File Validation', 'cyan');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Check dist directory
const distDir = join(projectRoot, 'dist');
if (!fs.existsSync(distDir)) {
  log('❌ dist/ directory not found - run build first!', 'red');
  process.exit(1);
}

// Find the unpacked/built app
const unpackedDirs = fs.readdirSync(distDir).filter(f =>
  f.includes('unpacked') || f.startsWith('mac-') || f.startsWith('linux-')
);
if (unpackedDirs.length === 0) {
  log('❌ No unpacked build found in dist/', 'red');
  log('   Run: npm run electron:build:mac or npm run electron:build:win first', 'yellow');
  process.exit(1);
}

const unpackedDir = join(distDir, unpackedDirs[0]);
log(`✅ Found unpacked build: ${unpackedDirs[0]}`, 'green');

// Determine platform-specific paths based on the unpacked directory name
let appResourcesPath;
if (unpackedDirs[0].includes('mac')) {
  // Mac: dist/mac-unpacked/BEIT Knowledge Base.app/Contents/Resources/app
  const appName = fs.readdirSync(unpackedDir).find(f => f.endsWith('.app'));
  if (!appName) {
    log('❌ .app bundle not found', 'red');
    errors++;
  } else {
    appResourcesPath = join(unpackedDir, appName, 'Contents', 'Resources', 'app');
  }
} else {
  // Windows/Linux: dist/win-unpacked/resources/app
  appResourcesPath = join(unpackedDir, 'resources', 'app');
}

if (!fs.existsSync(appResourcesPath)) {
  log(`❌ App resources not found at: ${appResourcesPath}`, 'red');
  errors++;
} else {
  log(`✅ App resources path: ${appResourcesPath}`, 'green');
}

// Check critical directories
console.log('\n🔍 Checking critical directories...\n');

const checks = [
  { path: join(appResourcesPath, 'electron'), name: 'electron/', required: true },
  { path: join(appResourcesPath, 'data'), name: 'data/', required: true },
  { path: join(appResourcesPath, 'models'), name: 'models/', required: true },
  { path: join(appResourcesPath, 'node_modules'), name: 'node_modules/', required: true },
];

for (const check of checks) {
  if (fs.existsSync(check.path)) {
    const size = getDirSize(check.path);
    log(`   ✅ ${check.name.padEnd(20)} ${formatSize(size).padStart(12)}`, 'green');
  } else {
    if (check.required) {
      log(`   ❌ ${check.name.padEnd(20)} MISSING`, 'red');
      errors++;
    } else {
      log(`   ⚠️  ${check.name.padEnd(20)} Not found`, 'yellow');
      warnings++;
    }
  }
}

// Check data files
console.log('\n🔍 Checking embedding files...\n');

const dataDir = join(appResourcesPath, 'data');
const requiredDataFiles = [
  'insights_embedded_1024.json',
  'curriculum_embedded_1024.json',
  'metadata_embedded_1024.json',
];

for (const file of requiredDataFiles) {
  const filePath = join(dataDir, file);
  if (fs.existsSync(filePath)) {
    const size = fs.statSync(filePath).size;
    log(`   ✅ ${file.padEnd(40)} ${formatSize(size).padStart(12)}`, 'green');
  } else {
    log(`   ❌ ${file.padEnd(40)} MISSING`, 'red');
    errors++;
  }
}

// Check model files
console.log('\n🔍 Checking AI models...\n');

const modelsDir = join(appResourcesPath, 'models', 'transformers');
if (!fs.existsSync(modelsDir)) {
  log('   ❌ models/transformers/ directory not found', 'red');
  errors++;
} else {
  const transformersContents = fs.readdirSync(modelsDir);
  log(`   ✅ models/transformers/ exists (${transformersContents.length} items)`, 'green');

  // Check for BGE model
  const bgeModelDir = transformersContents.find(f => f.includes('bge-large-en-v1.5'));
  if (!bgeModelDir) {
    log('   ❌ BGE-large model directory not found', 'red');
    errors++;
  } else {
    log(`   ✅ BGE model found: ${bgeModelDir}`, 'green');

    // Check for ONNX file
    const onnxDir = join(modelsDir, bgeModelDir, 'onnx');
    if (fs.existsSync(onnxDir)) {
      const onnxFiles = fs.readdirSync(onnxDir).filter(f => f.endsWith('.onnx'));
      if (onnxFiles.length > 0) {
        const onnxPath = join(onnxDir, onnxFiles[0]);
        const size = fs.statSync(onnxPath).size;
        log(`   ✅ ONNX model: ${onnxFiles[0]} (${formatSize(size)})`, 'green');

        if (size < 100 * 1024 * 1024) { // Less than 100MB
          log('   ⚠️  Warning: ONNX model seems small (expected ~300MB)', 'yellow');
          warnings++;
        }
      } else {
        log('   ❌ No .onnx file found in model directory', 'red');
        errors++;
      }
    } else {
      log('   ❌ onnx/ subdirectory not found', 'red');
      errors++;
    }

    // Check for config files
    const configPath = join(modelsDir, bgeModelDir, 'config.json');
    const tokenizerPath = join(modelsDir, bgeModelDir, 'tokenizer.json');

    if (fs.existsSync(configPath)) {
      log('   ✅ config.json present', 'green');
    } else {
      log('   ❌ config.json missing', 'red');
      errors++;
    }

    if (fs.existsSync(tokenizerPath)) {
      log('   ✅ tokenizer.json present', 'green');
    } else {
      log('   ❌ tokenizer.json missing', 'red');
      errors++;
    }
  }
}

// Check Electron files
console.log('\n🔍 Checking Electron files...\n');

const electronFiles = [
  'electron/main.js',
  'electron/preload.js',
  'electron/loading.html',
  'electron/error.html',
];

for (const file of electronFiles) {
  const filePath = join(appResourcesPath, file);
  if (fs.existsSync(filePath)) {
    log(`   ✅ ${file}`, 'green');
  } else {
    log(`   ❌ ${file} MISSING`, 'red');
    errors++;
  }
}

// Check for installers
console.log('\n🔍 Checking installer files...\n');

const installers = fs.readdirSync(distDir).filter(f =>
  f.endsWith('.exe') || f.endsWith('.dmg') || f.endsWith('.AppImage')
);

if (installers.length === 0) {
  log('   ⚠️  No installer files found (.exe, .dmg, .AppImage)', 'yellow');
  warnings++;
} else {
  for (const installer of installers) {
    const size = fs.statSync(join(distDir, installer)).size;
    log(`   ✅ ${installer.padEnd(50)} ${formatSize(size).padStart(12)}`, 'green');
  }
}

// ============================================================================
// PHASE 2: Runtime Validation (Mac only, optional)
// ============================================================================

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
log('🚀 PHASE 2: Runtime Validation', 'cyan');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Only run runtime tests if validating Mac build on Mac
const isMacBuild = unpackedDirs[0].includes('mac');
const canRunTests = process.platform === 'darwin' && isMacBuild;

if (!canRunTests) {
  if (!isMacBuild) {
    log('⏭️  Skipping runtime tests (Windows build cannot run on Mac)', 'yellow');
  } else {
    log('⏭️  Skipping runtime tests (only supported on Mac)', 'yellow');
  }
  log('   Static validation completed successfully.\n', 'blue');
} else {
  log('This will attempt to launch the app and test it...', 'blue');
  log('Press Ctrl+C if you want to skip runtime testing.\n', 'yellow');

  // Give user 3 seconds to cancel
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Try to launch app
  const appName = fs.readdirSync(unpackedDir).find(f => f.endsWith('.app'));
  const appPath = join(unpackedDir, appName);

  log(`📱 Launching app: ${appName}`, 'blue');
  log('   Waiting 15 seconds for startup...\n', 'blue');

  const appProcess = spawn('open', ['-a', appPath], {
    detached: true,
    stdio: 'ignore'
  });

  // Wait for app to start
  await new Promise(resolve => setTimeout(resolve, 15000));

  // Test API endpoints
  log('🔌 Testing API endpoints...\n', 'blue');

  const testEndpoint = async (endpoint, description) => {
    try {
      const response = await fetch(`http://localhost:3000${endpoint}`);
      if (response.ok) {
        log(`   ✅ ${description}`, 'green');
        return true;
      } else {
        log(`   ❌ ${description} - Status: ${response.status}`, 'red');
        errors++;
        return false;
      }
    } catch (error) {
      log(`   ❌ ${description} - Error: ${error.message}`, 'red');
      errors++;
      return false;
    }
  };

  await testEndpoint('/api/insights', 'Insights API');
  await testEndpoint('/api/curriculum', 'Curriculum API');
  await testEndpoint('/api/filters', 'Filters API');

  // Test search endpoint
  log('\n🔍 Testing search functionality...\n', 'blue');

  try {
    const response = await fetch('http://localhost:3000/api/search-smart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'test search', limit: 5 })
    });

    if (response.ok) {
      const data = await response.json();
      log(`   ✅ Search API working`, 'green');
      log(`   📊 Results: ${data.results?.length || 0} items`, 'blue');
      log(`   ⚙️  Method: ${data.method || 'unknown'}`, 'blue');
      log(`   ⏱️  Time: ${data.processingTime || 'N/A'}`, 'blue');

      // Check if using Transformers.js (offline)
      if (data.method?.includes('transformers') || data.method?.includes('1024')) {
        log(`   ✅ Using Transformers.js (offline mode working!)`, 'green');
      } else {
        log(`   ⚠️  Not using Transformers.js - check logs`, 'yellow');
        warnings++;
      }
    } else {
      log(`   ❌ Search API failed - Status: ${response.status}`, 'red');
      errors++;
    }
  } catch (error) {
    log(`   ❌ Search API error: ${error.message}`, 'red');
    errors++;
  }

  log('\n💡 Check the app window to see if it loaded correctly', 'yellow');
  log('   Close the app manually when done testing.\n', 'yellow');
}

// ============================================================================
// Final Summary
// ============================================================================

console.log('\n╔══════════════════════════════════════════════════════════════╗');
log('║  📊 VALIDATION SUMMARY                                       ║', 'bright');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

log(`Errors:   ${errors}`, errors > 0 ? 'red' : 'green');
log(`Warnings: ${warnings}`, warnings > 0 ? 'yellow' : 'green');

if (errors > 0) {
  log('\n❌ BUILD VALIDATION FAILED', 'red');
  log('   Fix the errors above before distributing the app.\n', 'red');
  process.exit(1);
} else if (warnings > 0) {
  log('\n⚠️  BUILD VALIDATION PASSED WITH WARNINGS', 'yellow');
  log('   Review the warnings above.\n', 'yellow');
} else {
  log('\n✅ BUILD VALIDATION PASSED', 'green');
  log('   The build is ready to distribute!\n', 'green');
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
log('🎯 Next Steps:', 'cyan');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (process.platform === 'darwin') {
  log('For Windows testing:', 'blue');
  log('  1. Copy dist/BEIT Knowledge Base-0.1.0-setup.exe to Windows', 'blue');
  log('  2. Install and run', 'blue');
  log('  3. Check Windows Event Viewer or app logs for any errors', 'blue');
} else {
  log('Windows installer ready:', 'blue');
  log('  dist/BEIT Knowledge Base-0.1.0-setup.exe', 'blue');
}

console.log('');
