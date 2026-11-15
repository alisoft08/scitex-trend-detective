# AI-assisted: Claude (Anthropic). Precompute the user-selectable periods for every case (challenge step 3).
"""Read each case's monthly anomalies from web/public/data/{cases,contrasts}/*.json and write
web/public/data/periods/<case>.json with the slope and the two dependence-aware p-values for every period of at
least 10 years (start 2004-2014, end 2014-2024). The browser only looks these up; no test runs in JavaScript.
"""
import json
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from engine.periods import MIN_YEARS, PERIOD_ENDS, PERIOD_STARTS, period_result, period_windows  # noqa: E402

DATA = ROOT / "web" / "public" / "data"
OUT = DATA / "periods"


def one_case(path: str) -> str:
    cf = json.loads(Path(path).read_text())
    idx = pd.to_datetime([p["date"] + "-01" for p in cf["series"]])
    s = pd.Series([p["anomaly"] if p["anomaly"] is not None else float("nan") for p in cf["series"]], index=idx, dtype=float)
    rows = [period_result(s, a, b) for a, b in period_windows()]
    out = {"id": cf["id"], "units": cf["units"], "starts": PERIOD_STARTS, "ends": PERIOD_ENDS, "min_years": MIN_YEARS,
           "method": "Theil-Sen slope; Mann-Kendall with moving-block bootstrap (B = 199); linear trend with AR(1) errors. "
                     "'both' = both p < 0.05, 'one' = one of them.", "periods": rows}
    (OUT / f"{cf['id']}.json").write_text(json.dumps(out))
    return cf["id"]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    paths = sorted(str(p) for p in list((DATA / "cases").glob("*.json")) + list((DATA / "contrasts").glob("*.json")))
    with ProcessPoolExecutor() as ex:
        for k, cid in enumerate(ex.map(one_case, paths), 1):
            print(f"{k}/{len(paths)} {cid}", flush=True)


if __name__ == "__main__":
    main()
