// AI-assisted: Codex (OpenAI). Pick a supported zone and NASA variable.
import { useState, type MutableRefObject } from "react";
import type { ChatContext } from "./chat-contract";
import { CaseFileView } from "./CaseFile";
import { useEvidence } from "./evidence";
import { useLocale, type Translation } from "./i18n";
import type { Level } from "./levels";
import type { CaseRef, Manifest } from "./types";

export const WITNESSES = [
  { id: "ndvi", symbol: "↗" },
  { id: "et", symbol: "◌" },
  { id: "lst", symbol: "☼" },
  { id: "precip", symbol: "⋮" },
  { id: "t2m", symbol: "≈" },
  { id: "gws", symbol: "≋" },
  { id: "tws_grace", symbol: "◎" },
] as const;

const LEADS: { title: Translation; text: Translation; caseId: string; tool?: "map" | "lab" }[] = [
  { title: ["The greening desert", "Un desierto más verde"], text: ["See the monthly MODIS greenness series and the trend in Villacurí.", "Consulta la serie mensual de verdor de MODIS y su tendencia en Villacurí."], caseId: "Z2_ndvi" },
  { title: ["The invisible drop", "El descenso invisible"], text: ["Open the Ica map to see what individual wells, GLDAS and GRACE show at different scales.", "Abre el mapa de Ica para ver qué muestran los pozos, GLDAS y GRACE a distintas escalas."], caseId: "ZW_tws_grace", tool: "map" },
  { title: ["The cooling oasis", "Un oasis que se enfría"], text: ["See how the surface temperature gap between fields and desert changed over time.", "Consulta cómo cambió con el tiempo la brecha de temperatura superficial entre los campos y el desierto."], caseId: "Z2_vs_Z5_lst" },
  { title: ["When tests disagree", "Cuando las pruebas discrepan"], text: ["Compare how often statistical tests report a false alarm in a simulation.", "Compara con qué frecuencia las pruebas estadísticas reportan una falsa alarma en una simulación."], caseId: "ZW_gws", tool: "lab" },
];

function Prediction({ refCase }: { refCase: CaseRef }) {
  const { t, signed } = useLocale();
  const { perDecade, verdictText } = useEvidence();
  const [choice, setChoice] = useState<"up" | "down" | "unclear">();
  const choices = [
    ["up", t("Increase", "Aumento")],
    ["down", t("Decrease", "Descenso")],
    ["unclear", t("Unclear trend", "Tendencia incierta")],
  ] as const;
  const slope = refCase.sen_per_decade;
  const direction = slope === null || slope === 0 ? "unclear" : slope > 0 ? "up" : "down";
  const supported = refCase.verdict === "confirmed" || refCase.verdict === "likely";
  const expected = supported ? direction : "unclear";
  const feedback = choice === expected ? t("Your reading matches the evidence.", "Tu lectura coincide con la evidencia.")
    : expected === "unclear" ? (choice === direction
      ? t("Your choice matches the sign of the estimate. The evidence leaves the trend uncertain.", "Tu elección coincide con el signo de la estimación. La evidencia deja la tendencia en duda.")
      : t("The evidence is too weak to support the direction you chose.", "La evidencia es insuficiente para respaldar la dirección que elegiste."))
    : choice === "unclear" ? t("The evidence supports a direction for this series.", "La evidencia respalda una dirección para esta serie.")
      : t("The supported trend points in the opposite direction.", "La tendencia respaldada apunta en la dirección opuesta.");
  return (
    <details open className="research-details prediction-note">
      <summary>{t("Practice reading the chart", "Practica la lectura del gráfico")}</summary>
      <p>{t("Look at the monthly chart above. Choose the direction you would report for the full period and compare it with the statistical result.", "Mira el gráfico mensual de arriba. Elige qué dirección reportarías para el periodo completo y compárala con el resultado estadístico.")}</p>
      <div className="toggle" role="group" aria-label={t("Your trend assessment", "Tu evaluación de la tendencia")}>
        {choices.map(([id, label]) => <button key={id} type="button" aria-pressed={choice === id} onClick={() => setChoice(id)}>{label}</button>)}
      </div>
      {choice && <div className="prediction-feedback">
        <div role="status">
          <strong>{t("Your choice", "Tu elección")} · {choices.find(([id]) => id === choice)?.[1]}</strong>
          <p>{feedback} <b>{verdictText(refCase.verdict)}</b>{slope !== null && <> · {signed(slope)} {perDecade(refCase.units)}</>}.</p>
        </div>
        <button type="button" className="text-button" onClick={() => {
          const tests = document.getElementById("case-tests-title");
          tests?.focus({ preventScroll: true });
          tests?.scrollIntoView({ block: "start" });
        }}>{t("See what each statistical test found ↓", "Ver qué encontró cada prueba estadística ↓")}</button>
      </div>}
    </details>
  );
}

export function Workspace({ m, level, selected, onCase, caseLink, onLead, chatContextRef }: {
  m: Manifest; level: Level; selected: CaseRef; onCase: (id: string) => void; caseLink: (id: string) => string;
  chatContextRef: MutableRefObject<(() => ChatContext) | null>;
  onLead: (id: string, tool?: "map" | "lab") => void;
}) {
  const { t } = useLocale();
  const { zoneName, variableName } = useEvidence();
  const [selectionNotice, setSelectionNotice] = useState<{ caseId: string; variable: string }>();
  const variable = selected.variable.replace(/_contrast$/, "");
  const inZone = m.cases.filter((c) => c.zone === selected.zone && c.kind === "case");
  const base = inZone.find((c) => c.variable === variable);
  const contrast = m.cases.find((c) => c.kind === "contrast" && c.zone === selected.zone && c.variable === `${variable}_contrast`);
  const desert = contrast ? m.cases.find((c) => c.id === `${contrast.ref_zone ?? "Z5"}_${variable}`) : undefined;
  const notice = selectionNotice?.caseId === selected.id ? selectionNotice : undefined;
  const alternative = notice && m.cases.find((c) => c.variable === notice.variable && c.kind === "case");

  const chooseWitness = (id: string) => {
    const available = inZone.find((c) => c.variable === id);
    setSelectionNotice(available ? undefined : { caseId: selected.id, variable: id });
    if (available && variable !== id) onCase(available.id);
  };
  const witnessLabel = (id: string) => variableName(id, id, true);

  return (
    <section className="wrap wide research-page">
      <div className="research-heading">
        <p className="eyebrow">{m.cases.some((c) => c.id === selected.id) && <>{zoneName(selected.zone, selected.zone_name)} · {t("NASA Earth observations", "Observaciones de la Tierra de NASA")}</>}</p>
        <h1>{t("Detective desk", "Mesa de investigación")}</h1>
        <p>{t("Explore how NASA variables change over time and check which trends the statistical tests support.", "Explora cómo cambian las variables de NASA con el tiempo y comprueba qué tendencias respaldan las pruebas estadísticas.")}</p>
      </div>

      <details className="research-details lead-list" open>
        <summary>{t("Follow a guided case", "Explora un caso guiado")}</summary>
        <div className="lead-grid">
          {LEADS.filter((lead) => m.cases.some((c) => c.id === lead.caseId)).map((lead) => (
            <button key={lead.caseId} className="lead-card" onClick={() => {
              setSelectionNotice(undefined);
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
          <h2>{t("Choose what to analyze", "Elige qué analizar")}</h2>
          <p className="control-help" id="case-controls-help">{t(
            "Changing the variable updates the monthly chart, estimated trend and tests for this area. Select a different area to see data from another region.",
            "Al cambiar la variable se actualizan el gráfico mensual, la tendencia estimada y las pruebas de esta área. Elige otra área para ver datos de una región diferente.",
          )}</p>
          <label className="research-field">{t("Study area", "Área de estudio")}
            <select value={selected.zone} aria-describedby="case-controls-help" onChange={(e) => {
              const zone = e.target.value;
              const choices = m.cases.filter((c) => c.zone === zone && c.kind === "case");
              const next = choices.find((c) => c.variable === variable) ?? choices[0];
              if (!next) return;
              setSelectionNotice(next.variable === variable ? undefined : { caseId: next.id, variable });
              onCase(next.id);
            }}>
              {m.zones.filter((z) => m.cases.some((c) => c.zone === z.id && c.kind === "case")).map((z) => <option key={z.id} value={z.id}>{zoneName(z.id, z.name)}</option>)}
            </select>
          </label>
          <label className="research-field witness-select">{t("NASA variable", "Variable de NASA")}
            <select value={variable} onChange={(e) => chooseWitness(e.target.value)}>
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
                {variable === w.id ? <span className="witness-status" aria-hidden="true">✓</span>
                  : !available && <span className="witness-status">{t("Other area", "Otra área")}</span>}
              </button>;
            })}
          </fieldset>
          {notice && <div className="research-note">
            <p role="status">{t(
              `${witnessLabel(notice.variable)} has no series here. The current analysis shows ${witnessLabel(variable)}.`,
              `Esta área no tiene una serie de «${witnessLabel(notice.variable)}». El análisis actual muestra «${witnessLabel(variable)}».`,
            )}</p>
            {alternative && <button className="text-button" onClick={() => { setSelectionNotice(undefined); onCase(alternative.id); }}>
                {t("View this variable in", "Ver esta variable en")} {zoneName(alternative.zone, alternative.zone_name)} →
            </button>}
          </div>}
          {base && contrast && (
            <div>
              <p className="control-help" id="case-contrast-help">{t(
                "Turn on the comparison to see both monthly series and test how the gap between them changed. Turn it off to return to the selected area’s trend.",
                "Activa la comparación para ver ambas series mensuales y evaluar cómo cambió la brecha entre ellas. Desactívala para volver a la tendencia del área seleccionada.",
              )}</p>
              <label className="compare-toggle">
                <input type="checkbox" id="toggle-desert" aria-describedby="case-contrast-help" checked={selected.kind === "contrast"}
                  onChange={(e) => onCase(e.target.checked ? contrast.id : base.id)} />
                {contrast.ref_zone && contrast.ref_zone !== "Z5" ? t("Compare with natural land", "Comparar con terrenos naturales") : t("Compare with desert reference", "Comparar con el desierto de referencia")}
              </label>
            </div>
          )}
        </aside>
        <div className="research-stack">
          <CaseFileView key={selected.id} caseRef={selected} level={level} manifest={m} href={caseLink(selected.id)} chatContextRef={chatContextRef}
            practice={level !== "explorer" ? <Prediction refCase={selected} /> : undefined}
            comparison={selected.kind === "contrast" && base && desert ? { field: base, desert } : undefined} />
        </div>
      </div>
    </section>
  );
}
