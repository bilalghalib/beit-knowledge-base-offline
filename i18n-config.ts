export const locales = ['ar', 'en'] as const;
export const defaultLocale = 'ar';
export type Locale = (typeof locales)[number];
