// AI-assisted: Claude (Anthropic). The problem the tool solves, in three real examples from this atlas: a conclusion from NASA
// data holds up only if it survives three checks, on the source, the scale and the method. Every number is read from the engine's output; nothing is computed here
// beyond counting and unit conversion.
import { useJSON } from "./data";
import { useLocale } from "./i18n";
import { useAtlasLocale } from "./atlas-locale";
import type { AtlasEntry, CaseFile, Manifest } from "./types";

const proven = (v?: string) => v === "confirmed" || v === "likely";

export function ThreeWays({ m, onCase, onOpen }: { m: Manifest; onCase: (id: string) => void; onOpen: (id: string) => void }) {
  const { t, fmt, signed, pct } = useLocale();
  const { shortName, list } = useAtlasLocale();
  const atlas = m.atlas ?? [];
  const gwsRef = m.cases.find((c) => c.id === "ZW_gws");
  const { data: gws } = useJSON<CaseFile>(gwsRef?.path ?? null);
  const ica = atlas.find((a) => a.id === "ZW");
  const wells = pct(m.wells.share_falling);
  const classic = atlas.filter((a) => a.gws?.per_decade !== null);
  const engine = classic.filter((a) => proven(a.gws?.verdict));
  const disagreements = classic.filter((a) => a.gws?.classic_false_alarm).length;
  const both: AtlasEntry[] = atlas.filter((a) => a.tws.verdict === "confirmed" && (a.tws.per_decade ?? 0) < 0
    && proven(a.ndvi?.verdict) && (a.ndvi?.per_decade ?? 0) > 0 && proven(a.et?.verdict) && (a.et?.per_decade ?? 0) > 0
    && !(proven(a.rain.verdict) && (a.rain.per_decade ?? 0) < 0));
  const pClassic = gws?.trend.p_mk_classic;
  const pText = pClassic == null ? null : pClassic < 0.0001 ? fmt(pClassic, 1) : fmt(pClassic, 2);

  return <section className="three-ways" aria-labelledby="three-ways-title">
    <h3 id="three-ways-title">{t("Source, scale and method: three checks before you trust a trend",
      "Fuente, escala y método: tres comprobaciones para evaluar una tendencia")}</h3>
    <p className="three-ways-lede">{t("Oasis Paradox checks the source, scale and method before confirming a trend. The examples below use data from the atlas.",
      "Oasis Paradox comprueba la fuente, la escala y el método antes de confirmar una tendencia. Los ejemplos de abajo usan datos del atlas.")}</p>
    <div className="three-ways-grid">
      <article className="three-way">
        <span className="three-way-no">{t("1 · Source", "1 · Fuente")}</span>
        <strong>{t("Which source, and is it independent?", "¿Qué mide la fuente y qué tan independiente es?")}</strong>
        <p>{both.length > 0
          ? t(
            `In ${list(both.map(shortName))}, GRACE confirms a decline in total water storage. MODIS shows greener crops that use more water, with no proven decline in rainfall. The pattern is consistent with irrigation. GLDAS assimilates GRACE observations, so the two results share evidence.`,
            `En ${list(both.map(shortName))}, GRACE confirma una pérdida de agua total. MODIS muestra cultivos más verdes que usan más agua, sin un descenso demostrado en la precipitación. El patrón es compatible con el riego. GLDAS asimila observaciones de GRACE, por lo que ambos resultados comparten evidencia.`,
          ) : t("Each aquifer page lists available NASA variables and indicates which sources are model estimates.",
            "Cada ficha de acuífero enumera las variables disponibles de NASA e indica cuáles proceden de estimaciones de modelos.")}</p>
        {both[0] && <button className="text-button" onClick={() => onOpen(both[0].id)}>{t(`See the NASA variables for ${shortName(both[0])}`, `Ver las variables de NASA para ${shortName(both[0])}`)}</button>}
      </article>
      <article className="three-way">
        <span className="three-way-no">{t("2 · Scale", "2 · Escala")}</span>
        <strong>{t("What area does the satellite measure?", "¿Qué área mide el satélite?")}</strong>
        {ica && ica.tws.per_decade != null && <p>{t(
          `The GRACE trend around Ica is ${signed(ica.tws.per_decade / 10, 2)} mm per year. Ica covers ${pct(ica.grace_footprints, 0)} of one GRACE footprint. The result describes a wider region that includes the Andes.`,
          `La tendencia de GRACE en la región de Ica es de ${signed(ica.tws.per_decade / 10, 2)} mm al año. Ica ocupa el ${pct(ica.grace_footprints, 0)} de una huella de GRACE. El resultado describe una región más amplia que incluye los Andes.`,
        )}</p>}
        <button className="text-button" onClick={() => onCase("ZW_tws_grace")}>{t("View the GRACE trend analysis for Ica", "Ver el análisis de tendencia de GRACE para Ica")}</button>
      </article>
      <article className="three-way">
        <span className="three-way-no">{t("3 · Method", "3 · Método")}</span>
        <strong>{t("Do the tests agree on groundwater trends in Ica?", "¿Coinciden las pruebas sobre el agua subterránea en Ica?")}</strong>
        <p>{t(
          "The classic Mann–Kendall test finds a significant rise in GLDAS groundwater estimates for Ica",
          "La prueba clásica de Mann–Kendall encuentra un aumento significativo en la estimación de agua subterránea de GLDAS para Ica",
        )}{pText && <> (p = {pText})</>}. {t(
          `Water levels fell in ${wells} of ${m.wells.n} wells between their first and last readings (${m.wells.period.replace(/ \(.*\)/, "").replace("-", "–")}). Two readings per well are insufficient for a trend test. Accounting for dependence between months leaves the GLDAS result inconclusive. Across the atlas, the classic test found ${disagreements} significant GLDAS results that the combined criteria classified as inconclusive. The engine finds a confirmed or likely GLDAS trend in ${engine.length} of ${classic.length} aquifers.`,
          `El nivel bajó en el ${wells} de ${m.wells.n} pozos entre la primera y la última lectura (${m.wells.period.replace(/ \(.*\)/, "").replace("-", "–")}). Dos lecturas por pozo son insuficientes para una prueba de tendencia. Al considerar la dependencia entre meses, el resultado de GLDAS es no concluyente. En el atlas, la prueba clásica encontró ${disagreements} resultados significativos en GLDAS que el criterio combinado dejó como no concluyentes. El motor encuentra una tendencia confirmada o probable en GLDAS en ${engine.length} de ${classic.length} acuíferos.`,
        )}</p>
        <button className="text-button" onClick={() => onCase("ZW_gws")}>{t("See where the tests disagree for GLDAS in Ica", "Ver en qué discrepan las pruebas de GLDAS en Ica")}</button>
      </article>
    </div>
  </section>;
}
