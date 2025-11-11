'use client';

import { useState } from 'react';
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
  priority?: string | null;
  similarity: number;
}

type Source = CurriculumSource | MetadataSource | InsightSource;

interface SearchResponse {
  answer: string;
  sources: Source[];
  numFound?: number;
  insights?: any[];
}

const EXAMPLE_QUESTIONS = [
  'ما هي الأنشطة العملية التي نجحت بشكل أفضل في التدريب؟',
  'ما العوائق التي تمنع الخريجين من إيجاد عمل؟',
  'كيف يجب أن نوازن بين النظرية والممارسة؟',
  'ما العوائق الثقافية التي تؤثر على تبني البناء الأخضر في الموصل؟',
  'ما فرص السوق الموجودة للطاقة الشمسية؟',
  'ما أساليب الاعتماد الأكثر تقديراً من قبل أصحاب العمل؟',
];

export default function SearchInterfaceAR() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generateLLMAnswer, setGenerateLLMAnswer] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Check if API key exists
  useState(() => {
    const key = localStorage.getItem('openai_api_key');
    setHasApiKey(!!key);
  });

  const handleSearch = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Get OpenAI API key from localStorage if available
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
      setError('فشل البحث. يرجى المحاولة مرة أخرى.');
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
  };

  const sourceCount =
    response?.numFound ?? response?.sources?.length ?? response?.insights?.length ?? 0;

  const displaySources = response?.sources ?? (response?.insights?.map(i => ({
    ...i,
    source_type: 'insight' as const
  })) || []);

  return (
    <div dir="rtl">
      {!response && !error && (
        <section className="mb-12 text-center">
          <h2 className="mb-4 text-4xl font-bold text-slate-900">
            اسأل الخبراء
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-600">
            استعلم عن أكثر من 40 رؤية ثنائية اللغة تم جمعها من مدربي الهندسة المعمارية والطاقة الشمسية والعزل في BEIT للتخطيط للجلسات واكتشاف العوائق والحصول على اقتباسات أصيلة.
          </p>
        </section>
      )}

      <form className="mb-8" onSubmit={handleSearch}>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg transition-all hover:shadow-xl">
          <textarea
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="اطرح سؤالاً حول رؤى تدريب BEIT..."
            className="w-full resize-none px-6 py-5 text-lg text-slate-900 placeholder-slate-400 focus:outline-none"
            rows={3}
            disabled={loading}
          />
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
            <Button
              type="submit"
              size="lg"
              disabled={loading || !query.trim()}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              {loading ? (
                <>
                  <svg
                    className="-ml-1 mr-2 h-4 w-4 animate-spin"
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
                  {generateLLMAnswer && !hasApiKey
                    ? 'جاري إنشاء إجابة الذكاء الاصطناعي (قد يستغرق 2-5 دقائق)...'
                    : generateLLMAnswer
                    ? 'جاري إنشاء إجابة الذكاء الاصطناعي...'
                    : 'جاري البحث...'}
                </>
              ) : (
                <>
                  بحث
                  <svg
                    className="ml-2 h-4 w-4"
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
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-500">
                {query.length > 0
                  ? `${query.length} حرف`
                  : 'اضغط Enter للبحث'}
              </span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateLLMAnswer}
                  onChange={(e) => setGenerateLLMAnswer(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-600">إنشاء إجابة الذكاء الاصطناعي (أبطأ)</span>
              </label>
            </div>
          </div>
        </div>
      </form>

      {generateLLMAnswer && !hasApiKey && !loading && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5" dir="rtl">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900 mb-1">توليد الذكاء الاصطناعي سيكون بطيئًا جدًا على الجهاز المحلي</p>
              <p className="text-xs text-amber-800 mb-2">
                بدون مفتاح OpenAI API، قد يستغرق توليد الإجابة من 2 إلى 5 دقائق حسب موارد جهازك. مع المفتاح، ستحصل على النتائج في 5-10 ثوان.
              </p>
              <p className="text-xs text-amber-700">
                أضف مفتاح OpenAI API من الإعدادات (أعلى اليمين) للحصول على نتائج أسرع، أو قم بإلغاء تحديد "إنشاء إجابة الذكاء الاصطناعي" للحصول على نتائج البحث الفورية.
              </p>
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
                استجابة الخبراء
              </h3>
              <Badge className="bg-blue-100 text-blue-700">
                {sourceCount} {sourceCount === 1 ? 'مصدر' : 'مصادر'}
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
                {sourceCount} {sourceCount === 1 ? 'مصدر' : 'مصادر'}
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
                                {curr.module} - اليوم {curr.day}
                                {curr.session_number && `، الجلسة ${curr.session_number}`}
                              </p>
                              <p className="text-xs text-slate-500">نشاط المنهج</p>
                            </div>
                          </div>
                          {typeof curr.similarity === 'number' && (
                            <Badge
                              variant="secondary"
                              className="bg-emerald-100 text-emerald-700"
                            >
                              {Math.round(curr.similarity * 100)}% تطابق
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-4 px-6 py-5">
                          <p className="text-sm font-medium text-slate-700">
                            {curr.activity_name || 'نشاط'}
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
                              <p className="text-xs text-slate-500">حقيقة المشروع</p>
                            </div>
                          </div>
                          {typeof meta.similarity === 'number' && (
                            <Badge
                              variant="secondary"
                              className="bg-purple-100 text-purple-700"
                            >
                              {Math.round(meta.similarity * 100)}% تطابق
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
                  return (
                    <article
                      key={insight.id}
                      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {insight.expert}
                            </p>
                            <p className="text-xs text-slate-500">
                              {insight.module}
                            </p>
                          </div>
                        </div>
                        {typeof insight.similarity === 'number' && (
                          <Badge
                            variant="secondary"
                            className="bg-slate-100 text-slate-600"
                          >
                            {Math.round(insight.similarity * 100)}% تطابق
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-4 px-6 py-5">
                        <p className="text-sm font-medium text-slate-700">
                          {insight.theme_english}
                        </p>
                        {insight.quote_arabic && (
                          <blockquote
                            className="rounded-l border-r-4 border-blue-400 bg-blue-50/50 px-4 py-3 text-sm italic text-slate-700"
                          >
                            &ldquo;{insight.quote_arabic}&rdquo;
                          </blockquote>
                        )}
                        {insight.quote_english && !insight.quote_arabic && (
                          <blockquote className="rounded-r border-l-4 border-blue-400 bg-blue-50/50 px-4 py-3 text-sm italic text-slate-700">
                            &ldquo;{insight.quote_english}&rdquo;
                          </blockquote>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-2 text-center">
            <Button variant="outline" onClick={handleReset}>
              اطرح سؤالاً آخر
            </Button>
          </div>
        </section>
      )}

      {!response && !error && (
        <section>
          <p className="mb-4 px-1 text-sm font-semibold text-slate-600">
            جرب السؤال
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {EXAMPLE_QUESTIONS.map((example) => (
              <button
                key={example}
                onClick={() => setQuery(example)}
                className="group rounded-xl border border-slate-200 bg-white px-5 py-4 text-right transition-all hover:border-blue-300 hover:shadow-md"
                type="button"
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
