# AI-assisted: Claude (Anthropic). Tests for the pure helpers of pipeline/yearly.py (no Earth Engine needed).
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipeline"))

from yearly import km2, sensor_for_year  # noqa: E402


def test_landsat5_covers_2004_to_2011():
    assert sensor_for_year(2004)[1] == "Landsat 5 TM"
    assert sensor_for_year(2011)[1] == "Landsat 5 TM"


def test_landsat7_fills_the_2012_gap():
    assert sensor_for_year(2012)[1] == "Landsat 7 ETM+"


def test_landsat8_and_9_from_2013():
    assert sensor_for_year(2013)[1] == "Landsat 8/9 OLI"
    assert sensor_for_year(2024)[1] == "Landsat 8/9 OLI"


def test_km2_converts_square_meters_with_one_decimal():
    assert km2(1_234_567.0) == 1.2
