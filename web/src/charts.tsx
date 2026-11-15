// AI-assisted: Claude (Anthropic). Hand-rolled SVG charts; colors come from CSS theme tokens.
import { useMemo, useState } from "react";
import type { SeriesPoint, Simulation, Trend, Witnesses } from "./types";
import { fmt, pct } from "./format";
import { Tex } from "./Tex";

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
}) {
  const { series, trend, mode, tone, units } = props;
  const H = props.height ?? 300;
  const m = { l: 58, r: 14, t: 14, b: 30 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const n = series.length;
  const T = (n - 1) / 12;
  const [hover, setHover] = useState<number | null>(null);

  const ys = series.map((p) => (mode === "anomaly" ? p.anomaly : p.value));
  const annual = useMemo(() => {
    const out: { t: number; v: number | null }[] = [];
    for (let i = 0; i < n; i += 12) {
      const chunk = ys.slice(i, i + 12).filter((v): v is number => v !== null && Number.isFinite(v));
      out.push({ t: i / 12 + 5.5 / 12, v: chunk.length >= 6 ? chunk.reduce((a, b) => a + b, 0) / chunk.length : null });
    }
    return out;
  }, [series, mode]);

  const slope = (trend.sen_per_decade ?? 0) / 10;
  const icpt = trend.intercept ?? 0;
  const [lo, hi] = trend.sen_ci95_block_bootstrap.map((v) => (v ?? 0) / 10);
  const tc = T / 2;
  const yc = icpt + slope * tc;
  const bandPts = (s: number) => [yc + s * (0 - tc), yc + s * (T - tc)];

  const finite = ys.filter((v): v is number => v !== null && Number.isFinite(v));
  let ymin = Math.min(...finite);
  let ymax = Math.max(...finite);
  if (mode === "anomaly") {
    const b1 = bandPts(lo), b2 = bandPts(hi);
    ymin = Math.min(ymin, ...b1, ...b2, 0);
    ymax = Math.max(ymax, ...b1, ...b2, 0);
  }
  const pad = (ymax - ymin) * 0.06 || 1;
  ymin -= pad; ymax += pad;
  const x = (t: number) => m.l + (t / T) * iw;
  const y = (v: number) => m.t + (1 - (v - ymin) / (ymax - ymin)) * ih;
  const yt = niceTicks(ymin, ymax, 5);
  const years = [2004, 2008, 2012, 2016, 2020, 2024];

  const gaps: [number, number][] = [];
  let start: number | null = null;
  series.forEach((p, i) => {
    if (!p.valid && start === null) start = i;
    if (p.valid && start !== null) { gaps.push([start, i - 1]); start = null; }
  });
  if (start !== null) gaps.push([start, n - 1]);

  const monthly = pathFrom(ys.map((v, i) => [x(i / 12), v === null ? null : y(v)]));
  const ann = pathFrom(annual.map((a) => [x(a.t), a.v === null ? null : y(a.v)]));
  const [bl0, bl1] = bandPts(lo);
  const [bh0, bh1] = bandPts(hi);

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - m.l) / iw) * T * 12);
    setHover(i >= 0 && i < n ? i : null);
  }
  const hp = hover !== null ? series[hover] : null;
  const hv = hover !== null ? ys[hover] : null;

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`Monthly ${mode === "anomaly" ? "anomalies" : "values"} from 2004 to 2024 with the Sen trend line`}
      onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
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
      {mode === "value" && <path className={`annual ${tone}`} d={ann} />}
      {mode === "anomaly" && (
        <>
          <polygon className="band" points={`${x(0)},${y(bl0)} ${x(T)},${y(bl1)} ${x(T)},${y(bh1)} ${x(0)},${y(bh0)}`} />
          <line className="senline" x1={x(0)} y1={y(icpt)} x2={x(T)} y2={y(icpt + slope * T)} />
        </>
      )}
      {hp && hv !== null && (
        <g>
          <line className="axis" x1={x(hover! / 12)} x2={x(hover! / 12)} y1={m.t} y2={m.t + ih} />
          <circle cx={x(hover! / 12)} cy={y(hv)} r={3.5} fill="var(--ink)" />
          <text x={W - m.r} y={m.t + 12} textAnchor="end" className="label-strong">
            {hp.date}: {fmt(hv)} {units}
          </text>
        </g>
      )}
      {hp && hv === null && (
        <text x={W - m.r} y={m.t + 12} textAnchor="end" className="label-strong">{hp.date}: no data</text>
      )}
    </svg>
  );
}

/* ---------------------------------------------------------------- witnesses */
export function WitnessChart({ data }: { data: Witnesses }) {
  const H = 300;
  const m = { l: 40, r: 16, t: 16, b: 30 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const ymin = -2.5, ymax = 2.5;
  const x = (yr: number) => m.l + ((yr - 2004) / 20) * iw;
  const y = (v: number) => m.t + (1 - (v - ymin) / (ymax - ymin)) * ih;
  const tone = ["green", "water", "water"];
  const dash = [undefined, undefined, "6 4"];
  return (
    <>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Annual standardized anomalies of the three witnesses">
        {[-2, -1, 0, 1, 2].map((v) => (
          <g key={v}>
            <line className={v === 0 ? "zero" : "gridline"} x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} />
            <text x={m.l - 8} y={y(v) + 4} textAnchor="end">{v > 0 ? `+${v}` : v}</text>
          </g>
        ))}
        {[2004, 2008, 2012, 2016, 2020, 2024].map((yr) => (
          <text key={yr} x={x(yr)} y={H - 8} textAnchor="middle">{yr}</text>
        ))}
        <text x={m.l - 8} y={m.t - 4} textAnchor="end" className="label-strong">SD</text>
        {data.series.map((s, k) => (
          <path key={s.id} className={`annual ${tone[k]}`} strokeDasharray={dash[k]}
            d={pathFrom(s.values.map((v, i) => [x(data.years[i]), v === null ? null : y(v)]))} />
        ))}
      </svg>
      <div className="legend">
        <span><i style={{ background: "var(--green)" }} />{data.series[0]?.label}</span>
        <span><i style={{ background: "var(--water)" }} />{data.series[1]?.label}</span>
        <span><i style={{ background: "repeating-linear-gradient(90deg, var(--water) 0 6px, transparent 6px 10px)" }} />{data.series[2]?.label}</span>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- Monte Carlo dot plot */
export function SimulationChart({ sim }: { sim: Simulation }) {
  const rowH = 38;
  const m = { l: 300, r: 24, t: 34, b: 34 };
  const H = m.t + sim.tests.length * rowH + m.b;
  const iw = W - m.l - m.r;
  const xmax = 0.7;
  const x = (v: number) => m.l + (Math.min(v, xmax) / xmax) * iw;
  const phis = sim.false_positive.map((f) => f.phi);
  const style = (k: number) =>
    k === phis.length - 1
      ? { r: 7, fill: "var(--drop)", stroke: "none" }
      : k === 1 ? { r: 5.5, fill: "var(--surface)", stroke: "var(--drop)" } : { r: 4, fill: "var(--muted)", stroke: "none" };
  return (
    <div className="scroll-x">
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 560 }} role="img"
        aria-label="How often each test reports a trend that does not exist">
        {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7].map((v) => (
          <g key={v}>
            <line className="gridline" x1={x(v)} x2={x(v)} y1={m.t - 6} y2={H - m.b + 4} />
            <text x={x(v)} y={H - m.b + 20} textAnchor="middle">{pct(v)}</text>
          </g>
        ))}
        <line className="zero" x1={x(0.05)} x2={x(0.05)} y1={m.t - 14} y2={H - m.b + 4} />
        <text x={x(0.05) + 5} y={m.t - 16} className="label-strong">5% = what an honest test should give</text>
        {sim.tests.map((t, i) => {
          const cy = m.t + i * rowH + rowH / 2;
          const vals = sim.false_positive.map((f) => f[t.id]);
          const ours = t.id === "consensus";
          return (
            <g key={t.id}>
              <text x={m.l - 14} y={cy + 4} textAnchor="end" className={ours ? "label-strong" : undefined}
                style={{ fontFamily: "var(--font-body)", fontSize: 12.5 }}>{t.label}</text>
              <line className="gridline" x1={x(Math.min(...vals))} x2={x(Math.max(...vals))} y1={cy} y2={cy} strokeWidth={2} />
              {vals.map((v, k) => {
                const s = style(k);
                return <circle key={k} cx={x(v)} cy={cy} r={s.r} fill={s.fill} stroke={s.stroke} strokeWidth={1.5} />;
              })}
              <text x={x(vals[vals.length - 1]) + 11} y={cy + 4} className="label-strong">{pct(vals[vals.length - 1])}</text>
            </g>
          );
        })}
      </svg>
      <div className="legend">
        <span><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="var(--muted)" /></svg> no memory <Tex>{"\\phi = 0"}</Tex></span>
        <span><svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="5.5" fill="var(--surface)" stroke="var(--drop)" strokeWidth="1.5" /></svg> some memory <Tex>{"\\phi = 0.5"}</Tex></span>
        <span><svg width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="var(--drop)" /></svg> groundwater-like memory <Tex>{"\\phi = 0.9"}</Tex></span>
      </div>
    </div>
  );
}
