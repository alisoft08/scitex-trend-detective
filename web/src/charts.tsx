// AI-assisted: Claude (Anthropic). Hand-rolled SVG charts; colors come from CSS theme tokens.
import { useState } from "react";
import type { SeriesPoint, Trend, Window } from "./types";
import type { HoveredPoint } from "./chat-contract";
import { useLocale } from "./i18n";

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
  window?: Window;
  onInspect?: (point: Omit<HoveredPoint, "chart">) => void;
}) {
  const { t, fmt } = useLocale();
  const { series, trend, mode, tone, units, simple, reference, window, onInspect } = props;
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
  const slope = (trend.sen_per_decade ?? 0) / 10;
  const icpt = trend.intercept ?? 0;
  const finite = [...ys, ...(comparison ?? [])].filter((v): v is number => v !== null && Number.isFinite(v));
  let ymin = finite.length ? Math.min(...finite) : -1;
  let ymax = finite.length ? Math.max(...finite) : 1;
  if (mode === "anomaly") {
    ymin = Math.min(ymin, icpt, icpt + slope * T, 0);
    ymax = Math.max(ymax, icpt, icpt + slope * T, 0);
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
  const hv = hover !== null ? ys[hover] : null;
  const rv = hover !== null ? comparison?.[hover] : null;

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={comparison ? t("Monthly field and desert values from 2004 to 2024", "Valores mensuales del campo y del desierto de 2004 a 2024") : mode === "anomaly" ? t("Monthly anomalies and full-period Sen trend from 2004 to 2024", "Anomalías mensuales y tendencia de Sen de 2004 a 2024") : t("Monthly original values from 2004 to 2024", "Valores originales mensuales de 2004 a 2024")}
      onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      {window && <rect className="window-highlight" x={x(window.start - 2004)} y={m.t} width={x(Math.min(window.end - 2004 + 11 / 12, T)) - x(window.start - 2004)} height={ih} />}
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
      {mode === "anomaly" && trend.sen_per_decade !== null && (
        <>
          <line className="senline" x1={x(0)} y1={y(icpt)} x2={x(T)} y2={y(icpt + slope * T)} />
        </>
      )}
      {hp && hv !== null && (
        <g>
          <line className="axis" x1={x(hover! / 12)} x2={x(hover! / 12)} y1={m.t} y2={m.t + ih} />
          <circle cx={x(hover! / 12)} cy={y(hv)} r={3.5} fill="var(--ink)" />
          <text x={W - m.r} y={m.t + 12} textAnchor="end" className="label-strong">
            {hp.date}: {fmt(hv)} {units}{rv !== undefined && rv !== null && ` · ${t("desert", "desierto")} ${fmt(rv)}`}
          </text>
        </g>
      )}
      {hp && hv === null && (
        <text x={W - m.r} y={m.t + 12} textAnchor="end" className="label-strong">{hp.date}: {t("no data", "sin datos")}</text>
      )}
    </svg>
  );
}
