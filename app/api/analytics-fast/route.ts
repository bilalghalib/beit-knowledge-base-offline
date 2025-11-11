import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), 'data');

    // Load data from JSON files
    const insights = JSON.parse(fs.readFileSync(path.join(dataDir, 'insights.json'), 'utf-8'));
    const curriculum = JSON.parse(fs.readFileSync(path.join(dataDir, 'curriculum_content.json'), 'utf-8'));
    const metadata = JSON.parse(fs.readFileSync(path.join(dataDir, 'metadata_facts.json'), 'utf-8'));

    const totalInsights = insights.length;
    const totalActivities = curriculum.length;
    const totalMetadata = metadata.length;

    // Aggregate insights by module
    const insightsByModule: Record<string, number> = {};
    for (const insight of insights) {
      const moduleName = insight.module || 'Unknown';
      insightsByModule[moduleName] = (insightsByModule[moduleName] || 0) + 1;
    }

    // Aggregate insights by priority
    const insightsByPriority: Record<string, number> = {};
    for (const insight of insights) {
      const priority = insight.priority || 'Unclassified';
      insightsByPriority[priority] = (insightsByPriority[priority] || 0) + 1;
    }

    // Aggregate insights by type
    const insightsByType: Record<string, number> = {};
    for (const insight of insights) {
      const type = insight.insight_type || 'General';
      insightsByType[type] = (insightsByType[type] || 0) + 1;
    }

    // Get expert contributions
    const expertCounts: Record<string, number> = {};
    for (const insight of insights) {
      const expert = insight.expert || 'Unknown';
      expertCounts[expert] = (expertCounts[expert] || 0) + 1;
    }
    const expertContributions = Object.entries(expertCounts)
      .map(([expert, count]) => ({ expert, count }))
      .sort((a, b) => b.count - a.count);

    // Get unique experts
    const uniqueExperts = new Set(insights.map((i: any) => i.expert).filter(Boolean));

    // Aggregate curriculum by module
    const curriculumByModule: Record<string, number> = {};
    for (const item of curriculum) {
      const moduleName = item.module || 'Unknown';
      curriculumByModule[moduleName] = (curriculumByModule[moduleName] || 0) + 1;
    }

    return NextResponse.json({
      totalInsights,
      totalExperts: uniqueExperts.size,
      totalActivities,
      totalMetadata,
      insightsByModule,
      insightsByPriority,
      insightsByType,
      expertContributions,
      curriculumByModule,
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics', details: String(error) },
      { status: 500 }
    );
  }
}
