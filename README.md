# Oasis Paradox

**What satellites can and cannot see.** A trend detective for Ica, Peru (NASA Space Apps Challenge 2026, challenge
*Be An Earth System Trend Detective!*, team SciTeX, Lima).

From space, Ica's desert keeps getting greener. Its wells keep dropping. NASA's water satellites cannot see that drop
at this scale, and a classic trend test would have fooled us twice. Oasis Paradox cross-examines three witnesses
(greenness from space, water from space, wells in the field) with statistics that stay honest when each month
resembles the last. A world aquifer atlas runs the same engine on eight irrigated aquifers to show where NASA's GRACE
satellites can see an aquifer drain, and why they cannot in Ica.

> Status: MVP. Zones are provisional boxes with satellite masks; numbers will be recomputed with the team's final polygons.

## The five steps of the challenge, in the app

| Challenge step | Where in Oasis Paradox |
| --- | --- |
| 1. Decide on the data variable(s) | Up to seven NASA witnesses per aquifer (GRACE, GLDAS, GPM IMERG, MODIS NDVI, ET and surface temperature, MERRA-2), each with a plain definition and data type |
| 2. Choose a region | The globe and its search: eight irrigated aquifers; in Ica, fields, desert, headwaters and the water block |
| 3. Select the time period | "Choose the time period" in every case file: any period of 10 years or more between 2004 and 2024 (precomputed in Python, `engine/periods.py`) |
| 4. Create the time series and examine it | The monthly record with its trend line, annual sparklines, and the question "First look: does this series appear to have a trend?" before the verdict |
| 5. Analyze the trend for significance | Mann-Kendall with a moving-block bootstrap and a regression with ARMA errors, 95% interval, windows, jackknife, controls, the false-alarm warning and the trend lab |

## What it answers

| Challenge question | Where |
| --- | --- |
| What is changing? | Variable cards with plain definitions and data type (observed / modeled / estimated) |
| Where? | Per-pixel NDVI trend map (MODIS, 250 m), zones, 87 field wells, and a 3D globe of eight aquifers |
| How much? | Theil-Sen slope per decade with a block-bootstrap 95% range |
| Is it significant? | A verdict (confirmed / likely / inconclusive / insufficient data) with every criterion shown, next to what a classic test would have said |

## Current results (2004–2024, provisional zones)

Generated from `web/public/data/manifest.json` (2026-11-15T14:39Z).

| Case | Verdict | Sen slope per decade | 95% range (block bootstrap) |
| --- | --- | --- | --- |
| Vegetation greenness (NDVI), Villacurí plains | Confirmed trend | +0.13 NDVI | 0.124 to 0.136 |
| Vegetation greenness (NDVI), Ica Valley | Confirmed trend | +0.0353 NDVI | 0.0289 to 0.0419 |
| Vegetation greenness (NDVI), Desert control | Likely trend | +0.00112 NDVI | 0.000449 to 0.00179 |
| Water use by crops and soil (evapotranspiration), Villacurí plains | Likely trend | +4.47 mm/month | 2.08 to 6.84 |
| Water use by crops and soil (evapotranspiration), Ica Valley | Inconclusive | +0.687 mm/month | -1.46 to 2.94 |
| Groundwater storage (model), Ica-Villacurí water block | Inconclusive | +1.66 mm | -0.0477 to 3.54 |
| Total water storage (GRACE satellites), Ica-Villacurí water block | Confirmed trend | +14.2 mm | 8.72 to 19.6 |
| Rainfall, Upper Ica basin | Inconclusive | -0.65 mm/month | -2.03 to 0.669 |
| Land surface temperature (daytime), Villacurí plains | Confirmed trend | -2.28 °C | -2.79 to -1.85 |
| Land surface temperature (daytime), Ica Valley | Inconclusive | -0.533 °C | -1.12 to 0.0233 |
| Land surface temperature (daytime), Desert control | Inconclusive | -0.124 °C | -0.574 to 0.323 |
| Air temperature at 2 m (reanalysis), Ica-Villacurí water block | Likely trend | +0.438 °C | 0.225 to 0.67 |
| Air temperature at 2 m (reanalysis), Upper Ica basin | Confirmed trend | +0.479 °C | 0.282 to 0.679 |
| Greenness gap: Villacurí plains minus desert, Villacurí plains | Confirmed trend | +0.947 SD | 0.613 to 1.26 |
| Greenness gap: Ica Valley minus desert, Ica Valley | Likely trend | +0.62 SD | 0.307 to 0.948 |
| Heat gap: Villacurí plains minus desert, Villacurí plains | Confirmed trend | -0.968 SD | -1.11 to -0.818 |
| Heat gap: Ica Valley minus desert, Ica Valley | Confirmed trend | -0.337 SD | -0.51 to -0.177 |
| Wells, JUASVI 2010–2025 (87) | 69% falling | median -0.24 m/yr | no monthly series, no test |

Monte Carlo (600 replicates, AR(1) noise with φ = 0.9, no trend): classic Mann-Kendall false-positive rate 66%;
our consensus rule (block-bootstrap Mann-Kendall AND regression with AR errors) 7%.

### World aquifer atlas (GRACE, GLDAS, IMERG; 2004–2024)

| Aquifer | GRACE footprints covered | Total water (GRACE) | Groundwater (GLDAS) | Rain (IMERG) |
| --- | --- | --- | --- | --- |
| Ica-Villacurí, Peru | 0.03 | Confirmed, +1.4 mm/yr (+0.9 to +2.0) | Inconclusive, +0.2 mm/yr (-0.0 to +0.4) | Inconclusive |
| Central Valley, California | 2.12 | Confirmed, -13.4 mm/yr (-19.0 to -8.3) | Inconclusive, -2.7 mm/yr (-5.5 to +0.1) | Inconclusive |
| High Plains (Ogallala), United States | 10.21 | Likely, -5.5 mm/yr (-9.5 to -1.5) | Inconclusive, -2.1 mm/yr (-5.5 to +1.1) | Inconclusive |
| Northwest India (Punjab, Haryana, Rajasthan) | 8.49 | Confirmed, -22.3 mm/yr (-26.3 to -18.1) | Confirmed, -4.4 mm/yr (-5.3 to -3.5) | Inconclusive |
| North China Plain | 4.33 | Confirmed, -15.9 mm/yr (-20.6 to -11.3) | Confirmed, -7.2 mm/yr (-9.8 to -4.5) | Likely |
| Arabian aquifer system (Saq), Saudi Arabia | 9.77 | Confirmed, -9.1 mm/yr (-9.9 to -8.3) | Confirmed, -1.1 mm/yr (-1.8 to -0.5) | Inconclusive |
| Tigris-Euphrates basin | 10.38 | Confirmed, -8.7 mm/yr (-12.9 to -5.2) | Confirmed, -3.4 mm/yr (-5.5 to -1.6) | Inconclusive |
| Guarani aquifer system, South America | 19.11 | Inconclusive, -2.2 mm/yr (-7.1 to +2.6) | Inconclusive, -3.2 mm/yr (-7.2 to +0.8) | Inconclusive |

Boxes are approximate, not official aquifer boundaries; outside Ica only El Niño (ONI) is used as a control.
Aquifers chosen from Richey et al. (2015) and Rodell et al. (2018).

## The app

The app shows the **Expert** level (team decision, 15 Nov 2026). The Explorer and Analyst levels and the Explorer
field lab remain in the code for reference. The app does not display a reading-level selector.

- **Home: the world aquifer globe.** A large 3D globe on a MODIS mosaic over a black background, search by aquifer or
  country, and satellite mini cards. Below: the aquifer comparison table and "Who it is for".
- **One page per aquifer** (`#aquifer?id=ZIN`, opened from the globe or the overview table): Ica's landing view for
  every aquifer (2004 outside the lens, 2024 inside; the lens tours the places where the surface changed most), the
  reading, up to seven NASA witnesses with annual sparklines, and "Analyze" links that open each witness's case file, a
  comparison with another aquifer, the trend lab and the sources. The bar's Detective desk and Compare open the
  aquifer you were viewing. Each page also has Ica's tools: impact volumes (GRACE trend x area; crop
  evapotranspiration x cropland), an evidence map (per-pixel greenness trend), cropland against natural land in the
  same box (greenness and heat gaps, like Ica's fields against the desert) and guided cases.
- **Ica deep dive** (`#ica`): the detective's lens over Ica (Landsat 2004 vs 2024) and the impact band; Ica is the
  only aquifer with field wells.
- **Field lab** (hidden with the Explorer level): four instruments and a field notebook in four languages.
- **Detective desk:** pick a place and a NASA variable; each case file shows the verdict, the series, the false-alarm
  warning, years to detect when unproven, and (Expert) windows, jackknife and a reproduction ZIP.
- **Trend lab, Compare cases** and **Sources**; the Ica evidence map (per-pixel greenness trend and field wells) opens
  from the Ica deep dive.

Direct links (hash): `#atlas` is on the home page; `#investigate?case=ZIN_tws_grace`, `#map`, `#method`, `#compare?left=ZW_tws_grace&right=ZC_tws_grace`, `#sources`.

Python precomputes the evidence into `web/public/data/*.json`, and the browser draws it from those static files. Datron is available on the aquifer pages and research tools. It sends the conversation and a compact summary of the active screen to `/api/chat`. In Detective desk the summary includes the loaded case, selected period and chart controls. The server adds the app manual.

## How to run

```bash
python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/earthengine authenticate              # needs a noncommercial Earth Engine Cloud project
.venv/bin/python pipeline/export_zones.py         # config/zones.geojson
.venv/bin/python pipeline/extract_series.py       # monthly zonal series (NDVI, ET, LST, rain, GLDAS, GRACE, MERRA-2 T2M)
.venv/bin/python pipeline/climate_indices.py      # NOAA ONI + Niño 1+2 -> data/processed/climate_indices.csv
.venv/bin/python pipeline/cropland_area.py        # cropland area per zone -> data/processed/cropland_area.json
.venv/bin/python pipeline/parse_juasvi_wells.py   # JUASVI report -> wells (owner names removed)
.venv/bin/python pipeline/images.py               # Landsat before/after, NDVI trend map
.venv/bin/python pipeline/images.py hero          # hero images 2004 / 2024
.venv/bin/python scripts/simulate.py 600 300      # Monte Carlo -> web/public/data/simulation.json
.venv/bin/python scripts/lab_grid.py              # "Put the tests on trial" lab -> web/public/data/lab.json
.venv/bin/python scripts/build_web_data.py        # verdict engine -> web/public/data/*.json (about 25 s)
.venv/bin/python -m pytest                        # synthetic-series tests of the engine

# optional: rebuild three series with NASA's own tools (needs Earthdata login in ~/.netrc)
.venv/bin/python validation/appeears_ndvi.py && .venv/bin/python validation/appeears_process.py
.venv/bin/python validation/imerg_gesdisc.py && .venv/bin/python validation/gldas_gesdisc.py
.venv/bin/python validation/compare.py            # -> web/public/data/validation.json

cd web && npm ci && npm run dev                   # React app (Vite), Node 20+
```

Earth Engine project id is set in `pipeline/zones.py` (`PROJECT`). Credentials stay on the laptop (never committed).

To enable the assistant locally, copy `web/.env.example` to the ignored `web/.env.local`, set `GEMINI_API_KEY` with a key from Google AI Studio, and restart `npm run dev`. Open `#investigate?case=Z2_lst` and select **Ask Oasis**. The server defaults to Gemini 3.5 Flash-Lite (`gemini-3.5-flash-lite`). Set `GEMINI_MODEL` in the server environment to override it.

## Deploy on Vercel (for Alison)

1. Push this repository to GitHub (public, MIT license).
2. In Vercel: **Add New… > Project > Import** the repository.
3. **Root Directory: `web`**. Framework preset: Vite (detected). Build command `npm run build`, output `dist` (also set in `web/vercel.json`). Node.js 20.x.
4. Set `GEMINI_API_KEY` in the Vercel Environment Variables for the deployments that should enable the assistant. It is read only by the server function. The science data and brand assets are served as static files.
5. Deploy, then open the URL in a private window and check the globe and the aquifer search on the home page, `#investigate` and `#sources`.
6. Optional: request a FortiGuard Web Filter category for the new domain so judges' networks do not block it.

Earth Engine and Earthdata credentials are never needed by the site and never go into the repository (`.netrc`, `.env` and keys are in `.gitignore`).

## Repository layout

```text
config/        zones.geojson, comparison_zones.geojson (atlas), verdict.yaml (pre-registered thresholds)
pipeline/      Earth Engine extraction, climate indices, zones, map images, yearly Landsat, world mosaic, aquifer close-ups and 2004/2024 pairs, JUASVI parser
engine/        trend tests and the verdict rule (Python only)
tests/         synthetic series with known slope
scripts/       Monte Carlo simulation, build of the web data contract
data/          raw/ (not committed), processed/ (small CSV)
validation/    rebuilds three series with NASA AppEEARS and GES DISC, and compares them
brand-drafts/  prompts used for the AI-generated Datron images (images themselves live in web/public/brand)
web/           Vite + React + TypeScript app; public/data/ is the JSON contract
```

## Data

See [REFERENCES.md](REFERENCES.md). NASA data at the core: MODIS MOD13Q1, MOD16A2GF, MOD11A2 and MOD09CMG, MERRA-2, GLDAS-2.2, GRACE/GRACE-FO
JPL mascons, GPM IMERG, Landsat, SRTM. Non-NASA support: NOAA CPC El Niño indices, WWF HydroBASINS, JUASVI well report.

## Use of AI

See [AI_USAGE.md](AI_USAGE.md). Every AI-assisted source file is marked at the top.

## Team

Manuel (statistics, validity), Moisés (data pipeline), Jaime (zones, field context, story), Alison (app, video).

## License

MIT. See [LICENSE](LICENSE).
