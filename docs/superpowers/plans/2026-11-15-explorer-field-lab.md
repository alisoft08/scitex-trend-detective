# Explorer Field Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the quiz-style Explorer mission with a field lab of four instruments (satellite time machine, drill a well, weigh water from space, tricky-witness lab) ending in the student's own field notebook.

**Architecture:** Python (Earth Engine) precomputes one new data file plus images; the browser only draws and looks values up. Pure TypeScript helpers (nearest well, GRACE grid snap, notebook builder) live in one tested module; each instrument is its own React component; `Mission.tsx` becomes the chapter shell.

**Tech Stack:** Python 3.12 + earthengine-api + Pillow (existing `.venv` in `../oasis-paradox-mvp/.venv`); Vite 5 + React 18 + TypeScript; Vitest (new dev dependency, MIT) for the helpers.

**Spec:** `docs/superpowers/specs/2026-11-15-explorer-field-lab-design.md`

## Global Constraints

- Branch `feature/explorer-field-lab` from `develop`; PR to `develop` only. Never merge to `main` or `vercel deploy --prod`.
- No statistics in JavaScript; every number comes from JSON written by Python. Values missing → `null`, never `NaN`.
- No grading: no right/wrong, no score. Stamp "Junior Data Detective" only when all four instruments were used.
- Notebook conclusion (exact, EN): "From space, the desert turned green in both places. In the valley, where wells are measured, the water falls. Gravity satellites can't see it at this scale, and quick tests can fool you."
- Villacurí click in chapter 2 (exact, EN): "No public wells here; the JUASVI network measures the Ica Valley."
- GRACE off-cell (exact, EN): "This cell is not in our case file."
- Green area = MODIS MOD13Q1 annual peak NDVI > 0.4 inside zone boxes Z1, Z2 (`pipeline/zones.py` `BOXES`); Landsat is only the picture.
- One screen per chapter from 1280×720 (no page scroll); phone = one column, instrument first.
- All Explorer text in EN/ES/PT/FR (`web/src/i18n.ts`); Datron lines short, no exclamation marks; no visible AI tag.
- Every AI-assisted new file starts with `// AI-assisted: Claude (Anthropic).` (or `#` in Python).

## Review Focus

1. A year whose green measurement is missing (`null`) → the meter shows "no measurement" for that year, slider keeps working. Test: `greenAt(yearly, 'Z2', 2012)` with a null entry returns `null` (Task 2).
2. Click far from every well or outside the valley → Datron message, no tally change. Tests: `drillAt` cases (Task 2).
3. Drilling the same well twice → counted once. Test in Task 2.
4. `#mission-5` opened directly with nothing used → four "Instrument not used yet" slots, no stamp. Test: `buildNotebook({})` (Task 2).
5. Switching language mid-mission keeps the student's findings (state is keyed by data, not by text). Checked in Task 5 manual run.

---

### Task 1: Yearly images, green area and regional relief (Python, Earth Engine)

**Files:**
- Create: `pipeline/yearly.py`
- Create: `tests/test_yearly.py`
- Writes: `web/public/data/img/years/landsat_2004.jpg` … `landsat_2024.jpg`, `web/public/data/img/region_relief.jpg`, `web/public/data/yearly.json`

**Interfaces:**
- Produces `yearly.json`:
  ```json
  { "bbox": [-76.45, -14.40, -75.25, -13.72], "years": [2004, …, 2024],
    "images": {"2004": {"file": "img/years/landsat_2004.jpg", "sensor": "Landsat 5 TM"}, …},
    "green_km2": {"Z1": [n|null × 21], "Z2": [n|null × 21]},
    "method": "MODIS MOD13Q1 v6.1 annual peak NDVI > 0.4 inside the zone box; area at 250 m.",
    "region": {"file": "img/region_relief.jpg", "bbox": [-80.0, -18.0, -72.0, -10.0]},
    "grace_cell": {"center": [-75.85, -14.12], "size_deg": 3.0} }
  ```
- Python helper `sensor_for_year(year: int) -> tuple[str, str]` returns (Earth Engine collection id or "L8+L9", human label).

- [ ] **Step 1: Write failing tests** `tests/test_yearly.py`: `sensor_for_year(2004)[1] == "Landsat 5 TM"`, `sensor_for_year(2011)[1] == "Landsat 5 TM"`, `sensor_for_year(2012)[1] == "Landsat 7 ETM+"`, `sensor_for_year(2013)[1] == "Landsat 8/9 OLI"`; `km2(1_234_567.0) == 1.2` (m² → km², one decimal).
- [ ] **Step 2:** `../oasis-paradox-mvp/.venv/bin/python -m pytest tests/test_yearly.py -v` → FAIL (module missing).
- [ ] **Step 3: Implement** `sensor_for_year`, `km2`, and `main()` in `pipeline/yearly.py`, reusing `images.landsat_sr`, `images.save_tiled`, `images.relief`, `zones.annual_max`, `zones.rect`, `zones.BOXES`, `zones.init`. Landsat 7 for 2012: `LANDSAT/LE07/C02/T1_L2`, bands `SR_B3,SR_B2,SR_B1`, yearly median. Images 1400 px wide (`save_tiled(..., tiles=2)`), JPEG q≈80. Green area: `ee.Image.pixelArea().updateMask(annual_max(y).gt(0.4)).reduceRegion(sum, box, 250)`. Region relief: `relief()` over the region bbox, 1200 px. Total image budget ≤ 10 MB; lower quality if over.
- [ ] **Step 4:** tests PASS; run `../oasis-paradox-mvp/.venv/bin/python pipeline/yearly.py`; check 21 year files + relief exist, `du -sh web/public/data/img/years` ≤ 10M, and Z2 green 2024 ≈ 151 km² (matches `data/processed/cropland_area.json` order of magnitude).
- [ ] **Step 5: Commit** `feat(data): yearly Landsat images, MODIS green area and regional relief for the field lab`

### Task 2: Field-lab logic module (TypeScript, tested)

**Files:**
- Create: `web/src/fieldlab/logic.ts`, `web/src/fieldlab/logic.test.ts`
- Modify: `web/package.json` (devDependency `vitest@2.1.8`, script `"test": "vitest run"`)

**Interfaces:**
- Consumes: `yearly.json` (Task 1), `wells.geojson` (`well_id, rate_m_per_yr, years, date_start, date_end, depth_start_m, depth_end_m`), `zones.geojson` (Z1, Z2 rings).
- Produces:
  - `type Yearly` (shape above); `greenAt(y: Yearly, zone: "Z1"|"Z2", year: number): number | null`
  - `drillAt(lonlat: [number, number], wells: Well[], zones: ZoneRings, maxKm = 2): { kind: "well"; well: Well } | { kind: "villacuri" } | { kind: "none" }` (Villacurí = inside Z2 ring and no well within `maxKm`)
  - `snapGrace(lonlat: [number, number], cell: {center: [number, number]; size_deg: number}): { center: [number, number]; isIca: boolean }`
  - `type FieldState = { time?: { z2Start: number|null; z2End: number|null; z1Start: number|null; z1End: number|null }; wells?: { drilled: string[]; falling: number }; grace?: true; witness?: true }`
  - `buildNotebook(s: FieldState): { entries: { id: "time"|"wells"|"grace"|"witness"; used: boolean }[]; complete: boolean }`

- [ ] **Step 1: Write failing tests** in `logic.test.ts`: `greenAt` returns the 2024 value for index 20 and `null` for a null entry; `drillAt` on a point 0.5 km from a well → `kind:"well"` with that `well_id`; a point inside the Z2 ring far from wells → `"villacuri"`; a point in the sea → `"none"`; `snapGrace(cell.center)` → `isIca: true`; a point 3.2° east → `isIca: false` and center shifted by exactly `size_deg`; `buildNotebook({})` → 4 entries all `used:false`, `complete:false`; with all four set → `complete:true`.
- [ ] **Step 2:** `cd web && npm i -D vitest@2.1.8 && npm test` → FAIL.
- [ ] **Step 3: Implement** the functions (haversine distance for `maxKm`; point-in-polygon ray casting for zone rings; grid snap = round((p − center)/size) × size + center).
- [ ] **Step 4:** `npm test` → PASS; `npx tsc --noEmit -p .` clean.
- [ ] **Step 5: Commit** `feat(explorer): tested field-lab helpers (drill, GRACE grid, notebook)`

### Task 3: Instruments for chapters 1–2 (time machine, drill a well)

**Files:**
- Create: `web/src/fieldlab/TimeMachine.tsx`, `web/src/fieldlab/DrillWell.tsx`, `web/src/fieldlab/fieldlab.css` (imported from `main.tsx` after `styles.css`)

**Interfaces:**
- Consumes: Task 2 helpers; `asset()` / `useJSON()` from `web/src/data.ts`; `DICTS[lang].m` strings from Task 5 (use English literals first, swap to `t.*` keys in Task 5).
- Produces: `<TimeMachine yearly lang onRecord={(r: FieldState["time"]) => void} />` — year slider 2004–2024 + play button, the year's Landsat image (preload neighbours), green meter for Z2 (headline) and Z1 in km² and football fields (1 field = 0.00714 km²), mini line growing with the slider, honesty note "Picture: Landsat. Measurement: MODIS, one sensor for all 21 years." Records once the slider has reached both 2004 and 2024.
  `<DrillWell lang onRecord={(r: FieldState["wells"]) => void} />` — valley image (existing `landsat_2024`, `map.json` bbox), click → `drillAt`; well → animated cross-section (ground line, water level at first and last reading, dates, m/yr); Villacurí → the exact message; tally "You drilled N wells: F falling, R rising" + network fact (69% of 87; north ≈ 5.5 m per decade, two-storey house). Records after 3 drills.
- [ ] **Step 1:** build both components; temporarily mount them in chapters 1–2 of `Mission.tsx`.
- [ ] **Step 2:** `npm run build` passes; fit check (helper page at 1280×720 and 1024×640, `#mission-1`, `#mission-2`): `.ms-stage .ms-panel` scrollHeight ≤ clientHeight; screenshot reviewed.
- [ ] **Step 3: Commit** `feat(explorer): satellite time machine and drill-a-well instruments`

### Task 4: Chapters 3–5 and the new mission shell

**Files:**
- Create: `web/src/fieldlab/GraceScale.tsx`, `web/src/fieldlab/TrickyWitness.tsx`, `web/src/fieldlab/FieldNotebook.tsx`
- Modify: `web/src/Mission.tsx` (rewrite as shell: briefing + 5 chapters, `FieldState` in one `useState`, Datron lines per chapter, Back/Next, `startAt` from `#mission-N` kept)

**Interfaces:**
- `<GraceScale m yearly lang onRecord={() => void} />` — region relief image; draggable 3° square snapping with `snapGrace`; on the Ica cell: gauge "GRACE measured +14.2 mm per decade (rising)" from `manifest.cases` `ZW_tws_grace`, "194× the farms" from `manifest.impact.footprint_to_irrigated`, farms drawn to true scale; elsewhere the exact off-cell line. Records when the square has been on the Ica cell once.
- `<TrickyWitness lab lang onRecord={() => void} />` — reuse `CoinBoards`/`useCoinRun` from current `Mission.tsx` (move them into this file) + memory slider over `lab.json` grid showing the classic vs ours false-alarm rates; then GLDAS wiggle with "quick test: rising" vs "checked properly: not proven". Records when the 100 runs finish.
- `<FieldNotebook state m lang onAnalyst onRestart />` — entries from `buildNotebook`: dataset-wide finding + the student's own sample when it differs in kind (e.g. drilled only rising wells → the small-sample line); unused → "Instrument not used yet" + open button; conclusion (exact text); stamp when `complete`; optional name field (local state only).
- [ ] **Step 1:** implement the three components and rewrite `Mission.tsx`; delete the quiz, predictions and score code.
- [ ] **Step 2:** `npm test && npm run build` pass; fit check all six screens (`#mission`, `#mission-1`…`#mission-5`) at 1280×720 and 1024×640, and 390 px width (no horizontal scroll); `#mission-5` direct → 4 unused slots, no stamp.
- [ ] **Step 3: Commit** `feat(explorer): GRACE scale, tricky witness lab, field notebook; mission without quizzes`

### Task 5: Translations, docs, review build

**Files:**
- Modify: `web/src/i18n.ts` (replace `m.c1`…`m.c5` Explorer strings with field-lab strings in EN/ES/PT/FR; remove quiz strings), `REFERENCES.md` (Landsat 7 ETM+ C2 L2, regional SRTM relief), `AI_USAGE.md`, `README.md` (Explorer description)

- [ ] **Step 1:** move every visible Explorer string into `i18n.ts` for the four languages; `tsc` clean (the `Dict` type forces all languages to match).
- [ ] **Step 2:** manual run in ES at 1280×720: change language mid-chapter 2 → findings kept; screenshots of all chapters in EN and ES reviewed.
- [ ] **Step 3:** `npm test && npm run build`; `../oasis-paradox-mvp/.venv/bin/python -m pytest -q` (engine + yearly) pass.
- [ ] **Step 4: Commit**, push branch, open PR to `develop`, `vercel deploy` (preview, no `--prod`) and report the preview URL.
