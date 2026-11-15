# AI-assisted: Claude (Anthropic). Turn the AppEEARS MOD13Q1 files into the Villacurí NDVI series, same recipe as the app.
"""Recipe (identical to pipeline/zones.py + extract_series.py, but on AppEEARS data):
  1. keep pixels with pixel reliability 0 (good) or 1 (marginal)  [EE: SummaryQA <= 1]
  2. cropland = yearly peak NDVI > 0.4 in at least one year 2020-2024
  3. per month: per-pixel maximum of the 16-day composites starting in that month, then mean over cropland pixels

Output: validation/raw/appeears_ndvi_z2.csv (date, value)
"""
from pathlib import Path

import numpy as np
import pandas as pd
import xarray as xr

RAW = Path(__file__).resolve().parent / "raw"
OUT = RAW / "appeears_ndvi_z2.csv"


def main():
    files = sorted((RAW / "appeears").glob("*.nc"))
    ds = xr.open_mfdataset(files, combine="by_coords") if len(files) > 1 else xr.open_dataset(files[0])
    # AppEEARS stores time as calendar objects; the value is the composite start date, as Earth Engine's system:time_start
    ds = ds.assign_coords(time=pd.to_datetime([str(t)[:10] for t in ds["time"].values]))
    ndvi = ds["_250m_16_days_NDVI"]
    rel = ds["_250m_16_days_pixel_reliability"]
    if float(np.nanmax(ndvi.isel(time=slice(0, 5)).values)) > 2:   # undecoded integers
        ndvi = ndvi * 0.0001
    ndvi = ndvi.where((rel >= 0) & (rel <= 1))
    years = ndvi["time"].dt.year
    peak = ndvi.groupby(years).max("time")
    crop = (peak.sel(year=slice(2020, 2024)) > 0.4).any("year")
    print("cropland pixels:", int(crop.sum()), "of", crop.size, flush=True)
    monthly = ndvi.resample(time="MS").max("time")
    series = monthly.where(crop).mean(["lat", "lon"]).to_series()
    df = pd.DataFrame({"date": series.index.strftime("%Y-%m"), "value": series.values})
    df = df[(df.date >= "2004-01") & (df.date <= "2024-12")]
    df.to_csv(OUT, index=False)
    print("wrote", OUT, len(df), "months", int(df.value.notna().sum()), "valid", flush=True)


if __name__ == "__main__":
    main()
