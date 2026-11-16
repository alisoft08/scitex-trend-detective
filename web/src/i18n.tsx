// AI-assisted: Codex (OpenAI). Locale, translated copy and scientific number formatting.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { numberFormat } from "./format";

export type Language = "en" | "es";
export type Translation = readonly [english: string, spanish: string];
const storageKey = "oasis-paradox-language";

export const translate = (language: Language, english: string, spanish: string) => language === "es" ? spanish : english;

function makeLocale(language: Language, setLanguage: (language: Language) => void) {
  const t = (english: string, spanish: string) => translate(language, english, spanish);
  return { language, setLanguage, t, ...numberFormat(language) };
}

const LocaleContext = createContext<ReturnType<typeof makeLocale> | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      return localStorage.getItem(storageKey) === "es" ? "es" : "en";
    } catch {
      return "en";
    }
  });
  const locale = useMemo(() => makeLocale(language, setLanguage), [language]);
  useEffect(() => {
    document.documentElement.lang = language;
    document.querySelector('meta[name="description"]')?.setAttribute("content", locale.t(
      "Explore and reproduce water storage trends across eight aquifer regions with NASA data, study areas and statistical tests.",
      "Explora y reproduce tendencias del almacenamiento de agua en ocho regiones acuíferas con datos de NASA, áreas de estudio y pruebas estadísticas.",
    ));
    try { localStorage.setItem(storageKey, language); } catch { /* Storage is optional. */ }
  }, [language, locale]);
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const locale = useContext(LocaleContext);
  if (!locale) throw new Error("LocaleProvider is required.");
  return locale;
}
