// AI-assisted: Claude (Anthropic). "Put the tests on trial": replays trials precomputed in Python (scripts/lab_grid.py).
// Nothing is computed here: the page only animates stored outcomes.
import { useEffect, useRef, useState } from "react";
import { useJSON } from "./data";
import { pct } from "./format";
import type { Level } from "./levels";
import { Tex } from "./Tex";

interface Cell {
  phi: number; n_eff: number; false_alarm_classic: number; false_alarm_ours: number; se_classic: number; se_ours: number;
  trials: [number, number][];
  example: { y: number[]; classic: boolean; ours: boolean; p_classic: number };
}
interface LabData { n: number; alpha: number; reps: number; bootstrap_reps: number; design: string; grid: Cell[] }

function Curve({ grid, idx }: { grid: Cell[]; idx: number }) {
  const W = 420, H = 190, m = { l: 36, r: 12, t: 12, b: 28 };
  const x = (phi: number) => m.l + (phi / 0.95) * (W - m.l - m.r);
  const y = (v: number) => m.t + (1 - v / 0.8) * (H - m.t - m.b);
  const path = (k: "false_alarm_classic" | "false_alarm_ours") => grid.map((g, i) => `${i ? "L" : "M"}${x(g.phi)},${y(g[k])}`).join("");
  const cur = grid[idx];
  return (
    <svg className="lab-curve" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="False-alarm rate against month-to-month memory for both tests">
      {[0, 0.2, 0.4, 0.6, 0.8].map((v) => (
        <g key={v}><line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} className="grid" /><text x={m.l - 6} y={y(v) + 3} textAnchor="end">{pct(v)}</text></g>
      ))}
      <line x1={m.l} x2={W - m.r} y1={y(0.05)} y2={y(0.05)} className="five" />
      <text x={m.l + 4} y={y(0.05) - 4} textAnchor="start" className="five-t">5% = an honest test</text>
      <path d={path("false_alarm_classic")} className="c-classic" />
      <path d={path("false_alarm_ours")} className="c-ours" />
      <line x1={x(cur.phi)} x2={x(cur.phi)} y1={m.t} y2={H - m.b} className="now" />
      <circle cx={x(cur.phi)} cy={y(cur.false_alarm_classic)} r={4.5} className="d-classic" />
      <circle cx={x(cur.phi)} cy={y(cur.false_alarm_ours)} r={4.5} className="d-ours" />
      {[0, 0.5, 0.9].map((p) => <text key={p} x={x(p)} y={H - 8} textAnchor="middle">φ = {p}</text>)}
    </svg>
  );
}

function Example({ c }: { c: Cell }) {
  const W = 420, H = 120, pad = 6;
  const lo = Math.min(...c.example.y), hi = Math.max(...c.example.y);
  const d = c.example.y.map((v, i) => `${i ? "L" : "M"}${(pad + (i / (c.example.y.length - 1)) * (W - 2 * pad)).toFixed(1)},${(pad + (1 - (v - lo) / (hi - lo || 1)) * (H - 2 * pad)).toFixed(1)}`).join("");
  return (
    <svg className="lab-example" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="One simulated series with no trend">
      <path d={d} />
    </svg>
  );
}

export function Lab({ level }: { level: Level }) {
  const { data } = useJSON<LabData>("lab.json");
  const [idx, setIdx] = useState(9);          // phi = 0.9, groundwater-like
  const [shown, setShown] = useState(0);
  const [running, setRunning] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);
  useEffect(() => { setShown(0); setRunning(false); if (timer.current) window.clearInterval(timer.current); }, [idx]);
  if (!data) return null;
  const c = data.grid[idx];
  const total = c.trials.length;

  const run = () => {
    if (timer.current) window.clearInterval(timer.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(total); return; }
    setShown(0);
    setRunning(true);
    timer.current = window.setInterval(() => {
      setShown((s) => {
        if (s + 2 >= total) { if (timer.current) window.clearInterval(timer.current); setRunning(false); return total; }
        return s + 2;
      });
    }, 45);
  };

  const fired = (k: 0 | 1) => c.trials.slice(0, shown).filter((t) => t[k] === 1).length;
  const ex = level === "explorer";
  return (
    <div className="lab" id="lab">
      <div className="lab-head">
        <span className="eyebrow">The lab</span>
        <h3>Put the tests on trial</h3>
        <p className="lede-2">
          {ex
            ? "Each dot is a pretend dataset where nothing is really changing. Watch how often each test wrongly shouts “trend!”."
            : `Each dot is one simulated series of ${data.n} months with no trend at all. A good test should cry “significant” about 5% of the time.`}
        </p>
      </div>

      <div className="lab-controls">
        <label htmlFor="lab-phi" className="lab-phi-label">
          {ex ? "How much each month repeats the last one" : <>Month-to-month memory <Tex>{`\\phi = ${c.phi}`}</Tex></>}
        </label>
        <input id="lab-phi" type="range" min={0} max={data.grid.length - 1} step={1} value={idx} onChange={(e) => setIdx(Number(e.target.value))} />
        <div className="lab-phi-scale"><span>No memory</span><span>Groundwater-like</span></div>
        <div className="lab-neff">
          {data.n} months behave like <b>{Math.round(c.n_eff)}</b> independent ones
        </div>
        <button className="btn primary" id="lab-run" onClick={run} disabled={running}>{running ? "Running…" : shown ? "Run again" : `Run ${total} trials`}</button>
      </div>

      <div className="lab-boards">
        {([0, 1] as const).map((k) => {
          const n = fired(k);
          return (
            <div key={k} className={`lab-board ${k === 0 ? "classic" : "ours"}`}>
              <div className="lb-head">
                <span className="lb-name">{k === 0 ? "Classic Mann-Kendall" : "Our rule"}</span>
                <span className="lb-count"><b className="num">{n}</b> false alarm{n === 1 ? "" : "s"} <span className="muted">/ {shown}</span></span>
              </div>
              <div className="lb-dots" aria-label={`${n} false alarms in ${shown} trials`}>
                {c.trials.map((t, i) => <i key={i} className={i < shown ? (t[k] ? "fire" : "calm") : ""} />)}
              </div>
              <span className="small muted">
                {shown === total
                  ? `${pct(k === 0 ? c.false_alarm_classic : c.false_alarm_ours)} over all ${data.reps} simulated series${ex ? "" : ` (±${pct(k === 0 ? c.se_classic : c.se_ours, 1)})`}`
                  : k === 0 ? "Treats every month as independent" : "Block bootstrap AND AR regression must agree"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="lab-side">
        <div>
          <span className="eyebrow">{ex ? "One of these pretend datasets" : "One trendless series at this memory"}</span>
          <Example c={c} />
          <p className="small">
            Classic test: <b className={c.example.classic ? "warn" : ""}>{c.example.classic ? "“significant trend!”" : "no trend"}</b>
            {!ex && ` (${c.example.p_classic < 0.001 ? "p < 0.001" : `p = ${c.example.p_classic.toFixed(3)}`})`}. Our rule: <b>{c.example.ours ? "trend" : "no trend"}</b>.
            {c.example.classic && !c.example.ours && " It looks like it goes somewhere, but it is pure noise with memory."}
          </p>
        </div>
        <div>
          <span className="eyebrow">False alarms as memory grows</span>
          <Curve grid={data.grid} idx={idx} />
          <div className="lab-legend small"><i className="lg-c" />Classic Mann-Kendall <i className="lg-o" />Our rule</div>
        </div>
      </div>
      {level === "expert" && <p className="small muted lab-design">{data.design} Precomputed in Python (scripts/lab_grid.py); the page replays the stored trials.</p>}
    </div>
  );
}
