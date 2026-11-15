// AI-assisted: Claude (Anthropic). "Checked against NASA's own tools": our series vs. the same series rebuilt with
// NASA AppEEARS and the GES DISC archive. All numbers come from validation/compare.py.
import { useJSON } from "./data";
import { fmt, signed } from "./format";

interface Pair {
  id: string; label: string; units: string; tool: string; tool_url: string; how: string;
  n: number; pearson_r: number; bias: number; rmse: number; rel_bias_pct: number | null;
  mean_ours: number; mean_nasa: number; sen_ours_per_decade: number; sen_nasa_per_decade: number;
  series: { date: string; ours: number; nasa: number }[];
}

function Overlay({ p }: { p: Pair }) {
  const W = 420, H = 120, m = { l: 4, r: 4, t: 6, b: 16 };
  const t = (d: string) => Number(d.slice(0, 4)) + (Number(d.slice(5, 7)) - 1) / 12;
  const xs = p.series.map((s) => t(s.date));
  const vals = p.series.flatMap((s) => [s.ours, s.nasa]);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const x = (v: number) => m.l + ((v - 2004) / 21) * (W - m.l - m.r);
  const y = (v: number) => m.t + (1 - (v - lo) / (hi - lo || 1)) * (H - m.t - m.b);
  const sparse = p.series.length < 100;
  const path = (k: "ours" | "nasa") => p.series.map((s, i) => `${i ? "L" : "M"}${x(xs[i]).toFixed(1)},${y(s[k]).toFixed(1)}`).join("");
  return (
    <svg className="val-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${p.label}: our series and NASA's, ${p.n} months`}>
      {!sparse && <path d={path("nasa")} className="v-nasa" />}
      {!sparse && <path d={path("ours")} className="v-ours" />}
      {sparse && p.series.map((s, i) => (
        <g key={s.date}>
          <line x1={x(xs[i])} x2={x(xs[i])} y1={y(s.ours)} y2={y(s.nasa)} className="v-link" />
          <circle cx={x(xs[i])} cy={y(s.nasa)} r={3.4} className="v-nasa-dot" />
          <circle cx={x(xs[i])} cy={y(s.ours)} r={1.8} className="v-ours-dot" />
        </g>
      ))}
      {[2004, 2014, 2024].map((yr) => <text key={yr} x={x(yr)} y={H - 3} textAnchor={yr === 2004 ? "start" : yr === 2024 ? "end" : "middle"}>{yr}</text>)}
    </svg>
  );
}

export function Validation({ caseId }: { caseId: string }) {
  const { data, error } = useJSON<{ pairs: Pair[] }>("validation.json");
  const ids: Record<string, string> = { Z2_ndvi: "ndvi_Z2", Z4_precip: "precip_Z4", ZW_gws: "gws_ZW" };
  if (!ids[caseId]) return null;
  if (error) return <p className="error" role="alert">Extraction comparison unavailable.</p>;
  const pair = data?.pairs.find((p) => p.id === ids[caseId]);
  if (!pair) return null;
  return <details className="research-details">
    <summary>Compare the two extraction routes</summary>
    <p>Oasis Paradox and {pair.tool} extracted the same product. {pair.how}</p>
    <Overlay p={pair} />
    <div className="val-legend small"><i className="lg-ours" />Oasis Paradox <i className="lg-nasa" /><a href={pair.tool_url} target="_blank" rel="noreferrer">{pair.tool}</a></div>
    <dl className="research-facts">
      <div><dt>Months compared</dt><dd>{pair.n}{caseId === "ZW_gws" ? " (January and July samples)" : ""}</dd></div>
      <div><dt>Pearson correlation</dt><dd>{pair.pearson_r === 1 ? "~1 (rounded)" : pair.pearson_r.toFixed(4)}</dd></div>
      <div><dt>Mean difference (archive minus Oasis)</dt><dd>{signed(pair.bias)} {pair.units}</dd></div>
      <div><dt>Root mean square difference</dt><dd>{fmt(pair.rmse)} {pair.units}</dd></div>
      <div><dt>Slope of the original series</dt><dd>{signed(pair.sen_ours_per_decade)} vs {signed(pair.sen_nasa_per_decade)} {pair.units}/decade</dd></div>
    </dl>
    <p className="small muted">This comparison measures extraction agreement. The case verdict uses the separate, season-adjusted analysis.</p>
  </details>;
}
