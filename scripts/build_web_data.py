# AI-assisted: Claude (Anthropic). Engine results -> web/public/data/*.json (the data contract).
"""Run the verdict engine on every case and write the JSON files the React app reads.

Inputs:  data/processed/series_long.csv, data/processed/climate_indices.csv,
         data/raw/juasvi_wells_2010_2025.csv, config/zones.geojson, config/verdict.yaml
Outputs: web/public/data/{manifest.json, cases/*.json, contrasts/*.json, wells.geojson,
         zones.geojson, witnesses.json}
"""
import json
import zlib
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from engine import trend as T  # noqa: E402
from engine.verdict import load_config, run_case  # noqa: E402

OUT = ROOT / "web" / "public" / "data"
IDX = pd.date_range("2004-01-01", periods=252, freq="MS")

ZONES = {f["properties"]["id"]: f["properties"] for f in json.loads((ROOT / "config" / "zones.geojson").read_text(encoding="utf-8"))["features"]}
# Comparison zones live outside the Ica map (config/comparison_zones.geojson), so the map keeps its extent.
ZONES.update({f["properties"]["id"]: f["properties"] for f in json.loads((ROOT / "config" / "comparison_zones.geojson").read_text(encoding="utf-8"))["features"]})

VARS = {
    "ndvi": {
        "label": "Vegetation greenness (NDVI)", "short": "Greenness", "units": "NDVI units", "witness": "greenness",
        "definition": "How green the land looks from space. Bare desert is near 0; healthy crops are above 0.6.",
        "source": {"product": "MODIS Terra MOD13Q1", "version": "6.1", "doi": "10.5067/MODIS/MOD13Q1.061",
                   "resolution": "250 m, 16-day composites (monthly maximum)", "agency": "NASA"},
        "data_type": "observed", "digits": 3},
    "et": {
        "label": "Water use by crops and soil (evapotranspiration)", "short": "Water use (ET)", "units": "mm/month",
        "witness": "greenness",
        "definition": "Estimated water transferred from soil and vegetation to the atmosphere.",
        "source": {"product": "MODIS MOD16A2GF", "version": "6.1", "doi": "10.5067/MODIS/MOD16A2GF.061",
                   "resolution": "500 m, 8-day (gap-filled)", "agency": "NASA"},
        "data_type": "estimated", "digits": 1},
    "gws": {
        "label": "Groundwater storage (model)", "short": "Groundwater (GLDAS)", "units": "mm", "witness": "water",
        "definition": "Water held underground, estimated by NASA's GLDAS land model, which is nudged by GRACE "
                      "satellite data. Each model cell is about 28 km wide, larger than the irrigated fields.",
        "source": {"product": "GLDAS-2.2 Catchment model with GRACE data assimilation (GWS_tavg)", "version": "2.2",
                   "doi": "10.5067/TXBMLX370XX8", "resolution": "0.25° (~28 km), daily", "agency": "NASA"},
        "data_type": "modeled", "digits": 1},
    "tws_grace": {
        "label": "Total water storage (GRACE satellites)", "short": "Total water (GRACE)", "units": "mm",
        "witness": "water",
        "definition": "All the water stored in a region (soil, groundwater, rivers, snow), measured by tiny "
                      "changes in Earth's gravity felt by twin satellites. One measurement covers about 300 km.",
        "source": {"product": "GRACE/GRACE-FO JPL Mascon, Coastal Resolution Improvement", "version": "RL06.3Mv04",
                   "doi": "10.5067/TEMSC-3JC634", "resolution": "3° mascons (~330 km), monthly", "agency": "NASA/JPL"},
        "data_type": "observed", "digits": 1},
    "precip": {
        "label": "Rainfall", "short": "Rain", "units": "mm/month", "witness": "climate",
        "definition": "Monthly precipitation estimated by NASA's GPM IMERG multisatellite product, averaged over the study area "
                      "(for Ica, the Andean headwaters where the aquifer's recharge falls).",
        "source": {"product": "GPM IMERG Final Monthly", "version": "V07", "doi": "10.5067/GPM/IMERG/3B-MONTH/07",
                   "resolution": "0.1° (~11 km), monthly", "agency": "NASA"},
        "data_type": "estimated", "digits": 1},
    "lst": {
        "label": "Land surface temperature (daytime)", "short": "Surface heat", "units": "°C", "witness": "heat",
        "definition": "Daytime land surface temperature derived from MODIS thermal observations.",
        "source": {"product": "MODIS Terra MOD11A2 (LST_Day_1km)", "version": "6.1", "doi": "10.5067/MODIS/MOD11A2.061",
                   "resolution": "1 km, 8-day (monthly mean)", "agency": "NASA"},
        "data_type": "observed", "digits": 2},
    "t2m": {
        "label": "Air temperature at 2 m (reanalysis)", "short": "Air temperature", "units": "°C", "witness": "climate",
        "definition": "Temperature of the air near the ground, from NASA's MERRA-2 reanalysis, which blends a weather "
                      "model with observations. Each cell is about 55 km wide, so it shows the regional climate.",
        "source": {"product": "MERRA-2 single-level diagnostics (M2T1NXSLV, T2M)", "version": "5.12.4",
                   "doi": "10.5067/VJAFPLI1CSIV", "resolution": "0.5° x 0.625° (~55 km), hourly (monthly mean)",
                   "agency": "NASA GMAO"},
        "data_type": "modeled", "digits": 2},
}

CASES = [  # (zone, variable, covariates)
    ("Z2", "ndvi", ["icen_like", "oni", "p12"]),
    ("Z1", "ndvi", ["icen_like", "oni", "p12"]),
    ("Z5", "ndvi", ["icen_like", "oni"]),
    ("Z2", "et", ["icen_like", "oni", "p12"]),
    ("Z1", "et", ["icen_like", "oni", "p12"]),
    ("ZW", "gws", ["icen_like", "oni", "p12"]),
    ("ZW", "tws_grace", ["icen_like", "oni", "p12"]),
    ("Z4", "precip", ["icen_like", "oni"]),
    ("Z2", "lst", ["icen_like", "oni"]),
    ("Z1", "lst", ["icen_like", "oni"]),
    ("Z5", "lst", ["icen_like", "oni"]),
    ("ZW", "t2m", ["icen_like", "oni"]),
    ("Z4", "t2m", ["icen_like", "oni"]),
    # Comparison case: same water products and engine, a basin where pumping is far larger (ENSO control only).
    ("ZC", "tws_grace", ["oni"]),
    ("ZC", "gws", ["oni"]),
    # World aquifer atlas: GRACE, GLDAS and IMERG rain over each aquifer box, ENSO control only.
    *[(z, v, ["oni"]) for z in ("ZC", "ZHP", "ZIN", "ZNC", "ZAR", "ZTE", "ZGU")
      for v in ("tws_grace", "gws", "precip", "ndvi", "et", "t2m")
      if (z, v) not in {("ZC", "tws_grace"), ("ZC", "gws")}],
]
CONTRASTS = [("Z2", "ndvi"), ("Z1", "ndvi"), ("Z2", "lst"), ("Z1", "lst")]
CONTRAST_META = {
    "ndvi": ("Greenness gap", "greenness",
             "Field NDVI minus reference NDVI after standardizing each series by calendar month."),
    "lst": ("Heat gap", "heat",
            "Field surface temperature minus reference surface temperature after standardizing by calendar month."),
}

NOTES = {
    "Z5_ndvi": ["The reference uses an NDVI threshold applied throughout the study period."],
    "ZW_gws": ["GLDAS 2.2 estimates groundwater storage at a regional scale and assimilates GRACE observations."],
    "ZW_tws_grace": ["GRACE captures regional total water storage. This analysis does not identify individual contributions within the nominal footprint."],
    "Z1_et": ["The MODIS product estimates evapotranspiration. Pumping and the water source cannot be inferred from it alone."],
    "Z4_precip": ["The trend in precipitation over the upper basin is inconclusive under the configured rule."],
    "Z2_lst": ["Terra's changing overpass time may affect the absolute surface temperature result. The field-reference comparison uses selected masks."],
    "Z1_lst": ["Classic Mann-Kendall and the combined verdict differ. The combined evidence for this series is inconclusive."],
    "Z5_lst": ["The reference is a low-NDVI mask. Its daytime surface temperature trend is inconclusive."],
    "ZC_tws_grace": ["Comparison case outside Peru. The Central Valley spans several GRACE mascons, so the satellite can resolve a loss here that it cannot localise in Ica.",
                     "Published reference: Famiglietti et al. (2011), Geophysical Research Letters 38, L03403, doi:10.1029/2010GL046442."],
    "ZC_gws": ["GLDAS 2.2 assimilates GRACE, so it is not independent of the GRACE record for the same region."],
    "Z4_t2m": ["MERRA-2 is an atmospheric reanalysis with 0.5 by 0.625 degree grid spacing."],
}

NOTES.update({f"{z}_{v}": ["Atlas case: the box around this aquifer system is approximate, not its official boundary. "
                             "Only El Niño (ONI) is used as a control."]
              for z in ("ZHP", "ZIN", "ZNC", "ZAR", "ZTE", "ZGU") for v in ("tws_grace", "gws", "precip", "t2m")})
NOTES.update({f"{z}_{v}": ["Atlas case: cropland pixels from MODIS MCD12Q1 land cover 2020 (IGBP classes 12 and 14) "
                           "inside an approximate box around the aquifer. Only El Niño (ONI) is used as a control."]
              for z in ("ZC", "ZHP", "ZIN", "ZNC", "ZAR", "ZTE", "ZGU") for v in ("ndvi", "et")})
NOTES["ZC_t2m"] = ["Air temperature over the same box as the Central Valley water cases."]
NOTES["ZC_precip"] = ["Rain over the same box as the Central Valley water cases."]

VERDICT_LABEL = {"confirmed": "Confirmed trend", "likely": "Likely trend",
                 "inconclusive": "Inconclusive", "insufficient_data": "Insufficient data"}
CRIT_LABEL = {
    "C0": "Enough data (80% of months, 15+ years)",
    "C1": "Both tests that account for dependence pass (p < 0.05)",
    "C2": "95% range of the slope excludes zero",
    "C3": "Same direction in all nine windows and at least seven significant",
    "C4": "No sign flip and at least 19 significant fits leaving out one year",
    "C5": "Direction and significance hold after covariate adjustment",
    "C6": "Bayesian sign probability (not run)",
}


def fmt(x, d=3):
    if x is None:
        return "n/a"
    if abs(x) >= 100:
        return f"{x:,.0f}"
    return f"{x:.{d}g}" if abs(x) < 1 else f"{x:.{max(1, d - 1)}f}".rstrip("0").rstrip(".")


def fmt_p(p):
    """'p = 0.032' or 'p < 0.001'."""
    if p is None:
        return "p not available"
    if p < 0.001:
        return "p < 0.001"
    return f"p = {p:.3f}"


ZONE_PHRASE = {"Z1": "the Ica Valley", "Z2": "the Villacuri plains", "Z4": "the upper Ica basin",
               "Z5": "the low-NDVI reference", "ZW": "the Ica-Villacuri analysis region",
               "ZC": "California's Central Valley",
               "ZHP": "the High Plains aquifer", "ZIN": "northwest India", "ZNC": "the North China Plain",
               "ZAR": "the Arabian aquifer system", "ZTE": "the Tigris-Euphrates basin", "ZGU": "the Guarani aquifer system"}


def summary_text(case, meta, zone_id):
    tr, verdict = case["trend"], case["verdict"]
    sen = tr["sen_per_decade"]
    lo, hi = tr["sen_ci95_block_bootstrap"]
    estimate = (
        f"The estimated {meta['short'].lower()} slope in {ZONE_PHRASE[zone_id]} is "
        f"{fmt(sen)} {meta['units']} per decade (95% slope interval {fmt(lo)} to {fmt(hi)})."
    )
    conclusion = {
        "confirmed": "It meets the Oasis Paradox evidence criteria under the configured analysis.",
        "likely": "The configured analysis finds suggestive evidence.",
        "inconclusive": "The available evidence leaves the trend inconclusive.",
        "insufficient_data": "Too few valid observations were available for a verdict.",
    }[verdict]
    classic = (
        f" Classic Mann-Kendall flags a significant trend ({fmt_p(tr['p_mk_classic'])})."
        if case["classic_test_says_significant"] and verdict == "inconclusive" else ""
    )
    return f"{estimate} {conclusion}{classic}"


def load_inputs():
    s = pd.read_csv(ROOT / "data" / "processed" / "series_long.csv")
    s["date"] = pd.to_datetime(s["date"] + "-01")
    ci = pd.read_csv(ROOT / "data" / "processed" / "climate_indices.csv", parse_dates=["date"]).set_index("date")
    return s, ci


def get_series(s, zone, var):
    g = s[(s.zone == zone) & (s.variable == var)].set_index("date")["value"]
    return g.reindex(IDX).astype(float)


def covariates(s, ci, names):
    X = pd.DataFrame(index=IDX)
    if "icen_like" in names:
        X["icen_like"] = ci["icen_like"].reindex(pd.date_range("2003-01-01", "2024-12-01", freq="MS"))
    if "oni" in names:
        X["oni"] = ci["oni"].reindex(IDX)
    if "p12" in names:
        p = get_series(s, "Z4", "precip")
        pa = pd.Series(T.monthly_anomaly(p.values, p.index.month.values), index=IDX)
        X["p12"] = pa.rolling(12, min_periods=12).sum()
    full_icen = ci["icen_like"] if "icen_like" in names else None
    return X, full_icen


def case_payload(zone, var, raw, res, meta, kind="case", extra=None):
    zm = ZONES[zone]
    series = []
    for d, v, a in zip(IDX, raw.values, res["anomaly"]):
        series.append({"date": d.strftime("%Y-%m"),
                       "value": None if not np.isfinite(v) else round(float(v), 4),
                       "anomaly": a, "valid": bool(np.isfinite(v))})
    payload = {
        "id": f"{zone}_{var}" if kind == "case" else f"{zone}_vs_Z5_{var}",
        "kind": kind,
        "zone": {"id": zone, "name": zm["name"], "role": zm["role"], "description": zm["description"]},
        "variable": var if kind == "case" else f"{var}_contrast",
        "label": meta["label"], "short": meta["short"], "units": meta["units"], "witness": meta["witness"],
        "definition": meta["definition"], "data_type": meta["data_type"], "source": meta["source"],
        "period": "2004-01/2024-12", "n": res["n"], "n_valid": res["n_valid"],
        "series": series, "trend": res["trend"], "criteria": res["criteria"],
        "criteria_labels": CRIT_LABEL, "verdict": res["verdict"], "verdict_label": VERDICT_LABEL[res["verdict"]],
        "classic_test_says_significant": res["classic_test_says_significant"],
        "summary": summary_text(res, meta, zone),
        "summary_note": "Text generated automatically from the engine results (template, no AI writing at runtime).",
        "notes": [],
    }
    phi = res["trend"].get("phi")
    payload["trend"]["n_eff"] = (round(res["n_valid"] * (1 - phi) / (1 + phi), 1)
                                 if phi is not None and np.isfinite(phi) and -1 < phi < 1 else None)
    if extra:
        payload.update(extra)
    return payload


# Groundwater consumed beyond recharge in the Ica Valley: 286 Mm3 (Salmoral et al., 2020, abstract; checked 2026-11-14).
OVERDRAFT_M3_PER_YR = 286e6
OLYMPIC_POOL_M3 = 2500.0


def et_volume(series_long, zone, case, area_km2):
    """Water evaporated by the crops of one zone: MODIS ET (mm) x cropland area. A lower bound: MOD16 tends to
    underestimate ET on irrigated fields."""
    e = series_long[(series_long.zone == zone) & (series_long.variable == "et")].copy()
    e["y"] = pd.to_datetime(e.date).dt.year
    ann = e.groupby("y").value.agg(["sum", "count"])
    ann = ann[ann["count"] == 12]["sum"]
    a_m2 = area_km2 * 1e6
    vol = lambda mm: mm / 1000 * a_m2 / 1e6                      # mm/yr -> million m3/yr
    decades = (2024 + 11 / 12 - 2004) / 10
    tr = case["trend"]
    change = [c * 12 * decades for c in [tr["sen_per_decade"], *tr["sen_ci95_block_bootstrap"]]]
    early, late = float(ann.loc[2004:2008].mean()), float(ann.loc[2020:2024].mean())
    return {
        "zone": zone, "zone_name": case["zone"]["name"], "verdict": case["verdict"],
        "cropland_km2": area_km2,
        "et_mm_2004_2008": round(early), "et_mm_2020_2024": round(late),
        "mm3_2004_2008": round(vol(early), 1), "mm3_2020_2024": round(vol(late), 1),
        "change_mm_per_yr": round(change[0]), "change_mm3_per_yr": round(vol(change[0]), 1),
        "change_mm3_ci95": [round(vol(change[1]), 1), round(vol(change[2]), 1)],
    }


def impact(grace, gldas, wells_summary, et_blocks=None, irrigated_km2=700):
    """Scale argument: what Ica's overdraft weighs inside one GRACE footprint, and how long GRACE would need to see it."""
    lat = 14.1  # centre of the water block, degrees south
    km_per_deg = 111.32
    side_ns = 3 * km_per_deg * 1e3                                  # JPL mascon: 3-degree cap
    side_ew = 3 * km_per_deg * 1e3 * np.cos(np.radians(lat))
    grace_area_m2 = side_ns * side_ew
    signal_mm = OVERDRAFT_M3_PER_YR / grace_area_m2 * 1000          # mm of water per year
    a = np.array([np.nan if p["anomaly"] is None else p["anomaly"] for p in grace["series"]], dtype=float)
    t = np.arange(len(a)) / 12.0
    tr = grace["trend"]
    resid = a - (tr["intercept"] + tr["sen_per_decade"] / 10.0 * t)
    sigma = float(np.nanstd(resid, ddof=1))
    phi = float(tr["phi"])
    n_star = T.years_to_detect(signal_mm, sigma, phi)
    zone_i = next(z for z in wells_summary["by_zone"] if z["juasvi_zone"] == "I")
    return {
        "overdraft_m3_per_yr": OVERDRAFT_M3_PER_YR,
        "overdraft_source": "Salmoral et al. (2020), Reconciling irrigation demands for agricultural expansion with environmental sustainability: A preliminary assessment for the Ica Valley, Peru. Journal of Cleaner Production 276, 123544, doi:10.1016/j.jclepro.2020.123544",
        "olympic_pools_per_yr": round(OVERDRAFT_M3_PER_YR / OLYMPIC_POOL_M3, -2),
        "grace_footprint_km2": float(round(grace_area_m2 / 1e6, -3)),
        "irrigated_area_km2": irrigated_km2,
        "irrigated_area_note": "Cropland pixels (yearly peak NDVI > 0.4 in 2020-2024) inside the Ica Valley and Villacurí zones.",
        "et_volume": et_blocks or [],
        "et_note": "MODIS MOD16A2GF evapotranspiration times cropland area. Rain is close to zero here, so this is water "
                   "supplied by irrigation (groundwater and, in the Ica Valley, also river water). MOD16 tends to "
                   "underestimate ET on irrigated fields, so these volumes are lower bounds.",
        "signal_mm_per_yr": float(round(signal_mm, 2)),
        "grace_observed_mm_per_yr": round(float(tr["sen_per_decade"]) / 10, 2),
        "implied_other_gain_mm_per_yr": round(float(tr["sen_per_decade"]) / 10 + signal_mm, 1),
        "footprint_to_irrigated": round(grace_area_m2 / 1e6 / irrigated_km2),
        "gldas_cell_km2": round((0.25 * km_per_deg) * (0.25 * km_per_deg * np.cos(np.radians(lat)))),
        "grace_noise_sd_mm": round(sigma, 1),
        "grace_phi": round(phi, 2),
        "grace_years_to_detect": None if n_star is None else round(n_star),
        "grace_years_available": 21,
        "gldas_phi": None if gldas["trend"]["phi"] is None else round(float(gldas["trend"]["phi"]), 2),
        "gldas_n": gldas["n_valid"],
        "gldas_n_eff": gldas["trend"]["n_eff"],
        "zone_i_m_per_decade": round(zone_i["mean_rate_m_per_yr"] * 10, 1),
        "note": "Detection time from Weatherhead et al. (1998) with GRACE's own noise and memory, assuming the "
                "overdraft were the only change. A rough lower bound, not a forecast.",
    }


def build_wells():
    w = pd.read_csv(ROOT / "data" / "raw" / "juasvi_wells_2010_2025.csv")
    feats = []
    for r in w.itertuples():
        feats.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [round(r.lon, 5), round(r.lat, 5)]},
                      "properties": {"well_id": r.well_id, "juasvi_zone": r.zone, "rate_m_per_yr": r.rate_m_per_yr,
                                     "years": r.years, "date_start": r.date_start, "date_end": r.date_end,
                                     "depth_start_m": r.depth_start_m, "depth_end_m": r.depth_end_m}})
    gj = {"type": "FeatureCollection", "features": feats,
          "source": "JUASVI, Informe de monitoreo de la red piezométrica, septiembre 2025, Anexo II "
                    "(owners removed). Field measurements, not NASA data.",
          "url": "https://www.juasvi.com/pdfs/1760390572-informe-rmp-sep2025.pdf"}
    by_zone = []
    for z, g in w.groupby("zone"):
        by_zone.append({"juasvi_zone": z, "n": int(len(g)), "mean_rate_m_per_yr": round(float(g.rate_m_per_yr.mean()), 3),
                        "median_rate_m_per_yr": round(float(g.rate_m_per_yr.median()), 3),
                        "share_falling": round(float((g.rate_m_per_yr < 0).mean()), 3)})
    summary = {"n": int(len(w)), "median_rate_m_per_yr": round(float(w.rate_m_per_yr.median()), 3),
               "mean_rate_m_per_yr": round(float(w.rate_m_per_yr.mean()), 3),
               "share_falling": round(float((w.rate_m_per_yr < 0).mean()), 3), "by_zone": by_zone,
               "period": "2010-2025 (start year varies by well)",
               "note": "Each rate compares the first and last static level of a well; there is no monthly series, "
                       "so no significance test is run on wells."}
    return gj, summary


def witnesses(s):
    """Annual standardized anomalies of the three witnesses for one comparison chart."""
    years = list(range(2004, 2025))
    out = {"years": years, "series": []}
    for zone, var, name in [("Z2", "ndvi", "Greenness, Villacurí (MODIS)"),
                            ("ZW", "tws_grace", "Total water, GRACE (satellite)"),
                            ("ZW", "gws", "Groundwater, GLDAS (model)")]:
        x = get_series(s, zone, var)
        a = pd.Series(T.monthly_anomaly(x.values, x.index.month.values), index=IDX)
        ann = a.groupby(a.index.year).mean()
        z = (ann - ann.mean()) / ann.std(ddof=1)
        out["series"].append({"id": f"{zone}_{var}", "label": name,
                              "values": [None if not np.isfinite(v) else round(float(v), 3) for v in z.reindex(years)]})
    return out


def build_case(zone, var, cov, s, ci, cfg):
    raw = get_series(s, zone, var)
    X, full_icen = covariates(s, ci, cov)
    if full_icen is not None:
        X["icen_like"] = full_icen  # keep earlier months so lags can reach back
    res = run_case(raw, X if len(X.columns) else None, cfg, seed=zlib.crc32(f"{zone}_{var}".encode()))
    payload = case_payload(zone, var, raw, res, VARS[var], extra={"notes": NOTES.get(f"{zone}_{var}", [])})
    return payload


def build_contrast(zone, var, s, ci, cfg):
    a = get_series(s, zone, var)
    b = get_series(s, "Z5", var)
    za = T.standardized_anomaly(a.values, IDX.month.values)
    zb = T.standardized_anomaly(b.values, IDX.month.values)
    d = pd.Series(za - zb, index=IDX)
    X, full_icen = covariates(s, ci, ["icen_like", "oni"])
    X["icen_like"] = full_icen
    res = run_case(d, X, cfg, already_anomaly=True, seed=7)
    short, witness, definition = CONTRAST_META[var]
    meta = {**VARS[var], "label": f"{short}: {ZONES[zone]['name']} minus desert",
            "short": short, "units": "standard deviations", "witness": witness, "definition": definition}
    payload = case_payload(zone, var, d, res, meta, kind="contrast")
    for p in payload["series"]:
        p["value"] = p["anomaly"]
    return payload


def reproduce_case(case_id):
    cfg = load_config()
    s, ci = load_inputs()
    for zone, var, cov in CASES:
        if case_id == f"{zone}_{var}":
            return build_case(zone, var, cov, s, ci, cfg)
    for zone, var in CONTRASTS:
        if case_id == f"{zone}_vs_Z5_{var}":
            return build_contrast(zone, var, s, ci, cfg)
    raise SystemExit(f"Unknown case: {case_id}")


# ---------- world aquifer atlas ----------
# (zone, centre lon/lat, GRACE case, GLDAS case, rain case, published reference)
COUNTRIES = {"ZW": ["Peru"], "ZC": ["United States"], "ZHP": ["United States"], "ZIN": ["India", "Pakistan"],
             "ZNC": ["China"], "ZAR": ["Saudi Arabia", "Jordan"], "ZTE": ["Iraq", "Iran", "Syria", "Turkey"],
             "ZGU": ["Brazil", "Paraguay", "Argentina", "Uruguay"]}
# Field witnesses per atlas zone: (greenness, crop water use, air temperature); Ica uses its Villacurí fields.
FIELD_CASES = {"ZW": ("Z2_ndvi", "Z2_et", "ZW_t2m")}
ATLAS = [
    ("ZW", (-75.85, -14.10), "ZW_tws_grace", "ZW_gws", "Z4_precip", "This project: wells from JUASVI (2025)"),
    ("ZC", (-120.60, 37.65), "ZC_tws_grace", "ZC_gws", "ZC_precip", "Famiglietti et al. (2011)"),
    ("ZHP", (-100.50, 37.75), "ZHP_tws_grace", "ZHP_gws", "ZHP_precip", "Richey et al. (2015); Rodell et al. (2018)"),
    ("ZIN", (74.50, 28.25), "ZIN_tws_grace", "ZIN_gws", "ZIN_precip", "Rodell et al. (2018)"),
    ("ZNC", (116.25, 37.50), "ZNC_tws_grace", "ZNC_gws", "ZNC_precip", "Rodell et al. (2018)"),
    ("ZAR", (42.50, 27.00), "ZAR_tws_grace", "ZAR_gws", "ZAR_precip", "Richey et al. (2015); Rodell et al. (2018)"),
    ("ZTE", (43.50, 34.25), "ZTE_tws_grace", "ZTE_gws", "ZTE_precip", "Rodell et al. (2018)"),
    ("ZGU", (-52.75, -23.50), "ZGU_tws_grace", "ZGU_gws", "ZGU_precip", "Richey et al. (2015)"),
]
EARTH_R_KM = 6371.0


def box_area_km2(coords):
    lons = [c[0] for c in coords]
    lats = [c[1] for c in coords]
    w, e, s, n = min(lons), max(lons), min(lats), max(lats)
    return EARTH_R_KM ** 2 * np.radians(e - w) * abs(np.sin(np.radians(n)) - np.sin(np.radians(s)))


def mascon_area_km2(lat):
    return EARTH_R_KM ** 2 * np.radians(3.0) * abs(np.sin(np.radians(lat + 1.5)) - np.sin(np.radians(lat - 1.5)))


def witness_summary(case):
    tr = case["trend"]
    return {"id": case["id"], "verdict": case["verdict"], "per_decade": tr["sen_per_decade"],
            "ci95": tr["sen_ci95_block_bootstrap"], "units": case["units"],
            "classic_false_alarm": bool(case["classic_test_says_significant"] and case["verdict"] == "inconclusive"),
            "years_to_detect": tr.get("years_to_detect")}


def fields_sentence(ndvi, et):
    up = lambda w: w is not None and w["verdict"] in ("confirmed", "likely") and (w["per_decade"] or 0) > 0
    if up(ndvi) and up(et):
        return "Its cropland is getting greener and using more water (MODIS). "
    if up(ndvi):
        return "Its cropland is getting greener (MODIS). "
    if up(et):
        return "Its cropland is using more water (MODIS). "
    return ""


def atlas_reading(zone, tws, rain, wells_share, ndvi=None, et=None):
    """Template text: what the witnesses say together. 'Points to', never 'proves'."""
    return fields_sentence(ndvi, et) + water_sentence(zone, tws, rain, wells_share)


def water_sentence(zone, tws, rain, wells_share):
    proven = tws["verdict"] in ("confirmed", "likely")
    rain_down = rain["verdict"] in ("confirmed", "likely") and (rain["per_decade"] or 0) < 0
    if proven and tws["per_decade"] < 0:
        cause = ("Rain is also falling, so a drier climate contributes to the loss." if rain_down else
                 "Rain shows no proven decline, so the loss points to groundwater pumping.")
        return f"GRACE sees stored water falling. {cause}"
    if proven and tws["per_decade"] > 0:
        extra = (f" Yet {round(wells_share * 100)}% of monitored wells are falling: the farms are too small for one "
                 "GRACE footprint, so the satellites cannot localise the loss." if zone == "ZW" else "")
        return f"GRACE sees stored water rising.{extra}"
    ytd = tws.get("years_to_detect")
    more = f" A change this size would need about {round(ytd)} years of data to show up." if ytd and ytd < 200 else ""
    return f"No proven change in stored water from space.{more}"


def build_atlas(cases_by_id, wells_share):
    out = []
    for zone, (lon, lat), tws_id, gws_id, rain_id, ref in ATLAS:
        if tws_id not in cases_by_id:
            continue
        geom = (json.loads((ROOT / "config" / ("zones.geojson" if zone == "ZW" else "comparison_zones.geojson"))
                           .read_text(encoding="utf-8")))
        feat = next(f for f in geom["features"] if f["properties"]["id"] == zone)
        area = box_area_km2(feat["geometry"]["coordinates"][0])
        tws, gws, rain = (witness_summary(cases_by_id[i]) for i in (tws_id, gws_id, rain_id))
        out.append({
            "id": zone, "name": "Ica-Villacurí, Peru" if zone == "ZW" else ZONES[zone]["name"],
            "countries": COUNTRIES.get(zone, []),
            "description": ZONES[zone]["description"], "lonlat": [lon, lat], "focus": zone == "ZW",
            "area_km2": round(float(area), -2), "grace_footprints": round(float(area / mascon_area_km2(lat)), 2),
            "tws": tws, "gws": gws, "rain": rain,
            **{k: witness_summary(cases_by_id[i]) for k, i in zip(("ndvi", "et", "t2m"), FIELD_CASES.get(
                zone, (f"{zone}_ndvi", f"{zone}_et", f"{zone}_t2m"))) if i in cases_by_id}, "rain_area": "Andean headwaters" if zone == "ZW" else "aquifer box",
            "reading": None, "reference": ref,
        })
        out[-1]["reading"] = atlas_reading(zone, tws, rain, wells_share, out[-1].get("ndvi"), out[-1].get("et"))
    return out


def main():
    cfg = load_config()
    s, ci = load_inputs()
    (OUT / "cases").mkdir(parents=True, exist_ok=True)
    (OUT / "contrasts").mkdir(parents=True, exist_ok=True)
    manifest_cases = []

    for zone, var, cov in CASES:
        payload = build_case(zone, var, cov, s, ci, cfg)
        (OUT / "cases" / f"{payload['id']}.json").write_text(json.dumps(payload))
        manifest_cases.append({"id": payload["id"], "path": f"cases/{payload['id']}.json", "kind": "case",
                               "zone": zone, "zone_name": ZONES[zone]["name"], "variable": var,
                               "label": VARS[var]["label"], "short": VARS[var]["short"],
                               "witness": VARS[var]["witness"], "data_type": VARS[var]["data_type"],
                               "verdict": payload["verdict"], "sen_per_decade": payload["trend"]["sen_per_decade"],
                               "ci95": payload["trend"]["sen_ci95_block_bootstrap"],
                               "units": VARS[var]["units"]})
        print(f"{payload['id']:16s} {payload['verdict']:18s} sen/dec={payload['trend']['sen_per_decade']} "
              f"p_boot={payload['trend']['p_block_bootstrap']} p_arma={payload['trend']['p_arma']} "
              f"p_classic={payload['trend']['p_mk_classic']} crit={payload['criteria']}", flush=True)

    for zone, var in CONTRASTS:
        payload = build_contrast(zone, var, s, ci, cfg)
        meta = {**VARS[var], "units": payload["units"]}
        (OUT / "contrasts" / f"{payload['id']}.json").write_text(json.dumps(payload))
        manifest_cases.append({"id": payload["id"], "path": f"contrasts/{payload['id']}.json", "kind": "contrast",
                               "zone": zone, "zone_name": ZONES[zone]["name"], "variable": f"{var}_contrast",
                               "label": meta["label"], "short": meta["short"], "witness": payload["witness"],
                               "data_type": "observed", "verdict": payload["verdict"],
                               "sen_per_decade": payload["trend"]["sen_per_decade"],
                               "ci95": payload["trend"]["sen_ci95_block_bootstrap"], "units": meta["units"]})
        print(f"{payload['id']:16s} {payload['verdict']:18s} sen/dec={payload['trend']['sen_per_decade']} "
              f"p_boot={payload['trend']['p_block_bootstrap']} p_arma={payload['trend']['p_arma']}", flush=True)

    wells_gj, wells_summary = build_wells()
    cases_by_id = {c["id"]: json.loads((OUT / c["path"]).read_text()) for c in manifest_cases}
    area = json.loads((ROOT / "data" / "processed" / "cropland_area.json").read_text())
    et_blocks = [et_volume(s, z, cases_by_id[f"{z}_et"], area[z]["km2_at_250m"]) for z in ("Z2", "Z1")]
    irrigated = round(sum(area[z]["km2_at_250m"] for z in ("Z1", "Z2")))
    impact_block = impact(cases_by_id["ZW_tws_grace"], cases_by_id["ZW_gws"], wells_summary, et_blocks, irrigated)
    print("impact", impact_block, flush=True)
    (OUT / "wells.geojson").write_text(json.dumps(wells_gj))
    (OUT / "zones.geojson").write_text((ROOT / "config" / "zones.geojson").read_text())
    (OUT / "witnesses.json").write_text(json.dumps(witnesses(s)))

    manifest = {
        "project": "Oasis Paradox",
        "tagline": "What satellites can and cannot see",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
        "period": "2004-01/2024-12",
        "zones": [{"id": k, **{kk: v[kk] for kk in ("name", "role", "description", "mask")}} for k, v in ZONES.items()],
        "cases": manifest_cases,
        "wells": wells_summary,
        "impact": impact_block,
        "files": {"zones": "zones.geojson", "wells": "wells.geojson", "map": "map.json",
                  "simulation": "simulation.json", "witnesses": "witnesses.json"},
        "verdict_labels": VERDICT_LABEL,
        "atlas": build_atlas(cases_by_id, wells_summary["share_falling"]),
        "atlas_note": "Boxes around each aquifer system are approximate, not official aquifer boundaries. Same NASA "
                      "products, period (2004-2024) and engine everywhere; only El Niño (ONI) is used as a control "
                      "outside Ica.",
        "demo_cases": [
            {"id": "greening", "title": "The greening desert", "case": "Z2_ndvi", "contrast": "Z2_vs_Z5_ndvi",
             "text": "Villacurí's desert plains turned green as irrigated fields spread. Is the trend real, and is it "
                     "irrigation or just a few rainy years?"},
            {"id": "invisible-drop", "title": "The invisible drop", "cases": ["ZW_tws_grace", "ZW_gws"],
             "text": "Wells in the Ica valley keep dropping. Can NASA's water satellites see it from space?"},
            {"id": "cooling", "title": "The cooling oasis", "case": "Z2_lst",
             "text": "The region's air is warming, yet Villacurí's fields keep getting cooler. How can both be true?"},
            {"id": "false-alarm", "title": "The false alarm", "case": "ZW_gws",
             "text": "A classic trend test says Ica's groundwater is rising, with p = 0.000004. "
                     "Our engine cross-examines that claim."},
        ],
        "provisional": "Zones are provisional boxes plus satellite masks; numbers will be recomputed with the "
                       "team's final polygons.",
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print("wrote", OUT)


if __name__ == "__main__":
    if len(sys.argv) == 2:
        print(json.dumps(reproduce_case(sys.argv[1]), indent=2))
    elif len(sys.argv) == 1:
        main()
    else:
        raise SystemExit("Usage: python scripts/build_web_data.py [case_id]")
