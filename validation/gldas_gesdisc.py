# AI-assisted: Claude (Anthropic). Independent GLDAS-2.2 groundwater series straight from NASA GES DISC.
"""Monthly GLDAS-2.2 CLSM GRACE-DA groundwater storage (GWS_tavg) for the Ica-Villacurí water block (ZW),
read day by day from the GES DISC archive through Earthdata Cloud OPeNDAP.

The product is daily, so this check uses a systematic sample: every January and July 2004-2024 (42 months,
about 1,280 daily files). Cell weights are the exact overlap of each 0.25-degree cell with the ZW box.

Output: validation/raw/gldas_zw_gesdisc.csv (date, value in mm)
Credentials: ~/.netrc (Earthdata Login).
"""
import calendar
import hashlib
import threading
import io
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import pandas as pd
import requests
import h5py

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "validation" / "raw" / "gldas_zw_gesdisc.csv"
COLLECTION = "C1700900796-GES_DISC"     # GLDAS_CLSM025_DA1_D v2.2 (CMR concept id)
OPENDAP = "https://opendap.earthdata.nasa.gov/collections/{c}/granules/{g}.dap.nc4?dap4.ce={ce}"
WATER_BLOCK = [-76.08, -14.45, -75.62, -13.80]
LAT0, LON0, STEP = -59.875, -179.875, 0.25  # GLDAS 0.25-degree grid (cell centres)


def overlap_weights():
    w, s, e, n = WATER_BLOCK
    i0, i1 = int(np.floor((w - (LON0 - STEP / 2)) / STEP)), int(np.floor((e - (LON0 - STEP / 2)) / STEP))
    j0, j1 = int(np.floor((s - (LAT0 - STEP / 2)) / STEP)), int(np.floor((n - (LAT0 - STEP / 2)) / STEP))
    wt = np.zeros((j1 - j0 + 1, i1 - i0 + 1))
    for a, j in enumerate(range(j0, j1 + 1)):
        lo, hi = LAT0 + j * STEP - STEP / 2, LAT0 + j * STEP + STEP / 2
        fy = max(0.0, min(hi, n) - max(lo, s))
        for b, i in enumerate(range(i0, i1 + 1)):
            lo2, hi2 = LON0 + i * STEP - STEP / 2, LON0 + i * STEP + STEP / 2
            wt[a, b] = fy * max(0.0, min(hi2, e) - max(lo2, w))
    return (i0, i1, j0, j1), wt


_local = threading.local()


def _session():
    if not hasattr(_local, "s"):
        _local.s = requests.Session()
    return _local.s


def fetch_bytes(day, idx):
    """Threads only move bytes; HDF5 parsing happens later, one file at a time."""
    i0, i1, j0, j1 = idx
    g = f"GLDAS_CLSM025_DA1_D.2.2:GLDAS_CLSM025_DA1_D.A{day:%Y%m%d}.022.nc4"
    ce = f"/GWS_tavg[0][{j0}:{j1}][{i0}:{i1}]"
    url = OPENDAP.format(c=COLLECTION, g=requests.utils.quote(g, safe=""), ce=requests.utils.quote(ce, safe=""))
    last = ""
    for attempt in range(6):
        try:
            r = _session().get(url, timeout=120)
            if r.status_code == 200 and r.content[:4] == b"\x89HDF":
                return r.content
            last = f"HTTP {r.status_code}"
        except requests.RequestException as ex:
            last = type(ex).__name__
        time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"{day:%Y-%m-%d}: {last}")


def parse(content):
    with h5py.File(io.BytesIO(content), "r") as f:
        v = f["GWS_tavg"][0].astype(float)
    return np.where(v < -9000, np.nan, v)


def main():
    idx, wt = overlap_weights()
    print("cells (lat x lon)", wt.shape, "weights", np.round(wt / wt.sum(), 3).tolist(), flush=True)
    fetch_bytes(pd.Timestamp("2004-01-01"), idx)   # sets the Earthdata Login cookie in this thread's session
    months = [(y, m) for y in range(2004, 2025) for m in (1, 7)]
    days = [pd.Timestamp(y, m, d) for y, m in months for d in range(1, calendar.monthrange(y, m)[1] + 1)]

    def grab(day):
        try:
            return day, fetch_bytes(day, idx)
        except RuntimeError as ex:
            print("missing", ex, flush=True)
            return day, None

    with ThreadPoolExecutor(4) as ex:
        got = list(ex.map(grab, days))
    seen, vals = {}, {}
    for day, content in got:                       # sequential parsing
        vals[day] = np.nan
        if content is None:
            continue
        h = hashlib.sha1(content).hexdigest()
        if h in seen:
            print(f"duplicate content {day:%Y-%m-%d} == {seen[h]}; left missing", flush=True)
            continue
        seen[h] = f"{day:%Y-%m-%d}"
        v = parse(content)
        ok = np.isfinite(v) & (wt > 0)
        if ok.any():
            vals[day] = float((v[ok] * wt[ok]).sum() / wt[ok].sum())
    daily = pd.Series(vals).sort_index()
    monthly = daily.groupby(daily.index.to_period("M")).mean()
    out = pd.DataFrame({"date": monthly.index.astype(str), "value": monthly.values,
                        "days": daily.groupby(daily.index.to_period("M")).count().values})
    out.to_csv(OUT, index=False)
    print("wrote", OUT, len(out), "months", flush=True)


if __name__ == "__main__":
    main()
