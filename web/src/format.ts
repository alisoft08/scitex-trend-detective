// AI-assisted: Claude (Anthropic). Number and label formatting shared by the views.
import type { DataType, Verdict } from "./types";

export function fmt(x: number | null | undefined, digits = 3): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return "n/a";
  const a = Math.abs(x);
  if (a >= 100) return x.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (a >= 1) return x.toLocaleString("en-US", { maximumFractionDigits: 1 });
  if (a === 0) return "0";
  return x.toPrecision(digits).replace(/\.?0+$/, "");
}

export function signed(x: number | null | undefined, digits = 3): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return "n/a";
  return (x > 0 ? "+" : x < 0 ? "−" : "") + fmt(Math.abs(x), digits);
}

export function pval(p: number | null | undefined): string {
  if (p === null || p === undefined || !Number.isFinite(p)) return "n/a";
  if (p < 0.0001) return "< 0.0001";
  if (p < 0.001) return "< 0.001";
  return p.toFixed(3);
}

/** "p = 0.032" or "p < 0.001", ready to drop into a sentence. */
export function pfull(p: number | null | undefined): string {
  const v = pval(p);
  return v.startsWith("<") ? `p ${v}` : v === "n/a" ? "p n/a" : `p = ${v}`;
}

export const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`;

export const VERDICT_TEXT: Record<Verdict, string> = {
  confirmed: "Confirmed trend",
  likely: "Likely trend",
  inconclusive: "Inconclusive",
  insufficient_data: "Insufficient data",
};

export const DATA_TYPE_TEXT: Record<DataType, string> = {
  observed: "Observed",
  modeled: "Modeled",
  estimated: "Estimated",
  classified: "Classified",
};
