// AI-assisted: Claude (Anthropic). One aquifer's own page: the 2004 / 2024 lens, its reading and six NASA witnesses.
// Every number comes from the engine's manifest; nothing is computed here.
import { useMemo, useState } from "react";
import { asset, useJSON } from "./data";
import { HeroMap } from "./HeroMap";
import { LensHero, type LensStop } from "./LensHero";
import { fmt } from "./format";
import { amount, dirOf, proven, short, Spark, Verdict, WITNESSES } from "./Atlas";
import { useLocale } from "./i18n";
import type { AtlasEntry, Manifest } from "./types";

interface Tour { [zone: string]: { ratio: number; bbox: [number, number, number, number]; stops: { lon: number; lat: number; change: string }[] } }

const WORD: Record<string, string> = { confirmed: "Confirmed trend", likely: "Likely trend", inconclusive: "Inconclusive", insufficient_data: "Insufficient data" };

/** Headline from the verdicts: what the satellites see on the surface and in the water below. */
function headline(a: AtlasEntry) {
  const direction = dirOf(a.tws);
  if (direction === "down") return <>Total water storage.<br /><em>{a.tws.verdict === "confirmed" ? "Confirmed decline." : "Likely decline."}</em></>;
  if (direction === "up") return <>Total water storage.<br /><em>{a.tws.verdict === "confirmed" ? "Confirmed rise." : "Likely rise."}</em></>;
  return <>Total water storage.<br /><em>{WORD[a.tws.verdict]}.</em></>;
}

export function AquiferPage({ m, id, onCase, onIca, onBack, onGo }: {
  m: Manifest; id: string; onCase: (id: string) => void; onIca: () => void; onBack: () => void;
  onGo: (hash: string) => void;   // open another view (compare, method, sources, map)
}) {
  const { t } = useLocale();
  const a = (m.atlas ?? []).find((x) => x.id === id);
  if (!a) return <section className="wrap wide aq-page"><p>{t("Unknown aquifer.", "Acuífero desconocido.")} <button className="aq-link" onClick={onBack}>{t("Back to the global atlas", "Volver al atlas global")}</button></p></section>;
  const ica = a.id === "ZW";
  const witnessCount = WITNESSES.filter(({ key }) => a[key]).length;
  const toWitnesses = () => {
    const heading = document.getElementById("aq-witnesses-title");
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: "start" });
  };
  return <>
  {ica ? <HeroMap m={m} primary={{ label: t("Go to the NASA variables table ↓", "Ir a la tabla de variables de NASA ↓"), go: toWitnesses }} onMap={() => onGo("#map")} />
    : <AquiferLens m={m} a={a} onWitnesses={toWitnesses} onBack={onBack} />}
  <section className="aq-page" aria-labelledby="aq-title">
    <div className="wrap wide">
      <button className="aq-back" onClick={onBack}>{t("Back to the global atlas", "Volver al atlas global")}</button>
      <p className="aq-meta">{a.countries.join(", ")} <span>·</span> {Math.round(a.area_km2).toLocaleString("en-US")} km² <span>·</span> {fmt(a.grace_footprints, 2)} GRACE footprints</p>
      <h1 id="aq-title">{short(a.name) === a.name ? a.name : <>{short(a.name)} <small>{a.name.slice(short(a.name).length).replace(/^[ ,]+/, "")}</small></>}</h1>
      <p className="aq-desc">{a.description}</p>


      <div className="aq-reading-row">
        <p className="aq-reading">GRACE covers regional total water storage. GLDAS estimates the groundwater component. Each result applies to its study area and analysis period.</p>
        <p className="aq-ref">Reference: {a.reference}{ica ? ". Ica's rain is measured over the Andean headwaters; its fields are Villacurí's." : ""}</p>
        {ica && <button className="aq-link" onClick={onIca}>{t("Open the Ica field wells overview", "Abrir el resumen de pozos de Ica")}</button>}
      </div>

      <section className="aq-variable-section" aria-labelledby="aq-witnesses-title">
      <h2 id="aq-witnesses-title" className="action-scroll-target" tabIndex={-1}>{t("NASA variables for this aquifer", "Variables de NASA de este acuífero")}</h2>
      <p className="research-callout" id="aq-witnesses-help">{t(
        "Select a NASA variable to see its monthly data for this region, the estimated trend and the statistical tests. In the analysis, you can choose a period and download the evidence.",
        "Selecciona una variable de NASA para ver sus datos mensuales en esta región, la tendencia estimada y las pruebas estadísticas. En el análisis puedes elegir un periodo y descargar las evidencias.",
      )}</p>
      <table className="aq-witnesses" id="aq-witnesses" aria-describedby="aq-witnesses-help">
        <caption>{t(`${witnessCount} NASA variables · 2004–2024`, `${witnessCount} variables de NASA · 2004–2024`)}</caption>
        <thead><tr><th scope="col">{t("Variable", "Variable")}</th><th scope="col">{t("Annual anomaly", "Anomalía anual")}</th><th scope="col" className="r">{t("Change", "Cambio")}</th><th scope="col">{t("Verdict", "Veredicto")}</th></tr></thead>
        <tbody>{WITNESSES.map(({ key, name, spanish, kind, kindEs }) => {
          const w = a[key];
          if (!w) return null;
          const path = m.cases.find((c) => c.id === w.id)?.path ?? null;
          return <tr key={key} onClick={() => onCase(w.id)}>
            <th scope="row">
              <button type="button" onClick={(e) => { e.stopPropagation(); onCase(w.id); }}>
                {t(name, spanish)} <span className="table-action">{t("View trend analysis →", "Ver análisis de la tendencia →")}</span>
              </button>
              <small>{t(kind, kindEs)}{w.classic_false_alarm && t(" · a classic test would call this significant", " · una prueba clásica lo clasificaría como significativo")}</small>
            </th>
            <td><Spark path={path} tone={dirOf(w)} /></td>
            <td className="r num">{amount(w)}</td>
            <td><Verdict w={w} /></td>
          </tr>;
        })}</tbody>
      </table>
      </section>
      <AquiferExtras m={m} a={a} onCase={onCase} onGo={onGo} />
      <AquiferTools m={m} a={a} onCase={onCase} onGo={onGo} />
    </div>
  </section>
  </>;
}

/** The Ica-style landing view for any aquifer: MODIS 2004 outside the lens, 2024 inside, touring the four places where
 *  the surface changed most. The cards carry the aquifer-wide witnesses, and say so. */
function AquiferLens({ m, a, onWitnesses, onBack }: { m: Manifest; a: AtlasEntry; onWitnesses: () => void; onBack: () => void }) {
  const { t } = useLocale();
  const { data: tour } = useJSON<Tour>("aquifer_tour.json");
  const scene = tour?.[a.id];
  const stops: LensStop[] = useMemo(() => {
    if (!scene) return [];
    const ws = WITNESSES.filter((w) => ["tws", "gws", "ndvi", "et"].includes(w.key)).map((w) => ({ ...w, v: a[w.key] })).filter((w) => w.v);
    return scene.stops.map((s, i) => {
      const w = ws[i % ws.length];
      return { lon: s.lon, lat: s.lat, place: `Across the aquifer · ${w.name}`, finding: amount(w.v!),
        verdict: WORD[w.v!.verdict], tone: w.v!.verdict, source: `${w.kind} · 2004–2024`,
        note: `Lens: ${s.change} in 2024 than in 2004 here.`,
        alarm: w.v!.classic_false_alarm ? "A classic test would call this significant; the combined evidence does not." : undefined };
    });
  }, [scene, a]);
  void m;
  if (!scene) return <header className="hero-map"><div className="hm-stage" /></header>;
  return <LensHero before={asset(`img/aquifers/${a.id}_2004.jpg`)} after={asset(`img/aquifers/${a.id}_2024.jpg`)}
    altBefore={`MODIS true-color image of ${a.name} in 2004`} altAfter="The same area in 2024, seen through the lens"
    bbox={scene.bbox} ratio={scene.ratio} stops={stops}
    kicker={`${short(a.name)} · ${a.countries.join(", ")} · NASA Earth observations`}
    title={headline(a)} lede="GRACE tracks regional total water storage from 2004 to 2024. Open the case for the trend, interval and methods."
    primary={{ label: t("Go to the NASA variables table ↓", "Ir a la tabla de variables de NASA ↓"), go: onWitnesses }}
    secondary={{ label: t("Back to the global atlas", "Volver al atlas global"), go: onBack }}
    credit="MODIS Terra surface reflectance, same growing season in 2004 and 2024 · NASA via Google Earth Engine" />;
}

/** Every analysis tool, already pointed at this aquifer. */
function AquiferTools({ m, a, onCase, onGo }: { m: Manifest; a: AtlasEntry; onCase: (id: string) => void; onGo: (hash: string) => void }) {
  const { t } = useLocale();
  const others = (m.atlas ?? []).filter((x) => x.id !== a.id);
  const [other, setOther] = useState(a.id === "ZW" ? "ZC" : "ZW");
  const o = others.find((x) => x.id === other) ?? others[0];
  const compare = () => onGo(`#compare?left=${encodeURIComponent(a.tws.id)}&right=${encodeURIComponent(o.tws.id)}`);
  return <section className="aq-tools" aria-labelledby="aq-tools-title">
    <h2 id="aq-tools-title">{t(`Analyze ${short(a.name)}`, `Analizar ${short(a.name)}`)}</h2>
    <div className="aq-tools-grid">
      <div>
        <h3>{t("Analyze a NASA variable", "Analizar una variable de NASA")}</h3>
        <p>{t("Select a variable to see its monthly series, trend estimate and statistical tests.", "Selecciona una variable para ver su serie mensual, la tendencia estimada y sus pruebas estadísticas.")}</p>
        <div className="aq-tool-links">{WITNESSES.map(({ key, name, spanish }) => a[key] &&
          <button key={key} onClick={() => onCase(a[key]!.id)}>{t(name.split(" · ")[0], spanish.split(" · ")[0])}</button>)}</div>
      </div>
      <div>
        <h3>{t("Compare with another aquifer", "Comparar con otro acuífero")}</h3>
        <p>{t("Choose a second aquifer and press the button to compare the GRACE trends in total water storage in both regions.", "Elige otro acuífero y pulsa el botón para comparar las tendencias de almacenamiento total de agua de GRACE en ambas regiones.")}</p>
        <div className="aq-tool-row">
          <select value={o.id} onChange={(e) => setOther(e.target.value)} aria-label={t("Aquifer to compare with", "Acuífero con el que se comparará")}>
            {others.map((x) => <option key={x.id} value={x.id}>{short(x.name)}</option>)}
          </select>
          <button className="aq-tool-go" onClick={compare}>{t("Open GRACE comparison", "Abrir comparación de GRACE")}</button>
        </div>
      </div>
      <div>
        <h3>{t("Test the statistical methods", "Probar los métodos estadísticos")}</h3>
        <p>{t("Replay series with no trend and compare how often the tests report a false alarm.", "Reproduce series sin tendencia y compara con qué frecuencia las pruebas reportan una falsa alarma.")}</p>
        <button className="aq-tool-go" onClick={() => onGo("#method")}>{t("Explore the false alarm simulation", "Explorar la simulación de falsas alarmas")}</button>
      </div>
      <div>
        <h3>{t("Data provenance", "Origen de los datos")}</h3>
        <p>{t("See NASA products, their versions and DOI links.", "Consulta los productos de NASA, sus versiones y los enlaces a sus DOI.")}</p>
        <button className="aq-tool-go" onClick={() => onGo("#sources")}>{t("View datasets and DOI links", "Ver conjuntos de datos y enlaces DOI")}</button>
      </div>
    </div>
  </section>;
}

const fmtN = (x: number | null | undefined, d = 1) => x === null || x === undefined ? "n/a" : Math.abs(x).toLocaleString("en-US", { maximumFractionDigits: d });

/** Impact figures, the evidence map, cropland against natural land, and guided cases: Ica's tools for every aquifer. */
function AquiferExtras({ m, a, onCase, onGo }: { m: Manifest; a: AtlasEntry; onCase: (id: string) => void; onGo: (hash: string) => void }) {
  const { t } = useLocale();
  const [layer, setLayer] = useState(true);
  const im = a.impact;
  const ica = a.id === "ZW";
  const falling = proven(a.tws) && (a.tws.per_decade ?? 0) < 0;
  const alarm = WITNESSES.map(({ key }) => a[key]).find((w) => w?.classic_false_alarm);
  const gaps = [
    { w: a.ndvi_gap, name: t("Greenness gap", "Brecha de verdor"), text: t("Cropland greenness minus natural land, both standardized by calendar month.", "Verdor de los cultivos menos el del terreno natural. Ambas series se estandarizan por mes calendario.") },
    { w: a.lst_gap, name: t("Surface temperature gap", "Brecha de temperatura superficial"), text: t("Cropland surface temperature minus natural land, both standardized by calendar month.", "Temperatura superficial de los cultivos menos la del terreno natural. Ambas series se estandarizan por mes calendario.") },
  ].filter((g) => g.w);
  const leads = [
    { title: falling ? t("Investigate the decline in total water", "Investigar el descenso de agua total") : t("Investigate total water storage", "Investigar el almacenamiento total de agua"), text: t("See the monthly GRACE series, its trend and uncertainty.", "Consulta la serie mensual de GRACE, su tendencia y su incertidumbre."), go: () => onCase(a.tws.id) },
    a.ndvi_gap && { title: t("Greener than the land around", "Más verde que el terreno cercano"), text: t("See how the greenness gap between cropland and natural land changed over time.", "Consulta cómo cambió con el tiempo la brecha de verdor entre cultivos y terreno natural."), go: () => onCase(a.ndvi_gap!.id) },
    a.lst_gap && { title: t("Hot or cool fields?", "¿Campos más cálidos o más fríos?"), text: t("See how the surface temperature gap between cropland and natural land changed over time.", "Consulta cómo cambió con el tiempo la brecha de temperatura superficial entre cultivos y terreno natural."), go: () => onCase(a.lst_gap!.id) },
    alarm ? { title: t("When tests disagree", "Cuando las pruebas discrepan"), text: t("See which statistical tests detected a trend in this record and which did not.", "Consulta qué pruebas estadísticas detectaron una tendencia en esta serie y cuáles no."), go: () => onCase(alarm.id) }
      : { title: t("When tests disagree", "Cuando las pruebas discrepan"), text: t("Explore a simulation to see how often tests detect a trend in series with no trend.", "Explora una simulación para ver con qué frecuencia las pruebas detectan una tendencia en series sin tendencia."), go: () => onGo("#method") },
  ].filter(Boolean) as { title: string; text: string; go: () => void }[];

  return <>
    {im && <section className="aq-impact" aria-label="Impact">
      <div><strong className="num">{im.grace_km3_per_yr === null ? "n/a" : `${im.grace_km3_per_yr < 0 ? "−" : "+"}${Math.abs(im.grace_km3_per_yr) < 0.1
          ? `${fmtN(Math.abs(im.grace_km3_per_yr) * 1000, 0)} million m³` : `${fmtN(im.grace_km3_per_yr, 1)} km³`}`}</strong>
        <span>per year in estimated total water storage across the study area (GRACE trend × {Math.round(a.area_km2).toLocaleString("en-US")} km²). {WORD[a.tws.verdict]}.</span></div>
      {im.crop_water_mm3_2020_2024 !== undefined && <div><strong className="num">{fmtN(im.crop_water_mm3_2020_2024! >= 1000 ? im.crop_water_mm3_2020_2024! / 1000 : im.crop_water_mm3_2020_2024!, 1)} {im.crop_water_mm3_2020_2024! >= 1000 ? "km³" : "million m³"}</strong>
        <span>{ica ? `of water used by crops each year, 2020–2024 (MODIS ET × ${fmtN(im.cropland_km2, 0)} km² of cropland in Villacurí, where almost no rain falls; a lower bound)`
          : `evaporated each year by ${fmtN(im.cropland_km2, 0)} km² of cropland, 2020–2024 (MODIS ET; rain and irrigation together)`}</span></div>}
      <div><strong className="num">{fmtN(a.grace_footprints, 2)}</strong><span>Approximate GRACE footprints covered by the study area. Spatial scale affects how well GRACE can resolve local changes.</span></div>
    </section>}

    {ica && <section className="aq-map" aria-labelledby="aq-map-title">
      <div className="aq-section-head"><h2 id="aq-map-title">{t("Evidence map", "Mapa de evidencias")}</h2></div>
      <p className="aq-gaps-lede">{t("Open the interactive map to select a well or switch to the GLDAS and GRACE views.", "Abre el mapa interactivo para seleccionar un pozo o cambiar entre las vistas de GLDAS y GRACE.")}</p>
      <button className="aq-link" onClick={() => onGo("#map")}>{t("Open the Ica evidence map", "Abrir el mapa de evidencias de Ica")}</button>
    </section>}
    {!ica && <section className="aq-map" aria-labelledby="aq-map-title">
      <div className="aq-section-head">
        <h2 id="aq-map-title">{t("Evidence map", "Mapa de evidencias")}</h2>
        <label className="aq-switch"><input type="checkbox" checked={layer} onChange={(e) => setLayer(e.target.checked)} /> {t("Show greenness changes on the image", "Mostrar cambios de verdor sobre la imagen")}</label>
      </div>
      <figure className="aq-map-figure">
        <img src={asset(`img/aquifers/${a.id}_2024.jpg`)} alt={`${a.name} in 2024`} />
        {layer && <img className="aq-map-layer" src={asset(`img/aquifers/${a.id}_trend.png`)} alt="Per-pixel trend of annual maximum greenness, 2004–2024" />}
        <figcaption>
          <span className="aq-map-legend"><i style={{ background: "#3f3e3d" }} />less green <i style={{ background: "#b0afae" }} /> <i style={{ background: "#7fa6d6" }} /> <i style={{ background: "#3c78bb" }} />greener</span>
          Sen slope of the annual maximum NDVI per pixel (MODIS MOD13Q1), 2004–2024, shown where it exceeds 0.04 per decade, over the 2024 MODIS picture. Same method as Ica's map.
        </figcaption>
      </figure>
    </section>}

    {gaps.length > 0 && <section className="aq-gaps" aria-labelledby="aq-gaps-title">
      <h2 id="aq-gaps-title">{ica ? t("Fields against the desert", "Campos frente al desierto") : t("Cropland against natural land", "Cultivos frente a terreno natural")}</h2>
      <p className="aq-gaps-lede">{t("Select a variable to see how the difference between the two areas changed over time, with a chart and statistical tests for the gap.",
        "Selecciona una variable para ver cómo cambió la diferencia entre las dos zonas con el tiempo, con un gráfico y pruebas estadísticas de la brecha.")}</p>
      <table className="aq-witnesses">
        <thead><tr><th scope="col">{t("Comparison", "Comparación")}</th><th scope="col">{t("Annual gap", "Brecha anual")}</th><th scope="col" className="r">{t("Change", "Cambio")}</th><th scope="col">{t("Verdict", "Veredicto")}</th></tr></thead>
        <tbody>{gaps.map(({ w, name, text }) => <tr key={name} onClick={() => onCase(w!.id)}>
          <th scope="row"><button type="button" onClick={(e) => { e.stopPropagation(); onCase(w!.id); }}>
            {name} <span className="table-action">{t("View the gap analysis →", "Ver análisis de la brecha →")}</span>
          </button><small>{text}</small></th>
          <td><Spark path={m.cases.find((c) => c.id === w!.id)?.path ?? null} tone={dirOf(w!)} /></td>
          <td className="r num">{w!.per_decade === null ? "n/a" : `${(w!.per_decade > 0 ? "+" : "−")}${fmtN(w!.per_decade, 2)} SD/decade`}</td>
          <td><Verdict w={w!} /></td>
        </tr>)}</tbody>
      </table>
    </section>}

    <section className="aq-leads" aria-labelledby="aq-leads-title">
      <h2 id="aq-leads-title">{t("Guided cases", "Casos guiados")}</h2>
      <div className="aq-leads-grid">{leads.map((l) => <button key={l.title} type="button" onClick={l.go}><strong>{l.title}</strong><span>{l.text}</span></button>)}</div>
    </section>
  </>;
}
