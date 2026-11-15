// AI-assisted: Claude (Anthropic). Instrument 4: the tricky witness. Replays trials precomputed in Python (lab.json).
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useJSON } from "../data";
import { fill, type Lang } from "../i18n";
import type { Witnesses } from "../types";
import { FIELD_TEXT } from "./text";

interface LabCell { phi: number; trials: [number, number][]; false_alarm_classic: number; false_alarm_ours: number }
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useCoinRun(onDone: () => void): [number, () => void] {
  const [shown, setShown] = useState(0);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);
  const run = () => {
    if (timer.current) window.clearInterval(timer.current);
    if (reduceMotion()) { setShown(100); onDone(); return; }
    setShown(0);
    timer.current = window.setInterval(() => setShown((s) => {
      if (s >= 98) { if (timer.current) window.clearInterval(timer.current); onDone(); return 100; }
      return s + 2;
    }), 40);
  };
  return [shown, run];
}

function Wiggle({ values }: { values: (number | null)[] }) {
  const W = 560, H = 120, pad = 10;
  const pts = values.map((v, i) => (v === null ? null : [pad + (i / Math.max(1, values.length - 1)) * (W - 2 * pad), H / 2 - v * 20] as const)).filter(Boolean) as [number, number][];
  return (
    <svg className="ms-wiggle" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="NASA GLDAS groundwater model, one value per year">
      <line x1={pad} x2={W - pad} y1={H / 2} y2={H / 2} className="zero" />
      <path d={pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("")} />
    </svg>
  );
}

export function TrickyWitness({ lang, head, nav, onRecord }: { lang: Lang; head: ReactNode; nav: ReactNode; onRecord: () => void }) {
  const t = FIELD_TEXT[lang].witness;
  const { data: lab } = useJSON<{ grid: LabCell[] }>("lab.json");
  const { data: wit } = useJSON<Witnesses>("witnesses.json");
  const [shown, run] = useCoinRun(onRecord);
  const [mi, setMi] = useState(9);
  if (!lab) return <div className="ms-card ms-split"><div className="loading">…</div></div>;
  const fair = lab.grid[0], sticky = lab.grid.find((c) => Math.abs(c.phi - 0.9) < 1e-6) ?? lab.grid[lab.grid.length - 1];
  const board = (cell: LabCell, name: string, sub: string, kind: string) => {
    const n = cell.trials.slice(0, shown).filter((x) => x[0] === 1).length;
    return (
      <div className={`ms-coins ${kind}`}>
        <span className="ms-coins-name">{name}</span>
        <span className="ms-coins-sub">{sub}</span>
        <div className="ms-coin-grid">{cell.trials.slice(0, 100).map((x, i) => <i key={i} className={i < shown ? (x[0] ? "fire" : "calm") : ""} />)}</div>
        <span className="ms-coins-res" aria-live="polite">{shown >= 100 ? fill(t.shouts, { n }) : " "}</span>
      </div>
    );
  };
  const cur = lab.grid[mi];
  const done = shown >= 100;
  const gws = wit?.series.find((s) => s.id === "ZW_gws")?.values ?? [];
  return (
    <div className="ms-card ms-split fl-witness">
      <div className="ms-visual">
        <div className="ms-coins-row">{board(fair, t.fair, t.fairSub, "fair")}{board(sticky, t.sticky, t.stickySub, "sticky")}</div>
      </div>
      <div className="ms-panel">
        {head}
        {!done && <p className="ms-lede">{t.ask}</p>}
        {!done && <div><button className="ms-btn" id="ms-flip" onClick={run} disabled={shown > 0}>{t.run}</button></div>}
        {done && (
          <div className="fl-memory">
            <label htmlFor="fl-mem">{t.memory} <b>φ = {cur.phi}</b></label>
            <input id="fl-mem" type="range" min={0} max={lab.grid.length - 1} step={1} value={mi} onChange={(e) => setMi(Number(e.target.value))} />
            <span className="fl-mem-bars">
              <span className="fl-bar-classic" style={{ width: `${Math.max(1, cur.false_alarm_classic * 100)}%` }} />
              <span className="fl-bar-ours" style={{ width: `${Math.max(1, cur.false_alarm_ours * 100)}%` }} />
            </span>
            <span className="ms-note">{fill(t.memoryNote, { a: Math.round(cur.false_alarm_classic * 100), b: Math.round(cur.false_alarm_ours * 100) })}</span>
          </div>
        )}
        {done && (
          <div className="ms-reveal">
            <p className="ms-lede small">{t.real}</p>
            <Wiggle values={gws} />
            <div className="ms-versus">
              <div className="ms-quick">📢 {t.quick}</div>
              <div className="ms-honest">{t.honest} <span className="ms-stamp no">{t.notProven}</span></div>
            </div>
          </div>
        )}
        {nav}
      </div>
    </div>
  );
}
