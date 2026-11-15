# AI-assisted: Claude (Anthropic). El Nino covariates from NOAA CPC (not NASA data; cited).
"""Download ONI and Nino 1+2 (ERSSTv5) and build an ICEN-like coastal index.

ICEN-like = centered 3-month running mean of the Nino 1+2 SST anomaly
(1991-2020 climatology), following the ENFEN definition of the ICEN.
It is NOT the official ENFEN ICEN.
"""
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "processed" / "climate_indices.csv"
URL_NINO = "https://www.cpc.ncep.noaa.gov/data/indices/ersst5.nino.mth.91-20.ascii"
URL_ONI = "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt"
SEASONS = ["DJF", "JFM", "FMA", "MAM", "AMJ", "MJJ", "JJA", "JAS", "ASO", "SON", "OND", "NDJ"]


def fetch(url, name):
    RAW.mkdir(parents=True, exist_ok=True)
    txt = requests.get(url, timeout=60).text
    (RAW / name).write_text(txt)
    return txt


def main():
    nino = fetch(URL_NINO, "ersst5_nino.txt").splitlines()
    rows = [l.split() for l in nino[1:] if l.strip()]
    df = pd.DataFrame([(int(r[0]), int(r[1]), float(r[3])) for r in rows], columns=["year", "month", "nino12_anom"])
    df["date"] = pd.to_datetime(dict(year=df.year, month=df.month, day=1))
    df = df.set_index("date")[["nino12_anom"]]
    df["icen_like"] = df["nino12_anom"].rolling(3, center=True).mean()

    oni = fetch(URL_ONI, "oni.txt").splitlines()
    recs = []
    for l in oni[1:]:
        p = l.split()
        if len(p) == 4 and p[0] in SEASONS:
            recs.append((pd.Timestamp(int(p[1]), SEASONS.index(p[0]) + 1, 1), float(p[3])))
    oni_s = pd.Series(dict(recs), name="oni")
    out = df.join(oni_s, how="left")
    out.loc["2000-01-01":].to_csv(OUT, index_label="date")
    print(out.loc["2017-01-01":"2017-06-01"].round(2))
    print(out.loc["2023-02-01":"2023-07-01"].round(2))


if __name__ == "__main__":
    main()
