// AI-assisted: Claude (Anthropic). World aquifer atlas: search or spin the globe to pick an aquifer, read its six NASA
// witnesses, then compare all of them. Every number comes from the engine's manifest; nothing is computed here.
import { useEffect, useMemo, useState } from "react";
import { Globe, type GlobeMarker } from "./Globe";
import { asset, brandAsset } from "./data";
import { EVIDENCE_TEXT } from "./evidence";
import { fmt, signed } from "./format";
import type { Level } from "./levels";
import type { AtlasEntry, AtlasWitness, Manifest } from "./types";

const proven = (w?: AtlasWitness) => !!w && (w.verdict === "confirmed" || w.verdict === "likely");
const tone = (a: AtlasEntry): GlobeMarker["tone"] => !proven(a.tws) ? "flat" : (a.tws.per_decade ?? 0) < 0 ? "down" : "up";
const arrow = (t: GlobeMarker["tone"]) => t === "down" ? "↓" : t === "up" ? "↑" : "?";
const direction = (w?: AtlasWitness) => !w ? "—" : !proven(w) ? "not proven" : (w.per_decade ?? 0) < 0 ? "falling" : "rising";
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
type Filter = "all" | GlobeMarker["tone"];
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" }, { id: "down", label: "↓ Falling" }, { id: "up", label: "↑ Rising" }, { id: "flat", label: "? Not proven" },
];
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

export function Atlas({ m, onCase, onIca }: { m: Manifest; level?: Level; onCase: (id: string) => void; onIca: () => void }) {
  const atlas = m.atlas ?? [];
  const [sel, setSel] = useState<string>(() => startId(atlas));
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [intro, setIntro] = useState(() => !introPlayed && !reducedMotion());
  const [fact, setFact] = useState(0);
  useEffect(() => { introPlayed = true; }, []);
  useEffect(() => {
    if (intro || reducedMotion()) return;
    const id = setInterval(() => setFact((f) => f + 1), 6500);
    return () => clearInterval(id);
  }, [intro]);
  const shown = atlas.filter((x) => filter === "all" || tone(x) === filter);
  const markers: GlobeMarker[] = useMemo(() => shown.map((x) => ({ id: x.id, lonlat: x.lonlat, label: short(x.name).replace(/ \(.*\)/, ""), tone: tone(x),
    thumb: asset(`img/aquifers/${x.id}.jpg`), value: x.tws.per_decade === null ? undefined : amount(x.tws), dir: MINI_DIR[x.id] ?? "ne" })), [m.atlas, filter]);
  if (atlas.length < 2) return null;
  const a = atlas.find((x) => x.id === sel) ?? atlas[0];
  const q = norm(query.trim());
  const matches = shown.filter((x) => !q || norm(`${x.name} ${x.countries.join(" ")}`).includes(q));
  // As wide as the screen allows: the globe fills the width and is cropped top and bottom, like Earth seen from orbit.
  const size = typeof window !== "undefined" ? Math.max(320, Math.min(1500, Math.round(window.innerWidth * 0.98))) : 1200;
  const pick = (id: string) => { setSel(id); setOpen(false); setQuery(""); };
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
      <Globe key={filter} markers={markers} selected={sel} onSelect={pick} size={size} autoRotate
          label="Globe with the aquifers of the atlas. Drag or use the arrow keys to turn it; search or filter above." />
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
        <div className="atlas-filters" role="group" aria-label="Filter by GRACE verdict">
          {FILTERS.map((f) => <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => {
            setFilter(f.id);
            const keep = atlas.filter((x) => f.id === "all" || tone(x) === f.id);
            if (keep.length && !keep.some((x) => x.id === sel)) setSel(keep[0].id);
          }}>{f.label} <span>{atlas.filter((x) => f.id === "all" || tone(x) === f.id).length}</span></button>)}
        </div>
      </div>

      </div></div>
      {(() => { const list = facts(m, atlas); return <p className="atlas-blurb" key={fact} aria-live="polite">{list[fact % list.length]}</p>; })()}
      <div className="atlas-datron">
        <p>Pick an aquifer on the globe to open its case file.</p>
        <img src={brandAsset("datron-detective.png")} alt="Datron, the SciTeX guide (AI-generated illustration)" />
      </div>
      <div className="atlas-stage-foot"><div className="wrap wide"><p className="small atlas-legend"><span className="lg down">↓</span> falling <span className="lg up">↑</span> rising <span className="lg flat">?</span> not proven · Base map: MODIS Terra surface reflectance, 2024 (NASA)</p></div></div>
    </div>
    <div className="wrap wide">
      <div className="atlas-details" id="atlas-details">
          <article className="atlas-card" aria-live="polite">
            <p className="eyebrow">{a.countries.join(", ")} · {Math.round(a.area_km2).toLocaleString("en-US")} km² · {fmt(a.grace_footprints, 2)} GRACE footprints</p>
            <h3>{a.name}</h3>
            <p className="small">{a.description}</p>
            <div className="atlas-witnesses">
              {WITNESSES.map(({ key, name, kind }) => {
                const w = a[key];
                if (!w) return null;
                return <button key={key} type="button" className="atlas-witness" onClick={() => onCase(w.id)}>
                  <span className="eyebrow">{name}</span>
                  <strong className="num">{amount(w)}</strong>
                  <span className={`pill ${w.verdict}`}>{EVIDENCE_TEXT[w.verdict]}</span>
                  <span className="small">{kind}{w.classic_false_alarm ? " · classic test: false alarm" : ""} · open case →</span>
                </button>;
              })}
            </div>
            <p className="atlas-reading">{a.reading}</p>
            <p className="small">Reference: {a.reference}{a.focus ? " · Ica's rain is measured over the Andean headwaters; its fields are Villacurí's." : ""}</p>
            {a.focus && <button className="text-button" onClick={onIca}>Open the Ica deep dive →</button>}
          </article>
      </div>

      <div className="atlas-compare">
        <h3>Compare the aquifers</h3>
        <div className="scroll-x">
          <table className="data">
            <thead><tr><th>Aquifer</th><th>Countries</th><th>GRACE footprints</th><th>Total water (GRACE)</th><th>Groundwater (GLDAS)</th>
              <th>Rain</th><th>Cropland greenness</th><th>Crop water use</th><th>Classic-test false alarms</th></tr></thead>
            <tbody>{atlas.map((x) => <tr key={x.id} className={x.id === a.id ? "on" : ""}>
              <td><button className="text-button" onClick={() => pick(x.id)}>{short(x.name)}</button></td>
              <td className="small">{x.countries.join(", ")}</td>
              <td className="num">{fmt(x.grace_footprints, 2)}</td>
              <td><span className={`pill ${x.tws.verdict}`}>{direction(x.tws)}</span> <span className="num">{amount(x.tws)}</span></td>
              <td><span className={`pill ${x.gws.verdict}`}>{direction(x.gws)}</span> <span className="num">{amount(x.gws)}</span></td>
              <td><span className={`pill ${x.rain.verdict}`}>{direction(x.rain)}</span></td>
              <td>{x.ndvi ? <span className={`pill ${x.ndvi.verdict}`}>{direction(x.ndvi)}</span> : "—"}</td>
              <td>{x.et ? <span className={`pill ${x.et.verdict}`}>{direction(x.et)}</span> : "—"}</td>
              <td className="num">{[x.tws, x.gws, x.rain, x.ndvi, x.et, x.t2m].filter((w) => w?.classic_false_alarm).length || "—"}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <p className="small">{m.atlas_note}</p>
      </div>
    </div>
  </section>;
}
