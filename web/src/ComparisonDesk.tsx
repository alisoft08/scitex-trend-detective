// AI-assisted: Codex (OpenAI). Compare two published records without mixing their scales.
import { useState } from "react";
import { useJSON } from "./data";
import { comparisonPair } from "./comparisons";
import { CasePlot, EffectBar } from "./CaseFile";
import { useEvidence, verdictCategory, VERDICT_CATEGORIES } from "./evidence";
import { useLocale } from "./i18n";
import { ShareLink } from "./ShareLink";
import { WITNESSES } from "./Workspace";
import type { Level } from "./levels";
import type { CaseFile, CaseRef, Manifest } from "./types";

function ComparePanel({ label, refCase, level, onCase }: { label: string; refCase: CaseRef; level: Level; onCase: (id: string) => void }) {
  const { t } = useLocale();
  const { casePeriod, caseTitle, zoneName, dataKind, estimate, verdictText, interval, perDecade } = useEvidence();
  const { data: cf, error } = useJSON<CaseFile>(refCase.path);
  if (error) return <p role="alert" className="error">{t("Could not load this case.", "No se pudo cargar este caso.")}</p>;
  if (!cf) return <p className="loading">{t(`Loading ${label}…`, `Cargando ${label}…`)}</p>;
  return <article className="panel analysis-panel comparison-panel">
    <div className="panel-heading">
      <p className="eyebrow">{label} · {zoneName(refCase.zone, refCase.zone_name)}</p>
      <h3>{caseTitle(refCase.variable, refCase.zone, refCase.label)}</h3>
      <p>{casePeriod(cf.period)} · {cf.n_valid}/{cf.n} {t("valid months", "meses válidos")} · {dataKind(cf)}</p>
    </div>
    <div className="comparison-result">
      <strong>{estimate(cf)}</strong>
      <span className={`pill ${cf.verdict}`}>{verdictText(cf.verdict)}</span>
    </div>
    <CasePlot cf={cf} />
    <p className="small">{t("95% slope interval", "Intervalo del 95 % para la pendiente")} <strong>{interval(cf.trend.sen_ci95_block_bootstrap)} {perDecade(cf.units)}</strong></p>
    {level === "expert" && <dl className="research-facts comparison-checks">
      <div><dt>{t("Tests adjusted for dependence both pass", "Ambas pruebas que consideran la dependencia cumplen el criterio")}</dt>
        <dd>{cf.criteria.C1 === null ? t("Not evaluated", "Sin evaluar") : cf.criteria.C1 ? t("Yes", "Sí") : t("No", "No")}</dd></div>
      <div><dt>{t("Windows in the same direction", "Ventanas con la misma dirección")}</dt><dd>{cf.trend.windows_same_sign}/{cf.trend.windows.length}</dd></div>
      <div><dt>{t("Significant fits leaving out one year", "Ajustes significativos al retirar un año")}</dt><dd>{cf.trend.jackknife_significant}/{cf.trend.jackknife_n}</dd></div>
    </dl>}
    <div className="link-row small">
      <a href={`https://doi.org/${cf.source.doi}`} target="_blank" rel="noreferrer">{t("View dataset DOI", "Consultar DOI del conjunto de datos")} · {cf.source.product} {cf.source.version}</a>
      <button className="text-button" onClick={() => onCase(cf.id)}>{t("View full trend analysis and downloads →", "Ver análisis completo de tendencia y descargas →")}</button>
    </div>
  </article>;
}

function matchedContrast(manifest: Manifest, a: CaseRef, b: CaseRef) {
  if (a.kind !== "case" || b.kind !== "case" || a.variable !== b.variable || (a.zone !== "Z5" && b.zone !== "Z5")) return undefined;
  const field = a.zone === "Z5" ? b : a;
  return manifest.cases.find((c) => c.id === `${field.zone}_vs_Z5_${field.variable}`);
}

export function ComparisonDesk({ manifest, level, pair, onPair, onCase, href, adjustedLink }: {
  manifest: Manifest; level: Level; pair: readonly [string, string]; onPair: (pair: readonly [string, string]) => void;
  onCase: (id: string) => void; href: string; adjustedLink: boolean;
}) {
  const { t, signed } = useLocale();
  const { zoneName, variableName, perDecade, interval, verdictText } = useEvidence();
  const [variable, setVariable] = useState("");
  const [zone, setZone] = useState("");
  const [verdict, setVerdict] = useState("");
  const a = manifest.cases.find((c) => c.id === pair[0]);
  const b = manifest.cases.find((c) => c.id === pair[1]);
  if (!a || !b) return <p className="error">{t("These records are unavailable.", "Estas series no están disponibles.")}</p>;
  const zonesByVariable = new Map<string, Set<string>>();
  for (const c of manifest.cases) {
    const zones = zonesByVariable.get(c.variable) ?? new Set<string>();
    zones.add(c.zone);
    zonesByVariable.set(c.variable, zones);
  }
  const variables = [...zonesByVariable].filter(([, zones]) => zones.size > 1).map(([id]) => id);
  const comparisonZones = manifest.zones.filter((z) => zonesByVariable.get(a.variable)?.has(z.id));

  function selectComparison(id: string, zoneA: string, zoneB: string) {
    const next = comparisonPair(manifest.cases, id, zoneA, zoneB);
    if (next) onPair(next);
  }

  const zoneA = a.zone;
  const zoneB = b.zone;

  function setCatalogueCase(c: CaseRef, side: "A" | "B") {
    const otherZone = side === "A" ? zoneB : zoneA;
    const next = comparisonPair(manifest.cases, c.variable, c.zone, otherZone);
    if (!next) return;
    onPair(side === "A" ? next : [next[1], next[0]]);
    const heading = document.getElementById("comparison-title");
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: "start" });
  }

  const matches = manifest.cases.filter((c) => (!variable || c.variable.replace(/_contrast$/, "") === variable)
    && (!zone || c.zone === zone) && (!verdict || verdictCategory(c.verdict) === verdict));
  const contrast = matchedContrast(manifest, a, b);
  const option = (c: CaseRef) => `${variableName(c.variable, c.short, true)} · ${zoneName(c.zone, c.zone_name)}`;
  const labelA = t("Case A", "Caso A"), labelB = t("Case B", "Caso B");

  return <section className="wrap wide research-page">
    <header className="research-heading">
      <p className="eyebrow">{t("Analysis", "Análisis")}</p>
      <h1 id="comparison-title" className="action-scroll-target" tabIndex={-1}>{t("Compare cases", "Comparar casos")}</h1>
      <p>{t("Compare the direction, magnitude and uncertainty of the same variable across two zones. The charts share a timeline and each has its own vertical scale.",
        "Compara la dirección, la magnitud y la incertidumbre de una misma variable en dos zonas. Las gráficas comparten el eje temporal y cada una tiene su propia escala vertical.")}</p>
    </header>
    <div className="panel compare-selectors">
      <p className="control-help toggle-help" id="comparison-controls-help">{t(
        "Choose one NASA variable and two study zones. Your selection updates both charts below. If a zone lacks the new variable, another zone with data takes its place.",
        "Elige una variable de NASA y dos zonas de estudio. Tu selección actualiza ambos gráficos de abajo. Si una zona carece de la nueva variable, se sustituye por otra que tenga datos.",
      )}</p>
      <label className="research-field">{t("Shared variable", "Variable común")}
        <select value={a.variable} aria-describedby="comparison-controls-help" onChange={(e) => selectComparison(e.target.value, a.zone, b.zone)}>
          {variables.map((id) => <option key={id} value={id}>{variableName(id, id, true)}</option>)}
        </select>
      </label>
      <label className="research-field">{t("Zone A", "Zona A")}
        <select value={a.zone} onChange={(e) => selectComparison(a.variable, e.target.value, b.zone)}>
          {comparisonZones.filter((z) => z.id !== b.zone).map((z) => <option key={z.id} value={z.id}>{zoneName(z.id, z.name)}</option>)}
        </select>
      </label>
      <label className="research-field">{t("Zone B", "Zona B")}
        <select value={b.zone} onChange={(e) => selectComparison(a.variable, a.zone, e.target.value)}>
          {comparisonZones.filter((z) => z.id !== a.zone).map((z) => <option key={z.id} value={z.id}>{zoneName(z.id, z.name)}</option>)}
        </select>
      </label>
      <ShareLink href={href} label={t("Copy comparison link", "Copiar enlace de la comparación")} />
    </div>
    {adjustedLink && <p className="research-callout" role="status">{t(
      "The linked selection was adjusted to show the same variable in two zones. Check the selected zones before sharing.",
      "Se ajustó la selección del enlace para mostrar la misma variable en dos zonas. Revisa las zonas antes de compartir.",
    )}</p>}
    <div className="comparison-columns">
      <ComparePanel label={labelA} refCase={a} level={level} onCase={onCase} />
      <ComparePanel label={labelB} refCase={b} level={level} onCase={onCase} />
    </div>
    {contrast ? <div className="panel analysis-panel">
      <div className="panel-heading">
        <h3>{t("Calculated field–desert contrast", "Contraste calculado entre campo y desierto")}</h3>
        <p>{t("Trend in field minus desert after standardizing each series by calendar month.",
          "Tendencia de la diferencia entre el campo y el desierto tras estandarizar cada serie por mes calendario.")}</p>
      </div>
      <div className="comparison-result"><strong>{signed(contrast.sen_per_decade)} {perDecade(contrast.units)}</strong>
        <span className={`pill ${contrast.verdict}`}>{verdictText(contrast.verdict)}</span></div>
      <p className="small">{t("95% interval", "Intervalo del 95 %")} <strong>{interval(contrast.ci95)}</strong></p>
      <button className="text-button" onClick={() => onCase(contrast.id)}>{t("View the gap chart and statistical tests →", "Ver el gráfico y las pruebas estadísticas de la brecha →")}</button>
    </div> : <p className="research-callout">{t("A direct statistical contrast is needed to assess whether the two trends differ.",
      "Se necesita un contraste estadístico directo para evaluar si las dos tendencias difieren.")}</p>}
    <section className="panel analysis-panel">
      <div className="panel-heading">
        <h2>{t("Case catalogue", "Catálogo de casos")}</h2>
        <p>{t(`${matches.length} of ${manifest.cases.length} published records`, `${matches.length} de ${manifest.cases.length} series publicadas`)}</p>
      </div>
      <p className="control-help">{t(
        "Use the filters to narrow this list. “View trend analysis” opens the monthly series and tests. “Use as A” or “Use as B” takes you to the comparison above with that record and its variable selected.",
        "Usa los filtros para acotar esta lista. «Ver análisis de la tendencia» abre la serie mensual y las pruebas. «Usar como A» o «Usar como B» te lleva a la comparación de arriba con esa serie y su variable seleccionadas.",
      )}</p>
      <div className="catalogue-filters">
        <label className="research-field">{t("Variable", "Variable")}<select value={variable} onChange={(e) => setVariable(e.target.value)}>
          <option value="">{t("All variables", "Todas las variables")}</option>
          {WITNESSES.map((w) => <option key={w.id} value={w.id}>{variableName(w.id, w.id, true)}</option>)}
        </select></label>
        <label className="research-field">{t("Area", "Área")}<select value={zone} onChange={(e) => setZone(e.target.value)}>
          <option value="">{t("All areas", "Todas las áreas")}</option>
          {manifest.zones.map((z) => <option key={z.id} value={z.id}>{zoneName(z.id, z.name)}</option>)}
        </select></label>
        <label className="research-field">{t("Evidence", "Evidencia")}<select value={verdict} onChange={(e) => setVerdict(e.target.value)}>
          <option value="">{t("All results", "Todos los resultados")}</option>
          {VERDICT_CATEGORIES.map((id) => <option key={id} value={id}>{verdictText(id)}</option>)}
        </select></label>
      </div>
      {matches.length === 0 && <p role="status">{t("No published cases match these filters.", "Ningún caso publicado coincide con estos filtros.")}</p>}
      <div className="catalogue-results">
        {matches.map((c) => <article key={c.id} className="catalogue-row">
          <div><button className="text-button" onClick={() => onCase(c.id)}>{option(c)} <span className="table-action">{t("View trend analysis →", "Ver análisis de la tendencia →")}</span></button>
            <p className="small muted">{signed(c.sen_per_decade)} {perDecade(c.units)} · {verdictText(c.verdict)} · {t("95% interval", "Intervalo del 95 %")} {interval(c.ci95)}</p></div>
          <EffectBar est={c.sen_per_decade} limits={c.ci95} />
          <div className="toggle" aria-label={option(c)}>
            <button type="button" aria-pressed={c.id === a.id} disabled={c.id === b.id || !variables.includes(c.variable)} onClick={() => setCatalogueCase(c, "A")}>{t("Use as A", "Usar como A")}</button>
            <button type="button" aria-pressed={c.id === b.id} disabled={c.id === a.id || !variables.includes(c.variable)} onClick={() => setCatalogueCase(c, "B")}>{t("Use as B", "Usar como B")}</button>
          </div>
        </article>)}
      </div>
    </section>
  </section>;
}
