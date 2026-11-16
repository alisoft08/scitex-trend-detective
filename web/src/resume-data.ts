// AI-assisted: Codex (OpenAI). Resolve the summary's sources without mixing aquifer regions.
import type { AtlasEntry, CaseRef, Manifest } from "./types";

export const SUMMARY_VARIABLES = ["tws_grace", "gws", "ndvi", "precip"] as const;

export function summaryRegion(m: Manifest, zone: string): AtlasEntry | undefined {
  return m.atlas?.find((region) => region.id === zone
    || (region.id === "ZW" && ["Z1", "Z2", "Z4", "Z5"].includes(zone))
    || m.cases.some((record) => record.zone === region.id && record.ref_zone === zone));
}

export function summaryRecords(m: Manifest, selected: CaseRef): (CaseRef | undefined)[] {
  const region = summaryRegion(m, selected.zone);
  const regionalIds = [region?.tws.id, region?.gws.id, region?.ndvi?.id, region?.rain.id];
  return SUMMARY_VARIABLES.map((variable, index) =>
    m.cases.find((record) => record.zone === selected.zone && record.kind === "case" && record.variable === variable)
    ?? m.cases.find((record) => record.id === regionalIds[index] && record.kind === "case"));
}
