# AI-assisted: Claude (Anthropic). Trend and significance for a period the user selects (challenge step 3).
"""Period analysis: the same two dependence-aware tests as the verdict, on any period of at least 10 years.

For each period [start, end] (start 2004-2014, end 2014-2024) we report the Theil-Sen slope, the Mann-Kendall
p-value with a moving-block bootstrap, and the p-value of a linear trend with AR(1) errors. This is a period
reading, not the full verdict: the verdict also needs the robustness windows, the jackknife and the controls,
which only make sense for the whole record.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from . import trend as T

PERIOD_STARTS = list(range(2004, 2015))
PERIOD_ENDS = list(range(2014, 2025))
MIN_YEARS = 10


def period_windows() -> list[tuple[int, int]]:
    return [(s, e) for s in PERIOD_STARTS for e in PERIOD_ENDS if e - s + 1 >= MIN_YEARS]


def period_result(anomaly: pd.Series, start: int, end: int, L: int = 36, B: int = 199, alpha: float = 0.05,
                  seed: int = 7) -> dict:
    """Monthly anomaly series (DatetimeIndex) -> slope per decade, two p-values and the combined reading."""
    s = anomaly[(anomaly.index.year >= start) & (anomaly.index.year <= end)]
    y = s.to_numpy(dtype=float)
    t = (np.arange(len(s)) / 12.0)
    ok = np.isfinite(y)
    # 65% valid months and 8 valid years: lets GRACE periods span the 2017-2018 gap between GRACE and GRACE-FO.
    if ok.sum() < 0.65 * len(y) or ok.sum() < 96:
        return {"start": start, "end": end, "n": int(ok.sum()), "sen_per_decade": None,
                "p_block_bootstrap": None, "p_arma": None, "result": "insufficient"}
    b, _ = T.sen_slope(y, t)
    p_boot = T.p_mk_block_bootstrap(y, L=min(L, max(6, len(y) // 4)), B=B, rng=np.random.default_rng(seed))
    ar = T.arma_trend(y, t, orders=((1, 0, 0),))
    p_ar = ar["p"] if np.isfinite(ar["p"]) and np.sign(ar["beta"]) == np.sign(b) else 1.0
    hits = int(p_boot < alpha) + int(p_ar < alpha)
    return {"start": start, "end": end, "n": int(ok.sum()), "sen_per_decade": round(b * 10, 6),
            "p_block_bootstrap": round(float(p_boot), 4), "p_arma": round(float(p_ar), 4),
            "result": "both" if hits == 2 else "one" if hits == 1 else "none"}
