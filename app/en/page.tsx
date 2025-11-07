'use client';

import { useState } from 'react';
import SearchInterfaceEN from '@/components/SearchInterfaceEN';
import SettingsPanel, { SettingsIcon } from '@/components/SettingsPanel';

export default function EnglishPage() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-xl font-bold text-white">
              B
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">
                BEIT Expert Insights
              </p>
              <p className="text-xs text-slate-500">
                Green Building Knowledge for Mosul Trainers
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
              title="Settings"
            >
              <SettingsIcon />
            </button>
            <a
              href="/ar"
              className="px-3 py-1.5 text-sm font-medium transition-colors rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              AR
            </a>
            <span className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-md">
              EN
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <SearchInterfaceEN />
      </main>

      <footer className="mt-16 border-t border-slate-200">
        <div className="mx-auto max-w-5xl px-6 py-6 text-center text-sm text-slate-500">
          © 2024-2025 BEIT Project (Building Energy Innovation Training). Green Building Training in Mosul, Iraq.
        </div>
      </footer>

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} language="en" />
    </div>
  );
}
