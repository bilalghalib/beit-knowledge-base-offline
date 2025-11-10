#!/usr/bin/env node

/**
 * Download ONNX embedding model
 *
 * Downloads the all-MiniLM-L6-v2 model from Hugging Face
 * This is a one-time setup step during development
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODELS_DIR = path.join(__dirname, '..', 'models');
const MODEL_URL = 'https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/onnx/model.onnx';
const TOKENIZER_URL = 'https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/tokenizer.json';
const VOCAB_URL = 'https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/vocab.txt';

console.log('🤖 Downloading ONNX Embedding Model\n');
console.log('Model: all-MiniLM-L6-v2');
console.log('Size: ~25MB');
console.log('Purpose: Offline text embeddings\n');

/**
 * Download a file from URL
 */
async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    console.log(`📥 Downloading: ${path.basename(dest)}`);
    console.log(`   From: ${url}`);

    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        console.log('   Following redirect...');
        https.get(response.headers.location, (redirectResponse) => {
          const totalSize = parseInt(redirectResponse.headers['content-length'], 10);
          let downloadedSize = 0;

          redirectResponse.pipe(file);

          redirectResponse.on('data', (chunk) => {
            downloadedSize += chunk.length;
            const progress = ((downloadedSize / totalSize) * 100).toFixed(1);
            process.stdout.write(`\r   Progress: ${progress}%`);
          });

          file.on('finish', () => {
            file.close();
            console.log('\n✅ Downloaded successfully\n');
            resolve();
          });
        }).on('error', (err) => {
          fs.unlink(dest, () => reject(err));
        });
      } else {
        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloadedSize = 0;

        response.pipe(file);

        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          if (totalSize) {
            const progress = ((downloadedSize / totalSize) * 100).toFixed(1);
            process.stdout.write(`\r   Progress: ${progress}%`);
          }
        });

        file.on('finish', () => {
          file.close();
          console.log('\n✅ Downloaded successfully\n');
          resolve();
        });
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

/**
 * Main function
 */
async function main() {
  try {
    // Create models directory
    if (!fs.existsSync(MODELS_DIR)) {
      fs.mkdirSync(MODELS_DIR, { recursive: true });
      console.log(`📁 Created directory: ${MODELS_DIR}\n`);
    }

    // Check if model already exists
    const modelPath = path.join(MODELS_DIR, 'embedding-model.onnx');
    const tokenizerPath = path.join(MODELS_DIR, 'tokenizer.json');
    const vocabPath = path.join(MODELS_DIR, 'vocab.txt');

    if (fs.existsSync(modelPath)) {
      console.log('⚠️  Model already exists. Delete it to re-download.\n');
      console.log(`   Location: ${modelPath}\n`);

      const stats = fs.statSync(modelPath);
      console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      console.log('   Status: Ready to use! ✅\n');
      return;
    }

    console.log('⏬ Starting downloads...\n');

    // Download model file
    await downloadFile(MODEL_URL, modelPath);

    // Download tokenizer (optional, for better tokenization)
    try {
      await downloadFile(TOKENIZER_URL, tokenizerPath);
    } catch (error) {
      console.warn('⚠️  Could not download tokenizer (optional)');
    }

    // Download vocab (optional)
    try {
      await downloadFile(VOCAB_URL, vocabPath);
    } catch (error) {
      console.warn('⚠️  Could not download vocab (optional)');
    }

    // Verify download
    const stats = fs.statSync(modelPath);
    console.log('\n🎉 ONNX Model Downloaded Successfully!');
    console.log(`\n📊 Model Details:`);
    console.log(`   Path: ${modelPath}`);
    console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Dimensions: 384`);
    console.log(`   Max Sequence: 256 tokens`);

    console.log('\n📋 Next Steps:');
    console.log('   1. Model is ready to use!');
    console.log('   2. It will be bundled with the Electron app');
    console.log('   3. Users will get offline embeddings (no internet needed)');
    console.log('   4. Build the app: npm run electron:build:win\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check your internet connection');
    console.error('   2. Try again in a few minutes (Hugging Face might be busy)');
    console.error('   3. Manual download:');
    console.error('      - Visit: https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2');
    console.error('      - Go to: Files and versions → onnx/');
    console.error('      - Download model.onnx');
    console.error(`      - Save to: ${MODELS_DIR}/embedding-model.onnx\n`);
    process.exit(1);
  }
}

main();
