# AI-assisted: Claude (Anthropic). Trend statistics for the Oasis Paradox verdict engine.
"""Trend magnitude and significance tests that stay honest under autocorrelation.

All functions take numpy arrays; NaN marks a missing month and is never interpolated.
Time `t` is in years. Slopes are returned per year unless the name says otherwise.
"""
from __future__ import annotations

import warnings

import numpy as np
import pymannkendall as mk
from statsmodels.tsa.arima.model import ARIMA

warnings.filterwarnings("ignore")


# ---------------------------------------------------------------- preparation
def monthly_anomaly(values: np.ndarray, months: np.ndarray) -> np.ndarray:
    """Remove the mean seasonal cycle: value minus the mean of its calendar month."""
    out = np.full_like(values, np.nan, dtype=float)
    for m in range(1, 13):
        idx = months == m
        if np.isfinite(values[idx]).any():
            out[idx] = values[idx] - np.nanmean(values[idx])
    return out


def standardized_anomaly(values: np.ndarray, months: np.ndarray) -> np.ndarray:
    a = monthly_anomaly(values, months)
    out = np.full_like(a, np.nan)
    for m in range(1, 13):
        idx = months == m
        sd = np.nanstd(a[idx], ddof=1) if np.isfinite(a[idx]).sum() > 1 else np.nan
        if sd and np.isfinite(sd) and sd > 0:
            out[idx] = a[idx] / sd
    return out


# ---------------------------------------------------------------- magnitude
def sen_slope(y: np.ndarray, t: np.ndarray) -> tuple[float, float]:
    """Theil-Sen slope (per unit of t) and intercept; ignores NaN."""
    ok = np.isfinite(y)
    y, t = y[ok], t[ok]
    i, j = np.triu_indices(len(y), 1)
    dt = t[j] - t[i]
    keep = dt != 0
    slope = float(np.median((y[j] - y[i])[keep] / dt[keep]))
    intercept = float(np.median(y - slope * t))
    return slope, intercept


def _block_resample(x: np.ndarray, L: int, rng: np.random.Generator) -> np.ndarray:
    n = len(x)
    L = min(L, n)
    nb = int(np.ceil(n / L))
    starts = rng.integers(0, n - L + 1, nb)
    return np.concatenate([x[s:s + L] for s in starts])[:n]


def sen_ci_block_bootstrap(y, t, L=36, B=999, rng=None, level=0.95):
    """CI for the Sen slope: moving-block bootstrap of residuals around the Sen line."""
    rng = rng or np.random.default_rng(0)
    ok = np.isfinite(y)
    y, t = y[ok], t[ok]
    b, a = sen_slope(y, t)
    fit = a + b * t
    res = y - fit
    draws = np.empty(B)
    for k in range(B):
        draws[k] = sen_slope(fit + _block_resample(res, L, rng), t)[0]
    lo, hi = np.percentile(draws, [(1 - level) / 2 * 100, (1 + level) / 2 * 100])
    return float(lo), float(hi)


# ---------------------------------------------------------------- significance
def mk_s(y: np.ndarray) -> float:
    d = np.sign(y[None, :] - y[:, None])
    return float(np.triu(d, 1).sum())


def p_mk_classic(y) -> float:
    y = y[np.isfinite(y)]
    return float(mk.original_test(y).p)


def p_hamed_rao(y) -> float:
    y = y[np.isfinite(y)]
    p = mk.hamed_rao_modification_test(y).p
    return float(p) if np.isfinite(p) else float("nan")


def p_mk_block_bootstrap(y, L=36, B=999, rng=None) -> float:
    """Mann-Kendall S against a null built by shuffling blocks of length L.

    Shuffling blocks destroys the long-term trend but keeps short-term memory,
    so the null distribution of S respects the autocorrelation.
    """
    rng = rng or np.random.default_rng(1)
    y = y[np.isfinite(y)]
    s_obs = abs(mk_s(y))
    count = 0
    for _ in range(B):
        count += abs(mk_s(_block_resample(y, L, rng))) >= s_obs
    return (count + 1) / (B + 1)


def p_mk_prewhitened(y) -> float:
    """Classic pre-whitening (von Storch) Mann-Kendall, for short annual series."""
    y = y[np.isfinite(y)]
    return float(mk.pre_whitening_modification_test(y).p)


def arma_trend(y, t, X=None, orders=((1, 0, 0), (2, 0, 0), (1, 0, 1))):
    """Linear trend with ARMA errors (max likelihood, Kalman filter handles NaN).

    Returns dict(beta per year, p, phi, order, aic). Order chosen by AIC.
    """
    exog = t.reshape(-1, 1) if X is None else np.column_stack([t, X])
    best = None
    for order in orders:
        try:
            r = ARIMA(y, exog=exog, order=tuple(order), trend="c").fit()
        except Exception:  # noqa: BLE001 - a failed order is simply skipped
            continue
        if best is None or r.aic < best.aic:
            best = r
    if best is None:
        return {"beta": float("nan"), "p": float("nan"), "phi": float("nan"), "order": None, "aic": float("nan")}
    names = list(best.model.exog_names)
    k = 1  # params: const, then exog in order (t first)
    beta, p = float(best.params[k]), float(best.pvalues[k])
    ar_idx = [i for i, n in enumerate(best.model.param_names) if n.startswith("ar.L1")]
    phi = float(best.params[ar_idx[0]]) if ar_idx else 0.0
    return {"beta": beta, "p": p, "phi": phi, "order": list(best.model.order), "aic": float(best.aic),
            "exog_names": names}


def years_to_detect(omega_per_year: float, sigma_noise: float, phi: float) -> float | None:
    """Weatherhead et al. (1998): years of monthly data needed to detect trend omega."""
    if not np.isfinite(omega_per_year) or omega_per_year == 0 or not np.isfinite(phi):
        return None
    phi = min(max(phi, -0.95), 0.95)
    n = ((3.3 * sigma_noise / abs(omega_per_year)) * np.sqrt((1 + phi) / (1 - phi))) ** (2 / 3)
    return float(n)
