// AI-assisted: Claude (Anthropic). Verdict board (every case at a glance) and the case file of one zone x variable.
import { useState } from "react";
import { TrendChart } from "./charts";
import { useJSON } from "./data";
import { DATA_TYPE_TEXT, fmt, pfull, signed } from "./format";
import { Tex } from "./Tex";
import type { CaseFile as CaseFileT, CaseRef, CriterionKey, Manifest } from "./types";
import type { Level } from "./levels";

const GROUPS: { id: string; label: string; tone: string; ids: string[] }[] = [
  { id: "green", label: "Greenness from space", tone: "green", ids: ["Z2_ndvi", "Z1_ndvi", "Z5_ndvi", "Z2_vs_Z5_ndvi", "Z1_vs_Z5_ndvi"] },
  { id: "et", label: "Water used by crops", tone: "green", ids: ["Z2_et", "Z1_et"] },
  { id: "heat", label: "Surface heat", tone: "heat", ids: ["Z2_lst", "Z1_lst", "Z5_lst", "Z2_vs_Z5_lst", "Z1_vs_Z5_lst"] },
  { id: "water", label: "Water seen from space", tone: "water", ids: ["ZW_tws_grace", "ZW_gws"] },
  { id: "climate", label: "Climate", tone: "muted", ids: ["Z4_precip", "Z4_t2m", "ZW_t2m"] },
];

const CHOICE_LABEL: Record<string, string> = {
  Z2_ndvi: "Villacurí plains",
  Z1_ndvi: "Ica Valley",
  Z5_ndvi: "Desert control",
  Z2_vs_Z5_ndvi: "Villacurí minus desert",
  Z1_vs_Z5_ndvi: "Ica Valley minus desert",
  Z2_et: "Villacurí plains",
  Z1_et: "Ica Valley",
  ZW_gws: "Groundwater model (GLDAS)",
  ZW_tws_grace: "Total water (GRACE)",
  Z4_precip: "Rain, upper Ica basin",
  Z2_lst: "Villacurí plains",
  Z1_lst: "Ica Valley",
  Z5_lst: "Desert control",
  Z2_vs_Z5_lst: "Villacurí minus desert",
  Z1_vs_Z5_lst: "Ica Valley minus desert",
  Z4_t2m: "Air, upper Ica basin",
  ZW_t2m: "Air, whole region",
};

const shortUnits = (u: string) => u.replace("NDVI units", "NDVI").replace("standard deviations", "SD").replace("degC", "°C");

/** Point estimate and 95% range against zero, each row on its own scale: the question is only "does it cross 0?". */
export function EffectBar({ est, lo, hi, big = false }: { est: number | null; lo: number | null; hi: number | null; big?: boolean }) {
  if (est === null || lo === null || hi === null) return <span className="effect empty" />;
  const a = Math.min(0, lo), b = Math.max(0, hi);
  const pad = (b - a) * 0.18 || 1;
  const x = (v: number) => ((v - (a - pad)) / (b - a + 2 * pad)) * 100;
  const excludes = lo > 0 || hi < 0;
  return (
    <span className={`effect ${big ? "big" : ""} ${excludes ? "sure" : "unsure"}`}
      aria-label={`95% range ${fmt(lo)} to ${fmt(hi)}, ${excludes ? "does not include zero" : "includes zero"}`}>
      <span className="zero" style={{ left: `${x(0)}%` }} />
      <span className="ci" style={{ left: `${x(lo)}%`, width: `${Math.max(0.8, x(hi) - x(lo))}%` }} />
      <span className="pt" style={{ left: `${x(est)}%` }} />
      {big && <span className="zero-l" style={{ left: `${x(0)}%` }}>0 = no change</span>}
    </span>
  );
}

export function VerdictBoard(props: { manifest: Manifest; caseId: string; onSelect: (id: string) => void }) {
  const { manifest, caseId, onSelect } = props;
  const byId = Object.fromEntries(manifest.cases.map((c) => [c.id, c]));
  return (
    <div className="board" role="list">
      <div className="board-head" aria-hidden="true">
        <span>Case</span><span>Estimate and 95% range vs zero (own scale per row)</span><span>Per decade</span><span>Verdict</span>
      </div>
      {GROUPS.map((g) => (
        <div key={g.id} className={`board-group t-${g.tone}`}>
          <span className="board-g"><i />{g.label}</span>
          {g.ids.filter((id) => byId[id]).map((id) => {
            const c: CaseRef = byId[id];
            return (
              <button key={id} id={`case-${id}`} role="listitem" className={`board-row ${caseId === id ? "on" : ""}`}
                aria-pressed={caseId === id} onClick={() => onSelect(id)}>
                <span className="br-name">{CHOICE_LABEL[id] ?? c.zone_name}<span className="br-type">{DATA_TYPE_TEXT[c.data_type]}</span></span>
                <EffectBar est={c.sen_per_decade} lo={c.ci95[0]} hi={c.ci95[1]} />
                <span className="br-val num">{signed(c.sen_per_decade, 2)} <span className="muted">{shortUnits(c.units)}</span></span>
                <span className="br-v"><span className={`pill ${c.verdict}`}>{manifest.verdict_labels[c.verdict]}</span></span>
              </button>
            );
          })}
        </div>
      ))}
      <p className="board-note small muted">
        Each bar shows the estimated change (dot) and its 95% range on its own scale, so compare positions against the dashed zero line,
        not bar lengths across rows. If the range crosses zero, the data cannot rule out “no change”. Click any row to open its case file.
      </p>
    </div>
  );
}

function Criteria({ cf }: { cf: CaseFileT }) {
  const keys: CriterionKey[] = ["C0", "C1", "C2", "C3", "C4", "C5"];
  return (
    <ul className="criteria" aria-label="Verdict criteria">
      {keys.map((k) => {
        const v = cf.criteria[k];
        const cls = v === true ? "ok" : v === false ? "no" : "na";
        const mark = v === true ? "✓" : v === false ? "✗" : "–";
        return (
          <li key={k}>
            <span className={`mark ${cls}`} aria-label={v === true ? "passes" : v === false ? "fails" : "not run"}>{mark}</span>
            <span>{cf.criteria_labels[k]}</span>
          </li>
        );
      })}
    </ul>
  );
}

function WindowStrip({ cf }: { cf: CaseFileT }) {
  const sign = Math.sign(cf.trend.sen_per_decade ?? 0);
  return (
    <div className="windows">
      <span className="eyebrow">Nine time windows</span>
      <div className="win-grid">
        {cf.trend.windows.map((w) => {
          const same = Math.sign(w.sen_per_decade ?? 0) === sign;
          const sig = (w.p_block_bootstrap ?? 1) < 0.05 && same;
          return (
            <span key={`${w.start}-${w.end}`} className={`win ${sig ? "sig" : same ? "same" : "flip"}`}
              title={`${w.start}–${w.end}: ${signed(w.sen_per_decade)} per decade, ${pfull(w.p_block_bootstrap)}`} />
          );
        })}
      </div>
      <span className="small muted">Start 2004–2006 × end 2022–2024. Filled: significant, same direction. Outline: same direction. Dashed: flips.</span>
    </div>
  );
}

/** The memory meter: 21 years x 12 months, with only n_eff of them carrying independent information. */
export function MemoryMeter({ phi, n, nEff, level }: { phi: number | null; n: number; nEff: number | null; level: Level }) {
  if (phi === null || nEff === null) return null;
  const keep = new Set<number>();
  const k = Math.max(1, Math.round(nEff));
  for (let i = 0; i < k; i++) keep.add(Math.round(((i + 0.5) * n) / k));
  const pctMem = Math.max(0, Math.min(1, phi));
  return (
    <div className="memory-meter">
      <div className="mm-head">
        <span className="eyebrow">{level === "explorer" ? "How much this witness repeats itself" : "Month-to-month memory"}</span>
        <span className="mm-phi">{level === "explorer" ? `${Math.round(pctMem * 100)}%` : <Tex>{`\\hat\\phi = ${fmt(phi, 2)}`}</Tex>}</span>
      </div>
      <div className="mm-bar"><span style={{ width: `${pctMem * 100}%` }} /></div>
      <div className="mm-grid" aria-label={`${n} months behave like about ${Math.round(nEff)} independent ones`}>
        {Array.from({ length: n }, (_, i) => <i key={i} className={keep.has(i) ? "on" : ""} />)}
      </div>
      <p className="small">
        {level === "explorer"
          ? <>Each month looks a lot like the one before. So these <b>{n} months</b> tell us about as much as <b>{Math.round(nEff)}</b> truly separate clues.</>
          : <>The {n} months carry about as much information as <b>{Math.round(nEff)}</b> independent ones (<Tex>{"n_{\\text{eff}} = n\\,\\tfrac{1-\\hat\\phi}{1+\\hat\\phi}"}</Tex>). A test that counts all {n} overstates the evidence.</>}
      </p>
    </div>
  );
}

/** Shown on every case where the classic test and the honest tests disagree. */
function FalseAlarm({ cf, level }: { cf: CaseFileT; level: Level }) {
  const tr = cf.trend;
  const fires = cf.classic_test_says_significant;
  if (!fires || cf.verdict === "confirmed") return null;
  const dir = (tr.sen_per_decade ?? 0) > 0 ? "rising" : "falling";
  return (
    <div className="false-alarm" role="note">
      <span className="fa-icon" aria-hidden="true">!</span>
      <div>
        <strong>False-alarm warning.</strong>{" "}
        {level === "explorer"
          ? <>The usual test shouts “it's {dir}!”, but it is fooled because this witness repeats itself. Checked properly: <b>{cf.verdict_label.toLowerCase()}</b>.</>
          : <>The classic Mann-Kendall test reports a {dir} trend ({pfull(tr.p_mk_classic)}). It treats {cf.n_valid} months as independent; with
            {" "}<Tex>{`\\hat\\phi = ${fmt(tr.phi, 2)}`}</Tex> they are worth about {tr.n_eff}. The honest tests say: <b>{cf.verdict_label.toLowerCase()}</b>.</>}
      </div>
    </div>
  );
}

const PLAIN: Record<string, string> = {
  confirmed: "Case closed: the change is real.",
  likely: "Strong lead: the change is probably real, but not every check passed.",
  inconclusive: "Not proven. Something may be changing, but the data cannot tell yet. That is not the same as “no change”.",
  insufficient_data: "Not enough evidence to judge.",
};

export function CaseFileView({ caseRef, level = "expert", tabbed = false }: { caseRef: CaseRef; level?: Level; tabbed?: boolean }) {
  const { data: cf, error } = useJSON<CaseFileT>(caseRef.path);
  const [mode, setMode] = useState<"anomaly" | "value">("anomaly");
  // In the one-screen layout the case file has two tabs: the chart, and the memory meter with the numbers.
  const [tab, setTab] = useState<"chart" | "numbers">("chart");
  const showChart = !tabbed || tab === "chart";
  const showNumbers = !tabbed || tab === "numbers";
  if (error) return <div className="error">{error}</div>;
  if (!cf || cf.id !== caseRef.id) return <div className="loading">Opening the case file…</div>;
  const tone = cf.witness === "greenness" ? "green" : cf.witness === "water" ? "water" : cf.witness === "heat" ? "heat" : "climate";
  const tr = cf.trend;
  const isContrast = cf.kind === "contrast";
  const units = isContrast ? "SD" : shortUnits(cf.units);
  const classicFires = cf.classic_test_says_significant;
  const misled = classicFires && cf.verdict !== "confirmed";
  const controls = tr.confounders.some((c) => c.toLowerCase().includes("rain")) ? "\\text{El Niño, rain}" : "\\text{El Niño}";
  const ex = level === "explorer";
  const pro = level === "expert";
  const s = tr.sen_per_decade ?? 0;
  const dirWord = s > 0 ? "went up" : s < 0 ? "went down" : "stayed flat";
  return (
    <div className="casefile" id="casefile">
      <div className="panel">
        <FalseAlarm cf={cf} level={level} />
        <div className="case-head">
          <div style={{ display: "grid", gap: 4 }}>
            <span className="eyebrow">Case file · {cf.zone.name}</span>
            <h3>{cf.label}</h3>
          </div>
          <div className="badges">
            <span className="badge">{DATA_TYPE_TEXT[cf.data_type]}</span>
            <span className="badge">{cf.source.resolution.split(",")[0]}</span>
            <span className="badge">2004–2024</span>
          </div>
        </div>
        {tabbed && (
          <div className="cf-tabs" role="tablist" aria-label="Case file view">
            <button role="tab" id="cf-tab-chart" aria-selected={tab === "chart"} onClick={() => setTab("chart")}>The evidence</button>
            <button role="tab" id="cf-tab-numbers" aria-selected={tab === "numbers"} onClick={() => setTab("numbers")}>{ex ? "Memory" : "Memory and numbers"}</button>
          </div>
        )}
        {showChart && <>
        <p className="definition">{cf.definition}</p>
        {!isContrast && !ex && (
          <div className="toggle" role="group" aria-label="Chart view">
            <button id="view-anomaly" aria-pressed={mode === "anomaly"} onClick={() => setMode("anomaly")}>Seasons removed + trend</button>
            <button id="view-value" aria-pressed={mode === "value"} onClick={() => setMode("value")}>Raw monthly values</button>
          </div>
        )}
        <TrendChart series={cf.series} trend={tr} mode={isContrast || ex ? "anomaly" : mode} tone={tone} units={units} />
        <div className="legend">
          {mode === "anomaly" || isContrast || ex ? (
            <>
              <span><i style={{ background: `var(--${tone === "climate" ? "muted" : tone})` }} />{ex ? "Each month, compared with a normal month" : `Monthly ${isContrast ? "gap" : "anomaly"}`}</span>
              <span><i style={{ background: "var(--ink)", height: 3 }} />{ex ? "The trend" : "Sen trend line"}</span>
              {!ex && <span><i style={{ background: "var(--ink)", opacity: 0.15, height: 10 }} />Range of plausible slopes (95%)</span>}
            </>
          ) : (
            <>
              <span><i style={{ background: `var(--${tone === "climate" ? "muted" : tone})` }} />Monthly value</span>
              <span><i style={{ background: `var(--${tone === "climate" ? "ink" : tone})`, height: 3 }} />Annual mean</span>
            </>
          )}
          {cf.n_valid < cf.n && <span><i style={{ background: "var(--surface-2)", height: 10 }} />No data ({cf.n - cf.n_valid} months)</span>}
        </div>
        <p className="summary">{ex ? <>Over 2004–2024 it <b>{dirWord}</b>. {PLAIN[cf.verdict]}</> : cf.summary}</p>
        </>}
        {showNumbers && <>
        {cf.notes.length > 0 && !ex && <ul className="notes">{cf.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
        <MemoryMeter phi={tr.phi} n={cf.n_valid} nEff={tr.n_eff} level={level} />
        {!ex && (
          <div className="stats">
            <div className="stat"><span className="k"><Tex>{"\\hat{\\beta}_{\\text{Sen}}"}</Tex> per decade</span><span className="v">{signed(tr.sen_per_decade)} {units}</span></div>
            <div className="stat"><span className="k"><Tex>{"\\text{CI}_{95\\%}"}</Tex> block bootstrap</span><span className="v">{fmt(tr.sen_ci95_block_bootstrap[0])} to {fmt(tr.sen_ci95_block_bootstrap[1])}</span></div>
            <div className="stat"><span className="k"><Tex>{"p_{\\text{MK}}"}</Tex> block bootstrap</span><span className="v">{pfull(tr.p_block_bootstrap)}</span></div>
            <div className="stat"><span className="k"><Tex>{"p_{\\text{AR}}"}</Tex> AR-error regression</span><span className="v">{pfull(tr.p_arma)}</span></div>
            {pro && <div className="stat"><span className="k"><Tex>{`\\hat{\\beta}\\mid ${controls}`}</Tex></span><span className="v">{signed(tr.beta_with_confounders_per_decade)} ({pfull(tr.p_with_confounders)})</span></div>}
            {pro && tr.arma_order && <div className="stat"><span className="k">Error model (AIC)</span><span className="v">ARMA({tr.arma_order[0]},{tr.arma_order[2] ?? 0})</span></div>}
            {pro && tr.enso_lag_months !== null && <div className="stat"><span className="k">El Niño lag (AIC)</span><span className="v">{tr.enso_lag_months} months</span></div>}
            {pro && <div className="stat"><span className="k">Jackknife (leave a year out)</span><span className="v">{tr.jackknife_significant} of {tr.jackknife_n} significant</span></div>}
            {tr.years_to_detect !== null && tr.years_to_detect < 200 && (
              <div className="stat"><span className="k"><Tex>{"n^{*}"}</Tex> years to detect</span><span className="v">≈ {fmt(tr.years_to_detect, 2)}</span></div>
            )}
          </div>
        )}
        <p className="source-line">
          Source: {cf.source.agency} {cf.source.product} {cf.source.version}, {cf.source.resolution}.{" "}
          DOI <a href={`https://doi.org/${cf.source.doi}`} target="_blank" rel="noreferrer">{cf.source.doi}</a>.{!ex && ` ${cf.summary_note}`}
        </p>
        </>}
      </div>

      <aside className="panel verdict-box" aria-label="Verdict">
        <span className="eyebrow">Verdict</span>
        <span className={`stamp ${cf.verdict}`}>{cf.verdict_label}</span>
        <div>
          <div className="figure-big num">{signed(tr.sen_per_decade)}</div>
          <div className="small muted">{units} per decade</div>
        </div>
        {!ex && <EffectBar est={tr.sen_per_decade} lo={tr.sen_ci95_block_bootstrap[0]} hi={tr.sen_ci95_block_bootstrap[1]} big />}
        {ex && <p className="small">{PLAIN[cf.verdict]}</p>}
        {!ex && <Criteria cf={cf} />}
        {pro && <WindowStrip cf={cf} />}
        <div className={`classic ${misled ? "" : "quiet"}`}>
          <strong style={{ fontSize: "0.9rem" }}>{ex ? "What the usual test would say" : "What a classic test would have said"}</strong>
          <span>
            {ex ? <>{classicFires ? "“Definitely changing!”" : "“No change.”"}</>
              : <>Classic Mann-Kendall: {pfull(tr.p_mk_classic)}, so {classicFires ? <b>“significant trend”</b> : "no trend"}.</>}
          </span>
          <span className="muted">
            {misled
              ? (ex ? "It got fooled: it counted every month as a separate clue." : <>It counts {cf.n_valid} independent months; with <Tex>{`\\hat\\phi = ${fmt(tr.phi, 2)}`}</Tex> they are worth about {tr.n_eff}.</>)
              : classicFires
              ? "Here the classic test and the honest tests agree."
              : "Here the classic test also finds no trend."}
          </span>
        </div>
      </aside>
    </div>
  );
}
