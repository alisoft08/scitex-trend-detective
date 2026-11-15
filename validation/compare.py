# AI-assisted: Claude (Anthropic). Compare our Earth Engine series with the same series rebuilt from NASA's own tools.
"""Build web/public/data/validation.json.

Pairs (our series from Google Earth Engine vs. the independent NASA route):
  ndvi  Z2  MODIS MOD13Q1 v6.1      vs. NASA AppEEARS area request          (validation/raw/appeears_ndvi_z2.csv)
  precip Z4 GPM IMERG Final V07     vs. GES DISC archive via OPeNDAP          (validation/raw/imerg_z4_gesdisc.csv)
  gws   ZW  GLDAS-2.2 CLSM GRACE-DA vs. GES DISC archive via OPeNDAP, sample  (validation/raw/gldas_zw_gesdisc.csv)
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from engine import trend as T  # noqa: E402

RAW = ROOT / "validation" / "raw"
OUT = ROOT / "web" / "public" / "data" / "validation.json"

PAIRS = [
    {"id": "ndvi_Z2", "zone": "Z2", "variable": "ndvi", "file": "appeears_ndvi_z2.csv",
     "label": "Greenness, Villacurí (MODIS NDVI)", "units": "NDVI", "digits": 3,
     "tool": "NASA AppEEARS", "tool_url": "https://appeears.earthdatacloud.nasa.gov/",
     "how": "Area request for MOD13Q1 v6.1 NDVI and pixel reliability over the Villacurí box; cropland mask and "
            "monthly maximum recomputed from the AppEEARS files."},
    {"id": "precip_Z4", "zone": "Z4", "variable": "precip", "file": "imerg_z4_gesdisc.csv",
     "label": "Rain, upper Ica basin (GPM IMERG)", "units": "mm/month", "digits": 1,
     "tool": "NASA GES DISC (OPeNDAP)", "tool_url": "https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGM_07/summary",
     "how": "GPM_3IMERGM V07 monthly files from the GES DISC archive, cut to the basin above 2,500 m with "
            "area weights per 0.1-degree cell."},
    {"id": "gws_ZW", "zone": "ZW", "variable": "gws", "file": "gldas_zw_gesdisc.csv",
     "label": "Groundwater, GLDAS-2.2 model", "units": "mm", "digits": 1,
     "tool": "NASA GES DISC (OPeNDAP)", "tool_url": "https://disc.gsfc.nasa.gov/datasets/GLDAS_CLSM025_DA1_D_2.2/summary",
     "how": "Daily GLDAS_CLSM025_DA1_D 2.2 files from the GES DISC archive, averaged over the water block with exact "
            "cell overlaps. Sample: every January and July, 2004-2024."},
]


def sen_per_decade(dates, values):
    t = np.array([(d.year - 2004) + (d.month - 1) / 12 for d in dates], dtype=float)
    ok = np.isfinite(values)
    b, _ = T.sen_slope(values[ok], t[ok])
    return float(b * 10)


def main():
    ours = pd.read_csv(ROOT / "data" / "processed" / "series_long.csv")
    out = {"generated_with": "validation/compare.py", "pairs": []}
    for p in PAIRS:
        f = RAW / p["file"]
        if not f.exists():
            print("skip", p["id"], "(no file)")
            continue
        nasa = pd.read_csv(f)[["date", "value"]].rename(columns={"value": "nasa"})
        ee = ours[(ours.zone == p["zone"]) & (ours.variable == p["variable"])][["date", "value"]].rename(columns={"value": "ee"})
        m = ee.merge(nasa, on="date", how="inner").dropna()
        m["d"] = pd.to_datetime(m["date"])
        a, b = m["ee"].to_numpy(float), m["nasa"].to_numpy(float)
        diff = b - a
        rec = {k: p[k] for k in ("id", "label", "units", "tool", "tool_url", "how")}
        rec.update({
            "n": int(len(m)),
            "pearson_r": round(float(np.corrcoef(a, b)[0, 1]), 4),
            "mean_ours": round(float(a.mean()), 4),
            "mean_nasa": round(float(b.mean()), 4),
            "bias": round(float(diff.mean()), 4),
            "rmse": round(float(np.sqrt((diff ** 2).mean())), 4),
            "rel_bias_pct": round(float(diff.mean() / abs(a.mean()) * 100), 2) if a.mean() != 0 else None,
            "sen_ours_per_decade": round(sen_per_decade(m["d"], a), 4),
            "sen_nasa_per_decade": round(sen_per_decade(m["d"], b), 4),
            "series": [{"date": d, "ours": round(float(x), 5), "nasa": round(float(y), 5)}
                       for d, x, y in zip(m["date"], a, b)],
        })
        out["pairs"].append(rec)
        print(f"{p['id']:10s} n={rec['n']:3d} r={rec['pearson_r']:.4f} bias={rec['bias']:+.4f} rmse={rec['rmse']:.4f} "
              f"rel={rec['rel_bias_pct']}% sen ours={rec['sen_ours_per_decade']:+.4f} nasa={rec['sen_nasa_per_decade']:+.4f}")
    OUT.write_text(json.dumps(out))
    print("wrote", OUT)


if __name__ == "__main__":
    main()
