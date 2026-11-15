// AI-assisted: Claude (Anthropic). The detective's desk: pick a place and a witness (variable), read the case file.
import { useState, type ReactNode } from "react";
import { CaseFileView } from "./CaseFile";
import { asset, useJSON } from "./data";
import type { Level } from "./levels";
import type { CaseRef, GeoFeature, Manifest, MapMeta } from "./types";

export interface Pick { zone: string; variable: string; vsDesert: boolean }

export const PLACES: { id: string; name: string; blurb: string; subject: string; plural: boolean }[] = [
  { id: "Z2", name: "Villacurí fields", blurb: "New irrigated farms on desert plains", subject: "the Villacurí fields", plural: true },
  { id: "Z1", name: "Ica Valley fields", blurb: "Old farmland along the Ica River", subject: "the Ica Valley fields", plural: true },
  { id: "Z5", name: "Untouched desert", blurb: "The control: never irrigated", subject: "the untouched desert", plural: false },
  { id: "Z4", name: "Andean headwaters", blurb: "Where the aquifer's rain falls, above 2,500 m", subject: "the Andean headwaters", plural: true },
  { id: "ZW", name: "Whole region", blurb: "The 50–330 km scale of models and gravity satellites", subject: "the whole region", plural: false },
];

const ICON: Record<string, ReactNode> = {
  ndvi: <path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14Zm0 0 7-7" />,
  et: <><path d="M12 3c3 4 5 6.5 5 9a5 5 0 0 1-10 0c0-2.5 2-5 5-9Z" /><path d="M9 21h6" /></>,
  lst: <><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></>,
  precip: <><path d="M7 15a4 4 0 0 1 .5-8 5 5 0 0 1 9.5 1.5A3.5 3.5 0 0 1 16.5 15Z" /><path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2" /></>,
  t2m: <><path d="M10 14V5a2 2 0 1 1 4 0v9a4 4 0 1 1-4 0Z" /><path d="M12 9v7" /></>,
  gws: <><path d="M3 9h18M3 14h18" strokeDasharray="2 2" /><path d="M12 4v13m-3-3 3 3 3-3" /></>,
  tws_grace: <><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4a12 12 0 0 1 0 16M12 4a12 12 0 0 0 0 16" /></>,
};

export const WITNESSES: { v: string; name: string; question: string; only?: string }[] = [
  { v: "ndvi", name: "Greenness", question: "getting greener" },
  { v: "et", name: "Water used by crops", question: "using more water" },
  { v: "lst", name: "Surface heat", question: "getting hotter or cooler" },
  { v: "precip", name: "Rain", question: "getting wetter or drier", only: "Satellite rain over the coastal desert is unreliable, so rain is read in the Andean headwaters." },
  { v: "t2m", name: "Air temperature", question: "warming", only: "MERRA-2 cells are about 55 km wide: it describes the regional climate, not a single field." },
  { v: "gws", name: "Groundwater (model)", question: "gaining or losing groundwater", only: "GLDAS cells are about 28 km wide, larger than the farms: it is read for the whole region." },
  { v: "tws_grace", name: "Total water (GRACE)", question: "gaining or losing water", only: "GRACE weighs water over about 330 km: it only exists for the whole region." },
];

function Locator({ zone }: { zone: string }) {
  const { data: meta } = useJSON<MapMeta>("map.json");
  const { data: zones } = useJSON<{ features: GeoFeature<{ id: string }>[] }>("zones.geojson");
  if (!meta || !zones) return <div className="locator" />;
  const [W, S, E, N] = meta.bbox;
  const VW = 1432, VH = 1700;
  const f = zones.features.find((z) => z.properties.id === zone);
  const ring: [number, number][] = f ? f.geometry.coordinates[0] : [];
  const pts = ring.map(([lon, lat]) => `${(((lon - W) / (E - W)) * VW).toFixed(0)},${(((N - lat) / (N - S)) * VH).toFixed(0)}`).join(" ");
  return (
    <div className="locator" aria-hidden="true">
      <img src={asset(meta.images["ndvi_trend"].file)} alt="" />
      <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none">
        <defs><mask id="loc-mask"><rect width={VW} height={VH} fill="white" /><polygon points={pts} fill="black" /></mask></defs>
        <rect width={VW} height={VH} className="loc-dim" mask="url(#loc-mask)" />
        <polygon points={pts} className="loc-zone" />
      </svg>
    </div>
  );
}

type Guess = "up" | "down" | "none";
const GUESS_TEXT: Record<Guess, string> = { up: "Going up", down: "Going down", none: "No real change" };

function truthOf(c: CaseRef): Guess {
  if (c.verdict !== "confirmed" && c.verdict !== "likely") return "none";
  return (c.sen_per_decade ?? 0) > 0 ? "up" : "down";
}

function Predict({ onGuess }: { onGuess: (g: Guess) => void }) {
  return (
    <div className="predict">
      <span className="eyebrow">Before you look</span>
      <h4>What do you think the evidence will say?</h4>
      <div className="predict-opts">
        {(["up", "down", "none"] as Guess[]).map((g) => (
          <button key={g} id={`guess-${g}`} className={`guess ${g}`} onClick={() => onGuess(g)}>
            <span className="g-icon" aria-hidden="true">{g === "up" ? "↗" : g === "down" ? "↘" : "→"}</span>{GUESS_TEXT[g]}
          </button>
        ))}
      </div>
    </div>
  );
}

function Feedback({ guess, c }: { guess: Guess; c: CaseRef }) {
  const truth = truthOf(c);
  const right = guess === truth;
  return (
    <div className={`feedback ${right ? "right" : "wrong"}`} role="status">
      <span className="fb-mark" aria-hidden="true">{right ? "✓" : "✗"}</span>
      <div>
        <strong>{right ? "Good detective work." : "Not this time."}</strong>{" "}
        You said <b>{GUESS_TEXT[guess].toLowerCase()}</b>; the evidence says <b>{GUESS_TEXT[truth].toLowerCase()}</b>.
        {truth === "none" && guess !== "none" && " Many series wiggle up and down and fool the eye. That is exactly why we test."}
        {truth !== "none" && guess === "none" && " The honest tests prove a real change here, even after removing seasons, El Niño and noise."}
        {truth !== "none" && guess !== "none" && !right && " Look at the trend line, not the single months: it is the direction that survives every check."}
      </div>
    </div>
  );
}

export function Workspace({ m, level, pick, setPick, tabbed = false }: { m: Manifest; level: Level; pick: Pick; setPick: (p: Pick) => void; tabbed?: boolean }) {
  const has = (zone: string, v: string) => m.cases.some((c) => c.id === `${zone}_${v}`);
  const place = PLACES.find((p) => p.id === pick.zone)!;
  const wit = WITNESSES.find((w) => w.v === pick.variable)!;
  const contrastId = `${pick.zone}_vs_Z5_${pick.variable}`;
  const canCompare = m.cases.some((c) => c.id === contrastId);
  const caseId = pick.vsDesert && canCompare ? contrastId : `${pick.zone}_${pick.variable}`;
  const caseRef = m.cases.find((c) => c.id === caseId);
  const [guesses, setGuesses] = useState<Record<string, Guess>>({});
  const playing = level === "explorer" && caseRef && !guesses[caseRef.id];

  const choosePlace = (zone: string) => {
    const v = has(zone, pick.variable) ? pick.variable : WITNESSES.find((w) => has(zone, w.v))!.v;
    setPick({ zone, variable: v, vsDesert: pick.vsDesert });
  };
  const chooseWitness = (v: string) => {
    if (has(pick.zone, v)) return setPick({ ...pick, variable: v });
    const z = PLACES.find((p) => has(p.id, v))!.id;   // jump to the place where this witness exists
    setPick({ zone: z, variable: v, vsDesert: false });
  };

  return (
    <div className="desk">
      <aside className="desk-side">
        <div className="desk-step">
          <span className="step-n">1</span>
          <div>
            <span className="step-t">Pick a place</span>
            <div className="place-list" role="group" aria-label="Place">
              {PLACES.map((p) => (
                <button key={p.id} id={`place-${p.id}`} className="place" aria-pressed={pick.zone === p.id} onClick={() => choosePlace(p.id)}>
                  <span className="p-name" title={p.blurb}>{p.name}</span>
                  <span className="p-blurb">{p.blurb}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <Locator zone={pick.zone} />
        <div className="desk-step">
          <span className="step-n">2</span>
          <div>
            <span className="step-t">Call a witness</span>
            <div className="witness-list" role="group" aria-label="Variable">
              {WITNESSES.map((w) => {
                const here = has(pick.zone, w.v);
                return (
                  <button key={w.v} id={`witness-${w.v}`} className={`wit ${here ? "" : "elsewhere"}`} aria-pressed={pick.variable === w.v}
                    title={here ? undefined : w.only ?? "Not measured for this place"} onClick={() => chooseWitness(w.v)}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6"
                      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICON[w.v]}</svg>
                    <span>{w.name}</span>
                    {!here && <span className="wit-tag">other place</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {canCompare && !tabbed && (
          <div className="desk-step">
            <span className="step-n">3</span>
            <div>
              <span className="step-t">Cross-examine</span>
              <label className="compare-toggle">
                <input id="toggle-desert" type="checkbox" checked={pick.vsDesert} onChange={(e) => setPick({ ...pick, vsDesert: e.target.checked })} />
                <span>Compare with the untouched desert <span className="muted">(removes the weather both places share)</span></span>
              </label>
            </div>
          </div>
        )}
        {wit.only && <p className="desk-note small">{wit.only}</p>}
      </aside>

      <div className="desk-main">
        <div className="question">
          <span className="eyebrow">The question</span>
          <h3>
            {pick.vsDesert && canCompare
              ? <>Are {place.subject} changing differently from the untouched desert?</>
              : <>{place.plural ? "Are" : "Is"} {place.subject} {wit.question}?</>}
          </h3>
          {tabbed && canCompare && (
            <label className="compare-toggle inline">
              <input id="toggle-desert" type="checkbox" checked={pick.vsDesert} onChange={(e) => setPick({ ...pick, vsDesert: e.target.checked })} />
              <span><b>Cross-examine:</b> compare with the untouched desert <span className="muted">(removes the weather both places share)</span></span>
            </label>
          )}
        </div>
        {!caseRef && <div className="loading">No case for this choice.</div>}
        {caseRef && playing && <Predict onGuess={(g) => setGuesses({ ...guesses, [caseRef.id]: g })} />}
        {caseRef && !playing && (
          <>
            {level === "explorer" && guesses[caseRef.id] && <Feedback guess={guesses[caseRef.id]} c={caseRef} />}
            <CaseFileView caseRef={caseRef} level={level} tabbed={tabbed} />
          </>
        )}
      </div>
    </div>
  );
}
