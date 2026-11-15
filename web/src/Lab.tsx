// AI-assisted: Claude (Anthropic). "Put the tests on trial": replays trials precomputed in Python (scripts/lab_grid.py).
// Nothing is computed here: the page only animates stored outcomes.
import { useEffect, useRef, useState } from "react";
import { useJSON } from "./data";
import { pct, pfull } from "./format";
import type { Level } from "./levels";
import type { Simulation } from "./types";

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
      <text x={m.l + 4} y={y(0.05) - 4} textAnchor="start" className="five-t">Nominal 5% threshold</text>
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


const SOURCE_ROOT = "https://github.com/alisoft08/scitex-trend-detective/blob/025e7c218b607bf8a44a34aaa8f37432dd8e8f1b/";

function MethodComparison() {
  const { data: sim, error } = useJSON<Simulation>("simulation.json");
  const [phi, setPhi] = useState(0.9);
  if (error) return <p className="error" role="alert">{error}</p>;
  if (!sim) return <p className="loading">Loading the method comparison…</p>;
  const falseAlarms = sim.false_positive.find((row) => row.phi === phi);
  const detections = sim.power.find((row) => row.phi === phi);
  return <section className="panel analysis-panel method-analysis">
    <div className="analysis-toolbar">
      <div className="panel-heading"><h2>Compare six methods</h2><p>Separate Monte Carlo run · {sim.n} months per series</p></div>
      <label className="research-field">Autocorrelation
        <select value={phi} onChange={(e) => setPhi(Number(e.target.value))}>
          {sim.false_positive.map((row) => <option key={row.phi} value={row.phi}>φ = {row.phi}</option>)}
        </select>
      </label>
    </div>
    <div className="method-table">
      <div className="method-row method-table-head" aria-hidden="true"><span>Method</span><span>False alarms</span><span>Trend detected</span></div>
      {sim.tests.map((test) => <div key={test.id} className={`method-row ${test.id === "consensus" ? "method-consensus" : ""}`}>
        <strong>{test.id === "consensus" ? "Oasis Paradox agreement check" : test.label}</strong>
        <div><span className="small method-mobile-label">False alarms</span>{falseAlarms && <>
          <span className="num" aria-label={`${pct(falseAlarms[test.id], 1)} false alarms`}>{pct(falseAlarms[test.id], 1)}</span>
          <meter min={0} max={1} value={falseAlarms[test.id]} aria-label={`${test.label} false-alarm rate`} />
        </>}</div>
        <div><span className="small method-mobile-label">Trend detected</span>{detections ? <>
          <span className="num" aria-label={`${pct(detections[test.id], 1)} trend detection`}>{pct(detections[test.id], 1)}</span>
          <meter min={0} max={1} value={detections[test.id]} aria-label={`${test.label} trend detection rate`} />
        </> : <span className="small muted">Not simulated</span>}</div>
      </div>)}
    </div>
    <p className="small muted">{sim.reps_false_positive} null series and {sim.reps_power} trend-present series per simulated setting. {sim.design} The agreement check requires both adjusted tests below {sim.alpha}. These rates depend on the simulated scenario.</p>
    <p className="small muted">The null runs start with seeds 10,000, 20,000 and 30,000 for φ = 0, 0.5 and 0.9. Trend-present runs start with 90,000 and 180,000 for φ = 0.5 and 0.9.</p>
    <div className="link-row small">
      <a href={SOURCE_ROOT + "scripts/simulate.py"} target="_blank" rel="noreferrer">Monte Carlo source</a>
      <a href="https://doi.org/10.1016/S0022-1694(97)00125-X" target="_blank" rel="noreferrer">Autocorrelation in Mann–Kendall · Hamed and Rao</a>
    </div>
  </section>;
}

export function Lab({ level, onCase }: { level: Level; onCase: () => void }) {
  const { data, error } = useJSON<LabData>("lab.json");
  const [idx, setIdx] = useState(9);
  const [shown, setShown] = useState(0);
  const [running, setRunning] = useState(false);
  const timer = useRef<number | null>(null);

  function stopTimer() {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
  }

  useEffect(() => () => {
    if (timer.current !== null) window.clearInterval(timer.current);
  }, []);

  if (error) return <p className="error" role="alert">{error}</p>;
  if (!data) return <p className="loading" role="status">Loading the laboratory…</p>;
  const c = data.grid[idx];
  const total = c.trials.length;
  const explorer = level === "explorer";

  function run() {
    stopTimer();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(total);
      setRunning(false);
      return;
    }
    let count = 0;
    setShown(count);
    setRunning(true);
    timer.current = window.setInterval(() => {
      count = Math.min(total, count + 2);
      setShown(count);
      if (count === total) { stopTimer(); setRunning(false); }
    }, 32);
  }

  return <div className="research-stack">
    <div className="lab" id="lab">
      <div className="lab-head">
        <h2>Can noise look like a trend?</h2>
        <p className="lede-2">{explorer ? "Every simulated series has zero underlying trend. Turn up how much neighbouring months resemble each other and see which tests raise an alarm." : `Both approaches see the same synthetic series of ${data.n} months. Each series has zero trend and preset AR(1) autocorrelation.`}</p>
      </div>
      <div className="lab-controls">
        <label htmlFor="lab-phi" className="lab-phi-label">{explorer ? "Similarity between months" : "Autocorrelation in simulated noise"} · φ = {c.phi}</label>
        <input id="lab-phi" type="range" min={0} max={data.grid.length - 1} step={1} value={idx} aria-valuetext={`Autocorrelation ${c.phi}`} onChange={(e) => {
          stopTimer(); setRunning(false); setShown(0); setIdx(Number(e.target.value));
        }} />
        <div className="lab-phi-scale"><span>Independent noise</span><span>Strong memory</span></div>
        <button className="btn primary" id="lab-run" onClick={run} disabled={running}>{running ? "Replaying…" : shown ? `Replay ${total} trials` : `Play ${total} trials`}</button>
      </div>
      <div className="lab-boards">
        {([0, 1] as const).map((k) => {
          const n = c.trials.slice(0, shown).filter((t) => t[k] === 1).length;
          const all = k === 0 ? c.false_alarm_classic : c.false_alarm_ours;
          const se = k === 0 ? c.se_classic : c.se_ours;
          return <article key={k} className={`lab-board ${k === 0 ? "classic" : "ours"}`}>
            <div className="lb-head"><span className="lb-name">{k === 0 ? "Classic Mann–Kendall" : "Oasis Paradox agreement check"}</span>
              {shown > 0 && <span className="lb-count"><b className="num">{n}/{shown}</b> false alarms in replay</span>}</div>
            <div className="lb-dots" aria-hidden="true">{c.trials.map((t, i) => <i key={i} className={i < shown ? (t[k] ? "fire" : "calm") : ""} />)}</div>
            <span className="small">{k === 0 ? "Assumes independent observations" : "Block bootstrap and AR(1) regression must agree"}</span>
            <span className="small muted"><strong>{pct(all, 1)}</strong> false alarms across all {data.reps} series{explorer ? "" : ` · Monte Carlo SE ${pct(se, 1)}`}</span>
            {shown === total && <span className="sr-only" role="status">{n} false alarms in {total} replayed trials.</span>}
          </article>;
        })}
      </div>

      <div className={`lab-side ${explorer ? "lab-side-simple" : ""}`}>
        <div>
          <span className="eyebrow">One simulated series · true trend zero</span>
          <Example c={c} />
          <p className="small">Classic test: <strong>{c.example.classic ? "significant" : "inconclusive"}</strong>{!explorer && ` (${pfull(c.example.p_classic)})`}. Agreement check: <strong>{c.example.ours ? "significant" : "inconclusive"}</strong>.</p>
        </div>
        {!explorer && <div>
          <span className="eyebrow">False alarms as memory grows</span>
          <Curve grid={data.grid} idx={idx} />
          <div className="lab-legend small"><i className="lg-c" />Classic <i className="lg-o" />Agreement check</div>
        </div>}
      </div>
      <div className="lab-design link-row">
        <button className="text-button" onClick={onCase}>See the real GLDAS case →</button>
        <a className="small" href={SOURCE_ROOT + "scripts/lab_grid.py"} target="_blank" rel="noreferrer">Simulation source</a>
      </div>
      {level === "expert" && <p className="small muted lab-design">The replay shows the first {total} trials of a {data.reps}-series run. Each series uses {data.bootstrap_reps} bootstrap resamples. Seed for the first trial at this setting: {500_000 + 10_000 * idx}. Seeds count up by one. The replay evaluates the agreement check used by the case verdict, which also requires other evidence.</p>}
    </div>
    {level === "expert" && <MethodComparison />}
  </div>;
}
