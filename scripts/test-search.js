#!/usr/bin/env node

/**
 * Test script to debug vector search
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

async function main() {
  console.log('🔍 Testing Vector Search\n');

  // Load model
  console.log('⏳ Loading BGE-large model...');
  const extractor = await pipeline('feature-extraction', 'Xenova/bge-large-en-v1.5', {
    quantized: true,
  });
  console.log('✅ Model loaded\n');

  // Generate query embedding
  const query = 'training methods';
  console.log(`📝 Query: "${query}"`);
  const result = await extractor(query, { pooling: 'mean', normalize: true });
  const queryEmbedding = Array.from(result.data);
  console.log(`✅ Query embedding: ${queryEmbedding.length} dimensions\n`);

  // Load insights
  console.log('📚 Loading insights...');
  const insightsData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'insights_embedded.json'), 'utf-8'));
  console.log(`✅ Loaded ${insightsData.length} insights\n`);

  // Calculate cosine similarity function
  function cosineSimilarity(a, b) {
    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }

    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);

    if (magA === 0 || magB === 0) return 0;

    return dotProduct / (magA * magB);
  }

  // Search
  console.log('🔎 Calculating similarities...');
  const results = insightsData
    .map((doc) => ({
      id: doc.id,
      similarity: cosineSimilarity(queryEmbedding, doc.embedding),
      theme: doc.metadata.theme_english || '',
      expert: doc.metadata.expert || '',
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10);

  console.log('\n📊 Top 10 Results:\n');
  results.forEach((r, i) => {
    console.log(`${i + 1}. [${r.id}] Similarity: ${(r.similarity * 100).toFixed(1)}%`);
    console.log(`   Expert: ${r.expert}`);
    console.log(`   Theme: ${r.theme.substring(0, 80)}...`);
    console.log('');
  });

  const numAboveThreshold = insightsData.filter(doc => {
    const sim = cosineSimilarity(queryEmbedding, doc.embedding);
    return sim > 0.1;
  }).length;

  console.log(`\n📈 Statistics:`);
  console.log(`   Total documents: ${insightsData.length}`);
  console.log(`   Above 0.1 threshold: ${numAboveThreshold}`);
  console.log(`   Highest similarity: ${(results[0].similarity * 100).toFixed(1)}%`);
  console.log(`   Lowest in top 10: ${(results[9].similarity * 100).toFixed(1)}%`);
}

main().catch(console.error);
