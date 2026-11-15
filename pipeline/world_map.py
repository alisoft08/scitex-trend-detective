# AI-assisted: Claude (Anthropic). World basemap for the atlas globe: a MODIS true-colour mosaic, pole to pole.
"""Write web/public/data/img/world_modis.jpg (equirectangular, lon -180..180, lat 90..-90, 2400 x 1200).

Sources (NASA LP DAAC):
- MODIS Terra MOD09CMG v6.1 surface reflectance on the 0.05° grid (bands 1, 4, 3), 25th percentile of the Mondays of
  April-September 2024 (removes clouds).
- MODIS MCD12Q1 v6.1 land cover 2020 (IGBP): water (class 17) is painted a flat navy; permanent snow and ice
  (class 15) south of 55°S is painted ice white, because Antarctica is in polar night during the composite.
"""
import sys
import urllib.request
from pathlib import Path

import ee

sys.path.insert(0, str(Path(__file__).parent))
import zones as Z  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "web" / "public" / "data" / "img" / "world_modis.jpg"
BBOX = [-180, -90, 180, 90]


def main():
    Z.init()
    bands = [f"Coarse_Resolution_Surface_Reflectance_Band_{b}" for b in (1, 4, 3)]
    refl = (ee.ImageCollection("MODIS/061/MOD09CMG").filterDate("2024-04-01", "2024-10-01")
            .filter(ee.Filter.calendarRange(1, 1, "day_of_week")).select(bands)
            .reduce(ee.Reducer.percentile([25])))
    lc = ee.ImageCollection("MODIS/061/MCD12Q1").filterDate("2020-01-01", "2021-01-01").first().select("LC_Type1")
    land = lc.neq(17)
    lat = ee.Image.pixelLonLat().select("latitude")
    ice = lc.eq(15).And(lat.lt(-55))
    ocean = ee.Image.constant([22, 34, 58]).visualize(min=0, max=255)
    snow = ee.Image.constant([228, 234, 240]).visualize(min=0, max=255)
    vis = refl.visualize(min=0, max=0.38, gamma=1.3)
    rgb = ocean.blend(vis.updateMask(land)).blend(snow.updateMask(ice))
    region = ee.Geometry.Rectangle(BBOX, "EPSG:4326", False)
    url = rgb.getThumbURL({"region": region, "dimensions": "2400x1200", "crs": "EPSG:4326", "format": "jpg"})
    OUT.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(url, OUT)
    print("wrote", OUT, OUT.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
