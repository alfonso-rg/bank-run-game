// stores/languageStore.ts - Zustand store for language management

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type Language, getTranslations, type Translations } from '../i18n';

interface LanguageStore {
  // Current language
  language: Language;

  // Translations object
  t: Translations;

  // Actions
  setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      language: 'es',
      t: getTranslations('es'),

      setLanguage: (lang: Language) => {
        set({
          language: lang,
          t: getTranslations(lang),
        });
      },
    }),
    {
      name: 'bank-run-language',
      partialize: (state) => ({ language: state.language }),
      onRehydrateStorage: () => (state) => {
        // After rehydration, update translations to match the stored language
        if (state) {
          state.t = getTranslations(state.language);
        }
      },
    }
  )
);

// Hook helper for using translations
export const useTranslation = () => {
  const { t, language, setLanguage } = useLanguageStore();
  return { t, language, setLanguage };
};
