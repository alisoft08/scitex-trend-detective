// AI-assisted: Codex (OpenAI). One scientific record, progressively disclosed.
import { useRef, useState } from "react";
import { TrendChart } from "./charts";
import { useJSON } from "./data";
import { Validation, hasExtractionCheck } from "./Validation";
import { ShareLink } from "./ShareLink";
import { downloadCase } from "./reproduction";
import { useEvidence } from "./evidence";
import { useLocale, type Translation } from "./i18n";
import type { Level } from "./levels";
import type { CaseFile, CaseRef, CriterionKey, Manifest, Window } from "./types";

const criteria: [CriterionKey, Translation][] = [
  ["C0", ["Valid observations in at least 80% of months and 15 years", "Observaciones válidas en al menos el 80 % de los meses y en 15 años"]],
  ["C1", ["Block-bootstrap and ARMA tests both have p < 0.05", "Bootstrap por bloques y ARMA obtienen p < 0,05"]],
  ["C2", ["The slope’s 95% interval excludes zero", "El intervalo del 95 % de la pendiente excluye el cero"]],
  ["C3", ["All nine windows agree in direction and at least seven are significant", "Las nueve ventanas coinciden en dirección y al menos siete son significativas"]],
  ["C4", ["No direction flip and at least 19 significant fits when leaving out a year", "La dirección se mantiene y al menos 19 ajustes son significativos al retirar un año"]],
  ["C5", ["Direction and significance hold after covariate adjustment", "La dirección y la significancia se mantienen tras ajustar por covariables"]],
];

export function EffectBar({ est, limits }: { est: number | null; limits: [number | null, number | null] }) {
  const { t, fmt } = useLocale();
  const { interval } = useEvidence();
  const [lo, hi] = limits;
  if (est === null || lo === null || hi === null) return null;
  const a = Math.min(0, lo, est), b = Math.max(0, hi, est);
  const pad = (b - a) * 0.12 || 1;
  const x = (v: number) => ((v - a + pad) / (b - a + 2 * pad)) * 100;
  return <span className="effect big" role="img" aria-label={t(
    `Estimated slope ${fmt(est)}. 95% interval ${interval(limits)}.`, `Pendiente estimada ${fmt(est)}. Intervalo del 95 % de ${interval(limits)}.`,
  )}>
    <span className="zero" style={{ left: `${x(0)}%` }} />
    <span className="ci" style={{ left: `${x(lo)}%`, width: `${Math.max(1, x(hi) - x(lo))}%` }} />
    <span className="pt" style={{ left: `${x(est)}%` }} />
    <span className="zero-l" style={{ left: `${x(0)}%` }}>0</span>
  </span>;
}

export function CasePlot({ cf, mode = "anomaly", simple = false, reference, window }: {
  cf: CaseFile; mode?: "anomaly" | "value"; simple?: boolean; reference?: CaseFile; window?: Window;
}) {
  const { t } = useLocale();
  const { caseUnits, zoneName } = useEvidence();
  const units = caseUnits(cf.units);
  const label = reference ? zoneName(cf.zone.id, cf.zone.name)
    : mode === "value" ? t("Monthly values", "Valores mensuales")
    : cf.kind === "contrast" ? t("Monthly standardized gap", "Brecha mensual estandarizada")
    : t("Monthly anomalies", "Anomalías mensuales");
  const missing = cf.n - cf.n_valid;
  return <figure className="case-plot">
    <TrendChart series={cf.series} trend={cf.trend} mode={mode} units={units} simple={simple} reference={reference?.series}
      tone={cf.witness === "greenness" ? "green" : cf.witness === "heat" ? "heat" : cf.witness === "water" ? "water" : "climate"} window={window} />
    <figcaption className="plot-legend small">
      <span><i className="plot-key" />{label}</span>
      {reference && <span><i className="plot-key dashed" />{zoneName("Z5")}</span>}
      {mode === "anomaly" && <span><i className="plot-key trend" />{t("Full-period trend", "Tendencia del periodo completo")}</span>}
      {missing > 0 && <span><i className="plot-key gap" />{t(`${missing} missing months`, `${missing} meses sin datos`)}</span>}
    </figcaption>
  </figure>;
}

function FieldComparison({ field, desert }: { field: CaseRef; desert: CaseRef }) {
  const { t } = useLocale();
  const a = useJSON<CaseFile>(field.path), b = useJSON<CaseFile>(desert.path);
  return <div className="panel analysis-panel">
    <div className="panel-heading">
      <h3>{t("Field and desert reference", "Campo y desierto de referencia")}</h3>
      <p>{t("The same variable in two areas on one scale. Compare when they move together and when their records diverge.",
        "La misma variable en dos áreas y en la misma escala. Compara cuándo ambas series se mueven juntas y cuándo se separan.")}</p>
    </div>
    {a.error || b.error ? <p className="error" role="alert">{t("Could not load the field and desert records.", "No se pudieron cargar las series del campo y el desierto.")}</p>
      : a.data && b.data ? <CasePlot cf={a.data} reference={b.data} mode="value" />
      : <p className="loading">{t("Loading the two records…", "Cargando las dos series…")}</p>}
  </div>;
}

function TestResults({ cf }: { cf: CaseFile }) {
  const { t, pfull } = useLocale();
  const tr = cf.trend;
  const calls = [
    [t("Classic Mann–Kendall", "Mann–Kendall clásico"), tr.p_mk_classic, t("Assumes independent observations", "Supone que las observaciones son independientes")],
    [t("Block-bootstrap Mann–Kendall", "Mann–Kendall con bootstrap por bloques"), tr.p_block_bootstrap,
      t(`Resamples blocks of ${tr.block_length} valid observations`, `Remuestrea bloques de ${tr.block_length} observaciones válidas`)],
    [t("ARMA-error regression", "Regresión con errores ARMA"), tr.p_arma, t("Models dependence between observations", "Modela la dependencia entre observaciones")],
  ] as const;
  const disagree = cf.classic_test_says_significant && cf.verdict === "inconclusive";
  return <section className="panel analysis-panel">
    <div className="panel-heading">
      <h3>{t("Same series, three tests", "La misma serie, tres pruebas")}</h3>
      <p>{t("Check whether the conclusion changes when the test accounts for dependence between months. All three use the same analysis series and a nominal threshold of p < 0.05.",
        "Comprueba si la conclusión cambia al tener en cuenta la dependencia entre meses. Las tres pruebas usan la misma serie de análisis y un umbral nominal de p < 0,05.")}</p>
    </div>
    <div className="test-grid">{calls.map(([name, p, assumption]) => <div className="research-note" key={name}>
      <strong>{name}</strong><span className="num">{pfull(p)}</span><span className="small">{assumption}</span>
    </div>)}</div>
    {disagree && <p className="research-callout">{t("The classic test calls this series significant. The combined analysis leaves the trend inconclusive.",
      "La prueba clásica considera significativa la tendencia. El análisis combinado deja el resultado como no concluyente.")}</p>}
  </section>;
}

function ExpertAudit({ cf }: { cf: CaseFile }) {
  const { t, fmt, signed, pfull } = useLocale();
  const { perDecade, covariate } = useEvidence();
  const [excludedYear, setExcludedYear] = useState("");
  const tr = cf.trend;
  const fit = tr.jackknife?.find((row) => String(row.year) === excludedYear);
  return <div className="research-stack">
    <details className="research-details">
      <summary>{t("Review the verdict criteria", "Revisar los criterios del veredicto")}</summary>
      <p className="small muted">{t("See which checks support the result and which limit the strength of the evidence.", "Consulta qué comprobaciones respaldan el resultado y cuáles limitan la fuerza de la evidencia.")}</p>
      <ul className="audit-list">
        {criteria.map(([key, text]) => <li key={key}><span>{t(...text)}</span><strong>{cf.criteria[key] === null
          ? t("Not evaluated", "Sin evaluar") : cf.criteria[key] ? t("Met", "Cumple") : t("Unmet", "No cumple")}</strong></li>)}
      </ul>
      <p className="small muted">{t("The bootstrap groups valid observations after dropping missing months. A block can span a calendar gap.",
        "El bootstrap agrupa las observaciones válidas tras excluir los meses sin datos. Un bloque puede abarcar un vacío en el calendario.")}</p>
    </details>
    <details className="research-details">
      <summary>{t("Covariates and leave-one-year-out results", "Covariables y resultados al retirar un año")}</summary>
      <p className="small muted">{t("Check how the estimate changes after statistical adjustment or when one year is omitted.", "Comprueba cuánto cambia la estimación al hacer un ajuste estadístico o al omitir un año.")}</p>
      <dl className="research-facts">
        <div><dt>{t("Error model selected by AIC", "Modelo de errores elegido por AIC")}</dt><dd>{tr.arma_order ? `ARMA(${tr.arma_order[0]}, ${tr.arma_order[2]})` : t("Unavailable", "No disponible")}</dd></div>
        <div><dt>{t("First autoregressive coefficient", "Primer coeficiente autorregresivo")}</dt><dd>{fmt(tr.phi)}</dd></div>
        <div><dt>{t("Adjusted slope", "Pendiente ajustada")}</dt><dd>{tr.beta_with_confounders_per_decade === null ? t("Unavailable", "No disponible") : `${signed(tr.beta_with_confounders_per_decade)} ${perDecade(cf.units)} (${pfull(tr.p_with_confounders)})`}</dd></div>
        <div><dt>{t("Covariates in the model", "Covariables del modelo")}</dt><dd>{tr.confounders.map(covariate).join("; ") || t("None", "Ninguna")}</dd></div>
        <div><dt>{t("Leave-one-year-out fits", "Ajustes al retirar un año")}</dt><dd>{t(
          `${tr.jackknife_significant} of ${tr.jackknife_n} significant in the full-period direction.`,
          `${tr.jackknife_significant} de ${tr.jackknife_n} significativos en la dirección del periodo completo.`,
        )} {tr.jackknife_flips_sign ? t("At least one direction flip.", "La dirección se invirtió al menos una vez.") : t("Direction held in every fit.", "La dirección se mantuvo en todos los ajustes.")}</dd></div>
      </dl>
      {tr.jackknife && <div className="window-controls">
        <label className="research-field">{t("Year excluded", "Año excluido")}
          <select value={excludedYear} onChange={(e) => setExcludedYear(e.target.value)}>
            <option value="">{t("Choose a year", "Elige un año")}</option>
            {tr.jackknife.map((row) => <option key={row.year} value={row.year}>{row.year}</option>)}
          </select>
        </label>
        {fit && <p className="small" role="status">{t(`Without ${fit.year}, the estimate is`, `Sin ${fit.year}, la estimación es`)} <strong>{signed(fit.sen_per_decade)} {perDecade(cf.units)}</strong> ({pfull(fit.p_block_bootstrap)}, {t("block bootstrap", "bootstrap por bloques")}).</p>}
      </div>}
    </details>
  </div>;
}

export function CaseFileView({ caseRef, level, manifest, href, comparison }: {
  caseRef: CaseRef; level: Level; manifest: Manifest; href: string; comparison?: { field: CaseRef; desert: CaseRef };
}) {
  const { t, signed, pfull, language } = useLocale();
  const { casePeriod, caseTitle, caseUnits, perDecade, zoneName, interval, verdictText, verdictSummary, dataKind, describes, resolution, mask } = useEvidence();
  const { data: cf, error } = useJSON<CaseFile>(caseRef.path);
  const [mode, setMode] = useState<"anomaly" | "value">("anomaly");
  const [periodIndex, setPeriodIndex] = useState(-1);
  const [exportState, setExportState] = useState<"preparing" | "ready" | "error" | null>(null);
  const extractionDetails = useRef<HTMLDetailsElement>(null);
  if (error) return <p role="alert" className="error">{t("Could not load this case.", "No se pudo cargar este caso.")}</p>;
  if (!cf || cf.id !== caseRef.id) return <p className="loading" role="status">{t("Opening the case file…", "Abriendo el expediente…")}</p>;

  const explorer = level === "explorer", expert = level === "expert";
  const tr = cf.trend;
  const [definition, limit] = describes(cf);
  const title = caseTitle(cf.variable, cf.zone.id, cf.label);
  const activeWindow = expert ? tr.windows[periodIndex] : undefined;
  const showRaw = !explorer && cf.kind === "case" && mode === "value";
  const disagreement = cf.classic_test_says_significant && cf.verdict === "inconclusive";
  const checkAvailable = !explorer && hasExtractionCheck(cf.id);

  function showExtraction() {
    const details = extractionDetails.current;
    if (!details) return;
    details.open = true;
    details.scrollIntoView({ block: "start" });
    details.querySelector("summary")?.focus({ preventScroll: true });
  }

  return <div className="research-stack">
    <section className="panel case-overview">
      <div className="case-mast">
        <div>
          <p className="eyebrow">{zoneName(cf.zone.id, cf.zone.name)} · {casePeriod(cf.period)}</p>
          <h2>{title}</h2>
          <p>{definition}</p>
        </div>
        <ShareLink href={href} />
      </div>
      <div className="case-result">
        <div><span className={`pill ${cf.verdict}`}>{verdictText(cf.verdict)}</span><p>{verdictSummary(cf.verdict)}</p></div>
        <div className="case-estimate"><strong className="num">{signed(tr.sen_per_decade)}</strong><span>{caseUnits(cf.units)} {t("per decade", "por década")}</span></div>
      </div>
      {explorer && disagreement && <p className="research-callout">{t("The classic test flags a change here. Accounting for similarities between months leaves the evidence inconclusive.",
        "La prueba clásica señala un cambio. Al considerar que los meses se parecen entre sí, la evidencia queda como no concluyente.")}</p>}
      {!explorer && <div className="slope-interval">
        <span>{t("95% interval for the slope", "Intervalo del 95 % para la pendiente")} <strong className="num">{interval(tr.sen_ci95_block_bootstrap)}</strong></span>
        <EffectBar est={tr.sen_per_decade} limits={tr.sen_ci95_block_bootstrap} />
      </div>}
      <p className="case-limit">{limit}</p>
      <p className="case-source">
        <strong>{dataKind(cf)}</strong> · {cf.source.agency} {cf.source.product} {cf.source.version}
        {" · "}<a href={`https://doi.org/${cf.source.doi}`} target="_blank" rel="noreferrer">{t("Product source", "Fuente del producto")}</a>
      </p>
    </section>
    {comparison && <FieldComparison {...comparison} />}
    {(!comparison || !explorer) && <section className="panel analysis-panel">
      <div className="analysis-toolbar">
        <div className="panel-heading">
          <h3>{comparison ? t("Standardized field–desert gap", "Brecha estandarizada entre campo y desierto") : t("Monthly record", "Serie mensual")}</h3>
          {!explorer && <p>{t(`${cf.n_valid} of ${cf.n} valid months`, `${cf.n_valid} de ${cf.n} meses válidos`)} · {resolution(cf)}</p>}
        </div>
        {!explorer && !comparison && <div className="toggle" role="group" aria-label={t("Chart values", "Valores del gráfico")}>
          <button aria-pressed={!showRaw} onClick={() => setMode("anomaly")}>{t("Anomalies", "Anomalías")}</button>
          <button aria-pressed={showRaw} onClick={() => setMode("value")}>{t("Original values", "Valores originales")}</button>
        </div>}
      </div>
      {comparison ? <p className="small muted">{t("Use this graph to track how the gap between the field and the desert changes after expressing both in standard deviations.",
        "Usa este gráfico para seguir cómo cambia la brecha entre el campo y el desierto al expresar ambas series en desviaciones estándar.")}</p>
        : <div className="research-note chart-reading">
          <strong>{t("How to read this chart", "Cómo leer este gráfico")}</strong>
          <p className="small">{explorer ? t("Each point shows how far that month was from the average for the same calendar month. This helps you see longer-term changes through the seasons.",
            "Cada punto muestra cuánto se apartó ese mes del promedio del mismo mes calendario. Así puedes ver los cambios de largo plazo entre las estaciones.")
            : t("These are two views of the same NASA series extracted by Oasis Paradox. Original values retain the measured or estimated levels. Anomalies subtract the average for each calendar month to reduce the seasonal cycle and estimate the long-term trend.",
              "Son dos vistas de la misma serie de NASA extraída por Oasis Paradox. Los valores originales conservan los niveles observados o estimados. Las anomalías restan el promedio de cada mes calendario para reducir el ciclo estacional y estimar la tendencia de largo plazo.")}</p>
          {checkAvailable && <button className="text-button small" onClick={showExtraction}>{t("See how our extraction compares with NASA →", "Ver el cotejo de nuestra extracción con NASA →")}</button>}
        </div>}
      <CasePlot cf={cf} mode={showRaw ? "value" : "anomaly"} simple={explorer} window={activeWindow} />
      {expert && tr.windows.length > 0 && <div className="window-controls">
        <label className="research-field">{t("Sensitivity window", "Ventana de sensibilidad")}
          <select value={periodIndex} onChange={(e) => setPeriodIndex(Number(e.target.value))}>
            <option value={-1}>{t("Full record · principal result", "Serie completa · resultado principal")}</option>
            {tr.windows.map((w, i) => <option key={`${w.start}-${w.end}`} value={i}>{w.start}–{w.end}</option>)}
          </select>
        </label>
        {activeWindow && <p className="small" role="status">{t("Shaded period", "Periodo sombreado")} · <strong>{signed(activeWindow.sen_per_decade)} {perDecade(cf.units)}</strong> ({pfull(activeWindow.p_block_bootstrap)}, {t("block bootstrap", "bootstrap por bloques")}). {t("The verdict above uses the full record.", "El veredicto de arriba usa la serie completa.")}</p>}
      </div>}
    </section>}
    {checkAvailable && <Validation caseId={cf.id} detailsRef={extractionDetails} />}
    {!explorer && <TestResults cf={cf} />}
    {expert && <>
      <ExpertAudit cf={cf} />
      <details className="research-details">
        <summary>{t("Study area and mask", "Área de estudio y máscara")}</summary>
        <p>{mask(cf.zone.id)}</p>
        {comparison && <p>{mask("Z5")} {t("Alternate masks require a new analysis.", "Las máscaras alternativas requieren un nuevo análisis.")}</p>}
      </details>
    </>}
    {expert && <details className="research-details">
      <summary>{t("Reproduce this result", "Reproducir este resultado")}</summary>
      <p>{t("Download the published case, original analysis inputs, geographic mask rules, engine settings and Python runner.",
        "Descarga el caso publicado, los datos de entrada, las reglas de las máscaras geográficas, la configuración del motor y el programa en Python.")}</p>
      <button className="btn primary" disabled={exportState === "preparing"} onClick={() => {
        setExportState("preparing");
        void downloadCase(cf, { generatedAt: manifest.generated_at, language, title }).then(() => setExportState("ready"), () => setExportState("error"));
      }}>{t("Download evidence ZIP", "Descargar ZIP de evidencias")}</button>
      {exportState && <p className="small" role="status">{exportState === "preparing" ? t("Preparing…", "Preparando…") : exportState === "ready"
        ? t("Download ready.", "Descarga lista.") : t("Export failed. Try again.", "No se pudo exportar. Inténtalo de nuevo.")}</p>}
    </details>}
  </div>;
}
