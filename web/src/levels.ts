// AI-assisted: Claude (Anthropic). Reader levels: the same evidence, told at three depths.
import { useEffect, useState } from "react";
import type { Translation } from "./i18n";

export type Level = "explorer" | "analyst" | "expert";

export const LEVELS: { id: Level; name: Translation; promise: Translation }[] = [
  { id: "explorer", name: ["Explorer", "Explorador"], promise: ["Read the evidence in plain language.", "Lee la evidencia en lenguaje sencillo."] },
  { id: "analyst", name: ["Analyst", "Analista"], promise: ["Compare cases, intervals and tests.", "Compara casos, intervalos y pruebas."] },
  { id: "expert", name: ["Expert", "Experto"], promise: ["Inspect the model and reproduce the result.", "Inspecciona el modelo y reproduce el resultado."] },
];

// Start existing browsers on the new default too: the old key stored Explorer automatically.
const KEY = "oasis-paradox-level-v2";

/** Team decision (15 Nov 2026): the app shows the Expert level only. Explorer and Analyst stay in the code, hidden;
 *  set EXPERT_ONLY to false to bring the level switch back. */
export const EXPERT_ONLY = true;

export function useLevel(): [Level, (l: Level) => void] {
  if (EXPERT_ONLY) return ["expert", () => undefined];
  return useStoredLevel();
}

function useStoredLevel(): [Level, (l: Level) => void] {
  const [level, setLevel] = useState<Level>(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v === "explorer" || v === "analyst" || v === "expert") return v;
    } catch { /* storage blocked: fall back to the default */ }
    return "expert";
  });
  useEffect(() => {
    try { localStorage.setItem(KEY, level); } catch { /* ignore */ }
  }, [level]);
  return [level, setLevel];
}
