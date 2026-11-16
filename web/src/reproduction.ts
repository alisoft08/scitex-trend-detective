/// <reference types="vite/client" />
// AI-assisted: Codex (OpenAI). Export the published record and its analysis inputs.
import { strToU8, zipSync } from "fflate";
import series from "../../data/processed/series_long.csv?raw";
import climate from "../../data/processed/climate_indices.csv?raw";
import zones from "../../config/zones.geojson?raw";
import comparisonZones from "../../config/comparison_zones.geojson?raw";
import config from "../../config/verdict.yaml?raw";
import trend from "../../engine/trend.py?raw";
import verdict from "../../engine/verdict.py?raw";
import engineInit from "../../engine/__init__.py?raw";
import runner from "../../scripts/build_web_data.py?raw";
import zoneProcessing from "../../pipeline/zones.py?raw";
import sources from "../../REFERENCES.md?raw";
import license from "../../LICENSE?raw";
import { translate, type Language } from "./i18n";
import type { CaseFile, ExploratoryPeriod } from "./types";
import type { caseGeometry } from "./case-research";

const inputFiles = {
  "data/processed/series_long.csv": series,
  "data/processed/climate_indices.csv": climate,
  "config/zones.geojson": zones,
  "config/comparison_zones.geojson": comparisonZones,
  "config/verdict.yaml": config,
  "engine/trend.py": trend,
  "engine/verdict.py": verdict,
  "engine/__init__.py": engineInit,
  "scripts/build_web_data.py": runner,
  "pipeline/zones.py": zoneProcessing,
  "REFERENCES.md": sources,
  "LICENSE": license,
  "requirements.txt": "numpy==2.5.4\npandas==3.1.1\nscipy==1.18.1\nstatsmodels==0.15.0\npymannkendall==1.4.3\npyyaml==6.0.3\n",
};

export async function downloadCase(cf: CaseFile, options: {
  generatedAt: string; language: Language; title: string; citation: string; geometry: ReturnType<typeof caseGeometry>;
  exploratory?: { period: ExploratoryPeriod; method?: string; citation: string };
}) {
  const { generatedAt, language, title, citation, geometry, exploratory } = options;
  const t = (english: string, spanish: string) => translate(language, english, spanish);
  const { id, source } = cf;
  const record = [
    "date,value,analysis_anomaly,valid",
    ...cf.series.map((row) => [row.date, row.value ?? "", row.anomaly ?? "", row.valid].join(",")),
  ].join("\n");
  const readme = [
    t(`# Oasis Paradox case ${id}`, `# Caso ${id} de Oasis Paradox`),
    "",
    t(`Published case: ${title}`, `Caso publicado: ${title}`),
    t(`Input source: ${source.agency} ${source.product} ${source.version} (https://doi.org/${source.doi})`,
      `Fuente de datos: ${source.agency} ${source.product} ${source.version} (https://doi.org/${source.doi})`),
    t(`Period: ${cf.period}. Valid months: ${cf.n_valid}/${cf.n}. Data bundle timestamp: ${generatedAt}.`,
      `Periodo: ${cf.period}. Meses válidos: ${cf.n_valid}/${cf.n}. Fecha del paquete de datos: ${generatedAt}.`),
    "",
    t("published/case.json contains the published estimate, interval, verdict, sensitivity and provenance.",
      "published/case.json contiene la estimación, el intervalo, el veredicto, la sensibilidad y la procedencia publicados."),
    t("published/chart.csv contains the values used in the browser. Blank values mark missing months.",
      "published/chart.csv contiene los valores utilizados en el navegador. Las celdas vacías indican meses sin datos."),
    t("published/citation.txt contains the case citation; published/study-area.geojson contains the analysis polygon and any reference polygon.",
      "published/citation.txt contiene la cita del caso; published/study-area.geojson contiene el polígono de análisis y, cuando corresponde, el de referencia."),
    ...(exploratory ? [t(
      `Exploratory analysis ${exploratory.period.start}–${exploratory.period.end}: exploratory/period.json contains the selected estimate and test results, and exploratory/citation.txt contains its citation. The reproduction command below applies to the published full period.`,
      `Análisis exploratorio ${exploratory.period.start}–${exploratory.period.end}: exploratory/period.json contiene la estimación y las pruebas del periodo seleccionado y exploratory/citation.txt contiene su cita. El comando de reproducción de abajo corresponde al periodo completo publicado.`,
    )] : []),
    t("data/processed/series_long.csv and climate_indices.csv contain the analysis inputs used by the runner.",
      "data/processed/series_long.csv y climate_indices.csv contienen los datos de entrada del análisis."),
    t("config/zones.geojson contains study geometry and mask descriptions. pipeline/zones.py records the pixel mask rules.",
      "config/zones.geojson contiene las geometrías de estudio y las descripciones de las máscaras. pipeline/zones.py contiene las reglas de selección de píxeles."),
    t("config/verdict.yaml defines the verdict thresholds and settings. engine/ contains the statistical implementation.",
      "config/verdict.yaml define los umbrales y la configuración del veredicto. engine/ contiene la implementación estadística."),
    "",
    t("From the extracted folder, install the statistical dependencies in a Python environment:",
      "Desde la carpeta extraída, instala las dependencias estadísticas en un entorno de Python."),
    "    python -m pip install -r requirements.txt",
    t("Then regenerate the selected case JSON from the archived analysis inputs:",
      "Luego regenera el JSON del caso seleccionado a partir de los datos archivados."),
    `    python scripts/build_web_data.py ${id} > reproduced.json`,
    t("Compare reproduced.json with published/case.json. Numerical ARMA fits can vary slightly by environment. The published slope, interval and verdict provide reference values.",
      "Compara reproduced.json con published/case.json. Los ajustes numéricos de ARMA pueden variar ligeramente según el entorno. La pendiente, el intervalo y el veredicto publicados sirven de referencia."),
    t("Re-extracting the NASA observations is a separate step. Product versions and primary sources are in REFERENCES.md.",
      "Volver a extraer las observaciones de NASA es un paso aparte. Las versiones y fuentes primarias están en REFERENCES.md."),
    "",
  ].join("\n");
  const inputs = {
    ...inputFiles,
    "README.md": readme,
    "published/chart.csv": record,
    "published/case.json": JSON.stringify(cf, null, 2),
    "published/citation.txt": citation + "\n",
    "published/study-area.geojson": JSON.stringify(geometry, null, 2),
    ...(exploratory && {
      "exploratory/period.json": JSON.stringify({
        case_id: id, analysis: "exploratory", data_snapshot: generatedAt, units: cf.units, method: exploratory.method, ...exploratory.period,
      }, null, 2),
      "exploratory/citation.txt": exploratory.citation + "\n",
    }),
  };
  const files = Object.fromEntries(Object.entries(inputs).map(([path, contents]) => [path, strToU8(contents)]));
  const bytes = zipSync(files);
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/zip" }));
  const link = document.createElement("a");
  link.href = url;
  const periodSuffix = exploratory ? `-${exploratory.period.start}-${exploratory.period.end}` : "";
  link.download = `oasis-paradox-${id}${periodSuffix}.zip`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
