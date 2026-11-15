// AI-assisted: Claude (Anthropic). Who uses the tool and which decision it supports.
const TILES: { who: string; decision: string; does: string; cta: string; target: string }[] = [
  { who: "Water agencies and users' boards", decision: "Can satellites monitor our aquifer, or only wells?",
    does: "The atlas shows where GRACE confirms a loss and where an aquifer is too small for it, before money goes into monitoring.",
    cta: "Open the aquifer atlas", target: "#atlas" },
  { who: "Journalists and NGOs", decision: "Can we trust a claimed trend?",
    does: "Each verdict shows its range, the false-alarm risk of the classic test and its NASA source. Example: a classic test says Ica's groundwater is rising; the engine says inconclusive, and the wells say it is falling.",
    cta: "See that false alarm", target: "case:ZW_gws" },
  { who: "Researchers and teachers", decision: "Does the verdict hold up?",
    does: "Pre-registered rule, robustness windows, leave-one-year-out fits, a simulation of the tests and a download with data, code and settings to reproduce any case.",
    cta: "Put the tests on trial", target: "#method" },
];

export function Audiences({ onOpen }: { onOpen: (target: string) => void }) {
  return <section className="audiences" aria-labelledby="audiences-title">
    <div className="wrap wide">
      <p className="eyebrow">Who it is for</p>
      <h2 id="audiences-title">For anyone about to say “NASA data show…”</h2>
      <p className="audiences-lede">Before a trend goes into a report, a story or a class, it should pass three checks: is it real, is it
        from this place, and do the other witnesses agree? Three people who face that moment:</p>
      <div className="audience-grid">
        {TILES.map((t) => <article key={t.who} className="audience-tile">
          <span className="eyebrow">{t.who}</span>
          <strong>{t.decision}</strong>
          <p>{t.does}</p>
          <button className="text-button" onClick={() => onOpen(t.target)}>{t.cta}</button>
        </article>)}
      </div>
    </div>
  </section>;
}
