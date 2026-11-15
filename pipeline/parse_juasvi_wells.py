"""Parse JUASVI Sep-2025 report, Annex II (per-well static level change 2010-2025).
Drops the USUARIO (owner) column: personal data must not be published."""
import re, sys
import pandas as pd
from pyproj import Transformer

txt = open(sys.argv[1], encoding="utf-8", errors="ignore").read()
pat = re.compile(
    r"(IRHS\.[\w.]+)\s+(I{1,3}|IV|V)\s+.*?\s(\d{6})\s+(\d{7})\s+(\d+)\s+\S+\s+(\d\d/\d\d/\d{4})\s+\S+\s+(\d\d/\d\d/\d{4})"
    r"\s+([\d.]+)\s+([\d.]+)\s+(-?[\d.]+)\s+([\d.]+)\s+(-?[\d.]+)\s+(ASCENSO|DESCENSO)")
rows = [m.groups() for m in pat.finditer(txt)]
cols = ["well_id", "zone", "utm_e", "utm_n", "elev_m", "date_start", "date_end",
        "depth_start_m", "depth_end_m", "change_m", "years", "rate_m_per_yr", "direction"]
df = pd.DataFrame(rows, columns=cols).drop_duplicates("well_id")
for c in ["utm_e", "utm_n", "elev_m", "depth_start_m", "depth_end_m", "change_m", "years", "rate_m_per_yr"]:
    df[c] = pd.to_numeric(df[c])
# Report convention: positive rate = level rising (ASCENSO). Enforce sign from direction label.
df["rate_m_per_yr"] = df["rate_m_per_yr"].abs() * df["direction"].map({"ASCENSO": 1, "DESCENSO": -1})
tr = Transformer.from_crs("EPSG:32718", "EPSG:4326", always_xy=True)  # UTM 18S, WGS84
df["lon"], df["lat"] = tr.transform(df["utm_e"].values, df["utm_n"].values)
df.to_csv(sys.argv[2], index=False)
print("wells parsed:", len(df))
print(df.groupby("zone")["rate_m_per_yr"].agg(["count", "mean", "median",
      lambda s: (s < 0).mean()]).rename(columns={"<lambda_0>": "frac_falling"}).round(2))
print("overall: n=%d mean=%.2f median=%.2f frac falling=%.2f" % (
    len(df), df.rate_m_per_yr.mean(), df.rate_m_per_yr.median(), (df.rate_m_per_yr < 0).mean()))
print("lat range %.2f..%.2f lon range %.2f..%.2f" % (df.lat.min(), df.lat.max(), df.lon.min(), df.lon.max()))
