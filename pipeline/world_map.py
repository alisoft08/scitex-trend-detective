# AI-assisted: Claude (Anthropic). World basemap for the aquifer atlas: a MODIS true-colour mosaic in plate carrée.
"""Write web/public/data/img/world_modis.jpg (equirectangular, lon -180..180, lat -60..75).

Source: MODIS Terra MOD09CMG v6.1 surface reflectance on the 0.05° climate modelling grid (bands 1, 4, 3),
25th percentile of the Mondays of April-September 2024 (removes clouds), NASA LP DAAC. Oceans are masked with the
GLDAS-2.2 land grid (NASA GSFC) and painted a flat navy.
Plate carrée keeps the app's marker maths trivial: x = (lon + 180) / 360, y = (75 - lat) / 135.
"""
import sys
import urllib.request
from pathlib import Path

import ee

sys.path.insert(0, str(Path(__file__).parent))
import zones as Z  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "web" / "public" / "data" / "img" / "world_modis.jpg"
BBOX = [-180, -60, 180, 75]


def main():
    Z.init()
    bands = [f"Coarse_Resolution_Surface_Reflectance_Band_{b}" for b in (1, 4, 3)]
    img = (ee.ImageCollection("MODIS/061/MOD09CMG").filterDate("2024-04-01", "2024-10-01").filter(ee.Filter.calendarRange(1, 28, "day_of_month"))
           .filter(ee.Filter.calendarRange(1, 1, "day_of_week")).select(bands)
           .reduce(ee.Reducer.percentile([25])))
    land = ee.ImageCollection("NASA/GLDAS/V022/CLSM/G025/DA1D").filterDate("2024-06-01", "2024-06-02").first().select(0).mask()
    img = img.updateMask(land)
    vis = img.visualize(min=0, max=0.38, gamma=1.3)   # reflectance already scaled to 0-1
    ocean = ee.Image.constant([22, 34, 58]).visualize(min=0, max=255)   # land-only grid: oceans are masked
    rgb = ocean.blend(vis)
    region = ee.Geometry.Rectangle(BBOX, "EPSG:4326", False)
    url = rgb.getThumbURL({"region": region, "dimensions": "2400x900", "crs": "EPSG:4326", "format": "jpg"})
    OUT.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(url, OUT)
    print("wrote", OUT, OUT.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
