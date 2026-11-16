// AI-assisted: Codex (OpenAI). One scientific record, progressively disclosed.
import { useLayoutEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import type { ChatContext, HoveredPoint } from "./chat-contract";
import { summarizeCase } from "./chat-summary";
import { TrendChart } from "./charts";
import { CaseReproduction } from "./CaseReproduction";
import { useJSON } from "./data";
import { Validation, hasExtractionCheck } from "./Validation";
import { ShareLink } from "./ShareLink";
import { useEvidence } from "./evidence";
import { useLocale, type Translation } from "./i18n";
import type { Level } from "./levels";
import type { CaseFile, CaseRef, CriterionKey, Manifest, PeriodGrid, Window } from "./types";

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

type InspectPoint = (point: Omit<HoveredPoint, "chart">) => void;

export function CasePlot({ cf, mode = "anomaly", simple = false, reference, window, onInspect }: {
  cf: CaseFile; mode?: "anomaly" | "value"; simple?: boolean; reference?: CaseFile; window?: Window; onInspect?: InspectPoint;
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
    <TrendChart series={cf.series} trend={cf.trend} mode={mode} units={units} simple={simple} reference={reference?.series} onInspect={onInspect}
      referenceLabel={reference?.zone.id === "Z5" ? t("Desert", "Desierto") : t("Reference", "Referencia")}
      tone={cf.witness === "greenness" ? "green" : cf.witness === "heat" ? "heat" : cf.witness === "water" ? "water" : "climate"} window={window} />
    <figcaption className="plot-legend small">
      <span><i className="plot-key" />{label}</span>
      {reference && <span><i className="plot-key dashed" />{zoneName(reference.zone.id, reference.zone.name)}</span>}
      {mode === "anomaly" && <span><i className="plot-key trend" />{t("Full-period trend", "Tendencia del periodo completo")}</span>}
      {missing > 0 && <span><i className="plot-key gap" />{t(`${missing} missing months`, `${missing} meses sin datos`)}</span>}
    </figcaption>
  </figure>;
}

function FieldComparison({ field, desert, onInspect }: { field: CaseRef; desert: CaseRef; onInspect: InspectPoint }) {
  const { t } = useLocale();
  const a = useJSON<CaseFile>(field.path), b = useJSON<CaseFile>(desert.path);
  return <div className="panel analysis-panel">
    <div className="panel-heading">
      <h3>{desert.zone === "Z5" ? t("Field and desert reference", "Campo y desierto de referencia") : t("Cropland and natural land", "Cultivos y terrenos naturales")}</h3>
      <p>{t("The same variable in two areas on one scale. Compare when the records move together and when they diverge.",
        "La misma variable en dos áreas y en la misma escala. Compara cuándo ambas series se mueven juntas y cuándo se separan.")}</p>
    </div>
    {a.error || b.error ? <p className="error" role="alert">{t("Could not load the study and reference records.", "No se pudieron cargar las series del área de estudio y de referencia.")}</p>
      : a.data && b.data ? <CasePlot cf={a.data} reference={b.data} mode="value" onInspect={onInspect} />
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
      <h3 id="case-tests-title" className="action-scroll-target" tabIndex={-1}>{t("Do the tests support the trend?", "¿Las pruebas respaldan la tendencia?")}</h3>
      <p>{t("Check whether the conclusion changes when the test accounts for dependence between months. All three use the same analysis series and a nominal threshold of p < 0.05.",
        "Comprueba si la conclusión cambia al tener en cuenta la dependencia entre meses. Las tres pruebas usan la misma serie de análisis y un umbral nominal de p < 0,05.")}</p>
    </div>
    <div className="test-grid">{calls.map(([name, p, assumption]) => <div className="research-note" key={name}>
      <strong>{name}</strong><span className="num">{pfull(p)}</span>
      <span className="small"><b>{p === null ? t("Not evaluated", "Sin evaluar") : p < 0.05 ? t("Significant", "Significativa") : t("Not significant", "No significativa")}</b> · {assumption}</span>
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
    <details open className="research-details">
      <summary>{t("Review the verdict criteria", "Revisar los criterios del veredicto")}</summary>
      <p className="small muted">{t("See which checks support the result and which limit the strength of the evidence.", "Consulta qué comprobaciones respaldan el resultado y cuáles limitan la fuerza de la evidencia.")}</p>
      <ul className="audit-list">
        {criteria.map(([key, text]) => <li key={key}><span>{t(...text)}</span><strong>{cf.criteria[key] === null
          ? t("Not evaluated", "Sin evaluar") : cf.criteria[key] ? t("Met", "Cumple") : t("Unmet", "No cumple")}</strong></li>)}
      </ul>
      <p className="small muted">{t("The bootstrap groups valid observations after dropping missing months. A block can span a calendar gap.",
        "El bootstrap agrupa las observaciones válidas tras excluir los meses sin datos. Un bloque puede abarcar un vacío en el calendario.")}</p>
    </details>
    <details open className="research-details">
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
      {tr.jackknife && <>
      <p className="control-help">{t("Exclude a year to see how much it influences the slope estimate.", "Excluye un año para ver cuánto influye en la pendiente estimada.")}</p>
      <div className="window-controls">
        <label className="research-field">{t("Year excluded", "Año excluido")}
          <select value={excludedYear} onChange={(e) => setExcludedYear(e.target.value)}>
            <option value="">{t("Choose a year", "Elige un año")}</option>
            {tr.jackknife.map((row) => <option key={row.year} value={row.year}>{row.year}</option>)}
          </select>
        </label>
        {fit && <p className="small" role="status">{t(`Without ${fit.year}, the estimate is`, `Sin ${fit.year}, la estimación es`)} <strong>{signed(fit.sen_per_decade)} {perDecade(cf.units)}</strong> ({pfull(fit.p_block_bootstrap)}, {t("block bootstrap", "bootstrap por bloques")}).</p>}
      </div></>}
    </details>
  </div>;
}

export function CaseFileView({ caseRef, level, manifest, href, comparison, chatContextRef, practice }: {
  caseRef: CaseRef; level: Level; manifest: Manifest; href: string; comparison?: { field: CaseRef; desert: CaseRef };
  chatContextRef: MutableRefObject<(() => ChatContext) | null>; practice?: ReactNode;
}) {
  const { t, signed, pfull, language } = useLocale();
  const { casePeriod, caseTitle, caseUnits, perDecade, zoneName, interval, verdictText, verdictSummary, dataKind, describes, resolution } = useEvidence();
  const { data: cf, error } = useJSON<CaseFile>(caseRef.path);
  const [mode, setMode] = useState<"anomaly" | "value">("anomaly");
  const { data: grid } = useJSON<PeriodGrid>(`periods/${caseRef.id}.json`);
  const [start, setStart] = useState<number>();
  const [end, setEnd] = useState<number>();
  const from = start ?? grid?.starts[0];
  const to = end ?? grid?.ends[grid.ends.length - 1];
  const extractionDetails = useRef<HTMLDetailsElement>(null);
  const reproductionDetails = useRef<HTMLDetailsElement>(null);
  const lastPoint = useRef<{ point: HoveredPoint; mode: ChatContext["chartMode"] }>();
  const explorer = level === "explorer", expert = level === "expert";
  const selectedPeriod = grid?.periods.find((period) => period.start === from && period.end === to);
  const fullRecord = !grid || (from === grid.starts[0] && to === grid.ends[grid.ends.length - 1]);
  const activeWindow = expert && !fullRecord && selectedPeriod?.sen_per_decade != null ? selectedPeriod : undefined;
  const referenceArea = comparison && zoneName(comparison.desert.zone, comparison.desert.zone_name);
  const showRaw = !explorer && cf?.kind === "case" && mode === "value";
  const caseChartVisible = !comparison || !explorer;
  const chartMode = showRaw || !caseChartVisible ? "Original values" : "Anomalies";

  useLayoutEffect(() => {
    if (error || !cf || cf.id !== caseRef.id) return;
    const read = (): ChatContext => {
      const last = lastPoint.current;
      const pointVisible = last?.point.chart === "field-desert" ? Boolean(comparison)
        : caseChartVisible && last?.mode === chartMode;
      return summarizeCase(cf, {
        userLevel: explorer ? "Explorer" : expert ? "Expert" : "Analyst",
        chartMode,
        sensitivityWindow: activeWindow ?? null,
        selectedPeriod,
        referenceArea,
        hoveredPoint: pointVisible ? last?.point : undefined,
        language,
      }, {
        studyArea: zoneName(cf.zone.id, cf.zone.name),
        nasaVariable: caseTitle(cf.variable, cf.zone.id, cf.label),
        unit: caseUnits(cf.units),
        slopeUnit: perDecade(cf.units),
      });
    };
    chatContextRef.current = read;
    return () => { if (chatContextRef.current === read) chatContextRef.current = null; };
  }, [activeWindow, caseChartVisible, caseRef.id, caseTitle, caseUnits, cf, chartMode, chatContextRef, comparison, error, expert, explorer, language, perDecade, referenceArea, selectedPeriod, zoneName]);
  if (error) return <p role="alert" className="error">{t("Could not load this case.", "No se pudo cargar este caso.")}</p>;
  if (!cf || cf.id !== caseRef.id) return <p className="loading" role="status">{t("Opening the case file…", "Abriendo el expediente…")}</p>;

  const tr = cf.trend;
  const [lower, upper] = tr.sen_ci95_block_bootstrap;
  const slope = tr.sen_per_decade;
  const direction = slope === null ? t("Unavailable", "No disponible")
    : slope === 0 ? t("Zero slope", "Pendiente cero")
      : slope > 0 ? t("Estimated increase", "Aumento estimado") : t("Estimated decrease", "Descenso estimado");
  const [definition, limit] = describes(cf);
  const title = caseTitle(cf.variable, cf.zone.id, cf.label);
  const disagreement = cf.classic_test_says_significant && cf.verdict === "inconclusive";
  const checkAvailable = !explorer && hasExtractionCheck(cf.id);

  function showDetails(details: HTMLDetailsElement | null) {
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
      </div>
      <div className="case-result">
        <div>
          <h3>{t("Full-period result", "Resultado del periodo completo")}</h3>
          <span className={`pill ${cf.verdict}`}>{verdictText(cf.verdict)}</span>
          <p>{verdictSummary(cf.verdict)}</p>
        </div>
        <div className="case-estimate">
          <span>{direction}</span>
          <strong className="num">{signed(slope)}</strong>
          {slope !== null && <span>{caseUnits(cf.units)} {t("per decade", "por década")}</span>}
        </div>
      </div>
      {explorer && disagreement && <p className="research-callout">{t("The classic test flags a change here. Accounting for similarities between months leaves the evidence inconclusive.",
        "La prueba clásica señala un cambio. Al considerar que los meses se parecen entre sí, la evidencia queda como no concluyente.")}</p>}
      {!explorer && lower !== null && upper !== null && <>
        <div className="slope-interval">
          <span>{t("95% interval for the slope", "Intervalo del 95 % para la pendiente")} <strong className="num">{interval(tr.sen_ci95_block_bootstrap)} {perDecade(cf.units)}</strong></span>
          <EffectBar est={slope} limits={tr.sen_ci95_block_bootstrap} />
        </div>
        <p className="control-help">{lower <= 0 && upper >= 0
          ? t("The interval includes zero. A constant long-term level remains compatible with these data under this method.", "El intervalo incluye el cero. Según este método, los datos también son compatibles con una pendiente de cero.")
          : t("The interval is entirely on one side of zero. The verdict also considers the statistical tests and robustness checks.", "El intervalo queda enteramente a un lado del cero. El veredicto también tiene en cuenta las pruebas estadísticas y las comprobaciones de robustez.")}</p>
      </>}
      {cf.verdict !== "confirmed" && tr.years_to_detect != null && tr.years_to_detect < 200 &&
        <p className="case-years">{t("Years to detect (Weatherhead et al., 1998)", "Años para detectar la tendencia (Weatherhead et al., 1998)")}: <strong>{Math.round(tr.years_to_detect)}</strong> · {t("Years in the record", "Años en la serie")}: {Math.round(cf.n / 12)}.</p>}
      <p className="case-limit">{limit}</p>
      <p className="case-source">
        <strong>{dataKind(cf)}</strong> · {cf.source.agency} {cf.source.product} {cf.source.version}
        {" · "}<a href={`https://doi.org/${cf.source.doi}`} target="_blank" rel="noreferrer">{t("View dataset DOI (new tab)", "Consultar DOI del conjunto de datos (nueva pestaña)")}</a>
      </p>
      <div className="case-mast-actions">
        {caseChartVisible && <button type="button" className="btn primary" onClick={() => {
          const chart = document.getElementById("case-chart-title");
          chart?.focus({ preventScroll: true });
          chart?.scrollIntoView({ block: "start" });
        }}>{t("Explore the monthly chart ↓", "Explorar el gráfico mensual ↓")}</button>}
        <ShareLink href={href} label={t("Copy analysis link", "Copiar enlace del análisis")} />
        {expert && <button type="button" className="btn research-secondary" onClick={() => showDetails(reproductionDetails.current)}>
          {t("Cite or download analysis data ↓", "Citar o descargar datos del análisis ↓")}
        </button>}
      </div>
    </section>
    {comparison && <FieldComparison {...comparison} onInspect={(point) => {
      lastPoint.current = { point: { ...point, chart: "field-desert" }, mode: "Original values" };
    }} />}
    {caseChartVisible && <section className="panel analysis-panel">
      <div className="analysis-toolbar">
        <div className="panel-heading">
          <h3 id="case-chart-title" className="action-scroll-target" tabIndex={-1}>{comparison ? (comparison.desert.zone === "Z5" ? t("Monthly standardized field–desert gap", "Brecha mensual estandarizada entre campo y desierto") : t("Monthly standardized cropland–natural land gap", "Brecha mensual estandarizada entre cultivo y terreno natural")) : t("Monthly data series", "Serie de datos mensuales")}</h3>
          {!explorer && <p>{t(`${cf.n_valid} of ${cf.n} valid months`, `${cf.n_valid} de ${cf.n} meses válidos`)} · {resolution(cf)}</p>}
        </div>
        {!explorer && !comparison && <div className="toggle" role="group" aria-label={t("Chart values", "Valores del gráfico")} aria-describedby="chart-mode-help">
          <button aria-pressed={!showRaw} onClick={() => setMode("anomaly")}>{t("Anomalies", "Anomalías")}</button>
          <button aria-pressed={showRaw} onClick={() => setMode("value")}>{t("Original values", "Valores originales")}</button>
        </div>}
      </div>
      <p className="control-help">{t(
        "The thin line connects one value per valid month. The years on the horizontal axis are reference marks. Hover over the chart to see the month and its value.",
        "La línea fina conecta un valor por cada mes válido. Los años del eje horizontal son marcas de referencia. Pasa el cursor sobre el gráfico para ver el mes y su valor.",
      )}</p>
      {!explorer && !comparison && <p className="control-help" id="chart-mode-help">{showRaw ? t(
        "The chart shows the original monthly values. Switch to Anomalies to see the long-term trend with the typical seasonal cycle removed.",
        "El gráfico muestra los valores mensuales originales. Cambia a Anomalías para ver la tendencia de largo plazo tras descontar el ciclo estacional típico.",
      ) : t(
        "Each point is the difference from the usual value for that calendar month. The dark line is the trend for the full period. Switch to Original values to see the original monthly series.",
        "Cada punto es la diferencia respecto al valor habitual de ese mes del calendario. La línea oscura muestra la tendencia del periodo completo. Cambia a Valores originales para ver la serie mensual original.",
      )}</p>}
      {comparison ? <p className="small muted">{t("Use this graph to track how the gap between cropland and its reference area changes after expressing both in standard deviations.",
        "Usa este gráfico para seguir cómo cambia la brecha entre el cultivo y su zona de referencia al expresar ambas series en desviaciones estándar.")}</p>
        : explorer && <p className="control-help">{t("Each point shows the difference from the average for that calendar month.", "Cada punto muestra la diferencia respecto al promedio de ese mes del calendario.")}</p>}
      <CasePlot cf={cf} mode={showRaw ? "value" : "anomaly"} simple={explorer} window={activeWindow} onInspect={(point) => {
        lastPoint.current = { point: { ...point, chart: "case" }, mode: chartMode };
      }} />
      {checkAvailable && <button className="text-button small" onClick={() => showDetails(extractionDetails.current)}>{t("Compare extracted values with NASA’s reference series ↓", "Comparar los valores extraídos con la serie de referencia de NASA ↓")}</button>}
      {grid && from !== undefined && to !== undefined && <div className="period-controls" aria-label={t("Choose the time period", "Elige el periodo")}>
        <p className="period-title">{t("Choose the time period", "Elige el periodo")}</p>
        <p className="control-help toggle-help">{t(
          `Change the start and end years to review the estimated trend and tests for a window of at least ${grid.min_years} years. The main verdict uses the full series.`,
          `Cambia los años de inicio y fin para revisar la tendencia estimada y las pruebas en un periodo de al menos ${grid.min_years} años. El veredicto principal usa la serie completa.`,
        )}</p>
        <label className="research-field">{t("From", "Desde")}
          <select value={from} onChange={(event) => {
            const next = Number(event.target.value);
            setStart(next);
            if (to - next + 1 < grid.min_years) setEnd(grid.ends.find((year) => year - next + 1 >= grid.min_years));
          }}>
            {grid.starts.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
        <label className="research-field">{t("To", "Hasta")}
          <select value={to} onChange={(event) => setEnd(Number(event.target.value))}>
            {grid.ends.filter((year) => year - from + 1 >= grid.min_years).map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
        {!fullRecord && <button type="button" className="btn research-secondary" onClick={() => { setStart(undefined); setEnd(undefined); }}>
          {t("Reset to full period", "Volver al periodo completo")}
        </button>}
        {selectedPeriod && !fullRecord && <p className="period-result" role="status">
          <strong>{from}–{to}</strong>: <strong className="num">{signed(selectedPeriod.sen_per_decade)} {perDecade(cf.units)}</strong>
          {" · "}{t("Block-bootstrap Mann–Kendall", "Mann–Kendall con bootstrap por bloques")} {pfull(selectedPeriod.p_block_bootstrap)} · {t("AR(1) regression", "Regresión AR(1)")} {pfull(selectedPeriod.p_arma)}
          {" · "}<b>{({
            both: t("both tests significant", "ambas pruebas significativas"),
            one: t("only one test significant", "solo una prueba significativa"),
            none: t("not significant", "no significativo"),
            insufficient: t("too few valid months", "meses válidos insuficientes"),
          })[selectedPeriod.result]}</b>.
        </p>}
      </div>}
    </section>}
    {practice}
    {checkAvailable && <Validation caseId={cf.id} detailsRef={extractionDetails} />}
    {!explorer && <TestResults cf={cf} />}
    {expert && <ExpertAudit cf={cf} />}
    {expert && <CaseReproduction key={cf.id} detailsRef={reproductionDetails} cf={cf} referenceId={caseRef.ref_zone} generatedAt={manifest.generated_at} title={title} />}
  </div>;
}
