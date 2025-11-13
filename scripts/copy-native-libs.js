#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('📦 Copying native libraries to standalone build...');

// Define all platforms and their native libraries
const platformConfigs = [
  {
    platform: 'darwin/arm64',
    files: ['libonnxruntime.1.14.0.dylib']
  },
  {
    platform: 'darwin/x64',
    files: ['libonnxruntime.1.14.0.dylib']
  },
  {
    platform: 'win32/x64',
    files: [
      'onnxruntime.dll',
      'onnxruntime_providers_shared.dll'
    ]
  },
  {
    platform: 'win32/arm64',
    files: [
      'onnxruntime.dll',
      'onnxruntime_providers_shared.dll'
    ]
  },
  {
    platform: 'linux/x64',
    files: ['libonnxruntime.so.1.14.0']
  },
  {
    platform: 'linux/arm64',
    files: ['libonnxruntime.so.1.14.0']
  }
];

let copiedCount = 0;
let skippedCount = 0;
let failedCount = 0;

// Copy libraries for each platform
for (const config of platformConfigs) {
  console.log(`\n🔍 Processing ${config.platform}...`);

  for (const file of config.files) {
    const sourcePath = join(
      projectRoot,
      `node_modules/@xenova/transformers/node_modules/onnxruntime-node/bin/napi-v3/${config.platform}/${file}`
    );

    const targetPath = join(
      projectRoot,
      `.next/standalone/node_modules/@xenova/transformers/node_modules/onnxruntime-node/bin/napi-v3/${config.platform}/${file}`
    );

    // Check if source file exists
    if (!existsSync(sourcePath)) {
      console.log(`   ⚠️  Skipped ${file} (not found in source)`);
      skippedCount++;
      continue;
    }

    // Ensure target directory exists
    const targetDir = dirname(targetPath);
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    // Copy the file
    try {
      copyFileSync(sourcePath, targetPath);
      console.log(`   ✅ Copied ${file}`);
      copiedCount++;
    } catch (error) {
      console.error(`   ❌ Failed to copy ${file}:`, error.message);
      failedCount++;
    }
  }
}

// Summary
console.log('\n' + '='.repeat(50));
console.log(`📊 Summary:`);
console.log(`   ✅ Copied: ${copiedCount} files`);
console.log(`   ⚠️  Skipped: ${skippedCount} files`);
console.log(`   ❌ Failed: ${failedCount} files`);

if (copiedCount === 0) {
  console.warn('\n⚠️  WARNING: No native libraries were copied!');
  console.warn('   This may cause runtime errors when using embeddings.');
}

if (failedCount > 0) {
  console.error('\n❌ Some files failed to copy. Build may have issues.');
  process.exit(1);
}

console.log('\n✅ Native library copy process completed');
