import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import fr from '../i18n/fr.json';
import en from '../i18n/en.json';

const translations = { fr, en } as const;
type Language = keyof typeof translations;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getBrowserLanguage(): Language {
  const browserLang = navigator.language || (navigator as { languages?: string[] }).languages?.[0] || 'fr';
  return browserLang.startsWith('en') ? 'en' : 'fr';
}

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : undefined;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('askoo-language') as Language | null;
    return saved && (saved === 'fr' || saved === 'en') ? saved : getBrowserLanguage();
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('askoo-language', lang);
    document.documentElement.lang = lang;
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let value = getNestedValue(translations[language] as Record<string, unknown>, key);
    if (value === undefined) {
      value = getNestedValue(translations.fr as Record<string, unknown>, key);
    }
    if (value === undefined) return key;
    if (params) {
      return Object.entries(params).reduce(
        (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
        value
      );
    }
    return value;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
