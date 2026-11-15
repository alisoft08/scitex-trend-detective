# Use of AI

Space Apps 2026 rules allow AI to speed up the work, not to come up with the solution. This file lists every use.

| Tool | Used for | Files |
| --- | --- | --- |
| Claude (Anthropic), via Claude Code | Drafting and debugging code for Earth Engine extraction, zone definitions and map images | `pipeline/*.py` |
| Claude | Drafting the trend statistics, the verdict rule and the synthetic-series tests, following the team's method design | `engine/*.py`, `tests/*.py`, `config/verdict.yaml` |
| Claude | Monte Carlo simulation script and the build of the JSON data contract, including the fixed English templates that turn engine numbers into sentences | `scripts/*.py` |
| Claude | React/TypeScript app, CSS and hand-drawn SVG charts | `web/src/*`, `web/index.html` |
| Claude | Explorer mission (story, games, quiz) and its Spanish, Portuguese and French translations, plus translations of the welcome dialog and navigation, from the team's English text | `web/src/Mission.tsx`, `web/src/i18n.ts` |
| Claude | One-screen layouts: the Explorer mission as five slide-like chapters, and the Analyst and Expert levels as seven full-screen views with tabs; repository and Vercel deployment setup | `web/src/App.tsx`, `web/src/Mission.tsx`, `web/src/styles.css`, `web/vercel.json`, `README.md` |
| Claude | Validation scripts that rebuild three series with NASA AppEEARS and the GES DISC archive, and the comparison | `validation/*.py` |
| Claude | Improvements on Alison's level-functions branch: SciTeX brand rules (white background, no accent bars), the team's verdict names, a Sources view with every dataset and DOI, an impact band on the home page, years-to-detect for unproven trends, fflate declared as a dependency and the reproducible download loaded on demand | `web/src/Sources.tsx`, `web/src/ImpactBand.tsx`, `web/src/App.tsx`, `web/src/CaseFile.tsx`, `web/src/evidence.ts`, `web/src/styles.css`, `web/package.json` |
| Claude | Drafting English documentation | `README.md`, `REFERENCES.md`, `DECISIONS.md`, this file |
| Claude | English wording of the problem statement and the project page draft, from the team's decisions and the engine's results (method as the core problem, Ica as the case) | Project page (Claude Docs draft) |
| Claude | Literature and data-availability search (results checked against the sources linked in REFERENCES.md) | none (research notes) |

Marking:
- Every AI-assisted source file starts with a comment `AI-assisted: Claude (Anthropic)`.
- Map images are real satellite data rendered by Google Earth Engine (not AI-generated).
- Draft mascot images (Datron as Explorer, Analyst, Expert and detective, in `brand-drafts/datron/`) were generated with Codex (OpenAI image model via the Codex CLI) from the official SciTeX Datron poses; each prompt is saved next to its image. In the app: the detective version (head and magnifier) in the landing view, the Explorer, Analyst and Expert versions in the welcome dialog, and three Explorer poses (idea, coin, badge) in the Explorer mission (`web/public/brand/datron-*.png`), marked as AI-generated in their alt text, in the app's Sources view and in this file (the team chose not to overlay a visible tag on the mascot).
- Claude (Anthropic) added the Central Valley, California comparison case (`config/comparison_zones.geojson`, `pipeline/zones.py`, `pipeline/extract_series.py`, `scripts/build_web_data.py`), the home sections `web/src/TwoValleys.tsx` and `web/src/Audiences.tsx`, and fixed an undefined variable in the contrast loop of `scripts/build_web_data.py`. The team chose the comparison region and reviewed the result.
- Claude (Anthropic) built the Explorer field lab (design, `pipeline/yearly.py`, `web/src/FieldLab.tsx`, `web/src/fieldlab/*`, `web/src/i18n.ts`, `docs/superpowers/*`) from the team's direction that the student should discover with real instruments instead of answering a quiz; its Spanish, Portuguese and French text was drafted with AI.
- Claude (Anthropic) built the world aquifer atlas: six aquifer boxes (`config/comparison_zones.geojson`, `pipeline/zones.py`), year-by-year extraction with retries (`pipeline/extract_series.py`), the MODIS world mosaic (`pipeline/world_map.py`), the atlas block and its template text (`scripts/build_web_data.py`), the dependency-free 3D globe (`web/src/Globe.tsx`) and the atlas view (`web/src/Atlas.tsx`). The team chose the aquifers from Richey et al. (2015) and Rodell et al. (2018).
- Claude (Anthropic) added cropland greenness, crop water use and air temperature to the atlas aquifers (MCD12Q1 cropland mask), the aquifer search, the black atlas design, and the Expert-only switch (`web/src/levels.ts`, `EXPERT_ONLY`), all following the team's decisions of 15 Nov 2026.
- Claude (Anthropic) made the globe the home page (team decision: a global platform, Ica as one aquifer among several), with the pop-out card, leader line, quick filter and satellite close-ups (`pipeline/aquifer_thumbs.py`, `web/src/Globe.tsx`, `web/src/Atlas.tsx`); the Ica lens moved to its own page (`#ica`).
- Claude (Anthropic) added the globe's auto-rotation, the full-width layout and a mini card per aquifer (satellite close-up, name and GRACE number tied to its point), following the team's design direction of 15 Nov 2026.
- Claude (Anthropic) wrote the WebGL2 globe renderer (`web/src/globeGL.ts`: orthographic projection in a fragment shader, mipmapped MODIS texture, sunlight and atmosphere rim) and the 4096 x 2048 tiled world mosaic (`pipeline/world_map.py`).
- The verdict texts in the app are produced by deterministic templates from the engine's numbers. No language model writes text at runtime.

The project idea, the choice of Ica, the statistical design (pre-registered thresholds, consensus of tests, control zone)
and the interpretation are the team's.
