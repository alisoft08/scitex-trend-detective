// AI-assisted: Claude (Anthropic). World aquifer atlas: search or spin the globe to pick an aquifer, read its six NASA
// witnesses, then compare all of them. Every number comes from the engine's manifest; nothing is computed here.
import { useMemo, useState } from "react";
import { Globe, type GlobeMarker } from "./Globe";
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

export function Atlas({ m, onCase, onIca }: { m: Manifest; level?: Level; onCase: (id: string) => void; onIca: () => void }) {
  const atlas = m.atlas ?? [];
  const [sel, setSel] = useState<string>(atlas.find((a) => a.focus)?.id ?? atlas[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const markers: GlobeMarker[] = useMemo(() => atlas.map((x) => ({ id: x.id, lonlat: x.lonlat, label: short(x.name).replace(/ \(.*\)/, ""), tone: tone(x), focus: x.focus })), [m.atlas]);
  if (atlas.length < 2) return null;
  const a = atlas.find((x) => x.id === sel) ?? atlas[0];
  const q = norm(query.trim());
  const matches = atlas.filter((x) => !q || norm(`${x.name} ${x.countries.join(" ")}`).includes(q));
  const falling = atlas.filter((x) => tone(x) === "down").length;
  const size = typeof window !== "undefined" ? Math.min(520, window.innerWidth - 40) : 520;
  const pick = (id: string) => { setSel(id); };

  return <section className="atlas" aria-labelledby="atlas-title" id="atlas">
    <div className="wrap wide">
      <header className="atlas-head">
        <p className="eyebrow">World aquifer atlas · NASA GRACE, GLDAS, GPM IMERG, MODIS, MERRA-2 · 2004–2024</p>
        <h2 id="atlas-title">Where can satellites see an aquifer drain?</h2>
        <p>The same engine and the same NASA products over {atlas.length} irrigated aquifer systems. GRACE confirms a loss in {falling} of them,
          where the aquifer spans one or more of its footprints; Ica covers a small fraction of one. Rain separates drought from pumping,
          and MODIS shows whether the cropland above is greening.</p>
      </header>

      <div className="atlas-grid">
        <div className="atlas-globe">
          <Globe markers={markers} selected={sel} onSelect={pick} size={size}
            label="Globe with the aquifers of the atlas. Drag or use the arrow keys to turn it; search or pick an aquifer in the list." />
          <p className="small atlas-legend"><span className="lg down">↓</span> falling <span className="lg up">↑</span> rising <span className="lg flat">?</span> not proven · Base map: MODIS Terra surface reflectance, 2024 (NASA)</p>
        </div>

        <div className="atlas-side">
          <div className="atlas-search">
            <label htmlFor="aquifer-search">Find an aquifer or a country</label>
            <input id="aquifer-search" type="search" value={query} placeholder="e.g. India, Ogallala, Brazil…" autoComplete="off"
              aria-controls="aquifer-list" onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && matches[0]) { e.preventDefault(); pick(matches[0].id); } }} />
            <ul id="aquifer-list" className="atlas-list" aria-label={`${matches.length} aquifers available`}>
              {matches.map((x) => <li key={x.id}>
                <button type="button" className={`atlas-item ${x.id === a.id ? "on" : ""}`} aria-pressed={x.id === a.id} onClick={() => pick(x.id)}>
                  <span className={`atlas-dot ${tone(x)}`} aria-hidden="true">{arrow(tone(x))}</span>
                  <span className="atlas-item-text"><strong>{short(x.name)}{x.focus && <em> · Case file № 001</em>}</strong>
                    <small>{x.countries.join(", ")}</small></span>
                </button>
              </li>)}
              {matches.length === 0 && <li className="small atlas-empty">No aquifer matches “{query}”. The atlas covers {atlas.length} aquifers; try a country.</li>}
            </ul>
          </div>

          <article className="atlas-card" aria-live="polite">
            <p className="eyebrow">{a.focus ? "Case file № 001" : "Aquifer"} · {a.countries.join(", ")} · {Math.round(a.area_km2).toLocaleString("en-US")} km² · {fmt(a.grace_footprints, 2)} GRACE footprints</p>
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
            {a.focus && <button className="text-button" onClick={onIca}>Open the full Ica case file →</button>}
          </article>
        </div>
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
