#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('📦 Copying native libraries to standalone build...');

// Copy ONNX Runtime dylib to standalone node_modules
const sourceLib = join(
  projectRoot,
  'node_modules/@xenova/transformers/node_modules/onnxruntime-node/bin/napi-v3/darwin/arm64/libonnxruntime.1.14.0.dylib'
);

const targetLib = join(
  projectRoot,
  '.next/standalone/node_modules/@xenova/transformers/node_modules/onnxruntime-node/bin/napi-v3/darwin/arm64/libonnxruntime.1.14.0.dylib'
);

if (!existsSync(sourceLib)) {
  console.warn('⚠️  Source library not found:', sourceLib);
  console.warn('⚠️  Skipping native library copy. This may cause runtime errors.');
  process.exit(0);
}

// Ensure target directory exists
const targetDir = dirname(targetLib);
if (!existsSync(targetDir)) {
  mkdirSync(targetDir, { recursive: true });
}

try {
  copyFileSync(sourceLib, targetLib);
  console.log('✅ Copied libonnxruntime.1.14.0.dylib');

  // Also copy x64 version for compatibility
  const sourceLibX64 = sourceLib.replace('/arm64/', '/x64/');
  const targetLibX64 = targetLib.replace('/arm64/', '/x64/');
  const targetDirX64 = dirname(targetLibX64);

  if (existsSync(sourceLibX64)) {
    if (!existsSync(targetDirX64)) {
      mkdirSync(targetDirX64, { recursive: true });
    }
    copyFileSync(sourceLibX64, targetLibX64);
    console.log('✅ Copied libonnxruntime.1.14.0.dylib (x64)');
  }

  console.log('✅ Native libraries copied successfully');
} catch (error) {
  console.error('❌ Failed to copy native libraries:', error.message);
  process.exit(1);
}
