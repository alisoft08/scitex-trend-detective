# AI-assisted: Claude (Anthropic). Monte Carlo test of the trend tests used by the engine.
"""How often does each test claim a trend when there is none (false positives),
and how often does it find a real one (power), under AR(1) noise?

Writes web/public/data/simulation.json.
"""
import json
import os
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from engine import trend as T  # noqa: E402

N = 252
TT = np.arange(N) / 12.0
TESTS = ["mk_classic", "mk_hamed_rao", "mk_prewhitened", "mk_block_bootstrap", "ar1_regression", "consensus"]
LABELS = {
    "mk_classic": "Classic Mann-Kendall",
    "mk_hamed_rao": "Mann-Kendall, Hamed-Rao correction",
    "mk_prewhitened": "Mann-Kendall after pre-whitening",
    "mk_block_bootstrap": "Mann-Kendall, block bootstrap (36 months)",
    "ar1_regression": "Regression with AR errors",
    "consensus": "Our rule: block bootstrap AND AR regression",
}


def ar1(n, phi, rng):
    e = rng.standard_normal(n + 200)
    x = np.zeros_like(e)
    for k in range(1, len(e)):
        x[k] = phi * x[k - 1] + e[k]
    return x[200:]


def one_rep(args):
    phi, trend, seed = args
    rng = np.random.default_rng(seed)
    y = ar1(N, phi, rng)
    if trend:
        sd = 1 / np.sqrt(1 - phi ** 2)
        y = y + 2 * sd * TT / TT[-1]  # total change = 2 marginal SD
    pb = T.p_mk_block_bootstrap(y, L=36, B=199, rng=rng)
    pa = T.arma_trend(y, TT, orders=((1, 0, 0),))["p"]
    phr = T.p_hamed_rao(y)
    return {
        "mk_classic": T.p_mk_classic(y) < 0.05,
        "mk_hamed_rao": bool(np.isfinite(phr) and phr < 0.05),
        "mk_prewhitened": T.p_mk_prewhitened(y) < 0.05,
        "mk_block_bootstrap": pb < 0.05,
        "ar1_regression": pa < 0.05,
        "consensus": (pb < 0.05) and (pa < 0.05),
    }


def run(phi, trend, reps, seed0):
    with ProcessPoolExecutor(max_workers=max(1, (os.cpu_count() or 2) - 1)) as ex:
        res = list(ex.map(one_rep, [(phi, trend, seed0 + i) for i in range(reps)], chunksize=8))
    return {k: float(np.mean([r[k] for r in res])) for k in TESTS}


def main():
    reps_null = int(sys.argv[1]) if len(sys.argv) > 1 else 600
    reps_power = int(sys.argv[2]) if len(sys.argv) > 2 else 300
    out = {"n": N, "alpha": 0.05, "reps_false_positive": reps_null, "reps_power": reps_power,
           "design": "AR(1) noise, 252 monthly values; power uses a linear trend whose total change equals 2 marginal SD of the noise.",
           "tests": [{"id": k, "label": LABELS[k]} for k in TESTS],
           "false_positive": [], "power": []}
    for i, phi in enumerate([0.0, 0.5, 0.9]):
        r = run(phi, False, reps_null, 10_000 * (i + 1))
        out["false_positive"].append({"phi": phi, **r})
        print("null", phi, r, flush=True)
    for i, phi in enumerate([0.5, 0.9]):
        r = run(phi, True, reps_power, 90_000 * (i + 1))
        out["power"].append({"phi": phi, **r})
        print("power", phi, r, flush=True)
    dest = ROOT / "web" / "public" / "data" / "simulation.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(out, indent=2))
    print("wrote", dest)


if __name__ == "__main__":
    main()
