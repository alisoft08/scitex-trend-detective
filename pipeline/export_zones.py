# AI-assisted: Claude (Anthropic). Write config/zones.geojson from the zone definitions.
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import zones as Z  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]


def box_polygon(b):
    w, s, e, n = b
    return {"type": "Polygon", "coordinates": [[[w, s], [e, s], [e, n], [w, n], [w, s]]]}


def main():
    Z.init()
    feats = []
    for zid, b in [("Z1", Z.BOXES["Z1"]), ("Z2", Z.BOXES["Z2"]), ("Z5", Z.BOXES["Z5"]), ("ZW", Z.WATER_BLOCK)]:
        mask = {"Z1": "cropland (annual max NDVI > 0.4 in any year 2020-2024)",
                "Z2": "cropland (annual max NDVI > 0.4 in any year 2020-2024)",
                "Z5": "never-green desert (annual max NDVI < 0.12 every year 2004-2024)",
                "ZW": "none (whole box)"}[zid]
        feats.append({"type": "Feature", "geometry": box_polygon(b),
                      "properties": {"id": zid, **Z.ZONE_META[zid], "mask": mask}})
    basin = Z.upper_basin().simplify(2000).getInfo()
    feats.append({"type": "Feature", "geometry": basin,
                  "properties": {"id": "Z4", **Z.ZONE_META["Z4"],
                                 "mask": "elevation above 2,500 m (SRTM) inside the HydroBASINS level-7 Ica basin"}})
    out = {"type": "FeatureCollection", "features": feats}
    (ROOT / "config" / "zones.geojson").write_text(json.dumps(out))
    print("zones:", [f["properties"]["id"] for f in feats])


if __name__ == "__main__":
    main()
