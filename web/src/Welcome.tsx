// AI-assisted: Claude (Anthropic). First-visit welcome: a live preview of the case, then the reader picks a level with Datron.
import { useEffect, useRef, useState } from "react";
import { asset, brandAsset } from "./data";
import { LEVELS, type Level } from "./levels";
import { DICTS, fill, type Lang } from "./i18n";

// v2: shown once more to returning visitors so they meet the new Explorer mission.
const KEY = "oasis-paradox-welcomed-v2";

const DATRON: Record<Level, { img: string; says: string; alt: string }> = {
  explorer: { img: "datron-explorer.png", says: "Make your guess first. Then check it against the evidence.",
    alt: "Datron crouching with a magnifying glass and a notebook" },
  analyst: { img: "datron-analyst.png", says: "Read the range, not just the slope. If it crosses zero, it is not proven.",
    alt: "Datron pointing at a tablet with a rising line chart" },
  expert: { img: "datron-expert.png", says: "Every rule was fixed before we saw Ica's data. Check the criteria yourself.",
    alt: "Datron in a lab coat with a clipboard" },
};

export function useWelcome(): [boolean, () => void, () => void] {
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(KEY) !== "1"; } catch { return true; }
  });
  const close = () => { setOpen(false); try { localStorage.setItem(KEY, "1"); } catch { /* storage blocked */ } };
  return [open, close, () => setOpen(true)];
}

export function Welcome({ open, level, lang, onClose, onPick }: {
  open: boolean; level: Level; lang: Lang; onClose: () => void; onPick: (l: Level) => void;
}) {
  const w = DICTS[lang].welcome, lv = DICTS[lang].levels;
  const [step, setStep] = useState<1 | 2>(1);
  const first = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open]);
  useEffect(() => { if (open) first.current?.focus(); }, [open, step]);
  if (!open) return null;

  return (
    <div className="wl-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="wl" role="dialog" aria-modal="true" aria-labelledby="wl-title">
        <button className="wl-close" onClick={onClose} aria-label={w.close}>×</button>
        <div className="wl-steps" aria-hidden="true"><i className={step === 1 ? "on" : ""} /><i className={step === 2 ? "on" : ""} /></div>

        {step === 1 && (
          <div className="wl-one">
            <div className="wl-left">
            <div className="wl-preview" aria-label="Preview: Ica in 2004, with a lens that shows 2024">
              <img className="wl-base" src={asset("img/hero_2004.jpg")} alt="" />
              <div className="wl-lens-img"><img src={asset("img/hero_2024.jpg")} alt="" /></div>
              <span className="wl-lens" />
              <span className="wl-tag l">{w.tag2004}</span>
              <span className="wl-tag r">{w.tagLens}</span>
            </div>
            </div>
            <div className="wl-copy">
              <span className="wl-kicker">{w.kicker}</span>
              <h2 id="wl-title">{w.title}</h2>
              <p>{w.body}</p>
              <ol className="wl-how">
                {w.steps.map(([h, s]) => <li key={h}><b>{h}</b><span>{s}</span></li>)}
              </ol>
              <div className="wl-actions">
                <button ref={first} className="wl-btn primary" id="wl-next" onClick={() => setStep(2)}>{w.choose}</button>
                <button className="wl-btn ghost" onClick={onClose}>{w.skip}</button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="wl-two">
            <span className="wl-kicker">{w.step2}</span>
            <h2 id="wl-title">{w.title2}</h2>
            <p className="wl-sub">{w.sub2}</p>
            <div className="wl-levels" role="group" aria-label="Reading level">
              {LEVELS.map((l, i) => (
                <button key={l.id} id={`wl-level-${l.id}`} ref={i === 0 ? first : undefined}
                  className={`wl-level ${level === l.id ? "current" : ""}`} onClick={() => { onPick(l.id); onClose(); }}>
                  <span className="wl-stage">
                    <img src={brandAsset(DATRON[l.id].img)} alt={`${DATRON[l.id].alt} (AI-generated illustration)`} />
                  </span>
                  <span className="wl-name">{lv[l.id].name}</span>
                  <span className="wl-who">{lv[l.id].who}</span>
                  <span className="wl-says">“{w.says[l.id]}”</span>
                  <span className="wl-go">{fill(w.startAs, { name: lv[l.id].name })} →</span>
                </button>
              ))}
            </div>
            <div className="wl-actions end">
              <button className="wl-btn ghost dark" onClick={() => setStep(1)}>← {w.back}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
