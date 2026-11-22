"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { dictionaries, type Dictionary, type Lang } from "./dictionary";

const STORAGE_KEY = "theabka.lang";

type LanguageContextValue = {
  lang: Lang;
  t: Dictionary;
  setLang: (lang: Lang) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * Host-app language. Khmer is the default; the choice is kept in localStorage
 * so the root layout stays static (no cookies read on the server).
 * Guest invitation pages always render both languages and don't depend on this.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("km");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    // Sync from the browser after hydration; the server always renders Khmer.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "km" || saved === "en") setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(() => ({ lang, t: dictionaries[lang], setLang }), [lang, setLang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}

/**
 * Per-page copy kept next to the page: `useContent({ km: {...}, en: {...} })`.
 * Type `km` with `satisfies` against `en` so translations can't drift.
 */
export function useContent<T>(content: Record<Lang, T>): T {
  return content[useLanguage().lang];
}

export type { Lang, Dictionary };
