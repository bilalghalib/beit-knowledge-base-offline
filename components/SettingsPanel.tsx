'use client';

import { useState, useEffect } from 'react';
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
  language?: 'en' | 'ar';
}

export default function SettingsPanel({ isOpen, onClose, language = 'en' }: SettingsPanelProps) {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load API key from localStorage on mount
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('openai_api_key', apiKey.trim());
    } else {
      localStorage.removeItem('openai_api_key');
    }
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1500);
  };

  const handleClear = () => {
    setApiKey('');
    localStorage.removeItem('openai_api_key');
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  if (!isOpen) return null;

  const text = language === 'ar' ? {
    title: 'الإعدادات',
    apiKeyLabel: 'مفتاح OpenAI API',
    apiKeyPlaceholder: 'أدخل مفتاح API الخاص بك',
    apiKeyHelp: 'سيتم استخدام هذا المفتاح لتوليد إجابات الذكاء الاصطناعي. سيتم حفظه محلياً على جهازك فقط.',
    saveButton: 'حفظ',
    clearButton: 'مسح',
    savedMessage: 'تم الحفظ!',
    closeButton: 'إغلاق'
  } : {
    title: 'Settings',
    apiKeyLabel: 'OpenAI API Key',
    apiKeyPlaceholder: 'Enter your API key',
    apiKeyHelp: 'This key will be used to generate AI answers. It will only be stored locally on your device.',
    saveButton: 'Save',
    clearButton: 'Clear',
    savedMessage: 'Saved!',
    closeButton: 'Close'
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-slate-900">{text.title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <XIcon />
          </button>
        </div>

        <div className="px-6 py-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {text.apiKeyLabel}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={text.apiKeyPlaceholder}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <p className="mt-2 text-xs text-slate-500">
              {text.apiKeyHelp}
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <div className="flex items-start gap-2">
              <svg className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs text-amber-800">
                <p className="font-semibold mb-1">
                  {language === 'ar' ? 'توليد الذكاء الاصطناعي بطيء؟' : 'Slow AI generation?'}
                </p>
                <p>
                  {language === 'ar'
                    ? 'توليد الإجابات بالذكاء الاصطناعي سيكون بطيئًا جدًا على معظم أجهزة الكمبيوتر المحلية. للحصول على نتائج أسرع، أضف مفتاح OpenAI API الخاص بك أعلاه.'
                    : 'AI answer generation will be very slow on most local computers. For faster results (5-10 seconds instead of 2-5 minutes), add your OpenAI API key above.'
                  }
                </p>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline mt-1 inline-block"
                >
                  {language === 'ar' ? 'احصل على مفتاح API' : 'Get an API key'}
                </a>
              </div>
            </div>
          </div>

          {saved && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-lg text-sm">
              {text.savedMessage}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          {apiKey && (
            <Button
              variant="outline"
              onClick={handleClear}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {text.clearButton}
            </Button>
          )}
          <Button onClick={handleSave}>
            {text.saveButton}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Export the SettingsIcon for use in headers
export { SettingsIcon };
