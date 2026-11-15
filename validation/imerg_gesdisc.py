# AI-assisted: Claude (Anthropic). Independent IMERG rain series for the upper Ica basin straight from NASA GES DISC.
"""Monthly GPM IMERG Final V07 (GPM_3IMERGM) for zone Z4, read from the GES DISC archive through Earthdata Cloud OPeNDAP.

Only the zone geometry comes from Earth Engine (HydroBASINS unit of the Ica River above 2,500 m, sampled on a
0.01-degree grid and turned into area weights per 0.1-degree IMERG cell). Every rain value comes from GES DISC.

Output: validation/raw/imerg_z4_gesdisc.csv (date, value in mm/month)
Credentials: ~/.netrc (Earthdata Login). Nothing is printed or stored in the repo.
"""
import calendar
import hashlib
import threading
import io
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import pandas as pd
import requests
import h5py

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "validation" / "raw"
WEIGHTS = RAW / "z4_imerg_weights.json"
OUT = RAW / "imerg_z4_gesdisc.csv"
COLLECTION = "C2723754851-GES_DISC"   # GPM_3IMERGM v07 at GES DISC (CMR concept id)
OPENDAP = "https://opendap.earthdata.nasa.gov/collections/{c}/granules/{g}.dap.nc4?dap4.ce={ce}"


def cell_weights():
    """Fraction of each 0.1-degree IMERG cell inside Z4, from a 0.01-degree sample of the zone mask."""
    if WEIGHTS.exists():
        return json.loads(WEIGHTS.read_text())
    sys.path.insert(0, str(ROOT / "pipeline"))
    import ee
    import zones as Z
    Z.init()
    basin = Z.upper_basin()
    b = np.array(basin.bounds().coordinates().getInfo()[0])
    w, s, e, n = np.floor(b[:, 0].min() * 10) / 10, np.floor(b[:, 1].min() * 10) / 10, \
        np.ceil(b[:, 0].max() * 10) / 10, np.ceil(b[:, 1].max() * 10) / 10
    mask = (ee.Image("USGS/SRTMGL1_003").gt(2500).And(ee.Image.constant(1).clip(basin).mask())
            .unmask(0).rename("m"))
    rect = ee.Geometry.Rectangle([w, s, e, n], None, False)
    arr = (mask.reproject(crs="EPSG:4326", crsTransform=[0.01, 0, -180, 0, -0.01, 90])
           .sampleRectangle(region=rect, defaultValue=0).get("m").getInfo())
    arr = np.array(arr, dtype=float)                      # rows from north to south
    nrow, ncol = arr.shape
    lats = n - 0.005 - 0.01 * np.arange(nrow)
    lons = w + 0.005 + 0.01 * np.arange(ncol)
    ii = np.floor((lons + 180) / 0.1).astype(int)          # IMERG lon index
    jj = np.floor((lats + 90) / 0.1).astype(int)           # IMERG lat index
    cos = np.cos(np.radians(lats))[:, None]
    num, den = {}, {}
    for r in range(nrow):
        for c in range(ncol):
            k = (int(ii[c]), int(jj[r]))
            num[k] = num.get(k, 0.0) + arr[r, c] * cos[r, 0]
            den[k] = den.get(k, 0.0) + cos[r, 0]
    cells = [{"i": k[0], "j": k[1], "w": num[k] / den[k]} for k in num if num[k] > 0]
    out = {"bbox": [float(w), float(s), float(e), float(n)], "cells": cells}
    RAW.mkdir(parents=True, exist_ok=True)
    WEIGHTS.write_text(json.dumps(out))
    return out


def granule(year, month):
    return f"GPM_3IMERGM.07:3B-MO.MS.MRG.3IMERG.{year}{month:02d}01-S000000-E235959.{month:02d}.V07B.HDF5"


_local = threading.local()


def _session():
    """One requests.Session per thread (Earthdata Login cookies live in the session)."""
    if not hasattr(_local, "s"):
        _local.s = requests.Session()
    return _local.s


def fetch_bytes(year, month, i0, i1, j0, j1):
    """Download one subset. Threads only move bytes; HDF5 parsing happens later, one file at a time."""
    ce = f"/Grid/precipitation[0][{i0}:{i1}][{j0}:{j1}]"
    url = OPENDAP.format(c=COLLECTION, g=requests.utils.quote(granule(year, month), safe=""),
                         ce=requests.utils.quote(ce, safe=""))
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
    raise RuntimeError(f"{year}-{month:02d}: {last}")


def parse(content):
    with h5py.File(io.BytesIO(content), "r") as f:
        v = f["Grid/precipitation"][0].astype(float)       # (lon, lat), mm/hr
    return np.where(v < -9000, np.nan, v)


def fetch(session, year, month, i0, i1, j0, j1):
    return parse(fetch_bytes(year, month, i0, i1, j0, j1))


def main():
    W = cell_weights()
    cells = W["cells"]
    i0, i1 = min(c["i"] for c in cells), max(c["i"] for c in cells)
    j0, j1 = min(c["j"] for c in cells), max(c["j"] for c in cells)
    wgrid = np.zeros((i1 - i0 + 1, j1 - j0 + 1))
    for c in cells:
        wgrid[c["i"] - i0, c["j"] - j0] = c["w"]
    print(f"{len(cells)} IMERG cells, weight sum {wgrid.sum():.1f}", flush=True)
    months = [(y, m) for y in range(2004, 2025) for m in range(1, 13)]
    prev = pd.read_csv(OUT) if OUT.exists() else None
    if prev is not None:                       # resume: fetch only the months still missing
        missing = set(prev.loc[prev.value.isna(), "date"])
        months = [(y, m) for y, m in months if f"{y}-{m:02d}" in missing]
        print("resuming", len(months), "missing months", flush=True)

    fetch_bytes(2004, 1, i0, i1, j0, j1)   # sets the Earthdata Login cookie in this thread's session

    def grab(ym):
        try:
            return ym, fetch_bytes(*ym, i0, i1, j0, j1)
        except RuntimeError as ex:
            print("missing", ex, flush=True)
            return ym, None

    with ThreadPoolExecutor(4) as ex:
        got = list(ex.map(grab, months))
    seen, rows = {}, []
    for (y, m), content in got:                    # sequential parsing
        value = None
        if content is not None:
            h = hashlib.sha1(content).hexdigest()
            if h in seen:
                print(f"duplicate content {y}-{m:02d} == {seen[h]}; left missing", flush=True)
            else:
                seen[h] = f"{y}-{m:02d}"
                p = parse(content)
                ok = np.isfinite(p) & (p >= 0) & (wgrid > 0)
                value = float((p[ok] * wgrid[ok]).sum() / wgrid[ok].sum()) * 24 * calendar.monthrange(y, m)[1]
        rows.append({"date": f"{y}-{m:02d}", "value": value})
    new = pd.DataFrame(rows)
    if prev is not None:
        new = pd.concat([prev[~prev.date.isin(new.date)], new]).sort_values("date")
    new.to_csv(OUT, index=False)
    print("wrote", OUT, len(rows), "months", flush=True)


if __name__ == "__main__":
    main()
