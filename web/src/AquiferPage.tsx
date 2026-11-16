// AI-assisted: Claude (Anthropic). One aquifer's page: the 2004 / 2024 lens, interpretation and NASA variables.
// Every number comes from the engine's manifest; nothing is computed here.
import { useMemo, useState } from "react";
import { asset, useJSON } from "./data";
import { HeroMap } from "./HeroMap";
import { LensHero, type LensStop } from "./LensHero";
import { useAtlasLocale } from "./atlas-locale";
import { verdictLabel } from "./evidence";
import { useLocale } from "./i18n";
import { dirOf, IndiaHistoricalContext, proven, Spark, Verdict, WITNESSES } from "./Atlas";
import type { AtlasEntry, Manifest } from "./types";

interface Tour { [zone: string]: { ratio: number; bbox: [number, number, number, number]; stops: { lon: number; lat: number; change: string }[] } }

/** Headline from the verdicts: what the satellites see on the surface and in the water below. */
function headline(a: AtlasEntry, t: ReturnType<typeof useLocale>["t"]) {
  const down = proven(a.tws) && (a.tws.per_decade ?? 0) < 0;
  const green = !!a.ndvi && proven(a.ndvi) && (a.ndvi.per_decade ?? 0) > 0;
  return <>{green ? t("Greener fields.", "Campos más verdes.") : t("No proven change in greenness.", "Sin cambios demostrados en el verdor.")}
    <br /><em>{down ? t("Total water storage is decreasing.", "Disminuye el almacenamiento total de agua.")
      : t("No proven loss from space.", "Sin pérdida demostrada desde el espacio.")}</em></>;
}

export function AquiferPage({ m, id, onCase, onIca, onBack, onGo }: {
  m: Manifest; id: string; onCase: (id: string) => void; onIca: () => void; onBack: () => void;
  onGo: (hash: string) => void;   // open another view (compare, method, sources)
}) {
  const { t, fmt } = useLocale();
  const { name, countries, description, reading, amount } = useAtlasLocale();
  const a = (m.atlas ?? []).find((x) => x.id === id);
  if (!a) return <section className="wrap wide aq-page"><p>{t("Unknown aquifer.", "Acuífero desconocido.")} <button className="aq-link" onClick={onBack}>{t("Back to the globe", "Volver al globo")}</button></p></section>;
  const ica = a.id === "ZW";
  const toWitnesses = () => document.getElementById("aq-witnesses")?.scrollIntoView({ behavior: "smooth", block: "start" });
  return <>
  {ica ? <HeroMap m={m} primary={{ label: t("See the NASA variables ↓", "Ver las variables de NASA ↓"), go: toWitnesses }} />
    : <AquiferLens a={a} onWitnesses={toWitnesses} onBack={onBack} />}
  <section className="aq-page" aria-labelledby="aq-title">
    <div className="wrap wide">
      <button className="aq-back" onClick={onBack}>{t("All aquifers", "Todos los acuíferos")}</button>
      <p className="aq-meta">{countries(a)} <span>·</span> {fmt(Math.round(a.area_km2))} km² <span>·</span> {fmt(a.grace_footprints, 2)} {t("GRACE footprints", "huellas de GRACE")}</p>
      <h1 id="aq-title">{name(a)}</h1>
      <p className="aq-desc">{description(a)}</p>
      <div className="aq-reading-row">
        <p className="aq-reading">{reading(a)}</p>
        <p className="aq-ref">{t("Reference", "Referencia")}: {ica ? t(a.reference, "Este proyecto: datos de pozos de JUASVI (2025)") : a.reference}
          {ica && t(". Ica's rainfall series covers the Andean headwaters and its crop series covers Villacurí.",
            ". La serie de precipitación de Ica corresponde a la cabecera andina y las series agrícolas, a Villacurí.")}</p>
        {ica && <button className="aq-link" onClick={onIca}>{t("See satellite images and field well context for Ica", "Ver las imágenes satelitales y el contexto de los pozos de Ica")}</button>}
      </div>

      <table className="aq-witnesses" id="aq-witnesses">
        <caption>{t(
          `${WITNESSES.filter(({ key }) => a[key]).length} NASA variables, 2004–2024. Select a variable to view its monthly data, estimated trend and statistical tests for this aquifer.`,
          `${WITNESSES.filter(({ key }) => a[key]).length} variables de NASA · 2004–2024. Selecciona una variable para ver sus datos mensuales, la tendencia estimada y las pruebas estadísticas de este acuífero.`,
        )}</caption>
        <thead><tr><th scope="col">{t("NASA variable", "Variable de NASA")}</th><th scope="col">{t("Annual anomaly", "Anomalía anual")}</th><th scope="col" className="r">{t("Change", "Cambio")}</th><th scope="col">{t("Verdict", "Veredicto")}</th></tr></thead>
        <tbody>{WITNESSES.map(({ key, name, spanish, kind, kindEs }) => {
          const w = a[key];
          if (!w) return null;
          const path = m.cases.find((c) => c.id === w.id)?.path ?? null;
          return <tr key={key} onClick={() => onCase(w.id)}>
            <th scope="row"><button type="button" onClick={(e) => { e.stopPropagation(); onCase(w.id); }}>
              {t(name, spanish)} <span className="table-action">{t("View NASA trend analysis →", "Ver análisis de tendencias de NASA →")}</span>
            </button><small>{t(kind, kindEs)}{w.classic_false_alarm ? t(" · a classic test would call this significant", " · una prueba clásica la consideraría significativa") : ""}</small></th>
            <td><Spark path={path} tone={dirOf(w)} /></td>
            <td className="r num">{amount(w)}</td>
            <td><Verdict w={w} regional={ica && key === "tws"} /></td>
          </tr>;
        })}</tbody>
      </table>
      <AquiferExtras m={m} a={a} onCase={onCase} />
      <AquiferTools m={m} a={a} onGo={onGo} />
    </div>
  </section>
  </>;
}

/** The Ica-style landing view for any aquifer: MODIS 2004 outside the lens, 2024 inside, touring the four places where
 *  the surface changed most. The cards carry the aquifer-wide witnesses, and say so. */
function AquiferLens({ a, onWitnesses, onBack }: { a: AtlasEntry; onWitnesses: () => void; onBack: () => void }) {
  const { t, language } = useLocale();
  const { amount, name, shortName, countries, reading } = useAtlasLocale();
  const { data: tour } = useJSON<Tour>("aquifer_tour.json");
  const scene = tour?.[a.id];
  const stops: LensStop[] = useMemo(() => {
    if (!scene) return [];
    const ws = WITNESSES.filter((w) => ["tws", "gws", "ndvi", "et"].includes(w.key)).map((w) => ({ ...w, v: a[w.key] })).filter((w) => w.v);
    return scene.stops.map((s, i) => {
      const w = ws[i % ws.length];
      return { lon: s.lon, lat: s.lat, place: `${t("Across the aquifer", "En todo el acuífero")} · ${t(w.name, w.spanish)}`,
        finding: amount(w.v!), verdict: verdictLabel(language, w.v!.verdict), tone: w.v!.verdict, source: `${t(w.kind, w.kindEs)} · 2004–2024`,
        note: t(`Lens: looks ${s.change} here in 2024 than in 2004. The lens compares two MODIS images.`,
          `En este punto, la superficie se ve ${s.change === "greener" ? "más verde" : "menos verde"} en 2024 que en 2004. La lupa compara dos imágenes de MODIS.`),
        alarm: w.v!.classic_false_alarm ? t("The classic test finds a significant result, but the combined evidence is inconclusive.",
          "La prueba clásica encuentra un resultado significativo, pero la evidencia combinada no es concluyente.") : undefined };
    });
  }, [scene, a, language, t, amount]);
  if (!scene) return <header className="hero-map"><div className="hm-stage" /></header>;
  return <LensHero before={asset(`img/aquifers/${a.id}_2004.jpg`)} after={asset(`img/aquifers/${a.id}_2024.jpg`)}
    altBefore={t(`MODIS true-color image of ${name(a)} in 2004`, `Imagen MODIS en color natural de ${name(a)} en 2004`)}
    altAfter={t("The same area in 2024, seen through the lens", "La misma zona en 2024, vista a través de la lupa")}
    bbox={scene.bbox} ratio={scene.ratio} stops={stops}
    kicker={`${shortName(a)} · ${countries(a)} · ${t("NASA Earth observations", "Observaciones de la Tierra de NASA")}`}
    title={headline(a, t)} lede={reading(a)}
    primary={{ label: t("See the NASA variables ↓", "Ver las variables de NASA ↓"), go: onWitnesses }}
    secondary={{ label: t("All aquifers", "Todos los acuíferos"), go: onBack }}
    credit={t("MODIS Terra surface reflectance, same growing season in 2004 and 2024 · NASA via Google Earth Engine",
      "Reflectancia de superficie de MODIS Terra, misma temporada de cultivo en 2004 y 2024 · NASA mediante Google Earth Engine")} />;
}

/** Every analysis tool, already pointed at this aquifer. */
function AquiferTools({ m, a, onGo }: { m: Manifest; a: AtlasEntry; onGo: (hash: string) => void }) {
  const { t } = useLocale();
  const { shortName } = useAtlasLocale();
  const others = (m.atlas ?? []).filter((x) => x.id !== a.id);
  const [other, setOther] = useState(a.id === "ZW" ? "ZC" : "ZW");
  const o = others.find((x) => x.id === other) ?? others[0];
  if (!o) return null;
  const compare = () => onGo(`#compare?left=${encodeURIComponent(a.tws.id)}&right=${encodeURIComponent(o.tws.id)}`);
  return <section className="aq-tools" aria-labelledby="aq-tools-title">
    <h2 id="aq-tools-title">{t(`Analyze ${shortName(a)}`, `Analizar ${shortName(a)}`)}</h2>
    <div className="aq-tools-grid">
      <div>
        <h3>{t("Compare with another aquifer", "Comparar con otro acuífero")}</h3>
        <p>{t("Choose another aquifer to compare total water storage from GRACE on the same timeline.",
          "Elige otro acuífero para comparar el almacenamiento total de agua de GRACE en el mismo eje temporal.")}</p>
        <div className="aq-tool-row">
          <select value={o.id} onChange={(e) => setOther(e.target.value)} aria-label={t("Aquifer to compare with", "Acuífero con el que se comparará")}>
            {others.map((x) => <option key={x.id} value={x.id}>{shortName(x)}</option>)}
          </select>
          <button className="aq-tool-go" onClick={compare}>{t("Compare GRACE trends", "Comparar tendencias de GRACE")}</button>
        </div>
      </div>
      <div>
        <h3>{t("Put the tests on trial", "Pon a prueba los métodos estadísticos")}</h3>
        <p>{t("Simulate correlated data with no trend and see how often a classic test raises a false alarm.",
          "Simula datos correlacionados sin tendencia y comprueba con qué frecuencia una prueba clásica da una falsa alarma.")}</p>
        <button className="aq-tool-go" onClick={() => onGo("#method")}>{t("Explore the false alarm simulation", "Explorar la simulación de falsas alarmas")}</button>
      </div>
      <div>
        <h3>{t("Sources", "Fuentes")}</h3>
        <p>{t("See each NASA product with its version and DOI, and how AI was used.", "Consulta la versión y el DOI de cada producto de NASA y cómo se usó la IA.")}</p>
        <button className="aq-tool-go" onClick={() => onGo("#sources")}>{t("View datasets and DOI links", "Ver conjuntos de datos y enlaces DOI")}</button>
      </div>
    </div>
  </section>;
}

/** Impact figures, per-pixel greenness evidence and cropland against natural land. */
function AquiferExtras({ m, a, onCase }: { m: Manifest; a: AtlasEntry; onCase: (id: string) => void }) {
  const { t, fmt, signed } = useLocale();
  const { name } = useAtlasLocale();
  const [layer, setLayer] = useState(true);
  const im = a.impact;
  const ica = a.id === "ZW";
  const gaps = [
    { w: a.ndvi_gap, name: t("Greenness gap", "Brecha de verdor"), text: t(
      "Cropland greenness minus natural land, with both series standardized by calendar month.",
      "Verdor de los cultivos menos verdor del terreno natural, con ambas series estandarizadas por mes calendario.") },
    { w: a.lst_gap, name: t("Surface temperature gap", "Brecha de temperatura superficial"), text: t(
      "Cropland surface temperature minus natural land, with both series standardized by calendar month.",
      "Temperatura superficial de los cultivos menos la del terreno natural, con ambas series estandarizadas por mes calendario.") },
  ].filter((g) => g.w);
  const water = im?.grace_km3_per_yr;
  const cropWater = im?.crop_water_mm3_2020_2024;
  const millions = t("million m³", "millones de m³");
  return <>
    {im && <section className="aq-impact" aria-label={t("Impact", "Impacto")}>
      {!ica && <div><strong className="num">{water == null ? fmt(null) : Math.abs(water) < 0.1
        ? `${signed(Math.round(water * 1000))} ${millions}` : `${signed(water)} km³`}</strong>
        <span>{t(`per year in estimated total water storage in 2004–2024 (GRACE trend × ${fmt(Math.round(a.area_km2))} km²).`,
          `al año en el almacenamiento total de agua estimado entre 2004 y 2024 (tendencia de GRACE × ${fmt(Math.round(a.area_km2))} km²).`)}
          {a.id === "ZIN" && <IndiaHistoricalContext />}</span></div>}
      {cropWater != null && <div><strong className="num">{fmt(cropWater >= 1000 ? cropWater / 1000 : cropWater)} {cropWater >= 1000 ? "km³" : millions}</strong>
        <span>{ica ? t(
          `estimated annual crop water use, 2020–2024 (MODIS ET over ${fmt(im.cropland_km2)} km² in Villacurí, a lower bound).`,
          `de uso anual estimado de agua por los cultivos, 2020–2024 (MODIS ET en ${fmt(im.cropland_km2)} km² de Villacurí, un límite inferior).`,
        ) : t(
          `of annual evapotranspiration from ${fmt(im.cropland_km2)} km² of cropland, 2020–2024. MODIS ET includes rain and irrigation together and measures a different quantity from GRACE.`,
          `de evapotranspiración anual en ${fmt(im.cropland_km2)} km² de cultivos, 2020–2024. MODIS ET incluye lluvia y riego y mide una cantidad distinta de la que estima GRACE.`,
        )}</span></div>}
      <div><strong className="num">{fmt(a.grace_footprints, 2)}</strong><span>{t(
        "Approximate GRACE footprints covered by the study area. Spatial resolution affects which changes the satellite can locate.",
        "Huellas aproximadas de GRACE que abarca el área de estudio. La resolución espacial afecta qué cambios puede localizar el satélite.",
      )}</span></div>
    </section>}

    {!ica && <section className="aq-map" aria-labelledby="aq-map-title">
      <div className="aq-section-head">
        <h2 id="aq-map-title">{t("Greenness trend map", "Mapa de tendencias de verdor")}</h2>
        <label className="aq-switch"><input type="checkbox" checked={layer} onChange={(e) => setLayer(e.target.checked)} /> {t("Greenness trend layer", "Capa de tendencia del verdor")}</label>
      </div>
      <figure className="aq-map-figure">
        <img src={asset(`img/aquifers/${a.id}_2024.jpg`)} alt={t(`${name(a)} in 2024`, `${name(a)} en 2024`)} />
        {layer && <img className="aq-map-layer" src={asset(`img/aquifers/${a.id}_trend.png`)}
          alt={t("Per-pixel trend of annual maximum greenness, 2004–2024", "Tendencia por píxel del verdor máximo anual, 2004–2024")} />}
        <figcaption>
          <span className="aq-map-legend"><i style={{ background: "#3f3e3d" }} />{t("less green", "menos verde")} <i style={{ background: "#b0afae" }} /> <i style={{ background: "#7fa6d6" }} /> <i style={{ background: "#3c78bb" }} />{t("greener", "más verde")}</span>
          {t("Sen slope of annual maximum NDVI per pixel (MODIS MOD13Q1), 2004–2024, shown where its magnitude exceeds 0.04 per decade, over the 2024 MODIS image.",
            "Pendiente de Sen del NDVI máximo anual por píxel (MODIS MOD13Q1), 2004–2024. Sobre la imagen MODIS de 2024 se resaltan las pendientes cuya magnitud supera 0,04 por década.")}
        </figcaption>
      </figure>
    </section>}

    {gaps.length > 0 && <section className="aq-gaps" aria-labelledby="aq-gaps-title">
      <h2 id="aq-gaps-title">{ica ? t("Fields against the desert", "Campos frente al desierto") : t("Cropland against natural land", "Cultivos frente a terreno natural")}</h2>
      <p className="aq-gaps-lede">{t("Select a variable to see the chart and statistical tests for the difference between the two areas.",
        "Selecciona una variable para ver el gráfico y las pruebas estadísticas de la diferencia entre las dos áreas.")}</p>
      <table className="aq-witnesses">
        <thead><tr><th scope="col">{t("Comparison", "Comparación")}</th><th scope="col">{t("Annual gap", "Brecha anual")}</th><th scope="col" className="r">{t("Change", "Cambio")}</th><th scope="col">{t("Verdict", "Veredicto")}</th></tr></thead>
        <tbody>{gaps.map(({ w, name, text }) => <tr key={name} onClick={() => onCase(w!.id)}>
          <th scope="row"><button type="button" onClick={(e) => { e.stopPropagation(); onCase(w!.id); }}>{name} <span className="table-action">{t("View the gap analysis →", "Ver análisis de la brecha →")}</span></button><small>{text}</small></th>
          <td><Spark path={m.cases.find((c) => c.id === w!.id)?.path ?? null} tone={dirOf(w!)} /></td>
          <td className="r num">{w!.per_decade === null ? fmt(null) : `${signed(w!.per_decade, 2)} ${t("SD/decade", "DE/década")}`}</td>
          <td><Verdict w={w!} /></td>
        </tr>)}</tbody>
      </table>
    </section>}

  </>;
}
