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
| Claude | Drafting English documentation | `README.md`, `REFERENCES.md`, `DECISIONS.md`, this file |
| Claude | English wording of the problem statement and the project page draft, from the team's decisions and the engine's results (method as the core problem, Ica as the case) | Project page (Claude Docs draft) |
| Claude | Literature and data-availability search (results checked against the sources linked in REFERENCES.md) | none (research notes) |

Marking:
- Every AI-assisted source file starts with a comment `AI-assisted: Claude (Anthropic)`.
- Map images are real satellite data rendered by Google Earth Engine (not AI-generated).
- Draft mascot images (Datron as Explorer, Analyst, Expert and detective, in `brand-drafts/datron/`) were generated with Codex (OpenAI image model via the Codex CLI) from the official SciTeX Datron poses; each prompt is saved next to its image. In the app: the detective version (head and magnifier) in the landing view, the Explorer, Analyst and Expert versions in the welcome dialog, and three Explorer poses (idea, coin, badge) in the Explorer mission (`web/public/brand/datron-*.png`), each with a visible "AI-generated" tag.
- The verdict texts in the app are produced by deterministic templates from the engine's numbers. No language model writes text at runtime.

The project idea, the choice of Ica, the statistical design (pre-registered thresholds, consensus of tests, control zone)
and the interpretation are the team's.
