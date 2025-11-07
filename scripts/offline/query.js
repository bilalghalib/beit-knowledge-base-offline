#!/usr/bin/env node

import { ChromaClient } from 'chromadb';
import { OllamaEmbeddingFunction } from '@chroma-core/ollama';

const CHROMA_URL = process.env.CHROMA_URL ?? 'http://localhost:8000';
const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text';

const query = process.argv[2];

if (!query) {
  console.log('Usage: node query.js "your search query"');
  console.log('');
  console.log('Examples:');
  console.log('  node query.js "What hands-on activities worked best?"');
  console.log('  node query.js "What are the main barriers to job placement?"');
  process.exit(1);
}

async function search() {
  try {
    // Connect to Chroma
    const chromaUrl = new URL(CHROMA_URL);
    const chromaClient = new ChromaClient({
      host: chromaUrl.hostname,
      port: parseInt(chromaUrl.port),
    });

    // Create embedding function
    const embedder = new OllamaEmbeddingFunction({
      url: OLLAMA_URL,
      model: EMBED_MODEL,
    });

    // Get collections
    const insightsCollection = await chromaClient.getCollection({
      name: 'insights',
      embeddingFunction: embedder,
    });

    const curriculumCollection = await chromaClient.getCollection({
      name: 'curriculum',
      embeddingFunction: embedder,
    });

    const metadataCollection = await chromaClient.getCollection({
      name: 'metadata',
      embeddingFunction: embedder,
    });

    console.log('🔍 Query:', query);
    console.log('');

    // Search insights
    console.log('📊 Searching insights...');
    const insightsResults = await insightsCollection.query({
      queryTexts: [query],
      nResults: 5,
    });

    if (insightsResults.documents[0]?.length > 0) {
      console.log(`\n✅ Found ${insightsResults.documents[0].length} insights:\n`);
      insightsResults.documents[0].forEach((doc, i) => {
        const metadata = insightsResults.metadatas[0][i];
        const distance = insightsResults.distances[0][i];
        const similarity = (1 - distance).toFixed(3);

        console.log(`[${i + 1}] ${metadata.insight_id || 'N/A'} - ${metadata.expert || 'Unknown'} (${metadata.module || 'Unknown'})`);
        console.log(`    Similarity: ${similarity} | Priority: ${metadata.priority || 'N/A'}`);
        console.log(`    Theme: ${metadata.theme_english || 'N/A'}`);
        console.log(`    Quote: ${(metadata.quote_english || '').substring(0, 200)}...`);
        console.log('');
      });
    }

    // Search curriculum
    console.log('📚 Searching curriculum...');
    const curriculumResults = await curriculumCollection.query({
      queryTexts: [query],
      nResults: 3,
    });

    if (curriculumResults.documents[0]?.length > 0) {
      console.log(`\n✅ Found ${curriculumResults.documents[0].length} curriculum items:\n`);
      curriculumResults.documents[0].forEach((doc, i) => {
        const metadata = curriculumResults.metadatas[0][i];
        const distance = curriculumResults.distances[0][i];
        const similarity = (1 - distance).toFixed(3);

        console.log(`[${i + 1}] ${metadata.module || 'N/A'} - Day ${metadata.day || 'N/A'}`);
        console.log(`    Similarity: ${similarity}`);
        console.log(`    Activity: ${metadata.activity_name || 'N/A'}`);
        console.log(`    Purpose: ${(metadata.purpose || '').substring(0, 150)}...`);
        console.log('');
      });
    }

    // Search metadata
    console.log('ℹ️  Searching project facts...');
    const metadataResults = await metadataCollection.query({
      queryTexts: [query],
      nResults: 2,
    });

    if (metadataResults.documents[0]?.length > 0) {
      console.log(`\n✅ Found ${metadataResults.documents[0].length} project facts:\n`);
      metadataResults.documents[0].forEach((doc, i) => {
        const metadata = metadataResults.metadatas[0][i];
        const distance = metadataResults.distances[0][i];
        const similarity = (1 - distance).toFixed(3);

        console.log(`[${i + 1}] ${metadata.category || 'N/A'}`);
        console.log(`    Similarity: ${similarity}`);
        console.log(`    Q: ${metadata.question || 'N/A'}`);
        console.log(`    A: ${(metadata.answer || '').substring(0, 200)}...`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

search();
