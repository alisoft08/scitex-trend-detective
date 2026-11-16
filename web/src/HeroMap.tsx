// AI-assisted: Claude (Anthropic). Ica's landing view: the detective's lens (LensHero) with Ica's own evidence stops,
// field wells included, and place labels.
import { useMemo } from "react";
import { asset, useJSON } from "./data";
import { LensHero, type LensLabel, type LensStop } from "./LensHero";
import { signed } from "./format";
import type { Manifest, MapMeta } from "./types";

interface HeroMeta extends MapMeta {
  hero?: { bbox: [number, number, number, number]; before: { file: string; source: string }; after: { file: string; source: string } };
}

type Evidence = LensStop;

const LABELS: LensLabel[] = [
  { lon: -76.36, lat: -13.97, text: "Pacific Ocean", kind: "sea" },
  { lon: -76.25, lat: -13.84, text: "Paracas", kind: "place" },
  { lon: -75.73, lat: -14.07, text: "Ica", kind: "place" },
  { lon: -75.42, lat: -13.80, text: "Andes", kind: "range" },
];

const RATIO = 2118 / 1200;   // hero image aspect

export function HeroMap({ m, primary }: {
  m: Manifest; primary: { label: string; go: () => void };
}) {
  const { data: meta } = useJSON<HeroMeta>("map.json");
  const evidence: Evidence[] = useMemo(() => {
    const c = (id: string) => m.cases.find((k) => k.id === id);
    const zi = m.wells.by_zone.find((z) => z.juasvi_zone === "I");
    const ndvi = c("Z2_ndvi"), lst = c("Z1_lst"), air = c("Z4_t2m");
    const out: Evidence[] = [];
    if (ndvi) out.push({ lon: -75.95, lat: -13.89, place: "Villacurí plains", finding: `Greenness ${signed(ndvi.sen_per_decade, 2)} per decade`,
      source: "MODIS NDVI", verdict: m.verdict_labels[ndvi.verdict], tone: ndvi.verdict });
    if (zi) out.push({ lon: -75.72, lat: -14.0, place: "Ica Valley, north", finding: `Water table ${signed(zi.mean_rate_m_per_yr, 2)} m per year`,
      source: `${zi.n} field wells (JUASVI)`, verdict: `${Math.round(zi.share_falling * 100)}% of wells falling`, tone: "field" });
    if (lst) out.push({ lon: -75.68, lat: -14.22, place: "Ica Valley fields", finding: `Surface ${signed(lst.sen_per_decade, 2)} °C per decade`,
      source: "MODIS land surface temperature", verdict: m.verdict_labels[lst.verdict], tone: lst.verdict,
      alarm: `The classic test calls it significant. The combined evidence is inconclusive.` });
    if (air) out.push({ lon: -75.43, lat: -13.95, place: "Andean headwaters", finding: `Air ${signed(air.sen_per_decade, 2)} °C per decade`,
      source: "MERRA-2 reanalysis", verdict: m.verdict_labels[air.verdict], tone: air.verdict });
    return out;
  }, [m]);
  const hero = meta?.hero;
  if (!hero) return <header className="hero-map" id="top"><div className="hm-stage" /></header>;
  return <LensHero before={asset(hero.before.file)} after={asset(hero.after.file)}
    altBefore="Landsat true-color image of Ica and Villacurí in 2004" altAfter="The same area in 2024, seen through the detective's lens"
    bbox={hero.bbox} ratio={RATIO} stops={evidence} labels={LABELS}
    kicker="Ica, Peru · NASA Earth observations"
    title={<>Greener fields.<br />Falling water levels in <em>monitored wells</em>.</>}
    lede="Follow the evidence from an individual well to NASA satellites. Test what each dataset can tell you about Ica."
    primary={primary}
    credit="Landsat 5 (2004) · Landsat 8/9 (2024) · NASA/USGS via Google Earth Engine" />;
}
