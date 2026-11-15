# AI-assisted: Claude (Anthropic). Before/after satellite pictures (2004 and 2024) of every atlas aquifer.
"""Write web/public/data/img/aquifers/<zone>_2004.jpg and <zone>_2024.jpg (1400 px wide, true colour).

Source: MODIS Terra MOD09A1 v6.1 8-day surface reflectance (500 m, bands 1, 4, 3), median of the same growing season
in 2004 and in 2024 (May-September in the north, November-March in the south), NASA LP DAAC. One sensor for both
years keeps the comparison fair. Ica (ZW) reuses the Landsat 5 (2004) and Landsat 8/9 (2024) images of its lens.
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
IMG = ROOT / "web" / "public" / "data" / "img"
OUT = IMG / "aquifers"


def season(year, south):
    return (f"{year - 1}-11-01", f"{year}-03-31") if south else (f"{year}-05-01", f"{year}-09-30")


def picture(zone, box, year):
    start, end = season(year, box[3] < 0)
    img = (ee.ImageCollection("MODIS/061/MOD09A1").filterDate(start, end)
           .select(["sur_refl_b01", "sur_refl_b04", "sur_refl_b03"]).median())
    url = img.visualize(min=0, max=3200, gamma=1.3).getThumbURL({
        "region": ee.Geometry.Rectangle(box, "EPSG:4326", False), "dimensions": 1400, "crs": "EPSG:4326", "format": "jpg"})
    for attempt in range(6):
        try:
            urllib.request.urlretrieve(url, OUT / f"{zone}_{year}.jpg")
            return
        except Exception:  # Earth Engine is sometimes busy; wait and retry
            time.sleep(8 * (attempt + 1))
    raise RuntimeError(f"picture failed: {zone} {year}")


def main():
    Z.init()
    OUT.mkdir(parents=True, exist_ok=True)
    for zone, box in Z.AQUIFERS.items():
        for year in (2004, 2024):
            picture(zone, box, year)
            print("wrote", zone, year, flush=True)
    shutil.copyfile(IMG / "hero_2004.jpg", OUT / "ZW_2004.jpg")
    shutil.copyfile(IMG / "hero_2024.jpg", OUT / "ZW_2024.jpg")
    print("wrote ZW (Landsat lens images)")


if __name__ == "__main__":
    main()
