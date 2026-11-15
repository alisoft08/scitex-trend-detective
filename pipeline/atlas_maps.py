# AI-assisted: Claude (Anthropic). Per-aquifer evidence maps and cropland areas for the world aquifer atlas.
"""For every atlas aquifer:

1. web/public/data/img/aquifers/<zone>_trend.png: per-pixel Sen slope of the annual maximum NDVI (MODIS MOD13Q1 v6.1),
   2004-2024, per decade, the same method and palette as Ica's evidence map (pipeline/images.py), on a 2 km grid.
2. data/processed/atlas_cropland_area.json: cropland area in km2 (MODIS MCD12Q1 2020, IGBP classes 12 and 14), used to
   turn MODIS evapotranspiration (mm) into a volume of water used by crops.
"""
import json
import sys
import time
import urllib.request
from pathlib import Path

import ee

sys.path.insert(0, str(Path(__file__).parent))
import zones as Z  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
IMG = ROOT / "web" / "public" / "data" / "img" / "aquifers"
AREA = ROOT / "data" / "processed" / "atlas_cropland_area.json"
PALETTE = ["3f3e3d", "71706f", "b0afae", "f5f6f8", "b4cce6", "7fa6d6", "3c78bb"]   # as in Ica's map


def retry(fn, tries=6):
    for k in range(tries):
        try:
            return fn()
        except Exception:  # Earth Engine is sometimes busy
            if k == tries - 1:
                raise
            time.sleep(8 * (k + 1))


def trend_map(zone, box):
    region = ee.Geometry.Rectangle(box, "EPSG:4326", False)
    imgs = [Z.annual_max(y).rename("ndvi").addBands(ee.Image.constant(y).float().rename("year")) for y in range(2004, 2025)]
    slope = ee.ImageCollection(imgs).select(["year", "ndvi"]).reduce(ee.Reducer.sensSlope()).select("slope").multiply(10)
    land = ee.ImageCollection("MODIS/061/MCD12Q1").filterDate("2020-01-01", "2021-01-01").first().select("LC_Type1").neq(17)
    # Same rule as Ica's map: colour only where the change is visible (|slope| >= 0.04 NDVI per decade); transparent elsewhere.
    vis = slope.visualize(min=-0.3, max=0.3, palette=PALETTE).updateMask(land.And(slope.abs().gte(0.04)))
    url = vis.reproject("EPSG:4326", None, 2000).getThumbURL({"region": region, "dimensions": 1400, "crs": "EPSG:4326", "format": "png"})
    retry(lambda: urllib.request.urlretrieve(url, IMG / f"{zone}_trend.png"))


def cropland_km2(box):
    region = ee.Geometry.Rectangle(box, "EPSG:4326", False)
    area = ee.Image.pixelArea().updateMask(Z.modis_cropland()).reduceRegion(
        ee.Reducer.sum(), region, 1000, maxPixels=1e12, bestEffort=True).get("area")
    return round(retry(lambda: ee.Number(area).getInfo()) / 1e6)


def main():
    Z.init()
    areas = {}
    for zone, box in Z.AQUIFERS.items():
        areas[zone] = cropland_km2(box)
        trend_map(zone, box)
        print(zone, areas[zone], "km2 cropland; trend map written", flush=True)
    AREA.write_text(json.dumps({"km2": areas, "source": "MODIS MCD12Q1 v6.1, 2020, IGBP classes 12 and 14, 1 km sum"}, indent=1))


if __name__ == "__main__":
    main()
