# AI-assisted: Claude (Anthropic). Zone definitions for the Oasis Paradox MVP.
"""Study zones as Earth Engine geometries and masks.

Zones are provisional (drawn from boxes + satellite masks) until the team
replaces them with hand-digitized polygons in config/zones.geojson.
"""
import ee

PROJECT = "oasis-paradox"

# Overall map extent [west, south, east, north]
MAP_BBOX = [-76.15, -14.55, -75.35, -13.60]

# Rough boxes (lon/lat). Irrigated zones are box ∩ cropland mask.
BOXES = {
    "Z1": [-75.82, -14.45, -75.62, -13.95],   # Ica valley
    "Z2": [-76.08, -14.00, -75.80, -13.80],   # Villacuri plains (south of the Pisco valley)
    "Z5": [-76.10, -14.42, -75.90, -14.12],   # coastal desert control
}
# Water block for coarse products (GLDAS 0.25 deg, GRACE 3 deg mascon)
WATER_BLOCK = [-76.08, -14.45, -75.62, -13.80]
# Comparison case outside Peru: California's Central Valley (Sacramento + San Joaquin valleys), where GRACE
# famously sees groundwater depletion (Famiglietti et al., 2011). Same coarse products, same engine.
CENTRAL_VALLEY = [-122.40, 35.00, -118.80, 40.30]
# World aquifer atlas: approximate boxes around major irrigated aquifer systems named in GRACE studies
# (Richey et al., 2015; Rodell et al., 2018). Boxes, not official aquifer boundaries.
AQUIFERS = {
    "ZC": CENTRAL_VALLEY,                      # Central Valley, California
    "ZHP": [-104.50, 32.00, -96.50, 43.50],   # High Plains (Ogallala), United States
    "ZIN": [70.00, 24.00, 79.00, 32.50],      # Northwest India (Punjab, Haryana, Rajasthan)
    "ZAR": [37.00, 23.00, 48.00, 31.00],      # Arabian aquifer system (Saq), Saudi Arabia
    "ZTE": [38.00, 30.00, 49.00, 38.50],      # Tigris-Euphrates
    "ZGU": [-58.50, -31.00, -47.00, -16.00],  # Guarani aquifer system, South America
}

ZONE_META = {
    "Z1": {"name": "Ica Valley", "role": "irrigated",
           "description": "Long-established irrigated valley floor of the Ica River."},
    "Z2": {"name": "Villacurí plains", "role": "irrigated",
           "description": "Desert plains north-west of Ica, irrigated mostly with groundwater."},
    "Z4": {"name": "Upper Ica basin", "role": "climate_control",
           "description": "Andean headwaters (above 2,500 m) where the rain that recharges the aquifer falls."},
    "Z5": {"name": "Desert control", "role": "control",
           "description": "Hyper-arid desert with no irrigation, used to remove the shared climate signal."},
    "ZW": {"name": "Ica-Villacurí water block", "role": "water_block",
           "description": "Both irrigated zones together; the smallest area coarse water products can speak to."},
    "ZC": {"name": "Central Valley, California", "role": "comparison",
           "description": "Comparison case: about 50,000 km2 of irrigated valley floor pumping far more groundwater "
                          "than Ica, the region where GRACE first measured aquifer depletion."},
}


def init():
    ee.Initialize(project=PROJECT)


def rect(b):
    return ee.Geometry.Rectangle(b, None, False)


def modis_ndvi():
    def f(img):
        ndvi = img.select("NDVI").multiply(0.0001).updateMask(img.select("SummaryQA").lte(1))
        return ndvi.copyProperties(img, ["system:time_start"])
    return ee.ImageCollection("MODIS/061/MOD13Q1").map(f)


def annual_max(year):
    return modis_ndvi().filterDate(f"{year}-01-01", f"{year + 1}-01-01").max()


def cropland_mask():
    """Pixels green (annual max NDVI > 0.4) in at least one of 2020-2024."""
    stack = ee.ImageCollection([annual_max(y) for y in range(2020, 2025)]).max()
    return stack.gt(0.4)


def desert_mask():
    """Pixels whose annual max NDVI stayed below 0.12 in every year 2004-2024."""
    stack = ee.ImageCollection([annual_max(y) for y in range(2004, 2025)]).max()
    return stack.lt(0.12)


def upper_basin():
    """HydroBASINS level-7 unit of the Ica River (about 7,300 km2)."""
    basins = ee.FeatureCollection("WWF/HydroSHEDS/v1/Basins/hybas_7")
    return basins.filterBounds(ee.Geometry.Point([-75.70, -14.05])).first().geometry()


def modis_cropland():
    """Atlas cropland: MODIS MCD12Q1 v6.1 land cover 2020, IGBP classes 12 (croplands) and 14 (cropland/natural mosaic).
    Used instead of the Ica NDVI mask, which is too heavy over boxes thousands of km wide."""
    lc = ee.ImageCollection("MODIS/061/MCD12Q1").filterDate("2020-01-01", "2021-01-01").first().select("LC_Type1")
    return lc.eq(12).Or(lc.eq(14)).selfMask()


def modis_natural():
    """Atlas reference land: MODIS MCD12Q1 2020 IGBP classes 6, 7, 9, 10 and 16 (shrublands, savannas, grasslands, barren),
    i.e. land that is neither cropland, forest, water nor city. It plays the role of Ica's desert control."""
    lc = ee.ImageCollection("MODIS/061/MCD12Q1").filterDate("2020-01-01", "2021-01-01").first().select("LC_Type1")
    return lc.eq(6).Or(lc.eq(7)).Or(lc.eq(9)).Or(lc.eq(10)).Or(lc.eq(16)).selfMask()


def is_atlas(zone: str) -> bool:
    """Atlas aquifer box ('ZIN') or its reference land ('ZINR')."""
    return zone in AQUIFERS or (zone.endswith("R") and zone[:-1] in AQUIFERS)


def zone_masks():
    """Return {zone_id: (region_geometry, mask_image_or_None)}."""
    crop = cropland_mask()
    elev = ee.Image("USGS/SRTMGL1_003")
    basin = upper_basin()
    return {
        "Z1": (rect(BOXES["Z1"]), crop),
        "Z2": (rect(BOXES["Z2"]), crop),
        "Z5": (rect(BOXES["Z5"]), desert_mask()),
        "Z4": (basin, elev.gt(2500)),
        "ZW": (rect(WATER_BLOCK), None),
        "ZC": (rect(CENTRAL_VALLEY), None),
        **{k: (rect(b), modis_cropland()) for k, b in AQUIFERS.items()},  # the mask applies to field variables only
        **{f"{k}R": (rect(b), modis_natural()) for k, b in AQUIFERS.items()},
    }
