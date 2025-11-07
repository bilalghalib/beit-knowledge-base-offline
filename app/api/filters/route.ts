import { NextResponse } from 'next/server';

import { getOrCreateCollection } from '@/lib/chroma';

export async function GET() {
  try {
    const collection = await getOrCreateCollection('insights');
    const { metadatas } = await collection.get({
      include: ['metadatas'],
      limit: 2000,
    });

    const experts = new Set<string>();
    const modules = new Set<string>();
    const priorities = new Set<string>();
    const types = new Set<string>();

    for (const meta of metadatas ?? []) {
      if (!meta) continue;
      const row = meta as Record<string, string | null | undefined>;
      if (row.expert) experts.add(row.expert);
      if (row.module) modules.add(row.module);
      if (row.priority) priorities.add(row.priority);
      if (row.insight_type) types.add(row.insight_type);
    }

    return NextResponse.json({
      experts: Array.from(experts).sort(),
      modules: Array.from(modules).sort(),
      priorities: Array.from(priorities).sort(),
      types: Array.from(types).sort(),
    });
  } catch (error) {
    console.error('Filters API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filters' },
      { status: 500 }
    );
  }
}
