import { NextRequest, NextResponse } from 'next/server';
import { pipeline, env as transformersEnv } from '@xenova/transformers';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';

/**
 * Smart Search API with Graceful Degradation
 *
 * Priority:
 * 1. OpenAI 3072-dim (if API key provided + 3072 embeddings exist)
 * 2. Transformers.js 1024-dim (offline fallback)
 */

// Configure Transformers.js
const MODELS_DIR = path.join(process.cwd(), 'models', 'transformers');
transformersEnv.cacheDir = MODELS_DIR;
transformersEnv.allowLocalModels = true;
transformersEnv.allowRemoteModels = false;

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const OLLAMA_GENERATE_MODEL = process.env.OLLAMA_GENERATE_MODEL ?? 'llama3:8b';

// Model singleton
let transformersExtractor: any = null;

// VectorDB cache
let vectorDB1024: any = null;
let vectorDB3072: any = null;

const EMBEDDED_VARIANTS = ['insights', 'curriculum', 'metadata'] as const;

function filesExistForSuffix(dataDir: string, suffix: string): boolean {
  return EMBEDDED_VARIANTS.every((base) =>
    fs.existsSync(path.join(dataDir, `${base}_embedded${suffix}`))
  );
}

/**
 * Check which embedding files are available
 */
function checkAvailableEmbeddings(): { has1024: boolean; has3072: boolean; highSuffix: string | null } {
  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  const baseSuffix = '_1024.json';
  const highSuffix = '_3072.json';
  const defaultSuffix = '.json';

  const has1024 = filesExistForSuffix(dataDir, baseSuffix);
  const has3072 = filesExistForSuffix(dataDir, highSuffix);
  const hasDefault = filesExistForSuffix(dataDir, defaultSuffix);

  return {
    has1024,
    has3072: has3072 || hasDefault,
    highSuffix: has3072 ? highSuffix : hasDefault ? defaultSuffix : null,
  };
}

/**
 * Load VectorDB with specified dimension
 */
async function loadVectorDB(dimensions: 1024 | 3072) {
  const cache = dimensions === 1024 ? vectorDB1024 : vectorDB3072;
  if (cache) return cache;

  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  let suffix = `_${dimensions}.json`;

  if (dimensions === 1024) {
    if (!filesExistForSuffix(dataDir, suffix)) {
      throw new Error('1024-dim embeddings are missing. Re-run the embedding script.');
    }
  } else {
    if (filesExistForSuffix(dataDir, '_3072.json')) {
      suffix = '_3072.json';
    } else if (filesExistForSuffix(dataDir, '.json')) {
      suffix = '.json';
    } else {
      throw new Error('High-dimension (OpenAI/Ollama) embeddings are missing.');
    }
  }

  console.log(`📚 Loading embeddings from suffix ${suffix} ...`);

  const loadFile = async (filename: string) => {
    try {
      const filePath = path.join(dataDir, filename);
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Failed to load ${filename}:`, error);
      return [];
    }
  };

  const [insights, curriculum, metadata] = await Promise.all([
    loadFile(`insights_embedded${suffix}`),
    loadFile(`curriculum_embedded${suffix}`),
    loadFile(`metadata_embedded${suffix}`),
  ]);

  const inferredDimensions =
    insights[0]?.embedding?.length ??
    curriculum[0]?.embedding?.length ??
    metadata[0]?.embedding?.length ??
    dimensions;

  const db = {
    insights: insights.map((d: any) => ({ ...d, type: 'insight' })),
    curriculum: curriculum.map((d: any) => ({ ...d, type: 'curriculum' })),
    metadata: metadata.map((d: any) => ({ ...d, type: 'metadata' })),
    dimensions: inferredDimensions,
  };

  console.log(`✅ Loaded embeddings (${inferredDimensions} dimensions): ${insights.length} insights, ${curriculum.length} curriculum, ${metadata.length} metadata`);

  if (dimensions === 1024) {
    vectorDB1024 = db;
  } else {
    vectorDB3072 = db;
  }

  return db;
}

/**
 * Initialize Transformers.js model (for 1024-dim fallback)
 */
async function initializeTransformersModel() {
  if (transformersExtractor) return transformersExtractor;

  try {
    console.log('🤖 Initializing BGE-large (1024-dim)...');
    transformersExtractor = await pipeline('feature-extraction', 'Xenova/bge-large-en-v1.5', {
      quantized: true,
    });
    console.log('✅ Transformers.js model loaded');
    return transformersExtractor;
  } catch (error) {
    console.error('❌ Failed to load Transformers.js:', error);
    throw new Error('Transformers.js model not available');
  }
}

/**
 * Generate embedding using OpenAI (3072-dim)
 */
async function embedWithOpenAI(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-large',
      input: text,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API returned ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Generate embedding using Transformers.js (1024-dim)
 */
async function embedWithTransformers(text: string): Promise<number[]> {
  const model = await initializeTransformersModel();
  const result = await model(text, { pooling: 'mean', normalize: true });
  return Array.from(result.data);
}

/**
 * Calculate cosine similarity
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Search documents
 */
function searchDocuments(queryEmbedding: number[], db: any, topK: number = 12) {
  const allDocs = [...db.insights, ...db.curriculum, ...db.metadata];

  const results = allDocs
    .map((doc) => ({
      ...doc,
      similarity: cosineSimilarity(queryEmbedding, doc.embedding),
    }))
    .filter((r) => r.similarity > 0.1)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return results;
}

function buildContextBlock(result: any, index: number): string {
  const num = index + 1;
  const meta = result.metadata ?? {};

  if (result.type === 'metadata') {
    return `[${num}] PROJECT FACT (${meta.category ?? 'general'})
Question: ${meta.question ?? ''}
Answer: ${meta.answer ?? ''}`;
  }

  if (result.type === 'curriculum') {
    return `[${num}] CURRICULUM (${meta.module ?? 'Module'} Day ${meta.day ?? '?'}${meta.session_number ? `, Session ${meta.session_number}` : ''})
Activity: ${meta.activity_name ?? ''}
Purpose: ${meta.purpose ?? ''}`;
  }

  return `[${num}] EXPERT INSIGHT (${meta.expert ?? 'Expert'}, ${meta.module ?? 'Module'})
Theme: ${meta.theme_english ?? ''}
Quote (EN): ${meta.quote_english ?? ''}
Quote (AR): ${meta.quote_arabic ?? ''}
Context: ${result.text ?? ''}`;
}

async function generateAnswerWithOpenAI(question: string, context: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that answers questions about the BEIT programme in Mosul, Iraq. Use the provided sources, cite them with [1], [2], etc., and be concise.`,
        },
        {
          role: 'user',
          content: `Sources:\n${context}\n\nQuestion: ${question}\n\nProvide a concise, grounded answer with citations.`,
        },
      ],
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

async function generateAnswerWithOllama(question: string, context: string): Promise<string> {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_GENERATE_MODEL,
      prompt: `You are a helpful assistant that answers questions about the BEIT (Building Energy Innovation Training) programme in Mosul, Iraq.

You have access to curated project facts, curriculum content, and expert interview insights. Use the sources strictly as written and cite them with [1], [2], etc. when answering.

Sources:
${context}

Question: ${question}

Provide a concise, accurate answer with citations.`,
      options: {
        temperature: 0.2,
      },
      stream: false,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Ollama generate request failed (${response.status}): ${err}`);
  }

  const data = await response.json();
  return typeof data.response === 'string' ? data.response.trim() : '';
}

export async function POST(req: NextRequest) {
  try {
    const { query, openaiApiKey, generateAnswer, useOllama } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2 || trimmedQuery.length > 1000) {
      return NextResponse.json({ error: 'Query must be 2-1000 characters' }, { status: 400 });
    }

    const available = checkAvailableEmbeddings();
    const sanitizedApiKey =
      typeof openaiApiKey === 'string' && openaiApiKey.trim().length > 0
        ? openaiApiKey.trim()
        : '';
    const hasApiKey = sanitizedApiKey.length > 0;
    const wantsAI = Boolean(generateAnswer);
    const allowOllama = Boolean(useOllama);

    let queryEmbedding: number[];
    let db: any;
    let method: string;

    // Strategy: Use best available method
    if (hasApiKey && available.has3072) {
      // Best quality: OpenAI 3072-dim
      console.log('🎯 Using OpenAI 3072-dim (highest quality)');
      method = 'OpenAI 3072-dim';
      queryEmbedding = await embedWithOpenAI(trimmedQuery, sanitizedApiKey);
      db = await loadVectorDB(3072);
    } else if (available.has1024) {
      // Fallback: Transformers.js 1024-dim
      console.log('🔄 Using Transformers.js 1024-dim (offline)');
      method = 'Transformers.js 1024-dim';
      queryEmbedding = await embedWithTransformers(trimmedQuery);
      db = await loadVectorDB(1024);
    } else if (hasApiKey && !available.has3072 && available.has1024) {
      // Has API key but no 3072 embeddings, use 1024 + note it
      console.log('⚠️  OpenAI key provided but 3072-dim embeddings not available, using 1024-dim');
      method = 'Transformers.js 1024-dim (OpenAI embeddings unavailable)';
      queryEmbedding = await embedWithTransformers(trimmedQuery);
      db = await loadVectorDB(1024);
    } else if (!available.has1024 && available.has3072) {
      return NextResponse.json(
        {
          error: 'Only high-dimension embeddings are present, but no OpenAI API key was provided.',
          helpText: 'Add an OpenAI API key in Settings or regenerate 1024-dim embeddings.',
        },
        { status: 503 }
      );
    } else {
      return NextResponse.json(
        { error: 'No embeddings available. Please ensure embedding files are present.' },
        { status: 503 }
      );
    }

    // Search
    const results = searchDocuments(queryEmbedding, db);

    if (results.length === 0) {
      return NextResponse.json({
        answer: "I couldn't find confident matches. Try rephrasing your question.",
        numFound: 0,
        sources: [],
        insights: [],
        method,
      });
    }

    // Format sources
    const sources = results.map((r) => {
      const base = {
        id: r.id,
        source_type: r.type,
        similarity: r.similarity,
      };

      if (r.type === 'insight') {
        return {
          ...base,
          expert: r.metadata.expert || '',
          module: r.metadata.module || '',
          theme_english: r.metadata.theme_english || '',
          quote_english: r.metadata.quote_english || '',
          quote_arabic: r.metadata.quote_arabic || '',
          context_notes_english: r.metadata.context_notes_english || '',
          context_notes_arabic: r.metadata.context_notes_arabic || '',
          tags_english: r.metadata.tags_english || '',
          tags_arabic: r.metadata.tags_arabic || '',
          priority: r.metadata.priority || '',
        };
      } else if (r.type === 'curriculum') {
        return {
          ...base,
          module: r.metadata.module || '',
          day: r.metadata.day || null,
          session_number: r.metadata.session_number || null,
          activity_name: r.metadata.activity_name || '',
          purpose: r.metadata.purpose || null,
        };
      } else {
        return {
          ...base,
          category: r.metadata.category || 'general',
          question: r.metadata.question || '',
          answer: r.metadata.answer || '',
        };
      }
    });

    // Generate AI answer if requested
    let answerMessage = `Found ${results.length} relevant results. Browse the insights below.`;

    if (wantsAI) {
      const contextBlock = results.slice(0, 8).map((r, idx) => buildContextBlock(r, idx)).join('\n\n---\n\n');

      try {
        if (allowOllama && !hasApiKey) {
          console.log('🤖 Generating answer with Ollama...');
          answerMessage = await generateAnswerWithOllama(trimmedQuery, contextBlock);
        } else if (hasApiKey) {
          console.log('🤖 Generating answer with OpenAI...');
          answerMessage = await generateAnswerWithOpenAI(trimmedQuery, contextBlock, sanitizedApiKey);
        } else {
          answerMessage =
            'AI answer generation requires an OpenAI API key or enabling the local Ollama option in Settings.';
        }
      } catch (genError) {
        console.error('AI generation error:', genError);
        const message =
          genError instanceof Error ? genError.message : 'Unknown generation error';
        answerMessage = `AI answer generation failed: ${message}. Showing search results below.`;
      }
    }

    return NextResponse.json({
      answer: answerMessage,
      numFound: results.length,
      sources,
      insights: sources.filter((s) => s.source_type === 'insight'),
      method, // Tell user which method was used
    });

  } catch (error) {
    console.error('Smart search error:', error);
    return NextResponse.json(
      {
        error: 'Search failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
