"use client";
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { translations, type TranslationKey } from "./translations";
import { isAppLanguage, SUPPORTED_LANGUAGES, type AppLanguage, type TranslationParams } from "./types";
const STORAGE_KEY = "smart-event-pass:app-language";
type Value = { language: AppLanguage; setLanguage: (value: AppLanguage) => void; t: (key: TranslationKey, params?: TranslationParams) => string; supportedLanguages: readonly AppLanguage[]; locale: "sw-TZ" | "en-TZ" };
export const LanguageContext = createContext<Value | null>(null);
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, updateLanguage] = useState<AppLanguage>("sw");
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!isAppLanguage(saved)) return;
    const hydrationUpdate = window.setTimeout(() => updateLanguage(saved), 0);
    return () => window.clearTimeout(hydrationUpdate);
  }, []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const setLanguage = useCallback((next: AppLanguage) => { updateLanguage(next); localStorage.setItem(STORAGE_KEY, next); }, []);
  const t = useCallback((key: TranslationKey, params?: TranslationParams) => { let value: string = translations[language][key]; if (params) for (const [name, replacement] of Object.entries(params)) value = value.replaceAll(`{${name}}`, String(replacement)); return value; }, [language]);
  const value = useMemo<Value>(() => ({ language, setLanguage, t, supportedLanguages: SUPPORTED_LANGUAGES, locale: language === "sw" ? "sw-TZ" : "en-TZ" }), [language, setLanguage, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
