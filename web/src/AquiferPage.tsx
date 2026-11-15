// AI-assisted: Claude (Anthropic). One aquifer's own page: the 2004 / 2024 lens, its reading and six NASA witnesses.
// Every number comes from the engine's manifest; nothing is computed here.
import { useMemo } from "react";
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

export function AquiferPage({ m, id, onCase, onIca, onBack }: {
  m: Manifest; id: string; onCase: (id: string) => void; onIca: () => void; onBack: () => void;
}) {
  const a = (m.atlas ?? []).find((x) => x.id === id);
  if (!a) return <section className="wrap wide aq-page"><p>Unknown aquifer. <button className="aq-link" onClick={onBack}>Back to the globe</button></p></section>;
  const ica = a.id === "ZW";
  const toWitnesses = () => document.getElementById("aq-witnesses")?.scrollIntoView({ behavior: "smooth", block: "start" });
  return <>
  {ica ? <HeroMap m={m} primary={{ label: "See the six witnesses ↓", go: toWitnesses }} onMap={onBack} />
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
        <caption>Six NASA witnesses, 2004–2024. Select a row to open its case file.</caption>
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
    primary={{ label: "See the six witnesses ↓", go: onWitnesses }} secondary={{ label: "All aquifers", go: onBack }}
    credit="MODIS Terra surface reflectance, same growing season in 2004 and 2024 · NASA via Google Earth Engine" />;
}
