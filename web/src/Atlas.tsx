// AI-assisted: Claude (Anthropic). World aquifer atlas: search or spin the globe to pick an aquifer, read its NASA
// witnesses, then compare all of them. Every number comes from the engine's manifest; nothing is computed here.
import { useEffect, useMemo, useState } from "react";
import { Globe, type GlobeMarker } from "./Globe";
import { asset, useJSON } from "./data";
import { EVIDENCE_TEXT } from "./evidence";
import { fmt, signed } from "./format";
import { useLocale, type Translation } from "./i18n";
import type { Level } from "./levels";
import type { AtlasEntry, AtlasWitness, CaseFile, Manifest } from "./types";

export const proven = (w?: AtlasWitness) => !!w && (w.verdict === "confirmed" || w.verdict === "likely");
export const tone = (a: AtlasEntry): GlobeMarker["tone"] => !proven(a.tws) ? "flat" : (a.tws.per_decade ?? 0) < 0 ? "down" : "up";
const arrow = (t: GlobeMarker["tone"]) => t === "down" ? "↓" : t === "up" ? "↑" : "?";
/** Water storage in mm per year; the other witnesses per decade in their own units. */
export function amount(w: AtlasWitness) {
  if (w.per_decade === null) return "n/a";
  if (w.units === "mm") return `${signed(w.per_decade / 10, 2)} mm/yr`;
  const u = w.units === "NDVI units" ? "NDVI" : w.units === "degC" ? "°C" : w.units;
  return `${signed(w.per_decade, 2)} ${u}/decade`;
}
/** Short name: drops the country after a comma and any parenthetical that lists several places. */
export const short = (name: string) => name.replace(/ \(([^)]*)\)/, (m, inner: string) => inner.includes(",") ? "" : m).split(",")[0];
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const SPANISH_COUNTRIES: Record<string, string> = {
  Peru: "Perú", "United States": "Estados Unidos", Pakistan: "Pakistán", "Saudi Arabia": "Arabia Saudita",
  Jordan: "Jordania", Iraq: "Irak", Iran: "Irán", Syria: "Siria", Turkey: "Turquía", Brazil: "Brasil",
};

export const WITNESSES: { key: "tws" | "gws" | "rain" | "ndvi" | "et" | "t2m" | "lst"; name: string; spanish: string; kind: string; kindEs: string }[] = [
  { key: "tws", name: "Total water · GRACE", spanish: "Agua total · GRACE", kind: "Observed", kindEs: "Observación" },
  { key: "gws", name: "Groundwater · GLDAS", spanish: "Agua subterránea · GLDAS", kind: "Model", kindEs: "Modelo" },
  { key: "rain", name: "Rain · GPM IMERG", spanish: "Precipitación · GPM IMERG", kind: "Estimated", kindEs: "Estimación" },
  { key: "ndvi", name: "Cropland greenness · MODIS", spanish: "Verdor de los cultivos · MODIS", kind: "Observed", kindEs: "Observación" },
  { key: "et", name: "Crop water use · MODIS ET", spanish: "Evapotranspiración de cultivos · MODIS ET", kind: "Estimated", kindEs: "Estimación" },
  { key: "t2m", name: "Air temperature · MERRA-2", spanish: "Temperatura del aire · MERRA-2", kind: "Reanalysis", kindEs: "Reanálisis" },
  { key: "lst", name: "Cropland surface heat · MODIS LST", spanish: "Temperatura superficial de los cultivos · MODIS LST", kind: "Observed", kindEs: "Observación" },
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
  const { t } = useLocale();
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 2300), t2 = setTimeout(onDone, 3100);
    const skip = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "Enter") { clearTimeout(t1); clearTimeout(t2); onDone(); } };
    window.addEventListener("keydown", skip);
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener("keydown", skip); };
  }, []);
  return <div className={`atlas-welcome ${leaving ? "leaving" : ""}`} role="dialog" aria-label={t("Welcome", "Bienvenida")} onClick={onDone}>
    <p>{t("Welcome to", "Te damos la bienvenida a")} <strong>Oasis Paradox</strong></p>
    <span>by SciTeX · NASA Space Apps Challenge 2026</span>
  </div>;
}

/** Short facts that rotate at the top right; every number comes from the manifest. */
function facts(m: Manifest, atlas: AtlasEntry[], t: (en: string, es: string) => string): string[] {
  const falling = atlas.filter((a) => proven(a.tws) && (a.tws.per_decade ?? 0) < 0);
  const confirmed = falling.filter((a) => a.tws.verdict === "confirmed");
  const likely = falling.length - confirmed.length;
  const worst = [...confirmed].sort((a, b) => (a.tws.per_decade ?? 0) - (b.tws.per_decade ?? 0))[0];
  const disagreements = atlas.reduce((n, a) => n + WITNESSES.filter(({ key }) => a[key]?.classic_false_alarm).length, 0);
  return [
    t(`A decline in total water storage is confirmed in ${confirmed.length} of ${atlas.length} GRACE study regions and likely in ${likely}.`,
      `GRACE muestra un descenso del almacenamiento total de agua confirmado en ${confirmed.length} de ${atlas.length} regiones de estudio y probable en ${likely}.`),
    worst ? t(`${short(worst.name)} has the steepest confirmed decline in regional total water storage: ${amount(worst.tws)}.`,
      `${short(worst.name)} tiene el descenso confirmado más pronunciado del almacenamiento total de agua regional: ${amount(worst.tws).replace("mm/yr", "mm/año")}.`) : "",
    t("In Ica, well levels describe local changes. GRACE measures total water storage over a much larger area.",
      "En Ica, los niveles de los pozos muestran cambios locales. GRACE mide el almacenamiento total de agua en un área mucho mayor."),
    disagreements ? t(`${disagreements} atlas records are significant under the classic test and inconclusive under the combined analysis.`,
      `${disagreements} series del atlas son significativas según la prueba clásica y no concluyentes según el análisis combinado.`) : "",
    t(`21 years of NASA data, 2004–2024: GRACE, GLDAS, GPM IMERG, MODIS and MERRA-2. ${m.cases.length} case files.`,
      `21 años de datos de NASA, 2004–2024: GRACE, GLDAS, GPM IMERG, MODIS y MERRA-2. ${m.cases.length} expedientes.`),
  ].filter(Boolean);
}

export const dirOf = (w: AtlasWitness): "down" | "up" | "flat" => !proven(w) ? "flat" : (w.per_decade ?? 0) < 0 ? "down" : "up";
export const bare = (w: AtlasWitness) => w.per_decade === null ? "n/a" : signed(w.units === "mm" ? w.per_decade / 10 : w.per_decade, 2);
const VERDICT_WORD: Record<AtlasWitness["verdict"], Translation> = {
  confirmed: ["Confirmed", "Confirmada"], likely: ["Likely", "Probable"],
  inconclusive: ["Trend to evaluate", "Tendencia a evaluar"], insufficient_data: ["Trend to evaluate", "Tendencia a evaluar"],
};

/** A dot and a word: filled for confirmed, ring for likely, hollow grey when not proven. */
export function Verdict({ w, compact = false }: { w: AtlasWitness; compact?: boolean }) {
  const { t } = useLocale();
  const d = dirOf(w);
  const [en, es] = VERDICT_WORD[w.verdict];
  const word = d === "flat" ? t(en, es) : t(`${en} ${d === "down" ? "fall" : "rise"}`, `${d === "down" ? "Caída" : "Subida"} ${es.toLowerCase()}`);
  return <span className={`vd ${d} ${w.verdict} ${compact ? "compact" : ""}`} title={word}><i aria-hidden="true" />{compact ? <span className="sr-only">{word}</span> : word}</span>;
}

/** Annual means of the monthly anomalies, drawn as a small line (display only; no statistics here). */
export function Spark({ path, tone: t }: { path: string | null; tone: "down" | "up" | "flat" }) {
  const { t: translate } = useLocale();
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
  return <svg className={`spark ${t}`} viewBox="0 0 120 30" role="img" aria-label={translate(`Annual anomalies ${x0}–${x1}`, `Anomalías anuales ${x0}–${x1}`)}><path d={d} /></svg>;
}

export function Atlas({ m, onIca, onPick, onOpen, showLanguage }: {
  m: Manifest; level?: Level; onCase?: (id: string) => void; onIca: () => void; onPick?: () => void; showLanguage: boolean;
  onOpen: (id: string) => void;   // open the aquifer's own page
}) {
  const { t, language, setLanguage } = useLocale();
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
  const spanishCountries = (x: AtlasEntry) => x.countries.map((country) => SPANISH_COUNTRIES[country] ?? country);
  const countries = (x: AtlasEntry) => (language === "es" ? spanishCountries(x) : x.countries).join(", ");
  const matches = shown.filter((x) => !q || norm(`${x.name} ${x.countries.join(" ")} ${spanishCountries(x).join(" ")}`).includes(q));
  // As wide as the screen allows: the globe fills the width and is cropped top and bottom, like Earth seen from orbit.
  const size = typeof window !== "undefined" ? Math.max(320, Math.min(1500, Math.round(window.innerWidth * 0.98))) : 1200;
  const pick = (id: string) => { setSel(id); setOpen(false); setQuery(""); onPick?.(); onOpen(id); };
  const toDetails = () => {
    const heading = document.getElementById("atlas-details");
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: "start" });
  };
  const callout = <div className="callout-card" key={a.id}>
    <img src={asset(`img/aquifers/${a.id}.jpg`)} alt={`Satellite view of ${a.name} (${a.id === "ZW" ? "Landsat 8/9, 2024" : "MODIS Terra, 2024"})`} />
    <div className="callout-body">
      <p className="eyebrow">{a.countries.join(", ")}</p>
      <h3>{short(a.name)}</h3>
      <p className="callout-num"><strong className="num">{amount(a.tws)}</strong> <span className={`pill ${a.tws.verdict}`}>{EVIDENCE_TEXT[a.tws.verdict]}</span></p>
      <p className="small">Total water from NASA GRACE, 2004–2024 · {fmt(a.grace_footprints, 2)} GRACE footprints</p>
      <p className="callout-reading">{a.reading}</p>
      <div className="callout-actions">
        <button className="text-button" onClick={toDetails}>View the data series ↓</button>
        {a.focus && <button className="text-button" onClick={onIca}>Ica deep dive: wells and fields →</button>}
      </div>
    </div>
  </div>;

  void callout; // pop-out card kept for later: pass callout={callout} to <Globe> to show it again
  const messages = facts(m, atlas, t);
  return <section className={`atlas ${intro ? "intro" : "ready"}`} aria-labelledby="atlas-title" id="atlas">
    {intro && <Welcome onDone={() => setIntro(false)} />}
    <div className="atlas-stage">
      <Globe markers={markers} selected={sel} onSelect={pick} size={size} autoRotate
          label={t("Drag the globe or use the arrow keys to turn it. Select a marker to open its aquifer page.", "Arrastra el globo o usa las flechas del teclado para girarlo. Selecciona un marcador para abrir la ficha de su acuífero.")} />
      <div className="atlas-overlay"><div className="wrap wide">
      <header className="atlas-head">
        <h1 id="atlas-title">{t("Where is water storage changing?", "¿Dónde cambia el almacenamiento de agua?")}</h1>
      </header>

      <div className="atlas-tools">
        <div className="atlas-search" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
          <label htmlFor="aquifer-search" className="sr-only">{t("Find an aquifer or a country", "Busca un acuífero o un país")}</label>
          <input id="aquifer-search" type="search" value={query} placeholder={t("Search aquifer or country", "Busca un acuífero o un país")} autoComplete="off" aria-describedby="atlas-search-help"
            role="combobox" aria-expanded={open} aria-controls="aquifer-list"
            onFocus={() => setOpen(true)}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onKeyDown={(e) => { if (e.key === "Enter" && matches[0]) { e.preventDefault(); pick(matches[0].id); } if (e.key === "Escape") setOpen(false); }} />
          {open && <ul id="aquifer-list" className="atlas-list" role="listbox" aria-label={t(`${matches.length} aquifers`, `${matches.length} acuíferos`)}>
            {matches.map((x) => <li key={x.id} role="option" aria-selected={x.id === a.id}>
              <button type="button" className={`atlas-item ${x.id === a.id ? "on" : ""}`} onClick={() => pick(x.id)}>
                <span className={`atlas-dot ${tone(x)}`} aria-hidden="true">{arrow(tone(x))}</span>
                <span className="atlas-item-text"><strong>{short(x.name)}</strong><small>{countries(x)}</small></span>
              </button>
            </li>)}
            {matches.length === 0 && <li className="small atlas-empty">{t(`No aquifer matches “${query}”.`, `Ningún acuífero coincide con «${query}».`)}</li>}
          </ul>}
        </div>
        <button type="button" className="atlas-action" onClick={toDetails}>{t("Go to the aquifer table ↓", "Ir a la tabla de acuíferos ↓")}</button>
        {showLanguage && <select className="atlas-action" aria-label={t("Language", "Idioma")} value={language} onChange={(e) => setLanguage(e.target.value === "es" ? "es" : "en")}>
          <option value="en" lang="en">English</option>
          <option value="es" lang="es">Español</option>
        </select>}
      </div>
      <p id="atlas-search-help" className="atlas-action-help">{t(
        "Choose a search result or a marker to open the aquifer page and see its NASA variables.",
        "Elige un resultado de la búsqueda o un marcador para abrir la ficha del acuífero y ver sus variables de NASA.",
      )}</p>

      </div></div>
      <p className="atlas-blurb" key={fact} aria-live="polite">{messages[fact % messages.length]}</p>
      <div className="atlas-stage-foot"><div className="wrap wide"><p className="small atlas-legend"><span className="lg down">↓</span> {t("falling", "descenso")} <span className="lg up">↑</span> {t("rising", "aumento")} <span className="lg flat">?</span> {t("not proven", "no concluyente")} · {t("Base map: MODIS Terra surface reflectance, 2024 (NASA)", "Mapa base: reflectancia superficial de MODIS Terra, 2024 (NASA)")}</p></div></div>
    </div>
    <div className="aq-overview">
      <div className="wrap wide">
        <header className="aq-overview-head">
          <p className="aq-kicker">{t("The atlas", "El atlas")}</p>
          <h2 id="atlas-details" className="action-scroll-target" tabIndex={-1}>{t(`Water storage across ${atlas.length} aquifer regions`, `Almacenamiento de agua en ${atlas.length} regiones acuíferas`)}</h2>
          <p>{t("The regions use the same NASA products and statistical rule for 2004–2024.", "Las regiones usan los mismos productos de NASA y la misma regla estadística para 2004–2024.")}</p>
          <p>{t("Select an aquifer to open its page with satellite images from 2004 and 2024 and the table of NASA variables.",
            "Selecciona un acuífero para abrir su ficha con imágenes satelitales de 2004 y 2024 y la tabla de variables de NASA.")}</p>
        </header>
        <div className="scroll-x">
          <table className="aq-table">
            <thead><tr>
              <th scope="col">{t("Aquifer", "Acuífero")}</th><th scope="col">{t("Annual anomaly, GRACE", "Anomalía anual, GRACE")}</th>
              <th scope="col" className="r">{t("Total water", "Agua total")}<small>GRACE, {t("mm/yr", "mm/año")}</small></th>
              <th scope="col" className="r">{t("Groundwater", "Agua subterránea")}<small>GLDAS, {t("mm/yr", "mm/año")}</small></th>
              <th scope="col">{t("Rain", "Precipitación")}</th><th scope="col">{t("Cropland greenness", "Verdor de los cultivos")}</th><th scope="col">{t("Crop water use", "Evapotranspiración de cultivos")}</th>
              <th scope="col" className="r">{t("GRACE footprints", "Huellas de GRACE")}</th>
            </tr></thead>
            <tbody>{atlas.map((x) => <tr key={x.id} onClick={() => pick(x.id)}>
              <th scope="row"><button type="button" onClick={(e) => { e.stopPropagation(); pick(x.id); }}>
                {short(x.name)} <span className="table-action">{t("Open aquifer page →", "Abrir ficha del acuífero →")}</span>
              </button><small>{countries(x)}</small></th>
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
        <p className="aq-note">{t(
          "A filled dot marks a confirmed trend, a ring marks a likely trend, and a hollow gray dot marks an inconclusive result. Gold indicates a decline and blue an increase.",
          "El punto relleno marca una tendencia confirmada, el anillo marca una tendencia probable y el círculo gris vacío marca un resultado no concluyente. El dorado indica descenso y el azul indica aumento.",
        )}</p>
        <p className="aq-note">{m.atlas_note}</p>
      </div>
    </div>
  </section>;
}
