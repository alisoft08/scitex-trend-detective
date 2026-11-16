// AI-assisted: Codex (OpenAI). Compare aligned extractions of the same NASA product.
import type { Ref } from "react";
import { useJSON } from "./data";
import { useEvidence } from "./evidence";
import { useLocale, type Translation } from "./i18n";

const EXTRACTIONS: Record<string, { id: string; coverage: Translation }> = {
  Z2_ndvi: {
    id: "ndvi_Z2",
    coverage: ["The check uses MOD13Q1 v6.1 over Villacurí. Cropland masking and monthly maxima were recomputed from the AppEEARS files.",
      "El cotejo usa MOD13Q1 v6.1 sobre Villacurí. La máscara agrícola y los máximos mensuales se volvieron a calcular a partir de los archivos de AppEEARS."],
  },
  Z4_precip: {
    id: "precip_Z4",
    coverage: ["Both extractions use monthly IMERG V07 in the Ica basin above 2,500 m. The comparison weights each 0.1° cell by its overlap with the study area.",
      "Ambas extracciones usan IMERG V07 mensual en la cuenca de Ica por encima de 2.500 m. El cotejo pondera cada celda de 0,1° por su área dentro de la zona de estudio."],
  },
  ZW_gws: {
    id: "gws_ZW",
    coverage: ["The check averages daily GLDAS 2.2 files over the study area and compares January and July of each year from 2004 to 2024.",
      "El cotejo promedia archivos diarios de GLDAS 2.2 sobre el área de estudio y compara enero y julio de cada año de 2004 a 2024."],
  },
};
export const hasExtractionCheck = (caseId: string) => Object.prototype.hasOwnProperty.call(EXTRACTIONS, caseId);

interface Pair {
  id: string;
  units: string;
  tool: string;
  tool_url: string;
  n: number;
  pearson_r: number;
  bias: number;
  rmse: number;
  sen_ours_per_decade: number;
  sen_nasa_per_decade: number;
  series: { date: string; ours: number; nasa: number }[];
}

function Overlay({ pair }: { pair: Pair }) {
  const { t } = useLocale();
  const width = 420, height = 120;
  const month = (date: string) => Number(date.slice(0, 4)) + (Number(date.slice(5, 7)) - 1) / 12;
  const values = pair.series.flatMap(({ ours, nasa }) => [ours, nasa]);
  const low = Math.min(...values), high = Math.max(...values);
  const x = (year: number) => 6 + ((year - 2004) / 21) * (width - 12);
  const y = (value: number) => 6 + (1 - (value - low) / (high - low || 1)) * (height - 22);
  const sparse = pair.n < 100;
  const path = (route: "ours" | "nasa") => pair.series.map((sample, i) =>
    `${i && month(sample.date) - month(pair.series[i - 1].date) < 0.09 ? "L" : "M"}${x(month(sample.date)).toFixed(1)},${y(sample[route]).toFixed(1)}`).join("");
  return <svg className="val-chart" viewBox={`0 0 ${width} ${height}`} role="img"
    aria-label={t(`Oasis Paradox and ${pair.tool} extraction, ${pair.n} matched months`, `Extracciones de Oasis Paradox y ${pair.tool}, ${pair.n} meses en común`)}>
    {!sparse && <path d={path("nasa")} className="v-nasa" />}
    {!sparse && <path d={path("ours")} className="v-ours" />}
    {sparse && pair.series.map((sample) => {
      const dateX = x(month(sample.date));
      return <g key={sample.date}>
        <line x1={dateX} x2={dateX} y1={y(sample.ours)} y2={y(sample.nasa)} className="v-link" />
        <circle cx={dateX} cy={y(sample.nasa)} r={3.4} className="v-nasa-dot" />
        <circle cx={dateX} cy={y(sample.ours)} r={1.8} className="v-ours-dot" />
      </g>;
    })}
    {[2004, 2014, 2024].map((year) => <text key={year} x={x(year)} y={height - 3} textAnchor={year === 2004 ? "start" : "middle"}>{year}</text>)}
  </svg>;
}

export function Validation({ caseId, detailsRef }: { caseId: string; detailsRef: Ref<HTMLDetailsElement> }) {
  const { t, fmt, signed, fixed, signedFixed } = useLocale();
  const { caseUnits, perDecade } = useEvidence();
  const check = hasExtractionCheck(caseId) ? EXTRACTIONS[caseId] : undefined;
  const { data, error } = useJSON<{ pairs: Pair[] }>(check ? "validation.json" : null);
  if (!check) return null;
  const pair = data?.pairs.find((p) => p.id === check.id);
  return <details open className="research-details extraction-check action-scroll-target" ref={detailsRef}>
    <summary>{t("Check the extraction against NASA", "Cotejar la extracción con NASA")}</summary>
    {error && <p className="error" role="alert">{t("Could not load the extraction check.", "No se pudo cargar el cotejo de extracciones.")}</p>}
    {!error && !pair && <p className="small muted" role="status">{t("Loading the extraction check…", "Cargando el cotejo de extracciones…")}</p>}
    {pair && <>
      <p>{t("Compare the original values for the same product and the same months. The external series comes from a NASA tool or archive. Our series comes from the Oasis Paradox extraction.",
        "Compara los valores originales del mismo producto y de los mismos meses. La serie externa procede de una herramienta o archivo de NASA. La serie propia procede de la extracción de Oasis Paradox.")}</p>
      <div className="extraction-values">
        <div className="research-note"><span className="extraction-label"><i className="extraction-key ours" />{t("Our extraction", "Extracción propia")}</span>
          <strong>Oasis Paradox</strong><span className="num">{signedFixed(pair.sen_ours_per_decade, 4)} {perDecade(pair.units)}</span></div>
        <div className="research-note"><span className="extraction-label"><i className="extraction-key external" />{t("External extraction", "Extracción externa")}</span>
          <strong><a href={pair.tool_url} target="_blank" rel="noreferrer">{pair.tool}</a></strong><span className="num">{signedFixed(pair.sen_nasa_per_decade, 4)} {perDecade(pair.units)}</span></div>
        <div className="research-note"><span>{t("Difference in slope", "Diferencia de pendiente")}</span>
          <strong className="num">{signedFixed(pair.sen_nasa_per_decade - pair.sen_ours_per_decade, 4)} {perDecade(pair.units)}</strong>
          <span className="small">{t("External minus ours", "Externa menos propia")}</span></div>
      </div>
      <p className="small muted">{t("Each slope is the Sen estimate for the matched original values. A gap shows how much the estimated trend differs between extractions. Check coverage, masks and aggregation before attributing the gap to an error.",
        "Cada pendiente es la estimación de Sen para los valores originales coincidentes. La brecha indica cuánto difiere la tendencia estimada entre extracciones. Revisa la cobertura, las máscaras y la agregación antes de atribuirla a un error.")}</p>
      <figure className="extraction-figure">
        <Overlay pair={pair} />
        <figcaption className="small muted">{t(`Matched original values · ${pair.n} months · ${caseUnits(pair.units)}`, `Valores originales coincidentes · ${pair.n} meses · ${caseUnits(pair.units)}`)}</figcaption>
      </figure>
      <dl className="research-facts">
        <div><dt>{t("Pearson correlation", "Correlación de Pearson")}</dt><dd>{pair.pearson_r === 1 ? t("≈1 (rounded)", "≈1 (redondeado)") : fixed(pair.pearson_r, 4)}</dd></div>
        <div><dt>{t("Mean difference (external minus ours)", "Diferencia media (externa menos propia)")}</dt><dd>{signed(pair.bias)} {caseUnits(pair.units)}</dd></div>
        <div><dt>{t("Root mean square difference", "Diferencia cuadrática media (raíz)")}</dt><dd>{fmt(pair.rmse)} {caseUnits(pair.units)}</dd></div>
      </dl>
      <p className="small muted">{t(...check.coverage)}</p>
      <p className="small muted">{t("The case verdict comes from the separate analysis of seasonal anomalies.",
        "El veredicto del caso se obtiene del análisis separado de las anomalías estacionales.")}</p>
    </>}
  </details>;
}
