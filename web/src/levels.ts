// AI-assisted: Claude (Anthropic). Reader levels: the same evidence, told at three depths.
import { useEffect, useState } from "react";

export type Level = "explorer" | "analyst" | "expert";

export const LEVELS: { id: Level; name: string; who: string; promise: string }[] = [
  { id: "explorer", name: "Explorer", who: "School students", promise: "Plain words, a prediction game, one clear verdict." },
  { id: "analyst", name: "Analyst", who: "University students", promise: "Trend lines, ranges, and honest vs. classic tests." },
  { id: "expert", name: "Expert", who: "Scientists, agronomists, statisticians", promise: "Every test, control, formula and data source." },
];

const KEY = "oasis-paradox-level";

export function useLevel(): [Level, (l: Level) => void] {
  const [level, setLevel] = useState<Level>(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v === "explorer" || v === "analyst" || v === "expert") return v;
    } catch { /* storage blocked: fall back to the default */ }
    return "analyst";
  });
  useEffect(() => {
    try { localStorage.setItem(KEY, level); } catch { /* ignore */ }
  }, [level]);
  return [level, setLevel];
}

export const atLeast = (level: Level, min: Level) =>
  ["explorer", "analyst", "expert"].indexOf(level) >= ["explorer", "analyst", "expert"].indexOf(min);
