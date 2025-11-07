'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import type { Insight } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PageNav from '@/components/PageNav';
import { useTranslations } from 'next-intl';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type SortField =
  | 'insight_id'
  | 'expert'
  | 'module'
  | 'priority'
  | 'insight_type';
type SortDirection = 'asc' | 'desc';

interface FilterOptions {
  experts: string[];
  modules: string[];
  priorities: string[];
  types: string[];
}

const formatCSV = (insights: Insight[]) => {
  const headers = [
    'Insight ID',
    'Expert',
    'Module',
    'Priority',
    'Type',
    'Theme',
    'Quote (EN)',
    'Quote (AR)',
    'Tags',
  ];

  const rows = insights.map((insight) => [
    insight.insight_id ?? insight.id,
    insight.expert,
    insight.module,
    insight.priority ?? '',
    insight.insight_type ?? '',
    insight.theme_english,
    insight.quote_english,
    insight.quote_arabic,
    insight.tags_english ?? '',
  ]);

  return [headers, ...rows]
    .map((row) =>
      row
        .map((cell) =>
          `"${(cell ?? '')
            .toString()
            .replace(/"/g, '""')}"`
        )
        .join(',')
    )
    .join('\n');
};

export default function Browse() {
  const t = useTranslations();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [filters, setFilters] = useState({
    module: 'all',
    expert: 'all',
    priority: 'all',
    type: 'all',
  });
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    experts: [],
    modules: [],
    priorities: [],
    types: [],
  });
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('insight_id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await fetch('/api/filters');
        const data = (await response.json()) as FilterOptions;
        setFilterOptions(data);
      } catch (error) {
        console.error('Failed to load filters', error);
      }
    };

    void fetchFilterOptions();
  }, []);

  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams(filters);
        const response = await fetch(`/api/insights?${params.toString()}`);
        const data = await response.json();
        setInsights(data.insights ?? []);
      } catch (error) {
        console.error('Failed to load insights', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchInsights();
  }, [filters]);

  const filtered = useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    if (!searchLower) {
      return insights;
    }

    return insights.filter((insight) => {
      const haystack = [
        insight.insight_id,
        insight.expert,
        insight.module,
        insight.theme_english,
        insight.quote_english,
        insight.tags_english,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(searchLower);
    });
  }, [insights, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aValue = (a[sortField] ?? '') as string;
      const bValue = (b[sortField] ?? '') as string;
      if (aValue === bValue) return 0;
      const modifier = sortDirection === 'asc' ? 1 : -1;
      return aValue > bValue ? modifier : -modifier;
    });
  }, [filtered, sortDirection, sortField]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const exportToCsv = () => {
    const csv = formatCSV(sorted);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'beit_insights_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setFilters({
      module: 'all',
      expert: 'all',
      priority: 'all',
      type: 'all',
    });
    setSearch('');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {t('common.browse')}
              </h1>
              <p className="text-sm text-slate-600">
                {sorted.length} of {insights.length} insights · Filter by module, priority, or theme
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={exportToCsv}
              >
                Export CSV
              </Button>
              <PageNav />
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-6">
        <Card className="mb-6 border-slate-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-slate-900">Refine the insight list</CardTitle>
            <CardDescription className="text-slate-600">
              Combine filters and free text search to pinpoint quotes for your
              curriculum.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-5">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Search
              </label>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Theme, quote, expert…"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Module
              </label>
              <select
                value={filters.module}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    module: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="all">All modules</option>
                {filterOptions.modules.map((module) => (
                  <option key={module} value={module}>
                    {module}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Expert
              </label>
              <select
                value={filters.expert}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    expert: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="all">All experts</option>
                {filterOptions.experts.map((expert) => (
                  <option key={expert} value={expert}>
                    {expert}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Priority
              </label>
              <select
                value={filters.priority}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    priority: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="all">All priorities</option>
                {filterOptions.priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Insight type
              </label>
              <select
                value={filters.type}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    type: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="all">All types</option>
                {filterOptions.types.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <Badge variant="outline" className="border-blue-200 text-slate-600">
              {sorted.length} result{sorted.length === 1 ? '' : 's'}
            </Badge>
            <Button variant="ghost" onClick={resetFilters}>
              Reset
            </Button>
          </div>
        </Card>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead
                  role="button"
                  className="cursor-pointer text-slate-700"
                  onClick={() => handleSort('insight_id')}
                >
                  Insight ID
                </TableHead>
                <TableHead
                  role="button"
                  className="cursor-pointer text-slate-700"
                  onClick={() => handleSort('expert')}
                >
                  Expert
                </TableHead>
                <TableHead
                  role="button"
                  className="cursor-pointer text-slate-700"
                  onClick={() => handleSort('module')}
                >
                  Module
                </TableHead>
                <TableHead
                  role="button"
                  className="cursor-pointer text-slate-700"
                  onClick={() => handleSort('priority')}
                >
                  Priority
                </TableHead>
                <TableHead
                  role="button"
                  className="cursor-pointer text-slate-700"
                  onClick={() => handleSort('insight_type')}
                >
                  Type
                </TableHead>
                <TableHead className="text-slate-700">Theme & Key Quotes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((insight) => (
                <TableRow key={insight.id}>
                  <TableCell className="font-medium text-slate-900">
                    {insight.insight_id ?? insight.id}
                  </TableCell>
                  <TableCell className="text-slate-900">{insight.expert}</TableCell>
                  <TableCell className="text-slate-900">{insight.module}</TableCell>
                  <TableCell className="text-slate-900">{insight.priority ?? '—'}</TableCell>
                  <TableCell className="text-slate-900">{insight.insight_type ?? '—'}</TableCell>
                  <TableCell className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">
                      {insight.theme_english}
                    </p>
                    {insight.quote_english && (
                      <p className="text-sm italic text-slate-600">
                        “{insight.quote_english}”
                      </p>
                    )}
                    {insight.quote_arabic && (
                      <p
                        className="text-sm italic text-slate-600"
                        dir="rtl"
                      >
                        “{insight.quote_arabic}”
                      </p>
                    )}
                    {insight.tags_english && (
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        {insight.tags_english}
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && sorted.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-sm text-slate-500"
                  >
                    No insights match your filters yet.
                  </TableCell>
                </TableRow>
              )}
              {loading && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-sm text-slate-500"
                  >
                    Loading insights…
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </main>
  );
}
