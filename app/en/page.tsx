'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EnglishLocaleRoute() {
  const router = useRouter();

  useEffect(() => {
    document.cookie = `NEXT_LOCALE=en;path=/;max-age=31536000`;
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <p className="text-slate-600">Switching to English…</p>
    </div>
  );
}
