import { useMemo } from "react";
import { useEvidence, zoneLabel } from "./evidence";
import { translate, useLocale, type Language } from "./i18n";
import type { AtlasEntry, AtlasWitness } from "./types";

const countriesEs: Record<string, string> = {
  Peru: "Perú", "United States": "Estados Unidos", Pakistan: "Pakistán", "Saudi Arabia": "Arabia Saudita",
  Jordan: "Jordania", Iraq: "Irak", Iran: "Irán", Syria: "Siria", Turkey: "Turquía", Brazil: "Brasil",
};

const descriptionsEs: Record<string, string> = {
  ZW: "Las dos zonas irrigadas en conjunto forman la menor área de estudio para los productos hídricos de resolución regional.",
  ZC: "Los valles californianos de Sacramento y San Joaquín extraen para riego mucho más agua subterránea que Ica. Allí GRACE midió por primera vez el agotamiento de un acuífero desde el espacio.",
  ZHP: "Región de cereales irrigados sobre el acuífero Ogallala, desde Dakota del Sur hasta Texas.",
  ZIN: "Zona de arroz y trigo regados con agua de pozos, donde GRACE mostró por primera vez una gran pérdida de agua subterránea en India.",
  ZAR: "Explotaciones agrícolas del desierto extraen agua subterránea fósil cuya recarga actual es mínima.",
  ZTE: "Llanuras irrigadas de Irak, Irán, Siria y Turquía afectadas por la sequía y el bombeo.",
  ZGU: "Uno de los mayores acuíferos del mundo, bajo Brasil, Paraguay, Argentina y Uruguay, en una región húmeda.",
};

const readingPhrases: [RegExp, string][] = [
  [/Its cropland is getting greener and using more water \(MODIS\)\./g, "MODIS indica que los cultivos están más verdes y usan más agua."],
  [/Its cropland is getting greener \(MODIS\)\./g, "MODIS indica que los cultivos están más verdes."],
  [/GRACE sees stored water falling\./g, "GRACE muestra una disminución del agua almacenada."],
  [/GRACE sees stored water rising\./g, "GRACE muestra un aumento del agua almacenada."],
  [/Rain shows no proven decline, so a drier climate is unlikely to be the main cause and pumping is the likely driver \(GRACE also counts snow and soil water\)\./g,
    "No se ha demostrado un descenso de la precipitación. Un clima más seco difícilmente sería la causa principal y el bombeo es una explicación probable. GRACE incluye también la nieve y el agua del suelo."],
  [/Yet (\d+)% of monitored wells are falling: the farms are too small for one GRACE footprint, so the satellites cannot localise the loss\./g,
    "El nivel bajó en el $1 % de los pozos monitoreados. Los cultivos ocupan una parte tan pequeña de una huella de GRACE que los satélites no pueden localizar esa pérdida."],
  [/No proven change in stored water from space\./g, "Las observaciones satelitales no demuestran un cambio en el almacenamiento de agua."],
  [/A change this size would need about (\d+) years of data to show up\./g, "Detectar un cambio de esta magnitud requeriría unos $1 años de datos."],
];

export function atlasName(language: Language, a: AtlasEntry) {
  const spanish = a.id === "ZW" ? "Ica-Villacurí, Perú" : zoneLabel("es", a.id, a.name);
  return translate(language, a.name, spanish);
}

export function useAtlasLocale() {
  const { t, language, signed } = useLocale();
  const { perDecade } = useEvidence();
  return useMemo(() => {
    const name = (a: AtlasEntry) => atlasName(language, a);
    const shortName = (a: AtlasEntry) => name(a).replace(/ \(([^)]*)\)/, (match, inner: string) => inner.includes(",") ? "" : match).split(",")[0];
    const countries = (a: AtlasEntry) => a.countries.map((country) => t(country, countriesEs[country] ?? country)).join(", ");
    const list = (items: string[]) => items.length < 2 ? items.join("") :
      `${items.slice(0, -1).join(", ")} ${t("and", /^[ií]|^hi[^e]/i.test(items[items.length - 1]) ? "e" : "y")} ${items[items.length - 1]}`;
    const reading = (a: AtlasEntry) => language === "en" ? a.reading
      : readingPhrases.reduce((copy, [pattern, spanish]) => copy.replace(pattern, spanish), a.reading);
    const amount = (w: AtlasWitness) => {
      if (w.per_decade === null) return t("n/a", "n/d");
      if (w.units === "mm") return `${signed(w.per_decade / 10, 2)} ${t("mm/yr", "mm/año")}`;
      return `${signed(w.per_decade, 2)} ${perDecade(w.units)}`;
    };
    return { name, shortName, countries, list, reading, amount,
      description: (a: AtlasEntry) => t(a.description, descriptionsEs[a.id] ?? a.description) };
  }, [t, language, signed, perDecade]);
}
