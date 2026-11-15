// AI-assisted: Codex (OpenAI). Pick a supported zone and NASA variable.
import { useState } from "react";
import { CaseFileView } from "./CaseFile";
import type { Level } from "./levels";
import type { CaseRef, Manifest } from "./types";

export const PLACES: Record<string, string> = {
  Z2: "Villacurí fields", Z1: "Ica Valley fields", Z5: "Desert reference", Z4: "Andean headwaters", ZW: "Ica–Villacurí region",
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
      <summary>Make a prediction <span>optional</span></summary>
      <p>What do you expect the series to show?</p>
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
  const contrast = m.cases.find((c) => c.id === `${selected.zone}_vs_Z5_${variable}`);
  const desert = m.cases.find((c) => c.id === `Z5_${variable}`);
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
        <p className="eyebrow">Ica, Peru · NASA Earth observations</p>
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
              Compare with desert reference
            </label>
          )}
        </aside>
        <div className="research-stack">
          {level === "explorer" && <Prediction key={selected.id} refCase={selected} />}
          <CaseFileView key={selected.id} caseRef={selected} level={level} manifest={m} href={caseLink(selected.id)}
            comparison={selected.kind === "contrast" && base && desert ? { field: base, desert } : undefined} />
        </div>
      </div>
    </section>
  );
}
