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
  const [showOllamaHelp, setShowOllamaHelp] = useState(false);
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
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800">{t('ollamaTitle')}</p>
                  <button
                    type="button"
                    onClick={() => setShowOllamaHelp(true)}
                    className="text-blue-600 hover:text-blue-700 text-xs font-medium underline"
                  >
                    {t('ollamaHelpButton')}
                  </button>
                </div>
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

      {/* Ollama Help Modal */}
      {showOllamaHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowOllamaHelp(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-3xl max-h-[90vh] overflow-y-auto w-full"
            onClick={(e) => e.stopPropagation()}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">{t('ollamaHelpTitle')}</h2>
              <button
                onClick={() => setShowOllamaHelp(false)}
                className="text-white hover:text-blue-100 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Overview */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('ollamaHelpOverviewTitle')}</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{t('ollamaHelpOverview')}</p>
              </div>

              {/* Windows Installation */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <h3 className="text-md font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
                  </svg>
                  {t('ollamaHelpWindowsTitle')}
                </h3>
                <ol className={`space-y-3 ${isRTL ? 'list-[arabic-indic] pr-5' : 'list-decimal pl-5'} text-sm text-slate-700`}>
                  <li>{t('ollamaHelpWindowsStep1')}</li>
                  <li>{t('ollamaHelpWindowsStep2')}</li>
                  <li>
                    {t('ollamaHelpWindowsStep3')}
                    <code className={`block mt-2 bg-slate-900 text-green-400 p-2 rounded font-mono text-xs ${isRTL ? 'text-right' : 'text-left'}`}>
                      ollama pull llama3:8b
                    </code>
                  </li>
                  <li>{t('ollamaHelpWindowsStep4')}</li>
                </ol>
              </div>

              {/* Mac Installation */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <h3 className="text-md font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5M13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                  </svg>
                  {t('ollamaHelpMacTitle')}
                </h3>
                <ol className={`space-y-3 ${isRTL ? 'list-[arabic-indic] pr-5' : 'list-decimal pl-5'} text-sm text-slate-700`}>
                  <li>{t('ollamaHelpMacStep1')}</li>
                  <li>{t('ollamaHelpMacStep2')}</li>
                  <li>
                    {t('ollamaHelpMacStep3')}
                    <code className={`block mt-2 bg-slate-900 text-green-400 p-2 rounded font-mono text-xs ${isRTL ? 'text-right' : 'text-left'}`}>
                      ollama pull llama3:8b
                    </code>
                  </li>
                  <li>{t('ollamaHelpMacStep4')}</li>
                </ol>
              </div>

              {/* How it connects */}
              <div className="border-l-4 border-blue-600 bg-blue-50 p-4 rounded">
                <h3 className="text-md font-semibold text-slate-900 mb-2">{t('ollamaHelpConnectionTitle')}</h3>
                <p className="text-sm text-slate-700 leading-relaxed mb-3">{t('ollamaHelpConnection')}</p>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{t('ollamaHelpConnectionNote')}</span>
                </div>
              </div>

              {/* Troubleshooting */}
              <div>
                <h3 className="text-md font-semibold text-slate-900 mb-3">{t('ollamaHelpTroubleshootingTitle')}</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>{t('ollamaHelpTroubleshooting1')}</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>{t('ollamaHelpTroubleshooting2')}</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>{t('ollamaHelpTroubleshooting3')}</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="sticky bottom-0 bg-slate-50 px-6 py-4 border-t border-slate-200">
              <Button
                onClick={() => setShowOllamaHelp(false)}
                className="w-full bg-blue-600 text-white hover:bg-blue-700"
              >
                {t('close')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export the SettingsIcon and event name for other components
export { SettingsIcon, SETTINGS_UPDATED_EVENT };
