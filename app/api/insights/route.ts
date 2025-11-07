import { NextRequest, NextResponse } from 'next/server';

import { getOrCreateCollection } from '@/lib/chroma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const moduleFilter = searchParams.get('module');
    const expert = searchParams.get('expert');
    const priority = searchParams.get('priority');
    const type = searchParams.get('type');

    const collection = await getOrCreateCollection('insights');

    const whereObj: Record<string, string> = {};
    if (moduleFilter && moduleFilter !== 'all') {
      whereObj.module = moduleFilter;
    }
    if (expert && expert !== 'all') {
      whereObj.expert = expert;
    }
    if (priority && priority !== 'all') {
      whereObj.priority = priority;
    }
    if (type && type !== 'all') {
      whereObj.insight_type = type;
    }

    const whereClause = Object.keys(whereObj).length > 0 ? whereObj : undefined;

    const result = await collection.get({
      include: ['metadatas'],
      where: whereClause,
      limit: 1000,
    });

    const insights = (result.metadatas || []).map((meta, index) => ({
      id: result.ids?.[index] ?? '',
      ...(meta ?? {}),
    }));

    return NextResponse.json({ insights });
  } catch (error) {
    console.error('Insights API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}
