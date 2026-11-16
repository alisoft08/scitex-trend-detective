// AI-assisted: Claude (Anthropic). Languages of the Explorer field lab. English is the default; Spanish, Portuguese and
// French cover the field lab only (translations drafted with AI, reviewed by the team). The rest of the app is in English.
import { useEffect, useState } from "react";

export type Lang = "en" | "es" | "pt" | "fr";
export const LANGS: { id: Lang; label: string; short: string }[] = [
  { id: "en", label: "English", short: "EN" },
  { id: "es", label: "Español", short: "ES" },
  { id: "pt", label: "Português", short: "PT" },
  { id: "fr", label: "Français", short: "FR" },
];
export const NUM_LOCALE: Record<Lang, string> = { en: "en-US", es: "es-PE", pt: "pt-BR", fr: "fr-FR" };

const KEY = "oasis-paradox-lang";
export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>(() => {
    try { const v = localStorage.getItem(KEY); if (v === "en" || v === "es" || v === "pt" || v === "fr") return v; } catch { /* blocked */ }
    return "en";
  });
  useEffect(() => { try { localStorage.setItem(KEY, lang); } catch { /* ignore */ } }, [lang]);
  return [lang, setLang];
}

/** Replace {name} placeholders. */
export const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
