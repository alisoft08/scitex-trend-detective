// AI-assisted: Codex (OpenAI). Pick a supported zone and NASA variable.
import { useState } from "react";
import { CaseFileView } from "./CaseFile";
import { useEvidence } from "./evidence";
import { useLocale, type Translation } from "./i18n";
import type { Level } from "./levels";
import type { CaseRef, Manifest } from "./types";

export const WITNESSES = [
  { id: "ndvi", symbol: "↗", unavailable: ["The greenness series covers fields and the desert reference.", "La serie de verdor cubre los campos y el desierto de referencia."] },
  { id: "et", symbol: "◌", unavailable: ["The ET series covers the two cropland masks.", "La serie de evapotranspiración cubre las dos máscaras agrícolas."] },
  { id: "lst", symbol: "☼", unavailable: ["Surface temperature was extracted for fields and the desert reference.", "La temperatura superficial se extrajo para los campos y el desierto de referencia."] },
  { id: "precip", symbol: "⋮", unavailable: ["The IMERG record used here covers the Andean headwaters.", "La serie IMERG utilizada aquí cubre la cabecera andina."] },
  { id: "t2m", symbol: "≈", unavailable: ["MERRA-2 describes the headwaters or the wider region at this resolution.", "A esta resolución, MERRA-2 describe la cabecera de cuenca o la región completa."] },
  { id: "gws", symbol: "≋", unavailable: ["GLDAS groundwater storage is available for the wider region.", "El almacenamiento de agua subterránea de GLDAS está disponible para la región completa."] },
  { id: "tws_grace", symbol: "◎", unavailable: ["The GRACE series represents coarse regional storage.", "La serie GRACE representa el almacenamiento de agua a escala regional."] },
] as const;

const LEADS: { title: Translation; text: Translation; caseId: string; tool?: "map" | "lab" }[] = [
  { title: ["The greening desert", "Un desierto más verde"], text: ["Follow the change in Villacurí.", "Sigue el cambio en Villacurí."], caseId: "Z2_ndvi" },
  { title: ["The invisible drop", "El descenso invisible"], text: ["Compare a well with the view from orbit.", "Compara un pozo con la vista desde órbita."], caseId: "ZW_tws_grace", tool: "map" },
  { title: ["The cooling oasis", "Un oasis que se enfría"], text: ["Compare the fields with the desert reference.", "Compara los campos con el desierto de referencia."], caseId: "Z2_vs_Z5_lst" },
  { title: ["When tests disagree", "Cuando las pruebas discrepan"], text: ["Try a simulation where the true change is known.", "Prueba una simulación en la que conocemos el cambio real."], caseId: "ZW_gws", tool: "lab" },
];

function Prediction({ refCase }: { refCase: CaseRef }) {
  const { t } = useLocale();
  const [choice, setChoice] = useState<number | null>(null);
  const choices = [t("Going up", "Sube"), t("Going down", "Baja"), t("Evidence may be unclear", "La evidencia puede ser insuficiente")];
  const rising = (refCase.sen_per_decade ?? 0) > 0;
  const conclusion = refCase.verdict === "confirmed" || refCase.verdict === "likely"
    ? [
        rising ? t("The full-period estimate points up.", "La estimación del periodo completo apunta al alza.")
          : t("The full-period estimate points down.", "La estimación del periodo completo apunta a la baja."),
        refCase.verdict === "confirmed" ? t("It meets the Oasis Paradox criteria.", "Cumple los criterios de Oasis Paradox.")
          : t("The evidence suggests a trend.", "La evidencia sugiere una tendencia."),
      ].join(" ")
    : t("The data leave the direction uncertain. Compare the estimate with the conclusions from each test.", "Los datos dejan incierta la dirección del cambio. Compara la estimación con las conclusiones de cada prueba.");
  return (
    <details className="research-details prediction-note">
      <summary>{t("Make a prediction", "Haz una predicción")} <span>{t("optional", "opcional")}</span></summary>
      <p>{t("What do you expect the series to show?", "¿Qué esperas que muestre la serie?")}</p>
      <div className="toggle">
        {choices.map((label, index) => <button key={index} type="button" aria-pressed={choice === index} onClick={() => setChoice(index)}>{label}</button>)}
      </div>
      {choice !== null && <p role="status">{conclusion}</p>}
    </details>
  );
}

export function Workspace({ m, level, selected, onCase, caseLink, startWithLead, onLead }: {
  m: Manifest; level: Level; selected: CaseRef; onCase: (id: string) => void; caseLink: (id: string) => string;
  startWithLead: boolean; onLead: (id: string, tool?: "map" | "lab") => void;
}) {
  const { t } = useLocale();
  const { zoneName, variableName } = useEvidence();
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
  const witnessLabel = (id: string) => variableName(id, id, true);

  return (
    <section className="wrap wide research-page">
      <div className="research-heading">
        <p className="eyebrow">{t("Ica, Peru · NASA Earth observations", "Ica, Perú · Observaciones de la Tierra de NASA")}</p>
        <h1>{t("Detective desk", "Mesa de investigación")}</h1>
      </div>

      <details className="research-details lead-list" open={startWithLead || undefined}>
        <summary>{t("Follow a guided case", "Explora un caso guiado")}</summary>
        <div className="lead-grid">
          {LEADS.filter((lead) => m.cases.some((c) => c.id === lead.caseId)).map((lead) => (
            <button key={lead.caseId} className="lead-card" onClick={() => {
              setUnavailable("");
              onLead(lead.caseId, lead.tool);
            }}>
              <strong>{t(...lead.title)} <span aria-hidden="true">↗</span></strong>
              <span>{t(...lead.text)}</span>
            </button>
          ))}
        </div>
      </details>

      <div className="research-desk">
        <aside className="desk-controls panel">
          <label className="research-field">{t("Study area", "Área de estudio")}
            <select value={selected.zone} onChange={(e) => {
              const zone = e.target.value;
              const choices = m.cases.filter((c) => c.zone === zone && c.kind === "case");
              const next = choices.find((c) => c.variable === variable) ?? choices[0];
              setUnavailable(next.variable !== variable ? variable : "");
              onCase(next.id);
            }}>
              {m.zones.filter((z) => m.cases.some((c) => c.zone === z.id)).map((z) => <option key={z.id} value={z.id}>{zoneName(z.id, z.name)}</option>)}
            </select>
          </label>
          <label className="research-field witness-select">{t("NASA variable", "Variable de NASA")}
            <select value={unavailable || variable} onChange={(e) => chooseWitness(e.target.value)}>
              {WITNESSES.map((w) => <option key={w.id} value={w.id}>{witnessLabel(w.id)}{!inZone.some((c) => c.variable === w.id) && t(" (other area)", " (otra área)")}</option>)}
            </select>
          </label>
          <fieldset className="research-witnesses">
            <legend>{t("NASA variable", "Variable de NASA")}</legend>
            {WITNESSES.map((w) => {
              const available = inZone.find((c) => c.variable === w.id);
              return <button key={w.id} className="witness-option" data-unavailable={!available} aria-pressed={variable === w.id}
                onClick={() => chooseWitness(w.id)}>
                <span className="witness-symbol" aria-hidden="true">{w.symbol}</span><span>{witnessLabel(w.id)}</span>
                {!available && <span className="witness-status">{t("Other area", "Otra área")}</span>}
              </button>;
            })}
          </fieldset>
          {missing && <div role="status" className="research-note">
            <strong>{witnessLabel(missing.id)}</strong><p>{t(missing.unavailable[0], missing.unavailable[1])}</p>
            {alternative && <button className="text-button" onClick={() => { setUnavailable(""); onCase(alternative.id); }}>
              {t("Open", "Abrir")} {zoneName(alternative.zone, alternative.zone_name)} →
            </button>}
          </div>}
          {base && contrast && (
            <label className="compare-toggle">
              <input type="checkbox" id="toggle-desert" checked={selected.kind === "contrast"}
                onChange={(e) => onCase(e.target.checked ? contrast.id : base.id)} />
              {t("Compare with desert reference", "Comparar con el desierto de referencia")}
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
