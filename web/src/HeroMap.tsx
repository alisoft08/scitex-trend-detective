// AI-assisted: Claude (Anthropic). Ica's landing view: the detective's lens (LensHero) with Ica's own evidence stops,
// field wells included, and place labels.
import { useMemo } from "react";
import { asset, useJSON } from "./data";
import { LensHero, type LensLabel, type LensStop } from "./LensHero";
import { verdictLabel } from "./evidence";
import { useLocale } from "./i18n";
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
  const { t, language, signed, pct } = useLocale();
  const { data: meta } = useJSON<HeroMeta>("map.json");
  const evidence: Evidence[] = useMemo(() => {
    const c = (id: string) => m.cases.find((k) => k.id === id);
    const zi = m.wells.by_zone.find((z) => z.juasvi_zone === "I");
    const ndvi = c("Z2_ndvi"), lst = c("Z1_lst"), air = c("Z4_t2m");
    const out: Evidence[] = [];
    if (ndvi) out.push({ lon: -75.95, lat: -13.89, place: t("Villacurí plains", "Llanuras de Villacurí"),
      finding: `${t("Greenness", "Verdor")} ${signed(ndvi.sen_per_decade, 2)} ${t("per decade", "por década")}`,
      source: "MODIS NDVI", verdict: verdictLabel(language, ndvi.verdict), tone: ndvi.verdict });
    if (zi) out.push({ lon: -75.72, lat: -14.0, place: t("Ica Valley, north", "Norte del valle de Ica"),
      finding: `${t("Water table", "Nivel freático")} ${signed(zi.mean_rate_m_per_yr, 2)} ${t("m per year", "m al año")}`,
      source: `${zi.n} ${t("field wells", "pozos de campo")} (JUASVI)`,
      verdict: t(`${pct(zi.share_falling)} of wells show a decline`, `Descenso en el ${pct(zi.share_falling)} de los pozos`), tone: "field" });
    if (lst) out.push({ lon: -75.68, lat: -14.22, place: t("Ica Valley fields", "Campos del valle de Ica"),
      finding: `${t("Surface", "Superficie")} ${signed(lst.sen_per_decade, 2)} °C ${t("per decade", "por década")}`,
      source: t("MODIS land surface temperature", "Temperatura superficial terrestre de MODIS"), verdict: verdictLabel(language, lst.verdict), tone: lst.verdict,
      alarm: t("The classic test finds significance. The combined evidence is inconclusive.",
        "La prueba clásica encuentra significancia. La evidencia combinada no es concluyente.") });
    if (air) out.push({ lon: -75.43, lat: -13.95, place: t("Andean headwaters", "Cabecera andina"),
      finding: `${t("Air", "Aire")} ${signed(air.sen_per_decade, 2)} °C ${t("per decade", "por década")}`,
      source: t("MERRA-2 reanalysis", "Reanálisis MERRA-2"), verdict: verdictLabel(language, air.verdict), tone: air.verdict });
    return out;
  }, [m, t, language, signed, pct]);
  const hero = meta?.hero;
  if (!hero) return <header className="hero-map" id="top"><div className="hm-stage" /></header>;
  return <LensHero before={asset(hero.before.file)} after={asset(hero.after.file)}
    altBefore={t("Landsat true-color image of Ica and Villacurí in 2004", "Imagen Landsat en color natural de Ica y Villacurí en 2004")}
    altAfter={t("The same area in 2024, seen through the lens", "La misma zona en 2024, vista a través de la lupa")}
    bbox={hero.bbox} ratio={RATIO} stops={evidence}
    labels={LABELS.map((label) => label.kind === "sea" ? { ...label, text: t("Pacific Ocean", "Océano Pacífico") } : label)}
    kicker={t("Ica, Peru · NASA Earth observations", "Ica, Perú · Observaciones de la Tierra de NASA")}
    title={<>{t("Greener fields.", "Campos más verdes.")}<br />{t("Falling water levels in", "Descenso del nivel de agua en")} <em>{t("monitored wells", "pozos monitoreados")}</em>.</>}
    lede={t("Follow the evidence from individual wells to NASA satellite data. Explore what each dataset can tell you about Ica.",
      "Sigue la evidencia desde los pozos individuales hasta los datos satelitales de NASA. Explora qué aporta cada conjunto de datos al análisis de Ica.")}
    primary={primary}
    credit={t("Landsat 5 (2004) · Landsat 8/9 (2024) · NASA/USGS via Google Earth Engine",
      "Landsat 5 (2004) · Landsat 8/9 (2024) · NASA/USGS mediante Google Earth Engine")} />;
}
