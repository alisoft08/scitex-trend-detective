// AI-assisted: Codex (OpenAI). Format estimates without changing the archived measurements.
export function numberFormat(language: "en" | "es") {
  const locale = language === "es" ? "es-ES" : "en-US";
  const unavailable = language === "es" ? "n/d" : "n/a";
  const fixed = (value: number, places: number) => value.toLocaleString(locale, {
    minimumFractionDigits: places, maximumFractionDigits: places, useGrouping: false,
  });
  const fmt = (value: number | null | undefined, digits = 3) => {
    if (value == null || !Number.isFinite(value)) return unavailable;
    const magnitude = Math.abs(value);
    if (magnitude >= 100) return value.toLocaleString(locale, { maximumFractionDigits: 0 });
    if (magnitude >= 1) return value.toLocaleString(locale, { maximumFractionDigits: 1 });
    if (value === 0) return "0";
    return value.toLocaleString(locale, { maximumSignificantDigits: digits, useGrouping: false });
  };
  const signed = (value: number | null | undefined, digits = 3) => {
    if (value == null || !Number.isFinite(value)) return unavailable;
    return (value > 0 ? "+" : value < 0 ? "−" : "") + fmt(Math.abs(value), digits);
  };
  const signedFixed = (value: number, places: number) =>
    (value > 0 ? "+" : value < 0 ? "−" : "") + fixed(Math.abs(value), places);
  const pfull = (p: number | null | undefined) => {
    if (p == null || !Number.isFinite(p)) return `p ${unavailable}`;
    if (p < 0.0001) return `p < ${fixed(0.0001, 4)}`;
    if (p < 0.001) return `p < ${fixed(0.001, 3)}`;
    return `p = ${fixed(p, 3)}`;
  };
  const pct = (fraction: number, places = 0) => `${fixed(fraction * 100, places)}${language === "es" ? " %" : "%"}`;
  return { fmt, fixed, signed, signedFixed, pfull, pct };
}

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
