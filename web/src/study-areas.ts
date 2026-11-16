// AI-assisted: Codex (OpenAI). Keep the detective desk in the selected geographic context.
import type { Manifest, Zone } from "./types";

// Ica has several local study areas under the atlas's Ica–Villacuri entry.
const ICA_ZONES = ["Z1", "Z2", "Z4", "Z5", "ZW"];

export function studyAreasForZone(manifest: Manifest, selectedZone: string): Zone[] {
  const regions = (manifest.atlas ?? []).map((region) => {
    const zones = new Set(region.id === "ZW" ? ICA_ZONES : [region.id]);
    for (const record of manifest.cases) {
      if (zones.has(record.zone) && record.ref_zone) zones.add(record.ref_zone);
    }
    return { countries: region.countries, zones };
  });
  const selectedRegion = regions.find((region) => region.zones.has(selectedZone));
  const allowed = new Set<string>([selectedZone]);
  if (selectedRegion) {
    for (const region of regions) {
      if (region === selectedRegion || region.countries.some((country) => selectedRegion.countries.includes(country))) {
        for (const zone of region.zones) allowed.add(zone);
      }
    }
  }
  return manifest.zones.filter((zone) => allowed.has(zone.id)
    && manifest.cases.some((record) => record.zone === zone.id && record.kind === "case"));
}
