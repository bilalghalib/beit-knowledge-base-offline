import { NextRequest, NextResponse } from 'next/server';

import { getOrCreateCollection } from '@/lib/chroma';

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text';
const OLLAMA_GENERATE_MODEL =
  process.env.OLLAMA_GENERATE_MODEL ?? 'llama3:8b';

export const runtime = 'nodejs';

type SourceType = 'insight' | 'metadata' | 'curriculum';

type UnifiedResult = {
  id: string;
  document: string;
  metadata: Record<string, string | number | null | undefined>;
  source_type: SourceType;
  similarity: number;
};

async function embedText(prompt: string): Promise<number[]> {
  const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_EMBED_MODEL,
      prompt,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(
      `Ollama embeddings request failed (${response.status}): ${err}`,
    );
  }

  const data = await response.json();

  if (!data.embedding) {
    throw new Error('Ollama embeddings response did not include `embedding`.');
  }

  return data.embedding as number[];
}

async function generateAnswerWithOpenAI({
  question,
  context,
  apiKey,
}: {
  question: string;
  context: string;
  apiKey: string;
}): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that answers questions about the BEIT (Building Energy Innovation Training) programme in Mosul, Iraq. You have access to curated project facts, curriculum content, and expert interview insights. Use the sources strictly as written and cite them with [1], [2], etc. when answering.`,
        },
        {
          role: 'user',
          content: `Sources:\n${context}\n\nQuestion: ${question}\n\nProvide a concise, accurate answer with citations.`,
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(
      `OpenAI API request failed (${response.status}): ${err}`,
    );
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

async function generateAnswer({
  question,
  context,
}: {
  question: string;
  context: string;
}): Promise<string> {
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
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(
      `Ollama generate request failed (${response.status}): ${err}`,
    );
  }

  const data = await response.json();
  return typeof data.response === 'string' ? data.response.trim() : '';
}

function mapChromaResults(
  type: SourceType,
  result: Awaited<
    ReturnType<Awaited<ReturnType<typeof getOrCreateCollection>>['query']>
  >,
): UnifiedResult[] {
  const ids = result.ids?.[0] ?? [];
  const documents = result.documents?.[0] ?? [];
  const metadatas = result.metadatas?.[0] ?? [];
  const distances = result.distances?.[0] ?? [];

  return ids.map((id, index) => {
    const metadata = (metadatas[index] ?? {}) as Record<
      string,
      string | number | null | undefined
    >;
    const document = documents[index] ?? '';
    const distance = typeof distances[index] === 'number' ? distances[index]! : 1;
    const similarity = 1 - distance;

    return {
      id,
      document,
      metadata,
      source_type: type,
      similarity,
    };
  });
}

function buildContext(result: UnifiedResult, index: number): string {
  const num = index + 1;
  const { metadata, document, source_type } = result;

  if (source_type === 'metadata') {
    return `[${num}] PROJECT FACT (${metadata.category ?? 'general'})
Question: ${metadata.question}
Answer: ${metadata.answer}`;
  }

  if (source_type === 'curriculum') {
    return `[${num}] CURRICULUM (${metadata.module} Day ${metadata.day}, Session ${metadata.session_number})
Activity: ${metadata.activity_name}
${document}`;
  }

  return `[${num}] EXPERT INSIGHT (${metadata.expert}, ${metadata.module})
Theme: ${metadata.theme_english ?? 'Not specified'}
Quote (EN): ${(metadata.quote_english as string) ?? ''}
Quote (AR): ${(metadata.quote_arabic as string) ?? ''}
${document}`;
}

export async function POST(req: NextRequest) {
  try {
    const { query, generateAnswer: shouldGenerateAnswer, openaiApiKey } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 },
      );
    }

    const [insightsCollection, metadataCollection, curriculumCollection] =
      await Promise.all([
        getOrCreateCollection('insights'),
        getOrCreateCollection('metadata'),
        getOrCreateCollection('curriculum'),
      ]);

    const embedding = await embedText(query);

    const [insightMatches, metadataMatches, curriculumMatches] =
      await Promise.all([
        insightsCollection.query({
          queryEmbeddings: [embedding],
          nResults: 8,
        }),
        metadataCollection.query({
          queryEmbeddings: [embedding],
          nResults: 5,
        }),
        curriculumCollection.query({
          queryEmbeddings: [embedding],
          nResults: 8,
        }),
      ]);

    const merged = [
      ...mapChromaResults('insight', insightMatches),
      ...mapChromaResults('metadata', metadataMatches),
      ...mapChromaResults('curriculum', curriculumMatches),
    ].filter((item) => item.similarity > 0.1);

    if (merged.length === 0) {
      return NextResponse.json({
        answer:
          "I couldn't find a confident answer. Try rephrasing your question or ask about training methods, curriculum content, or expert insights from the BEIT programme.",
        numFound: 0,
        sources: [],
        insights: [],
      });
    }

    merged.sort((a, b) => b.similarity - a.similarity);
    const topResults = merged.slice(0, 12);

    const context = topResults
      .map((result, index) => buildContext(result, index))
      .join('\n\n---\n\n');

    let answer = '';

    // Only generate AI answer if explicitly requested (disabled by default for performance)
    if (shouldGenerateAnswer) {
      try {
        // Use OpenAI API if key is provided, otherwise fall back to Ollama
        if (openaiApiKey && typeof openaiApiKey === 'string' && openaiApiKey.trim()) {
          answer = await generateAnswerWithOpenAI({
            question: query,
            context,
            apiKey: openaiApiKey.trim()
          });
        } else {
          answer = await generateAnswer({ question: query, context });
        }
      } catch (error) {
        console.error('AI answer generation failed:', error);

        // Provide helpful error message based on whether API key was provided
        if (openaiApiKey && typeof openaiApiKey === 'string' && openaiApiKey.trim()) {
          // OpenAI API key was provided but failed
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('401') || errorMessage.includes('Invalid')) {
            answer = 'OpenAI API key is invalid. Please check your API key in Settings and try again. See results below.';
          } else {
            answer = `OpenAI API error: ${errorMessage}. See results below.`;
          }
        } else {
          // No API key, tried Ollama and failed
          answer = 'AI answer generation unavailable. To use AI answers, please either add your OpenAI API key in Settings or use a computer with more memory resources. See results below.';
        }
      }
    } else {
      // Fast mode: skip AI generation, just return search results
      answer = `Found ${topResults.length} relevant results. Browse the insights below.`;
    }

    const sources = topResults.map((result) => {
      const meta = result.metadata;

      if (result.source_type === 'metadata') {
        return {
          id: result.id,
          source_type: result.source_type,
          category: meta.category ?? 'general',
          question: meta.question ?? '',
          answer: meta.answer ?? '',
          similarity: result.similarity,
        };
      }

      if (result.source_type === 'curriculum') {
        return {
          id: result.id,
          source_type: result.source_type,
          module: meta.module ?? '',
          day: meta.day ?? null,
          session_number: meta.session_number ?? null,
          activity_name: meta.activity_name ?? '',
          purpose: meta.purpose ?? null,
          similarity: result.similarity,
        };
      }

      return {
        id: result.id,
        source_type: result.source_type,
        expert: meta.expert ?? '',
        module: meta.module ?? '',
        theme_english: meta.theme_english ?? '',
        quote_english: meta.quote_english ?? '',
        quote_arabic: meta.quote_arabic ?? '',
        priority: meta.priority ?? '',
        similarity: result.similarity,
      };
    });

    return NextResponse.json({
      answer,
      numFound: topResults.length,
      sources,
      insights: sources.filter((source) => source.source_type === 'insight'),
    });
  } catch (error) {
    console.error('Offline search error:', error);
    return NextResponse.json(
      { error: 'Failed to process question' },
      { status: 500 },
    );
  }
}
