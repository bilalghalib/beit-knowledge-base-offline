import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, locales, type Locale } from '../i18n-config';

export { locales };
export type { Locale };

export default getRequestConfig(async () => {
  // Read locale from cookie, default to Arabic
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE');
  const locale: Locale = (localeCookie?.value === 'en' || localeCookie?.value === 'ar')
    ? localeCookie.value
    : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
