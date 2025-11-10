#!/usr/bin/env node

/**
 * Pre-compute embeddings for all documents using Ollama
 * This runs ONCE during build time, then embeddings are bundled with the app
 *
 * Run this with: npm run precompute-embeddings
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';
const DATA_DIR = path.join(__dirname, '..', 'data');

console.log('🧠 Pre-computing Embeddings for Offline Use\n');
console.log(`📁 Data directory: ${DATA_DIR}`);
console.log(`🤖 Ollama URL: ${OLLAMA_URL}`);
console.log(`📊 Model: ${EMBED_MODEL}\n`);

/**
 * Get embedding from Ollama
 */
async function getEmbedding(text) {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: EMBED_MODEL,
        prompt: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`);
    }

    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error(`Failed to get embedding for text: ${text.substring(0, 50)}...`);
    throw error;
  }
}

/**
 * Add embeddings to insights
 */
async function embedInsights() {
  console.log('📝 Processing insights...');

  const insightsPath = path.join(DATA_DIR, 'insights.json');
  const insights = JSON.parse(await fs.readFile(insightsPath, 'utf-8'));

  const embeddedInsights = [];

  for (let i = 0; i < insights.length; i++) {
    const insight = insights[i];

    // Create searchable text from insight
    const text = [
      insight.theme_english,
      insight.quote_english,
      insight.quote_arabic,
      insight.context_notes_english,
    ]
      .filter(Boolean)
      .join('\n');

    console.log(`  [${i + 1}/${insights.length}] ${insight.id}`);

    const embedding = await getEmbedding(text);

    embeddedInsights.push({
      id: insight.id,
      text: text,
      embedding: embedding,
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

    // Small delay to avoid overloading Ollama
    await new Promise((resolve) => setTimeout(resolve, 100));
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

  const curriculumPath = path.join(DATA_DIR, 'curriculum_content.json');
  const curriculum = JSON.parse(await fs.readFile(curriculumPath, 'utf-8'));

  const embeddedCurriculum = [];

  for (let i = 0; i < curriculum.length; i++) {
    const item = curriculum[i];

    // Create searchable text
    const text = [
      item.activity_name,
      `Purpose: ${item.purpose || 'N/A'}`,
      `Duration: ${item.duration || 'N/A'}`,
      item.searchable_content,
    ]
      .filter(Boolean)
      .join('\n');

    console.log(`  [${i + 1}/${curriculum.length}] ${item.id}`);

    const embedding = await getEmbedding(text);

    embeddedCurriculum.push({
      id: item.id,
      text: text,
      embedding: embedding,
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
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

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

  const metadataPath = path.join(DATA_DIR, 'metadata_facts.json');
  const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));

  const embeddedMetadata = [];

  for (let i = 0; i < metadata.length; i++) {
    const item = metadata[i];

    const text = item.answer;

    console.log(`  [${i + 1}/${metadata.length}] ${item.id}`);

    const embedding = await getEmbedding(text);

    embeddedMetadata.push({
      id: item.id,
      text: text,
      embedding: embedding,
      metadata: {
        category: item.category,
        question: item.question,
        answer: item.answer,
        tags: item.tags,
      },
      type: 'metadata',
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const outputPath = path.join(DATA_DIR, 'metadata_embedded.json');
  await fs.writeFile(outputPath, JSON.stringify(embeddedMetadata, null, 2));

  console.log(`✅ Saved ${embeddedMetadata.length} metadata items to ${outputPath}\n`);
  return embeddedMetadata;
}

/**
 * Calculate total size of embedded files
 */
async function calculateSize() {
  const files = [
    'insights_embedded.json',
    'curriculum_embedded.json',
    'metadata_embedded.json',
  ];

  let totalSize = 0;

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const stats = await fs.stat(filePath);
    totalSize += stats.size;
    console.log(`   ${file}: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  }

  console.log(`\n📦 Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log('   This will be bundled with the Electron app\n');
}

/**
 * Main function
 */
async function main() {
  try {
    // Check if Ollama is running
    console.log('🔍 Checking Ollama...');
    const response = await fetch(`${OLLAMA_URL}/api/version`);
    if (!response.ok) {
      throw new Error('Ollama is not running');
    }
    console.log('✅ Ollama is running\n');

    // Embed all data
    await embedInsights();
    await embedCurriculum();
    await embedMetadata();

    // Show size info
    await calculateSize();

    console.log('🎉 All embeddings pre-computed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. The *_embedded.json files are ready');
    console.log('   2. Build the Electron app: npm run electron:build:win');
    console.log('   3. Embeddings will be bundled automatically');
    console.log('   4. App will work offline with NO external dependencies!\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Make sure:');
    console.error('   1. Ollama is running: ollama serve');
    console.error('   2. Model is downloaded: ollama pull nomic-embed-text');
    console.error('   3. Ollama is accessible at', OLLAMA_URL);
    process.exit(1);
  }
}

main();
