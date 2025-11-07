import { NextRequest, NextResponse } from 'next/server';

import { getOrCreateCollection } from '@/lib/chroma';

export async function POST(request: NextRequest) {
  try {
    const { insightId } = await request.json();

    if (!insightId) {
      return NextResponse.json(
        { error: 'insightId is required' },
        { status: 400 }
      );
    }

    const collection = await getOrCreateCollection('insights');
    const source = await collection.get({
      ids: [insightId],
      include: ['metadatas', 'documents', 'embeddings'],
    });

    if (!source.ids || source.ids.length === 0) {
      return NextResponse.json(
        { error: 'Insight not found' },
        { status: 404 },
      );
    }

    const embedding = source.embeddings?.[0];
    const metadata = source.metadatas?.[0];
    const document = source.documents?.[0] ?? '';

    if (!embedding) {
      return NextResponse.json(
        { error: 'Insight does not have an embedding' },
        { status: 400 },
      );
    }

    const matches = await collection.query({
      queryEmbeddings: [embedding as number[]],
      nResults: 6,
    });

    const ids = matches.ids?.[0] ?? [];
    const documents = matches.documents?.[0] ?? [];
    const metadatas = matches.metadatas?.[0] ?? [];
    const distances = matches.distances?.[0] ?? [];

    const similar = ids
      .map((id, index) => ({
        id,
        document: documents[index] ?? '',
        metadata: metadatas[index] ?? {},
        similarity:
          1 - (typeof distances[index] === 'number' ? distances[index]! : 1),
      }))
      .filter((item) => item.id !== insightId);

    return NextResponse.json({
      sourceInsight: {
        id: insightId,
        document,
        metadata: metadata ?? {},
      },
      similarInsights: similar,
    });
  } catch (error) {
    console.error('Similar API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch similar insights' },
      { status: 500 }
    );
  }
}
