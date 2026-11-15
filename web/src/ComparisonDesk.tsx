// AI-assisted: Codex (OpenAI). Compare two published records without mixing their scales.
import { useState } from "react";
import { useJSON } from "./data";
import { CasePlot, EffectBar } from "./CaseFile";
import { casePeriod, caseUnits, dataKind, estimate, EVIDENCE_TEXT, interval } from "./evidence";
import { signed } from "./format";
import { ShareLink } from "./ShareLink";
import { PLACES, WITNESSES } from "./Workspace";
import type { Level } from "./levels";
import type { CaseFile, CaseRef, Manifest } from "./types";

function ComparePanel({ label, refCase, level, onCase }: { label: string; refCase: CaseRef; level: Level; onCase: (id: string) => void }) {
  const { data: cf, error } = useJSON<CaseFile>(refCase.path);
  if (error) return <p role="alert" className="error">{error}</p>;
  if (!cf) return <p className="loading">Loading {label}…</p>;
  return <article className="panel analysis-panel comparison-panel">
    <div className="panel-heading"><p className="eyebrow">{label} · {PLACES[refCase.zone] ?? refCase.zone_name}</p><h3>{refCase.label}</h3>
      <p>{casePeriod(cf.period)} · {cf.n_valid}/{cf.n} months · {dataKind(cf)}</p></div>
    <div className="comparison-result">
      <strong>{estimate(cf)}</strong>
      <span className={`pill ${cf.verdict}`}>{EVIDENCE_TEXT[cf.verdict]}</span>
    </div>
    <CasePlot cf={cf} />
    <p className="small">95% slope interval <strong>{interval(cf.trend.sen_ci95_block_bootstrap)} {caseUnits(cf.units)}/decade</strong></p>
    {level === "expert" && <dl className="research-facts comparison-checks">
      <div><dt>Tests adjusted for dependence both pass</dt><dd>{cf.criteria.C1 ? "Yes" : "No"}</dd></div>
      <div><dt>Windows in the same direction</dt><dd>{cf.trend.windows_same_sign}/{cf.trend.windows.length}</dd></div>
      <div><dt>Significant fits leaving out one year</dt><dd>{cf.trend.jackknife_significant}/{cf.trend.jackknife_n}</dd></div>
    </dl>}
    <div className="link-row small">
      <a href={`https://doi.org/${cf.source.doi}`} target="_blank" rel="noreferrer">{cf.source.product} {cf.source.version}</a>
      <button className="text-button" onClick={() => onCase(cf.id)}>Open case →</button>
    </div>
  </article>;
}

function matchedContrast(manifest: Manifest, a: CaseRef, b: CaseRef) {
  if (a.kind !== "case" || b.kind !== "case" || a.variable !== b.variable || (a.zone !== "Z5" && b.zone !== "Z5")) return undefined;
  const field = a.zone === "Z5" ? b : a;
  return manifest.cases.find((c) => c.id === `${field.zone}_vs_Z5_${field.variable}`);
}

export function ComparisonDesk({ manifest, level, pair, onPair, onCase, href }: {
  manifest: Manifest; level: Level; pair: readonly [string, string]; onPair: (pair: readonly [string, string]) => void;
  onCase: (id: string) => void; href: string;
}) {
  const [variable, setVariable] = useState("");
  const [zone, setZone] = useState("");
  const [verdict, setVerdict] = useState("");
  const a = manifest.cases.find((c) => c.id === pair[0]);
  const b = manifest.cases.find((c) => c.id === pair[1]);
  if (!a || !b) return <p className="error">These records are unavailable.</p>;
  const matches = manifest.cases.filter((c) => (!variable || c.variable.replace(/_contrast$/, "") === variable)
    && (!zone || c.zone === zone) && (!verdict || c.verdict === verdict));
  const contrast = matchedContrast(manifest, a, b);
  const option = (c: CaseRef) => `${c.short} · ${PLACES[c.zone] ?? c.zone_name}`;

  return <section className="wrap wide research-page">
    <header className="research-heading"><p className="eyebrow">Analysis</p><h1>Compare cases</h1><p>Put two records on the same timeline. Each panel keeps its own vertical scale.</p></header>
    <div className="panel compare-selectors">
      <label className="research-field">Case A<select value={a.id} onChange={(e) => onPair([e.target.value, b.id])}>
        {manifest.cases.filter((c) => c.id !== b.id).map((c) => <option key={c.id} value={c.id}>{option(c)}</option>)}
      </select></label>
      <label className="research-field">Case B<select value={b.id} onChange={(e) => onPair([a.id, e.target.value])}>
        {manifest.cases.filter((c) => c.id !== a.id).map((c) => <option key={c.id} value={c.id}>{option(c)}</option>)}
      </select></label>
      <ShareLink href={href} />
    </div>
    <div className="comparison-columns">
      <ComparePanel label="Case A" refCase={a} level={level} onCase={onCase} />
      <ComparePanel label="Case B" refCase={b} level={level} onCase={onCase} />
    </div>
    {contrast ? <div className="panel analysis-panel">
      <div className="panel-heading"><h3>Calculated field–desert contrast</h3><p>Trend in field minus desert after standardizing each series by calendar month.</p></div>
      <div className="comparison-result"><strong>{signed(contrast.sen_per_decade)} SD/decade</strong>
        <span className={`pill ${contrast.verdict}`}>{EVIDENCE_TEXT[contrast.verdict]}</span></div>
      <p className="small">95% interval <strong>{interval(contrast.ci95)}</strong></p>
      <button className="text-button" onClick={() => onCase(contrast.id)}>Open the contrast →</button>
    </div> : <p className="research-callout">A difference between these trends needs a direct statistical contrast. Results from the separate cases do not establish it.</p>}
    <section className="panel analysis-panel">
      <div className="panel-heading"><h2>Case catalogue</h2><p>{matches.length} of {manifest.cases.length} published records</p></div>
      <div className="catalogue-filters">
        <label className="research-field">Variable<select value={variable} onChange={(e) => setVariable(e.target.value)}>
          <option value="">All variables</option>{WITNESSES.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
        </select></label>
        <label className="research-field">Area<select value={zone} onChange={(e) => setZone(e.target.value)}>
          <option value="">All areas</option>{manifest.zones.map((z) => <option key={z.id} value={z.id}>{PLACES[z.id] ?? z.name}</option>)}
        </select></label>
        <label className="research-field">Evidence<select value={verdict} onChange={(e) => setVerdict(e.target.value)}>
          <option value="">All results</option>{Object.entries(EVIDENCE_TEXT).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select></label>
      </div>
      {matches.length === 0 && <p role="status">No published cases match these filters.</p>}
      <div className="catalogue-results">
        {matches.map((c) => <article key={c.id} className="catalogue-row">
          <div><button className="text-button" onClick={() => onCase(c.id)}>{option(c)}</button>
            <p className="small muted">{signed(c.sen_per_decade)} {caseUnits(c.units)}/decade · {EVIDENCE_TEXT[c.verdict]} · 95% interval {interval(c.ci95)}</p></div>
          <EffectBar est={c.sen_per_decade} limits={c.ci95} />
          <div className="toggle" aria-label={option(c)}>
            <button type="button" aria-pressed={c.id === a.id} disabled={c.id === b.id} onClick={() => onPair([c.id, b.id])}>Set as A</button>
            <button type="button" aria-pressed={c.id === b.id} disabled={c.id === a.id} onClick={() => onPair([a.id, c.id])}>Set as B</button>
          </div>
        </article>)}
      </div>
    </section>
  </section>;
}
