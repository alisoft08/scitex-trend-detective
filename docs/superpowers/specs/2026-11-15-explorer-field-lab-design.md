# Explorer level: "Field Lab" redesign

Date: 2026-11-15 · Author: team SciTeX (drafted with Claude Code) · Status: approved by Manuel (2026-11-15)

## Intent

The Explorer level (school students) is a guided mission that today feels like an exam: the student predicts,
answers multiple-choice questions and a 3-question quiz, and ends with a score ("2 of 3 right") and a badge.
The real material (20 years of Landsat images, 87 field wells, the false-alarm lab, gravity satellites) is used
to ask questions, not to discover.

Manuel's direction: **the student discovers something with their own hands, like a real scientist.** The level
must excite, inform, and help win NASA Space Apps judging (creativity, validity, presentation; it is also the
most likely footage for the 30-second video).

## Goals

- Each chapter is a **real instrument** the student operates; the finding comes out of their own action, with a
  real number from NASA (or field) data.
- No grading: no right/wrong answers, no score. The ending is the student's own **field notebook**: the four
  findings they produced, with numbers and sources.
- Scientifically honest: every number is precomputed in Python from the same pipeline, with its source; the
  page only draws and looks up values. "Not proven" still means "not proven".
- Fits one screen per chapter (the one-screen rule already in place) and works on a phone in one column.
- English by default, plus the existing Spanish, Portuguese and French for all Explorer text.

## Non-goals

- No new statistics in JavaScript (CLAUDE.md rule). No live Earth Engine calls from the browser.
- Analyst and Expert levels are not changed, except where they reuse a new data file.
- No accounts, no saving progress to a server.

## Anti-goals (would be a failure even if it works)

- Turning instruments back into quizzes ("what do you think?" buttons with right/wrong feedback).
- Numbers that look precise but are not traceable to a dataset and a method.
- A chapter that needs scrolling to see its result on a laptop.
- Anything that breaks the pre-event rule caveat, credentials or licensing rules in CLAUDE.md.

## Constraints

- Feature freeze Sunday 15 November at noon (Lima). Work tonight, review in the morning.
- Git flow: branch `feature/explorer-field-lab` from `develop`, PR to `develop`. Never merge to `main` or deploy to
  production without the team's decision. Review via Vercel preview deployments.
- Data: Google Earth Engine project `oasis-paradox` from Manuel's laptop (pipeline code exists in `pipeline/`).
- Brand: SciTeX palette and Montserrat; Datron mascot stays (no visible AI tag, per team decision).

## Approaches considered

- **A. Field lab with instruments (chosen by Manuel).** Each chapter is an instrument: time machine of satellite
  images with a green-area meter, drilling wells, weighing water from space, the tricky-witness experiment, and a
  field notebook. Most impressive and most "real scientist"; needs one new yearly image/measurement dataset.
- B. Same mission, no questions: keep the five chapters and swap questions for manipulations. Fastest, no new
  data, less exciting.
- C. Free map sandbox with layers and a timeline. Closest to open science, but students get lost and it is hard to
  show in 30 seconds.

## The design

Datron stays as the guide (short lines, no exclamation marks), but speaks as a lab partner ("Move the slider.
Watch the green meter."), not as an examiner. The notebook on the side fills in as findings are produced.

### Chapter 0 · Briefing (cover)

The lens-map home already opens the app. The briefing names the case and the four instruments the student will
use. One button: "Open the field lab".

### Chapter 1 · Satellite time machine (Landsat + MODIS)

- A year slider 2004 → 2024 over **one true-color Landsat image per year** of the Ica–Villacurí area (same bbox
  as the hero, about 1,000–1,400 px wide, JPEG). The student drags or presses play.
- Next to it, a **green meter**: green (irrigated) area measured that year in Villacurí and in the Ica Valley,
  in km² and as football fields, plus a small line that grows as the slider moves.
- The finding the student "records": green area in Villacurí went from X km² (2004) to Y km² (2024).
- Data (new): `pipeline/yearly.py` (Earth Engine) produces
  - `img/years/landsat_YYYY.jpg` for 2004–2024: Landsat 5 TM (2004–2011), Landsat 7 ETM+ (2012, SLC-off; yearly
    median), Landsat 8/9 OLI (2013–2024); same rendering as the hero images;
  - `yearly.json`: per year and zone (Z1 Ica Valley, Z2 Villacurí), green area in km² from **MODIS MOD13Q1 annual
    peak NDVI > 0.4** inside the zone boxes (one consistent sensor for the measurement; Landsat is only the
    picture), with the method stated. Same threshold as the existing cropland mask.
- Honesty note shown small: "Picture: Landsat. Measurement: MODIS, one sensor for all 21 years."

### Chapter 2 · Drill a well (JUASVI field wells)

- On the valley image, the student **clicks anywhere to drill**. The nearest real well answers: a vertical
  cross-section animates the water table at its first and last reading (e.g. 24 m below ground in 2013,
  31 m in 2025), with the years and the rate per year.
- After a few drills, a running tally builds the picture: "You drilled 6 wells: 5 falling, 1 rising" and the
  valley-wide fact (69% of 87 wells falling; north of the valley about 5.5 m per decade, a two-storey house).
- Data: existing `wells.geojson` (first and last level per well, owners removed). Clicking snaps to the nearest
  well within a radius; outside, Datron says there is no well there.

### Chapter 3 · Weigh water from space (GRACE)

- The student learns that twin GRACE satellites **weigh** water by measuring tiny changes in gravity.
- Instrument: a regional map (Peru's coast and Andes) where the student **drags the GRACE "scale"** (its
  ~330 km footprint) over Ica; the farms are a tiny dot inside it (194× smaller). A gauge shows what GRACE
  measured for that footprint over 2004–2024 (water **rising**, +14 mm per decade) next to what the wells say
  (falling).
- Finding: "GRACE weighs a region 194 times bigger than the farms; wetter Andes hide Ica's loss."
- Data: existing manifest impact block and GRACE series; new: a regional relief image (SRTM hillshade, Earth
  Engine) for the map, about 8°×8°, and the footprint square in true scale.
- *Builder's call (reviewed):* the app has one GRACE series (JPL mascon cell over Ica). The "scale" moves in
  **jumps on the mascon grid**, not smoothly, because that is how the data is organized; the gauge gives a
  reading only on the Ica cell. Elsewhere it says "This cell is not in our case file" (no fake numbers).

### Chapter 4 · The tricky witness (honest test lab)

- Keep the coin experiment (precomputed trials from `lab.json`): the student runs 100 experiments with "fair"
  (no-memory) and "sticky" (groundwater-like memory) data where nothing changes, and watches the quick test cry
  "trend!" 6 vs 66 times. Then a **memory slider** (from the lab grid) lets them see false alarms grow with memory.
- Then the real witness: the GLDAS groundwater model series; quick test says "rising!", honest test says
  "not proven". No question; it is a demonstration the student runs.

### Chapter 5 · Field notebook (ending)

- The four findings the student produced, each with its number, the instrument, and the NASA/field source,
  laid out as a notebook page: "Case file № 001 · Field notes by [optional name]".
- One-sentence conclusion written from the findings ("From space the desert turns green; underground the water
  falls; the gravity satellites can't see it at this scale; and quick tests can fool you").
- Actions: "Explore like an Analyst" (opens the Analyst views) and "Start again". Optional: the student types a
  name to sign the notebook (stays in the browser only).
- No score, no badge for correctness. A "Junior Data Detective" stamp appears because the notebook is complete.
- *Builder's call (reviewed):* each notebook entry shows the **dataset-wide finding** (the validated number) and,
  under it, **the student's own sample** when it differs in kind (e.g. "You drilled 3 wells near the river: all
  rising. The full network: 69% of 87 falling. Small samples can mislead; that is why scientists measure many").
  A chapter opened by link or skipped leaves its slot as "Instrument not used yet" with a button to open it.
  The stamp appears when all four instruments have been used, whatever the readings were.

### Places and wording (decided by Manuel)

All 87 JUASVI wells are in the Ica Valley; Villacurí has none. So:
- Chapter 1's green meter shows **both** zones, Villacurí as the headline (desert to fields) and the Ica Valley
  next to it.
- Chapter 2 drills **only in the Ica Valley**. A click in Villacurí gets Datron's line: "No public wells here; the
  JUASVI network measures the Ica Valley."
- The notebook conclusion makes **no causal claim**: "From space, the desert turned green in both places. In the
  valley, where wells are measured, the water falls. Gravity satellites can't see it at this scale, and quick
  tests can fool you."

### Layout

One screen per chapter (as today): large instrument on the left, Datron + notebook and the finding on the right,
Back/Next at the bottom. Phones: one column, instrument first. Chapters can be opened by link (`#mission-1` …
`#mission-5`) for recording the video.

## What changes in the code

- `pipeline/yearly.py` (new) → `web/public/data/img/years/*.jpg`, `web/public/data/yearly.json`,
  `web/public/data/img/region_relief.jpg`. Python only; Earth Engine credentials stay on the laptop.
- `web/src/Mission.tsx` rewritten around the five instruments (component per chapter); `web/src/i18n.ts`
  Explorer strings rewritten in EN/ES/PT/FR; CSS for the new instruments.
- `REFERENCES.md` (Landsat 7, regional SRTM image), `AI_USAGE.md`, `README.md` (Explorer description).

## Left to the builder

- Exact visual style of each instrument within the brand palette; animation details; image sizes within a
  ~10 MB total budget for the 21 yearly images.
- Snap radius for wells and wording of Datron's lines (short, no exclamation marks).
- Whether the time machine autoplays once on arrival.
