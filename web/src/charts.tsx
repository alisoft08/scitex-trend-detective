// AI-assisted: Claude (Anthropic). Hand-rolled SVG charts; colors come from CSS theme tokens.
import { useState } from "react";
import type { SeriesPoint, Trend, Window } from "./types";
import type { HoveredPoint } from "./chat-contract";
import { useLocale } from "./i18n";
import { missingValueConnections } from "./chart-gaps";

function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  const step0 = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? 10 * mag;
  const start = Math.ceil(min / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max + 1e-9; v += step) out.push(Math.round(v / step) * step);
  return out;
}

function pathFrom(points: [number, number | null][]): string {
  let d = "";
  let pen = false;
  for (const [x, y] of points) {
    if (y === null || !Number.isFinite(y)) { pen = false; continue; }
    d += `${pen ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    pen = true;
  }
  return d;
}

const W = 760;
const monthFormats = {
  en: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
  es: new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" }),
};

/* ---------------------------------------------------------------- case trend chart */
export function TrendChart(props: {
  series: SeriesPoint[];
  trend: Trend;
  mode: "anomaly" | "value";
  tone: "green" | "water" | "climate" | "heat";
  units: string;
  height?: number;
  simple?: boolean;
  reference?: SeriesPoint[];
  referenceLabel?: string;
  window?: Window;
  showTrendLabel?: boolean;
  connectGaps?: boolean;
  onInspect?: (point: Omit<HoveredPoint, "chart">) => void;
}) {
  const { t, fmt, language, signed } = useLocale();
  const { series, trend, mode, tone, units, simple, reference, referenceLabel, window, onInspect, showTrendLabel, connectGaps = false } = props;
  const H = props.height ?? 300;
  const m = { l: 58, r: 14, t: 14, b: 30 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const n = series.length;
  const T = (n - 1) / 12;
  const [hover, setHover] = useState<number | null>(null);

  const ys = series.map((p) => (mode === "anomaly" ? p.anomaly : p.value));
  const aligned = reference && new Map(reference.map((p) => [p.date, mode === "anomaly" ? p.anomaly : p.value]));
  const comparison = aligned && series.map((p) => aligned.get(p.date) ?? null);
  const firstYear = Number(series[0]?.date.slice(0, 4) ?? 2004);
  const lastYear = Number(series[n - 1]?.date.slice(0, 4) ?? firstYear);
  const trendStart = window ? Math.max(0, window.start - firstYear) : 0;
  const trendEnd = window ? Math.min(T, window.end - firstYear + 11 / 12) : T;
  const selectedSlope = window ? window.sen_per_decade : trend.sen_per_decade;
  const slope = (selectedSlope ?? 0) / 10;
  // The period slope is precomputed in Python. Only locate that existing fit
  // on the anomaly chart using the same median-residual intercept convention.
  const offsets = window ? series.flatMap((point, index) => {
    const time = index / 12;
    return time >= trendStart && time <= trendEnd && point.valid && point.anomaly !== null && Number.isFinite(point.anomaly)
      ? [point.anomaly - slope * time] : [];
  }).sort((a, b) => a - b) : [];
  const middle = Math.floor(offsets.length / 2);
  const icpt = window ? offsets.length ? offsets.length % 2 ? offsets[middle] : (offsets[middle - 1] + offsets[middle]) / 2 : null : trend.intercept;
  const hasTrend = selectedSlope !== null && Number.isFinite(selectedSlope) && icpt !== null && Number.isFinite(icpt) && trendEnd >= trendStart;
  const fitStart = icpt === null ? 0 : icpt + slope * trendStart;
  const fitEnd = icpt === null ? 0 : icpt + slope * trendEnd;
  const finite = [...ys, ...(comparison ?? [])].filter((v): v is number => v !== null && Number.isFinite(v));
  let ymin = finite.length ? Math.min(...finite) : -1;
  let ymax = finite.length ? Math.max(...finite) : 1;
  if (mode === "anomaly") {
    ymin = Math.min(ymin, ...(hasTrend ? [fitStart, fitEnd] : []), 0);
    ymax = Math.max(ymax, ...(hasTrend ? [fitStart, fitEnd] : []), 0);
  }
  const pad = (ymax - ymin) * 0.06 || 1;
  ymin -= pad; ymax += pad;
  const x = (t: number) => m.l + (t / T) * iw;
  const y = (v: number) => m.t + (1 - (v - ymin) / (ymax - ymin)) * ih;
  const yt = niceTicks(ymin, ymax, simple ? 3 : 5);
  const years = [2004, 2008, 2012, 2016, 2020, 2024];

  const gaps: [number, number][] = [];
  let start: number | null = null;
  series.forEach((p, i) => {
    if (!p.valid && start === null) start = i;
    if (p.valid && start !== null) { gaps.push([start, i - 1]); start = null; }
  });
  if (start !== null) gaps.push([start, n - 1]);

  const monthly = pathFrom(ys.map((v, i) => [x(i / 12), v === null ? null : y(v)]));
  const otherLine = comparison && pathFrom(comparison.map((v, i) => [x(i / 12), v === null ? null : y(v)]));
  const connections = connectGaps ? missingValueConnections(ys) : [];
  const referenceConnections = connectGaps && comparison ? missingValueConnections(comparison) : [];
  // These are separate SVG strokes between existing observations. Missing
  // months stay null in the series, hover readouts and statistical inputs.
  const bridgePath = (values: (number | null)[], segments: [number, number][]) => segments.map(([from, to]) =>
    `M${x(from / 12).toFixed(1)},${y(values[from]!).toFixed(1)}L${x(to / 12).toFixed(1)},${y(values[to]!).toFixed(1)}`).join("");
  const trendPeriod = `${window?.start ?? firstYear}–${window?.end ?? lastYear}`;
  const trendValue = hasTrend ? `${signed(selectedSlope)} ${units}/${t("decade", "década")}` : t("Insufficient data", "Datos insuficientes");
  const labelWidth = Math.min(iw - 12, Math.max(180, trendValue.length * 7.4 + 22));
  const labelHeight = 46;
  const endX = x(trendEnd), endY = y(fitEnd);
  const labelX = Math.max(m.l + 6, Math.min(W - m.r - labelWidth, endX - labelWidth + 10));
  const above = endY - labelHeight - 12 >= m.t + 4;
  const labelY = hasTrend ? Math.max(m.t + 4, Math.min(m.t + ih - labelHeight - 4, above ? endY - labelHeight - 12 : endY + 12)) : m.t + 18;

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - m.l) / iw) * T * 12);
    const point = series[i];
    setHover(point ? i : null);
    const value = ys[i];
    if (point && value != null && onInspect) {
      onInspect({ date: point.date, value, unit: units, referenceValue: comparison?.[i] ?? undefined });
    }
  }
  const hp = hover !== null ? series[hover] : null;
  const inspectedMonth = hp && monthFormats[language].format(new Date(`${hp.date}-01T00:00:00Z`));
  const hv = hover !== null ? ys[hover] : null;
  const rv = hover !== null ? comparison?.[hover] : null;

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={comparison ? t("Monthly values for the study and reference areas from 2004 to 2024", "Valores mensuales del área de estudio y de referencia de 2004 a 2024") : mode === "anomaly"
        ? t(`Monthly anomalies. Sen trend ${trendPeriod}: ${trendValue}.`, `Anomalías mensuales. Tendencia de Sen ${trendPeriod}: ${trendValue}.`)
        : t("Monthly original values from 2004 to 2024", "Valores originales mensuales de 2004 a 2024")}
      onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      {(connections.length > 0 || referenceConnections.length > 0) && <desc>{t(
        "Connecting segments visually join observations across missing months. They are not observations and are not used in the statistical analysis.",
        "Los segmentos de conexión unen visualmente observaciones separadas por meses sin datos. No son observaciones ni se usan en el análisis estadístico.",
      )}</desc>}
      {window && <rect className="window-highlight" x={x(trendStart)} y={m.t} width={x(trendEnd) - x(trendStart)} height={ih} />}
      {gaps.map(([a, b]) => (
        <rect key={a} className="gap" x={x(a / 12)} y={m.t} width={Math.max(2, x(b / 12) - x(a / 12))} height={ih} />
      ))}
      {yt.map((v) => (
        <g key={v}>
          <line className="gridline" x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} />
          <text x={m.l - 8} y={y(v) + 4} textAnchor="end">{fmt(v)}</text>
        </g>
      ))}
      {mode === "anomaly" && <line className="zero" x1={m.l} x2={W - m.r} y1={y(0)} y2={y(0)} />}
      {years.map((yr) => (
        <text key={yr} x={x(yr - 2004)} y={H - 8} textAnchor="middle">{yr}</text>
      ))}
      <text x={m.l - 8} y={m.t - 2} textAnchor="end" className="label-strong">{units}</text>
      <path className={`series ${tone}`} d={monthly} />
      {otherLine && <path className="series reference-line" d={otherLine} />}
      {connections.length > 0 && <path className={`series ${tone} gap-bridge`} d={bridgePath(ys, connections)} pointerEvents="none" />}
      {comparison && referenceConnections.length > 0 && <path className="series reference-line gap-bridge" d={bridgePath(comparison, referenceConnections)} pointerEvents="none" />}
      {mode === "anomaly" && hasTrend && (
        <>
          <line className="senline" x1={x(trendStart)} y1={y(fitStart)} x2={endX} y2={endY} />
        </>
      )}
      {mode === "anomaly" && showTrendLabel && <g className="trend-data-label" pointerEvents="none">
        {hasTrend && <>
          <line className="trend-label-leader" x1={endX} y1={endY} x2={Math.max(labelX + 12, Math.min(labelX + labelWidth - 12, endX))} y2={above ? labelY + labelHeight : labelY} />
          <circle cx={endX} cy={endY} r={3.5} className="trend-label-point" />
        </>}
        <rect x={labelX} y={labelY} width={labelWidth} height={labelHeight} rx={7} />
        <text className="trend-label-period" x={labelX + 10} y={labelY + 16}>{trendPeriod} · {t("Sen trend", "Tendencia de Sen")}</text>
        <text className="trend-label-value" x={labelX + 10} y={labelY + 35}>{trendValue}</text>
      </g>}
      {hp && hv !== null && (
        <g>
          <line className="axis" x1={x(hover! / 12)} x2={x(hover! / 12)} y1={m.t} y2={m.t + ih} />
          <circle cx={x(hover! / 12)} cy={y(hv)} r={3.5} fill="var(--ink)" />
          <text x={W - m.r} y={m.t + 12} textAnchor="end" className="label-strong">
            {inspectedMonth} · {fmt(hv)} {units}{rv != null && ` · ${referenceLabel ?? t("reference", "referencia")} ${fmt(rv)}`}
          </text>
        </g>
      )}
      {hp && hv === null && (
        <text x={W - m.r} y={m.t + 12} textAnchor="end" className="label-strong">{inspectedMonth} · {t("no data", "sin datos")}</text>
      )}
    </svg>
  );
}
