'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PageNav from '@/components/PageNav';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type Module = 'Architecture' | 'Solar' | 'Insulation';

interface Activity {
  id: string;
  module: string;
  day: number;
  day_theme: string;
  session_number: number;
  activity_name: string;
  purpose: string | null;
  duration: string | null;
  searchable_content: string;
}

interface DayGroup {
  day: number;
  theme: string;
  activities: Activity[];
}

export default function CurriculumPlanner() {
  const t = useTranslations();
  const [activeModule, setActiveModule] = useState<Module>('Architecture');
  const [curriculum, setCurriculum] = useState<DayGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  useEffect(() => {
    const fetchCurriculum = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/curriculum?module=${activeModule}`);
        const data = await response.json();

        // Group by day
        const grouped: Record<number, DayGroup> = {};
        for (const activity of data.curriculum || []) {
          if (!activity.day) continue;

          if (!grouped[activity.day]) {
            grouped[activity.day] = {
              day: activity.day,
              theme: activity.day_theme || `Day ${activity.day}`,
              activities: [],
            };
          }
          grouped[activity.day].activities.push(activity);
        }

        // Sort activities by session_number
        const sorted = Object.values(grouped)
          .sort((a, b) => a.day - b.day)
          .map((dayGroup) => ({
            ...dayGroup,
            activities: dayGroup.activities.sort(
              (a, b) => (a.session_number || 0) - (b.session_number || 0)
            ),
          }));

        setCurriculum(sorted);
      } catch (error) {
        console.error('Failed to load curriculum', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchCurriculum();
  }, [activeModule]);

  const modules: Module[] = ['Architecture', 'Solar', 'Insulation'];

  const exportDay = (day: DayGroup) => {
    const markdown = `# ${activeModule} - Day ${day.day}: ${day.theme}\n\n${day.activities
      .map(
        (a, i) =>
          `## Session ${i + 1}: ${a.activity_name}\n\n` +
          `**Duration:** ${a.duration || 'N/A'}\n\n` +
          `**Purpose:** ${a.purpose || 'N/A'}\n\n` +
          `**Activity Details:**\n${a.searchable_content}\n\n---\n`
      )
      .join('\n')}`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeModule}_Day${day.day}_${day.theme.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {t('curriculum.title')}
              </h1>
              <p className="text-sm text-slate-600">
                {t('curriculum.subtitle')}
              </p>
            </div>
            <PageNav />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Module Tabs */}
        <div className="mb-8 flex gap-2">
          {modules.map((module) => (
            <button
              key={module}
              onClick={() => setActiveModule(module)}
              className={`rounded-lg px-6 py-3 text-sm font-semibold transition-all ${
                activeModule === module
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {module}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500">
            Loading curriculum...
          </div>
        ) : curriculum.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            No curriculum data found for {activeModule}
          </div>
        ) : (
          <div className="space-y-4">
            {curriculum.map((dayGroup) => (
              <Card key={dayGroup.day} className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer bg-gradient-to-r from-slate-50 to-blue-50 hover:from-slate-100 hover:to-blue-100"
                  onClick={() =>
                    setExpandedDay(
                      expandedDay === dayGroup.day ? null : dayGroup.day
                    )
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-slate-900">
                        Day {dayGroup.day}: {dayGroup.theme}
                      </CardTitle>
                      <CardDescription className="text-slate-600">
                        {dayGroup.activities.length} sessions
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          exportDay(dayGroup);
                        }}
                      >
                        Download
                      </Button>
                      <svg
                        className={`h-5 w-5 text-slate-500 transition-transform ${
                          expandedDay === dayGroup.day ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </CardHeader>

                {expandedDay === dayGroup.day && (
                  <CardContent className="space-y-4 pt-6">
                    {dayGroup.activities.map((activity, idx) => (
                      <div
                        key={activity.id}
                        className="rounded-lg border border-slate-200 bg-white p-5"
                      >
                        <div className="mb-3 flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Badge className="bg-blue-100 text-blue-700">
                              Session {idx + 1}
                            </Badge>
                            <h3 className="text-lg font-semibold text-slate-900">
                              {activity.activity_name}
                            </h3>
                          </div>
                          {activity.duration && (
                            <Badge variant="outline" className="text-slate-600">
                              {activity.duration}
                            </Badge>
                          )}
                        </div>

                        {activity.purpose && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-slate-700">
                              Purpose:
                            </p>
                            <p className="text-sm text-slate-600">
                              {activity.purpose}
                            </p>
                          </div>
                        )}

                        <details className="group">
                          <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700">
                            View full session details →
                          </summary>
                          <div className="mt-3 rounded-md bg-slate-50 p-4">
                            <pre className="whitespace-pre-wrap text-xs text-slate-700">
                              {activity.searchable_content}
                            </pre>
                          </div>
                        </details>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
