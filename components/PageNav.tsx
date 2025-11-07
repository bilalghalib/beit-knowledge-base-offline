'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from './LanguageSwitcher';

export default function PageNav() {
  const t = useTranslations();

  return (
    <div className="flex items-center gap-6">
      <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
        {t('common.search')}
      </Link>
      <Link href="/browse" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
        {t('common.browse')}
      </Link>
      <Link href="/curriculum" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
        {t('common.curriculum')}
      </Link>
      <LanguageSwitcher />
    </div>
  );
}
