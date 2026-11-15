// AI-assisted: Claude (Anthropic). Reader levels: the same evidence, told at three depths.
import { useEffect, useState } from "react";

export type Level = "explorer" | "analyst" | "expert";

export const LEVELS: { id: Level; name: string; promise: string }[] = [
  { id: "explorer", name: "Explorer", promise: "Read the evidence in plain language." },
  { id: "analyst", name: "Analyst", promise: "Compare cases, intervals and tests." },
  { id: "expert", name: "Expert", promise: "Inspect the model and reproduce the result." },
];

const KEY = "oasis-paradox-level";

export function useLevel(): [Level, (l: Level) => void] {
  const [level, setLevel] = useState<Level>(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v === "explorer" || v === "analyst" || v === "expert") return v;
    } catch { /* storage blocked: fall back to the default */ }
    return "explorer";
  });
  useEffect(() => {
    try { localStorage.setItem(KEY, level); } catch { /* ignore */ }
  }, [level]);
  return [level, setLevel];
}
