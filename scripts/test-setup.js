#!/usr/bin/env node

/**
 * Test script to verify all downloads and setup
 * Tests: Model download, embedding generation, vector search
 */

import { pipeline, env } from '@xenova/transformers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODELS_DIR = path.join(__dirname, '..', 'models', 'transformers');
const DATA_DIR = path.join(__dirname, '..', 'data');

env.cacheDir = MODELS_DIR;
env.allowLocalModels = true;
env.allowRemoteModels = false;

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║                                                              ║');
console.log('║   BEIT Knowledge Base - Setup Verification                  ║');
console.log('║                                                              ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  testsRun++;
  return fn()
    .then(() => {
      testsPassed++;
      console.log(`✅ ${name}`);
      return true;
    })
    .catch((error) => {
      testsFailed++;
      console.error(`❌ ${name}`);
      console.error(`   Error: ${error.message}`);
      return false;
    });
}

async function main() {
  console.log('🧪 Running setup verification tests...\n');

  // Test 1: Check if models directory exists
  await test('Models directory exists', async () => {
    if (!fs.existsSync(MODELS_DIR)) {
      throw new Error(`Models directory not found at: ${MODELS_DIR}`);
    }
  });

  // Test 2: Check model size
  await test('BGE-large model downloaded (should be ~400MB)', async () => {
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

    if (totalSize < 100 * 1024 * 1024) {
      throw new Error(`Model seems incomplete (${sizeMB} MB). Expected ~400MB.`);
    }

    console.log(`   Model size: ${sizeMB} MB`);
  });

  // Test 3: Load model
  let extractor;
  await test('Load BGE-large model', async () => {
    extractor = await pipeline('feature-extraction', 'Xenova/bge-large-en-v1.5', {
      quantized: true,
    });
  });

  // Test 4: Generate test embedding
  await test('Generate test embedding', async () => {
    if (!extractor) throw new Error('Model not loaded');

    const testText = 'Green building practices reduce energy consumption.';
    const result = await extractor(testText, { pooling: 'mean', normalize: true });
    const embedding = Array.from(result.data);

    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Invalid embedding generated');
    }

    console.log(`   Embedding dimensions: ${embedding.length}`);

    if (embedding.length !== 1024) {
      throw new Error(`Wrong dimensions: ${embedding.length}. Expected 1024.`);
    }
  });

  // Test 5: Check data files exist
  await test('Data files exist', async () => {
    const requiredFiles = ['insights.json', 'curriculum_content.json', 'metadata_facts.json'];

    for (const file of requiredFiles) {
      const filePath = path.join(DATA_DIR, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Missing data file: ${file}`);
      }
    }

    console.log(`   Found all required data files`);
  });

  // Test 6: Check if embeddings are being generated (or already exist)
  await test('Embedding files status', async () => {
    const embeddingFiles = [
      'insights_embedded.json',
      'curriculum_embedded.json',
      'metadata_embedded.json'
    ];

    const statuses = [];

    for (const file of embeddingFiles) {
      const filePath = path.join(DATA_DIR, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

        // Check dimensions
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (content.length > 0 && content[0].embedding) {
          const dims = content[0].embedding.length;
          statuses.push(`${file}: ${sizeMB} MB (${dims} dims, ${content.length} items)`);
        } else {
          statuses.push(`${file}: ${sizeMB} MB (${content.length} items)`);
        }
      } else {
        statuses.push(`${file}: Not generated yet`);
      }
    }

    console.log(`   Embedding files:`);
    statuses.forEach(s => console.log(`   - ${s}`));
  });

  // Test 7: Test vector similarity calculation
  await test('Vector similarity calculation', async () => {
    if (!extractor) throw new Error('Model not loaded');

    const text1 = 'Green building reduces energy use';
    const text2 = 'Energy-efficient construction saves power';
    const text3 = 'The cat sat on the mat';

    const [result1, result2, result3] = await Promise.all([
      extractor(text1, { pooling: 'mean', normalize: true }),
      extractor(text2, { pooling: 'mean', normalize: true }),
      extractor(text3, { pooling: 'mean', normalize: true })
    ]);

    const emb1 = Array.from(result1.data);
    const emb2 = Array.from(result2.data);
    const emb3 = Array.from(result3.data);

    // Calculate cosine similarity
    const cosineSimilarity = (a, b) => {
      let dotProduct = 0;
      for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
      }
      return dotProduct; // Already normalized
    };

    const sim12 = cosineSimilarity(emb1, emb2);
    const sim13 = cosineSimilarity(emb1, emb3);

    console.log(`   Similarity (similar texts): ${(sim12 * 100).toFixed(1)}%`);
    console.log(`   Similarity (different texts): ${(sim13 * 100).toFixed(1)}%`);

    if (sim12 <= sim13) {
      throw new Error('Similar texts should have higher similarity than different texts');
    }
  });

  // Summary
  console.log('\n' + '═'.repeat(64));
  console.log('📊 Test Summary:');
  console.log(`   Total: ${testsRun}`);
  console.log(`   ✅ Passed: ${testsPassed}`);
  console.log(`   ❌ Failed: ${testsFailed}`);
  console.log('═'.repeat(64));

  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! Setup is complete and working.');
    console.log('\n📋 Next steps:');
    console.log('   1. Wait for embeddings to finish (if still running)');
    console.log('   2. Run: npm run build');
    console.log('   3. Test search: npm run start');
    console.log('   4. Build desktop app: npm run electron:build:win');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});
