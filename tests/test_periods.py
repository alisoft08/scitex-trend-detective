# AI-assisted: Claude (Anthropic). Synthetic series with known slope for the user-selected period analysis.
import numpy as np
import pandas as pd

from engine.periods import PERIOD_ENDS, PERIOD_STARTS, period_result, period_windows


def _series(slope_per_year, phi=0.5, sd=1.0, seed=3):
    rng = np.random.default_rng(seed)
    n = 252
    e = np.zeros(n)
    for i in range(1, n):
        e[i] = phi * e[i - 1] + rng.normal(0, sd)
    t = np.arange(n) / 12.0
    idx = pd.date_range("2004-01-01", periods=n, freq="MS")
    return pd.Series(slope_per_year * t + e, index=idx)


def test_windows_cover_at_least_ten_years():
    w = period_windows()
    assert (2004, 2024) in w and (2014, 2024) in w and (2004, 2013) not in w
    assert all(e - s + 1 >= 10 for s, e in w)
    assert all(s in PERIOD_STARTS and e in PERIOD_ENDS for s, e in w)


def test_strong_trend_is_significant_in_both_tests():
    r = period_result(_series(0.5), 2004, 2024, B=99)
    assert 4.0 < r["sen_per_decade"] < 6.0          # 0.5 per year = 5 per decade
    assert r["result"] == "both"


def test_trendless_noise_is_not_significant():
    r = period_result(_series(0.0, seed=11), 2010, 2024, B=99)
    assert r["result"] in ("none", "one")
    assert abs(r["sen_per_decade"]) < 2.0


def test_period_uses_only_the_selected_years():
    s = _series(0.0)
    s[s.index.year >= 2015] += np.linspace(0, 20, int((s.index.year >= 2015).sum()))   # a ramp only after 2015
    early, late = period_result(s, 2004, 2014, B=99), period_result(s, 2015, 2024, B=99)
    assert late["sen_per_decade"] > early["sen_per_decade"] + 10
    assert late["n"] == 120 and early["n"] == 132


def test_gap_of_eleven_months_is_still_analysed():
    s = _series(0.5)
    s[(s.index >= "2017-07-01") & (s.index < "2018-06-01")] = np.nan     # like the GRACE / GRACE-FO gap
    assert period_result(s, 2014, 2024, B=99)["result"] != "insufficient"


def test_mostly_missing_period_is_insufficient():
    s = _series(0.5)
    s[s.index.year >= 2016] = np.nan
    assert period_result(s, 2014, 2024, B=99)["result"] == "insufficient"
