#!/usr/bin/env node

/**
 * Pre-compute embeddings using ONNX model (fully offline)
 *
 * Cost: FREE (runs locally)
 * Quality: Good (384 dimensions, all-MiniLM-L6-v2)
 * Speed: Moderate (CPU-based inference)
 *
 * Usage:
 *   node scripts/precompute-embeddings-onnx.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const MODELS_DIR = path.join(__dirname, '..', 'models');

console.log('🧠 Pre-computing Embeddings using ONNX (Offline)\n');
console.log('📁 Data directory:', DATA_DIR);
console.log('🤖 Model: all-MiniLM-L6-v2 (384 dimensions)');
console.log('💰 Cost: FREE (runs locally)\n');

// Dynamically import the ONNX embeddings module
let getEmbedding, getBatchEmbeddings;

try {
  const onnxModule = await import('../lib/onnx-embeddings.ts');
  getEmbedding = onnxModule.getEmbedding;
  getBatchEmbeddings = onnxModule.getBatchEmbeddings;
  console.log('✅ ONNX module loaded\n');
} catch (error) {
  console.error('❌ Failed to load ONNX module:', error.message);
  console.error('\nMake sure the ONNX model is downloaded:');
  console.error('  npm run download-onnx-model');
  process.exit(1);
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

    // Check if dimensions match (ONNX uses 384 dims)
    const embedded = JSON.parse(await fs.readFile(embeddedPath, 'utf-8'));
    if (embedded.length > 0 && embedded[0].embedding) {
      const dims = embedded[0].embedding.length;
      if (dims !== 384) {
        console.log(`  ℹ️  Dimension mismatch (${dims} vs 384), will regenerate`);
        return true;
      }
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

  console.log(`  Generating embeddings for ${insights.length} insights...`);

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

    if ((i + 1) % 10 === 0 || i === insights.length - 1) {
      process.stdout.write(`\r  Progress: ${i + 1}/${insights.length}`);
    }

    try {
      const embedding = await getEmbedding(text);

      embeddedInsights.push({
        id: insight.id,
        text,
        embedding,
        metadata: {
          expert: insight.expert || null,
          module: insight.module || null,
          theme_english: insight.theme_english || null,
          theme_arabic: insight.theme_arabic || null,
          quote_english: insight.quote_english || null,
          quote_arabic: insight.quote_arabic || null,
          context_notes_english: insight.context_notes_english || null,
          context_notes_arabic: insight.context_notes_arabic || null,
          priority: insight.priority || null,
        },
      });
    } catch (error) {
      console.error(`\n  ⚠️  Failed to embed insight ${insight.id}: ${error.message}`);
      // Continue with other insights
    }
  }

  console.log('\n');

  // Save to file
  const outputPath = path.join(DATA_DIR, embeddedFile);
  await fs.writeFile(outputPath, JSON.stringify(embeddedInsights, null, 2));
  console.log(`  ✅ Saved ${embeddedFile} (${embeddedInsights.length} items)\n`);

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

  const embeddedCurriculum = [];

  console.log(`  Generating embeddings for ${curriculum.length} curriculum items...`);

  for (let i = 0; i < curriculum.length; i++) {
    const item = curriculum[i];

    // Create searchable text
    const text = [
      item.module,
      item.day,
      item.session_title,
      item.activity_name,
      item.purpose,
    ]
      .filter(Boolean)
      .join('\n');

    if ((i + 1) % 10 === 0 || i === curriculum.length - 1) {
      process.stdout.write(`\r  Progress: ${i + 1}/${curriculum.length}`);
    }

    try {
      const embedding = await getEmbedding(text);

      embeddedCurriculum.push({
        id: item.id,
        text,
        embedding,
        metadata: {
          module: item.module || null,
          day: item.day || null,
          session_number: item.session_number || null,
          session_title: item.session_title || null,
          activity_name: item.activity_name || null,
          purpose: item.purpose || null,
          duration_mins: item.duration_mins || null,
        },
      });
    } catch (error) {
      console.error(`\n  ⚠️  Failed to embed curriculum ${item.id}: ${error.message}`);
    }
  }

  console.log('\n');

  const outputPath = path.join(DATA_DIR, embeddedFile);
  await fs.writeFile(outputPath, JSON.stringify(embeddedCurriculum, null, 2));
  console.log(`  ✅ Saved ${embeddedFile} (${embeddedCurriculum.length} items)\n`);

  return embeddedCurriculum;
}

/**
 * Add embeddings to metadata
 */
async function embedMetadata() {
  console.log('ℹ️  Processing metadata...');

  const sourceFile = 'metadata.json';
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

  const embeddedMetadata = [];

  console.log(`  Generating embeddings for ${metadata.length} metadata items...`);

  for (let i = 0; i < metadata.length; i++) {
    const item = metadata[i];

    const text = [item.question, item.answer].filter(Boolean).join('\n');

    if ((i + 1) % 5 === 0 || i === metadata.length - 1) {
      process.stdout.write(`\r  Progress: ${i + 1}/${metadata.length}`);
    }

    try {
      const embedding = await getEmbedding(text);

      embeddedMetadata.push({
        id: item.id,
        text,
        embedding,
        metadata: {
          category: item.category || 'general',
          question: item.question || null,
          answer: item.answer || null,
        },
      });
    } catch (error) {
      console.error(`\n  ⚠️  Failed to embed metadata ${item.id}: ${error.message}`);
    }
  }

  console.log('\n');

  const outputPath = path.join(DATA_DIR, embeddedFile);
  await fs.writeFile(outputPath, JSON.stringify(embeddedMetadata, null, 2));
  console.log(`  ✅ Saved ${embeddedFile} (${embeddedMetadata.length} items)\n`);

  return embeddedMetadata;
}

/**
 * Main function
 */
async function main() {
  const startTime = Date.now();

  try {
    console.log('🔍 Checking for cached embeddings...\n');

    const [insights, curriculum, metadata] = await Promise.all([
      embedInsights(),
      embedCurriculum(),
      embedMetadata(),
    ]);

    // Calculate file sizes
    const insightsSize = (await fs.stat(path.join(DATA_DIR, 'insights_embedded.json'))).size;
    const curriculumSize = (await fs.stat(path.join(DATA_DIR, 'curriculum_embedded.json'))).size;
    const metadataSize = (await fs.stat(path.join(DATA_DIR, 'metadata_embedded.json'))).size;

    const formatSize = (bytes) => {
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    console.log('\n📊 Final Statistics:');
    console.log(`   insights_embedded.json: ${formatSize(insightsSize)}`);
    console.log(`   curriculum_embedded.json: ${formatSize(curriculumSize)}`);
    console.log(`   metadata_embedded.json: ${formatSize(metadataSize)}`);
    console.log(`\n📦 Total size: ${formatSize(insightsSize + curriculumSize + metadataSize)}`);
    console.log('   (These will be bundled with the Electron app)');

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n🎉 All embeddings ready!`);
    console.log(`⏱️  Total time: ${duration} seconds`);

    console.log('\n📋 Next steps:');
    console.log('   1. The *_embedded.json files are ready');
    console.log('   2. Build the Next.js app: npm run build');
    console.log('   3. Build Electron app: npm run electron:build:win');
    console.log('   4. App will work 100% offline!');

    console.log('\n💡 Tip: Embeddings are cached. They will only be regenerated if:');
    console.log('   - Source files (insights.json, curriculum_content.json, etc.) are modified');
    console.log('   - Embedded files are deleted');
    console.log('   - Dimension mismatch is detected');
    console.log('   - To force regeneration, delete the *_embedded.json files');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
