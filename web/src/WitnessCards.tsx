// AI-assisted: Claude (Anthropic). Hero "exhibit" cards for the three witnesses, each with a small view of its real data.
import type { ReactNode } from "react";
import { useJSON } from "./data";
import { pct, signed } from "./format";
import type { GeoFeature, Manifest, WellProps, Witnesses } from "./types";

const ICONS: Record<string, ReactNode> = {
  green: (
    // leaf
    <path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14Zm0 0 7-7" />
  ),
  water: (
    // satellite over a drop
    <>
      <rect x="9" y="3" width="6" height="5" rx="1" transform="rotate(45 12 5.5)" />
      <path d="M4.5 4.5 7 7M19.5 6.5 17 9" />
      <path d="M12 12.5c2.2 2.6 3.3 4.4 3.3 5.6a3.3 3.3 0 0 1-6.6 0c0-1.2 1.1-3 3.3-5.6Z" />
    </>
  ),
  drop: (
    // well shaft with falling level
    <>
      <path d="M6 4v16h12V4" />
      <path d="M6 12.5h12" strokeDasharray="2 2" />
      <path d="M6 16h12" />
      <path d="M12 6.5v4m-1.8-1.8L12 10.5l1.8-1.8" />
    </>
  ),
};

function Icon({ kind }: { kind: string }) {
  return (
    <span className="wc-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round">{ICONS[kind]}</svg>
    </span>
  );
}

/** Annual standardized series as a small area line; shape only, the number above carries the magnitude. */
function Spark({ values, years, id }: { values: (number | null)[]; years: number[]; id: string }) {
  const W = 240, H = 56, P = 3;
  const pts = values.map((v, i) => (v == null ? null : [i, v] as const)).filter(Boolean) as [number, number][];
  if (pts.length < 2) return null;
  const ys = pts.map((p) => p[1]);
  const lo = Math.min(...ys), hi = Math.max(...ys);
  const x = (i: number) => P + (i / (values.length - 1)) * (W - 2 * P);
  const y = (v: number) => H - P - ((v - lo) / (hi - lo || 1)) * (H - 2 * P);
  const line = pts.map(([i, v], k) => `${k ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const area = `${line}L${x(pts[pts.length - 1][0]).toFixed(1)},${H}L${x(pts[0][0]).toFixed(1)},${H}Z`;
  const last = pts[pts.length - 1];
  const gid = `wc-grad-${id}`;
  return (
    <figure className="wc-viz">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
        aria-label={`Yearly values ${years[0]} to ${years[years.length - 1]}`}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke="currentColor" strokeWidth="1.8" vectorEffect="non-scaling-stroke"
          strokeLinejoin="round" />
      </svg>
      <span className="wc-dot" style={{ left: `${(x(last[0]) / W) * 100}%`, top: `${(y(last[1]) / H) * 100}%` }} />
      <figcaption><span>{years[0]}</span><span>{years[years.length - 1]}</span></figcaption>
    </figure>
  );
}

/** Every JUASVI well as one bar, sorted from steepest drop to steepest rise. */
function WellStrip() {
  const { data } = useJSON<{ features: GeoFeature<WellProps>[] }>("wells.geojson");
  if (!data) return <figure className="wc-viz" />;
  const rates = data.features.map((f) => f.properties.rate_m_per_yr).sort((a, b) => a - b);
  const W = 240, H = 56, mid = 28;
  const max = Math.max(...rates.map(Math.abs)) || 1;
  const bw = W / rates.length;
  return (
    <figure className="wc-viz">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
        aria-label={`${rates.length} wells sorted by water-table change, falling on the left`}>
        <line x1="0" x2={W} y1={mid} y2={mid} className="wc-zero" vectorEffect="non-scaling-stroke" />
        {rates.map((r, i) => {
          const h = Math.max(1, (Math.abs(r) / max) * (mid - 2));
          return <rect key={i} x={i * bw + 0.3} width={Math.max(0.6, bw - 0.6)} y={r < 0 ? mid : mid - h} height={h}
            className={r < 0 ? "wc-fall" : "wc-rise"} />;
        })}
      </svg>
      <figcaption><span>Falling</span><span>Rising</span></figcaption>
    </figure>
  );
}

interface CardProps {
  tone: "green" | "water" | "drop";
  exhibit: string;
  title: string;
  verdict: ReactNode;
  value: string;
  unit: string;
  says: ReactNode;
  viz: ReactNode;
  source: string;
  action: string;
  onAction: () => void;
}

function Card(p: CardProps) {
  return (
    <article className={`wc wc-${p.tone}`}>
      <header className="wc-head">
        <Icon kind={p.tone} />
        <div className="wc-title">
          <div className="wc-kicker"><span className="eyebrow">{p.exhibit}</span>{p.verdict}</div>
          <h3>{p.title}</h3>
        </div>
      </header>
      <div className="wc-figure">
        <span className="wc-value num">{p.value}</span>
        <span className="wc-unit">{p.unit}</span>
      </div>
      {p.viz}
      <p className="wc-says">{p.says}</p>
      <footer className="wc-foot">
        <span className="mono">{p.source}</span>
        <button className="wc-action" onClick={p.onAction}>{p.action}<span aria-hidden="true">→</span></button>
      </footer>
    </article>
  );
}

export function WitnessCards({ m, wit, goTo, toMap }: {
  m: Manifest; wit: Witnesses | null; goTo: (id: string) => void; toMap: () => void;
}) {
  const c = (id: string) => m.cases.find((k) => k.id === id)!;
  const green = c("Z2_ndvi");
  const grace = c("ZW_tws_grace");
  const gldas = c("ZW_gws");
  const series = (id: string) => wit?.series.find((s) => s.id === id);
  const spark = (id: string) => {
    const s = series(id);
    return s && wit ? <Spark values={s.values} years={wit.years} id={id} /> : <figure className="wc-viz" />;
  };
  return (
    <div className="witness-row">
      <Card tone="green" exhibit="Exhibit A" title="Greenness from space"
        verdict={<span className={`pill ${green.verdict}`}>{m.verdict_labels[green.verdict]}</span>}
        value={signed(green.sen_per_decade)} unit="NDVI per decade"
        viz={spark("Z2_ndvi")}
        says="Villacurí's farmland keeps getting greener."
        source="MODIS MOD13Q1 · observed" action="Case file" onAction={() => goTo("Z2_ndvi")} />
      <Card tone="water" exhibit="Exhibit B" title="Water from space"
        verdict={<span className={`pill ${grace.verdict}`}>{m.verdict_labels[grace.verdict]}</span>}
        value={signed(grace.sen_per_decade)} unit="mm per decade"
        viz={spark("ZW_tws_grace")}
        says={<>GRACE sees water <em>rising</em> over a 300 km region; the GLDAS model is {m.verdict_labels[gldas.verdict].toLowerCase()}.</>}
        source="GRACE/GRACE-FO JPL · observed" action="Case file" onAction={() => goTo("ZW_tws_grace")} />
      <Card tone="drop" exhibit="Exhibit C" title="Wells in the field"
        verdict={<span className="pill inconclusive">Field data</span>}
        value={pct(m.wells.share_falling)} unit={`of ${m.wells.n} wells falling`}
        viz={<WellStrip />}
        says={<>Median change {signed(m.wells.median_rate_m_per_yr, 2)} m per year since 2010.</>}
        source="JUASVI 2010–2025 · measured" action="Map" onAction={toMap} />
    </div>
  );
}
