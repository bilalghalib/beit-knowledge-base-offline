'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import LanguageSwitcher from './LanguageSwitcher';

export default function Header({ showNewSearch, onNewSearch }: { showNewSearch?: boolean; onNewSearch?: () => void }) {
  const t = useTranslations();

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-xl font-bold text-white">
            B
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">
              {t('home.title')}
            </p>
            <p className="text-xs text-slate-500">
              {t('home.subtitle')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/browse" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            {t('common.browse')}
          </Link>
          <Link href="/curriculum" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            {t('common.curriculum')}
          </Link>
          <Link href="/analytics" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            {t('common.analytics')}
          </Link>
          {showNewSearch && onNewSearch && (
            <Button variant="outline" size="sm" onClick={onNewSearch}>
              {t('common.newSearch')}
            </Button>
          )}
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
