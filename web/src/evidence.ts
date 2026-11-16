// AI-assisted: Codex (OpenAI). Localize scientific metadata by stable dataset identifiers.
import { useMemo } from "react";
import { translate, useLocale, type Language, type Translation } from "./i18n";
import type { CaseFile, DataType, Verdict } from "./types";

export const PLACES: Record<string, Translation> = {
  Z2: ["Villacurí fields", "Campos de Villacurí"],
  Z1: ["Ica Valley fields", "Campos del valle de Ica"],
  Z5: ["Desert reference", "Desierto de referencia"],
  Z4: ["Andean headwaters", "Cabecera andina"],
  ZW: ["Ica–Villacurí region", "Región Ica–Villacurí"],
};

const atlasPlaces: Record<string, Translation> = {
  ZC: ["Central Valley, California", "Valle Central, California"],
  ZHP: ["High Plains (Ogallala), United States", "Altas Llanuras (Ogallala), Estados Unidos"],
  ZIN: ["Northwest India (Punjab, Haryana, Rajasthan)", "Noroeste de India (Punjab, Haryana, Rajastán)"],
  ZNC: ["North China Plain", "Llanura del Norte de China"],
  ZAR: ["Arabian aquifer system (Saq), Saudi Arabia", "Sistema acuífero de Arabia (Saq), Arabia Saudita"],
  ZTE: ["Tigris–Euphrates basin", "Cuenca del Tigris y el Éufrates"],
  ZGU: ["Guarani aquifer system, South America", "Sistema acuífero Guaraní, Sudamérica"],
};
const naturalReferences: Record<string, string> = {
  ZCR: "ZC", ZHPR: "ZHP", ZINR: "ZIN", ZNCR: "ZNC", ZARR: "ZAR", ZTER: "ZTE", ZGUR: "ZGU",
};

export function zoneLabel(language: Language, id: string, fallback = id) {
  const entry = PLACES[id] ?? atlasPlaces[id];
  if (entry) return translate(language, ...entry);
  const region = atlasPlaces[naturalReferences[id]];
  return region ? translate(language, fallback, `${region[1]} · terreno natural de referencia`) : fallback;
}
const atlasNotesEs: Record<string, string> = {
  "Air temperature over the same box as the Central Valley water cases.": "La temperatura del aire se analiza en el mismo recuadro que las variables de agua del Valle Central.",
  "Atlas case: cropland pixels from MODIS MCD12Q1 land cover 2020 (IGBP classes 12 and 14) inside an approximate box around the aquifer. Only El Niño (ONI) is used as a control.":
    "Se analizan píxeles agrícolas del producto de cobertura terrestre MODIS MCD12Q1 de 2020 (clases IGBP 12 y 14) dentro de un recuadro aproximado alrededor del acuífero. El único control estadístico es el índice de El Niño (ONI).",
  "Atlas case: the box around this aquifer system is approximate, not its official boundary. Only El Niño (ONI) is used as a control.":
    "El análisis usa un recuadro aproximado alrededor del sistema acuífero. El único control estadístico es el índice de El Niño (ONI).",
  "Comparison case outside Peru. The Central Valley spans several GRACE mascons, so the satellite can resolve a loss here that it cannot localise in Ica.":
    "El Valle Central abarca varias celdas de concentración de masa de GRACE. En esta región GRACE puede distinguir la pérdida a escala regional con mayor resolución espacial relativa que en Ica.",
  "Published reference: Famiglietti et al. (2011), Geophysical Research Letters 38, L03403, doi:10.1029/2010GL046442.":
    "Referencia publicada: Famiglietti et al. (2011), Geophysical Research Letters 38, L03403, DOI 10.1029/2010GL046442.",
  "GLDAS 2.2 assimilates GRACE, so it is not independent of the GRACE record for the same region.":
    "GLDAS 2.2 asimila observaciones de GRACE. Ambas series comparten información en esta región.",
  "GLDAS 2.2 assimilates GRACE, so it is not independent of the GRACE record for the same region: when both fall, that is one line of evidence, not two.":
    "GLDAS 2.2 asimila observaciones de GRACE. Si ambas series disminuyen en la misma región, los dos resultados comparten evidencia.",
  "Terra's overpass has drifted earlier since about 2020, which can cool absolute daytime temperatures; the heat gap against natural land in the same box cancels that shared effect.":
    "Desde aproximadamente 2020, Terra pasa cada vez más temprano. Esto puede reducir las temperaturas diurnas registradas. Comparar los cultivos con el terreno natural del mismo recuadro ayuda a descontar ese efecto compartido.",
  "Rain over the same box as the Central Valley water cases.": "La precipitación se analiza en el mismo recuadro que las variables de agua del Valle Central.",
};

const verdicts: Record<Verdict, Translation> = {
  confirmed: ["Confirmed trend", "Tendencia confirmada"],
  likely: ["Likely trend", "Tendencia probable"],
  inconclusive: ["Inconclusive", "No concluyente"],
  insufficient_data: ["Insufficient data", "Datos insuficientes"],
};

export const EVIDENCE_TEXT = {
  confirmed: "Confirmed trend", likely: "Likely trend", inconclusive: "Inconclusive", insufficient_data: "Insufficient data",
} satisfies Record<Verdict, string>;

export const verdictLabel = (language: Language, verdict: Verdict) => translate(language, ...verdicts[verdict]);

const summaries: Record<Verdict, Translation> = {
  confirmed: ["The result meets the Oasis Paradox criteria for a trend.", "El resultado cumple los criterios de tendencia de Oasis Paradox."],
  likely: ["The tests suggest a trend, with less agreement across the checks.", "Las pruebas sugieren una tendencia, con menor concordancia entre las comprobaciones."],
  inconclusive: ["The data leave the existence of a trend uncertain.", "Los datos no permiten determinar si hay una tendencia."],
  insufficient_data: ["This series has too few valid observations to judge a trend.", "Esta serie tiene muy pocas observaciones válidas para evaluar una tendencia."],
};

const types: Record<DataType, Translation> = {
  observed: ["Observed", "Observación"], modeled: ["Modeled", "Modelo"],
  estimated: ["Estimated", "Estimación"], classified: ["Classified", "Clasificación"],
};

export const VARIABLES: Record<string, { name: Translation; short: Translation; resolution: Translation; description: Translation; limit: Translation }> = {
  ndvi: {
    name: ["Vegetation greenness (NDVI)", "Verdor de la vegetación (NDVI)"], short: ["Greenness", "Verdor"],
    resolution: ["250 m, 16-day composites (monthly maximum)", "250 m, compuestos de 16 días (máximo mensual)"],
    description: ["An index of vegetation greenness from reflected light.", "Índice de verdor de la vegetación calculado a partir de la luz reflejada."],
    limit: ["Greenness can change with vegetation density or condition. This index alone does not attribute the change to irrigation.", "El verdor puede cambiar con la densidad o el estado de la vegetación. Este índice por sí solo no permite atribuir el cambio al riego."],
  },
  et: {
    name: ["Evapotranspiration from soil and crops", "Evapotranspiración del suelo y los cultivos"], short: ["Evapotranspiration", "Evapotranspiración"],
    resolution: ["500 m, 8-day (gap-filled)", "500 m, intervalos de 8 días (con relleno de vacíos)"],
    description: ["Estimated evapotranspiration from soil and vegetation.", "Estimación del agua que pasa a la atmósfera desde el suelo y la vegetación."],
    limit: ["The series cannot resolve the water source or pumping volumes.", "La serie no permite distinguir la procedencia del agua ni el volumen de bombeo."],
  },
  lst: {
    name: ["Land surface temperature (daytime)", "Temperatura diurna de la superficie terrestre"], short: ["Surface temperature", "Temperatura superficial"],
    resolution: ["1 km, 8-day (monthly mean)", "1 km, intervalos de 8 días (promedio mensual)"],
    description: ["Daytime land surface temperature measured by MODIS.", "Temperatura diurna de la superficie terrestre obtenida con MODIS."],
    limit: ["The daytime surface and the air above it are distinct measurements. Changes in local overpass time may affect Terra comparisons.", "La temperatura de la superficie y la del aire son mediciones distintas. Los cambios en la hora de paso de Terra pueden influir en las comparaciones."],
  },
  precip: {
    name: ["Rainfall", "Precipitación"], short: ["Rainfall", "Precipitación"],
    resolution: ["0.1° (~11 km), monthly", "0,1° (~11 km), mensual"],
    description: ["Monthly precipitation estimated from GPM IMERG over the selected study area.", "Precipitación mensual estimada con GPM IMERG en el área de estudio seleccionada."],
    limit: ["This result describes the upper basin, where the series was extracted.", "Este resultado describe la cuenca alta, donde se extrajo la serie."],
  },
  t2m: {
    name: ["Air temperature at 2 m (reanalysis)", "Temperatura del aire a 2 m (reanálisis)"], short: ["Air temperature", "Temperatura del aire"],
    resolution: ["0.5° × 0.625° (~55 km), hourly (monthly mean)", "0,5° × 0,625° (~55 km), horario (promedio mensual)"],
    description: ["Air temperature at two metres from the MERRA-2 atmospheric reanalysis.", "Temperatura del aire a dos metros del reanálisis atmosférico MERRA-2."],
    limit: ["This reanalysis has regional resolution. It is distinct from MODIS daytime surface temperature.", "El reanálisis tiene resolución regional y mide una variable distinta de la temperatura superficial diurna de MODIS."],
  },
  gws: {
    name: ["Groundwater storage (model)", "Almacenamiento de agua subterránea (modelo)"], short: ["Groundwater · GLDAS", "Agua subterránea · GLDAS"],
    resolution: ["0.25° (~28 km), daily", "0,25° (~28 km), diario"],
    description: ["Groundwater storage estimated by a land model that assimilates GRACE.", "Almacenamiento de agua subterránea estimado por un modelo terrestre que asimila GRACE."],
    limit: ["The result describes modeled storage across the region. Individual wells measure local depths below ground.", "El resultado describe el almacenamiento regional modelado. Los pozos individuales miden la profundidad local bajo la superficie."],
  },
  tws_grace: {
    name: ["Total water storage (GRACE satellites)", "Almacenamiento total de agua (satélites GRACE)"], short: ["Total water · GRACE", "Agua total · GRACE"],
    resolution: ["3° mascons (~330 km), monthly", "Celdas de concentración de masa de 3° (~330 km), mensual"],
    description: ["Regional changes in total water storage inferred from gravity.", "Cambios regionales en el almacenamiento total de agua inferidos a partir de la gravedad."],
    limit: ["GRACE combines water in several stores over a broad area. It cannot resolve where within that area a local change occurred.", "GRACE combina el agua de distintas reservas en un área amplia. Su resolución impide localizar cambios dentro de esa área."],
  },
};

const masks: Record<string, Translation> = {
  Z1: ["Cropland mask: annual maximum NDVI above 0.4 in any year from 2020 to 2024.", "Máscara agrícola: NDVI máximo anual superior a 0,4 en algún año de 2020 a 2024."],
  Z5: ["Low-NDVI reference: annual maximum NDVI below 0.12 in every year from 2004 to 2024.", "Referencia de NDVI bajo: NDVI máximo anual inferior a 0,12 en todos los años de 2004 a 2024."],
  ZW: ["Entire configured study box.", "Recuadro completo del área de estudio."],
  Z4: ["Above 2,500 m (SRTM) within the level-7 HydroBASINS Ica basin.", "Por encima de 2.500 m (SRTM) dentro de la cuenca de Ica de nivel 7 de HydroBASINS."],
};

export function useEvidence() {
  const { language, t, fmt, signed } = useLocale();
  return useMemo(() => {
    const zoneName = (id: string, fallback = id) => zoneLabel(language, id, fallback);
    const baseVariable = (id: string) => id.replace(/_contrast$/, "");
    const variableName = (id: string, fallback = id, compact = false) => {
      const type = baseVariable(id);
      if (id.endsWith("_contrast")) return type === "ndvi" ? t("Greenness gap", "Brecha de verdor") : t("Surface temperature gap", "Brecha de temperatura superficial");
      const entry = VARIABLES[type];
      return entry ? t(...(compact ? entry.short : entry.name)) : fallback;
    };
    const caseTitle = (variable: string, zone: string, fallback: string) => {
      const label = variableName(variable, fallback);
      if (!variable.endsWith("_contrast")) return label;
      return PLACES[zone]
        ? t(`${label} between fields and desert`, `${label} entre campos y desierto`)
        : t(`${label} between cropland and natural land`, `${label} entre cultivos y terreno natural`);
    };
    const caseUnits = (units: string) => units
      .replace("NDVI units", "NDVI").replace("standard deviations", t("SD", "DE"))
      .replace("degC", "°C").replace("mm/month", t("mm/month", "mm/mes"));
    const perDecade = (units: string) => `${caseUnits(units)}/${t("decade", "década")}`;
    const casePeriod = (period: string) => period.replace("/", t(" to ", " a "));
    const interval = (limits: [number | null, number | null]) =>
      limits.every((limit) => limit !== null) ? t(`${fmt(limits[0])} to ${fmt(limits[1])}`, `${fmt(limits[0])} a ${fmt(limits[1])}`) : t("Unavailable", "No disponible");
    const estimate = (cf: CaseFile) => `${signed(cf.trend.sen_per_decade)} ${perDecade(cf.units)}`;
    const dataKind = (cf: CaseFile) => cf.kind === "contrast" ? t("Derived from observations", "Derivado de observaciones")
      : cf.variable === "t2m" ? t("Reanalysis", "Reanálisis") : t(...types[cf.data_type]);
    const describes = (cf: CaseFile) => {
      const definition = VARIABLES[cf.variable]?.description;
      if (!PLACES[cf.zone.id]) {
        const contrastDefinition = t(
          "Difference between cropland and natural land in the same region after standardizing both series by calendar month.",
          "Diferencia entre cultivos y terreno natural de la misma región tras estandarizar ambas series por mes calendario.",
        );
        return [
          cf.kind === "contrast" ? contrastDefinition : definition ? t(...definition) : cf.definition,
          cf.notes.map((note) => t(note, atlasNotesEs[note] ?? note)).join(" "),
        ];
      }
      if (cf.kind === "contrast") return [
        t("Field minus desert reference, after standardizing each series by calendar month.", "Diferencia entre el campo y el desierto de referencia tras estandarizar cada serie por mes calendario."),
        t("Vegetation data define the masks. The trend describes how the gap changed in the selected areas.", "Los datos de vegetación definen las máscaras. La tendencia describe cómo cambió la brecha en las áreas seleccionadas."),
      ];
      const entry = VARIABLES[cf.variable];
      return entry ? [t(...entry.description), t(...entry.limit)] : [cf.definition, ""];
    };
    const resolution = (cf: CaseFile) => {
      const entry = VARIABLES[baseVariable(cf.variable)];
      return entry ? t(cf.source.resolution, entry.resolution[1]) : cf.source.resolution;
    };
    const mask = (zone: string, original: string) => {
      const entry = masks[zone === "Z2" ? "Z1" : zone];
      if (entry) return t(original, entry[1]);
      if (naturalReferences[zone]) return t(original, "Clases IGBP 6, 7, 9, 10 y 16 del producto MODIS MCD12Q1 de 2020, dentro del recuadro del acuífero.");
      return t(original, "Recuadro completo del área de estudio. Sus límites pueden consultarse en el GeoJSON.");
    };
    const covariate = (name: string) => {
      const coastal = /^Coastal El Niño index \(lag (\d+) months\)$/.exec(name);
      if (coastal) return t(name, `Índice de El Niño costero (rezago de ${coastal[1]} meses)`);
      if (name === "Upper-basin rain, previous 12 months") return t(name, "Precipitación en la cuenca alta durante los 12 meses previos");
      return name;
    };
    return { zoneName, variableName, caseTitle, caseUnits, perDecade, casePeriod, interval, estimate, dataKind, describes, resolution, mask, covariate,
      verdictText: (verdict: Verdict) => t(...verdicts[verdict]), verdictSummary: (verdict: Verdict) => t(...summaries[verdict]) };
  }, [language, t, fmt, signed]);
}
