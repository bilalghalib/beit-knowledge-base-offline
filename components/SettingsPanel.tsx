'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
// Simple X icon component
const XIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const loadInitialKey = () => {
  if (typeof window === 'undefined') {
    return '';
  }
  return localStorage.getItem('openai_api_key') ?? '';
};

const loadInitialOllama = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  return localStorage.getItem('use_ollama') === 'true';
};

const SETTINGS_UPDATED_EVENT = 'beit-settings-changed';

const notifySettingsChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SETTINGS_UPDATED_EVENT));
  }
};

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const t = useTranslations('settings');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const [apiKey, setApiKey] = useState(loadInitialKey);
  const [useOllama, setUseOllama] = useState(loadInitialOllama);
  const [saved, setSaved] = useState(false);
  const ollamaSteps = (t.raw('ollamaSteps') as string[] | undefined) ?? [];

  useEffect(() => {
    if (isOpen) {
      setApiKey(loadInitialKey());
      setUseOllama(loadInitialOllama());
    }
  }, [isOpen]);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('openai_api_key', apiKey.trim());
    } else {
      localStorage.removeItem('openai_api_key');
    }
    if (useOllama) {
      localStorage.setItem('use_ollama', 'true');
    } else {
      localStorage.removeItem('use_ollama');
    }
    notifySettingsChange();

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1500);
  };

  const handleClear = () => {
    setApiKey('');
    localStorage.removeItem('openai_api_key');
    notifySettingsChange();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-slate-900">{t('title')}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <XIcon />
          </button>
        </div>

        <div className="px-6 py-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-2">
              {t('apiKeyLabel')}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t('apiKeyPlaceholder')}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition"
            />
            <p className="mt-2 text-xs text-slate-500">
              {t('apiKeyHelp')}
            </p>
          </div>

          <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white px-4 py-4 shadow-[0_1px_6px_rgba(249,115,22,0.08)]">
            <div className="flex items-start gap-2">
              <svg className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs text-amber-900">
                <p className="font-semibold mb-1 text-sm">
                  {t('aiHelpTitle')}
                </p>
                <p className="mb-1 leading-relaxed text-amber-800">
                  {t('aiHelpBody')}
                </p>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline font-medium"
                >
                  {t('aiHelpCTA')}
                </a>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">{t('ollamaTitle')}</p>
                <p className="text-xs text-slate-600 mt-1">
                  {t('ollamaDescription')}
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={useOllama}
                  onChange={(event) => setUseOllama(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{t('ollamaToggle')}</span>
              </label>
            </div>
            {ollamaSteps.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-600">
                {ollamaSteps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ul>
            )}
          </div>

          {saved && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-lg text-sm">
              {t('saved')}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 bg-slate-50/70 rounded-b-xl">
          {apiKey && (
            <Button
              variant="outline"
              onClick={handleClear}
              className="border border-red-200 bg-white/90 text-red-600 hover:bg-red-50 hover:text-red-700 shadow-sm"
            >
              {t('clear')}
            </Button>
          )}
          <Button
            onClick={handleSave}
            className="bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
          >
            {t('save')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Export the SettingsIcon and event name for other components
export { SettingsIcon, SETTINGS_UPDATED_EVENT };
