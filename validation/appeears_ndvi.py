# AI-assisted: Claude (Anthropic). Independent NDVI series for Villacurí from NASA AppEEARS (a challenge resource).
"""Submit, poll and download an AppEEARS area request for MODIS MOD13Q1 v6.1 over the Villacurí box (Z2).

Usage:
  python validation/appeears_ndvi.py submit     # prints the task id, saved to validation/raw/appeears_task.txt
  python validation/appeears_ndvi.py status
  python validation/appeears_ndvi.py download   # NetCDF files into validation/raw/appeears/

Credentials come from ~/.netrc (machine urs.earthdata.nasa.gov); nothing is printed or stored in the repo.
"""
import json
import netrc
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipeline"))
from zones import BOXES  # noqa: E402

API = "https://appeears.earthdatacloud.nasa.gov/api"
RAW = Path(__file__).resolve().parent / "raw"
TASK_FILE = RAW / "appeears_task.txt"


def token():
    login, _, password = netrc.netrc().authenticators("urs.earthdata.nasa.gov")
    r = requests.post(f"{API}/login", auth=(login, password), timeout=60)
    r.raise_for_status()
    return r.json()["token"]


def submit():
    w, s, e, n = BOXES["Z2"]
    geo = {"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {"zone": "Z2"},
           "geometry": {"type": "Polygon", "coordinates": [[[w, s], [e, s], [e, n], [w, n], [w, s]]]}}]}
    task = {
        "task_type": "area",
        "task_name": "oasis_paradox_ndvi_villacuri",
        "params": {
            "dates": [{"startDate": "01-01-2004", "endDate": "12-31-2024"}],
            "layers": [{"product": "MOD13Q1.061", "layer": "_250m_16_days_NDVI"},
                       {"product": "MOD13Q1.061", "layer": "_250m_16_days_pixel_reliability"}],
            "geo": geo,
            "output": {"format": {"type": "netcdf4"}, "projection": "geographic"},
        },
    }
    r = requests.post(f"{API}/task", json=task, headers={"Authorization": f"Bearer {token()}"}, timeout=120)
    r.raise_for_status()
    tid = r.json()["task_id"]
    RAW.mkdir(parents=True, exist_ok=True)
    TASK_FILE.write_text(tid)
    print("submitted", tid)


def status():
    tid = TASK_FILE.read_text().strip()
    r = requests.get(f"{API}/task/{tid}", headers={"Authorization": f"Bearer {token()}"}, timeout=60)
    r.raise_for_status()
    j = r.json()
    print(j.get("status"), json.dumps({k: j.get(k) for k in ("created", "updated", "progress")}, default=str))


def download():
    tid = TASK_FILE.read_text().strip()
    h = {"Authorization": f"Bearer {token()}"}
    files = requests.get(f"{API}/bundle/{tid}", headers=h, timeout=60).json()["files"]
    out = RAW / "appeears"
    out.mkdir(parents=True, exist_ok=True)
    for f in files:
        if not f["file_name"].endswith(".nc"):
            continue
        dest = out / Path(f["file_name"]).name
        with requests.get(f"{API}/bundle/{tid}/{f['file_id']}", headers=h, stream=True, allow_redirects=True, timeout=600) as r:
            r.raise_for_status()
            with open(dest, "wb") as fh:
                for chunk in r.iter_content(1 << 20):
                    fh.write(chunk)
        print("saved", dest.name, dest.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    {"submit": submit, "status": status, "download": download}[sys.argv[1]]()
