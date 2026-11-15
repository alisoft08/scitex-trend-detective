// AI-assisted: Claude (Anthropic). World aquifer atlas: search or spin the globe to pick an aquifer, read its six NASA
// witnesses, then compare all of them. Every number comes from the engine's manifest; nothing is computed here.
import { useEffect, useMemo, useState } from "react";
import { Globe, type GlobeMarker } from "./Globe";
import { asset, useJSON } from "./data";
import { EVIDENCE_TEXT } from "./evidence";
import { fmt, signed } from "./format";
import type { Level } from "./levels";
import type { AtlasEntry, AtlasWitness, CaseFile, Manifest } from "./types";

const proven = (w?: AtlasWitness) => !!w && (w.verdict === "confirmed" || w.verdict === "likely");
const tone = (a: AtlasEntry): GlobeMarker["tone"] => !proven(a.tws) ? "flat" : (a.tws.per_decade ?? 0) < 0 ? "down" : "up";
const arrow = (t: GlobeMarker["tone"]) => t === "down" ? "↓" : t === "up" ? "↑" : "?";
/** Water storage in mm per year; the other witnesses per decade in their own units. */
function amount(w: AtlasWitness) {
  if (w.per_decade === null) return "n/a";
  if (w.units === "mm") return `${signed(w.per_decade / 10, 2)} mm/yr`;
  const u = w.units === "NDVI units" ? "NDVI" : w.units === "degC" ? "°C" : w.units;
  return `${signed(w.per_decade, 2)} ${u}/decade`;
}
/** Short name: drops the country after a comma and any parenthetical that lists several places. */
const short = (name: string) => name.replace(/ \(([^)]*)\)/, (m, inner: string) => inner.includes(",") ? "" : m).split(",")[0];
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const WITNESSES: { key: "tws" | "gws" | "rain" | "ndvi" | "et" | "t2m"; name: string; kind: string }[] = [
  { key: "tws", name: "Total water · GRACE", kind: "Observed" },
  { key: "gws", name: "Groundwater · GLDAS", kind: "Model" },
  { key: "rain", name: "Rain · GPM IMERG", kind: "Estimated" },
  { key: "ndvi", name: "Cropland greenness · MODIS", kind: "Observed" },
  { key: "et", name: "Crop water use · MODIS ET", kind: "Estimated" },
  { key: "t2m", name: "Air temperature · MERRA-2", kind: "Reanalysis" },
];

// Mini-card side per aquifer, chosen so neighbours (Arabia and Tigris-Euphrates, California and the High Plains) do not overlap.
const MINI_DIR: Record<string, NonNullable<GlobeMarker["dir"]>> = {
  ZW: "sw", ZC: "nw", ZHP: "ne", ZIN: "se", ZNC: "ne", ZAR: "sw", ZTE: "nw", ZGU: "se",
};
// Largest confirmed loss first: the globe opens on the clearest example.
const startId = (atlas: AtlasEntry[]) => [...atlas].filter((a) => tone(a) === "down")
  .sort((a, b) => (a.tws.per_decade ?? 0) - (b.tws.per_decade ?? 0))[0]?.id ?? atlas[0]?.id ?? "";

// The welcome curtain plays once per page load, not on every return to the home view.
let introPlayed = false;
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Welcome({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 2300), t2 = setTimeout(onDone, 3100);
    const skip = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "Enter") { clearTimeout(t1); clearTimeout(t2); onDone(); } };
    window.addEventListener("keydown", skip);
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener("keydown", skip); };
  }, []);
  return <div className={`atlas-welcome ${leaving ? "leaving" : ""}`} role="dialog" aria-label="Welcome" onClick={onDone}>
    <p>Welcome to <strong>Oasis Paradox</strong></p>
    <span>by SciTeX · NASA Space Apps Challenge 2026</span>
  </div>;
}

/** Short facts that rotate at the top right; every number comes from the manifest. */
function facts(m: Manifest, atlas: AtlasEntry[]): string[] {
  const falling = atlas.filter((a) => proven(a.tws) && (a.tws.per_decade ?? 0) < 0);
  const worst = [...falling].sort((a, b) => (a.tws.per_decade ?? 0) - (b.tws.per_decade ?? 0))[0];
  const alarms = atlas.reduce((n, a) => n + [a.tws, a.gws, a.rain, a.ndvi, a.et, a.t2m].filter((w) => w?.classic_false_alarm).length, 0);
  const greening = atlas.filter((a) => proven(a.ndvi) && (a.ndvi?.per_decade ?? 0) > 0 && falling.includes(a)).length;
  return [
    `One engine, the same NASA data, ${atlas.length} irrigated aquifers. GRACE confirms a loss in ${falling.length}.`,
    worst ? `${short(worst.name)} loses ${amount(worst.tws).replace("−", "")} of water: the largest confirmed loss in the atlas.` : "",
    "Where the farms are small, as in Ica, GRACE cannot see the loss. Only wells can.",
    greening ? `In ${greening} draining aquifers the cropland is getting greener and using more water.` : "",
    alarms ? `A classic trend test raised ${alarms} false alarms in these series. Our engine did not.` : "",
    `21 years of NASA data, 2004–2024: GRACE, GLDAS, GPM IMERG, MODIS and MERRA-2. ${m.cases.length} case files.`,
  ].filter(Boolean);
}

const dirOf = (w: AtlasWitness): "down" | "up" | "flat" => !proven(w) ? "flat" : (w.per_decade ?? 0) < 0 ? "down" : "up";
const bare = (w: AtlasWitness) => w.per_decade === null ? "n/a" : signed(w.units === "mm" ? w.per_decade / 10 : w.per_decade, 2);
const VERDICT_WORD: Record<AtlasWitness["verdict"], string> = { confirmed: "Confirmed", likely: "Likely", inconclusive: "Not proven", insufficient_data: "Too little data" };

/** A dot and a word: filled for confirmed, ring for likely, hollow grey when not proven. */
function Verdict({ w, compact = false }: { w: AtlasWitness; compact?: boolean }) {
  const d = dirOf(w);
  const word = d === "flat" ? VERDICT_WORD[w.verdict] : `${VERDICT_WORD[w.verdict]} ${d === "down" ? "fall" : "rise"}`;
  return <span className={`vd ${d} ${w.verdict} ${compact ? "compact" : ""}`} title={word}><i aria-hidden="true" />{compact ? <span className="sr-only">{word}</span> : word}</span>;
}

/** Annual means of the monthly anomalies, drawn as a small line (display only; no statistics here). */
function Spark({ path, tone: t }: { path: string | null; tone: "down" | "up" | "flat" }) {
  const { data } = useJSON<CaseFile>(path);
  if (!data) return <svg className="spark" viewBox="0 0 120 30" aria-hidden="true" />;
  const byYear = new Map<number, number[]>();
  for (const s of data.series) {
    if (s.anomaly === null || s.anomaly === undefined || !Number.isFinite(s.anomaly)) continue;
    const y = Number(s.date.slice(0, 4));
    byYear.set(y, [...(byYear.get(y) ?? []), s.anomaly]);
  }
  const pts = [...byYear.entries()].sort((p, q) => p[0] - q[0]).map(([y, v]) => [y, v.reduce((s, x) => s + x, 0) / v.length] as const);
  if (pts.length < 3) return <svg className="spark" viewBox="0 0 120 30" aria-hidden="true" />;
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), lo = Math.min(...ys), hi = Math.max(...ys), span = hi - lo || 1;
  const d = pts.map(([x, y], k) => `${k ? "L" : "M"}${((x - x0) / (x1 - x0 || 1)) * 116 + 2},${28 - ((y - lo) / span) * 26}`).join(" ");
  return <svg className={`spark ${t}`} viewBox="0 0 120 30" role="img" aria-label={`Annual anomalies ${x0}–${x1}`}><path d={d} /></svg>;
}

export function Atlas({ m, onCase, onIca, onPick }: {
  m: Manifest; level?: Level; onCase: (id: string) => void; onIca: () => void; onPick?: () => void;
}) {
  const atlas = m.atlas ?? [];
  const [sel, setSel] = useState<string>(() => startId(atlas));
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [intro, setIntro] = useState(() => !introPlayed && !reducedMotion());
  const [fact, setFact] = useState(0);
  useEffect(() => { introPlayed = true; }, []);
  useEffect(() => {
    if (intro || reducedMotion()) return;
    const id = setInterval(() => setFact((f) => f + 1), 6500);
    return () => clearInterval(id);
  }, [intro]);
  const shown = atlas;
  const markers: GlobeMarker[] = useMemo(() => shown.map((x) => ({ id: x.id, lonlat: x.lonlat, label: short(x.name).replace(/ \(.*\)/, ""), tone: tone(x),
    thumb: asset(`img/aquifers/${x.id}.jpg`), value: x.tws.per_decade === null ? undefined : amount(x.tws), dir: MINI_DIR[x.id] ?? "ne" })), [m.atlas]);
  if (atlas.length < 2) return null;
  const a = atlas.find((x) => x.id === sel) ?? atlas[0];
  const q = norm(query.trim());
  const matches = shown.filter((x) => !q || norm(`${x.name} ${x.countries.join(" ")}`).includes(q));
  // As wide as the screen allows: the globe fills the width and is cropped top and bottom, like Earth seen from orbit.
  const size = typeof window !== "undefined" ? Math.max(320, Math.min(1500, Math.round(window.innerWidth * 0.98))) : 1200;
  const pick = (id: string) => { setSel(id); setOpen(false); setQuery(""); onPick?.(); };
  const toDetails = () => document.getElementById("atlas-details")?.scrollIntoView({ behavior: "smooth", block: "start" });
  const callout = <div className="callout-card" key={a.id}>
    <img src={asset(`img/aquifers/${a.id}.jpg`)} alt={`Satellite view of ${a.name} (${a.id === "ZW" ? "Landsat 8/9, 2024" : "MODIS Terra, 2024"})`} />
    <div className="callout-body">
      <p className="eyebrow">{a.countries.join(", ")}</p>
      <h3>{short(a.name)}</h3>
      <p className="callout-num"><strong className="num">{amount(a.tws)}</strong> <span className={`pill ${a.tws.verdict}`}>{EVIDENCE_TEXT[a.tws.verdict]}</span></p>
      <p className="small">Total water from NASA GRACE, 2004–2024 · {fmt(a.grace_footprints, 2)} GRACE footprints</p>
      <p className="callout-reading">{a.reading}</p>
      <div className="callout-actions">
        <button className="text-button" onClick={toDetails}>All six witnesses ↓</button>
        {a.focus && <button className="text-button" onClick={onIca}>Ica deep dive: wells and fields →</button>}
      </div>
    </div>
  </div>;

  void callout; // pop-out card kept for later: pass callout={callout} to <Globe> to show it again
  return <section className={`atlas ${intro ? "intro" : "ready"}`} aria-labelledby="atlas-title" id="atlas">
    {intro && <Welcome onDone={() => setIntro(false)} />}
    <div className="atlas-stage">
      <Globe markers={markers} selected={sel} onSelect={pick} size={size} autoRotate
          label="Globe with the aquifers of the atlas. Drag or use the arrow keys to turn it; or search above." />
      <div className="atlas-overlay"><div className="wrap wide">
      <header className="atlas-head">
        <h1 id="atlas-title">Where are aquifers draining?</h1>
      </header>

      <div className="atlas-tools">
        <div className="atlas-search">
          <label htmlFor="aquifer-search" className="sr-only">Find an aquifer or a country</label>
          <input id="aquifer-search" type="search" value={query} placeholder="Search aquifer or country" autoComplete="off"
            role="combobox" aria-expanded={open} aria-controls="aquifer-list"
            onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onKeyDown={(e) => { if (e.key === "Enter" && matches[0]) { e.preventDefault(); pick(matches[0].id); } if (e.key === "Escape") setOpen(false); }} />
          {open && <ul id="aquifer-list" className="atlas-list" role="listbox" aria-label={`${matches.length} aquifers`}>
            {matches.map((x) => <li key={x.id} role="option" aria-selected={x.id === a.id}>
              <button type="button" className={`atlas-item ${x.id === a.id ? "on" : ""}`} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(x.id)}>
                <span className={`atlas-dot ${tone(x)}`} aria-hidden="true">{arrow(tone(x))}</span>
                <span className="atlas-item-text"><strong>{short(x.name)}</strong><small>{x.countries.join(", ")}</small></span>
              </button>
            </li>)}
            {matches.length === 0 && <li className="small atlas-empty">No aquifer matches “{query}”.</li>}
          </ul>}
        </div>
      </div>

      </div></div>
      {(() => { const list = facts(m, atlas); return <p className="atlas-blurb" key={fact} aria-live="polite">{list[fact % list.length]}</p>; })()}
      <div className="atlas-stage-foot"><div className="wrap wide"><p className="small atlas-legend"><span className="lg down">↓</span> falling <span className="lg up">↑</span> rising <span className="lg flat">?</span> not proven · Base map: MODIS Terra surface reflectance, 2024 (NASA)</p></div></div>
    </div>
    <div className="wrap wide">
      <section className="aq-profile" id="atlas-details" aria-live="polite">
        <div className="aq-head">
          <div className="aq-text">
            <p className="aq-meta">{a.countries.join(", ")} <span>·</span> {Math.round(a.area_km2).toLocaleString("en-US")} km² <span>·</span> {fmt(a.grace_footprints, 2)} GRACE footprints</p>
            <h2>{a.name}</h2>
            <p className="aq-desc">{a.description}</p>
            <p className="aq-reading">{a.reading}</p>
            <p className="aq-ref">Reference: {a.reference}{a.focus ? ". Ica's rain is measured over the Andean headwaters; its fields are Villacurí's." : ""}</p>
            {a.focus && <button className="aq-link" onClick={onIca}>Open the Ica deep dive, with its field wells</button>}
          </div>
          <figure className="aq-photo">
            <img src={asset(`img/aquifers/${a.id}.jpg`)} alt={`Satellite view of ${a.name}`} />
            <figcaption>{a.id === "ZW" ? "Landsat 8/9, 2024 median" : "MODIS Terra surface reflectance, 2024 growing season"} · NASA</figcaption>
          </figure>
        </div>

        <table className="aq-witnesses">
          <caption>Six NASA witnesses, 2004–2024. Select a row to open its case file.</caption>
          <thead><tr><th scope="col">Witness</th><th scope="col">Annual anomaly</th><th scope="col" className="r">Change</th><th scope="col">Verdict</th></tr></thead>
          <tbody>{WITNESSES.map(({ key, name, kind }) => {
            const w = a[key];
            if (!w) return null;
            const path = m.cases.find((c) => c.id === w.id)?.path ?? null;
            return <tr key={key} onClick={() => onCase(w.id)}>
              <th scope="row"><button type="button" onClick={(e) => { e.stopPropagation(); onCase(w.id); }}>{name}</button><small>{kind}{w.classic_false_alarm ? " · a classic test would call this significant" : ""}</small></th>
              <td><Spark path={path} tone={dirOf(w)} /></td>
              <td className="r num">{amount(w)}</td>
              <td><Verdict w={w} /></td>
            </tr>;
          })}</tbody>
        </table>
      </section>

      <section className="aq-compare" aria-labelledby="aq-compare-title">
        <h2 id="aq-compare-title">All aquifers</h2>
        <div className="scroll-x">
          <table className="aq-table">
            <thead><tr>
              <th scope="col">Aquifer</th><th scope="col" className="r">GRACE footprints</th>
              <th scope="col" className="r">Total water<small>GRACE, mm/yr</small></th>
              <th scope="col" className="r">Groundwater<small>GLDAS, mm/yr</small></th>
              <th scope="col">Rain</th><th scope="col">Cropland greenness</th><th scope="col">Crop water use</th>
              <th scope="col" className="r">Classic-test false alarms</th>
            </tr></thead>
            <tbody>{atlas.map((x) => <tr key={x.id} className={x.id === a.id ? "on" : ""} onClick={() => pick(x.id)}>
              <th scope="row"><button type="button" onClick={(e) => { e.stopPropagation(); pick(x.id); }}>{short(x.name)}</button><small>{x.countries.join(", ")}</small></th>
              <td className="r num">{fmt(x.grace_footprints, 2)}</td>
              <td className="r"><span className="num">{bare(x.tws)}</span><Verdict w={x.tws} compact /></td>
              <td className="r"><span className="num">{bare(x.gws)}</span><Verdict w={x.gws} compact /></td>
              <td><Verdict w={x.rain} /></td>
              <td>{x.ndvi ? <Verdict w={x.ndvi} /> : "—"}</td>
              <td>{x.et ? <Verdict w={x.et} /> : "—"}</td>
              <td className="r num">{[x.tws, x.gws, x.rain, x.ndvi, x.et, x.t2m].filter((w) => w?.classic_false_alarm).length || "—"}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <p className="aq-note">{m.atlas_note}</p>
      </section>
    </div>
  </section>;
}
