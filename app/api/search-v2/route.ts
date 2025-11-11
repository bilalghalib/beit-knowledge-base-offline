import { NextRequest, NextResponse } from 'next/server';
import { getVectorDB } from '@/lib/vector-utils';
import { pipeline, env } from '@xenova/transformers';
import path from 'path';

export const runtime = 'nodejs';

/**
 * Search API using pure JavaScript vector search
 * NO external dependencies - works entirely offline!
 */

// Initialize VectorDB on first request
let vectorDBInitialized = false;

async function ensureVectorDBLoaded() {
  const vectorDB = getVectorDB();

  if (!vectorDB.isLoaded()) {
    console.log('🔄 Loading VectorDB for the first time...');

    // Determine data directory path
    const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');

    await vectorDB.load(dataDir);
    vectorDBInitialized = true;

    console.log(`✅ VectorDB loaded with ${vectorDB.count()} documents`);
  }

  return vectorDB;
}

// Configure Transformers.js to use local models
const MODELS_DIR = path.join(process.cwd(), 'models', 'transformers');
env.cacheDir = MODELS_DIR;
env.allowLocalModels = true;
env.allowRemoteModels = false; // Force offline mode

// Model singleton
let extractor: any = null;

/**
 * Initialize Transformers.js model
 */
async function initializeModel() {
  if (extractor) return extractor;

  try {
    console.log('🤖 Initializing BGE-large embedding model...');
    extractor = await pipeline('feature-extraction', 'Xenova/bge-large-en-v1.5', {
      quantized: true,
    });
    console.log('✅ Model loaded successfully (1024 dimensions)');
    return extractor;
  } catch (error) {
    console.error('❌ Failed to load Transformers.js model:', error);
    throw new Error('Failed to load embedding model. Model may not be bundled with the app.');
  }
}

/**
 * Embed query using Transformers.js (offline, bundled)
 * Falls back to OpenAI if API key provided
 */
async function embedQuery(query: string, openaiApiKey?: string): Promise<number[]> {
  // Try Transformers.js first (offline, bundled with app)
  try {
    const model = await initializeModel();
    console.log('Using Transformers.js BGE-large for embedding (offline)');
    const result = await model(query, { pooling: 'mean', normalize: true });
    return Array.from(result.data);
  } catch (error) {
    console.warn('Transformers.js embedding failed:', error);

    // Fallback: OpenAI (if API key provided)
    if (openaiApiKey && openaiApiKey.trim()) {
      try {
        console.log('Using OpenAI for embedding (fallback)');
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey.trim()}`,
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: query,
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API returned ${response.status}`);
        }

        const data = await response.json();
        return data.data[0].embedding;
      } catch (openaiError) {
        console.error('OpenAI embedding also failed:', openaiError);
      }
    }

    // All methods failed
    throw new Error(
      'Failed to generate query embedding. Offline model not available and no OpenAI API key provided. ' +
      'Please ensure the Transformers.js model is bundled with the app.'
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { query, openaiApiKey } = await req.json();

    // Validate query
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters long' },
        { status: 400 }
      );
    }

    if (trimmedQuery.length > 1000) {
      return NextResponse.json(
        { error: 'Query must be less than 1000 characters' },
        { status: 400 }
      );
    }

    // Load VectorDB (lazy loading)
    const vectorDB = await ensureVectorDBLoaded();

    // Get query embedding (tries ONNX first, then fallbacks)
    const queryEmbedding = await embedQuery(trimmedQuery, openaiApiKey);

    // Search each collection
    const insightResults = vectorDB.search(queryEmbedding, {
      topK: 8,
      minSimilarity: 0.1,
      type: 'insight',
    });

    const metadataResults = vectorDB.search(queryEmbedding, {
      topK: 5,
      minSimilarity: 0.1,
      type: 'metadata',
    });

    const curriculumResults = vectorDB.search(queryEmbedding, {
      topK: 8,
      minSimilarity: 0.1,
      type: 'curriculum',
    });

    // Merge and sort all results
    const allResults = [
      ...insightResults,
      ...metadataResults,
      ...curriculumResults,
    ]
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 12);

    if (allResults.length === 0) {
      return NextResponse.json({
        answer:
          "I couldn't find a confident answer. Try rephrasing your question or ask about training methods, curriculum content, or expert insights from the BEIT programme.",
        numFound: 0,
        sources: [],
        insights: [],
      });
    }

    // Format sources for frontend
    const sources = allResults.map((result) => {
      if (result.type === 'metadata') {
        return {
          id: result.id,
          source_type: result.type,
          category: result.metadata.category || 'general',
          question: result.metadata.question || '',
          answer: result.metadata.answer || '',
          similarity: result.similarity,
        };
      }

      if (result.type === 'curriculum') {
        return {
          id: result.id,
          source_type: result.type,
          module: result.metadata.module || '',
          day: result.metadata.day || null,
          session_number: result.metadata.session_number || null,
          activity_name: result.metadata.activity_name || '',
          purpose: result.metadata.purpose || null,
          similarity: result.similarity,
        };
      }

      // insight
      return {
        id: result.id,
        source_type: result.type,
        expert: result.metadata.expert || '',
        module: result.metadata.module || '',
        theme_english: result.metadata.theme_english || '',
        quote_english: result.metadata.quote_english || '',
        quote_arabic: result.metadata.quote_arabic || '',
        priority: result.metadata.priority || '',
        similarity: result.similarity,
      };
    });

    return NextResponse.json({
      answer: `Found ${allResults.length} relevant results. Browse the insights below.`,
      numFound: allResults.length,
      sources,
      insights: sources.filter((source) => source.source_type === 'insight'),
    });
  } catch (error) {
    console.error('Pure JS search error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        error: 'Failed to process question',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
