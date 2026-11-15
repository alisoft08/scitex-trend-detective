// AI-assisted: Claude (Anthropic). "Checked against NASA's own tools": our series vs. the same series rebuilt with
// NASA AppEEARS and the GES DISC archive. All numbers come from validation/compare.py.
import { useJSON } from "./data";
import { fmt, signed } from "./format";
import { Tex } from "./Tex";

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

export function Validation() {
  const { data } = useJSON<{ pairs: Pair[] }>("validation.json");
  if (!data || data.pairs.length === 0) return null;
  return (
    <div className="validation" id="validation">
      <h3 className="sub">Checked against NASA's own tools</h3>
      <p className="lede-2 val-lede">
        Our pipeline reads NASA data through Google Earth Engine. To be sure nothing was lost on the way, we rebuilt each
        series with the tools this challenge recommends and compared month by month.
      </p>
      <div className="val-grid">
        {data.pairs.map((p) => (
          <article key={p.id} className="val-card">
            <span className="eyebrow">{p.tool}</span>
            <h4>{p.label}</h4>
            <Overlay p={p} />
            <div className="val-legend small"><i className="lg-ours" />Our pipeline <i className="lg-nasa" /><a href={p.tool_url} target="_blank" rel="noreferrer">{p.tool}</a></div>
            <dl className="val-stats">
              <div><dt><Tex>{"r"}</Tex></dt><dd className="num">{p.pearson_r.toFixed(4)}</dd></div>
              <div><dt>Mean difference</dt><dd className="num">{signed(p.bias, 2)} <span className="muted">{p.units}</span>{p.rel_bias_pct !== null && <span className="muted"> ({signed(p.rel_bias_pct, 2)}%)</span>}</dd></div>
              <div><dt><Tex>{"\\hat\\beta_{\\text{Sen}}"}</Tex> per decade</dt><dd className="num">{signed(p.sen_ours_per_decade, 2)} vs {signed(p.sen_nasa_per_decade, 2)}</dd></div>
              <div><dt>Months compared</dt><dd className="num">{p.n}</dd></div>
            </dl>
            <p className="small muted">{p.how}</p>
          </article>
        ))}
      </div>
      <p className="small muted" style={{ marginTop: "0.8rem" }}>
        Root-mean-square differences: {data.pairs.map((p) => `${p.label.split(",")[0].split(" (")[0]} ${fmt(p.rmse, 2)} ${p.units}`).join(" · ")}.
        The challenge's “Hydrology Time Series” resource (NASA Hydrology Data Rods) now redirects to a retirement notice, so
        GLDAS and IMERG were read from the GES DISC archive behind it.
      </p>
    </div>
  );
}
