#!/usr/bin/env node

/**
 * Pre-compute embeddings using OpenAI (better quality than Ollama)
 *
 * Cost: ~$0.10 for all 500 items (text-embedding-3-small)
 * Quality: Excellent (1536 dimensions)
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/precompute-embeddings-openai.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DATA_DIR = path.join(__dirname, '..', 'data');

if (!OPENAI_API_KEY) {
  console.error('❌ Error: OPENAI_API_KEY environment variable is required');
  console.error('\nUsage:');
  console.error('  OPENAI_API_KEY=sk-your-key node scripts/precompute-embeddings-openai.js');
  console.error('\nGet your API key from: https://platform.openai.com/api-keys');
  process.exit(1);
}

console.log('🧠 Pre-computing Embeddings using OpenAI\n');
console.log('📁 Data directory:', DATA_DIR);
console.log('🤖 Model: text-embedding-3-small (1536 dimensions)');
console.log('💰 Estimated cost: $0.10 - $0.20 total\n');

/**
 * Get embedding from OpenAI
 */
async function getEmbedding(text) {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error(`Failed to get embedding: ${error.message}`);
    throw error;
  }
}

/**
 * Batch embeddings to reduce API calls
 */
async function getBatchEmbeddings(texts) {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: texts,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.data.map(item => item.embedding);
  } catch (error) {
    console.error(`Failed to get batch embeddings: ${error.message}`);
    throw error;
  }
}

/**
 * Check if embeddings need to be regenerated
 */
async function needsRegeneration(sourceFile, embeddedFile) {
  try {
    const sourcePath = path.join(DATA_DIR, sourceFile);
    const embeddedPath = path.join(DATA_DIR, embeddedFile);

    // Check if embedded file exists
    try {
      await fs.access(embeddedPath);
    } catch {
      console.log(`  ℹ️  ${embeddedFile} doesn't exist, will generate`);
      return true;
    }

    // Check if source is newer than embedded
    const sourceStats = await fs.stat(sourcePath);
    const embeddedStats = await fs.stat(embeddedPath);

    if (sourceStats.mtime > embeddedStats.mtime) {
      console.log(`  ℹ️  ${sourceFile} has been modified, will regenerate`);
      return true;
    }

    console.log(`  ✅ ${embeddedFile} is up to date`);
    return false;
  } catch (error) {
    console.log(`  ⚠️  Error checking ${embeddedFile}, will regenerate: ${error.message}`);
    return true;
  }
}

/**
 * Add embeddings to insights
 */
async function embedInsights() {
  console.log('📝 Processing insights...');

  const sourceFile = 'insights.json';
  const embeddedFile = 'insights_embedded.json';

  // Check if we need to regenerate
  if (!(await needsRegeneration(sourceFile, embeddedFile))) {
    const embeddedPath = path.join(DATA_DIR, embeddedFile);
    const existing = JSON.parse(await fs.readFile(embeddedPath, 'utf-8'));
    console.log(`  📋 Using cached embeddings (${existing.length} items)\n`);
    return existing;
  }

  const insightsPath = path.join(DATA_DIR, sourceFile);
  const insights = JSON.parse(await fs.readFile(insightsPath, 'utf-8'));

  const embeddedInsights = [];
  const batchSize = 100; // OpenAI allows up to 2048 inputs per batch

  for (let i = 0; i < insights.length; i += batchSize) {
    const batch = insights.slice(i, i + batchSize);

    console.log(`  Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(insights.length / batchSize)} (${batch.length} items)`);

    // Prepare texts for batch
    const texts = batch.map(insight => {
      return [
        insight.theme_english,
        insight.quote_english,
        insight.quote_arabic,
        insight.context_notes_english,
      ]
        .filter(Boolean)
        .join('\n');
    });

    // Get embeddings in batch
    const embeddings = await getBatchEmbeddings(texts);

    // Create embedded documents
    for (let j = 0; j < batch.length; j++) {
      const insight = batch[j];
      embeddedInsights.push({
        id: insight.id,
        text: texts[j],
        embedding: embeddings[j],
        metadata: {
          expert: insight.expert || '',
          module: insight.module || '',
          theme_english: insight.theme_english || '',
          quote_english: insight.quote_english || '',
          quote_arabic: insight.quote_arabic || '',
          priority: insight.priority || '',
          insight_type: insight.insight_type || '',
          tags_english: insight.tags_english || '',
          timestamp: insight.timestamp || '',
        },
        type: 'insight',
      });
    }

    // Small delay to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const outputPath = path.join(DATA_DIR, 'insights_embedded.json');
  await fs.writeFile(outputPath, JSON.stringify(embeddedInsights, null, 2));

  console.log(`✅ Saved ${embeddedInsights.length} insights to ${outputPath}\n`);
  return embeddedInsights;
}

/**
 * Add embeddings to curriculum
 */
async function embedCurriculum() {
  console.log('📚 Processing curriculum...');

  const sourceFile = 'curriculum_content.json';
  const embeddedFile = 'curriculum_embedded.json';

  // Check if we need to regenerate
  if (!(await needsRegeneration(sourceFile, embeddedFile))) {
    const embeddedPath = path.join(DATA_DIR, embeddedFile);
    const existing = JSON.parse(await fs.readFile(embeddedPath, 'utf-8'));
    console.log(`  📋 Using cached embeddings (${existing.length} items)\n`);
    return existing;
  }

  const curriculumPath = path.join(DATA_DIR, sourceFile);
  const curriculum = JSON.parse(await fs.readFile(curriculumPath, 'utf-8'));

  const texts = curriculum.map(item => {
    return [
      item.activity_name,
      `Purpose: ${item.purpose || 'N/A'}`,
      `Duration: ${item.duration || 'N/A'}`,
      item.searchable_content,
    ]
      .filter(Boolean)
      .join('\n');
  });

  console.log(`  Getting embeddings for ${curriculum.length} items...`);
  const embeddings = await getBatchEmbeddings(texts);

  const embeddedCurriculum = curriculum.map((item, i) => ({
    id: item.id,
    text: texts[i],
    embedding: embeddings[i],
    metadata: {
      module: item.module,
      day: item.day,
      day_theme: item.day_theme,
      session_number: item.session_number,
      activity_name: item.activity_name,
      purpose: item.purpose,
      duration: item.duration,
      searchable_content: item.searchable_content,
    },
    type: 'curriculum',
  }));

  const outputPath = path.join(DATA_DIR, 'curriculum_embedded.json');
  await fs.writeFile(outputPath, JSON.stringify(embeddedCurriculum, null, 2));

  console.log(`✅ Saved ${embeddedCurriculum.length} curriculum items to ${outputPath}\n`);
  return embeddedCurriculum;
}

/**
 * Add embeddings to metadata
 */
async function embedMetadata() {
  console.log('ℹ️  Processing metadata...');

  const sourceFile = 'metadata_facts.json';
  const embeddedFile = 'metadata_embedded.json';

  // Check if we need to regenerate
  if (!(await needsRegeneration(sourceFile, embeddedFile))) {
    const embeddedPath = path.join(DATA_DIR, embeddedFile);
    const existing = JSON.parse(await fs.readFile(embeddedPath, 'utf-8'));
    console.log(`  📋 Using cached embeddings (${existing.length} items)\n`);
    return existing;
  }

  const metadataPath = path.join(DATA_DIR, sourceFile);
  const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));

  const texts = metadata.map(item => item.answer);

  console.log(`  Getting embeddings for ${metadata.length} items...`);
  const embeddings = await getBatchEmbeddings(texts);

  const embeddedMetadata = metadata.map((item, i) => ({
    id: item.id,
    text: texts[i],
    embedding: embeddings[i],
    metadata: {
      category: item.category,
      question: item.question,
      answer: item.answer,
      tags: item.tags,
    },
    type: 'metadata',
  }));

  const outputPath = path.join(DATA_DIR, 'metadata_embedded.json');
  await fs.writeFile(outputPath, JSON.stringify(embeddedMetadata, null, 2));

  console.log(`✅ Saved ${embeddedMetadata.length} metadata items to ${outputPath}\n`);
  return embeddedMetadata;
}

/**
 * Calculate total size and cost
 */
async function calculateStats() {
  const files = [
    'insights_embedded.json',
    'curriculum_embedded.json',
    'metadata_embedded.json',
  ];

  let totalSize = 0;

  console.log('\n📊 Final Statistics:');
  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const stats = await fs.stat(filePath);
    totalSize += stats.size;
    console.log(`   ${file}: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  }

  console.log(`\n📦 Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log('   (These will be bundled with the Electron app)\n');

  console.log('💰 Approximate cost: $0.10 - $0.20');
  console.log('   (One-time cost for better quality embeddings)\n');
}

/**
 * Main function
 */
async function main() {
  try {
    const startTime = Date.now();

    console.log('🔍 Checking for cached embeddings...\n');

    // Embed all data (will use cache if available)
    const insights = await embedInsights();
    const curriculum = await embedCurriculum();
    const metadata = await embedMetadata();

    // Show stats
    await calculateStats();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('🎉 All embeddings ready!');
    console.log(`⏱️  Total time: ${elapsed} seconds\n`);
    console.log('📋 Next steps:');
    console.log('   1. The *_embedded.json files are ready');
    console.log('   2. Build the Electron app: npm run electron:build:win');
    console.log('   3. Embeddings will be bundled automatically');
    console.log('   4. App will use ONNX for queries (no OpenAI key needed!)\n');
    console.log('💡 Tip: Embeddings are cached. They will only be regenerated if:');
    console.log('   - Source files (insights.json, curriculum_content.json, etc.) are modified');
    console.log('   - Embedded files are deleted');
    console.log('   - To force regeneration, delete the *_embedded.json files\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Make sure:');
    console.error('   1. Your OPENAI_API_KEY is valid');
    console.error('   2. You have credits in your OpenAI account');
    console.error('   3. You have internet connection');
    process.exit(1);
  }
}

main();
