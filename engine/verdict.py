# AI-assisted: Claude (Anthropic). Verdict engine: runs every test on one series.
"""Turn one monthly series into a case file (dict ready for JSON).

Pipeline: anomalies -> Sen slope + block-bootstrap CI -> consensus significance
(block-bootstrap Mann-Kendall AND regression with ARMA errors) -> El Nino / rain
control -> 9 windows -> leave-one-year-out jackknife -> verdict C0..C6.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd
import yaml

from . import trend as T

ROOT = Path(__file__).resolve().parents[1]


def load_config(path: Path | None = None) -> dict:
    return yaml.safe_load(open(path or ROOT / "config" / "verdict.yaml"))


@dataclass
class Series:
    """Monthly series on a regular month-start DatetimeIndex (NaN = missing)."""
    s: pd.Series

    @property
    def t(self) -> np.ndarray:
        idx = self.s.index
        return np.asarray((idx.year - idx[0].year) + (idx.month - 1) / 12.0, dtype=float)

    @property
    def months(self) -> np.ndarray:
        return self.s.index.month.values


def _best_enso_lag(y, t, enso: pd.Series, lags, index) -> int:
    best_lag, best_aic = 0, np.inf
    for lag in lags:
        x = enso.shift(lag).reindex(index).bfill().values
        r = T.arma_trend(y, t, X=x, orders=((1, 0, 0),))
        if np.isfinite(r["aic"]) and r["aic"] < best_aic:
            best_lag, best_aic = lag, r["aic"]
    return best_lag


def _clean(x):
    """JSON-safe float (None for NaN/inf)."""
    if x is None:
        return None
    try:
        x = float(x)
    except (TypeError, ValueError):
        return x
    return round(x, 6) if np.isfinite(x) else None


def run_case(series: pd.Series, covariates: pd.DataFrame | None, cfg: dict,
             already_anomaly: bool = False, seed: int = 0, fast: bool = False) -> dict:
    """Run the full engine on one monthly series. Returns a dict (no metadata)."""
    rng = np.random.default_rng(seed)
    S = Series(series.astype(float))
    y_raw = S.s.values
    t = S.t
    y = y_raw.copy() if already_anomaly else T.monthly_anomaly(y_raw, S.months)
    L, B = cfg["block_length_months"], cfg["bootstrap_reps"]
    if fast:
        B = 199
    alpha, alpha_weak = cfg["alpha"], cfg["alpha_weak"]

    # C0: data sufficiency
    valid = np.isfinite(y)
    years_covered = len(set(S.s.index.year[valid]))
    c0 = bool(valid.mean() >= cfg["min_valid_fraction"] and years_covered >= cfg["min_years"])

    # Magnitude
    b, a = T.sen_slope(y, t)
    ci = T.sen_ci_block_bootstrap(y, t, L=L, B=B, rng=rng)

    # Significance
    p_classic = T.p_mk_classic(y)
    p_hr = T.p_hamed_rao(y)
    p_boot = T.p_mk_block_bootstrap(y, L=L, B=B, rng=rng)
    arma = T.arma_trend(y, t, orders=cfg["arma_orders"])

    # Confounders: El Nino (coastal index, lag chosen by AIC) + optional rain
    conf = {"used": [], "beta": None, "p": None, "enso_lag_months": None}
    if covariates is not None and len(covariates.columns):
        cols = []
        X = pd.DataFrame(index=S.s.index)
        if "icen_like" in covariates:
            lag = _best_enso_lag(y, t, covariates["icen_like"], cfg["enso_lags_months"], S.s.index)
            X["icen_like"] = covariates["icen_like"].shift(lag).reindex(S.s.index).bfill()
            conf["enso_lag_months"] = lag
            cols.append(f"Coastal El Niño index (lag {lag} months)")
        if "oni" in covariates:
            X["oni"] = covariates["oni"].reindex(S.s.index).bfill()
            cols.append("ONI")
        if "p12" in covariates:
            X["p12"] = covariates["p12"].reindex(S.s.index).bfill()
            cols.append("Upper-basin rain, previous 12 months")
        r = T.arma_trend(y, t, X=X.values, orders=cfg["arma_orders"])
        conf.update({"used": cols, "beta": r["beta"], "p": r["p"]})

    # Robustness: 9 windows
    win = []
    for s0 in cfg["window_starts"]:
        for s1 in cfg["window_ends"]:
            m = (S.s.index.year >= s0) & (S.s.index.year <= s1)
            yw, tw = y[m], t[m]
            bw, _ = T.sen_slope(yw, tw)
            pw = T.p_mk_block_bootstrap(yw, L=L, B=199 if fast else 499, rng=rng)
            win.append({"start": s0, "end": s1, "sen_per_decade": bw * 10, "p_block_bootstrap": pw})
    same_sign = sum(np.sign(w["sen_per_decade"]) == np.sign(b) for w in win)
    win_sig = sum((w["p_block_bootstrap"] < alpha) and (np.sign(w["sen_per_decade"]) == np.sign(b)) for w in win)

    # Robustness: leave-one-year-out jackknife
    years = sorted(set(S.s.index.year))
    jk_flip, jk_sig = False, 0
    jackknife = []
    for yr in years:
        m = S.s.index.year != yr
        bj, _ = T.sen_slope(y[m], t[m])
        pj = T.p_mk_block_bootstrap(y[m], L=L, B=99 if fast else 199, rng=rng)
        jackknife.append({"year": int(yr), "sen_per_decade": _clean(bj * 10), "p_block_bootstrap": _clean(pj)})
        jk_flip |= bool(np.sign(bj) != np.sign(b))
        jk_sig += int(pj < alpha and np.sign(bj) == np.sign(b))

    # Criteria
    c1 = bool(p_boot < alpha and arma["p"] < alpha)
    c2 = bool(ci[0] > 0 or ci[1] < 0)
    c3 = bool(same_sign == len(win) and win_sig >= cfg["windows_min_significant"])
    c4 = bool((not jk_flip) and jk_sig >= cfg["jackknife_min_significant"])
    c5 = None if conf["beta"] is None else bool(np.sign(conf["beta"]) == np.sign(b) and conf["p"] < alpha)
    crit = {"C0": c0, "C1": c1, "C2": c2, "C3": c3, "C4": c4, "C5": c5, "C6": None}

    weak = ((p_boot < alpha and arma["p"] < alpha_weak) or (arma["p"] < alpha and p_boot < alpha_weak)) \
        and same_sign == len(win)
    if not c0:
        verdict = "insufficient_data"
    elif c1 and c2 and c3 and c4 and (c5 is not False):
        verdict = "confirmed"
    elif c1 or weak:
        verdict = "likely"
    else:
        verdict = "inconclusive"

    resid = y - (a + b * t)
    ytd = T.years_to_detect(b, float(np.nanstd(resid, ddof=1)), arma["phi"]) if verdict == "inconclusive" else None

    return {
        "n": int(len(y)), "n_valid": int(valid.sum()),
        "trend": {
            "sen_per_decade": _clean(b * 10),
            "sen_ci95_block_bootstrap": [_clean(ci[0] * 10), _clean(ci[1] * 10)],
            "intercept": _clean(a),
            "p_mk_classic": _clean(p_classic),
            "p_hamed_rao": _clean(p_hr),
            "p_block_bootstrap": _clean(p_boot),
            "block_length": L,
            "arma_order": arma["order"],
            "phi": _clean(arma["phi"]),
            "beta_arma_per_decade": _clean(arma["beta"] * 10),
            "p_arma": _clean(arma["p"]),
            "confounders": [*conf["used"]],
            "enso_lag_months": conf["enso_lag_months"],
            "beta_with_confounders_per_decade": _clean(conf["beta"] * 10) if conf["beta"] is not None else None,
            "p_with_confounders": _clean(conf["p"]),
            "windows": [{k: _clean(v) if isinstance(v, float) else v for k, v in w.items()} for w in win],
            "windows_same_sign": int(same_sign),
            "windows_significant": int(win_sig),
            "jackknife": jackknife,
            "jackknife_flips_sign": bool(jk_flip),
            "jackknife_significant": int(jk_sig),
            "jackknife_n": len(years),
            "years_to_detect": _clean(ytd),
        },
        "classic_test_says_significant": bool(p_classic < alpha),
        "criteria": crit,
        "verdict": verdict,
        "anomaly": [_clean(v) for v in y],
    }
