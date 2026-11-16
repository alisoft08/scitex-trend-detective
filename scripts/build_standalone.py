# AI-assisted: Claude (Anthropic). Pack the built web app into one self-contained HTML file to share.
"""Reads web/dist (run `npm run build` first) and writes share/OasisParadox.html.

Everything is inlined: the JS bundle, the CSS, every JSON file of the data contract and every image (as data URIs).
Only the Montserrat web font is loaded from Google Fonts; offline, the page falls back to system fonts.
"""
import base64
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "web" / "dist"
OUT = ROOT / "share" / "OasisParadox.html"
MIME = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml"}


def main():
    js = "".join(p.read_text(encoding="utf-8") for p in sorted((DIST / "assets").glob("*.js")))
    css = "".join(p.read_text(encoding="utf-8") for p in sorted((DIST / "assets").glob("*.css")))
    data, assets = {}, {}
    for p in sorted((DIST / "data").rglob("*")):
        if not p.is_file():
            continue
        rel = p.relative_to(DIST / "data").as_posix()
        if p.suffix in (".json", ".geojson"):
            data[rel] = json.loads(p.read_text(encoding="utf-8"))
        elif p.suffix in MIME:
            assets[f"data/{rel}"] = f"data:{MIME[p.suffix]};base64," + base64.b64encode(p.read_bytes()).decode()
    for p in sorted((DIST / "brand").glob("*")):
        if p.suffix in MIME:
            assets[f"brand/{p.name}"] = f"data:{MIME[p.suffix]};base64," + base64.b64encode(p.read_bytes()).decode()
    embed = json.dumps({"data": data, "assets": assets}, separators=(",", ":")).replace("</", "<\\/")
    js = js.replace("</script", "<\\/script")
    html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Oasis Paradox · Team SciTeX</title>
<meta name="description" content="A trend detective for Ica, Peru, built on NASA Earth data. NASA Space Apps Challenge 2026, team SciTeX.">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400..800;1,400..600&display=swap">
<style>{css}</style>
<script>window.__OASIS__ = {embed};</script>
</head>
<body>
<div id="root"></div>
<script type="module">{js}</script>
</body>
</html>
"""
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding="utf-8")
    print("wrote", OUT, round(OUT.stat().st_size / 1e6, 1), "MB,", len(data), "JSON files,", len(assets), "images")


if __name__ == "__main__":
    main()
