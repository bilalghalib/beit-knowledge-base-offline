import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const moduleFilter = searchParams.get('module');

    const dataDir = path.join(process.cwd(), 'data');
    const curriculumPath = path.join(dataDir, 'curriculum_content.json');
    let curriculum = JSON.parse(fs.readFileSync(curriculumPath, 'utf-8'));

    // Apply module filter
    if (moduleFilter && moduleFilter !== 'all') {
      curriculum = curriculum.filter((c: any) => c.module === moduleFilter);
    }

    return NextResponse.json({ curriculum });
  } catch (error) {
    console.error('Curriculum API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch curriculum' },
      { status: 500 }
    );
  }
}
