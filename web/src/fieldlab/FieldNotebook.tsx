// AI-assisted: Claude (Anthropic). The ending: the student's own field notebook (no score).
import { useState } from "react";
import { fill, NUM_LOCALE, type Lang } from "../fieldlab-locale";
import type { Manifest } from "../types";
import { buildNotebook, type FieldState, type NotebookId } from "./logic";
import { FIELD_TEXT } from "./text";

export function FieldNotebook({ m, state, lang, onOpen, onAnalyst, onRestart, onBack }: {
  m: Manifest; state: FieldState; lang: Lang; onOpen: (id: NotebookId) => void; onAnalyst: () => void; onRestart: () => void; onBack: () => void;
}) {
  const T = FIELD_TEXT[lang], t = T.notebook;
  const loc = NUM_LOCALE[lang];
  const nb = buildNotebook(state);
  const [name, setName] = useState("");
  const zi = m.wells.by_zone.find((z) => z.juasvi_zone === "I");
  const k = m.impact.footprint_to_irrigated;
  const finding = (id: NotebookId) => {
    if (id === "time" && state.time) {
      const { z2Start: a, z2End: b } = state.time;
      return a !== null && b !== null ? fill(T.time.finding, { a: Math.round(a), b: Math.round(b), k: (b / Math.max(a, 1)).toFixed(1) }) : T.time.title;
    }
    if (id === "wells" && state.wells) {
      const n = nb.wellsDrilled, f = state.wells.falling;
      const own = fill(T.wells.tally, { n, f, u: n - f });
      const net = fill(T.wells.network, { pct: Math.round(m.wells.share_falling * 100), total: m.wells.n, m: zi ? Math.abs(zi.mean_rate_m_per_yr * 10).toLocaleString(loc, { maximumFractionDigits: 1 }) : "" });
      return <>{net}<span className="fl-own">{own}{n > 0 && f / n < 0.5 ? ` ${T.wells.small}` : ""}</span></>;
    }
    if (id === "grace") return fill(T.grace.finding, { k });
    return T.witness.finding;
  };
  return (
    <div className="ms-card ms-split fl-notebook">
      <div className="ms-visual">
        <div className="fl-page">
          <span className="ms-kicker">{t.kicker}{name ? ` · ${name}` : ""}</span>
          <ol className="fl-entries">
            {nb.entries.map((e, i) => (
              <li key={e.id} className={e.used ? "used" : ""}>
                <span className="fl-entry-n">{i + 1}</span>
                <div>
                  <b>{T.brief.tools[i]}</b>
                  {e.used ? <p>{finding(e.id)}</p> : <p className="muted">{t.unused} · <button className="ms-link" onClick={() => onOpen(e.id)}>{t.open} →</button></p>}
                </div>
              </li>
            ))}
          </ol>
          <p className="fl-conclusion">{t.conclusion}</p>
          <span className="fl-sources">{t.sources}</span>
        </div>
      </div>
      <div className="ms-panel">
        <span className="ms-kicker">{t.kicker}</span>
        <h2>{t.title}</h2>
        {nb.complete && (
          <div className="ms-badge fl-stamp">
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="56" className="b-out" /><circle cx="60" cy="60" r="44" className="b-in" />
              <path d="M60 30 L68 50 L90 51 L73 64 L79 86 L60 73 L41 86 L47 64 L30 51 L52 50 Z" className="b-star" />
            </svg>
            <div><strong>{t.stamp}</strong><span>{t.stampSub}</span></div>
          </div>
        )}
        <label className="fl-sign">{t.name}
          <input value={name} maxLength={40} placeholder={t.namePh} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="ms-nav">
          <button className="ms-btn ghost" onClick={onBack}>← {T.back}</button>
          <div className="ms-end-btns">
            <button className="ms-btn" onClick={onAnalyst}>{t.analyst} →</button>
            <button className="ms-btn ghost" onClick={onRestart}>{t.restart}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
