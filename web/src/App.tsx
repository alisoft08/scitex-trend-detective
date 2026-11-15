// AI-assisted: Claude (Anthropic). Oasis Paradox app. Explorer = guided mission; Analyst and Expert = a deck of
// full-screen views (case, evidence, investigate, map, why, method, sources), one screen each, with tabs inside.
import { useEffect, useState, type ReactNode } from "react";
import { VerdictBoard } from "./CaseFile";
import { SimulationChart, WitnessChart } from "./charts";
import { brandAsset, useJSON } from "./data";
import { ImpactTiles, WhyMissed } from "./Impact";
import { HeroMap } from "./HeroMap";
import { Lab } from "./Lab";
import { MapView } from "./MapView";
import { Tex } from "./Tex";
import { Validation } from "./Validation";
import { WitnessCards } from "./WitnessCards";
import { Workspace, type Pick } from "./Workspace";
import { Welcome, useWelcome } from "./Welcome";
import { Mission } from "./Mission";
import { DICTS, LANGS, useLang, type Lang } from "./i18n";
import { LEVELS, useLevel, type Level } from "./levels";
import { pct } from "./format";
import type { Manifest, Simulation, Witnesses } from "./types";

const VIEWS = [
  { id: "case", key: "verdict" },
  { id: "evidence", key: "evidence" },
  { id: "investigate", key: "investigate" },
  { id: "map", key: "map" },
  { id: "why", key: "why" },
  { id: "method", key: "method" },
  { id: "sources", key: "sources" },
] as const;
type DeckId = (typeof VIEWS)[number]["id"];
/** "mission" is the Explorer mission; every other route is a deck view. Without a hash the app opens on the home (case). */
type ViewId = DeckId | "mission";
const ALIAS: Record<string, ViewId> = { explorer: "mission", top: "case", verdict: "case", where: "map", methods: "method", about: "sources", data: "sources" };

function viewFromHash(): ViewId | null {
  const h = location.hash.replace(/^#/, "");
  if (VIEWS.some((v) => v.id === h)) return h as ViewId;
  if (/^(mission|explorer)(-[0-5])?$/.test(h)) return "mission";
  return ALIAS[h] ?? null;
}

/** The current view lives in the URL hash (#map, #method…), so every view can be linked and the back button works. */
function useView(): [ViewId, (v: ViewId) => void] {
  const [view, setViewState] = useState<ViewId>(() => viewFromHash() ?? "case");
  useEffect(() => {
    const on = () => { const v = viewFromHash() ?? (location.hash === "" ? "case" : null); if (v) { setViewState(v); window.scrollTo(0, 0); } };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const setView = (v: ViewId) => {
    setViewState(v);
    // The mission keeps a clean URL, so reloading the page always lands on the home (the lens map).
    const target = v === "mission" ? location.pathname + location.search : `#${v}`;
    if (v === "mission" ? location.hash !== "" : location.hash !== `#${v}`) { try { history.pushState(null, "", target); } catch { /* sandboxed: state only */ } }
    window.scrollTo(0, 0);
  };
  return [view, setView];
}

function Nav({ level, setLevel, onHelp, lang, setLang, mission, view, setView }: {
  level: Level; setLevel: (l: Level) => void; onHelp: () => void; lang: Lang; setLang: (l: Lang) => void;
  mission: boolean; view: ViewId; setView: (v: ViewId) => void;
}) {
  const d = DICTS[lang];
  const idx = VIEWS.findIndex((v) => v.id === view);
  return (
    <nav className="topnav" aria-label="Views">
      <div className="wrap">
        <a href="#case" className="brand" onClick={(e) => { e.preventDefault(); setView("case"); }}>Oasis <span>Paradox</span><small>by Team SciTeX</small></a>
        {!mission && (
          <div className="nav">
            {VIEWS.map((v, i) => (
              <a key={v.id} href={`#${v.id}`} className={view === v.id ? "on" : ""} aria-current={view === v.id ? "page" : undefined}
                onClick={(e) => { e.preventDefault(); setView(v.id); }}>
                <b>{String(i + 1).padStart(2, "0")}</b>{d.nav[v.key]}
              </a>
            ))}
          </div>
        )}
        <div className="level-switch" role="group" aria-label="Reading level">
          {LEVELS.map((l) => (
            <button key={l.id} id={`nav-level-${l.id}`} aria-pressed={level === l.id} onClick={() => setLevel(l.id)} title={d.levels[l.id].who}>{d.levels[l.id].name}</button>
          ))}
        </div>
        <label className="level-select" title="Reading level">
          <span className="sr-only">Reading level</span>
          <select id="nav-level-select" value={level} onChange={(e) => setLevel(e.target.value as Level)} aria-label="Reading level">
            {LEVELS.map((l) => <option key={l.id} value={l.id}>{d.levels[l.id].name}</option>)}
          </select>
        </label>
        <label className="nav-lang" title={d.nav.language}>
          <span className="sr-only">{d.nav.language}</span>
          <select id="nav-lang" value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label={d.nav.language}>
            {LANGS.map((l) => <option key={l.id} value={l.id}>{l.short} · {l.label}</option>)}
          </select>
        </label>
        <button className="nav-help" id="nav-welcome" onClick={onHelp} aria-label={d.nav.help} title={d.nav.help}>?</button>
      </div>
      {!mission && <span className="progress" style={{ transform: `scaleX(${(idx + 1) / VIEWS.length})` }} aria-hidden="true" />}
    </nav>
  );
}

interface Tab { id: string; label: string }

/** One full-screen view: a compact header (number, title, tabs, previous/next) and a body that fills the screen. */
function View({ id, n, kicker, title, tabs, tab, setTab, prev, next, note, jump, children }: {
  id: ViewId; n: number; kicker: string; title: ReactNode; tabs?: Tab[]; tab?: string; setTab?: (t: string) => void;
  prev?: { label: string; go: () => void }; next?: { label: string; go: () => void }; note?: string;
  jump?: { options: { id: ViewId; label: string }[]; go: (v: ViewId) => void }; children: ReactNode;
}) {
  return (
    <section className={`view view-${id}`} id={`v-${id}`} aria-label={kicker}>
      <div className="wrap wide view-in">
        <header className="view-head">
          <div className="vh-title">
            <span className="eyebrow"><b className="sec-n">{String(n).padStart(2, "0")}</b> {kicker}{note && <span className="vh-note">{note}</span>}</span>
            {jump && (
              <label className="vh-jump">
                <span className="sr-only">Go to view</span>
                <select value={id} onChange={(e) => jump.go(e.target.value as ViewId)} aria-label="Go to view">
                  {jump.options.map((o, i) => <option key={o.id} value={o.id}>{String(i + 1).padStart(2, "0")} · {o.label}</option>)}
                </select>
              </label>
            )}
            <h2>{title}</h2>
          </div>
          {tabs && tabs.length > 1 && (
            <div className="subtabs" role="tablist" aria-label={`${kicker}: parts`}>
              {tabs.map((t) => (
                <button key={t.id} role="tab" id={`tab-${id}-${t.id}`} aria-selected={tab === t.id} onClick={() => setTab?.(t.id)}>{t.label}</button>
              ))}
            </div>
          )}
          <div className="vh-arrows">
            {prev && <button className="vh-arrow" onClick={prev.go} aria-label={`Previous: ${prev.label}`} title={prev.label}>←</button>}
            {next && <button className="vh-arrow next" onClick={next.go} aria-label={`Next: ${next.label}`}><span className="vh-next-l">{next.label}</span> →</button>}
          </div>
        </header>
        <div className="view-body" key={tab}>{children}</div>
      </div>
    </section>
  );
}

const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName));

export default function App() {
  const { data: m, error } = useJSON<Manifest>("manifest.json");
  const { data: sim } = useJSON<Simulation>("simulation.json");
  const { data: wit } = useJSON<Witnesses>("witnesses.json");
  const [level, setLevel] = useLevel();
  const [welcomeOpen, closeWelcome, openWelcome] = useWelcome();
  const [lang, setLang] = useLang();
  const [view, setView] = useView();
  const [tabs, setTabs] = useState<Record<string, string>>({});
  const tabOf = (v: DeckId, first: string) => tabs[v] ?? first;
  const setTab = (v: DeckId) => (t: string) => setTabs((s) => ({ ...s, [v]: t }));
  // A shareable link straight into the Explorer mission: …#mission (or #explorer); #mission-3 opens chapter 3.
  const [missionStart, setMissionStart] = useState(0);
  const [missionKey, setMissionKey] = useState(0);
  useEffect(() => {
    const go = () => {
      const h = /^#(mission|explorer)(?:-([0-5]))?$/.exec(location.hash);
      if (!h) return;
      setLevel("explorer"); closeWelcome();
      setMissionStart(Number(h[2] ?? 0)); setMissionKey((k) => k + 1); window.scrollTo(0, 0);
    };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, []);
  const [pick, setPick] = useState<Pick>({ zone: "Z2", variable: "ndvi", vsDesert: false });
  const missionMode = view === "mission";
  const startMission = () => { setLevel("explorer"); setMissionStart(0); setMissionKey((k) => k + 1); setView("mission"); };

  // Arrow keys move between views (not while typing or using a slider).
  useEffect(() => {
    if (missionMode) return;
    const on = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || isTyping(e.target) || welcomeOpen) return;
      const i = VIEWS.findIndex((v) => v.id === view);
      if (e.key === "ArrowRight" && i < VIEWS.length - 1) setView(VIEWS[i + 1].id);
      if (e.key === "ArrowLeft" && i > 0) setView(VIEWS[i - 1].id);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [view, missionMode, welcomeOpen]);

  if (error) return <div className="wrap" style={{ paddingBlock: "3rem" }}><div className="error">{error}</div></div>;
  if (!m) return <div className="wrap loading">Loading the evidence…</div>;
  const d = DICTS[lang];
  const caseId = pick.vsDesert ? `${pick.zone}_vs_Z5_${pick.variable}` : `${pick.zone}_${pick.variable}`;
  const openCase = (id: string) => {
    const vs = id.includes("_vs_Z5_");
    const zone = id.split("_")[0];
    const variable = vs ? id.split("_vs_Z5_")[1] : id.slice(zone.length + 1);
    setPick({ zone, variable, vsDesert: vs });
    setTabs((s) => ({ ...s, investigate: "desk" }));
    setView("investigate");
  };
  const fp = sim?.false_positive.find((f) => f.phi === 0.9);
  const pw = sim?.power.find((f) => f.phi === 0.9);
  const im = m.impact;
  const expert = level === "expert";
  const englishOnly = lang !== "en" && level !== "explorer" ? d.nav.englishOnly : undefined;
  const idx = VIEWS.findIndex((v) => v.id === view);
  const nav = (i: number) => {
    const v = VIEWS[i];
    return v ? { label: d.nav[v.key], go: () => setView(v.id) } : undefined;
  };
  const jump = { options: VIEWS.map((v) => ({ id: v.id, label: d.nav[v.key] })), go: setView };
  const common = { n: idx + 1, prev: nav(idx - 1), next: nav(idx + 1), note: englishOnly, jump };

  const investigateTab = tabOf("investigate", "desk");
  const whyTab = tabOf("why", "witnesses");
  const methodTab = tabOf("method", "lab");
  const sourcesTab = tabOf("sources", "data");

  return (
    <>
      <Nav level={level} setLevel={setLevel} onHelp={openWelcome} lang={lang} setLang={setLang} mission={missionMode} view={view} setView={setView} />
      <Welcome open={welcomeOpen} level={level} lang={lang} onClose={closeWelcome}
        onPick={(l) => { if (l === "explorer") startMission(); else { setLevel(l); if (missionMode) setView("case"); } }} />
      {missionMode && (
        <Mission key={missionKey} m={m} lang={lang} startAt={missionStart} onFullTool={() => setView("evidence")}
          onAnalyst={() => { setLevel("analyst"); setView("evidence"); }} />
      )}

      {!missionMode && (
        <main className={`deck lv-${level}`}>
          {view === "case" && (
            <section className="view view-case" id="v-case" aria-label="The case">
              <HeroMap m={m} onMap={() => setView("map")}
                primary={level === "explorer"
                  ? { label: `${d.m.brief.start} →`, go: startMission }
                  : { label: "See the evidence →", go: () => setView("evidence") }}
                onMission={level === "explorer" ? undefined : startMission} />
            </section>
          )}

          {view === "evidence" && (
            <View id="evidence" kicker="The case at a glance" title="Three witnesses, three answers." {...common}>
              <div className="ev-grid">
                <ImpactTiles m={m} sim={sim} />
                <WitnessCards m={m} wit={wit} goTo={openCase} toMap={() => setView("map")} />
              </div>
            </View>
          )}

          {view === "investigate" && (
            <View id="investigate" kicker="Investigate" title="Pick a place. Call a witness. Let the evidence decide." {...common}
              tabs={[{ id: "desk", label: "Detective desk" }, { id: "guided", label: "Guided cases" }, { id: "board", label: `All ${m.cases.length} cases` }]}
              tab={investigateTab} setTab={setTab("investigate")}>
              {investigateTab === "desk" && <Workspace m={m} level={level} pick={pick} setPick={setPick} tabbed />}
              {investigateTab === "guided" && (
                <div className="tours-grid" role="group" aria-label="Guided cases">
                  {m.demo_cases.map((dc, i) => (
                    <button key={dc.id} id={`demo-${dc.id}`} className="tour big" onClick={() => openCase(dc.case ?? dc.cases![0])}>
                      <span className="tour-n">Case {i + 1}</span>
                      <span className="t">{dc.title}</span>
                      <span className="small muted">{dc.text}</span>
                      <span className="tour-go">Open the case file →</span>
                    </button>
                  ))}
                </div>
              )}
              {investigateTab === "board" && (
                <div className="board-fit">
                  <p className="small muted">Every case, one line. The bar is the trend per decade with its 95% range; click a row to open it on the desk.</p>
                  <VerdictBoard manifest={m} caseId={caseId} onSelect={openCase} />
                </div>
              )}
            </View>
          )}

          {view === "map" && (
            <View id="map" kicker="Where it happens" title="New fields in Villacurí. Falling wells in the valley." {...common}>
              <MapView m={m} />
            </View>
          )}

          {view === "why" && (
            <View id="why" kicker="Why the satellites miss it" title="The water drops underground. From space, it looks like it rises." {...common}
              tabs={[{ id: "witnesses", label: "Three witnesses" }, { id: "grace", label: "Why GRACE misses it" }, { id: "crops", label: "The water crops use" }]}
              tab={whyTab} setTab={setTab("why")}>
              {whyTab === "witnesses" && (
                <div className="why-witnesses">
                  <p className="lede-2">Yearly anomalies of the three witnesses on one scale. Greenness and GRACE both climb; the GLDAS model shows no proven
                    trend. Only the wells, at the scale of a single field, see the water table fall.</p>
                  {wit ? <WitnessChart data={wit} /> : <div className="loading">Loading…</div>}
                </div>
              )}
              {whyTab === "grace" && <WhyMissed m={m} part="grace" />}
              {whyTab === "crops" && <WhyMissed m={m} part="crops" />}
            </View>
          )}

          {view === "method" && (
            <View id="method" kicker="Test the tests" title="Before judging Ica, we put our own tests on trial." {...common}
              tabs={[
                { id: "lab", label: "The lab" },
                { id: "engine", label: "The engine" },
                { id: "rule", label: "The rule" },
                ...(expert ? [{ id: "tests", label: "All six tests" }] : []),
                { id: "validation", label: "Validation" },
                { id: "limits", label: "Limits" },
              ]}
              tab={methodTab === "tests" && !expert ? "lab" : methodTab} setTab={setTab("method")}>
              {(methodTab === "lab" || (methodTab === "tests" && !expert)) && <Lab level={level} />}
              {methodTab === "tests" && expert && (sim ? <div className="tests-fit"><SimulationChart sim={sim} /></div> : <div className="loading">Loading…</div>)}
              {methodTab === "engine" && (
                <ol className="engine">
                  <li>
                    <span className="e-n">1</span>
                    <div><b>Remove the seasons.</b> Compare each month with the average of its calendar month.
                      <Tex block>{"x'_t = x_t - \\bar{x}_{m(t)}"}</Tex></div>
                  </li>
                  <li>
                    <span className="e-n">2</span>
                    <div><b>Measure the change.</b> Theil-Sen slope: the median of all pairwise slopes, so an El Niño spike cannot drag it.
                      <Tex block>{"\\hat\\beta_{\\text{Sen}} = \\operatorname*{median}_{i<j}\\ \\frac{x'_j - x'_i}{t_j - t_i}"}</Tex></div>
                  </li>
                  <li>
                    <span className="e-n">3</span>
                    <div><b>Test it two honest ways.</b> Mann-Kendall with a block bootstrap (36-month blocks keep the memory, 999 resamples)
                      and a regression with ARMA errors. Both must agree.
                      <Tex block>{"S = \\sum_{i<j}\\operatorname{sgn}(x'_j - x'_i), \\qquad x'_t = \\alpha + \\beta t + \\varepsilon_t,\\ \\ \\varepsilon_t \\sim \\text{ARMA}(p,q)"}</Tex></div>
                  </li>
                  <li>
                    <span className="e-n">4</span>
                    <div><b>Rule out the usual suspects.</b> Repeat with the coastal El Niño index (lag chosen by AIC), the ONI and headwater rain.
                      <Tex block>{"x'_t = \\alpha + \\beta t + \\gamma\\,\\text{ICEN}_{t-k} + \\delta\\,\\text{ONI}_t + \\eta\\,P^{(12)}_t + \\varepsilon_t"}</Tex></div>
                  </li>
                  <li>
                    <span className="e-n">5</span>
                    <div><b>Shake it.</b> Nine start and end windows and 21 leave-one-year-out fits. A real trend survives them.</div>
                  </li>
                  <li>
                    <span className="e-n">6</span>
                    <div><b>Compare with untouched desert.</b> Farm minus desert, both standardized, removes the weather they share.
                      <Tex block>{"d_t = z^{\\text{farm}}_t - z^{\\text{desert}}_t"}</Tex></div>
                  </li>
                </ol>
              )}
              {methodTab === "rule" && (
                <div className="rule-fit">
                  <div className="rule" id="rule">
                    <span className="eyebrow">The pre-registered rule (fixed before seeing Ica's data)</span>
                    <Tex block>{"\\textbf{Confirmed} \\iff \\underbrace{p_{\\text{MK}}<0.05 \\wedge p_{\\text{AR}}<0.05}_{C_1} \\;\\wedge\\; \\underbrace{0\\notin \\text{CI}_{95\\%}}_{C_2} \\;\\wedge\\; \\underbrace{\\tfrac{9}{9}\\ \\text{same sign},\\ \\geq\\tfrac{7}{9}\\ \\text{significant}}_{C_3} \\;\\wedge\\; \\underbrace{\\geq\\tfrac{19}{21}\\ \\text{jackknife}}_{C_4} \\;\\wedge\\; \\underbrace{\\hat\\beta\\mid\\text{controls}}_{C_5}"}</Tex>
                    <p className="small">
                      <b>Likely:</b> both tests below 0.05, or one below 0.05 and the other below 0.10 with all nine windows agreeing.
                      <b> Inconclusive:</b> anything weaker. It means not proven, never “no change”. <b>Insufficient data:</b> under 80% of months or 15 years.
                    </p>
                  </div>
                  {fp && pw && (
                    <div className="sim-read">
                      <div><span className="big num">{pct(fp.mk_classic)}</span><span className="small">false alarms, classic Mann-Kendall</span></div>
                      <div><span className="big num accent">{pct(fp.consensus)}</span><span className="small">false alarms, our rule</span></div>
                      <div><span className="big num">{pct(pw.consensus)}</span><span className="small">real trends still caught (vs {pct(pw.mk_classic)} classic). We prefer “inconclusive” to a false alarm.</span></div>
                    </div>
                  )}
                  <div className="memory">
                    <Tex block>{`n_{\\text{eff}} = n\\,\\frac{1-\\hat\\phi}{1+\\hat\\phi} = ${im.gldas_n}\\cdot\\frac{1-${im.gldas_phi}}{1+${im.gldas_phi}} \\approx ${Math.round(im.gldas_n_eff ?? 0)}`}</Tex>
                    <p>
                      <strong>Why the classic test fails.</strong> GLDAS groundwater has month-to-month memory <Tex>{`\\hat\\phi = ${im.gldas_phi}`}</Tex>.
                      Its {im.gldas_n} months carry about as much information as {Math.round(im.gldas_n_eff ?? 0)} independent ones, but the classic test counts all {im.gldas_n}.
                    </p>
                  </div>
                </div>
              )}
              {methodTab === "validation" && <Validation />}
              {methodTab === "limits" && (
                <div className="limits">
                  <ul>
                    <li>Zones are provisional boxes with satellite masks, not official aquifer boundaries.</li>
                    <li>GLDAS is a model: it does not simulate pumping. GRACE averages about {Math.round(Math.sqrt(im.grace_footprint_km2))} km a side.</li>
                    <li>MODIS evapotranspiration tends to underestimate water use on irrigated fields.</li>
                    <li>Wells come from one public report: first and last level per well, no monthly series, so no significance test.</li>
                    <li>The overdraft figure is a published model estimate (Salmoral et al., 2020), not a measurement of our own.</li>
                    <li>A trend consistent with irrigation is not proof that irrigation caused it.</li>
                  </ul>
                </div>
              )}
            </View>
          )}

          {view === "sources" && (
            <View id="sources" kicker="Data & team" title="Every number has a source." {...common}
              tabs={[{ id: "data", label: "Datasets" }, { id: "team", label: "Team and use of AI" }]} tab={sourcesTab} setTab={setTab("sources")}>
              {sourcesTab === "data" && (
                <div className="scroll-x">
                  <table className="data">
                    <thead><tr><th>Dataset</th><th>Agency</th><th>Type</th><th>Use</th><th>DOI or link</th></tr></thead>
                    <tbody>
                      <tr><td>MODIS Terra MOD13Q1 v6.1 (NDVI, 250 m)</td><td>NASA</td><td>Observed</td><td>Greenness series and trend map</td><td><a href="https://doi.org/10.5067/MODIS/MOD13Q1.061" target="_blank" rel="noreferrer">10.5067/MODIS/MOD13Q1.061</a></td></tr>
                      <tr><td>MODIS MOD16A2GF v6.1 (evapotranspiration, 500 m)</td><td>NASA</td><td>Estimated</td><td>Water use by crops</td><td><a href="https://doi.org/10.5067/MODIS/MOD16A2GF.061" target="_blank" rel="noreferrer">10.5067/MODIS/MOD16A2GF.061</a></td></tr>
                      <tr><td>MODIS Terra MOD11A2 v6.1 (land surface temperature, 1 km)</td><td>NASA</td><td>Observed</td><td>Surface heat</td><td><a href="https://doi.org/10.5067/MODIS/MOD11A2.061" target="_blank" rel="noreferrer">10.5067/MODIS/MOD11A2.061</a></td></tr>
                      <tr><td>MERRA-2 single-level diagnostics M2T1NXSLV 5.12.4 (T2M)</td><td>NASA GMAO</td><td>Reanalysis</td><td>Air temperature (regional climate)</td><td><a href="https://doi.org/10.5067/VJAFPLI1CSIV" target="_blank" rel="noreferrer">10.5067/VJAFPLI1CSIV</a></td></tr>
                      <tr><td>GLDAS-2.2 Catchment with GRACE assimilation (0.25°)</td><td>NASA GSFC</td><td>Modeled</td><td>Groundwater storage</td><td><a href="https://doi.org/10.5067/TXBMLX370XX8" target="_blank" rel="noreferrer">10.5067/TXBMLX370XX8</a></td></tr>
                      <tr><td>GRACE/GRACE-FO JPL Mascon RL06.3Mv04 CRI</td><td>NASA JPL</td><td>Observed</td><td>Total water storage</td><td><a href="https://doi.org/10.5067/TEMSC-3JC634" target="_blank" rel="noreferrer">10.5067/TEMSC-3JC634</a></td></tr>
                      <tr><td>GPM IMERG Final Monthly V07</td><td>NASA</td><td>Observed</td><td>Headwater rain</td><td><a href="https://doi.org/10.5067/GPM/IMERG/3B-MONTH/07" target="_blank" rel="noreferrer">10.5067/GPM/IMERG/3B-MONTH/07</a></td></tr>
                      <tr><td>Landsat 5 TM and Landsat 8/9 OLI, Collection 2 Level-2</td><td>NASA / USGS</td><td>Observed</td><td>Before/after images</td><td><a href="https://www.usgs.gov/landsat-missions/landsat-collection-2" target="_blank" rel="noreferrer">USGS Collection 2</a></td></tr>
                      <tr><td>SRTM 30 m elevation</td><td>NASA / NGA</td><td>Observed</td><td>Headwater mask above 2,500 m, map relief</td><td><a href="https://doi.org/10.5067/MEaSUREs/SRTM/SRTMGL1.003" target="_blank" rel="noreferrer">10.5067/MEaSUREs/SRTM/SRTMGL1.003</a></td></tr>
                      <tr><td>HydroBASINS level 7</td><td>WWF (not NASA)</td><td>Derived</td><td>Ica River basin outline</td><td><a href="https://www.hydrosheds.org/products/hydrobasins" target="_blank" rel="noreferrer">hydrosheds.org</a></td></tr>
                      <tr><td>ERSSTv5 Niño 1+2 and ONI</td><td>NOAA CPC (not NASA)</td><td>Index</td><td>El Niño controls (ICEN-like index computed by us)</td><td><a href="https://www.cpc.ncep.noaa.gov/data/indices/" target="_blank" rel="noreferrer">cpc.ncep.noaa.gov</a></td></tr>
                      <tr><td>Piezometric network report, Sept 2025 (87 wells)</td><td>JUASVI (not NASA)</td><td>Field</td><td>Water-table change per well</td><td><a href="https://www.juasvi.com/pdfs/1760390572-informe-rmp-sep2025.pdf" target="_blank" rel="noreferrer">juasvi.com report</a></td></tr>
                    </tbody>
                  </table>
                </div>
              )}
              {sourcesTab === "team" && (
                <div className="team-fit">
                  <div className="two-col">
                    <div className="prose">
                      <h3>Team SciTeX, Lima</h3>
                      <p>Manuel (statistics and validity), Moisés (data pipeline), Jaime (zones, field context and story), Alison (app and video).
                        NASA Space Apps Challenge 2026, challenge “Be An Earth System Trend Detective!”.</p>
                      <p className="small muted">Code and text: MIT license. Well owners' names were removed from the JUASVI table.</p>
                    </div>
                    <div className="prose">
                      <h3>Use of AI</h3>
                      <p className="small">
                        Claude (Anthropic) helped write code for data extraction, the statistics engine and this app, and drafted English text.
                        Codex (OpenAI) drew the Datron mascot illustrations from the official SciTeX poses; they are marked as AI-generated in their alt text. Every AI-assisted source file is marked
                        at the top. The written verdicts on this page come from fixed templates filled with the engine's numbers; no language model
                        writes text at runtime. Results generated {m.generated_at}.
                      </p>
                      <p className="small muted">{m.provisional}</p>
                    </div>
                  </div>
                  <div className="team-foot">
                    <img className="foot-logo" src={brandAsset("scitex-logo-color.png")} alt="SciTeX" width={180} height={54}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    <span className="small muted">Oasis Paradox · NASA Space Apps Challenge 2026 · Lima. Data: NASA MODIS, GRACE/GRACE-FO, GLDAS, MERRA-2,
                      GPM IMERG, Landsat, SRTM · JUASVI wells · NOAA CPC indices.</span>
                  </div>
                </div>
              )}
            </View>
          )}
        </main>
      )}

      {missionMode && (
        <footer className="site-foot">
          <div className="wrap">
            <img className="foot-logo" src={brandAsset("scitex-logo-texto-blanco.png")} alt="SciTeX" width={180} height={54} />
            <span>Oasis Paradox · NASA Space Apps Challenge 2026 · Lima</span>
            <span className="small">Data: NASA MODIS, GRACE/GRACE-FO, GLDAS, GPM IMERG, Landsat, SRTM · JUASVI wells · NOAA CPC indices</span>
          </div>
        </footer>
      )}
    </>
  );
}
