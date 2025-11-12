#!/usr/bin/env node

/**
 * Prepare standalone Next.js build for Electron packaging
 *
 * Next.js standalone output requires manual copying of:
 * 1. .next/static -> .next/standalone/.next/static
 * 2. public -> .next/standalone/public
 *
 * This script automates that process.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const standaloneDir = path.join(projectRoot, '.next', 'standalone');
const staticSource = path.join(projectRoot, '.next', 'static');
const staticDest = path.join(standaloneDir, '.next', 'static');
const publicSource = path.join(projectRoot, 'public');
const publicDest = path.join(standaloneDir, 'public');

console.log('📦 Preparing standalone build for Electron...\n');

/**
 * Copy directory recursively
 */
function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`⚠️  Source not found: ${src}`);
    return;
  }

  // Create destination directory
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Get directory size
 */
function getDirectorySize(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;

  let size = 0;
  const files = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(dirPath, file.name);
    if (file.isDirectory()) {
      size += getDirectorySize(filePath);
    } else {
      size += fs.statSync(filePath).size;
    }
  }
  return size;
}

try {
  // Check if standalone build exists
  if (!fs.existsSync(standaloneDir)) {
    console.error('❌ Standalone build not found!');
    console.error('   Run: npm run build');
    console.error('   Make sure next.config has: output: "standalone"');
    process.exit(1);
  }

  console.log('✅ Found standalone build');

  // Check if server.js exists
  const serverPath = path.join(standaloneDir, 'server.js');
  if (!fs.existsSync(serverPath)) {
    console.error('❌ server.js not found in standalone build!');
    console.error(`   Expected: ${serverPath}`);
    process.exit(1);
  }

  console.log('✅ Found server.js\n');

  // Copy static files
  console.log('📁 Copying static assets...');
  if (fs.existsSync(staticSource)) {
    // Remove old static if it exists
    if (fs.existsSync(staticDest)) {
      fs.rmSync(staticDest, { recursive: true, force: true });
    }
    copyRecursive(staticSource, staticDest);
    const staticSize = (getDirectorySize(staticDest) / (1024 * 1024)).toFixed(2);
    console.log(`   ✅ Copied .next/static (${staticSize} MB)`);
  } else {
    console.warn('   ⚠️  No .next/static directory found');
  }

  // Copy public files
  console.log('📁 Copying public assets...');
  if (fs.existsSync(publicSource)) {
    // Remove old public if it exists
    if (fs.existsSync(publicDest)) {
      fs.rmSync(publicDest, { recursive: true, force: true });
    }
    copyRecursive(publicSource, publicDest);
    const publicSize = (getDirectorySize(publicDest) / (1024 * 1024)).toFixed(2);
    console.log(`   ✅ Copied public (${publicSize} MB)`);
  } else {
    console.warn('   ⚠️  No public directory found');
  }

  // Copy data directory to standalone
  const dataSource = path.join(projectRoot, 'data');
  const dataDest = path.join(standaloneDir, 'data');

  console.log('📁 Copying data files...');
  if (fs.existsSync(dataSource)) {
    // Remove old data if it exists
    if (fs.existsSync(dataDest)) {
      fs.rmSync(dataDest, { recursive: true, force: true });
    }
    copyRecursive(dataSource, dataDest);
    const dataSize = (getDirectorySize(dataDest) / (1024 * 1024)).toFixed(2);
    console.log(`   ✅ Copied data (${dataSize} MB)`);
  } else {
    console.warn('   ⚠️  No data directory found');
  }

  // Show final stats
  const totalSize = (getDirectorySize(standaloneDir) / (1024 * 1024)).toFixed(2);
  console.log('\n🎉 Standalone build ready for packaging!');
  console.log(`📊 Total size: ${totalSize} MB`);
  console.log(`📁 Location: ${standaloneDir}\n`);

  console.log('📋 Next steps:');
  console.log('   Mac:     npx electron-builder --mac');
  console.log('   Windows: npx electron-builder --win');
  console.log('   Linux:   npx electron-builder --linux\n');

} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
