// AI-assisted: Claude (Anthropic). "Put the tests on trial": replays trials precomputed in Python (scripts/lab_grid.py).
// Nothing is computed here: the page only animates stored outcomes.
import { useEffect, useRef, useState } from "react";
import { useJSON } from "./data";
import { useLocale, type Translation } from "./i18n";
import type { Level } from "./levels";
import type { Simulation } from "./types";

interface Cell {
  phi: number; n_eff: number; false_alarm_classic: number; false_alarm_ours: number; se_classic: number; se_ours: number;
  trials: [number, number][];
  example: { y: number[]; classic: boolean; ours: boolean; p_classic: number };
}
interface LabData { n: number; alpha: number; reps: number; bootstrap_reps: number; design: string; grid: Cell[] }

function Curve({ grid, idx }: { grid: Cell[]; idx: number }) {
  const { t, fmt, pct } = useLocale();
  const W = 420, H = 190, m = { l: 36, r: 12, t: 12, b: 28 };
  const x = (phi: number) => m.l + (phi / 0.95) * (W - m.l - m.r);
  const y = (v: number) => m.t + (1 - v / 0.8) * (H - m.t - m.b);
  const path = (k: "false_alarm_classic" | "false_alarm_ours") => grid.map((g, i) => `${i ? "L" : "M"}${x(g.phi)},${y(g[k])}`).join("");
  const cur = grid[idx];
  return (
    <svg className="lab-curve" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("False-alarm rate against month-to-month memory for both tests", "Tasa de falsas alarmas frente a la dependencia entre meses para ambas pruebas")}>
      {[0, 0.2, 0.4, 0.6, 0.8].map((v) => (
        <g key={v}><line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} className="grid" /><text x={m.l - 6} y={y(v) + 3} textAnchor="end">{pct(v)}</text></g>
      ))}
      <line x1={m.l} x2={W - m.r} y1={y(0.05)} y2={y(0.05)} className="five" />
      <text x={m.l + 4} y={y(0.05) - 4} textAnchor="start" className="five-t">{t("Nominal 5% threshold", "Umbral nominal del 5 %")}</text>
      <path d={path("false_alarm_classic")} className="c-classic" />
      <path d={path("false_alarm_ours")} className="c-ours" />
      <line x1={x(cur.phi)} x2={x(cur.phi)} y1={m.t} y2={H - m.b} className="now" />
      <circle cx={x(cur.phi)} cy={y(cur.false_alarm_classic)} r={4.5} className="d-classic" />
      <circle cx={x(cur.phi)} cy={y(cur.false_alarm_ours)} r={4.5} className="d-ours" />
      {[0, 0.5, 0.9].map((p) => <text key={p} x={x(p)} y={H - 8} textAnchor="middle">φ = {fmt(p)}</text>)}
    </svg>
  );
}

function Example({ c }: { c: Cell }) {
  const { t } = useLocale();
  const W = 420, H = 120, pad = 6;
  const lo = Math.min(...c.example.y), hi = Math.max(...c.example.y);
  const d = c.example.y.map((v, i) => `${i ? "L" : "M"}${(pad + (i / (c.example.y.length - 1)) * (W - 2 * pad)).toFixed(1)},${(pad + (1 - (v - lo) / (hi - lo || 1)) * (H - 2 * pad)).toFixed(1)}`).join("");
  return (
    <svg className="lab-example" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("One simulated series with no trend", "Una serie simulada sin tendencia")}>
      <path d={d} />
    </svg>
  );
}


const SOURCE_ROOT = "https://github.com/alisoft08/scitex-trend-detective/blob/025e7c218b607bf8a44a34aaa8f37432dd8e8f1b/";

const methodLabels: Record<string, Translation> = {
  mk_classic: ["Classic Mann–Kendall", "Mann–Kendall clásico"],
  mk_hamed_rao: ["Mann–Kendall with Hamed–Rao correction", "Mann–Kendall con corrección de Hamed–Rao"],
  mk_prewhitened: ["Mann–Kendall after pre-whitening", "Mann–Kendall tras preblanqueo"],
  mk_block_bootstrap: ["Mann–Kendall with block bootstrap (36 months)", "Mann–Kendall con bootstrap por bloques (36 meses)"],
  ar1_regression: ["Regression with AR errors", "Regresión con errores autorregresivos"],
  consensus: ["Oasis Paradox agreement check", "Criterio combinado de Oasis Paradox"],
};

function MethodComparison() {
  const { t, fmt, pct } = useLocale();
  const { data: sim, error } = useJSON<Simulation>("simulation.json");
  const [phi, setPhi] = useState(0.9);
  if (error) return <p className="error" role="alert">{t("Could not load the simulation data.", "No se pudieron cargar los datos de simulación.")}</p>;
  if (!sim) return <p className="loading">{t("Loading the method comparison…", "Cargando la comparación de métodos…")}</p>;
  const falseAlarms = sim.false_positive.find((row) => row.phi === phi);
  const detections = sim.power.find((row) => row.phi === phi);
  return <section className="panel analysis-panel method-analysis">
    <div className="analysis-toolbar">
      <div className="panel-heading"><h2>{t("Compare six methods", "Comparar seis métodos")}</h2><p>{t(`Separate Monte Carlo run · ${sim.n} months per series`, `Simulación de Monte Carlo independiente · ${sim.n} meses por serie`)}</p></div>
      <label className="research-field">{t("Autocorrelation", "Autocorrelación")}
        <select value={phi} aria-describedby="method-scenario-help" onChange={(e) => setPhi(Number(e.target.value))}>
          {sim.false_positive.map((row) => <option key={row.phi} value={row.phi}>φ = {fmt(row.phi)}</option>)}
        </select>
      </label>
    </div>
    <p id="method-scenario-help" className="control-help">{t(
      "Change autocorrelation to update the false alarm and detection rates for all six methods below.",
      "Cambia la autocorrelación para actualizar las tasas de falsas alarmas y de detección de los seis métodos de abajo.",
    )}</p>
    <p className="small muted">{t("Compare both outcomes for each method. False alarms occur when a method detects a trend in noise. Detection shows how often it finds a trend that was added to the simulation.", "Compara ambos resultados de cada método. Hay una falsa alarma cuando el método detecta una tendencia en el ruido. La detección indica con qué frecuencia reconoce una tendencia introducida en la simulación.")}</p>
    <div className="method-table">
      <div className="method-row method-table-head" aria-hidden="true"><span>{t("Method", "Método")}</span><span>{t("False alarms", "Falsas alarmas")}</span><span>{t("Trend detected", "Tendencia detectada")}</span></div>
      {sim.tests.map((test) => {
        const label = methodLabels[test.id] ? t(...methodLabels[test.id]) : test.label;
        return <div key={test.id} className={`method-row ${test.id === "consensus" ? "method-consensus" : ""}`}>
        <strong>{label}</strong>
        <div><span className="small method-mobile-label">{t("False alarms", "Falsas alarmas")}</span>{falseAlarms && <>
          <span className="num" aria-label={t(`${pct(falseAlarms[test.id], 1)} false alarms`, `${pct(falseAlarms[test.id], 1)} de falsas alarmas`)}>{pct(falseAlarms[test.id], 1)}</span>
          <meter min={0} max={1} value={falseAlarms[test.id]} aria-label={t(`${label} false-alarm rate`, `${label}, tasa de falsas alarmas`)} />
        </>}</div>
        <div><span className="small method-mobile-label">{t("Trend detected", "Tendencia detectada")}</span>{detections ? <>
          <span className="num" aria-label={t(`${pct(detections[test.id], 1)} trend detection`, `${pct(detections[test.id], 1)} de detección de tendencia`)}>{pct(detections[test.id], 1)}</span>
          <meter min={0} max={1} value={detections[test.id]} aria-label={t(`${label} trend detection rate`, `${label}, tasa de detección de tendencia`)} />
        </> : <span className="small muted">{t("Not simulated", "Sin simulación")}</span>}</div>
      </div>;
      })}
    </div>
    <p className="small muted">{t(
      `${sim.reps_false_positive} series without a trend and ${sim.reps_power} with a trend per simulated setting. AR(1) noise with ${sim.n} monthly values. The added linear trend changes by two marginal standard deviations over the full series. The agreement check requires both adjusted tests below ${fmt(sim.alpha)}. Rates depend on the simulated scenario.`,
      `${sim.reps_false_positive} series sin tendencia y ${sim.reps_power} con tendencia por condición simulada. Ruido AR(1) con ${sim.n} valores mensuales. La tendencia lineal introducida cambia en dos desviaciones estándar marginales a lo largo de la serie. El criterio combinado requiere que ambas pruebas ajustadas obtengan un valor p menor que ${fmt(sim.alpha)}. Las tasas dependen del escenario simulado.`,
    )}</p>
    <p className="small muted">{t("The null runs start with seeds 10,000, 20,000 and 30,000 for φ = 0, 0.5 and 0.9. Trend-present runs start with 90,000 and 180,000 for φ = 0.5 and 0.9.", "Las corridas sin tendencia parten de las semillas 10.000, 20.000 y 30.000 para φ = 0, 0,5 y 0,9. Las corridas con tendencia parten de 90.000 y 180.000 para φ = 0,5 y 0,9.")}</p>
    <div className="link-row small">
      <a href={SOURCE_ROOT + "scripts/simulate.py"} target="_blank" rel="noreferrer">{t("Monte Carlo source", "Código de la simulación de Monte Carlo")}</a>
      <a href="https://doi.org/10.1016/S0022-1694(97)00125-X" target="_blank" rel="noreferrer">{t("Autocorrelation in Mann–Kendall · Hamed and Rao", "Autocorrelación en Mann–Kendall · Hamed y Rao")}</a>
    </div>
  </section>;
}

export function Lab({ level, onCase }: { level: Level; onCase: () => void }) {
  const { t, fmt, pct, pfull } = useLocale();
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

  if (error) return <p className="error" role="alert">{t("Could not load the simulation data.", "No se pudieron cargar los datos de simulación.")}</p>;
  if (!data) return <p className="loading" role="status">{t("Loading the laboratory…", "Cargando el laboratorio…")}</p>;
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
        <h2>{t("Can noise look like a trend?", "¿Puede el ruido parecer una tendencia?")}</h2>
        <p className="lede-2">{explorer ? t("Every simulated series has zero underlying trend. Turn up the similarity between months and see which method raises an alarm.", "Cada serie simulada tiene una tendencia real de cero. Aumenta la similitud entre meses y observa qué método da una alarma.")
          : t(`Both approaches use the same synthetic series of ${data.n} months. The trend is zero and the AR(1) autocorrelation is set by the slider.`,
            `Ambos métodos usan las mismas series simuladas de ${data.n} meses. La tendencia es cero y el control deslizante fija la autocorrelación AR(1).`)}</p>
      </div>
      <p className="control-help" id="lab-run-help">{t(
        "Set how similar consecutive months are, then play the trials to watch both methods evaluate the same simulated series.",
        "Ajusta la similitud entre meses consecutivos y reproduce los ensayos para ver cómo ambos métodos evalúan las mismas series simuladas.",
      )}</p>
      <div className="lab-controls">
        <label htmlFor="lab-phi" className="lab-phi-label">{explorer ? t("Similarity between months", "Similitud entre meses") : t("Autocorrelation in simulated noise", "Autocorrelación del ruido simulado")} · φ = {fmt(c.phi)}</label>
        <input id="lab-phi" type="range" min={0} max={data.grid.length - 1} step={1} value={idx} aria-valuetext={t(`Autocorrelation ${fmt(c.phi)}`, `Autocorrelación ${fmt(c.phi)}`)} onChange={(e) => {
          stopTimer(); setRunning(false); setShown(0); setIdx(Number(e.target.value));
        }} />
        <div className="lab-phi-scale"><span>{t("Independent noise", "Ruido independiente")}</span><span>{t("Strong memory", "Alta dependencia")}</span></div>
        <button className="btn primary" id="lab-run" aria-describedby="lab-run-help" onClick={run} disabled={running}>{running ? t("Replaying…", "Reproduciendo…") : shown ? t(`Replay ${total} trials`, `Repetir ${total} ensayos`) : t(`Play ${total} trials`, `Reproducir ${total} ensayos`)}</button>
      </div>
      <div className="lab-boards">
        {([0, 1] as const).map((k) => {
          const n = c.trials.slice(0, shown).filter((t) => t[k] === 1).length;
          const all = k === 0 ? c.false_alarm_classic : c.false_alarm_ours;
          const se = k === 0 ? c.se_classic : c.se_ours;
          return <article key={k} className={`lab-board ${k === 0 ? "classic" : "ours"}`}>
            <div className="lb-head"><span className="lb-name">{k === 0 ? t(...methodLabels.mk_classic) : t(...methodLabels.consensus)}</span>
              {shown > 0 && <span className="lb-count"><b className="num">{n}/{shown}</b> {t("false alarms in replay", "falsas alarmas en la reproducción")}</span>}</div>
            <div className="lb-dots" aria-hidden="true">{c.trials.map((t, i) => <i key={i} className={i < shown ? (t[k] ? "fire" : "calm") : ""} />)}</div>
            <span className="small">{k === 0 ? t("Assumes independent observations", "Supone observaciones independientes") : t("Block bootstrap and AR(1) regression must agree", "Requiere que coincidan el bootstrap por bloques y la regresión AR(1)")}</span>
            <span className="small muted"><strong>{pct(all, 1)}</strong> {t(`false alarms across all ${data.reps} series`, `de falsas alarmas en las ${data.reps} series`)}{!explorer && t(` · Monte Carlo SE ${pct(se, 1)}`, ` · Error estándar de Monte Carlo ${pct(se, 1)}`)}</span>
            {shown === total && <span className="sr-only" role="status">{t(`${n} false alarms in ${total} replayed trials.`, `${n} falsas alarmas en los ${total} ensayos reproducidos.`)}</span>}
          </article>;
        })}
      </div>

      <div className={`lab-side ${explorer ? "lab-side-simple" : ""}`}>
        <div>
          <span className="eyebrow">{t("One simulated series · true trend zero", "Una serie simulada · tendencia real cero")}</span>
          <Example c={c} />

          <p className="small">{t("Classic test", "Prueba clásica")} · <strong>{c.example.classic ? t("significant", "significativa") : t("inconclusive", "no concluyente")}</strong>
            {!explorer && ` (${pfull(c.example.p_classic)})`}. {t("Agreement check", "Criterio combinado")} · <strong>{c.example.ours ? t("significant", "significativa") : t("inconclusive", "no concluyente")}</strong>.</p>
        </div>
        {!explorer && <div>
          <span className="eyebrow">{t("False alarms as memory grows", "Falsas alarmas al aumentar la dependencia")}</span>
          <Curve grid={data.grid} idx={idx} />
          <div className="lab-legend small"><i className="lg-c" />{t("Classic", "Clásica")} <i className="lg-o" />{t("Agreement check", "Criterio combinado")}</div>
        </div>}
      </div>
      <div className="lab-design link-row">
        <button className="text-button" onClick={onCase}>{t("View the GLDAS groundwater series and its tests →", "Ver la serie de agua subterránea de GLDAS y sus pruebas →")}</button>
        <a className="small" href={SOURCE_ROOT + "scripts/lab_grid.py"} target="_blank" rel="noreferrer">{t("Simulation source", "Código de la simulación")}</a>
      </div>
      {level === "expert" && <p className="small muted lab-design">{t(
      `The replay shows the first ${total} trials of a ${data.reps}-series run. Each uses ${data.bootstrap_reps} bootstrap resamples. Seeds start at ${500_000 + 10_000 * idx} for this setting and increase by one. The case verdict uses this agreement check along with other evidence.`,
      `La reproducción muestra los primeros ${total} ensayos de una simulación de ${data.reps} series. Cada serie usa ${data.bootstrap_reps} remuestreos de bootstrap. Para esta condición, la semilla inicial es ${500_000 + 10_000 * idx} y aumenta de uno en uno. El veredicto del caso utiliza este criterio combinado junto con otras comprobaciones.`,
    )}</p>}
    </div>
    {level === "expert" && <MethodComparison />}
  </div>;
}
