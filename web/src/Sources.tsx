// AI-assisted: Claude (Anthropic). Every dataset with its version and DOI, the team, and the use of AI.
import { useLocale } from "./i18n";
import type { Manifest } from "./types";

export const DATASETS: [string, string, string, string, string, string][] = [
  ["MODIS Terra MOD13Q1 v6.1 (NDVI, 250 m)", "NASA", "Observed", "Greenness series and trend map; cropland greenness over the atlas aquifers", "https://doi.org/10.5067/MODIS/MOD13Q1.061", "10.5067/MODIS/MOD13Q1.061"],
  ["MODIS MOD16A2GF v6.1 (evapotranspiration, 500 m)", "NASA", "Estimated", "Water use by crops (Ica and the atlas aquifers)", "https://doi.org/10.5067/MODIS/MOD16A2GF.061", "10.5067/MODIS/MOD16A2GF.061"],
  ["MODIS Terra MOD11A2 v6.1 (land surface temperature, 1 km)", "NASA", "Observed", "Surface heat", "https://doi.org/10.5067/MODIS/MOD11A2.061", "10.5067/MODIS/MOD11A2.061"],
  ["MERRA-2 single-level diagnostics M2T1NXSLV 5.12.4 (T2M)", "NASA GMAO", "Reanalysis", "Air temperature (Ica and the atlas aquifers)", "https://doi.org/10.5067/VJAFPLI1CSIV", "10.5067/VJAFPLI1CSIV"],
  ["GLDAS-2.2 Catchment with GRACE assimilation (0.25°)", "NASA GSFC", "Modeled", "Groundwater storage (Ica and the world aquifer atlas)", "https://doi.org/10.5067/TXBMLX370XX8", "10.5067/TXBMLX370XX8"],
  ["GRACE/GRACE-FO JPL Mascon RL06.3Mv04 CRI", "NASA JPL", "Observed", "Total water storage (Ica and the world aquifer atlas)", "https://doi.org/10.5067/TEMSC-3JC634", "10.5067/TEMSC-3JC634"],
  ["GPM IMERG Final Monthly V07", "NASA", "Estimated", "Headwater rain; rain over each atlas aquifer", "https://doi.org/10.5067/GPM/IMERG/3B-MONTH/07", "10.5067/GPM/IMERG/3B-MONTH/07"],
  ["MODIS MCD12Q1 v6.1 (land cover, 500 m)", "NASA", "Classified", "Cropland mask for the atlas aquifers", "https://doi.org/10.5067/MODIS/MCD12Q1.061", "10.5067/MODIS/MCD12Q1.061"],
  ["MODIS Terra MOD09A1 v6.1 (surface reflectance, 500 m)", "NASA", "Observed", "Satellite close-up of each aquifer; its 2004 and 2024 views", "https://doi.org/10.5067/MODIS/MOD09A1.061", "10.5067/MODIS/MOD09A1.061"],
  ["MODIS Terra MOD09CMG v6.1 (surface reflectance, 0.05°)", "NASA", "Observed", "World mosaic on the atlas globe", "https://doi.org/10.5067/MODIS/MOD09CMG.061", "10.5067/MODIS/MOD09CMG.061"],
  ["Landsat 5 TM and Landsat 8/9 OLI, Collection 2 Level-2", "NASA / USGS", "Observed", "Before/after images", "https://www.usgs.gov/landsat-missions/landsat-collection-2", "USGS Collection 2"],
  ["SRTM 30 m elevation", "NASA / NGA", "Observed", "Headwater mask above 2,500 m, map relief", "https://doi.org/10.5067/MEaSUREs/SRTM/SRTMGL1.003", "10.5067/MEaSUREs/SRTM/SRTMGL1.003"],
  ["HydroBASINS level 7", "WWF (not NASA)", "Derived", "Ica River basin outline", "https://www.hydrosheds.org/products/hydrobasins", "hydrosheds.org"],
  ["ERSSTv5 Niño 1+2 and ONI", "NOAA CPC (not NASA)", "Index", "El Niño controls (ICEN-like index computed by us)", "https://www.cpc.ncep.noaa.gov/data/indices/", "cpc.ncep.noaa.gov"],
  ["Piezometric network report, Sept 2025 (87 wells)", "JUASVI (not NASA)", "Field", "Water-table change per well", "https://www.juasvi.com/pdfs/1760390572-informe-rmp-sep2025.pdf", "juasvi.com report"],
];

const datasetSpanish: Record<string, [name: string, use: string]> = {
  "10.5067/MODIS/MOD13Q1.061": ["MODIS Terra MOD13Q1 v6.1 (NDVI, 250 m)", "Series y mapas de verdor, incluido el verdor de los cultivos del atlas"],
  "10.5067/MODIS/MOD16A2GF.061": ["MODIS MOD16A2GF v6.1 (evapotranspiración, 500 m)", "Uso de agua de los cultivos en Ica y los acuíferos del atlas"],
  "10.5067/MODIS/MOD11A2.061": ["MODIS Terra MOD11A2 v6.1 (temperatura superficial terrestre, 1 km)", "Temperatura de la superficie terrestre"],
  "10.5067/VJAFPLI1CSIV": ["MERRA-2 M2T1NXSLV 5.12.4 (diagnóstico de un solo nivel, T2M)", "Temperatura del aire en Ica y los acuíferos del atlas"],
  "10.5067/TXBMLX370XX8": ["GLDAS-2.2 Catchment con asimilación de GRACE (0,25°)", "Almacenamiento de agua subterránea en Ica y el atlas mundial"],
  "10.5067/TEMSC-3JC634": ["GRACE/GRACE-FO JPL Mascon RL06.3Mv04 CRI", "Almacenamiento total de agua en Ica y el atlas mundial"],
  "10.5067/GPM/IMERG/3B-MONTH/07": ["GPM IMERG Final mensual V07", "Precipitación en la cabecera de Ica y sobre cada acuífero del atlas"],
  "10.5067/MODIS/MCD12Q1.061": ["MODIS MCD12Q1 v6.1 (cobertura terrestre, 500 m)", "Máscara agrícola de los acuíferos del atlas"],
  "10.5067/MODIS/MOD09A1.061": ["MODIS Terra MOD09A1 v6.1 (reflectancia de superficie, 500 m)", "Imágenes satelitales de cada acuífero en 2004 y 2024"],
  "10.5067/MODIS/MOD09CMG.061": ["MODIS Terra MOD09CMG v6.1 (reflectancia de superficie, 0,05°)", "Mosaico mundial del globo del atlas"],
  "USGS Collection 2": ["Landsat 5 TM y Landsat 8/9 OLI, colección 2, nivel 2", "Imágenes de antes y después"],
  "10.5067/MEaSUREs/SRTM/SRTMGL1.003": ["Elevación SRTM de 30 m", "Máscara de la cabecera por encima de 2.500 m y relieve"],
  "hydrosheds.org": ["HydroBASINS nivel 7", "Contorno de la cuenca del río Ica"],
  "cpc.ncep.noaa.gov": ["ERSSTv5 Niño 1+2 y ONI", "Controles de El Niño, incluido un índice similar al ICEN calculado por el equipo"],
  "juasvi.com report": ["Informe de la red piezométrica, septiembre de 2025 (87 pozos)", "Cambio del nivel freático por pozo"],
};
const typeSpanish: Record<string, string> = {
  Observed: "Observación", Estimated: "Estimación", Reanalysis: "Reanálisis",
  Modeled: "Modelo", Classified: "Clasificación", Derived: "Derivado", Index: "Índice", Field: "Medición de campo",
};

export function Sources({ m }: { m: Manifest }) {
  const { t } = useLocale();
  return (
    <section className="wrap wide research-page">
      <header className="research-heading"><h1>{t("Data sources", "Fuentes de datos")}</h1>
        <p>{t("See the product, version and organization behind each dataset.", "Consulta el producto, la versión y el organismo responsable de cada conjunto de datos.")}</p></header>
      <div className="panel analysis-panel sources-table">
        <p className="control-help">{t("Select a DOI or link to open the original source in a new tab.", "Selecciona un DOI o enlace para abrir la fuente original en una pestaña nueva.")}</p>
        <div className="scroll-x">
          <table className="data">
            <thead><tr><th>{t("Dataset", "Conjunto de datos")}</th><th>{t("Agency", "Organismo")}</th><th>{t("Type", "Tipo")}</th><th>{t("Use", "Uso")}</th><th>{t("DOI or link", "DOI o enlace")}</th></tr></thead>
            <tbody>{DATASETS.map(([name, agency, type, use, href, label]) => {
              const [nameEs, useEs] = datasetSpanish[label] ?? [name, use];
              const labelEs = label === "USGS Collection 2" ? "Colección 2 de USGS" : label === "juasvi.com report" ? "Informe de JUASVI" : label;
              return <tr key={name}><td>{t(name, nameEs)}</td><td>{t(agency, agency.replace(" (not NASA)", " (ajeno a NASA)"))}</td>
                <td>{t(type, typeSpanish[type] ?? type)}</td><td>{t(use, useEs)}</td>
                <td><a href={href} target="_blank" rel="noreferrer">{t(label, labelEs)}</a></td></tr>;
            })}</tbody>
          </table>
        </div>
      </div>
      <section className="panel analysis-panel">
        <h2>{t("Scope of the evidence", "Alcance de la evidencia")}</h2>
        <p>{t(
          "GRACE measures regional total water storage. GLDAS estimates groundwater and assimilates GRACE observations. In Ica, the JUASVI well rates use the first and last measured levels of each well.",
          "GRACE mide el almacenamiento total de agua a escala regional. GLDAS estima el agua subterránea y asimila observaciones de GRACE. En Ica, las tasas de los pozos JUASVI se calculan con la primera y la última medición de cada pozo.",
        )}</p>
        <p>{t(
          "The team cross-checked the extraction of three series: Villacurí greenness, upper Ica rainfall and Ica–Villacurí GLDAS groundwater. These checks compare the extracted inputs with alternate NASA access tools. For the published analysis inputs, geometry and method, open any case file and select ‘Cite and reproduce this result’.",
          "El equipo cotejó la extracción de tres series: verdor de Villacurí, precipitación en la cuenca alta de Ica y agua subterránea de GLDAS para Ica–Villacurí. El cotejo compara los datos de entrada con los obtenidos mediante otras herramientas de acceso de NASA. Para consultar los datos de entrada, la geometría y el método del análisis, abre un expediente y selecciona «Citar y reproducir este resultado».",
        )}</p>
      </section>
      <div className="sources-cols">
        <div className="panel analysis-panel">
          <h2>{t("Team SciTeX, Lima", "Equipo SciTeX, Lima")}</h2>
          <p>{t("Manuel (statistics and validity), Moisés (data pipeline), Jaime (zones, field context and story), Alison (app and video).",
            "Manuel (estadística y validez), Moisés (procesamiento de datos), Jaime (zonas, contexto de campo y narrativa), Alison (aplicación y video).")}
            {t(" NASA Space Apps Challenge 2026, challenge", " NASA Space Apps Challenge 2026, reto")} <span lang="en">“Be An Earth System Trend Detective!”</span></p>
          <p className="small muted">{t("Code and text: MIT license. Well owners' names were removed from the JUASVI table.",
            "Código y texto con licencia MIT. Se retiraron los nombres de los propietarios de los pozos de la tabla de JUASVI.")}</p>
        </div>
        <div className="panel analysis-panel">
          <h2>{t("Use of AI", "Uso de IA")}</h2>
          <p className="small">{t(
            "Claude (Anthropic) and Codex (OpenAI) helped write code for data extraction, the statistics engine and this app, and draft text. Codex illustrated Datron using official SciTeX poses. The statistical engine supplies the results for the verdict templates. Google Gemini generates the responses in Datron's chat.",
            "Claude (Anthropic) y Codex (OpenAI) ayudaron a escribir el código de extracción de datos, del motor estadístico y de la aplicación, y a redactar textos. Codex ilustró a Datron a partir de poses oficiales de SciTeX. El motor estadístico aporta los resultados que se muestran en las plantillas de veredicto. Google Gemini genera las respuestas del chat de Datron.",
          )} {t("Results generated", "Resultados generados el")} <time dateTime={m.generated_at}>{m.generated_at}</time>.</p>
          <p className="small muted">{t(m.provisional, "Las zonas se definen mediante recuadros provisionales y máscaras satelitales. El equipo recalculará los resultados con los polígonos definitivos.")}</p>
        </div>
      </div>
    </section>
  );
}
