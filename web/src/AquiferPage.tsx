// AI-assisted: Claude (Anthropic). One aquifer's own page: the 2004 / 2024 lens, its reading and six NASA witnesses.
// Every number comes from the engine's manifest; nothing is computed here.
import { useRef, useState } from "react";
import { asset } from "./data";
import { fmt } from "./format";
import { amount, dirOf, short, Spark, Verdict, WITNESSES } from "./Atlas";
import type { Manifest } from "./types";

/** 2004 underneath, 2024 inside a lens that follows the pointer (or the arrow keys). */
function LensCompare({ before, after, alt, credit }: { before: string; after: string; alt: string; credit: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [moved, setMoved] = useState(false);
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" && e.buttons === 0 && e.type === "pointermove") return;
    const r = box.current!.getBoundingClientRect();
    setPos({ x: Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)), y: Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100)) });
    setMoved(true);
  };
  const key = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const d: Record<string, [number, number]> = { ArrowLeft: [-4, 0], ArrowRight: [4, 0], ArrowUp: [0, -4], ArrowDown: [0, 4] };
    const v = d[e.key]; if (!v) return;
    e.preventDefault(); setMoved(true);
    setPos((p) => ({ x: Math.max(0, Math.min(100, p.x + v[0])), y: Math.max(0, Math.min(100, p.y + v[1])) }));
  };
  return <figure className="lens-compare">
    <div className="lens-box" ref={box} onPointerMove={move} onPointerDown={move} onKeyDown={key} tabIndex={0}
      role="img" aria-label={`${alt}. Move the lens with the pointer or the arrow keys to compare 2004 with 2024.`}
      style={{ ["--x" as string]: `${pos.x}%`, ["--y" as string]: `${pos.y}%` }}>
      <img src={before} alt="" className="lens-base" draggable={false} />
      <div className="lens-in"><img src={after} alt="" draggable={false} /></div>
      <span className="lens-ring" aria-hidden="true" />
      <span className="lens-tag l">2004</span><span className="lens-tag r">Inside the lens: 2024</span>
      {!moved && <span className="lens-hint">Move the lens</span>}
    </div>
    <figcaption>{credit}</figcaption>
  </figure>;
}

export function AquiferPage({ m, id, onCase, onIca, onBack }: {
  m: Manifest; id: string; onCase: (id: string) => void; onIca: () => void; onBack: () => void;
}) {
  const a = (m.atlas ?? []).find((x) => x.id === id);
  if (!a) return <section className="wrap wide aq-page"><p>Unknown aquifer. <button className="aq-link" onClick={onBack}>Back to the globe</button></p></section>;
  const ica = a.id === "ZW";
  return <section className="aq-page" aria-labelledby="aq-title">
    <div className="wrap wide">
      <button className="aq-back" onClick={onBack}>All aquifers</button>
      <p className="aq-meta">{a.countries.join(", ")} <span>·</span> {Math.round(a.area_km2).toLocaleString("en-US")} km² <span>·</span> {fmt(a.grace_footprints, 2)} GRACE footprints</p>
      <h1 id="aq-title">{short(a.name) === a.name ? a.name : <>{short(a.name)} <small>{a.name.slice(short(a.name).length).replace(/^[ ,]+/, "")}</small></>}</h1>
      <p className="aq-desc">{a.description}</p>

      <LensCompare before={asset(`img/aquifers/${a.id}_2004.jpg`)} after={asset(`img/aquifers/${a.id}_2024.jpg`)}
        alt={`Satellite view of ${a.name} in 2004 and 2024`}
        credit={ica ? "Landsat 5 TM (2004) and Landsat 8/9 OLI (2024), Collection 2 · NASA/USGS via Google Earth Engine"
          : "MODIS Terra surface reflectance, same growing season in 2004 and 2024 · NASA via Google Earth Engine"} />

      <div className="aq-reading-row">
        <p className="aq-reading">{a.reading}</p>
        <p className="aq-ref">Reference: {a.reference}{ica ? ". Ica's rain is measured over the Andean headwaters; its fields are Villacurí's." : ""}</p>
        {ica && <button className="aq-link" onClick={onIca}>Open the Ica deep dive, with its field wells</button>}
      </div>

      <table className="aq-witnesses">
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
  </section>;
}
