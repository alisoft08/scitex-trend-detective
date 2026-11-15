# AI-assisted: Claude (Anthropic). Area of the cropland masks used for the ET series (Google Earth Engine).
"""Cropland area per zone (pixels with yearly peak NDVI > 0.4 in any year 2020-2024, inside the zone box).

The ET series is the mean ET over exactly these pixels, so mean ET x this area = water volume evaporated.
Output: data/processed/cropland_area.json
"""
import json
import sys
from pathlib import Path

import ee

sys.path.insert(0, str(Path(__file__).parent))
import zones as Z  # noqa: E402

OUT = Path(__file__).resolve().parents[1] / "data" / "processed" / "cropland_area.json"


def main():
    Z.init()
    crop = Z.cropland_mask()
    out = {}
    for zone in ("Z1", "Z2"):
        region = Z.rect(Z.BOXES[zone])
        res = {}
        for scale in (250, 500):  # NDVI grid and ET grid
            a = (ee.Image.pixelArea().updateMask(crop).reduceRegion(ee.Reducer.sum(), region, scale, maxPixels=1e11)
                 .get("area").getInfo())
            res[f"km2_at_{scale}m"] = round(a / 1e6, 1)
        res["box_km2"] = round(region.area(1).getInfo() / 1e6, 1)
        out[zone] = res
        print(zone, res, flush=True)
    OUT.write_text(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
