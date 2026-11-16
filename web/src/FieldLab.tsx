// AI-assisted: Claude (Anthropic). Explorer level: the field lab (view #field-lab). The student uses four real instruments and keeps a
// field notebook of their own findings. No quizzes, no score. Every number comes from the engine's JSON.
import { useEffect, useRef, useState } from "react";
import { asset, brandAsset, useJSON } from "./data";
import { fill, LANGS, type Lang } from "./fieldlab-locale";
import "./fieldlab/mission.css";
import "./fieldlab/fieldlab.css";
import type { Manifest, MapMeta } from "./types";
import { TimeMachine } from "./fieldlab/TimeMachine";
import { DrillWell } from "./fieldlab/DrillWell";
import { GraceScale } from "./fieldlab/GraceScale";
import { TrickyWitness } from "./fieldlab/TrickyWitness";
import { FieldNotebook } from "./fieldlab/FieldNotebook";
import { buildNotebook, type FieldState, type NotebookId, type Yearly } from "./fieldlab/logic";
import { FIELD_TEXT } from "./fieldlab/text";

interface HeroMeta extends MapMeta { hero?: { bbox: [number, number, number, number]; before: { file: string }; after: { file: string } } }

const POSE = ["datron-explorer-idea.png", "datron-explorer.png", "datron-detective.png", "datron-explorer-idea.png", "datron-explorer-coin.png", "datron-explorer-badge.png"];
const CHAPTER_OF: Record<NotebookId, number> = { time: 1, wells: 2, grace: 3, witness: 4 };
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Guide({ pose, text, lang }: { pose: string; text: string; lang: Lang }) {
  const t = FIELD_TEXT[lang];
  return (
    <div className="ms-guide">
      <div className="ms-guide-img"><img src={brandAsset(pose)} alt={`Datron (${t.ai})`} /></div>
      <div className="ms-bubble"><p>{text}</p><span>{t.datron}</span></div>
    </div>
  );
}

function LensPeek({ hint }: { hint: string }) {
  const { data: meta } = useJSON<HeroMeta>("map.json");
  const [pos, setPos] = useState({ x: 42, y: 26 });
  const [moved, setMoved] = useState(false);
  if (!meta?.hero) return <div className="ms-lens-box" />;
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" && e.buttons === 0 && e.type === "pointermove") return;
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
    setMoved(true);
  };
  return (
    <div className="ms-lens-box" onPointerMove={move} onPointerDown={move} style={{ ["--x" as string]: `${pos.x}%`, ["--y" as string]: `${pos.y}%` }}>
      <img src={asset(meta.hero.before.file)} alt="Ica in 2004" className="ms-lens-base" />
      <div className="ms-lens-in"><img src={asset(meta.hero.after.file)} alt="Ica in 2024 inside the lens" /></div>
      <span className="ms-lens-ring" />
      {!moved && <span className="ms-lens-hint">{hint}</span>}
      <span className="ms-year l">2004</span><span className="ms-year r">2024</span>
    </div>
  );
}

export function FieldLab({ m, lang, onLang, startAt = 0, onFullTool, onAnalyst }: {
  m: Manifest; lang: Lang; onLang: (l: Lang) => void; startAt?: number; onFullTool: () => void; onAnalyst: () => void;
}) {
  const t = FIELD_TEXT[lang];
  const { data: yearly } = useJSON<Yearly>("yearly.json");
  const [step, setStep] = useState(startAt);
  const [state, setState] = useState<FieldState>({});
  const top = useRef<HTMLDivElement>(null);
  const go = (i: number) => {
    setStep(i);
    requestAnimationFrame(() => {
      const el = top.current;
      if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
    });
  };
  const restart = () => { setState({}); go(0); };
  useEffect(() => { // on small screens the panel scrolls by itself to a new finding
    requestAnimationFrame(() => {
      const p = top.current?.querySelector<HTMLElement>(".ms-stage .ms-panel");
      if (p && p.scrollHeight > p.clientHeight + 2) p.scrollTo({ top: p.scrollHeight, behavior: reduceMotion() ? "auto" : "smooth" });
    });
  }, [state]);

  const nb = buildNotebook(state);
  const used = (i: number) => i === 0 || (i >= 1 && i <= 4 && nb.entries[i - 1].used) || (i === 5 && nb.complete);
  const datron = [t.brief.datron, t.time.datron, t.wells.datron, t.grace.datron, t.witness.datron, t.notebook.datron][step];
  const head = (i: number, title: string) => (
    <><span className="ms-kicker">{fill(t.chapter, { n: i, total: 4 })}</span><h2>{title}</h2></>
  );
  const nav = (
    <div className="ms-nav">
      <button className="ms-btn ghost" onClick={() => go(step - 1)}>← {t.back}</button>
      {step < 5 && <button className={used(step) ? "ms-btn" : "ms-link"} id="ms-next" onClick={() => go(step + 1)}>{used(step) ? `${t.next} →` : t.skip}</button>}
    </div>
  );
  const record = (patch: FieldState) => setState((s) => ({ ...s, ...patch }));

  return (
    <section className="mission" id="field-lab" ref={top} aria-label={t.brief.title}>
      <div className="wrap wide ms-frame">
        <div className="fl-langs" role="group" aria-label="Language">
          {LANGS.map((l) => <button key={l.id} lang={l.id} aria-pressed={lang === l.id} title={l.label} onClick={() => onLang(l.id)}>{l.short}</button>)}
        </div>
        <div className="ms-progress" role="list">
          {t.progress.map((ttl, i) => (
            <button key={i} role="listitem" className={`ms-step ${i === step ? "on" : ""} ${used(i) && i !== step && i > 0 ? "done" : ""}`}
              onClick={() => go(i)} aria-current={i === step ? "step" : undefined}>
              <span className="n">{i === 0 ? "★" : i === 5 ? "✎" : i}</span><span className="tl">{ttl}</span>
            </button>
          ))}
        </div>

        <div className="ms-grid">
          <aside className="ms-side">
            <Guide pose={POSE[step]} text={datron} lang={lang} />
            <div className="ms-notebook">
              <span className="ms-kicker">{t.notebook.title} · {nb.entries.filter((e) => e.used).length}/4</span>
              <ol className="fl-mini">
                {nb.entries.map((e, i) => <li key={e.id} className={e.used ? "on" : ""}>{t.brief.tools[i]}</li>)}
              </ol>
            </div>
            <button className="ms-link" onClick={onFullTool}>{t.fullTool} →</button>
          </aside>

          <div className="ms-stage" key={step}>
            {step === 0 && (
              <div className="ms-card ms-split ms-brief">
                <div className="ms-visual"><LensPeek hint={t.time.title} /></div>
                <div className="ms-panel">
                  <span className="ms-kicker">{t.brief.kicker}</span>
                  <h2>{t.brief.title}</h2>
                  <p className="ms-lede">{t.brief.body}</p>
                  <ol className="fl-tools">{t.brief.tools.map((x, i) => <li key={x}><b>{i + 1}</b>{x}</li>)}</ol>
                  <div className="ms-nav"><button className="ms-btn big" id="ms-start" onClick={() => go(1)}>{t.brief.start} →</button></div>
                </div>
              </div>
            )}
            {step === 1 && (yearly
              ? <TimeMachine yearly={yearly} lang={lang} head={head(1, t.time.title)} nav={nav} onRecord={(time) => record({ time })} />
              : <div className="ms-card"><div className="loading">…</div></div>)}
            {step === 2 && <DrillWell m={m} lang={lang} head={head(2, t.wells.title)} nav={nav} initial={state.wells?.drilled} onRecord={(wells) => record({ wells })} />}
            {step === 3 && (yearly
              ? <GraceScale m={m} yearly={yearly} lang={lang} head={head(3, t.grace.title)} nav={nav} onRecord={() => record({ grace: true })} />
              : <div className="ms-card"><div className="loading">…</div></div>)}
            {step === 4 && <TrickyWitness lang={lang} head={head(4, t.witness.title)} nav={nav} onRecord={() => record({ witness: true })} />}
            {step === 5 && <FieldNotebook m={m} state={state} lang={lang} onOpen={(id) => go(CHAPTER_OF[id])} onAnalyst={onAnalyst} onRestart={restart} onBack={() => go(4)} />}
          </div>
        </div>
      </div>
    </section>
  );
}
