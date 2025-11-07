'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import PageNav from '@/components/PageNav';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface Stats {
  totalInsights: number;
  totalExperts: number;
  totalActivities: number;
  totalMetadata: number;
  insightsByModule: Record<string, number>;
  insightsByPriority: Record<string, number>;
  insightsByType: Record<string, number>;
  expertContributions: Array<{ expert: string; count: number }>;
  curriculumByModule: Record<string, number>;
}

export default function Analytics() {
  const t = useTranslations();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/analytics');
        if (!response.ok) {
          throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Failed to load analytics', error);
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Loading analytics...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-500">Failed to load analytics data</p>
      </div>
    );
  }

  const totalData = stats.totalInsights + stats.totalActivities + stats.totalMetadata;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {t('analytics.title')}
              </h1>
              <p className="text-sm text-slate-600">
                {t('analytics.subtitle')}
              </p>
            </div>
            <PageNav />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Key Metrics */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-600">Expert Insights</CardDescription>
              <CardTitle className="text-4xl text-slate-900">{stats.totalInsights}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-600">
                From {stats.totalExperts} trainers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-600">Training Activities</CardDescription>
              <CardTitle className="text-4xl text-slate-900">
                {stats.totalActivities}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-600">
                Across 3 modules
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-600">Expert Trainers</CardDescription>
              <CardTitle className="text-4xl text-slate-900">{stats.totalExperts}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-600">
                Interviewed Oct-Nov 2024
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-600">Total Data Points</CardDescription>
              <CardTitle className="text-4xl text-slate-900">{totalData}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-600">
                Insights + Activities + Facts
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Module Breakdown */}
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900">Insights by Module</CardTitle>
              <CardDescription className="text-slate-600">Distribution across training areas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats.insightsByModule)
                  .sort(([, a], [, b]) => b - a)
                  .map(([module, count]) => {
                    const percentage = ((count / stats.totalInsights) * 100).toFixed(1);
                    return (
                      <div key={module}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-900">
                            {module}
                          </span>
                          <span className="text-slate-600">
                            {count} ({percentage}%)
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full bg-blue-600"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900">Insights by Priority</CardTitle>
              <CardDescription className="text-slate-600">Importance classification</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats.insightsByPriority)
                  .sort((a, b) => {
                    const order = ['Critical', 'High', 'Medium', 'Interesting'];
                    return order.indexOf(a[0]) - order.indexOf(b[0]);
                  })
                  .map(([priority, count]) => {
                    const percentage = ((count / stats.totalInsights) * 100).toFixed(1);
                    const colorClass =
                      priority === 'Critical'
                        ? 'bg-red-600'
                        : priority === 'High'
                        ? 'bg-orange-500'
                        : priority === 'Medium'
                        ? 'bg-yellow-500'
                        : 'bg-green-500';

                    return (
                      <div key={priority}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-900">
                            {priority}
                          </span>
                          <span className="text-slate-600">
                            {count} ({percentage}%)
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full ${colorClass}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expert Contributions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-slate-900">Top Contributing Experts</CardTitle>
            <CardDescription className="text-slate-600">
              Experts ranked by insight contributions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stats.expertContributions
                .sort((a, b) => b.count - a.count)
                .slice(0, 12)
                .map((expert) => (
                  <div
                    key={expert.expert}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4"
                  >
                    <span className="font-medium text-slate-900">
                      {expert.expert}
                    </span>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                      {expert.count}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Module Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-900">Module Comparison</CardTitle>
            <CardDescription className="text-slate-600">
              Training activities and insights per module
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-3 text-left text-sm font-semibold text-slate-900">
                      Module
                    </th>
                    <th className="pb-3 text-right text-sm font-semibold text-slate-900">
                      Activities
                    </th>
                    <th className="pb-3 text-right text-sm font-semibold text-slate-900">
                      Insights
                    </th>
                    <th className="pb-3 text-right text-sm font-semibold text-slate-900">
                      Days
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {['Architecture', 'Solar', 'Insulation'].map((module) => (
                    <tr key={module} className="border-b border-slate-100">
                      <td className="py-3 text-sm font-medium text-slate-900">
                        {module}
                      </td>
                      <td className="py-3 text-right text-sm text-slate-700">
                        {stats.curriculumByModule[module] || 0}
                      </td>
                      <td className="py-3 text-right text-sm text-slate-700">
                        {stats.insightsByModule[module] || 0}
                      </td>
                      <td className="py-3 text-right text-sm text-slate-700">
                        5
                      </td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className="pt-3 text-sm text-slate-900">Total</td>
                    <td className="pt-3 text-right text-sm text-slate-900">
                      {stats.totalActivities}
                    </td>
                    <td className="pt-3 text-right text-sm text-slate-900">
                      {stats.totalInsights}
                    </td>
                    <td className="pt-3 text-right text-sm text-slate-900">
                      15
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
