import { NextResponse } from 'next/server';

import { getOrCreateCollection } from '@/lib/chroma';

export async function GET() {
  try {
    const [insightsCollection, curriculumCollection, metadataCollection] =
      await Promise.all([
        getOrCreateCollection('insights'),
        getOrCreateCollection('curriculum'),
        getOrCreateCollection('metadata'),
      ]);

    const [insightsData, curriculumData, metadataData] = await Promise.all([
      insightsCollection.get({ include: ['metadatas'], limit: 5000 }),
      curriculumCollection.get({ include: ['metadatas'], limit: 5000 }),
      metadataCollection.get({ include: ['metadatas'], limit: 100 }),
    ]);

    const insights = insightsData.metadatas ?? [];
    const curriculum = curriculumData.metadatas ?? [];
    const metadata = metadataData.metadatas ?? [];

    // Aggregate insights by module
    const insightsByModule: Record<string, number> = {};
    for (const meta of insights) {
      if (!meta) continue;
      const row = meta as Record<string, string | null | undefined>;
      const moduleName = (row.module as string) || 'Unknown';
      insightsByModule[moduleName] = (insightsByModule[moduleName] || 0) + 1;
    }

    // Aggregate insights by priority
    const insightsByPriority: Record<string, number> = {};
    for (const meta of insights) {
      if (!meta) continue;
      const row = meta as Record<string, string | null | undefined>;
      const priority = (row.priority as string) || 'Unclassified';
      insightsByPriority[priority] = (insightsByPriority[priority] || 0) + 1;
    }

    // Aggregate insights by type
    const insightsByType: Record<string, number> = {};
    for (const meta of insights) {
      if (!meta) continue;
      const row = meta as Record<string, string | null | undefined>;
      const type = (row.insight_type as string) || 'General';
      insightsByType[type] = (insightsByType[type] || 0) + 1;
    }

    // Get expert contributions
    const expertCounts: Record<string, number> = {};
    for (const meta of insights) {
      if (!meta) continue;
      const row = meta as Record<string, string | null | undefined>;
      const expert = (row.expert as string) || 'Unknown';
      expertCounts[expert] = (expertCounts[expert] || 0) + 1;
    }
    const expertContributions = Object.entries(expertCounts)
      .map(([expert, count]) => ({ expert, count }))
      .sort((a, b) => b.count - a.count);

    // Get unique experts
    const uniqueExperts = new Set(
      insights
        .map(
          (meta) =>
            (meta as Record<string, string | null | undefined>)?.expert,
        )
        .filter(Boolean) as string[],
    );

    // Aggregate curriculum by module
    const curriculumByModule: Record<string, number> = {};
    for (const meta of curriculum) {
      if (!meta) continue;
      const row = meta as Record<string, string | null | undefined>;
      const moduleName = (row.module as string) || 'Unknown';
      curriculumByModule[moduleName] = (curriculumByModule[moduleName] || 0) + 1;
    }

    return NextResponse.json({
      totalInsights: insights.length,
      totalExperts: uniqueExperts.size,
      totalActivities: curriculum.length,
      totalMetadata: metadata.length,
      insightsByModule,
      insightsByPriority,
      insightsByType,
      expertContributions,
      curriculumByModule,
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
