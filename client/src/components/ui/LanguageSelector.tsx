// components/ui/LanguageSelector.tsx - Language selector component

import React from 'react';
import { useTranslation } from '../../stores/languageStore';
import { LANGUAGES, type Language } from '../../i18n';

interface LanguageSelectorProps {
  variant?: 'default' | 'compact' | 'flags';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'default',
  className = '',
}) => {
  const { language, setLanguage, t } = useTranslation();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as Language);
  };

  if (variant === 'flags') {
    return (
      <div className={`flex gap-2 ${className}`}>
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              language === lang.code
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title={lang.name}
          >
            {lang.code === 'es' ? 'ES' : 'EN'}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <select
        value={language}
        onChange={handleChange}
        className={`px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName}
          </option>
        ))}
      </select>
    );
  }

  // Default variant with label
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className="text-sm text-gray-600">{t.languageSelector.label}:</label>
      <select
        value={language}
        onChange={handleChange}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName}
          </option>
        ))}
      </select>
    </div>
  );
};
