import { NextRequest, NextResponse } from 'next/server';
import { getVectorDB } from '@/lib/vector-utils';
import { getEmbedding as getONNXEmbedding, isModelAvailable } from '@/lib/onnx-embeddings';
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

/**
 * Embed query using ONNX model (offline, bundled)
 * Falls back to Ollama or OpenAI if ONNX not available
 */
async function embedQuery(query: string, openaiApiKey?: string): Promise<number[]> {
  // Try ONNX first (offline, bundled with app)
  if (isModelAvailable()) {
    try {
      console.log('Using ONNX model for embedding (offline)');
      return await getONNXEmbedding(query);
    } catch (error) {
      console.warn('ONNX embedding failed, trying fallbacks:', error);
    }
  }

  // Fallback 1: OpenAI (if API key provided)
  if (openaiApiKey && openaiApiKey.trim()) {
    try {
      console.log('Using OpenAI for embedding');
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
    } catch (error) {
      console.warn('OpenAI embedding failed, trying Ollama:', error);
    }
  }

  // Fallback 2: Ollama (if running locally)
  const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
  const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';

  try {
    console.log('Using Ollama for embedding (local)');
    const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: EMBED_MODEL,
        prompt: query,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`);
    }

    const data = await response.json();
    return data.embedding;
  } catch (error) {
    // All methods failed
    throw new Error(
      'Failed to generate query embedding. ONNX model not available, and no fallback (Ollama/OpenAI) is accessible. ' +
      'Please ensure the ONNX model is bundled with the app, or provide an OpenAI API key in settings.'
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
