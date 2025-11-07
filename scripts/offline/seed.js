#!/usr/bin/env node

import path from 'node:path';
import fs from 'node:fs';

import { ChromaClient } from 'chromadb';
import { OllamaEmbeddingFunction } from '@chroma-core/ollama';
import dotenv from 'dotenv';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const CHROMA_URL = process.env.CHROMA_URL ?? 'http://localhost:8000';
const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const DATA_DIR =
  process.env.DATA_DIR ?? path.resolve(process.cwd(), 'data');
const EMBED_MODEL =
  process.env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text';

// Connect to Chroma server running on localhost:8000
const chromaUrl = new URL(CHROMA_URL);
const chromaClient = new ChromaClient({
  host: chromaUrl.hostname,
  port: parseInt(chromaUrl.port),
});

// Create Ollama embedding function instance
const embedder = new OllamaEmbeddingFunction({
  url: OLLAMA_URL,
  model: EMBED_MODEL,
});

function chunk(items, size) {
  const batches = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

async function seedInsights() {
  const filePath = path.resolve(DATA_DIR, 'insights.json');
  const raw = fs.readFileSync(filePath, 'utf8');
  const insights = JSON.parse(raw);

  // Try to delete existing collection and recreate it
  try {
    await chromaClient.deleteCollection({ name: 'insights' });
  } catch (e) {
    // Collection doesn't exist, that's okay
  }

  const collection = await chromaClient.createCollection({
    name: 'insights',
    metadata: { embed_model: EMBED_MODEL },
    embeddingFunction: embedder,
  });

  console.log(`   Processing ${insights.length} insights...`);
  const batches = chunk(insights, 10); // Reduced batch size for Ollama
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`   Batch ${i + 1}/${batches.length} (${batch.length} items)...`);
    await collection.add({
      ids: batch.map((item) => item.id),
      documents: batch.map((item) => {
        const quoteEn = item.quote_english ?? '';
        const quoteAr = item.quote_arabic ?? '';
        const context = item.context_notes_english ?? '';
        return [
          item.theme_english,
          quoteEn,
          quoteAr,
          context,
        ]
          .filter(Boolean)
          .join('\n');
      }),
      metadatas: batch.map((item) => ({
        insight_id: item.id || '',
        expert: item.expert || '',
        module: item.module || '',
        theme_english: item.theme_english || '',
        quote_english: item.quote_english || '',
        quote_arabic: item.quote_arabic || '',
        priority: item.priority || '',
        insight_type: item.insight_type || '',
        tags_english: item.tags_english || '',
        timestamp: item.timestamp || '',
      })),
    });
  }
}

async function seedMetadataFacts() {
  const filePath = path.resolve(DATA_DIR, 'metadata_facts.json');
  const raw = fs.readFileSync(filePath, 'utf8');
  const facts = JSON.parse(raw);

  // Try to delete existing collection and recreate it
  try {
    await chromaClient.deleteCollection({ name: 'metadata' });
  } catch (e) {
    // Collection doesn't exist, that's okay
  }

  const collection = await chromaClient.createCollection({
    name: 'metadata',
    metadata: { embed_model: EMBED_MODEL },
    embeddingFunction: embedder,
  });

  const batches = chunk(facts, 100);
  for (const batch of batches) {
    await collection.add({
      ids: batch.map((item) => item.id),
      documents: batch.map((item) => item.answer),
      metadatas: batch.map((item) => ({
        category: item.category,
        question: item.question,
        answer: item.answer,
        tags: item.tags,
      })),
    });
  }
}

async function seedCurriculum() {
  const filePath = path.resolve(DATA_DIR, 'curriculum_content.json');
  const raw = fs.readFileSync(filePath, 'utf8');
  const activities = JSON.parse(raw);

  // Try to delete existing collection and recreate it
  try {
    await chromaClient.deleteCollection({ name: 'curriculum' });
  } catch (e) {
    // Collection doesn't exist, that's okay
  }

  const collection = await chromaClient.createCollection({
    name: 'curriculum',
    metadata: { embed_model: EMBED_MODEL },
    embeddingFunction: embedder,
  });

  const batches = chunk(activities, 100);
  for (const batch of batches) {
    await collection.add({
      ids: batch.map((item) => item.id),
      documents: batch.map((item) => {
        const blocks = [
          item.activity_name,
          `Purpose: ${item.purpose ?? 'N/A'}`,
          `Duration: ${item.duration ?? 'N/A'}`,
          item.searchable_content,
        ];
        return blocks.filter(Boolean).join('\n');
      }),
      metadatas: batch.map((item) => ({
        module: item.module,
        day: item.day,
        day_theme: item.day_theme,
        session_number: item.session_number,
        activity_name: item.activity_name,
        purpose: item.purpose,
        duration: item.duration,
        searchable_content: item.searchable_content,
      })),
    });
  }
}

async function main() {
  console.log('🌐 Chroma URL:', CHROMA_URL);
  console.log('📁 Data directory:', DATA_DIR);
  console.log('🧠 Embedding model:', EMBED_MODEL);

  await seedInsights();
  console.log('   ✅ Seeded insights collection');

  await seedCurriculum();
  console.log('   ✅ Seeded curriculum collection');

  await seedMetadataFacts();
  console.log('   ✅ Seeded metadata facts collection');

  console.log('\n🎉 Offline knowledge base seeded successfully.');
}

main().catch((error) => {
  console.error('Failed to seed Chroma:', error);
  process.exit(1);
});
