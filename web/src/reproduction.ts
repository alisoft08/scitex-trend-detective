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
import type { CaseFile } from "./types";

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

export async function downloadCase(cf: CaseFile, generatedAt: string) {
  const { id, source } = cf;
  const record = [
    "date,value,analysis_anomaly,valid",
    ...cf.series.map((row) => [row.date, row.value ?? "", row.anomaly ?? "", row.valid].join(",")),
  ].join("\n");
  const readme = [
    `# Oasis Paradox case ${id}`,
    "",
    `Published case: ${cf.label}`,
    `Input source: ${source.agency} ${source.product} ${source.version} (https://doi.org/${source.doi})`,
    `Period: ${cf.period}; valid months: ${cf.n_valid}/${cf.n}; data bundle timestamp: ${generatedAt}`,
    "",
    "published/case.json contains the published estimate, interval, verdict, sensitivity and provenance.",
    "published/chart.csv mirrors the rounded values shown in the browser. Blank values mark missing months.",
    "data/processed/series_long.csv and climate_indices.csv contain the analysis inputs used by the runner.",
    "config/zones.geojson contains study geometry and mask descriptions. pipeline/zones.py records the pixel mask rules.",
    "config/verdict.yaml defines the verdict thresholds and settings. engine/ contains the statistical implementation.",
    "",
    "From the extracted folder, install the statistical dependencies in a Python environment:",
    "    python -m pip install -r requirements.txt",
    "Then regenerate the selected case JSON from the archived analysis inputs:",
    `    python scripts/build_web_data.py ${id} > reproduced.json`,
    "Compare reproduced.json with published/case.json. Numerical ARMA fits can vary slightly by environment. The published slope, interval and verdict provide reference values.",
    "Re-extracting the NASA observations is a separate step. Product versions and primary sources are in REFERENCES.md.",
    "",
  ].join("\n");
  const inputs = { ...inputFiles, "README.md": readme, "published/chart.csv": record, "published/case.json": JSON.stringify(cf, null, 2) };
  const files = Object.fromEntries(Object.entries(inputs).map(([path, contents]) => [path, strToU8(contents)]));
  const bytes = zipSync(files);
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/zip" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `oasis-paradox-${id}.zip`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
