// AI-assisted: Claude (Anthropic). Every dataset with its version and DOI, the team, and the use of AI.
import type { Manifest } from "./types";

const DATASETS: [string, string, string, string, string, string][] = [
  ["MODIS Terra MOD13Q1 v6.1 (NDVI, 250 m)", "NASA", "Observed", "Greenness series and trend map", "https://doi.org/10.5067/MODIS/MOD13Q1.061", "10.5067/MODIS/MOD13Q1.061"],
  ["MODIS MOD16A2GF v6.1 (evapotranspiration, 500 m)", "NASA", "Estimated", "Water use by crops", "https://doi.org/10.5067/MODIS/MOD16A2GF.061", "10.5067/MODIS/MOD16A2GF.061"],
  ["MODIS Terra MOD11A2 v6.1 (land surface temperature, 1 km)", "NASA", "Observed", "Surface heat", "https://doi.org/10.5067/MODIS/MOD11A2.061", "10.5067/MODIS/MOD11A2.061"],
  ["MERRA-2 single-level diagnostics M2T1NXSLV 5.12.4 (T2M)", "NASA GMAO", "Reanalysis", "Air temperature (regional climate)", "https://doi.org/10.5067/VJAFPLI1CSIV", "10.5067/VJAFPLI1CSIV"],
  ["GLDAS-2.2 Catchment with GRACE assimilation (0.25°)", "NASA GSFC", "Modeled", "Groundwater storage (Ica and the world aquifer atlas)", "https://doi.org/10.5067/TXBMLX370XX8", "10.5067/TXBMLX370XX8"],
  ["GRACE/GRACE-FO JPL Mascon RL06.3Mv04 CRI", "NASA JPL", "Observed", "Total water storage (Ica and the world aquifer atlas)", "https://doi.org/10.5067/TEMSC-3JC634", "10.5067/TEMSC-3JC634"],
  ["GPM IMERG Final Monthly V07", "NASA", "Estimated", "Headwater rain; rain over each atlas aquifer", "https://doi.org/10.5067/GPM/IMERG/3B-MONTH/07", "10.5067/GPM/IMERG/3B-MONTH/07"],
  ["MODIS Terra MOD09CMG v6.1 (surface reflectance, 0.05°)", "NASA", "Observed", "World mosaic on the atlas globe", "https://doi.org/10.5067/MODIS/MOD09CMG.061", "10.5067/MODIS/MOD09CMG.061"],
  ["Landsat 5 TM and Landsat 8/9 OLI, Collection 2 Level-2", "NASA / USGS", "Observed", "Before/after images", "https://www.usgs.gov/landsat-missions/landsat-collection-2", "USGS Collection 2"],
  ["SRTM 30 m elevation", "NASA / NGA", "Observed", "Headwater mask above 2,500 m, map relief", "https://doi.org/10.5067/MEaSUREs/SRTM/SRTMGL1.003", "10.5067/MEaSUREs/SRTM/SRTMGL1.003"],
  ["HydroBASINS level 7", "WWF (not NASA)", "Derived", "Ica River basin outline", "https://www.hydrosheds.org/products/hydrobasins", "hydrosheds.org"],
  ["ERSSTv5 Niño 1+2 and ONI", "NOAA CPC (not NASA)", "Index", "El Niño controls (ICEN-like index computed by us)", "https://www.cpc.ncep.noaa.gov/data/indices/", "cpc.ncep.noaa.gov"],
  ["Piezometric network report, Sept 2025 (87 wells)", "JUASVI (not NASA)", "Field", "Water-table change per well", "https://www.juasvi.com/pdfs/1760390572-informe-rmp-sep2025.pdf", "juasvi.com report"],
];

export function Sources({ m }: { m: Manifest }) {
  return (
    <section className="wrap wide research-page">
      <header className="research-heading"><p className="eyebrow">Data and team</p><h1>Every number has a source</h1>
        <p>NASA data are at the core of every result. Non-NASA sources are marked.</p></header>
      <div className="panel analysis-panel sources-table">
        <div className="scroll-x">
          <table className="data">
            <thead><tr><th>Dataset</th><th>Agency</th><th>Type</th><th>Use</th><th>DOI or link</th></tr></thead>
            <tbody>{DATASETS.map(([name, agency, type, use, href, label]) => (
              <tr key={name}><td>{name}</td><td>{agency}</td><td>{type}</td><td>{use}</td><td><a href={href} target="_blank" rel="noreferrer">{label}</a></td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>
      <div className="sources-cols">
        <div className="panel analysis-panel">
          <h2>Team SciTeX, Lima</h2>
          <p>Manuel (statistics and validity), Moisés (data pipeline), Jaime (zones, field context and story), Alison (app and video).
            NASA Space Apps Challenge 2026, challenge “Be An Earth System Trend Detective!”.</p>
          <p className="small muted">Code and text: MIT license. Well owners' names were removed from the JUASVI table.</p>
        </div>
        <div className="panel analysis-panel">
          <h2>Use of AI</h2>
          <p className="small">Claude (Anthropic) and Codex (OpenAI) helped write code for data extraction, the statistics engine and this app,
            and drafted English text. Codex drew the Datron mascot illustrations from the official SciTeX poses. Every AI-assisted source
            file is marked at the top. The verdict texts come from fixed templates filled with the engine's numbers; no language model
            writes text at runtime. Results generated {m.generated_at}.</p>
          <p className="small muted">{m.provisional}</p>
        </div>
      </div>
    </section>
  );
}
