// AI-assisted: Claude (Anthropic). World aquifer atlas: pick an aquifer on the globe, read its three NASA witnesses,
// then compare all of them. Every number comes from the engine's manifest; nothing is computed here.
import { useMemo, useState } from "react";
import { Globe, type GlobeMarker } from "./Globe";
import { EVIDENCE_TEXT } from "./evidence";
import { fmt, signed } from "./format";
import type { Level } from "./levels";
import type { AtlasEntry, AtlasWitness, Manifest } from "./types";

const proven = (w: AtlasWitness) => w.verdict === "confirmed" || w.verdict === "likely";
const tone = (a: AtlasEntry): GlobeMarker["tone"] => !proven(a.tws) ? "flat" : (a.tws.per_decade ?? 0) < 0 ? "down" : "up";
const perYear = (w: AtlasWitness) => w.per_decade === null ? "n/a" : `${signed(w.per_decade / 10, 2)} mm/yr`;
const direction = (w: AtlasWitness) => !proven(w) ? "not proven" : (w.per_decade ?? 0) < 0 ? "falling" : "rising";

function Witness({ name, source, w, units, onOpen }: { name: string; source: string; w: AtlasWitness; units: string; onOpen: () => void }) {
  return <button type="button" className="atlas-witness" onClick={onOpen}>
    <span className="eyebrow">{name}</span>
    <strong className="num">{units === "rain" ? `${signed(w.per_decade, 2)} mm/month` : perYear(w)}<small>{units === "rain" ? " per decade" : ""}</small></strong>
    <span className={`pill ${w.verdict}`}>{EVIDENCE_TEXT[w.verdict]}</span>
    <span className="small muted">{source} · open case →</span>
  </button>;
}

export function Atlas({ m, level, onCase, onIca }: { m: Manifest; level: Level; onCase: (id: string) => void; onIca: () => void }) {
  const atlas = m.atlas ?? [];
  const [sel, setSel] = useState<string>(atlas.find((a) => a.focus)?.id ?? atlas[0]?.id ?? "");
  const markers: GlobeMarker[] = useMemo(() => atlas.map((x) => ({ id: x.id, lonlat: x.lonlat, label: x.name.split(",")[0].replace(/ \(.*\)/, ""), tone: tone(x), focus: x.focus })), [m.atlas]);
  if (atlas.length < 2) return null;
  const a = atlas.find((x) => x.id === sel) ?? atlas[0];
  const falling = atlas.filter((x) => tone(x) === "down").length;
  const size = typeof window !== "undefined" ? Math.min(520, window.innerWidth - 40) : 520;

  return <section className="atlas" aria-labelledby="atlas-title" id="atlas">
    <div className="wrap wide">
      <header className="atlas-head">
        <p className="eyebrow">World aquifer atlas · GRACE, GLDAS and GPM IMERG · 2004–2024</p>
        <h2 id="atlas-title">Where can satellites see an aquifer drain?</h2>
        <p>{level === "explorer"
          ? `Spin the globe and pick an aquifer. In ${falling} of these ${atlas.length} places, NASA's GRACE satellites see the water stored in the ground going down. Ica is different: its farms are too small for the satellites to see.`
          : `The same engine and the same NASA products over ${atlas.length} irrigated aquifer systems. GRACE confirms a loss where the aquifer spans one or more of its footprints; Ica covers a small fraction of one. Rain from GPM IMERG separates drought from pumping.`}</p>
      </header>

      <div className="atlas-grid">
        <div className="atlas-globe">
          <Globe markers={markers} selected={sel} onSelect={setSel} size={size}
            label="Globe with the aquifers of the atlas. Drag or use the arrow keys to turn it; pick an aquifer below or on the globe." />
          <p className="small muted atlas-legend"><span className="lg down">↓</span> falling <span className="lg up">↑</span> rising <span className="lg flat">?</span> not proven · Base map: MODIS Terra surface reflectance, 2024 (NASA)</p>
        </div>

        <div className="atlas-side">
          <div className="atlas-list" role="list" aria-label="Aquifers">
            {atlas.map((x) => <button key={x.id} role="listitem" type="button" className={`atlas-item ${x.id === a.id ? "on" : ""}`}
              aria-pressed={x.id === a.id} onClick={() => setSel(x.id)}>
              <span className={`atlas-dot ${tone(x)}`} aria-hidden="true">{tone(x) === "down" ? "↓" : tone(x) === "up" ? "↑" : "?"}</span>
              <span>{x.name}{x.focus && <em> · Case file № 001</em>}</span>
            </button>)}
          </div>

          <article className="panel atlas-card" aria-live="polite">
            <p className="eyebrow">{a.focus ? "Case file № 001" : "Aquifer"} · {Math.round(a.area_km2).toLocaleString("en-US")} km² · {fmt(a.grace_footprints, 2)} GRACE footprints</p>
            <h3>{a.name}</h3>
            <p className="small">{a.description}</p>
            <div className="atlas-witnesses">
              <Witness name="Total water · GRACE" source="Observed" w={a.tws} units="mm" onOpen={() => onCase(a.tws.id)} />
              <Witness name="Groundwater · GLDAS" source="Model" w={a.gws} units="mm" onOpen={() => onCase(a.gws.id)} />
              <Witness name={`Rain · IMERG (${a.rain_area})`} source="Estimated" w={a.rain} units="rain" onOpen={() => onCase(a.rain.id)} />
            </div>
            <p className="atlas-reading">{a.reading}</p>
            <p className="small muted">Reference: {a.reference}</p>
            {a.focus && <button className="text-button" onClick={onIca}>Open the full Ica case file →</button>}
          </article>
        </div>
      </div>

      <div className="panel atlas-compare">
        <h3>Compare the aquifers</h3>
        <div className="scroll-x">
          <table className="data">
            <thead><tr><th>Aquifer</th><th>GRACE footprints</th><th>Total water (GRACE)</th><th>Groundwater (GLDAS)</th><th>Rain (IMERG)</th>
              {level !== "explorer" && <th>Classic-test false alarm</th>}<th>Reading</th></tr></thead>
            <tbody>{atlas.map((x) => <tr key={x.id} className={x.id === a.id ? "on" : ""}>
              <td><button className="text-button" onClick={() => setSel(x.id)}>{x.name.split(",")[0]}</button></td>
              <td className="num">{fmt(x.grace_footprints, 2)}</td>
              <td><span className={`pill ${x.tws.verdict}`}>{direction(x.tws)}</span> <span className="num">{perYear(x.tws)}</span></td>
              <td><span className={`pill ${x.gws.verdict}`}>{direction(x.gws)}</span> <span className="num">{perYear(x.gws)}</span></td>
              <td><span className={`pill ${x.rain.verdict}`}>{direction(x.rain)}</span></td>
              {level !== "explorer" && <td>{[x.tws, x.gws, x.rain].filter((w) => w.classic_false_alarm).length || "—"}</td>}
              <td className="small">{x.reading}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <p className="small muted">{m.atlas_note}</p>
      </div>
    </div>
  </section>;
}
