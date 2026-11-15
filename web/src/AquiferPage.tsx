// AI-assisted: Claude (Anthropic). One aquifer's own page: the 2004 / 2024 lens, its reading and six NASA witnesses.
// Every number comes from the engine's manifest; nothing is computed here.
import { useMemo, useState } from "react";
import { asset, useJSON } from "./data";
import { HeroMap } from "./HeroMap";
import { LensHero, type LensStop } from "./LensHero";
import { fmt } from "./format";
import { amount, dirOf, proven, short, Spark, Verdict, WITNESSES } from "./Atlas";
import type { AtlasEntry, Manifest } from "./types";

interface Tour { [zone: string]: { ratio: number; bbox: [number, number, number, number]; stops: { lon: number; lat: number; change: string }[] } }

const WORD: Record<string, string> = { confirmed: "Confirmed trend", likely: "Likely trend", inconclusive: "Inconclusive", insufficient_data: "Insufficient data" };

/** Headline from the verdicts: what the satellites see on the surface and in the water below. */
function headline(a: AtlasEntry) {
  const down = proven(a.tws) && (a.tws.per_decade ?? 0) < 0;
  const green = !!a.ndvi && proven(a.ndvi) && (a.ndvi.per_decade ?? 0) > 0;
  if (down && green) return <>Greener fields.<br />A draining <em>aquifer</em>.</>;
  if (down) return <>The surface barely changes.<br />The water <em>below</em> drains.</>;
  return <>A vast aquifer.<br />No proven <em>loss</em> from space.</>;
}

export function AquiferPage({ m, id, onCase, onIca, onBack, onGo }: {
  m: Manifest; id: string; onCase: (id: string) => void; onIca: () => void; onBack: () => void;
  onGo: (hash: string) => void;   // open another view (compare, method, sources, map)
}) {
  const a = (m.atlas ?? []).find((x) => x.id === id);
  if (!a) return <section className="wrap wide aq-page"><p>Unknown aquifer. <button className="aq-link" onClick={onBack}>Back to the globe</button></p></section>;
  const ica = a.id === "ZW";
  const toWitnesses = () => document.getElementById("aq-witnesses")?.scrollIntoView({ behavior: "smooth", block: "start" });
  return <>
  {ica ? <HeroMap m={m} primary={{ label: "See the NASA witnesses ↓", go: toWitnesses }} onMap={() => onGo("#map")} />
    : <AquiferLens m={m} a={a} onWitnesses={toWitnesses} onBack={onBack} />}
  <section className="aq-page" aria-labelledby="aq-title">
    <div className="wrap wide">
      <button className="aq-back" onClick={onBack}>All aquifers</button>
      <p className="aq-meta">{a.countries.join(", ")} <span>·</span> {Math.round(a.area_km2).toLocaleString("en-US")} km² <span>·</span> {fmt(a.grace_footprints, 2)} GRACE footprints</p>
      <h1 id="aq-title">{short(a.name) === a.name ? a.name : <>{short(a.name)} <small>{a.name.slice(short(a.name).length).replace(/^[ ,]+/, "")}</small></>}</h1>
      <p className="aq-desc">{a.description}</p>


      <div className="aq-reading-row">
        <p className="aq-reading">{a.reading}</p>
        <p className="aq-ref">Reference: {a.reference}{ica ? ". Ica's rain is measured over the Andean headwaters; its fields are Villacurí's." : ""}</p>
        {ica && <button className="aq-link" onClick={onIca}>Open the Ica deep dive, with its field wells</button>}
      </div>

      <table className="aq-witnesses" id="aq-witnesses">
        <caption>{WITNESSES.filter(({ key }) => a[key]).length} NASA witnesses, 2004–2024. Select a row to open its case file.</caption>
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
      <AquiferExtras m={m} a={a} onCase={onCase} onGo={onGo} />
      <AquiferTools m={m} a={a} onCase={onCase} onGo={onGo} />
    </div>
  </section>
  </>;
}

/** The Ica-style landing view for any aquifer: MODIS 2004 outside the lens, 2024 inside, touring the four places where
 *  the surface changed most. The cards carry the aquifer-wide witnesses, and say so. */
function AquiferLens({ m, a, onWitnesses, onBack }: { m: Manifest; a: AtlasEntry; onWitnesses: () => void; onBack: () => void }) {
  const { data: tour } = useJSON<Tour>("aquifer_tour.json");
  const t = tour?.[a.id];
  const stops: LensStop[] = useMemo(() => {
    if (!t) return [];
    const ws = WITNESSES.filter((w) => ["tws", "gws", "ndvi", "et"].includes(w.key)).map((w) => ({ ...w, v: a[w.key] })).filter((w) => w.v);
    return t.stops.map((s, i) => {
      const w = ws[i % ws.length];
      return { lon: s.lon, lat: s.lat, place: `Across the aquifer · ${w.name}`, finding: amount(w.v!),
        verdict: WORD[w.v!.verdict], tone: w.v!.verdict, source: `${w.kind} · 2004–2024`,
        note: `Lens: ${s.change} in 2024 than in 2004 here.`,
        alarm: w.v!.classic_false_alarm ? "A classic test would call this significant; the combined evidence does not." : undefined };
    });
  }, [t, a]);
  void m;
  if (!t) return <header className="hero-map"><div className="hm-stage" /></header>;
  return <LensHero before={asset(`img/aquifers/${a.id}_2004.jpg`)} after={asset(`img/aquifers/${a.id}_2024.jpg`)}
    altBefore={`MODIS true-color image of ${a.name} in 2004`} altAfter="The same area in 2024, seen through the lens"
    bbox={t.bbox} ratio={t.ratio} stops={stops}
    kicker={`${short(a.name)} · ${a.countries.join(", ")} · NASA Earth observations`}
    title={headline(a)} lede={a.reading}
    primary={{ label: "See the NASA witnesses ↓", go: onWitnesses }} secondary={{ label: "All aquifers", go: onBack }}
    credit="MODIS Terra surface reflectance, same growing season in 2004 and 2024 · NASA via Google Earth Engine" />;
}

/** Every analysis tool, already pointed at this aquifer. */
function AquiferTools({ m, a, onCase, onGo }: { m: Manifest; a: AtlasEntry; onCase: (id: string) => void; onGo: (hash: string) => void }) {
  const others = (m.atlas ?? []).filter((x) => x.id !== a.id);
  const [other, setOther] = useState(a.id === "ZW" ? "ZC" : "ZW");
  const o = others.find((x) => x.id === other) ?? others[0];
  const compare = () => onGo(`#compare?left=${encodeURIComponent(a.tws.id)}&right=${encodeURIComponent(o.tws.id)}`);
  return <section className="aq-tools" aria-labelledby="aq-tools-title">
    <h2 id="aq-tools-title">Analyze {short(a.name)}</h2>
    <div className="aq-tools-grid">
      <div>
        <h3>Examine a witness</h3>
        <p>Open the case file: monthly record, choose the time period, the tests and the robustness checks.</p>
        <div className="aq-tool-links">{WITNESSES.map(({ key, name }) => a[key] && <button key={key} onClick={() => onCase(a[key]!.id)}>{name.split(" · ")[0]}</button>)}</div>
      </div>
      <div>
        <h3>Compare with another aquifer</h3>
        <p>Total water from GRACE, both records on the same timeline.</p>
        <div className="aq-tool-row">
          <select value={o.id} onChange={(e) => setOther(e.target.value)} aria-label="Aquifer to compare with">
            {others.map((x) => <option key={x.id} value={x.id}>{short(x.name)}</option>)}
          </select>
          <button className="aq-tool-go" onClick={compare}>Compare</button>
        </div>
      </div>
      <div>
        <h3>Put the tests on trial</h3>
        <p>Simulate trendless data with memory and see how often a classic test raises a false alarm.</p>
        <button className="aq-tool-go" onClick={() => onGo("#method")}>Open the trend lab</button>
      </div>
      <div>
        <h3>Sources</h3>
        <p>Every NASA product with its version and DOI, and how AI was used.</p>
        <button className="aq-tool-go" onClick={() => onGo("#sources")}>Open sources</button>
      </div>
    </div>
  </section>;
}

const fmtN = (x: number | null | undefined, d = 1) => x === null || x === undefined ? "n/a" : Math.abs(x).toLocaleString("en-US", { maximumFractionDigits: d });

/** Impact figures, the evidence map, cropland against natural land, and guided cases: Ica's tools for every aquifer. */
function AquiferExtras({ m, a, onCase, onGo }: { m: Manifest; a: AtlasEntry; onCase: (id: string) => void; onGo: (hash: string) => void }) {
  const [layer, setLayer] = useState(true);
  const im = a.impact;
  const ica = a.id === "ZW";
  const falling = proven(a.tws) && (a.tws.per_decade ?? 0) < 0;
  const alarm = WITNESSES.map(({ key }) => a[key]).find((w) => w?.classic_false_alarm);
  const gaps = [
    { w: a.ndvi_gap, name: "Greenness gap", text: "Cropland greenness minus natural land, both standardized by calendar month: what irrigation adds beyond the weather both share." },
    { w: a.lst_gap, name: "Heat gap", text: "Cropland surface temperature minus natural land: irrigated fields cool by evaporating water." },
  ].filter((g) => g.w);
  const leads = [
    { title: falling ? "The draining aquifer" : "Is the water going?", text: "Follow total water from GRACE, 2004–2024.", go: () => onCase(a.tws.id) },
    a.ndvi_gap && { title: "Greener than the land around", text: "Cropland against natural land in the same box.", go: () => onCase(a.ndvi_gap!.id) },
    a.lst_gap && { title: "Hot or cool fields?", text: "Surface heat of the cropland against natural land.", go: () => onCase(a.lst_gap!.id) },
    alarm ? { title: "When tests disagree", text: "A classic test calls this series significant; the engine does not.", go: () => onCase(alarm.id) }
      : { title: "When tests disagree", text: "Simulate trendless data with memory and count false alarms.", go: () => onGo("#method") },
  ].filter(Boolean) as { title: string; text: string; go: () => void }[];

  return <>
    {im && <section className="aq-impact" aria-label="Impact">
      <div><strong className="num">{im.grace_km3_per_yr === null ? "n/a" : `${im.grace_km3_per_yr < 0 ? "−" : "+"}${Math.abs(im.grace_km3_per_yr) < 0.1
          ? `${fmtN(Math.abs(im.grace_km3_per_yr) * 1000, 0)} million m³` : `${fmtN(im.grace_km3_per_yr, 1)} km³`}`}</strong>
        <span>{(im.grace_km3_per_yr ?? 0) < 0 ? "of water lost" : "of water gained"} each year across the box (GRACE trend × {Math.round(a.area_km2).toLocaleString("en-US")} km²){ica ? "; the satellites see a net gain while wells fall" : ""}{a.id === "ZIN" ? ". Rodell et al. (2009, Nature) measured 17.7 km³ a year in 2002–2008 for this region with GRACE" : ""}</span></div>
      {im.crop_water_mm3_2020_2024 !== undefined && <div><strong className="num">{fmtN(im.crop_water_mm3_2020_2024! >= 1000 ? im.crop_water_mm3_2020_2024! / 1000 : im.crop_water_mm3_2020_2024!, 1)} {im.crop_water_mm3_2020_2024! >= 1000 ? "km³" : "million m³"}</strong>
        <span>{ica ? `of water used by crops each year, 2020–2024 (MODIS ET × ${fmtN(im.cropland_km2, 0)} km² of cropland in Villacurí, where almost no rain falls; a lower bound)`
          : `evaporated each year by ${fmtN(im.cropland_km2, 0)} km² of cropland, 2020–2024 (MODIS ET; rain and irrigation together)`}</span></div>}
      <div><strong className="num">{fmtN(a.grace_footprints, 2)}</strong><span>GRACE footprints cover this box: {a.grace_footprints >= 1 ? "large enough for the satellites to resolve a regional loss" : "too small for the satellites to localise a loss"}</span></div>
    </section>}

    {ica && <section className="aq-map" aria-labelledby="aq-map-title">
      <div className="aq-section-head"><h2 id="aq-map-title">Evidence map</h2></div>
      <p className="aq-gaps-lede">Ica has its own map at field scale: Landsat 2004 and 2024, the per-pixel greenness trend, the 87 JUASVI wells and annotated findings.</p>
      <button className="aq-link" onClick={() => onGo("#map")}>Open the Ica evidence map</button>
    </section>}
    {!ica && <section className="aq-map" aria-labelledby="aq-map-title">
      <div className="aq-section-head">
        <h2 id="aq-map-title">Evidence map</h2>
        <label className="aq-switch"><input type="checkbox" checked={layer} onChange={(e) => setLayer(e.target.checked)} /> Greenness trend layer</label>
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
      <h2 id="aq-gaps-title">{ica ? "Fields against the desert" : "Cropland against natural land"}</h2>
      <p className="aq-gaps-lede">{ica ? "Villacurí's fields minus the untouched desert next to them." : "The same comparison as Ica's fields against the desert: cropland minus shrubland, grassland and barren land in the same box (MODIS land cover), so shared weather cancels out."}</p>
      <table className="aq-witnesses">
        <thead><tr><th scope="col">Comparison</th><th scope="col">Annual gap</th><th scope="col" className="r">Change</th><th scope="col">Verdict</th></tr></thead>
        <tbody>{gaps.map(({ w, name, text }) => <tr key={name} onClick={() => onCase(w!.id)}>
          <th scope="row"><button type="button" onClick={(e) => { e.stopPropagation(); onCase(w!.id); }}>{name}</button><small>{text}</small></th>
          <td><Spark path={m.cases.find((c) => c.id === w!.id)?.path ?? null} tone={dirOf(w!)} /></td>
          <td className="r num">{w!.per_decade === null ? "n/a" : `${(w!.per_decade > 0 ? "+" : "−")}${fmtN(w!.per_decade, 2)} SD/decade`}</td>
          <td><Verdict w={w!} /></td>
        </tr>)}</tbody>
      </table>
    </section>}

    <section className="aq-leads" aria-labelledby="aq-leads-title">
      <h2 id="aq-leads-title">Guided cases</h2>
      <div className="aq-leads-grid">{leads.map((l) => <button key={l.title} type="button" onClick={l.go}><strong>{l.title}</strong><span>{l.text}</span></button>)}</div>
    </section>
  </>;
}
