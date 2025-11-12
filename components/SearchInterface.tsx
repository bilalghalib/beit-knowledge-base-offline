'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CurriculumSource {
  id: string;
  source_type: 'curriculum';
  module: string;
  day: number;
  session_number: number | null;
  activity_name: string;
  purpose: string | null;
  similarity: number;
  source_file?: string;
  source_name?: string;
}

interface MetadataSource {
  id: string;
  source_type: 'metadata';
  category: string;
  question: string;
  answer: string;
  similarity: number;
}

interface InsightSource {
  id: string;
  source_type: 'insight';
  expert: string;
  module: string;
  theme_english: string;
  quote_english: string;
  quote_arabic?: string | null;
  context_notes_english?: string | null;
  context_notes_arabic?: string | null;
  tags_english?: string | null;
  tags_arabic?: string | null;
  priority?: string | null;
  similarity: number;
}

type Source = CurriculumSource | MetadataSource | InsightSource;

interface SearchResponse {
  answer: string;
  sources: Source[];
  numFound?: number;
  insights?: InsightSource[];
}

const exampleListFallback = [
  'What hands-on activities worked best in training?',
  'What barriers prevent graduates from finding work?',
];

export default function SearchInterface() {
  const t = useTranslations('home');
  const tCommon = useTranslations('common');
  const tCurriculum = useTranslations('curriculum');
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const exampleQuestions = useMemo(() => {
    const raw = t.raw('exampleQuestions');
    return Array.isArray(raw) && raw.length > 0 ? (raw as string[]) : exampleListFallback;
  }, [t]);

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generateLLMAnswer, setGenerateLLMAnswer] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());

  useEffect(() => {
    const key = localStorage.getItem('openai_api_key');
    setHasApiKey(!!key);
  }, []);

  const handleSearch = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const openaiApiKey = localStorage.getItem('openai_api_key') || undefined;

      const res = await fetch('/api/search-smart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          generateAnswer: generateLLMAnswer,
          openaiApiKey
        }),
      });

      if (!res.ok) {
        throw new Error('Search failed');
      }

      const data = (await res.json()) as SearchResponse;
      setResponse(data);
    } catch (err) {
      console.error('Search error:', err);
      setError(t('failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSearch();
    }
  };

  const handleReset = () => {
    setQuery('');
    setResponse(null);
    setError(null);
    setExpandedInsights(new Set());
  };

  const toggleInsightExpansion = (id: string) => {
    setExpandedInsights(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const sourceCount =
    response?.numFound ?? response?.sources?.length ?? response?.insights?.length ?? 0;

  const displaySources = response?.sources ?? (response?.insights?.map(i => ({
    ...i,
    source_type: 'insight' as const
  })) || []);

  const statusLabel = generateLLMAnswer
    ? (hasApiKey ? t('loadingGenerating') : t('loadingGeneratingSlow'))
    : t('loadingSearch');

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      {!response && !error && (
        <section className="mb-12 text-center">
          <h2 className="mb-4 text-4xl font-bold text-slate-900">
            {t('heading')}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-600">
            {t('description')}
          </p>
        </section>
      )}

      <form className="mb-8" onSubmit={handleSearch}>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg transition-all hover:shadow-xl">
          <textarea
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={t('placeholder')}
            className="w-full resize-none px-6 py-5 text-lg text-slate-900 placeholder-slate-400 focus:outline-none"
            rows={3}
            disabled={loading}
            dir={isRTL ? 'rtl' : 'ltr'}
          />
          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div className={`flex flex-col gap-2 text-xs text-slate-500 ${isRTL ? 'md:text-right' : ''}`}>
              <span>
                {query.length > 0
                  ? t('characterCount', { count: query.length })
                  : t('pressEnter')}
              </span>
              <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                <input
                  type="checkbox"
                  checked={generateLLMAnswer}
                  onChange={(e) => setGenerateLLMAnswer(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs">{t('generateAnswerLabel')}</span>
              </label>
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={loading || !query.trim()}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              {loading ? (
                <>
                  <svg
                    className={`${isRTL ? 'ml-2' : '-ml-1 mr-2'} h-4 w-4 animate-spin`}
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {statusLabel}
                </>
              ) : (
                <>
                  {tCommon('search')}
                  <svg
                    className={`${isRTL ? 'mr-2' : 'ml-2'} h-4 w-4`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {generateLLMAnswer && !hasApiKey && !loading && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1 text-sm text-amber-800 space-y-1">
              <p className="font-semibold text-amber-900">{t('aiWarning.title')}</p>
              <p>{t('aiWarning.body')}</p>
              <p className="text-xs text-amber-700">{t('aiWarning.tip')}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-8 rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
          {error}
        </div>
      )}

      {response && (
        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-50 to-slate-50 px-8 py-6">
              <h3 className="text-xl font-semibold text-slate-900">
                {t('responseHeading')}
              </h3>
              <Badge className="bg-blue-100 text-blue-700">
                {t('sourcesBadge', { count: sourceCount })}
              </Badge>
            </div>
            <div className="px-8 py-6">
              <div className="prose max-w-none whitespace-pre-wrap leading-relaxed text-slate-700">
                {response.answer}
              </div>
            </div>
          </div>

          {displaySources.length > 0 && (
            <div>
              <p className="mb-4 px-1 text-sm font-semibold text-slate-600">
                {t('sourcesHeader', { count: sourceCount })}
              </p>
              <div className="space-y-4">
                {displaySources.map((source, index) => {
                  if (source.source_type === 'curriculum') {
                    const curr = source as CurriculumSource;
                    return (
                      <article
                        key={curr.id}
                        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow transition-shadow hover:shadow-md"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200 bg-emerald-50 px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                              {index + 1}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {curr.module} · {tCurriculum('day')} {curr.day}
                                {curr.session_number && `, ${tCurriculum('session')} ${curr.session_number}`}
                              </p>
                              <p className="text-xs text-slate-500">{t('curriculumBadge')}</p>
                            </div>
                          </div>
                          {typeof curr.similarity === 'number' && (
                            <Badge
                              variant="secondary"
                              className="bg-emerald-100 text-emerald-700"
                            >
                              {t('matchLabel', { percent: Math.round(curr.similarity * 100) })}
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-4 px-6 py-5">
                          <p className="text-sm font-medium text-slate-700">
                            {curr.activity_name || t('activityFallback')}
                          </p>
                          {curr.purpose && (
                            <p className="text-sm text-slate-600">{curr.purpose}</p>
                          )}
                        </div>
                      </article>
                    );
                  }

                  if (source.source_type === 'metadata') {
                    const meta = source as MetadataSource;
                    return (
                      <article
                        key={meta.id}
                        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow transition-shadow hover:shadow-md"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200 bg-purple-50 px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">
                              {index + 1}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {meta.category}
                              </p>
                              <p className="text-xs text-slate-500">{t('metadataBadge')}</p>
                            </div>
                          </div>
                          {typeof meta.similarity === 'number' && (
                            <Badge
                              variant="secondary"
                              className="bg-purple-100 text-purple-700"
                            >
                              {t('matchLabel', { percent: Math.round(meta.similarity * 100) })}
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-3 px-6 py-5">
                          <p className="text-sm font-medium text-slate-700">{meta.question}</p>
                          <p className="text-sm text-slate-600">{meta.answer}</p>
                        </div>
                      </article>
                    );
                  }

                  const insight = source as InsightSource;
                  const isExpanded = expandedInsights.has(insight.id);
                  return (
                    <article
                      key={insight.id}
                      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow transition-shadow hover:shadow-md"
                    >
                      <button
                        onClick={() => toggleInsightExpansion(insight.id)}
                        className={`w-full transition-colors hover:bg-slate-50/50 ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                              {index + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900">
                                {insight.expert}
                              </p>
                              <p className="text-xs text-slate-500">
                                {insight.module}
                              </p>
                            </div>
                            <svg
                              className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          {typeof insight.similarity === 'number' && (
                            <Badge
                              variant="secondary"
                              className="bg-slate-100 text-slate-600 ml-2"
                            >
                              {t('matchLabel', { percent: Math.round(insight.similarity * 100) })}
                            </Badge>
                          )}
                        </div>
                      </button>
                      <div className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-700">
                          {insight.theme_english}
                        </p>
                      </div>
                      {isExpanded && (
                        <div className="space-y-4 px-6 pb-5 border-t border-slate-100 pt-4">
                          {insight.context_notes_english && (
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t('contextLabel')}</p>
                              <p className="text-sm text-slate-600 leading-relaxed">
                                {insight.context_notes_english}
                              </p>
                            </div>
                          )}
                          {insight.quote_english && (
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t('quoteEnglishLabel')}</p>
                              <blockquote className="rounded-r border-l-4 border-blue-400 bg-blue-50/50 px-4 py-3 text-sm italic text-slate-700">
                                &ldquo;{insight.quote_english}&rdquo;
                              </blockquote>
                            </div>
                          )}
                          {insight.quote_arabic && (
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t('quoteArabicLabel')}</p>
                              <blockquote
                                className="rounded-l border-r-4 border-blue-400 bg-blue-50/50 px-4 py-3 text-sm italic text-slate-700"
                                dir="rtl"
                              >
                                &ldquo;{insight.quote_arabic}&rdquo;
                              </blockquote>
                            </div>
                          )}
                          {insight.tags_english && (
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t('tagsLabel')}</p>
                              <div className="flex flex-wrap gap-2">
                                {insight.tags_english.split(',').map((tag, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-300">
                                    {tag.trim().replace(/_/g, ' ')}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {insight.priority && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('priorityLabel')}:</span>
                              <Badge className={`text-xs ${
                                insight.priority.toLowerCase() === 'critical' ? 'bg-red-100 text-red-700' :
                                insight.priority.toLowerCase() === 'high' ? 'bg-orange-100 text-orange-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {insight.priority}
                              </Badge>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-2 text-center">
            <Button variant="outline" onClick={handleReset}>
              {t('askAnother')}
            </Button>
          </div>
        </section>
      )}

      {!response && !error && (
        <section>
          <p className="mb-4 px-1 text-sm font-semibold text-slate-600">
            {t('tryAsking')}
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {exampleQuestions.map((example) => (
              <button
                key={example}
                onClick={() => setQuery(example)}
                className="group rounded-xl border border-slate-200 bg-white px-5 py-4 text-left transition-all hover:border-blue-300 hover:shadow-md"
                type="button"
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <p className="text-sm text-slate-700 transition-colors group-hover:text-blue-700">
                  {example}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
