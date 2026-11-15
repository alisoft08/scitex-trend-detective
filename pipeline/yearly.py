# AI-assisted: Claude (Anthropic). Data for the Explorer "field lab": one picture per year and the green area measured each year.
"""Satellite time machine and GRACE scale data.

- One true-color Landsat image per year 2004-2024 over the hero area (the picture only).
- Green (irrigated) area per year in the Ica Valley (Z1) and Villacurí (Z2), measured with ONE sensor for all
  21 years: MODIS MOD13Q1 annual peak NDVI > 0.4 inside the zone box, area at 250 m. Same threshold as the
  cropland mask used by the engine.
- A regional SRTM relief image for the GRACE footprint instrument.

Output: web/public/data/img/years/landsat_YYYY.jpg, web/public/data/img/region_relief.jpg, web/public/data/yearly.json
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import images as I  # noqa: E402
import zones as Z  # noqa: E402

YEARS = list(range(2004, 2025))
YEAR_WIDTH = 1400
REGION_BBOX = [-80.0, -18.0, -72.0, -10.0]
GRACE_CELL = {"center": [-75.85, -14.12], "size_deg": 3.0}
GREEN_NDVI = 0.4


def sensor_for_year(year: int) -> tuple[str, str]:
    """Earth Engine collection (or the L8+L9 pair) and its label for a calendar year."""
    if year <= 2011:
        return "LANDSAT/LT05/C02/T1_L2", "Landsat 5 TM"
    if year == 2012:  # Landsat 5 ended in 2011 and Landsat 8 data start in 2013
        return "LANDSAT/LE07/C02/T1_L2", "Landsat 7 ETM+"
    return "L8+L9", "Landsat 8/9 OLI"


def km2(area_m2: float) -> float:
    return round(area_m2 / 1e6, 1)


def true_color_year(year, bbox):
    import ee
    region = Z.rect(bbox)
    col_id, _ = sensor_for_year(year)
    if col_id == "L8+L9":
        col = I.landsat_sr("LANDSAT/LC08/C02/T1_L2", ["SR_B4", "SR_B3", "SR_B2"], year, region).merge(
            I.landsat_sr("LANDSAT/LC09/C02/T1_L2", ["SR_B4", "SR_B3", "SR_B2"], year, region))
    else:
        col = I.landsat_sr(col_id, ["SR_B3", "SR_B2", "SR_B1"], year, region)
    img = ee.ImageCollection(col).median()
    return img.visualize(min=0.0, max=0.28, gamma=1.3)


def green_km2(year, zone):
    import ee
    region = Z.rect(Z.BOXES[zone])
    green = Z.annual_max(year).gt(GREEN_NDVI)
    a = (ee.Image.pixelArea().updateMask(green).reduceRegion(ee.Reducer.sum(), region, 250, maxPixels=1e11)
         .get("area").getInfo())
    return km2(a) if a is not None else None


def main():
    Z.init()
    out_dir = I.OUT / "years"
    out_dir.mkdir(parents=True, exist_ok=True)
    bbox = I.HERO_BBOX
    only = {int(a) for a in sys.argv[1:] if a.isdigit()}
    images, green = {}, {"Z1": [], "Z2": []}
    for y in YEARS:
        name = f"years/landsat_{y}.jpg"
        if not only or y in only:
            I.save_tiled(true_color_year(y, bbox), name, bbox, YEAR_WIDTH, tiles=2)
        images[str(y)] = {"file": f"img/{name}", "sensor": sensor_for_year(y)[1]}
        for zone in ("Z1", "Z2"):
            green[zone].append(green_km2(y, zone))
        print(y, green["Z1"][-1], green["Z2"][-1], flush=True)
    if not only:
        I.save(I.relief(), "region_relief.jpg", REGION_BBOX, 1200)
    data = {
        "bbox": bbox, "years": YEARS, "images": images, "green_km2": green,
        "method": "MODIS MOD13Q1 v6.1 annual peak NDVI > 0.4 inside the zone box; area at 250 m.",
        "picture": "Landsat Collection 2 Level-2 yearly median, true color (Landsat 5 TM 2004-2011, Landsat 7 ETM+ 2012, Landsat 8/9 OLI 2013-2024).",
        "region": {"file": "img/region_relief.jpg", "bbox": REGION_BBOX, "source": "SRTM 30 m hillshade (NASA/NGA)"},
        "grace_cell": GRACE_CELL,
    }
    (I.OUT.parent / "yearly.json").write_text(json.dumps(data, indent=2))
    print("wrote yearly.json")


if __name__ == "__main__":
    main()
