'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ArabicLocaleRoute() {
  const router = useRouter();

  useEffect(() => {
    document.cookie = `NEXT_LOCALE=ar;path=/;max-age=31536000`;
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <p className="text-slate-600">...جاري التحويل إلى العربية</p>
    </div>
  );
}
