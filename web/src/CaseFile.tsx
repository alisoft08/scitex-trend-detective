// AI-assisted: Codex (OpenAI). One scientific record, progressively disclosed.
import { useState } from "react";
import { TrendChart } from "./charts";
import { useJSON } from "./data";
import { fmt, pfull, signed } from "./format";
import { Validation } from "./Validation";
import { ShareLink } from "./ShareLink";
import { downloadCase } from "./reproduction";
import { casePeriod, caseUnits, dataKind, describes, EVIDENCE_SUMMARY, EVIDENCE_TEXT, interval } from "./evidence";
import type { Level } from "./levels";
import type { CaseFile, CaseRef, CriterionKey, Manifest, Window } from "./types";

const criteria: [CriterionKey, string][] = [
  ["C0", "Valid observations in at least 80% of months and 15 years"],
  ["C1", "Block-bootstrap and ARMA tests both have p < 0.05"],
  ["C2", "The slope’s 95% interval excludes zero"],
  ["C3", "All nine windows agree in direction and at least seven are significant"],
  ["C4", "No direction flip and at least 19 significant fits when leaving out a year"],
  ["C5", "Direction and significance hold after covariate adjustment"],
];

export function EffectBar({ est, limits }: { est: number | null; limits: [number | null, number | null] }) {
  const [lo, hi] = limits;
  if (est === null || lo === null || hi === null) return null;
  const a = Math.min(0, lo, est), b = Math.max(0, hi, est);
  const pad = (b - a) * 0.12 || 1;
  const x = (v: number) => ((v - a + pad) / (b - a + 2 * pad)) * 100;
  return <span className="effect big" role="img" aria-label={`Estimated slope ${fmt(est)}. 95% interval ${interval(limits)}.`}>
    <span className="zero" style={{ left: `${x(0)}%` }} />
    <span className="ci" style={{ left: `${x(lo)}%`, width: `${Math.max(1, x(hi) - x(lo))}%` }} />
    <span className="pt" style={{ left: `${x(est)}%` }} />
    <span className="zero-l" style={{ left: `${x(0)}%` }}>0</span>
  </span>;
}

export function CasePlot({ cf, mode = "anomaly", simple = false, reference, window }: {
  cf: CaseFile; mode?: "anomaly" | "value"; simple?: boolean; reference?: CaseFile; window?: Window;
}) {
  const units = caseUnits(cf.units);
  return <figure className="case-plot">
    <TrendChart series={cf.series} trend={cf.trend} mode={mode} units={units} simple={simple} reference={reference?.series}
      tone={cf.witness === "greenness" ? "green" : cf.witness === "heat" ? "heat" : cf.witness === "water" ? "water" : "climate"} window={window} />
    <figcaption className="plot-legend small">
      <span><i className="plot-key" />{reference ? cf.zone.name : mode === "value" ? "Monthly values" : cf.kind === "contrast" ? "Monthly standardized gap" : "Monthly anomalies"}</span>
      {reference && <span><i className="plot-key dashed" />Desert reference</span>}
      {mode === "anomaly" && <span><i className="plot-key trend" />Full-period trend</span>}
      {cf.n_valid < cf.n && <span><i className="plot-key gap" />{cf.n - cf.n_valid} missing months</span>}
    </figcaption>
  </figure>;
}

function FieldComparison({ field, desert }: { field: CaseRef; desert: CaseRef }) {
  const a = useJSON<CaseFile>(field.path), b = useJSON<CaseFile>(desert.path);
  return <div className="panel analysis-panel">
    <div className="panel-heading"><h3>Field and desert reference</h3><p>Monthly observations on the same axis.</p></div>
    {a.error || b.error ? <p className="error" role="alert">{a.error ?? b.error}</p>
      : a.data && b.data ? <CasePlot cf={a.data} reference={b.data} mode="value" /> : <p className="loading">Loading the two records…</p>}
  </div>;
}

function TestResults({ cf }: { cf: CaseFile }) {
  const tr = cf.trend;
  const calls = [
    ["Classic Mann–Kendall", tr.p_mk_classic, "Assumes independent observations"],
    ["Block-bootstrap Mann–Kendall", tr.p_block_bootstrap, `Resamples blocks of ${tr.block_length} valid observations`],
    ["ARMA-error regression", tr.p_arma, "Models dependence between observations"],
  ] as const;
  const disagree = cf.classic_test_says_significant && cf.verdict === "inconclusive";
  return <section className="panel analysis-panel">
    <div className="panel-heading"><h3>Same series, three tests</h3><p>All three are evaluated at a nominal threshold of p &lt; 0.05.</p></div>
    <div className="test-grid">{calls.map(([name, p, assumption]) => <div className="research-note" key={name}>
      <strong>{name}</strong><span className="num">{pfull(p)}</span><span className="small">{assumption}</span>
    </div>)}</div>
    {disagree && <p className="research-callout">The classic test calls this series significant. The combined analysis leaves the trend inconclusive.</p>}
  </section>;
}

function ExpertAudit({ cf }: { cf: CaseFile }) {
  const [excludedYear, setExcludedYear] = useState("");
  const tr = cf.trend;
  const fit = tr.jackknife?.find((row) => String(row.year) === excludedYear);
  return <div className="research-stack">
    <details className="research-details">
      <summary>Review the verdict criteria</summary>
      <ul className="audit-list">
        {criteria.map(([key, text]) => <li key={key}><span>{text}</span><strong>{cf.criteria[key] === null ? "Not evaluated" : cf.criteria[key] ? "Met" : "Unmet"}</strong></li>)}
      </ul>
      <p className="small muted">The bootstrap groups valid observations after dropping missing months. A block can span a calendar gap.</p>
    </details>
    <details className="research-details">
      <summary>Covariates and leave-one-year-out results</summary>
      <dl className="research-facts">
        <div><dt>Error model selected by AIC</dt><dd>{tr.arma_order ? `ARMA(${tr.arma_order[0]}, ${tr.arma_order[2]})` : "Unavailable"}</dd></div>
        <div><dt>First autoregressive coefficient</dt><dd>{fmt(tr.phi)}</dd></div>
        <div><dt>Adjusted slope</dt><dd>{tr.beta_with_confounders_per_decade === null ? "Unavailable" : `${signed(tr.beta_with_confounders_per_decade)} ${caseUnits(cf.units)}/decade (${pfull(tr.p_with_confounders)})`}</dd></div>
        <div><dt>Covariates in the model</dt><dd>{tr.confounders.join(", ") || "None"}</dd></div>
        <div><dt>Leave-one-year-out fits</dt><dd>{tr.jackknife_significant} of {tr.jackknife_n} significant with the full-period direction. {tr.jackknife_flips_sign ? "At least one direction flip." : "Direction held in every fit."}</dd></div>
      </dl>
      {tr.jackknife && <div className="window-controls">
        <label className="research-field">Year excluded
          <select value={excludedYear} onChange={(e) => setExcludedYear(e.target.value)}>
            <option value="">Choose a year</option>
            {tr.jackknife.map((row) => <option key={row.year} value={row.year}>{row.year}</option>)}
          </select>
        </label>
        {fit && <p className="small" role="status">Without {fit.year}, the estimate is <strong>{signed(fit.sen_per_decade)} {caseUnits(cf.units)}/decade</strong> ({pfull(fit.p_block_bootstrap)}, block bootstrap).</p>}
      </div>}
    </details>
  </div>;
}

export function CaseFileView({ caseRef, level, manifest, href, comparison }: {
  caseRef: CaseRef; level: Level; manifest: Manifest; href: string; comparison?: { field: CaseRef; desert: CaseRef };
}) {
  const { data: cf, error } = useJSON<CaseFile>(caseRef.path);
  const [mode, setMode] = useState<"anomaly" | "value">("anomaly");
  const [periodIndex, setPeriodIndex] = useState(-1);
  const [exportState, setExportState] = useState("");
  if (error) return <p role="alert" className="error">{error}</p>;
  if (!cf || cf.id !== caseRef.id) return <p className="loading" role="status">Opening the case file…</p>;

  const explorer = level === "explorer", expert = level === "expert";
  const tr = cf.trend;
  const [definition, limit] = describes(cf);
  const activeWindow = expert ? tr.windows[periodIndex] : undefined;
  const period = casePeriod(cf.period);
  const fieldMask = manifest.zones.find((z) => z.id === cf.zone.id)?.mask;
  const desertMask = manifest.zones.find((z) => z.id === "Z5")?.mask?.replace("never-green desert", "Low-NDVI reference");
  const showRaw = !explorer && cf.kind === "case" && mode === "value";
  const disagreement = cf.classic_test_says_significant && cf.verdict === "inconclusive";

  return <div className="research-stack">
    <section className="panel case-overview">
      <div className="case-mast">
        <div>
          <p className="eyebrow">{cf.zone.name} · {period}</p>
          <h2>{cf.label}</h2>
          <p>{definition}</p>
        </div>
        <ShareLink href={href} />
      </div>
      <div className="case-result">
        <div><span className={`pill ${cf.verdict}`}>{EVIDENCE_TEXT[cf.verdict]}</span><p>{EVIDENCE_SUMMARY[cf.verdict]}</p></div>
        <div className="case-estimate"><strong className="num">{signed(tr.sen_per_decade)}</strong><span>{caseUnits(cf.units)} per decade</span></div>
      </div>
      {explorer && disagreement && <p className="research-callout">The classic test flags a change here. Accounting for similarities between months leaves the evidence inconclusive.</p>}
      {!explorer && <div className="slope-interval">
        <span>95% interval for the slope <strong className="num">{interval(tr.sen_ci95_block_bootstrap)}</strong></span>
        <EffectBar est={tr.sen_per_decade} limits={tr.sen_ci95_block_bootstrap} />
      </div>}
      <p className="case-limit">{limit}</p>
      <p className="case-source">
        <strong>{dataKind(cf)}</strong> · {cf.source.agency} {cf.source.product} {cf.source.version}
        {" · "}<a href={`https://doi.org/${cf.source.doi}`} target="_blank" rel="noreferrer">Product source</a>
      </p>
    </section>
    {comparison && <FieldComparison {...comparison} />}
    {(!comparison || !explorer) && <section className="panel analysis-panel">
      <div className="analysis-toolbar">
        <div className="panel-heading">
          <h3>{comparison ? "Standardized field–desert gap" : "Monthly record"}</h3>
          <p>{explorer ? "Each month is compared with the average for that month of the year." : `${cf.n_valid} of ${cf.n} valid months · ${cf.source.resolution}`}</p>
        </div>
        {!explorer && !comparison && <div className="toggle" role="group" aria-label="Chart values">
          <button aria-pressed={!showRaw} onClick={() => setMode("anomaly")}>Anomalies</button>
          <button aria-pressed={showRaw} onClick={() => setMode("value")}>Original values</button>
        </div>}
      </div>
      <CasePlot cf={cf} mode={showRaw ? "value" : "anomaly"} simple={explorer} window={activeWindow} />
      {expert && tr.windows.length > 0 && <div className="window-controls">
        <label className="research-field">Sensitivity window
          <select value={periodIndex} onChange={(e) => setPeriodIndex(Number(e.target.value))}>
            <option value={-1}>Full record · principal result</option>
            {tr.windows.map((w, i) => <option key={`${w.start}-${w.end}`} value={i}>{w.start}–{w.end}</option>)}
          </select>
        </label>
        {activeWindow && <p className="small" role="status">Shaded period · <strong>{signed(activeWindow.sen_per_decade)} {caseUnits(cf.units)}/decade</strong> ({pfull(activeWindow.p_block_bootstrap)}, block bootstrap). The verdict above uses the full record.</p>}
      </div>}
    </section>}
    {!explorer && <TestResults cf={cf} />}
    {expert && <>
      <ExpertAudit cf={cf} />
      <details className="research-details">
        <summary>Study area and mask</summary>
        <p>{fieldMask ?? "Whole configured study geometry."}</p>
        {comparison && desertMask && <p>{desertMask}. Alternate masks require a new analysis.</p>}
      </details>
    </>}
    {!explorer && <Validation caseId={cf.id} />}
    {expert && <details className="research-details">
      <summary>Reproduce this result</summary>
      <p>Download the published case, original analysis inputs, geographic mask rules, engine settings and Python runner.</p>
      <button className="btn primary" disabled={exportState === "Preparing…"} onClick={() => {
        setExportState("Preparing…");
        void downloadCase(cf, manifest.generated_at).then(() => setExportState("Download ready."), () => setExportState("Export failed. Try again."));
      }}>Download evidence ZIP</button>
      {exportState && <p className="small" role="status">{exportState}</p>}
    </details>}
  </div>;
}
