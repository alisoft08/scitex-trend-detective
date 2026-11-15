# AI-assisted: Claude (Anthropic). Monthly zonal series from Google Earth Engine.
"""Extract monthly zonal series (2004-01 .. 2024-12) for every zone/variable.

Output: data/processed/series_long.csv (tidy, one row per month/zone/variable).
Missing months stay empty (NaN in pandas, null in JSON); nothing is interpolated.
"""
import os
import sys
import time
from pathlib import Path

import ee
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
import zones as Z  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "processed" / "series_long.csv"
START = "2004-01-01"
N_MONTHS = 252

VARIABLES = {
    # key: (zones, units, data_type, product, scale_m)
    "ndvi": (["Z1", "Z2", "Z5"], "unitless", "observed", "MODIS Terra MOD13Q1 v6.1", 250),
    "et": (["Z1", "Z2"], "mm/month", "estimated", "MODIS MOD16A2GF v6.1", 500),
    "gws": (["ZW", "ZC", "ZHP", "ZIN", "ZNC", "ZAR", "ZTE", "ZGU"], "mm", "modeled", "GLDAS-2.2 CLSM GRACE-DA (GWS_tavg)", 1000),
    "tws_gldas": (["ZW"], "mm", "modeled", "GLDAS-2.2 CLSM GRACE-DA (TWS_tavg)", 1000),
    "tws_grace": (["ZW", "ZC", "ZHP", "ZIN", "ZNC", "ZAR", "ZTE", "ZGU"], "mm", "observed", "GRACE/GRACE-FO JPL Mascon RL06.3Mv04 CRI", 5000),
    "precip": (["Z4", "Z1", "ZC", "ZHP", "ZIN", "ZNC", "ZAR", "ZTE", "ZGU"], "mm/month", "observed", "GPM IMERG Final Monthly V07", 5000),
    "lst": (["Z1", "Z2", "Z5"], "degC", "observed", "MODIS Terra MOD11A2 v6.1 (LST_Day_1km)", 1000),
    "t2m": (["ZW", "Z4"], "degC", "modeled", "MERRA-2 M2T1NXSLV (T2M), monthly mean of hourly", 10000),
}


def collection(var):
    """Return (ImageCollection with a single band 'v', monthly reducer)."""
    if var == "ndvi":
        return Z.modis_ndvi().select(["NDVI"], ["v"]), "max"
    if var == "et":
        def f(img):
            raw = img.select("ET")
            daily = raw.updateMask(raw.lt(32700)).multiply(0.1).divide(8)  # mm/day
            return daily.rename("v").copyProperties(img, ["system:time_start"])
        return ee.ImageCollection("MODIS/061/MOD16A2GF").map(f), "mean_x_days"
    if var == "gws":
        return ee.ImageCollection("NASA/GLDAS/V022/CLSM/G025/DA1D").select(["GWS_tavg"], ["v"]), "mean"
    if var == "tws_gldas":
        return ee.ImageCollection("NASA/GLDAS/V022/CLSM/G025/DA1D").select(["TWS_tavg"], ["v"]), "mean"
    if var == "tws_grace":
        def f(img):
            return img.select("lwe_thickness").multiply(10).rename("v").copyProperties(img, ["system:time_start"])
        return ee.ImageCollection("NASA/GRACE/MASS_GRIDS_V04/MASCON_CRI").map(f), "mean"
    if var == "precip":
        def f(img):
            return img.select("precipitation").multiply(24).rename("v").copyProperties(img, ["system:time_start"])
        return ee.ImageCollection("NASA/GPM_L3/IMERG_MONTHLY_V07").map(f), "mean_x_days"  # mm/day * days
    if var == "lst":
        def f(img):
            lst = img.select("LST_Day_1km").multiply(0.02).subtract(273.15)
            good = img.select("QC_Day").bitwiseAnd(3).lte(1)      # bits 0-1: 0 good, 1 other quality
            return lst.updateMask(good).rename("v").copyProperties(img, ["system:time_start"])
        return ee.ImageCollection("MODIS/061/MOD11A2").map(f), "mean"
    if var == "t2m":
        def f(img):
            return img.select("T2M").subtract(273.15).rename("v").copyProperties(img, ["system:time_start"])
        return ee.ImageCollection("NASA/GSFC/MERRA/slv/2").map(f), "mean"
    raise ValueError(var)


# Atlas aquifer boxes are thousands of km wide: sample them at each product's native grid to stay within quota.
NATIVE_SCALE = {"gws": 27000, "tws_grace": 50000, "precip": 11000}


def monthly_series(var, zone, scale):
    col, how = collection(var)
    region, mask = Z.zone_masks()[zone]
    start = ee.Date(START)
    if zone in Z.AQUIFERS:
        scale = NATIVE_SCALE.get(var, scale)

    def per_month(i):
        d0 = start.advance(ee.Number(i), "month")
        d1 = d0.advance(1, "month")
        days = d1.difference(d0, "day")
        c = col.filterDate(d0, d1)
        img = ee.Image(ee.Algorithms.If(how == "max", c.max(), c.mean()))
        if mask is not None:
            img = img.updateMask(mask)
        val = img.reduceRegion(ee.Reducer.mean(), region, scale, maxPixels=1e11, bestEffort=True).get("v")
        val = ee.Algorithms.If(c.size().gt(0), val, None)
        val = ee.Algorithms.If(
            ee.Algorithms.IsEqual(val, None), None,
            ee.Algorithms.If(how == "mean_x_days", ee.Number(val).multiply(days), val))
        return ee.Feature(None, {"date": d0.format("YYYY-MM"), "value": val})

    rows = []
    for y0 in range(0, N_MONTHS, 12):  # one year per request keeps concurrent aggregations low
        fc = ee.FeatureCollection(ee.List.sequence(y0, min(y0 + 11, N_MONTHS - 1)).map(per_month))
        for attempt in range(8):  # Earth Engine answers 429 "Too many concurrent aggregations" under load
            try:
                rows += [f["properties"] for f in fc.getInfo()["features"]]
                break
            except ee.EEException as e:
                if "concurrent" not in str(e) and "429" not in str(e) or attempt == 7:
                    raise
                time.sleep(5 * (attempt + 1))
    return pd.DataFrame(rows)


def main():
    """python pipeline/extract_series.py [var ...]  (no args: all variables; with args: only those, merged into the CSV)"""
    Z.init()
    only = set(sys.argv[1:])
    zones_only = set(filter(None, os.environ.get("ZONES", "").split(",")))  # e.g. ZONES=ZHP,ZIN to add new zones only
    frames = []
    for var, (zs, units, dtype, product, scale) in VARIABLES.items():
        if only and var not in only:
            continue
        for zone in zs:
            if zones_only and zone not in zones_only:
                continue
            df = monthly_series(var, zone, scale)
            df["zone"], df["variable"], df["units"], df["data_type"], df["source"] = zone, var, units, dtype, product
            n_ok = df["value"].notna().sum()
            print(f"{var:10s} {zone}: {n_ok}/{len(df)} valid months", flush=True)
            frames.append(df)
    out = pd.concat(frames, ignore_index=True)[["date", "zone", "variable", "value", "units", "data_type", "source"]]
    if only and OUT.exists():
        old = pd.read_csv(OUT)
        done = set(zip(out.variable, out.zone))
        keep = ~pd.Series([(v, z) in done for v, z in zip(old.variable, old.zone)], index=old.index)
        out = pd.concat([old[keep], out], ignore_index=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(OUT, index=False)
    print("wrote", OUT, len(out), "rows")


if __name__ == "__main__":
    main()
