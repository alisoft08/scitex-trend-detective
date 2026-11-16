// AI-assisted: Claude (Anthropic). World aquifer atlas: search or spin the globe to pick an aquifer, read its six NASA
// witnesses, then compare all of them. Every number comes from the engine's manifest; nothing is computed here.
import { useEffect, useMemo, useState } from "react";
import { Globe, type GlobeMarker } from "./Globe";
import { DetectabilityChart } from "./DetectabilityChart";
import { ThreeWays } from "./ThreeWays";
import { asset, useJSON } from "./data";
import { useAtlasLocale } from "./atlas-locale";
import { verdictLabel } from "./evidence";
import { LanguageSelect, toolsNavigation, useLocale } from "./i18n";
import type { AtlasEntry, AtlasWitness, CaseFile, Manifest } from "./types";

export const proven = (w?: AtlasWitness) => !!w && (w.verdict === "confirmed" || w.verdict === "likely");
export const tone = (a: AtlasEntry): GlobeMarker["tone"] => !proven(a.tws) ? "flat" : (a.tws.per_decade ?? 0) < 0 ? "down" : "up";
const arrow = (t: GlobeMarker["tone"]) => t === "down" ? "↓" : t === "up" ? "↑" : "?";
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const WITNESSES: { key: "tws" | "gws" | "rain" | "ndvi" | "et" | "t2m" | "lst"; name: string; spanish: string; kind: string; kindEs: string }[] = [
  { key: "tws", name: "Total water · GRACE", spanish: "Agua total · GRACE", kind: "Observed", kindEs: "Observación" },
  { key: "gws", name: "Groundwater · GLDAS", spanish: "Agua subterránea · GLDAS", kind: "Model fed by GRACE", kindEs: "Modelo alimentado por GRACE" },
  { key: "rain", name: "Rain · GPM IMERG", spanish: "Precipitación · GPM IMERG", kind: "Estimated", kindEs: "Estimación" },
  { key: "ndvi", name: "Cropland greenness · MODIS", spanish: "Verdor de los cultivos · MODIS", kind: "Observed", kindEs: "Observación" },
  { key: "et", name: "Crop water use · MODIS ET", spanish: "Uso de agua de los cultivos · MODIS ET", kind: "Estimated", kindEs: "Estimación" },
  { key: "t2m", name: "Air temperature · MERRA-2", spanish: "Temperatura del aire · MERRA-2", kind: "Reanalysis", kindEs: "Reanálisis" },
  { key: "lst", name: "Cropland surface heat · MODIS LST", spanish: "Temperatura superficial de los cultivos · MODIS LST", kind: "Observed", kindEs: "Observación" },
];

// Mini-card side per aquifer, chosen so neighbours (Arabia and Tigris-Euphrates, California and the High Plains) do not overlap.
const MINI_DIR: Record<string, NonNullable<GlobeMarker["dir"]>> = {
  ZW: "sw", ZC: "nw", ZHP: "ne", ZIN: "se", ZAR: "sw", ZTE: "nw", ZGU: "se",
};
// Largest confirmed loss first: the globe opens on the clearest example.
const startId = (atlas: AtlasEntry[]) => [...atlas].filter((a) => tone(a) === "down")
  .sort((a, b) => (a.tws.per_decade ?? 0) - (b.tws.per_decade ?? 0))[0]?.id ?? atlas[0]?.id ?? "";

// The welcome curtain plays once per page load, not on every return to the home view.
let introPlayed = false;
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Welcome({ onDone }: { onDone: () => void }) {
  const { t } = useLocale();
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 1500), t2 = setTimeout(onDone, 2200);
    const skip = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "Enter") { clearTimeout(t1); clearTimeout(t2); onDone(); } };
    window.addEventListener("keydown", skip);
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener("keydown", skip); };
  }, []);
  return <div className={`atlas-welcome ${leaving ? "leaving" : ""}`} role="dialog" aria-label={t("Welcome", "Bienvenida")} onClick={onDone}>
    <p>{t("Welcome to", "Te damos la bienvenida a")} <strong>Oasis Paradox</strong></p>
    <span>{t("by SciTeX", "por SciTeX")} · NASA Space Apps Challenge 2026</span>
  </div>;
}

/** Short facts that rotate at the top right; every number comes from the manifest. */
function useAtlasFacts(m: Manifest, atlas: AtlasEntry[]): string[] {
  const { t } = useLocale();
  const { amount, shortName } = useAtlasLocale();
  const falling = atlas.filter((a) => proven(a.tws) && (a.tws.per_decade ?? 0) < 0);
  // "Confirms" only for confirmed verdicts; likely ones are counted apart (both pass the engine, with different strength).
  const confirmedLoss = falling.filter((a) => a.tws.verdict === "confirmed");
  const likelyLoss = falling.length - confirmedLoss.length;
  const worst = [...confirmedLoss].sort((a, b) => (a.tws.per_decade ?? 0) - (b.tws.per_decade ?? 0))[0];
  const disagreements = atlas.reduce((n, a) => n + [a.tws, a.gws, a.rain, a.ndvi, a.et, a.t2m].filter((w) => w?.classic_false_alarm).length, 0);
  const greening = atlas.filter((a) => proven(a.ndvi) && (a.ndvi?.per_decade ?? 0) > 0 && proven(a.et) && (a.et?.per_decade ?? 0) > 0
    && falling.includes(a)).length;   // the sentence claims both greener and more water use, so both are required
  return [
    t(
      `One engine, the same NASA data, ${atlas.length} irrigated aquifers chosen from published GRACE hotspots. GRACE shows a loss in ${falling.length}: ${confirmedLoss.length} confirmed and ${likelyLoss} likely.`,
      `Un mismo motor y los mismos datos de NASA para ${atlas.length} acuíferos irrigados seleccionados de estudios previos con GRACE. GRACE indica ${falling.length} descensos: ${confirmedLoss.length} confirmados y ${likelyLoss} ${likelyLoss === 1 ? "probable" : "probables"}.`,
    ),
    worst ? t(`${shortName(worst)} loses ${amount(worst.tws).replace("−", "")} of water: the largest confirmed loss in the atlas.`,
      `${shortName(worst)} pierde ${amount(worst.tws).replace("−", "")} de agua, el mayor descenso confirmado del atlas.`) : "",
    t("Where the farms are small, as in Ica, GRACE cannot locate the loss. Wells provide local measurements.",
      "En zonas agrícolas pequeñas, como Ica, GRACE no puede localizar la pérdida. Los pozos aportan mediciones locales."),
    greening ? t(`In ${greening} draining aquifers the cropland is getting greener and using more water.`,
      `En ${greening} acuíferos con descensos, los cultivos están más verdes y usan más agua.`) : "",
    disagreements ? t(`The classic test found ${disagreements} significant results that the combined criteria classified as inconclusive.`,
      `La prueba clásica encontró ${disagreements} resultados significativos que el criterio combinado dejó como no concluyentes.`) : "",
    t(`21 years of NASA data, 2004–2024: GRACE, GLDAS, GPM IMERG, MODIS and MERRA-2. ${m.cases.length} case files.`,
      `21 años de datos de NASA, 2004–2024: GRACE, GLDAS, GPM IMERG, MODIS y MERRA-2. ${m.cases.length} análisis disponibles.`),
  ].filter(Boolean);
}

export const dirOf = (w: AtlasWitness): "down" | "up" | "flat" => !proven(w) ? "flat" : (w.per_decade ?? 0) < 0 ? "down" : "up";
const VERDICT_WORD: Record<AtlasWitness["verdict"], string> = { confirmed: "Confirmed", likely: "Likely", inconclusive: "Inconclusive", insufficient_data: "Insufficient data" };

export function IndiaHistoricalContext() {
  const { t, fmt } = useLocale();
  return t(
    ` For historical context, Rodell et al. (2009) estimated a groundwater loss of ${fmt(17.7)} ± ${fmt(4.5)} km³ per year in 2002–2008 for a different study area.`,
    ` Como contexto histórico, Rodell et al. (2009) estimaron una pérdida de agua subterránea de ${fmt(17.7)} ± ${fmt(4.5)} km³ al año entre 2002 y 2008, para un área de estudio distinta.`,
  );
}

/** A dot and a word: filled for confirmed, ring for likely, hollow grey when inconclusive. */
export function Verdict({ w, compact = false, regional = false }: { w: AtlasWitness; compact?: boolean; regional?: boolean }) {
  const { t, language } = useLocale();
  const d = dirOf(w);
  const word = d === "flat" ? verdictLabel(language, w.verdict) : t(
    `${VERDICT_WORD[w.verdict]}${regional ? " regional" : ""} ${d === "down" ? "fall" : "rise"}`,
    `${d === "down" ? "Descenso" : "Aumento"} ${w.verdict === "confirmed" ? "confirmado" : "probable"}${regional ? " en la región" : ""}`,
  );
  return <span className={`vd ${d} ${w.verdict} ${compact ? "compact" : ""}`} title={word}><i aria-hidden="true" />{compact ? <span className="sr-only">{word}</span> : word}</span>;
}

/** Annual means of the monthly anomalies, drawn as a small line (display only; no statistics here). */
export function Spark({ path, tone }: { path: string | null; tone: "down" | "up" | "flat" }) {
  const { t } = useLocale();
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
  return <svg className={`spark ${tone}`} viewBox="0 0 120 30" role="img" aria-label={t(`Annual anomalies ${x0}–${x1}`, `Anomalías anuales ${x0}–${x1}`)}><path d={d} /></svg>;
}

export function Atlas({ m, onCase, onPick, onOpen, showLanguage }: {
  m: Manifest; onCase: (id: string) => void; onPick: () => void; onOpen: (id: string) => void; showLanguage: boolean;
}) {
  const { t, fmt, signed } = useLocale();
  const { name, shortName, countries, amount, list } = useAtlasLocale();
  const atlas = m.atlas ?? [];
  const facts = useAtlasFacts(m, atlas);
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
  const markers: GlobeMarker[] = useMemo(() => (m.atlas ?? []).map((x) => ({
    id: x.id, lonlat: x.lonlat, label: shortName(x).replace(/ \(.*\)/, ""), tone: tone(x),
    thumb: asset(`img/aquifers/${x.id}.jpg`), value: x.tws.per_decade === null ? undefined : amount(x.tws), dir: MINI_DIR[x.id] ?? "ne",
  })), [m.atlas, shortName, amount]);
  if (atlas.length < 2) return null;
  const a = atlas.find((x) => x.id === sel) ?? atlas[0];
  const q = norm(query.trim());
  const matches = atlas.filter((x) => !q || norm(`${x.name} ${name(x)} ${x.countries.join(" ")} ${countries(x)}`).includes(q));
  // Detectability finding, from the manifest: which aquifers span two or more GRACE footprints, and what GRACE says there.
  const big = atlas.filter((x) => x.grace_footprints >= 2);
  const bigLoss = big.filter((x) => proven(x.tws) && (x.tws.per_decade ?? 0) < 0);
  const bigRest = big.filter((x) => !bigLoss.includes(x));
  const indiaWaterChange = atlas.find((x) => x.id === "ZIN")?.impact?.grace_km3_per_yr;
  // As wide as the screen allows: the globe fills the width and is cropped top and bottom, like Earth seen from orbit.
  const size = typeof window !== "undefined" ? Math.max(320, Math.min(1500, Math.round(window.innerWidth * 0.98))) : 1200;
  const pick = (id: string) => { setSel(id); setOpen(false); setQuery(""); onPick(); onOpen(id); };
  const bare = (w: AtlasWitness) => signed(w.per_decade === null ? null : w.per_decade / 10, 2);
  return <section className={`atlas ${intro ? "intro" : "ready"}`} aria-labelledby="atlas-title" id="atlas">
    {intro && <Welcome onDone={() => setIntro(false)} />}
    <div className="atlas-stage">
      <Globe markers={markers} selected={sel} onSelect={pick} size={size} autoRotate
          label={t("Globe with the aquifers of the atlas. Drag or use the arrow keys to turn it, or search below.",
            "Globo con los acuíferos del atlas. Arrástralo o usa las flechas del teclado para girarlo. También puedes usar el buscador.")} />
      <nav className="atlas-links atlas-topnav" aria-label={t("Tools for every aquifer", "Herramientas para todos los acuíferos")}>
        {toolsNavigation.map(({ id, label }) => <a key={id} href={`#${id}`}>{t(label[0], label[1])}</a>)}
        {showLanguage && <LanguageSelect />}
      </nav>
      <div className="atlas-overlay"><div className="wrap wide">
      <header className="atlas-head">
        <p className="atlas-kicker"><span>{t("Water stored on land and underground", "Agua almacenada en la superficie y bajo tierra")}</span> <span>{t(`${atlas.length} irrigated aquifers · NASA, 2004–2024`, `${atlas.length} acuíferos en zonas de riego · NASA, 2004–2024`)}</span></p>
        <h1 id="atlas-title">{t("Is that trend real?", "¿Es real esa tendencia?")}</h1>
      </header>
      </div></div>
      <div className="atlas-tools atlas-bottom-search">
        <div className="atlas-search">
          <label htmlFor="aquifer-search" className="sr-only">{t("Find an aquifer or a country", "Buscar un acuífero o país")}</label>
          <input id="aquifer-search" type="search" value={query} placeholder={t("Search aquifer or country", "Busca un acuífero o país")} autoComplete="off"
            role="combobox" aria-expanded={open} aria-controls="aquifer-list"
            onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onKeyDown={(e) => { if (e.key === "Enter" && matches[0]) { e.preventDefault(); pick(matches[0].id); } if (e.key === "Escape") setOpen(false); }} />
          {open && <ul id="aquifer-list" className="atlas-list" role="listbox" aria-label={t(`${matches.length} aquifers`, `${matches.length} acuíferos`)}>
            {matches.map((x) => <li key={x.id} role="option" aria-selected={x.id === a.id}>
              <button type="button" className={`atlas-item ${x.id === a.id ? "on" : ""}`} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(x.id)}>
                <span className={`atlas-dot ${tone(x)}`} aria-hidden="true">{arrow(tone(x))}</span>
                <span className="atlas-item-text"><strong>{shortName(x)}</strong><small>{countries(x)}</small></span>
              </button>
            </li>)}
            {matches.length === 0 && <li className="small atlas-empty">{t(`No aquifer matches “${query}”.`, `No se encontraron acuíferos para «${query}».`)}</li>}
          </ul>}
        </div>
      </div>
      <p className="atlas-blurb" key={fact} aria-live="polite">{facts[fact % facts.length]}</p>
      <div className="atlas-stage-foot"><div className="wrap wide"><p className="small atlas-legend">
        <span className="lg down">↓</span> {t("falling", "descenso")} <span className="lg up">↑</span> {t("rising", "aumento")} <span className="lg flat">?</span> {t("inconclusive", "no concluyente")}
        {t(" · Base map: MODIS Terra surface reflectance, 2024 (NASA)", " · Mapa base: reflectancia de superficie de MODIS Terra, 2024 (NASA)")}
      </p></div></div>
    </div>
    <div className="aq-overview">
      <div className="wrap wide">
        <ThreeWays m={m} onCase={onCase} onOpen={pick} />
        <header className="aq-overview-head">
          <p className="aq-kicker">{t("The atlas", "El atlas")}</p>
          <h2>{t(`${atlas.length} irrigated aquifers, one engine`, `${atlas.length} acuíferos en zonas de riego, un mismo motor de análisis`)}</h2>
          <p>{t(
            "Each aquifer is analyzed with the same NASA data and pre-registered rule, 2004–2024. The regions were selected from published GRACE hotspots (Richey et al. 2015; Rodell et al. 2018). They do not form a random sample of the world.",
            "Cada acuífero se analiza con los mismos productos de NASA y la misma regla prerregistrada, de 2004 a 2024. Las regiones se eligieron a partir de estudios previos con GRACE (Richey et al. 2015; Rodell et al. 2018). No forman una muestra aleatoria mundial.",
          )}{indiaWaterChange != null && indiaWaterChange < 0 && <>
            {t(
              ` For Northwest India, the atlas estimates a loss of ${fmt(-indiaWaterChange)} km³ per year in total water storage from GRACE in 2004–2024.`,
              ` Para el noroeste de India, el atlas estima con GRACE una pérdida de ${fmt(-indiaWaterChange)} km³ al año en el almacenamiento total de agua entre 2004 y 2024.`,
            )}<IndiaHistoricalContext />
          </>}</p>
        </header>
        <section className="detect" aria-labelledby="detect-title">
          <h3 id="detect-title">{t("Can a satellite see your aquifer?", "¿Puede un satélite detectar cambios en tu acuífero?")}</h3>
          <p className="detect-finding">{t(
            `Of the ${big.length} aquifers that span two or more GRACE footprints, ${bigLoss.length} show a confirmed or likely loss.`,
            `De los ${big.length} acuíferos que abarcan dos o más huellas de GRACE, ${bigLoss.length} muestran un descenso confirmado o probable.`,
          )}{bigRest.length > 0 && t(` No loss was established in ${list(bigRest.map(shortName))}.`, ` No se estableció un descenso en ${list(bigRest.map(shortName))}.`)} {t(
            "Below one footprint, well measurements can help track local changes.",
            "Por debajo de una huella, las mediciones en pozos ayudan a seguir los cambios locales.",
          )}</p>
          <DetectabilityChart atlas={atlas} onOpen={(id) => pick(id)} />
        </section>
        <h3 className="aq-table-title">{t("All aquifers", "Todos los acuíferos")}</h3>
        <div className="scroll-x">
          <table className="aq-table">
            <thead><tr>
              <th scope="col">{t("Aquifer", "Acuífero")}</th><th scope="col">{t("Annual anomaly, GRACE", "Anomalía anual de GRACE")}</th>
              <th scope="col" className="r">{t("Total water", "Agua total")}<small>GRACE, {t("mm/yr", "mm/año")}</small></th>
              <th scope="col" className="r">{t("Groundwater", "Agua subterránea")}<small>GLDAS, {t("mm/yr", "mm/año")}</small></th>
              <th scope="col">{t("Rain", "Precipitación")}</th><th scope="col">{t("Cropland greenness", "Verdor de los cultivos")}</th><th scope="col">{t("Crop water use", "Evapotranspiración de cultivos")}</th>
              <th scope="col" className="r">{t("GRACE footprints", "Huellas de GRACE")}</th>
            </tr></thead>
            <tbody>{atlas.map((x) => <tr key={x.id} onClick={() => pick(x.id)}>
              <th scope="row"><button type="button" onClick={(e) => { e.stopPropagation(); pick(x.id); }}>{shortName(x)}</button><small>{countries(x)}</small></th>
              <td><Spark path={m.cases.find((c) => c.id === x.tws.id)?.path ?? null} tone={dirOf(x.tws)} /></td>
              <td className="r"><span className="num">{bare(x.tws)}</span><Verdict w={x.tws} compact /></td>
              <td className="r"><span className="num">{bare(x.gws)}</span><Verdict w={x.gws} compact /></td>
              <td><Verdict w={x.rain} /></td>
              <td>{x.ndvi ? <Verdict w={x.ndvi} /> : "—"}</td>
              <td>{x.et ? <Verdict w={x.et} /> : "—"}</td>
              <td className="r num">{fmt(x.grace_footprints, 2)}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <p className="aq-note">{m.atlas_note && t(m.atlas_note,
          "Las regiones se eligieron a partir de estudios con GRACE (Richey et al. 2015; Rodell et al. 2018). Los recuadros son aproximados y pueden diferir de los límites oficiales. Se usan los mismos productos de NASA, periodo (2004–2024) y motor. Fuera de Ica, el único control es el índice de El Niño (ONI).",
        )} {t(
          "A filled dot marks a confirmed trend, a ring marks a likely trend, and a hollow gray dot marks a trend to evaluate. Gold indicates a decline and blue an increase.",
          "El punto relleno indica una tendencia confirmada, el anillo una tendencia probable y el círculo gris vacío una tendencia a evaluar. El dorado indica descenso y el azul, aumento.",
        )}</p>
      </div>
    </div>
  </section>;
}
