#!/usr/bin/env node

/**
 * Download BGE-base embedding model using Transformers.js
 * This runs during build time and bundles the model with the app
 *
 * Model: Xenova/bge-base-en-v1.5
 * Size: ~440MB
 * Dimensions: 768
 * Quality: Rivals OpenAI embeddings
 */

import { pipeline, env } from '@xenova/transformers';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure where models are stored
const MODELS_DIR = path.join(__dirname, '..', 'models', 'transformers');
env.cacheDir = MODELS_DIR;

const MODEL_NAME = 'Xenova/bge-large-en-v1.5';

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║                                                              ║');
console.log('║   Downloading BGE-large Embedding Model                     ║');
console.log('║   (Transformers.js / ONNX)                                   ║');
console.log('║                                                              ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log('📦 Model: BGE-large-en-v1.5');
console.log('📊 Dimensions: 1024 (closest to OpenAI\'s 1536)');
console.log('🎯 Quality: Excellent, rivals OpenAI embeddings');
console.log('💰 Cost: FREE (fully offline)');
console.log('📁 Location:', MODELS_DIR);
console.log('💾 Size: ~300MB\n');

// Create models directory if it doesn't exist
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
  console.log('✅ Created models directory\n');
}

async function downloadModel() {
  try {
    console.log('⏳ Downloading model from HuggingFace...');
    console.log('   This may take a few minutes depending on your connection.\n');

    const startTime = Date.now();

    // Initialize the pipeline - this will download the model
    const extractor = await pipeline('feature-extraction', MODEL_NAME, {
      quantized: true, // Use quantized version for smaller size
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n✅ Model downloaded successfully!');
    console.log(`⏱️  Download time: ${duration} seconds`);

    // Test the model
    console.log('\n🧪 Testing model...');
    const testText = 'Green building practices reduce energy consumption.';
    const result = await extractor(testText, { pooling: 'mean', normalize: true });

    const embedding = Array.from(result.data);
    console.log('✅ Model test successful!');
    console.log(`   Generated ${embedding.length}-dimensional embedding`);

    // Show model location
    console.log('\n📁 Model location:', MODELS_DIR);

    // Check actual size
    const getDirectorySize = (dirPath) => {
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
    };

    const totalSize = getDirectorySize(MODELS_DIR);
    const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    console.log(`💾 Total model size: ${sizeMB} MB`);

    console.log('\n📋 Next steps:');
    console.log('   1. Run: npm run precompute-embeddings:transformers');
    console.log('   2. Build: npm run build');
    console.log('   3. Package: npm run electron:build:win');
    console.log('   4. Model will be bundled with the app!');

    console.log('\n🎉 Setup complete! App will work 100% offline.');

  } catch (error) {
    console.error('\n❌ Error downloading model:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

downloadModel();
