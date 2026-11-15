# AI-assisted: Claude (Anthropic). Map images for the web app, rendered by Earth Engine.
"""Before/after true-color Landsat composites and a per-pixel NDVI Sen-slope map.

All images share MAP_BBOX (equirectangular), so the web app can overlay zones and
wells with a simple linear lon/lat -> pixel transform.
"""
import json
import sys
from pathlib import Path

import ee
import requests

sys.path.insert(0, str(Path(__file__).parent))
import zones as Z  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "web" / "public" / "data" / "img"
WIDTH = 1700  # longest side in pixels; the map is the page's main visual


def landsat_sr(col_id, bands, year, region):
    def f(img):
        qa = img.select("QA_PIXEL")
        clear = qa.bitwiseAnd(1 << 3).eq(0).And(qa.bitwiseAnd(1 << 4).eq(0))
        sr = img.select(bands, ["r", "g", "b"]).multiply(0.0000275).add(-0.2)
        return sr.updateMask(clear)
    col = (ee.ImageCollection(col_id).filterBounds(region).filterDate(f"{year}-01-01", f"{year + 1}-01-01")
           .filter(ee.Filter.lt("CLOUD_COVER", 30)))  # fewer scenes keep large renders under the Earth Engine memory cap
    return col.map(f)


HERO_BBOX = [-76.45, -14.40, -75.25, -13.72]   # Paracas coast to the Andean foothills, about 16:9
HERO_WIDTH = 2400


def true_color(year, bbox=None):
    region = Z.rect(bbox or Z.MAP_BBOX)
    if year <= 2011:
        col = landsat_sr("LANDSAT/LT05/C02/T1_L2", ["SR_B3", "SR_B2", "SR_B1"], year, region)
    else:
        col = landsat_sr("LANDSAT/LC08/C02/T1_L2", ["SR_B4", "SR_B3", "SR_B2"], year, region).merge(
            landsat_sr("LANDSAT/LC09/C02/T1_L2", ["SR_B4", "SR_B3", "SR_B2"], year, region))
    img = col.median()
    return img.visualize(min=0.0, max=0.28, gamma=1.3)


def relief():
    """Soft hillshade from SRTM (NASA/NGA) on a pale brand-gray paper; the sea in a muted blue-gray."""
    dem = ee.Image("USGS/SRTMGL1_003")
    hs = ee.Terrain.hillshade(dem, 315, 35)
    land = hs.visualize(min=60, max=255, palette=["b9c0c9", "fbfcfd"])
    sea = ee.Image.constant([207, 218, 228]).visualize(min=0, max=255)
    return sea.where(dem.gt(0), land)


def ndvi_sen_map():
    years = list(range(2004, 2025))
    imgs = [Z.annual_max(y).rename("ndvi").addBands(ee.Image.constant(y).float().rename("year")) for y in years]
    stack = ee.ImageCollection(imgs).select(["year", "ndvi"])
    slope = stack.reduce(ee.Reducer.sensSlope()).select("slope").multiply(10)  # per decade
    pal = ["3f3e3d", "71706f", "b0afae", "f5f6f8", "b4cce6", "7fa6d6", "3c78bb"]  # SciTeX brand: gray = browning, blue = greening
    color = slope.visualize(min=-0.3, max=0.3, palette=pal)
    # Show change only where it is visible (|slope| >= 0.04 NDVI per decade); relief elsewhere.
    return relief().blend(color.updateMask(slope.abs().gte(0.04).multiply(0.94)))


def save(img, name, bbox=None, width=WIDTH):
    url = img.getThumbURL({"region": Z.rect(bbox or Z.MAP_BBOX), "dimensions": width, "format": "png"})
    data = requests.get(url, timeout=300).content
    if name.endswith(".jpg"):  # true-color photos: JPEG keeps the web bundle small
        import io
        from PIL import Image
        buf = io.BytesIO()
        Image.open(io.BytesIO(data)).convert("RGB").save(buf, "JPEG", quality=82, optimize=True)
        data = buf.getvalue()
    (OUT / name).write_bytes(data)
    print("saved", name, len(data) // 1024, "KB")


def main():
    Z.init()
    OUT.mkdir(parents=True, exist_ok=True)
    save(true_color(2004), "landsat_2004.jpg")
    save(true_color(2024), "landsat_2024.jpg")
    save(ndvi_sen_map(), "ndvi_trend.jpg")
    meta = {
        "bbox": Z.MAP_BBOX,
        "crs": "EPSG:4326 (equirectangular PNG)",
        "images": {
            "landsat_2004": {"file": "img/landsat_2004.jpg", "source": "Landsat 5 TM Collection 2 Level-2, 2004 median, true color"},
            "landsat_2024": {"file": "img/landsat_2024.jpg", "source": "Landsat 8/9 OLI Collection 2 Level-2, 2024 median, true color"},
            "ndvi_trend": {"file": "img/ndvi_trend.jpg",
                           "source": "Sen slope of annual max NDVI (MODIS MOD13Q1 v6.1), 2004-2024, over SRTM relief",
                           "units": "NDVI per decade", "min": -0.3, "max": 0.3,
                           "palette": ["#3f3e3d", "#71706f", "#b0afae", "#f5f6f8", "#b4cce6", "#7fa6d6", "#3c78bb"],
                           "note": "Changes smaller than 0.04 per decade are left as relief. Magnitude only; per-pixel significance is not tested in this MVP."},
        },
    }
    (OUT.parent / "map.json").write_text(json.dumps(meta, indent=2))


def save_tiled(img, name, bbox, width, tiles=2):
    """Large renders exceed Earth Engine's memory cap: fetch vertical strips and stitch them (same composite, no seams)."""
    import io
    from PIL import Image
    w, s, e, n = bbox
    step = (e - w) / tiles
    parts = []
    for k in range(tiles):
        sub_bbox = [w + k * step, s, w + (k + 1) * step, n]
        url = img.getThumbURL({"region": Z.rect(sub_bbox), "dimensions": width // tiles, "format": "png"})
        parts.append(Image.open(io.BytesIO(requests.get(url, timeout=300).content)).convert("RGB"))
    h = min(p.height for p in parts)
    out = Image.new("RGB", (sum(p.width for p in parts), h))
    x = 0
    for p in parts:
        out.paste(p.crop((0, 0, p.width, h)), (x, 0))
        x += p.width
    buf = io.BytesIO()
    out.save(buf, "JPEG", quality=82, optimize=True)
    (OUT / name).write_bytes(buf.getvalue())
    print("saved", name, out.size, len(buf.getvalue()) // 1024, "KB")


def main_hero():
    """Wide before/after pair for the landing view."""
    Z.init()
    save_tiled(true_color(2004, HERO_BBOX), "hero_2004.jpg", HERO_BBOX, HERO_WIDTH)
    save_tiled(true_color(2024, HERO_BBOX), "hero_2024.jpg", HERO_BBOX, HERO_WIDTH)
    meta_path = OUT.parent / "map.json"
    meta = json.loads(meta_path.read_text())
    meta["hero"] = {"bbox": HERO_BBOX,
                    "before": {"file": "img/hero_2004.jpg", "source": "Landsat 5 TM Collection 2 Level-2, 2004 median, true color"},
                    "after": {"file": "img/hero_2024.jpg", "source": "Landsat 8/9 OLI Collection 2 Level-2, 2024 median, true color"}}
    meta_path.write_text(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main_hero() if sys.argv[1:] == ["hero"] else main()
