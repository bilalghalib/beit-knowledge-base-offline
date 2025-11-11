import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const moduleFilter = searchParams.get('module');
    const expertFilter = searchParams.get('expert');
    const priorityFilter = searchParams.get('priority');
    const typeFilter = searchParams.get('type');

    const dataDir = path.join(process.cwd(), 'data');
    const insightsPath = path.join(dataDir, 'insights.json');
    let insights = JSON.parse(fs.readFileSync(insightsPath, 'utf-8'));

    // Apply filters
    if (moduleFilter && moduleFilter !== 'all') {
      insights = insights.filter((i: any) => i.module === moduleFilter);
    }
    if (expertFilter && expertFilter !== 'all') {
      insights = insights.filter((i: any) => i.expert === expertFilter);
    }
    if (priorityFilter && priorityFilter !== 'all') {
      insights = insights.filter((i: any) => i.priority === priorityFilter);
    }
    if (typeFilter && typeFilter !== 'all') {
      insights = insights.filter((i: any) => i.insight_type === typeFilter);
    }

    return NextResponse.json({ insights });
  } catch (error) {
    console.error('Insights API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}
