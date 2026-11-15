# References

## NASA data

| Dataset | Version | DOI / link | Use |
| --- | --- | --- | --- |
| MODIS Terra Vegetation Indices 16-Day L3 250 m (MOD13Q1) | 6.1 | https://doi.org/10.5067/MODIS/MOD13Q1.061 | NDVI series and per-pixel trend map |
| MODIS Terra Net Evapotranspiration Gap-Filled 8-Day 500 m (MOD16A2GF) | 6.1 | https://doi.org/10.5067/MODIS/MOD16A2GF.061 | Evapotranspiration |
| GLDAS Catchment Land Surface Model L4 daily 0.25° GRACE-DA1 (GLDAS_CLSM025_DA1_D) | 2.2 | https://doi.org/10.5067/TXBMLX370XX8 | Groundwater storage (GWS_tavg), total water (TWS_tavg); also the Central Valley and the atlas aquifers; its land grid masks the oceans on the globe |
| JPL GRACE and GRACE-FO Mascon, Coastal Resolution Improvement (CRI) | RL06.3Mv04 | https://doi.org/10.5067/TEMSC-3JC634 | Total water storage (Ica, Central Valley and the six atlas aquifers) |
| GPM IMERG Final Precipitation L3 Monthly | V07 | https://doi.org/10.5067/GPM/IMERG/3B-MONTH/07 | Rain in the upper Ica basin and over each atlas aquifer |
| MODIS Terra Surface Reflectance Daily L3 Global 0.05° CMG (MOD09CMG) | 6.1 | https://doi.org/10.5067/MODIS/MOD09CMG.061 | World mosaic (April-September 2024) on the atlas globe |
| Landsat 5 TM, Landsat 7 ETM+ and Landsat 8/9 OLI, Collection 2 Level-2 (NASA/USGS) | C2 L2 | https://www.usgs.gov/landsat-missions/landsat-collection-2 | Before/after true-color images; one yearly picture 2004-2024 for the Explorer time machine (Landsat 7 only for 2012) |
| MODIS Terra Land Surface Temperature 8-Day L3 1 km (MOD11A2) | 6.1 | https://doi.org/10.5067/MODIS/MOD11A2.061 | Daytime surface temperature of fields and desert |
| MERRA-2 single-level diagnostics, hourly (M2T1NXSLV) | 5.12.4 | https://doi.org/10.5067/VJAFPLI1CSIV | Air temperature at 2 m (regional climate) |
| SRTM Global 1 arc-second (NASA/NGA) | 3.0 | https://doi.org/10.5067/MEaSUREs/SRTM/SRTMGL1.003 | Headwater mask above 2,500 m; shaded relief under the trend map and under the GRACE footprint map (Explorer) |

All accessed through Google Earth Engine (noncommercial project `oasis-paradox`), November 2026.

**Validation with the challenge's NASA tools** (`validation/`): MOD13Q1 v6.1 re-extracted with NASA AppEEARS (https://appeears.earthdatacloud.nasa.gov/); GPM_3IMERGM V07 and GLDAS_CLSM025_DA1_D 2.2 read from the NASA GES DISC archive through Earthdata Cloud OPeNDAP (https://opendap.earthdata.nasa.gov/), with Earthdata Login. The challenge's "Hydrology Time Series" resource (Hydrology Data Rods) now redirects to a GES DISC retirement notice.

## Other data (not NASA)

| Dataset | Provider | Link | Use |
| --- | --- | --- | --- |
| ERSSTv5 Niño indices (1991-2020 base) | NOAA Climate Prediction Center | https://www.cpc.ncep.noaa.gov/data/indices/ersst5.nino.mth.91-20.ascii | Niño 1+2 anomaly; we compute an ICEN-like 3-month running mean (not the official ENFEN ICEN) |
| Oceanic Niño Index (ONI) | NOAA CPC | https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt | Central-Pacific El Niño control |
| HydroBASINS level 7 | WWF HydroSHEDS (via Earth Engine `WWF/HydroSHEDS/v1/Basins/hybas_7`) | https://www.hydrosheds.org/products/hydrobasins | Ica River basin outline |
| Informe de monitoreo de la red piezométrica, septiembre 2025, Anexo II | JUASVI (Junta de Usuarios de Aguas Subterráneas del Valle de Ica) | https://www.juasvi.com/pdfs/1760390572-informe-rmp-sep2025.pdf | Water-table change of 87 wells (owners removed) |

## Methods

- Acker, J. G., McMahon, E., Shen, S., Hearty, T., Casey, N. (2009). Time-series analysis of remotely-sensed SeaWiFS chlorophyll in river-influenced coastal regions. *EARSeL eProceedings* 8(2). NASA NTRS 20090042747, https://ntrs.nasa.gov/citations/20090042747 (the challenge's example of a trend significance test; our engine extends it to autocorrelated series).

- Theil, H. (1950). A rank-invariant method of linear and polynomial regression analysis. *Proc. KNAW* 53.
- Sen, P. K. (1968). Estimates of the regression coefficient based on Kendall's tau. *JASA* 63(324), 1379-1389.
- Mann, H. B. (1945). Nonparametric tests against trend. *Econometrica* 13, 245-259.
- Kendall, M. G. (1975). *Rank Correlation Methods*. Griffin.
- Künsch, H. R. (1989). The jackknife and the bootstrap for general stationary observations. *Ann. Statist.* 17(3), 1217-1241.
- Hamed, K. H., Rao, A. R. (1998). A modified Mann-Kendall trend test for autocorrelated data. *J. Hydrol.* 204, 182-196.
- von Storch, H. (1995). Misuses of statistical analysis in climate research. In *Analysis of Climate Variability*, Springer.
- Weatherhead, E. C. et al. (1998). Factors affecting the detection of trends. *J. Geophys. Res.* 103(D14), 17149-17161.
- Benjamini, Y., Hochberg, Y. (1995). Controlling the false discovery rate. *JRSS B* 57(1), 289-300.
- Li, B. et al. (2019). Global GRACE data assimilation for groundwater and drought monitoring. *Water Resour. Res.* 55, 7564-7586.
- Watkins, M. M. et al. (2015). Improved methods for observing Earth's time variable mass distribution with GRACE using spherical cap mascons. *JGR Solid Earth* 120. doi:10.1002/2014JB011547
- Wiese, D. N., Landerer, F. W., Watkins, M. M. (2016). Quantifying and reducing leakage errors in the JPL RL05M GRACE mascon solution. *Water Resour. Res.* 52. doi:10.1002/2016WR019344

## Context

- Salmoral, G., Viñarta Carbó, A., Zegarra, E., Knox, J. W., Rey, D. (2020). Reconciling irrigation demands for agricultural expansion with environmental sustainability: A preliminary assessment for the Ica Valley, Peru. *Journal of Cleaner Production* 276, 123544. https://doi.org/10.1016/j.jclepro.2020.123544 (open access, CC BY). Abstract: 286 Mm³ of groundwater consumed under unsustainable conditions (exceeding recharge), out of a 483 Mm³ blue water footprint; checked 2026-11-14.
- Famiglietti, J. S., Lo, M., Ho, S. L., et al. (2011). Satellites measure recent rates of groundwater depletion in California's Central Valley. *Geophysical Research Letters* 38, L03403. https://doi.org/10.1029/2010GL046442 (published reference for the Central Valley comparison case; DOI checked 2026-11-15).
- Richey, A. S., Thomas, B. F., Lo, M.-H., et al. (2015). Quantifying renewable groundwater stress with GRACE. *Water Resources Research* 51, 5217-5238. https://doi.org/10.1002/2015WR017349 (the 37 largest aquifer systems; source for choosing the atlas aquifers; DOI checked 2026-11-15).
- Rodell, M., Famiglietti, J. S., Wiese, D. N., et al. (2018). Emerging trends in global freshwater availability. *Nature* 557, 651-659. https://doi.org/10.1038/s41586-018-0123-1 (GRACE hotspots used to choose the atlas aquifers; DOI checked 2026-11-15).
- Mendoza et al. (2022). GRACE and TRMM over Lima-Callao. LACCEI 2022. https://laccei.org/LACCEI2022-BocaRaton/full_papers/FP275.pdf
- OECD (2021). *Gobernanza del agua en Perú*.

## Software (licenses)

| Library | License |
| --- | --- |
| earthengine-api | Apache-2.0 |
| numpy, pandas, scipy, statsmodels | BSD-3-Clause |
| pymannkendall (Hussain & Mahmud, 2019, JOSS 4(39), 1556) | MIT |
| pyproj | MIT |
| Pillow | MIT-CMU (HPND) |
| PyYAML | MIT |
| pytest | MIT |
| xarray, netCDF4, h5netcdf, requests (validation scripts) | Apache-2.0, MIT, BSD-3-Clause, Apache-2.0 |
| React, React DOM | MIT |
| KaTeX 0.16.11 (math rendered as MathML) | MIT |
| Vite, @vitejs/plugin-react | MIT |
| Vitest 2.1.8 (tests of the Explorer field-lab helpers) | MIT |
| fflate 0.8.2 (reproduction ZIP) | MIT |
| TypeScript | Apache-2.0 |
| Font: Montserrat (Google Fonts), SciTeX brand typeface | SIL Open Font License 1.1 |
