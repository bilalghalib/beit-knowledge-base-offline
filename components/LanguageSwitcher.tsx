'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, useEffect } from 'react';

const readLocaleFromCookie = () => {
  if (typeof document === 'undefined') {
    return 'ar';
  }

  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith('NEXT_LOCALE='));

  return cookie ? cookie.split('=')[1] : 'ar';
};

export default function LanguageSwitcher() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Initialize with 'ar' for consistent SSR
  const [locale, setLocale] = useState<string>('ar');

  // Read actual cookie value after hydration (client-side only)
  useEffect(() => {
    setLocale(readLocaleFromCookie());
  }, []);

  const switchLocale = (newLocale: string) => {
    setLocale(newLocale);

    // Set cookie
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;

    // Force full page reload to apply new locale
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
        disabled={isPending}
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
        disabled={isPending}
      >
        AR
      </button>
    </div>
  );
}
