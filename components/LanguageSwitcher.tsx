'use client';

import { useLocale } from 'next-intl';

export default function LanguageSwitcher() {
  const locale = useLocale();

  const switchLocale = (newLocale: string) => {
    if (newLocale === locale) return;
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => switchLocale('en')}
        className={`px-3 py-1.5 text-sm font-medium transition-colors rounded-md ${
          locale === 'en'
            ? 'bg-blue-600 text-white'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => switchLocale('ar')}
        className={`px-3 py-1.5 text-sm font-medium transition-colors rounded-md ${
          locale === 'ar'
            ? 'bg-blue-600 text-white'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        AR
      </button>
    </div>
  );
}
