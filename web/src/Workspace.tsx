// AI-assisted: Codex (OpenAI). Pick a supported zone and NASA variable.
import { useState } from "react";
import { CaseFileView } from "./CaseFile";
import type { Level } from "./levels";
import type { CaseRef, Manifest } from "./types";

export const PLACES: Record<string, string> = {
  Z2: "Villacurí fields", Z1: "Ica Valley fields", Z5: "Desert reference", Z4: "Andean headwaters", ZW: "Ica–Villacurí region",
  ZCR: "Central Valley · natural land", ZHPR: "High Plains · natural land", ZINR: "NW India · natural land",
  ZNCR: "North China Plain · natural land", ZARR: "Arabia · natural land", ZTER: "Tigris–Euphrates · natural land",
  ZGUR: "Guarani · natural land",
  ZC: "Central Valley, CA (atlas)", ZHP: "High Plains, US (atlas)", ZIN: "Northwest India (atlas)",
  ZNC: "North China Plain (atlas)", ZAR: "Arabian aquifers (atlas)", ZTE: "Tigris–Euphrates (atlas)", ZGU: "Guarani aquifer (atlas)",
};

export const WITNESSES = [
  { id: "ndvi", label: "Vegetation greenness", symbol: "↗", unavailable: "The greenness series covers fields and the desert reference." },
  { id: "et", label: "Evapotranspiration", symbol: "◌", unavailable: "The ET series covers the two cropland masks." },
  { id: "lst", label: "Surface temperature", symbol: "☼", unavailable: "Surface temperature was extracted for fields and the desert reference." },
  { id: "precip", label: "Rainfall", symbol: "⋮", unavailable: "This pipeline uses the IMERG series for the Andean headwaters." },
  { id: "t2m", label: "Air temperature", symbol: "≈", unavailable: "MERRA-2 describes the headwaters or the wider region at this resolution." },
  { id: "gws", label: "Groundwater · GLDAS", symbol: "≋", unavailable: "GLDAS groundwater storage is available for the wider region." },
  { id: "tws_grace", label: "Total water · GRACE", symbol: "◎", unavailable: "The GRACE series represents coarse regional storage." },
] as const;

const LEADS: { title: string; text: string; caseId: string; tool?: "map" | "lab" }[] = [
  { title: "The greening desert", text: "Follow the change in Villacurí.", caseId: "Z2_ndvi" },
  { title: "The invisible drop", text: "Compare a well with the view from orbit.", caseId: "ZW_tws_grace", tool: "map" },
  { title: "The cooling oasis", text: "Compare the fields with the desert reference.", caseId: "Z2_vs_Z5_lst" },
  { title: "Two valleys, one satellite", text: "See GRACE confirm a loss in California that it cannot see in Ica.", caseId: "ZC_tws_grace" },
  { title: "When tests disagree", text: "Try a simulation where the true change is known.", caseId: "ZW_gws", tool: "lab" },
];

function Prediction({ refCase }: { refCase: CaseRef }) {
  const [choice, setChoice] = useState("");
  const [revealed, setRevealed] = useState(false);
  const choices = ["Going up", "Going down", "Evidence may be unclear"];
  const conclusion = refCase.verdict === "confirmed" || refCase.verdict === "likely"
    ? `The full-period estimate points ${(refCase.sen_per_decade ?? 0) > 0 ? "up" : "down"}. The verdict is ${refCase.verdict === "confirmed" ? "a confirmed trend under the pre-registered rule" : "a likely trend"}.`
    : "The available evidence leaves the direction uncertain. Look at the estimate and the conclusions from the two approaches.";
  return (
    <details className="research-details prediction-note">
      <summary>First look: does this series appear to have a trend?</summary>
      <p>Look at the monthly record below, then answer before reading the verdict.</p>
      <div className="toggle">
        {choices.map((label) => <button key={label} type="button" aria-pressed={choice === label} onClick={() => { setChoice(label); setRevealed(true); }}>{label}</button>)}
      </div>
      {revealed && <p role="status">{conclusion}</p>}
    </details>
  );
}

export function Workspace({ m, level, selected, onCase, caseLink, startWithLead, onLead }: {
  m: Manifest; level: Level; selected: CaseRef; onCase: (id: string) => void; caseLink: (id: string) => string;
  startWithLead: boolean; onLead: (id: string, tool?: "map" | "lab") => void;
}) {
  const [unavailable, setUnavailable] = useState("");
  const variable = selected.variable.replace(/_contrast$/, "");
  const inZone = m.cases.filter((c) => c.zone === selected.zone && c.kind === "case");
  const base = inZone.find((c) => c.variable === variable);
  // Cropland minus its reference land: Ica's desert (Z5) or the atlas aquifer's natural land (<zone>R).
  const contrast = m.cases.find((c) => c.kind === "contrast" && c.zone === selected.zone && c.variable === `${variable}_contrast`);
  const desert = contrast ? m.cases.find((c) => c.id === `${contrast.ref_zone ?? "Z5"}_${variable}`) : undefined;
  const missing = WITNESSES.find((w) => w.id === unavailable);
  const alternative = m.cases.find((c) => c.variable === unavailable && c.kind === "case");

  const chooseWitness = (id: string) => {
    const available = inZone.find((c) => c.variable === id);
    setUnavailable(available ? "" : id);
    if (available && variable !== id) onCase(available.id);
  };

  return (
    <section className="wrap wide research-page">
      <div className="research-heading">
        <p className="eyebrow">{["ZC", "ZHP", "ZIN", "ZNC", "ZAR", "ZTE", "ZGU"].includes(selected.zone) ? `${selected.zone_name} · world aquifer atlas` : "Ica, Peru"} · NASA Earth observations</p>
        <h1>Detective desk</h1>
      </div>

      <details className="research-details lead-list" open={startWithLead || undefined}>
        <summary>Follow a guided case</summary>
        <div className="lead-grid">
          {LEADS.filter((lead) => m.cases.some((c) => c.id === lead.caseId)).map((lead) => (
            <button key={lead.caseId} className="lead-card" onClick={() => {
              setUnavailable("");
              onLead(lead.caseId, lead.tool);
            }}>
              <strong>{lead.title} <span aria-hidden="true">↗</span></strong>
              <span>{lead.text}</span>
            </button>
          ))}
        </div>
      </details>

      <div className="research-desk">
        <aside className="desk-controls panel">
          <label className="research-field">Study area
            <select value={selected.zone} onChange={(e) => {
              const zone = e.target.value;
              const choices = m.cases.filter((c) => c.zone === zone && c.kind === "case");
              const next = choices.find((c) => c.variable === variable) ?? choices[0];
              setUnavailable(next.variable !== variable ? variable : "");
              onCase(next.id);
            }}>
              {m.zones.filter((z) => m.cases.some((c) => c.zone === z.id)).map((z) => <option key={z.id} value={z.id}>{PLACES[z.id] ?? z.name}</option>)}
            </select>
          </label>
          <label className="research-field witness-select">NASA variable
            <select value={unavailable || variable} onChange={(e) => chooseWitness(e.target.value)}>
              {WITNESSES.map((w) => <option key={w.id} value={w.id}>{w.label}{!inZone.some((c) => c.variable === w.id) ? " (other area)" : ""}</option>)}
            </select>
          </label>
          <fieldset className="research-witnesses">
            <legend>NASA variable</legend>
            {WITNESSES.map((w) => {
              const available = inZone.find((c) => c.variable === w.id);
              return <button key={w.id} className="witness-option" data-unavailable={!available} aria-pressed={variable === w.id}
                onClick={() => chooseWitness(w.id)}>
                <span className="witness-symbol" aria-hidden="true">{w.symbol}</span><span>{w.label}</span>
                {!available && <span className="witness-status">Other area</span>}
              </button>;
            })}
          </fieldset>
          {missing && <div role="status" className="research-note">
            <strong>{missing.label}</strong><p>{missing.unavailable}</p>
            {alternative && <button className="text-button" onClick={() => { setUnavailable(""); onCase(alternative.id); }}>
              Open {PLACES[alternative.zone] ?? alternative.zone_name} →
            </button>}
          </div>}
          {base && contrast && (
            <label className="compare-toggle">
              <input type="checkbox" id="toggle-desert" checked={selected.kind === "contrast"}
                onChange={(e) => onCase(e.target.checked ? contrast.id : base.id)} />
              Compare with {contrast?.ref_zone && contrast.ref_zone !== "Z5" ? "natural land (reference)" : "desert reference"}
            </label>
          )}
        </aside>
        <div className="research-stack">
          <Prediction key={`first-look-${selected.id}`} refCase={selected} />
          <CaseFileView key={selected.id} caseRef={selected} level={level} manifest={m} href={caseLink(selected.id)}
            comparison={selected.kind === "contrast" && base && desert ? { field: base, desert } : undefined} />
        </div>
      </div>
    </section>
  );
}
