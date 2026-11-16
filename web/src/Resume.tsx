// AI-assisted: Codex (OpenAI). A concise overview using the published monthly records and trends.
import { TrendChart } from "./charts";
import { useJSON } from "./data";
import { useEvidence } from "./evidence";
import { useLocale } from "./i18n";
import { SUMMARY_VARIABLES, summaryRecords, summaryRegion } from "./resume-data";
import type { CaseFile, CaseRef, Manifest } from "./types";

function SummaryChart({ record, variable, onCase }: { record?: CaseRef; variable: string; onCase: (id: string) => void }) {
  const { t } = useLocale();
  const e = useEvidence();
  const { data, error } = useJSON<CaseFile>(record?.path ?? null);
  return <article className="panel resume-chart">
    <header>
      <div><h2>{e.variableName(variable, variable, true)}</h2>
        <p className="small muted">{record ? e.zoneName(record.zone, record.zone_name) : t("No published record for this area", "Sin serie publicada para esta zona")}</p></div>
      {record && <button className="resume-detail" onClick={() => onCase(record.id)} aria-label={t(`Analyze ${record.label}`, `Analizar ${e.variableName(variable)}`)}>{t("Analyze →", "Analizar →")}</button>}
    </header>
    {error ? <p className="error" role="alert">{t("This chart could not be loaded. Reload to try again.", "No se pudo cargar este gráfico. Recarga para intentarlo de nuevo.")}</p>
      : !record ? <p className="resume-placeholder">{t("No data available", "Datos no disponibles")}</p>
      : !data ? <p className="resume-placeholder" role="status">{t("Loading the record…", "Cargando la serie…")}</p>
      : <>
        <TrendChart series={data.series} trend={data.trend} units={e.caseUnits(data.units)} mode="anomaly"
          tone={data.witness === "greenness" ? "green" : data.witness} height={270} simple connectGaps />
        <footer className="resume-chart-footer"><span>{data.source.product} · {e.casePeriod(data.period)}</span>
          <span className={`resume-chart-key ${data.witness}`}>{t("Monthly anomaly", "Anomalía mensual")} <i /> {t("Trend", "Tendencia")}</span></footer>
      </>}
  </article>;
}

export function Resume({ m, selected, onCase }: { m: Manifest; selected: CaseRef; onCase: (id: string) => void }) {
  const { t, signed } = useLocale();
  const e = useEvidence();
  const records = summaryRecords(m, selected);
  const region = summaryRegion(m, selected.zone);
  return <section className="wrap wide research-page resume-page" aria-labelledby="resume-title">
    <header className="resume-heading">
      <div className="research-heading"><p className="eyebrow">{t("Your area at a glance", "Tu zona de un vistazo")}</p>
        <h1 id="resume-title">{e.zoneName(selected.zone, selected.zone_name)}</h1>
        <p>{t("Four signals to understand how water, vegetation and rainfall are changing.", "Cuatro señales para entender cómo cambian el agua, la vegetación y la lluvia.")}</p></div>
      <div className="resume-period"><span className="eyebrow">{t("Full record", "Periodo completo")}</span><strong>{m.period.replace("/", " → ")}</strong>
        <a href="#atlas">{t("Change region ↗", "Cambiar región ↗")}</a></div>
    </header>
    <div className="resume-indicators" aria-label={t("Trend indicators per decade", "Indicadores de tendencia por década")}>
      {records.map((record, index) => <article className={`resume-indicator resume-indicator-${index}`} key={SUMMARY_VARIABLES[index]}>
        <h2>{e.variableName(SUMMARY_VARIABLES[index], SUMMARY_VARIABLES[index], true)}</h2>
        <div className="resume-value">{record?.sen_per_decade != null ? signed(record.sen_per_decade) : "—"}</div>
        <p className="resume-unit">{record ? e.perDecade(record.units) : t("No published data", "Sin datos publicados")}</p>
        {record && <><span className={`pill ${record.verdict}`}>{e.verdictText(record.verdict)}</span>
          <p className="resume-scope">{e.zoneName(record.zone, record.zone_name)}</p></>}
      </article>)}
    </div>
    <div className="resume-chart-grid">
      {SUMMARY_VARIABLES.map((variable, index) => <SummaryChart key={`${selected.zone}:${variable}`} variable={variable} record={records[index]} onCase={onCase} />)}
    </div>
    <p className="resume-footnote">{t(
      "GRACE measures total water at regional scale. GLDAS estimates groundwater and assimilates GRACE data. Each chart identifies its study area; the indicators show the published full-period trends.",
      "GRACE mide el agua total a escala regional. GLDAS estima el agua subterránea e integra datos de GRACE. Cada gráfico indica su área de estudio; los indicadores muestran las tendencias publicadas del periodo completo.",
    )} {region?.id === "ZW" && t("In Ica, vegetation and rainfall records cover different local study areas.", "En Ica, las series de vegetación y precipitación cubren distintas áreas locales.")}</p>
  </section>;
}
