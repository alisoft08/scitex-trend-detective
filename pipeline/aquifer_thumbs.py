# AI-assisted: Claude (Anthropic). Satellite close-up of each atlas aquifer for the globe's pop-out card.
"""Write web/public/data/img/aquifers/<zone>.jpg (480 px wide, true colour).

Source: MODIS Terra MOD09A1 v6.1 8-day surface reflectance (500 m, bands 1, 4, 3), median of the 2024 growing
season of each hemisphere, NASA LP DAAC. Ica (ZW) reuses the Landsat 2024 image of the detective's lens.
"""
import shutil
import sys
import time
import urllib.request
from pathlib import Path

import ee

sys.path.insert(0, str(Path(__file__).parent))
import zones as Z  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "web" / "public" / "data" / "img" / "aquifers"


def thumb(zone, box):
    south = box[3] < 0
    start, end = ("2023-11-01", "2024-03-31") if south else ("2024-05-01", "2024-09-30")
    img = (ee.ImageCollection("MODIS/061/MOD09A1").filterDate(start, end)
           .select(["sur_refl_b01", "sur_refl_b04", "sur_refl_b03"]).median())
    vis = img.visualize(min=0, max=3200, gamma=1.3)
    url = vis.getThumbURL({"region": ee.Geometry.Rectangle(box, "EPSG:4326", False), "dimensions": 480,
                           "crs": "EPSG:4326", "format": "jpg"})
    for attempt in range(5):
        try:
            urllib.request.urlretrieve(url, OUT / f"{zone}.jpg")
            return
        except Exception:  # Earth Engine is sometimes busy; wait and retry
            time.sleep(8 * (attempt + 1))
    raise RuntimeError(f"thumbnail failed: {zone}")


def main():
    Z.init()
    OUT.mkdir(parents=True, exist_ok=True)
    for zone, box in Z.AQUIFERS.items():
        thumb(zone, box)
        print("wrote", zone, flush=True)
    shutil.copyfile(ROOT / "web" / "public" / "data" / "img" / "hero_2024.jpg", OUT / "ZW.jpg")
    print("wrote ZW (Landsat 2024 lens image)")


if __name__ == "__main__":
    main()
