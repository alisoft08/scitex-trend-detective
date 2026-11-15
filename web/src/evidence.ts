// AI-assisted: Codex (OpenAI). Presentation of the published scientific records.
import { DATA_TYPE_TEXT, fmt, signed } from "./format";
import type { CaseFile, Verdict } from "./types";

export const EVIDENCE_TEXT: Record<Verdict, string> = {
  confirmed: "Strong evidence",
  likely: "Suggestive evidence",
  inconclusive: "Inconclusive",
  insufficient_data: "Insufficient data",
};

export const EVIDENCE_SUMMARY: Record<Verdict, string> = {
  confirmed: "The result meets the Oasis Paradox criteria for a trend.",
  likely: "The tests suggest a trend, with less agreement across the checks.",
  inconclusive: "The data leave the existence of a trend uncertain.",
  insufficient_data: "This series has too few valid observations to judge a trend.",
};

const VARIABLES: Record<string, [string, string]> = {
  ndvi: ["An index of vegetation greenness from reflected light.", "Greenness can change with vegetation density or condition. This index alone does not attribute the change to irrigation."],
  et: ["Estimated evapotranspiration from soil and vegetation.", "The product estimates water transferred to the atmosphere. The series cannot resolve the water source or pumping volumes."],
  lst: ["Daytime land surface temperature measured by MODIS.", "The daytime surface and the air above it are distinct measurements. Changes in local overpass time may affect Terra comparisons."],
  precip: ["Estimated precipitation from GPM IMERG for the Andean headwaters.", "This result describes the upper basin, where the series was extracted."],
  t2m: ["Air temperature at two metres from the MERRA-2 atmospheric reanalysis.", "This reanalysis has regional resolution. It is distinct from MODIS daytime surface temperature."],
  gws: ["Groundwater storage estimated by a land model that assimilates GRACE.", "The result describes modeled storage across the region. Individual wells measure local depths below ground."],
  tws_grace: ["Regional changes in total water storage inferred from gravity.", "GRACE combines water in several stores over a broad area. It cannot resolve where within that area a local change occurred."],
};

export const WELL_SOURCE = "https://www.juasvi.com/pdfs/1760390572-informe-rmp-sep2025.pdf";
export const GRACE_SOURCE = "https://data.nasa.gov/dataset/jpl-grace-and-grace-fo-mascon-ocean-ice-and-hydrology-equivalent-water-height-coastal-reso-30063";
export const GLDAS_SOURCE = "https://disc.gsfc.nasa.gov/datasets/GLDAS_CLSM025_DA1_D_2.2/summary";

export function describes(cf: CaseFile) {
  if (cf.kind === "contrast") return [
    "Field minus desert reference, after standardizing each series by calendar month.",
    "The masks were selected using vegetation data. The result describes the difference in these selected areas and does not establish its cause.",
  ];
  return VARIABLES[cf.variable] ?? [cf.definition, ""];
}

export const casePeriod = (period: string) => period.replace("/", " to ");
export const caseUnits = (units: string) => units.replace("NDVI units", "NDVI").replace("standard deviations", "SD").replace("degC", "°C");
export const interval = (limits: [number | null, number | null]) =>
  limits.every((limit) => limit !== null) ? `${fmt(limits[0])} to ${fmt(limits[1])}` : "Unavailable";
export const estimate = (cf: CaseFile) => `${signed(cf.trend.sen_per_decade)} ${caseUnits(cf.units)}/decade`;
export const dataKind = (cf: CaseFile) => cf.kind === "contrast" ? "Derived from observations" : cf.variable === "t2m" ? "Reanalysis" : DATA_TYPE_TEXT[cf.data_type];
