// AI-assisted: Codex (OpenAI). Link local well records to regional evidence at the scale of each product.
import { useState } from "react";
import { asset, useJSON } from "./data";
import { CasePlot } from "./CaseFile";
import { casePeriod, estimate, EVIDENCE_TEXT, GLDAS_SOURCE, GRACE_SOURCE, WELL_SOURCE } from "./evidence";
import { fmt, signed } from "./format";
import type { Level } from "./levels";
import type { CaseFile, GeoFeature, Manifest, MapMeta, WellProps } from "./types";

type Layer = "wells" | "gldas" | "grace";
type Wells = { features: GeoFeature<WellProps>[] };

const LAYERS: { id: Layer; label: string; detail: string }[] = [
  { id: "wells", label: "Field wells", detail: "Point readings · JUASVI" },
  { id: "gldas", label: "Groundwater model", detail: "0.25° grid · GLDAS" },
  { id: "grace", label: "Satellite gravity", detail: "About 330 km · GRACE" },
];

const RECORDS = [
  { id: "ZW_gws", label: "Groundwater storage · GLDAS", source: GLDAS_SOURCE },
  { id: "ZW_tws_grace", label: "Total water storage · GRACE", source: GRACE_SOURCE },
];

function RegionalRecord({ id, label, source, onCase }: { id: string; label: string; source: string; onCase: (id: string) => void }) {
  const { data: cf, error } = useJSON<CaseFile>(`cases/${id}.json`);
  return <article className="panel analysis-panel">
    <div className="panel-heading"><h3>{label}</h3>{cf && <p>{casePeriod(cf.period)} · {cf.n_valid} of {cf.n} valid months</p>}</div>
    {error && <p className="error" role="alert">{error}</p>}
    {cf && <>
      <div className="comparison-result"><strong>{estimate(cf)}</strong><span className={`pill ${cf.verdict}`}>{EVIDENCE_TEXT[cf.verdict]}</span></div>
      <CasePlot cf={cf} />
    </>}
    <div className="link-row small"><a href={source} target="_blank" rel="noreferrer">Product source</a>
      <button className="text-button" onClick={() => onCase(id)}>Open case →</button></div>
  </article>;
}

function FootprintExample() {
  const [local, setLocal] = useState(-10);
  const [surroundings, setSurroundings] = useState(4);
  const localShare = 0.1;
  const net = localShare * local + (1 - localShare) * surroundings;
  return <details className="research-details footprint-example">
    <summary>Experiment with a regional average</summary>
    <p>Hypothetical example in millimetres of equivalent water. The small area covers 10% of the region.</p>
    <div className="simulation-sliders">
      <label>Small area <strong>{signed(local)} mm</strong><input type="range" min={-20} max={20} value={local} onChange={(e) => setLocal(Number(e.target.value))} /></label>
      <label>Surrounding area <strong>{signed(surroundings)} mm</strong><input type="range" min={-20} max={20} value={surroundings} onChange={(e) => setSurroundings(Number(e.target.value))} /></label>
    </div>
    <p className="research-callout" role="status">Area-weighted change: <strong>{signed(net)} mm</strong> · 0.10 × local + 0.90 × surrounding.</p>
  </details>;
}

function WitnessMap({ layer, meta, wells, selected, onWell }: {
  layer: Layer; meta: MapMeta; wells: Wells; selected: WellProps; onWell: (id: string) => void;
}) {
  const [west, south, east, north] = meta.bbox;
  const kmPerDegree = 111.32;
  const kmLon = kmPerDegree * Math.cos((south + north) / 2 * Math.PI / 180);
  const w = (east - west) * kmLon, h = (north - south) * kmPerDegree;
  const localWidth = Math.max(w, h);
  const extent = layer === "grace" ? 360 : localWidth;
  const left = (extent - w) / 2, top = (extent - h) / 2;
  const x = (lon: number) => left + (lon - west) * kmLon;
  const y = (lat: number) => top + (north - lat) * kmPerDegree;
  const cellW = 0.25 * kmLon, cellH = 0.25 * kmPerDegree;
  const selectedFeature = wells.features.find((feature) => feature.properties.well_id === selected.well_id);
  const background = meta.images.landsat_2024;
  return <figure className={`witness-map layer-${layer}`}>
    <svg viewBox={`0 0 ${extent} ${extent}`} aria-label="Evidence map of Ica with nominal satellite and model scales">
      <defs>
        <pattern id="map-pattern" width={extent / 16} height={extent / 16} patternUnits="userSpaceOnUse">
          <path d={`M 0 ${extent / 16} V 0 H ${extent / 16}`} fill="none" stroke="#7584b0" strokeWidth={0.18} opacity={0.6} />
        </pattern>
      </defs>
      <rect width={extent} height={extent} fill="#171d38" />
      <rect width={extent} height={extent} fill="url(#map-pattern)" />
      <image href={asset(background.file)} x={left} y={top} width={w} height={h} preserveAspectRatio="none" />
      <rect x={left} y={top} width={w} height={h} className="map-boundary" />
      {layer === "wells" ? wells.features.map(({ geometry, properties: p }) => {
        const [lon, lat] = geometry.coordinates as [number, number];
        return <circle key={p.well_id} cx={x(lon)} cy={y(lat)} r={p.well_id === selected.well_id ? 1.65 : 1.15}
          tabIndex={p.well_id === selected.well_id ? 0 : -1} role="button" aria-label={`Well ${p.well_id}`}
          aria-pressed={p.well_id === selected.well_id}
          className={`well-point ${p.rate_m_per_yr < 0 ? "fall" : p.rate_m_per_yr > 0 ? "rise" : "flat"} ${p.well_id === selected.well_id ? "selected" : ""}`}
          onClick={() => onWell(p.well_id)} onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onWell(p.well_id); }
          }}><title>{p.well_id} · {signed(p.rate_m_per_yr)} m/year</title></circle>;
      }) : <>
        {layer === "gldas" && <rect className="layer-footprint" x={(extent - cellW) / 2} y={(extent - cellH) / 2} width={cellW} height={cellH} />}
        {layer === "grace" && <rect className="layer-footprint" x={15} y={15} width={330} height={330} />}
        {selectedFeature && <circle className="layer-local-point" cx={x(selectedFeature.geometry.coordinates[0])} cy={y(selectedFeature.geometry.coordinates[1])} r={extent / 100} />}
      </>}
      <text className="map-svg-label" x={extent * 0.045} y={extent * 0.077} fontSize={extent * 0.031}>
        {layer === "wells" ? "Ica · field observations" : layer === "gldas" ? "Nominal model cell" : "Nominal GRACE resolution"}
      </text>
      <line x1={extent * 0.047} x2={extent * 0.047 + (layer === "grace" ? 100 : 20)} y1={extent * 0.948} y2={extent * 0.948} className="map-scale" />
      <text x={extent * 0.049} y={extent * 0.929} fontSize={extent * 0.025} className="map-svg-label">{layer === "grace" ? 100 : 20} km</text>
    </svg>
    <figcaption className="small muted">
      {layer === "wells" && <span className="well-legend"><span><i className="well-point fall" />Fell</span><span><i className="well-point rise" />Rose</span><span><i className="well-point flat" />Stable</span></span>}
      Landsat 2024 · NASA/USGS.{layer !== "wells" && " The outline illustrates the nominal scale."}
    </figcaption>
  </figure>;
}

export function MapView({ m, level, onCase }: { m: Manifest; level: Level; onCase: (id: string) => void }) {
  const { data: meta, error: mapError } = useJSON<MapMeta>("map.json");
  const { data: wells, error: wellsError } = useJSON<Wells>("wells.geojson");
  const [layer, setLayer] = useState<Layer>("wells");
  const [wellId, setWellId] = useState("");
  const explorer = level === "explorer";
  if (mapError || wellsError) return <p className="wrap error" role="alert">{mapError ?? wellsError}</p>;
  if (!meta || !wells) return <p className="wrap loading" role="status">Loading the evidence map…</p>;
  const well = (wells.features.find((w) => w.properties.well_id === wellId)
    ?? wells.features.find((w) => w.properties.rate_m_per_yr < 0)
    ?? wells.features[0])?.properties;
  if (!well) return <p className="wrap error">The well records are unavailable.</p>;
  const total = wells.features.length;
  const falling = wells.features.filter((feature) => feature.properties.rate_m_per_yr < 0).length;
  const grace = m.cases.find((c) => c.id === "ZW_tws_grace");
  const direction = well.rate_m_per_yr < 0 ? "fell" : well.rate_m_per_yr > 0 ? "rose" : "was stable at the reported precision";

  return <section className="wrap wide research-page">
    <header className="research-heading">
      <p className="eyebrow">One place · three kinds of evidence</p><h1>What can each witness see?</h1>
      <p>Follow a well in Ica from ground level to the regional view from orbit.</p>
    </header>
    <div className="map-witness-switch" role="group" aria-label="Evidence layer">
      {LAYERS.map((l) => <button key={l.id} type="button" aria-pressed={l.id === layer} onClick={() => setLayer(l.id)}>
        <strong>{l.label}</strong><span>{l.detail}</span>
      </button>)}
    </div>
    <div className="evidence-map-grid">
      <WitnessMap layer={layer} meta={meta} wells={wells} selected={well} onWell={setWellId} />
      <div className="research-stack">
        <article className="panel analysis-panel map-source-panel">
          {layer === "wells" && <>
            <div className="panel-heading"><h2>{falling} of {total} wells fell</h2><p>Depth to water was recorded in individual wells.</p></div>
            <label className="research-field">Select a well
              <select value={well.well_id} onChange={(e) => setWellId(e.target.value)}>
                {wells.features.map(({ properties: p }) => <option key={p.well_id} value={p.well_id}>{p.well_id} · Zone {p.juasvi_zone}</option>)}
              </select>
            </label>
            <div className="well-reading" role="status"><strong>Water level {direction}</strong>
              <span className="num">{signed(well.rate_m_per_yr)} m/year</span>
              <dl className="research-facts">
                <div><dt>{well.date_start}</dt><dd>{fmt(well.depth_start_m)} m below ground</dd></div>
                <div><dt>{well.date_end}</dt><dd>{fmt(well.depth_end_m)} m below ground</dd></div>
              </dl>
            </div>
            <p className="small muted">The rate compares the first and last readings in Annex II. These records use different periods and describe this sample of wells.</p>
            <div className="link-row small"><a href={WELL_SOURCE} target="_blank" rel="noreferrer">JUASVI · Annex II</a>
              <button className="text-button" onClick={() => setLayer("grace")}>View from orbit →</button></div>
          </>}
          {layer === "gldas" && <>
            <div className="panel-heading"><h2>Groundwater storage in a model</h2><p>GLDAS estimates storage across grid cells. The Ica case is inconclusive.</p></div>
            <p>The highlighted square illustrates a 0.25° cell, about 27 × 28 km near Ica. The point marks the well you selected.</p>
            <div className="link-row small"><a href={GLDAS_SOURCE} target="_blank" rel="noreferrer">NASA · GLDAS 2.2</a>
              <button className="text-button" onClick={() => onCase("ZW_gws")}>Open GLDAS case →</button></div>
          </>}
          {layer === "grace" && <>
            <div className="panel-heading"><h2>Regional total water storage increased</h2></div>
            <div className="well-reading"><strong className="num">{signed(grace?.sen_per_decade)} mm/decade</strong><span>Equivalent water height · Oasis Paradox estimate</span></div>
            <p>GRACE averages water storage across a broad region. Soil water, rivers, groundwater and other stores can change in different directions.</p>
            <div className="link-row small"><a href={GRACE_SOURCE} target="_blank" rel="noreferrer">NASA/JPL · GRACE</a>
              <button className="text-button" onClick={() => onCase("ZW_tws_grace")}>Open GRACE case →</button></div>
          </>}
        </article>
        <p className="research-callout"><strong>Both readings can be true.</strong> A change at one well describes a local water level. GRACE describes the combined change across a much larger area.</p>
        {level === "expert" && <details className="research-details">
          <summary>Resolution and shared observations</summary>
          <p>NASA/JPL distributes the GRACE product on a 0.5° grid. The nominal mass-concentration resolution is about 3°. GLDAS 2.2 assimilates GRACE, so their records share information.</p>
          <p className="small"><a href="https://grace.jpl.nasa.gov/" target="_blank" rel="noreferrer">JPL Tellus</a> · <a href={GLDAS_SOURCE} target="_blank" rel="noreferrer">NASA GLDAS documentation</a></p>
        </details>}
      </div>
    </div>
    {!explorer && <div className="comparison-columns">{RECORDS.map((r) => <RegionalRecord key={r.id} {...r} onCase={onCase} />)}</div>}
    {level === "expert" && <FootprintExample />}
  </section>;
}
