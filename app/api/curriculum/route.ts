import { NextRequest, NextResponse } from 'next/server';

import { getOrCreateCollection } from '@/lib/chroma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const moduleFilter = searchParams.get('module');

    const collection = await getOrCreateCollection('curriculum');

    let whereClause = undefined;
    if (moduleFilter && moduleFilter !== 'all') {
      whereClause = { module: moduleFilter };
    }

    const result = await collection.get({
      include: ['metadatas'],
      where: whereClause,
      limit: 5000,
    });

    const curriculum = (result.metadatas ?? []).map((meta, index) => ({
      id: result.ids?.[index] ?? '',
      ...(meta ?? {}),
    }));

    return NextResponse.json({ curriculum });
  } catch (error) {
    console.error('Curriculum API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch curriculum' },
      { status: 500 }
    );
  }
}
