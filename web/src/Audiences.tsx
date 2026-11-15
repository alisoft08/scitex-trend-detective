// AI-assisted: Claude (Anthropic). Who uses the tool and which decision it supports, one tile per reading level.
import type { Level } from "./levels";

const TILES: { level: Level; who: string; decision: string; does: string; cta: string }[] = [
  { level: "explorer", who: "Teachers and students", decision: "Is this trend real, or just noise?",
    does: "A guided case in plain language: predict, check NASA data, and learn why “not proven” is not “no change”.",
    cta: "Start as an Explorer" },
  { level: "analyst", who: "Water boards, journalists, NGOs", decision: "Can we act on a claimed trend?",
    does: "Each verdict shows its interval, how often a classic test would raise a false alarm, and the source. Example: a classic test says Ica's groundwater is rising; the engine says inconclusive, and the wells say it is falling.",
    cta: "Open as an Analyst" },
  { level: "expert", who: "Researchers", decision: "Does the verdict hold up?",
    does: "Robustness windows, leave-one-year-out fits, and a download with the data, code and settings to reproduce any case.",
    cta: "Inspect as an Expert" },
];

export function Audiences({ onStart }: { onStart: (level: Level) => void }) {
  return <section className="audiences" aria-labelledby="audiences-title">
    <div className="wrap wide">
      <p className="eyebrow">Who it is for</p>
      <h2 id="audiences-title">One evidence base, three kinds of decision</h2>
      <div className="audience-grid">
        {TILES.map((t) => <article key={t.level} className="audience-tile">
          <span className="eyebrow">{t.who}</span>
          <strong>{t.decision}</strong>
          <p>{t.does}</p>
          <button className="text-button" onClick={() => onStart(t.level)}>{t.cta} →</button>
        </article>)}
      </div>
    </div>
  </section>;
}
