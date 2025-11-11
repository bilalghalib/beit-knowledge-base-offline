import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    const insightsPath = path.join(dataDir, 'insights.json');
    const insightsData = JSON.parse(fs.readFileSync(insightsPath, 'utf-8'));

    const experts = new Set<string>();
    const modules = new Set<string>();
    const priorities = new Set<string>();
    const types = new Set<string>();

    for (const insight of insightsData) {
      if (insight.expert) experts.add(insight.expert);
      if (insight.module) modules.add(insight.module);
      if (insight.priority) priorities.add(insight.priority);
      if (insight.insight_type) types.add(insight.insight_type);
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
