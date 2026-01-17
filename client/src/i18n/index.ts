// i18n/index.ts - Internationalization system

import { es, type Translations } from './es';
import { en } from './en';

export type Language = 'es' | 'en';

const translations: Record<Language, Translations> = {
  es,
  en,
};

export const getTranslations = (lang: Language): Translations => {
  return translations[lang] || translations.es;
};

export const LANGUAGES: { code: Language; name: string; nativeName: string }[] = [
  { code: 'es', name: 'Spanish', nativeName: 'Espanol' },
  { code: 'en', name: 'English', nativeName: 'English' },
];

export { es, en };
export type { Translations };
