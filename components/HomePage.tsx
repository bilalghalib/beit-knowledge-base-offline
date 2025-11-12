'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import SearchInterface from '@/components/SearchInterface';
import SettingsPanel, { SettingsIcon } from '@/components/SettingsPanel';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function HomePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const tHome = useTranslations('home');
  const tCommon = useTranslations('common');
  const tFooter = useTranslations('footer');
  const tSettings = useTranslations('settings');
  const locale = useLocale();
  const isRTL = locale === 'ar';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-sm" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-xl font-bold text-white">
              B
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">
                {tHome('title')}
              </p>
              <p className="text-xs text-slate-500">
                {tHome('subtitle')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
              <Link href="/browse" className="hover:text-slate-900 transition-colors">
                {tCommon('browse')}
              </Link>
              <Link href="/curriculum" className="hover:text-slate-900 transition-colors">
                {tCommon('curriculum')}
              </Link>
              <Link href="/analytics" className="hover:text-slate-900 transition-colors">
                {tCommon('analytics')}
              </Link>
            </nav>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
              title={tSettings('title')}
            >
              <SettingsIcon />
            </button>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12" dir={isRTL ? 'rtl' : 'ltr'}>
        <SearchInterface />
      </main>

      <footer className="mt-16 border-t border-slate-200">
        <div className="mx-auto max-w-5xl px-6 py-6 text-center text-sm text-slate-500" dir={isRTL ? 'rtl' : 'ltr'}>
          {tFooter('copyright')}
        </div>
      </footer>

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
