// AI-assisted: Codex (OpenAI). Link local well records to regional evidence at the scale of each product.
import { useState } from "react";
import { asset, useJSON } from "./data";
import { CasePlot } from "./CaseFile";
import { useEvidence, GLDAS_SOURCE, GRACE_SOURCE, WELL_SOURCE } from "./evidence";
import { useLocale, type Translation } from "./i18n";
import type { Level } from "./levels";
import type { CaseFile, GeoFeature, Manifest, MapMeta, WellProps } from "./types";

type Layer = "wells" | "gldas" | "grace";
type Wells = { features: GeoFeature<WellProps>[] };

const LAYERS: { id: Layer; label: Translation; detail: Translation }[] = [
  { id: "wells", label: ["Field wells", "Pozos de campo"], detail: ["Point readings · JUASVI", "Mediciones puntuales · JUASVI"] },
  { id: "gldas", label: ["Groundwater model", "Modelo de agua subterránea"], detail: ["0.25° grid · GLDAS", "Cuadrícula de 0,25° · GLDAS"] },
  { id: "grace", label: ["Satellite gravity", "Gravedad satelital"], detail: ["About 330 km · GRACE", "Unos 330 km · GRACE"] },
];

const RECORDS: { id: string; label: Translation; source: string }[] = [
  { id: "ZW_gws", label: ["Groundwater storage · GLDAS", "Almacenamiento de agua subterránea · GLDAS"], source: GLDAS_SOURCE },
  { id: "ZW_tws_grace", label: ["Total water storage · GRACE", "Almacenamiento total de agua · GRACE"], source: GRACE_SOURCE },
];

function RegionalRecord({ id, label, source, onCase }: { id: string; label: Translation; source: string; onCase: (id: string) => void }) {
  const { t } = useLocale();
  const { casePeriod, estimate, verdictText } = useEvidence();
  const { data: cf, error } = useJSON<CaseFile>(`cases/${id}.json`);
  return <article className="panel analysis-panel">
    <div className="panel-heading"><h3>{t(...label)}</h3>{cf && <p>{casePeriod(cf.period)} · {t(`${cf.n_valid} of ${cf.n} valid months`, `${cf.n_valid} de ${cf.n} meses válidos`)}</p>}</div>
    {error && <p className="error" role="alert">{t("Could not load this series.", "No se pudo cargar esta serie.")}</p>}
    {cf && <>
      <div className="comparison-result"><strong>{estimate(cf)}</strong><span className={`pill ${cf.verdict}`}>{verdictText(cf.verdict)}</span></div>
      <CasePlot cf={cf} />
    </>}
    <div className="link-row small"><a href={source} target="_blank" rel="noreferrer">{t("Product source", "Fuente del producto")}</a>
      <button className="text-button" onClick={() => onCase(id)}>{t("Open case →", "Abrir caso →")}</button></div>
  </article>;
}

function FootprintExample() {
  const { t, fixed, signed } = useLocale();
  const [local, setLocal] = useState(-10);
  const [surroundings, setSurroundings] = useState(4);
  const localShare = 0.1;
  const net = localShare * local + (1 - localShare) * surroundings;
  return <details className="research-details footprint-example">
    <summary>{t("Experiment with a regional average", "Experimenta con un promedio regional")}</summary>
    <p>{t("Hypothetical example in millimetres of equivalent water. The small area covers 10% of the region.", "Ejemplo hipotético en milímetros de agua equivalente. El área pequeña ocupa el 10 % de la región.")}</p>
    <div className="simulation-sliders">
      <label>{t("Small area", "Área pequeña")} <strong>{signed(local)} mm</strong><input type="range" min={-20} max={20} value={local} onChange={(e) => setLocal(Number(e.target.value))} /></label>
      <label>{t("Surrounding area", "Área circundante")} <strong>{signed(surroundings)} mm</strong><input type="range" min={-20} max={20} value={surroundings} onChange={(e) => setSurroundings(Number(e.target.value))} /></label>
    </div>
    <p className="research-callout" role="status">{t("Area-weighted change", "Cambio ponderado por área")} <strong>{signed(net)} mm</strong> · {fixed(localShare, 2)} × {t("local", "local")} + {fixed(1 - localShare, 2)} × {t("surrounding", "circundante")}.</p>
  </details>;
}

function WitnessMap({ layer, meta, wells, selected, onWell }: {
  layer: Layer; meta: MapMeta; wells: Wells; selected: WellProps; onWell: (id: string) => void;
}) {
  const { t, signed } = useLocale();
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
    <svg viewBox={`0 0 ${extent} ${extent}`} aria-label={t("Evidence map of Ica with nominal satellite and model scales", "Mapa de evidencias de Ica con escalas nominales del satélite y el modelo")}>
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
          tabIndex={p.well_id === selected.well_id ? 0 : -1} role="button" aria-label={t(`Well ${p.well_id}`, `Pozo ${p.well_id}`)}
          aria-pressed={p.well_id === selected.well_id}
          className={`well-point ${p.rate_m_per_yr < 0 ? "fall" : p.rate_m_per_yr > 0 ? "rise" : "flat"} ${p.well_id === selected.well_id ? "selected" : ""}`}
          onClick={() => onWell(p.well_id)} onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onWell(p.well_id); }
          }}><title>{p.well_id} · {signed(p.rate_m_per_yr)} {t("m/year", "m/año")}</title></circle>;
      }) : <>
        {layer === "gldas" && <rect className="layer-footprint" x={(extent - cellW) / 2} y={(extent - cellH) / 2} width={cellW} height={cellH} />}
        {layer === "grace" && <rect className="layer-footprint" x={15} y={15} width={330} height={330} />}
        {selectedFeature && <circle className="layer-local-point" cx={x(selectedFeature.geometry.coordinates[0])} cy={y(selectedFeature.geometry.coordinates[1])} r={extent / 100} />}
      </>}
      <text className="map-svg-label" x={extent * 0.045} y={extent * 0.077} fontSize={extent * 0.031}>
        {layer === "wells" ? t("Ica · field observations", "Ica · observaciones de campo") : layer === "gldas" ? t("Nominal model cell", "Celda nominal del modelo") : t("Nominal GRACE resolution", "Resolución nominal de GRACE")}
      </text>
      <line x1={extent * 0.047} x2={extent * 0.047 + (layer === "grace" ? 100 : 20)} y1={extent * 0.948} y2={extent * 0.948} className="map-scale" />
      <text x={extent * 0.049} y={extent * 0.929} fontSize={extent * 0.025} className="map-svg-label">{layer === "grace" ? 100 : 20} km</text>
    </svg>
    <figcaption className="small muted">
      {layer === "wells" && <span className="well-legend"><span><i className="well-point fall" />{t("Fell", "Bajó")}</span><span><i className="well-point rise" />{t("Rose", "Subió")}</span><span><i className="well-point flat" />{t("Stable", "Estable")}</span></span>}
      Landsat 2024 · NASA/USGS.{layer !== "wells" && t(" The outline illustrates the nominal scale.", " El contorno ilustra la escala nominal.")}
    </figcaption>
  </figure>;
}

export function MapView({ m, level, onCase }: { m: Manifest; level: Level; onCase: (id: string) => void }) {
  const { t, fmt, signed } = useLocale();
  const { perDecade } = useEvidence();
  const { data: meta, error: mapError } = useJSON<MapMeta>("map.json");
  const { data: wells, error: wellsError } = useJSON<Wells>("wells.geojson");
  const [layer, setLayer] = useState<Layer>("wells");
  const [wellId, setWellId] = useState("");
  const explorer = level === "explorer";
  if (mapError || wellsError) return <p className="wrap error" role="alert">{t("Could not load the evidence map.", "No se pudo cargar el mapa de evidencias.")}</p>;
  if (!meta || !wells) return <p className="wrap loading" role="status">{t("Loading the evidence map…", "Cargando el mapa de evidencias…")}</p>;
  const well = (wells.features.find((w) => w.properties.well_id === wellId)
    ?? wells.features.find((w) => w.properties.rate_m_per_yr < 0)
    ?? wells.features[0])?.properties;
  if (!well) return <p className="wrap error">{t("The well records are unavailable.", "Los registros de pozos no están disponibles.")}</p>;
  const total = wells.features.length;
  const falling = wells.features.filter((feature) => feature.properties.rate_m_per_yr < 0).length;
  const grace = m.cases.find((c) => c.id === "ZW_tws_grace");
  const waterLevel = well.rate_m_per_yr < 0 ? t("Water level fell", "El nivel del agua bajó")
    : well.rate_m_per_yr > 0 ? t("Water level rose", "El nivel del agua subió")
    : t("Water level was stable at the reported precision", "El nivel del agua fue estable a la precisión reportada");

  return <section className="wrap wide research-page">
    <header className="research-heading">
      <p className="eyebrow">{t("One place · three kinds of evidence", "Un lugar · tres tipos de evidencia")}</p><h1>{t("What can each witness see?", "¿Qué puede observar cada fuente?")}</h1>
      <p>{t("Follow a well in Ica from ground level to the regional view from orbit.", "Sigue un pozo de Ica desde su medición local hasta la vista regional desde órbita. Las capas muestran qué puede medir cada fuente y a qué escala.")}</p>
    </header>
    <div className="map-witness-switch" role="group" aria-label={t("Evidence layer", "Capa de evidencia")}>
      {LAYERS.map((l) => <button key={l.id} type="button" aria-pressed={l.id === layer} onClick={() => setLayer(l.id)}>
        <strong>{t(...l.label)}</strong><span>{t(...l.detail)}</span>
      </button>)}
    </div>
    <div className="evidence-map-grid">
      <WitnessMap layer={layer} meta={meta} wells={wells} selected={well} onWell={setWellId} />
      <div className="research-stack">
        <article className="panel analysis-panel map-source-panel">
          {layer === "wells" && <>
            <div className="panel-heading"><h2>{t(`Water levels fell in ${falling} of ${total} wells`, `El nivel del agua bajó en ${falling} de ${total} pozos`)}</h2><p>{t("Depth to water was recorded in individual wells.", "La profundidad del agua se midió en pozos individuales.")}</p></div>
            <label className="research-field">{t("Select a well", "Selecciona un pozo")}
              <select value={well.well_id} onChange={(e) => setWellId(e.target.value)}>
                {wells.features.map(({ properties: p }) => <option key={p.well_id} value={p.well_id}>{p.well_id} · {t("Zone","Zona")} {p.juasvi_zone}</option>)}
              </select>
            </label>
            <div className="well-reading" role="status"><strong>{waterLevel}</strong>
              <span className="num">{signed(well.rate_m_per_yr)} {t("m/year", "m/año")}</span>
              <dl className="research-facts">
                <div><dt>{well.date_start}</dt><dd>{fmt(well.depth_start_m)} {t("m below ground", "m bajo la superficie")}</dd></div>
                <div><dt>{well.date_end}</dt><dd>{fmt(well.depth_end_m)} {t("m below ground", "m bajo la superficie")}</dd></div>
              </dl>
            </div>
            <p className="small muted">{t("The rate compares the first and last readings in Annex II. These records use different periods and describe this sample of wells.", "La tasa compara la primera y la última medición del Anexo II. Los periodos varían según el pozo y el resultado describe esta muestra.")}</p>
            <div className="link-row small"><a href={WELL_SOURCE} target="_blank" rel="noreferrer">{t("JUASVI · Annex II", "JUASVI · Anexo II")}</a>
              <button className="text-button" onClick={() => setLayer("grace")}>{t("View from orbit →", "Ver desde órbita →")}</button></div>
          </>}
          {layer === "gldas" && <>
            <div className="panel-heading"><h2>{t("Groundwater storage in a model", "Almacenamiento de agua subterránea en un modelo")}</h2><p>{t("GLDAS estimates storage across grid cells. The Ica case is inconclusive.", "GLDAS estima el almacenamiento en celdas de una cuadrícula. El caso de Ica es no concluyente.")}</p></div>
            <p>{t("The highlighted square illustrates a 0.25° cell, about 27 × 28 km near Ica. The point marks the well you selected.", "El recuadro ilustra una celda de 0,25°, de unos 27 × 28 km cerca de Ica. El punto marca el pozo seleccionado.")}</p>
            <div className="link-row small"><a href={GLDAS_SOURCE} target="_blank" rel="noreferrer">NASA · GLDAS 2.2</a>
              <button className="text-button" onClick={() => onCase("ZW_gws")}>{t("Open GLDAS case →", "Abrir caso GLDAS →")}</button></div>
          </>}
          {layer === "grace" && <>
            <div className="panel-heading"><h2>{t("Regional total water storage increased", "El almacenamiento total de agua aumentó en la región")}</h2></div>
            <div className="well-reading"><strong className="num">{signed(grace?.sen_per_decade)} {perDecade("mm")}</strong><span>{t("Equivalent water height · Oasis Paradox estimate", "Altura de agua equivalente · Estimación de Oasis Paradox")}</span></div>
            <p>{t("GRACE averages water storage across a broad region. Soil water, rivers, groundwater and other stores can change in different directions.", "GRACE promedia el almacenamiento de agua en una región amplia. El agua del suelo, los ríos, el agua subterránea y otras reservas pueden cambiar en direcciones distintas.")}</p>
            <div className="link-row small"><a href={GRACE_SOURCE} target="_blank" rel="noreferrer">NASA/JPL · GRACE</a>
              <button className="text-button" onClick={() => onCase("ZW_tws_grace")}>{t("Open GRACE case →", "Abrir caso GRACE →")}</button></div>
          </>}
        </article>
        <p className="research-callout"><strong>{t("Both readings can be true.", "Ambas observaciones pueden coexistir.")}</strong>{" "}{t("A change at one well describes a local water level. GRACE describes the combined change across a much larger area.", "Un pozo describe un cambio local del nivel del agua. GRACE describe el cambio combinado en un área mucho mayor.")}</p>
        {level === "expert" && <details className="research-details">
          <summary>{t("Resolution and shared observations", "Resolución y observaciones compartidas")}</summary>
          <p>{t("NASA/JPL distributes the GRACE product on a 0.5° grid. The nominal mass-concentration resolution is about 3°. GLDAS 2.2 assimilates GRACE, so their records share information.", "NASA/JPL distribuye GRACE en una cuadrícula de 0,5°. La resolución nominal de la concentración de masa es de unos 3°. GLDAS 2.2 asimila datos de GRACE, por lo que las series comparten información.")}</p>
          <p className="small"><a href="https://grace.jpl.nasa.gov/" target="_blank" rel="noreferrer">JPL Tellus</a> · <a href={GLDAS_SOURCE} target="_blank" rel="noreferrer">{t("NASA GLDAS documentation", "Documentación de GLDAS de NASA")}</a></p>
        </details>}
      </div>
    </div>
    {!explorer && <div className="comparison-columns">{RECORDS.map((r) => <RegionalRecord key={r.id} {...r} onCase={onCase} />)}</div>}
    {level === "expert" && <FootprintExample />}
  </section>;
}
