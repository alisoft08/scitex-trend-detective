# AI-assisted: Claude (Anthropic). Where the lens stops on each aquifer's landing view.
"""Write web/public/data/aquifer_tour.json: for each atlas aquifer, the four places where the surface changed most
between the 2004 and 2024 MODIS pictures (img/aquifers/<zone>_<year>.jpg), plus the picture's aspect ratio.

The change score is the difference in a visible-band greenness index, VARI = (G - R) / (G + R - B), smoothed over
about 2% of the picture. It only chooses where the lens looks; every number on the cards comes from the engine.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).parent))
import zones as Z  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
IMG = ROOT / "web" / "public" / "data" / "img" / "aquifers"
OUT = ROOT / "web" / "public" / "data" / "aquifer_tour.json"


def rgb(path: Path, size: tuple[int, int]) -> np.ndarray:
    return np.asarray(Image.open(path).convert("RGB").resize(size, Image.BILINEAR), dtype=float)


def not_land(a: np.ndarray) -> np.ndarray:
    """Water (dark, or bluer than green and red) and cloud or snow (very bright) are not candidate stops."""
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    bright = a.mean(axis=-1)
    return (bright < 40) | ((b > g) & (b > r)) | (bright > 215)


def vari(path: Path, size: tuple[int, int]) -> np.ndarray:
    a = rgb(path, size)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    den = g + r - b
    v = np.where(np.abs(den) > 8, (g - r) / np.where(np.abs(den) > 8, den, 1), 0.0)
    return np.clip(v, -1, 1)


def stops(zone: str, box: list[float], k: int = 4) -> dict:
    with Image.open(IMG / f"{zone}_2024.jpg") as im:
        w, h = im.size
    gw = 240
    gh = max(40, round(gw * h / w))
    d = vari(IMG / f"{zone}_2024.jpg", (gw, gh)) - vari(IMG / f"{zone}_2004.jpg", (gw, gh))
    d = ndimage.gaussian_filter(d, sigma=gw * 0.02)
    margin = int(gw * 0.08)
    score = np.abs(d)
    bad = not_land(rgb(IMG / f"{zone}_2004.jpg", (gw, gh))) | not_land(rgb(IMG / f"{zone}_2024.jpg", (gw, gh)))
    score[ndimage.binary_dilation(bad, iterations=max(2, int(gw * 0.03)))] = 0
    score[:margin, :] = score[-margin:, :] = 0
    score[:, :margin] = score[:, -margin:] = 0
    picked, sep = [], gw * 0.18
    for flat in np.argsort(score, axis=None)[::-1]:
        y, x = divmod(int(flat), gw)
        if all((x - px) ** 2 + (y - py) ** 2 > sep ** 2 for px, py in picked):
            picked.append((x, y))
        if len(picked) == k:
            break
    W, S, E, N = box
    out = []
    for x, y in picked:
        out.append({"lon": round(W + (x + 0.5) / gw * (E - W), 3), "lat": round(N - (y + 0.5) / gh * (N - S), 3),
                    "change": "greener" if d[y, x] > 0 else "less green", "delta": round(float(d[y, x]), 3)})
    return {"ratio": round(w / h, 4), "bbox": box, "stops": out}


def main():
    tour = {zone: stops(zone, box) for zone, box in Z.AQUIFERS.items()}
    tour["_method"] = ("Lens stops: the four places with the largest change in a visible-band greenness index "
                       "(VARI) between the 2004 and 2024 MODIS pictures. They choose where the lens looks only.")
    OUT.write_text(json.dumps(tour, indent=1))
    for z, v in tour.items():
        if not z.startswith("_"):
            print(z, [(s["lon"], s["lat"], s["change"]) for s in v["stops"]])


if __name__ == "__main__":
    main()
