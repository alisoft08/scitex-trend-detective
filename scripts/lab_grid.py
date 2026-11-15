# AI-assisted: Claude (Anthropic). Precomputed results for the "Test the tests" lab (statistics stay in Python).
"""For a grid of month-to-month memory values (phi), simulate trendless AR(1) series and record what the classic
Mann-Kendall test and our consensus rule (block-bootstrap MK AND regression with AR errors) conclude.

The web app only animates these stored trials; it never computes a test.
Writes web/public/data/lab.json.
"""
import json
import os
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))
from engine import trend as T  # noqa: E402
from simulate import N, TT, ar1  # noqa: E402

PHIS = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95]
REPS = 200
SHOW = 100          # trials stored one by one for the animation
B = 199             # bootstrap resamples per simulated series (999 on real data)


def trial(args):
    phi, seed = args
    rng = np.random.default_rng(seed)
    y = ar1(N, phi, rng)
    p_classic = T.p_mk_classic(y)
    p_boot = T.p_mk_block_bootstrap(y, L=36, B=B, rng=rng)
    p_ar = T.arma_trend(y, TT, orders=((1, 0, 0),))["p"]
    return {"classic": bool(p_classic < 0.05), "ours": bool(p_boot < 0.05 and p_ar < 0.05),
            "p_classic": float(p_classic), "y": y}


def main():
    out = {"n": N, "alpha": 0.05, "reps": REPS, "bootstrap_reps": B,
           "design": f"{REPS} trendless AR(1) series of {N} months per memory level; the classic Mann-Kendall test "
                     f"vs. our rule (block-bootstrap Mann-Kendall with 36-month blocks and {B} resamples AND "
                     f"regression with AR(1) errors, both p < 0.05).",
           "grid": []}
    workers = max(1, (os.cpu_count() or 2) - 1)
    with ProcessPoolExecutor(max_workers=workers) as ex:
        for k, phi in enumerate(PHIS):
            res = list(ex.map(trial, [(phi, 500_000 + 10_000 * k + i) for i in range(REPS)], chunksize=4))
            fa_c = float(np.mean([r["classic"] for r in res]))
            fa_o = float(np.mean([r["ours"] for r in res]))
            # an example the eye can read: a series where the classic test fires and ours does not, if any
            ex_i = next((i for i, r in enumerate(res) if r["classic"] and not r["ours"]), 0)
            y = res[ex_i]["y"]
            out["grid"].append({
                "phi": phi,
                "n_eff": round(N * (1 - phi) / (1 + phi), 1),
                "false_alarm_classic": round(fa_c, 3),
                "false_alarm_ours": round(fa_o, 3),
                "se_classic": round(float(np.sqrt(fa_c * (1 - fa_c) / REPS)), 3),
                "se_ours": round(float(np.sqrt(fa_o * (1 - fa_o) / REPS)), 3),
                "trials": [[int(r["classic"]), int(r["ours"])] for r in res[:SHOW]],
                "example": {"y": [round(float(v), 2) for v in y], "classic": res[ex_i]["classic"],
                            "ours": res[ex_i]["ours"], "p_classic": res[ex_i]["p_classic"]},
            })
            print(f"phi={phi:.2f} classic={fa_c:.3f} ours={fa_o:.3f}", flush=True)
    dest = ROOT / "web" / "public" / "data" / "lab.json"
    dest.write_text(json.dumps(out))
    print("wrote", dest, dest.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
