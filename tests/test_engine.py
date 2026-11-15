# AI-assisted: Claude (Anthropic). Synthetic-series tests for the verdict engine.
import numpy as np
import pandas as pd
import pytest

from engine import trend as T
from engine.verdict import load_config, run_case

IDX = pd.date_range("2004-01-01", periods=252, freq="MS")
TT = np.arange(252) / 12.0
CFG = load_config()


def ar1(n, phi, rng):
    e = rng.standard_normal(n + 200)
    x = np.zeros_like(e)
    for k in range(1, len(e)):
        x[k] = phi * x[k - 1] + e[k]
    return x[200:]


def test_anomaly_removes_pure_seasonal_cycle():
    seasonal = np.tile(np.sin(np.arange(12) / 12 * 2 * np.pi) * 5, 21)
    a = T.monthly_anomaly(seasonal, IDX.month.values)
    assert np.allclose(a, 0, atol=1e-9)


def test_sen_recovers_known_slope_despite_el_nino_outliers():
    rng = np.random.default_rng(3)
    y = 0.8 * TT + rng.normal(0, 0.3, 252)
    y[156:160] += 15  # two extreme "El Nino" spikes (2017, 2023)
    y[228:232] += 15
    slope, _ = T.sen_slope(y, TT)
    assert slope == pytest.approx(0.8, abs=0.05)
    ols = np.polyfit(TT, y, 1)[0]
    assert abs(ols - 0.8) > abs(slope - 0.8)


def test_clear_trend_is_confirmed():
    rng = np.random.default_rng(5)
    y = 0.5 * TT + ar1(252, 0.5, rng) * 0.5
    out = run_case(pd.Series(y, IDX), None, CFG, fast=True)
    assert out["verdict"] == "confirmed"
    assert 4.0 < out["trend"]["sen_per_decade"] < 6.0


def test_consensus_controls_false_positives_under_strong_autocorrelation():
    """No trend, phi = 0.9: the consensus rule must rarely fire; classic MK fires a lot."""
    rng = np.random.default_rng(11)
    reps, consensus, classic = 40, 0, 0
    for _ in range(reps):
        y = ar1(252, 0.9, rng)
        classic += T.p_mk_classic(y) < 0.05
        pb = T.p_mk_block_bootstrap(y, L=36, B=199, rng=rng)
        pa = T.arma_trend(y, TT, orders=((1, 0, 0),))["p"]
        consensus += (pb < 0.05) and (pa < 0.05)
    assert consensus / reps <= 0.15
    assert classic / reps >= 0.35


def test_missing_data_gives_insufficient_data():
    rng = np.random.default_rng(7)
    y = rng.normal(size=252)
    y[: 252 // 3] = np.nan  # only 2/3 of months valid
    out = run_case(pd.Series(y, IDX), None, CFG, fast=True)
    assert out["verdict"] == "insufficient_data"
    assert out["criteria"]["C0"] is False


def test_white_noise_is_not_confirmed():
    rng = np.random.default_rng(13)
    out = run_case(pd.Series(rng.normal(size=252), IDX), None, CFG, fast=True)
    assert out["verdict"] in {"inconclusive", "likely"}
    assert out["verdict"] != "confirmed"
