// AI-assisted: Codex (OpenAI). Citation and analysis geometry for a published case.
import localZones from "../../config/zones.geojson?raw";
import comparisonZones from "../../config/comparison_zones.geojson?raw";
import { translate, type Language } from "./i18n";
import type { CaseFile, Zone } from "./types";

type StudyFeature = { type: "Feature"; properties: Zone; geometry: unknown };
type StudyGeometry = { type: "FeatureCollection"; features: StudyFeature[] };

const studyZones = [...(JSON.parse(localZones) as StudyGeometry).features,
  ...(JSON.parse(comparisonZones) as StudyGeometry).features];

export function caseGeometry(zoneId: string, referenceId?: string): StudyGeometry {
  return {
    type: "FeatureCollection",
    features: studyZones.filter(({ properties }) => properties.id === zoneId || properties.id === referenceId),
  };
}

export function caseCitation(cf: CaseFile, generatedAt: string, labels: { language: Language; title: string; zone: string }): string {
  const { agency, product, version, doi } = cf.source;
  const { language, title, zone } = labels;
  return [
    `SciTeX. Oasis Paradox. ${title} (${zone}, ${translate(language, "case", "caso")} ${cf.id}).`,
    translate(language, `Analysis period ${cf.period.replace("/", " to ")}. Data snapshot ${generatedAt}.`,
      `Periodo de análisis ${cf.period.replace("/", " a ")}. Fecha de los datos ${generatedAt}.`),
    `${translate(language, "Input dataset", "Conjunto de datos original")}: ${agency}, ${product} (${version}). https://doi.org/${doi}`,
  ].join(" ");
}
