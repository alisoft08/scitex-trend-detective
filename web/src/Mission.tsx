// AI-assisted: Claude (Anthropic). Explorer level: a guided mission for school students, told by Datron.
// Every number comes from the engine's JSON (manifest, case files, lab.json); the page only rounds and draws.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { asset, brandAsset, useJSON } from "./data";
import { DICTS, fill, NUM_LOCALE, type Lang } from "./i18n";
import type { CaseFile, GeoFeature, Manifest, MapMeta, WellProps, Witnesses } from "./types";

type Guess = "up" | "down" | "none";
interface LabCell { phi: number; trials: [number, number][] }
interface HeroMeta extends MapMeta { hero?: { bbox: [number, number, number, number]; before: { file: string }; after: { file: string } } }

const POSE = ["datron-explorer-idea.png", "datron-explorer.png", "datron-detective.png", "datron-explorer-coin.png", "datron-explorer-idea.png", "datron-explorer-badge.png"];
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Guide({ pose, text, lang }: { pose: string; text: string; lang: Lang }) {
  const t = DICTS[lang].m;
  return (
    <div className="ms-guide">
      <div className="ms-guide-img"><img src={brandAsset(pose)} alt="Datron" /><span className="ms-ai">{t.ai}</span></div>
      <div className="ms-bubble"><p>{text}</p><span>{t.datron}</span></div>
    </div>
  );
}

function Stamp({ ok, children }: { ok: boolean; children: ReactNode }) {
  return <span className={`ms-stamp ${ok ? "ok" : "no"}`}>{children}</span>;
}

/* ---------- chapter 1: the lens ---------- */
function LensPeek({ hint }: { hint: string }) {
  const { data: meta } = useJSON<HeroMeta>("map.json");
  const box = useRef<HTMLDivElement>(null);
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
    <div className="ms-lens-box" ref={box} onPointerMove={move} onPointerDown={move} style={{ ["--x" as string]: `${pos.x}%`, ["--y" as string]: `${pos.y}%` }}>
      <img src={asset(meta.hero.before.file)} alt="Ica in 2004" className="ms-lens-base" />
      <div className="ms-lens-in"><img src={asset(meta.hero.after.file)} alt="Ica in 2024 inside the lens" /></div>
      <span className="ms-lens-ring" />
      {!moved && <span className="ms-lens-hint">{hint}</span>}
      <span className="ms-year l">2004</span><span className="ms-year r">2024</span>
    </div>
  );
}

function YearDots({ cf, lang, label }: { cf: CaseFile; lang: Lang; label: string }) {
  const years: { y: number; v: number }[] = [];
  for (let y = 2004; y <= 2024; y++) {
    const vals = cf.series.filter((p) => p.date.startsWith(String(y)) && p.value !== null).map((p) => p.value as number);
    if (vals.length >= 6) years.push({ y, v: vals.reduce((a, b) => a + b, 0) / vals.length });
  }
  const W = 560, H = 220, m = { l: 16, r: 16, t: 26, b: 30 };
  const lo = Math.min(...years.map((d) => d.v)), hi = Math.max(...years.map((d) => d.v));
  const x = (y: number) => m.l + ((y - 2004) / 20) * (W - m.l - m.r);
  const yy = (v: number) => m.t + (1 - (v - lo) / (hi - lo || 1)) * (H - m.t - m.b);
  const path = years.map((d, i) => `${i ? "L" : "M"}${x(d.y).toFixed(1)},${yy(d.v).toFixed(1)}`).join("");
  return (
    <figure className="ms-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        <path d={path} className="ms-line" />
        {years.map((d, i) => (
          <circle key={d.y} cx={x(d.y)} cy={yy(d.v)} r={6} className="ms-dot" style={{ animationDelay: `${i * 70}ms` }}>
            <title>{`${d.y}: NDVI ${d.v.toLocaleString(NUM_LOCALE[lang], { maximumFractionDigits: 2 })}`}</title>
          </circle>
        ))}
        <text x={x(2004)} y={H - 8} className="ms-axis">2004</text>
        <text x={x(2024)} y={H - 8} textAnchor="end" className="ms-axis">2024</text>
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

/* ---------- chapter 2: wells ---------- */
function WellsTap({ onCount, lang }: { onCount: (n: number, down: number) => void; lang: Lang }) {
  const t = DICTS[lang].m.c2;
  const { data: meta } = useJSON<MapMeta>("map.json");
  const { data: wells } = useJSON<{ features: GeoFeature<WellProps>[] }>("wells.geojson");
  const [asked, setAsked] = useState<string[]>([]);
  const [last, setLast] = useState<WellProps | null>(null);
  useEffect(() => {
    if (!wells) return;
    const f = wells.features.filter((w) => asked.includes(w.properties.well_id));
    onCount(f.length, f.filter((w) => w.properties.rate_m_per_yr < 0).length);
  }, [asked, wells]);
  if (!meta || !wells) return <div className="ms-wells" />;
  const [W, S, E, N] = meta.bbox;
  const fmtM = (v: number) => Math.abs(v).toLocaleString(NUM_LOCALE[lang], { maximumFractionDigits: 2 });
  return (
    <div className="ms-wells-wrap">
      <div className="ms-wells">
        <img src={asset(meta.images["landsat_2024"].file)} alt="Ica valley in 2024 with field wells" />
        {wells.features.map((w) => {
          const p = w.properties, [lon, lat] = w.geometry.coordinates as [number, number];
          const on = asked.includes(p.well_id);
          return (
            <button key={p.well_id} className={`ms-well ${on ? (p.rate_m_per_yr < 0 ? "down" : "up") : ""}`}
              style={{ left: `${((lon - W) / (E - W)) * 100}%`, top: `${((N - lat) / (N - S)) * 100}%` }}
              aria-label={`Well ${p.well_id}`} onClick={() => { setLast(p); setAsked((prev) => (prev.includes(p.well_id) ? prev : [...prev, p.well_id])); }}>
              {on ? (p.rate_m_per_yr < 0 ? "↓" : "↑") : ""}
            </button>
          );
        })}
      </div>
      <div className="ms-well-say" role="status">
        {last ? (
          <><span className={`ms-arrow ${last.rate_m_per_yr < 0 ? "down" : "up"}`}>{last.rate_m_per_yr < 0 ? "↓" : "↑"}</span>
            {fill(last.rate_m_per_yr < 0 ? t.wellDown : t.wellUp, { m: fmtM(last.rate_m_per_yr) })}</>
        ) : <span className="muted">{t.ask}</span>}
        <button className="ms-link" onClick={() => setAsked(wells.features.map((w) => w.properties.well_id))}>{t.all}</button>
      </div>
    </div>
  );
}

function House({ meters, label }: { meters: number; label: string }) {
  return (
    <svg className="ms-house" viewBox="0 0 260 200" role="img" aria-label={`${meters} m`}>
      <rect x="0" y="0" width="260" height="200" className="ground" />
      <path d="M40 92 L95 52 L150 92 Z" className="roof" />
      <rect x="52" y="92" width="86" height="96" className="walls" />
      <line x1="52" x2="138" y1="140" y2="140" className="floor" />
      <rect x="66" y="104" width="20" height="22" className="win" /><rect x="104" y="104" width="20" height="22" className="win" />
      <rect x="66" y="152" width="20" height="22" className="win" /><rect x="104" y="152" width="20" height="22" className="win" />
      <line x1="170" x2="250" y1="60" y2="60" className="wt-old" /><line x1="170" x2="250" y1="188" y2="188" className="wt-new" />
      <path d="M210 66 L210 176 M203 168 L210 180 L217 168" className="arrow" />
      <text x="216" y="128" className="lbl">{`${meters} m`}</text>
      <text x="216" y="142" className="lbl small">{label}</text>
    </svg>
  );
}

/* ---------- chapter 3: coins ---------- */
// Two boards of 100 "trials" from lab.json: a fair witness (no memory) and a sticky one (phi = 0.9).
function CoinBoards({ lab, lang, shown }: { lab: LabCell[]; lang: Lang; shown: number }) {
  const t = DICTS[lang].m.c3;
  const fair = lab[0], sticky = lab.find((c) => Math.abs(c.phi - 0.9) < 1e-6) ?? lab[lab.length - 1];
  const board = (cell: LabCell, name: string, sub: string, kind: string) => {
    const n = cell.trials.slice(0, shown).filter((x) => x[0] === 1).length;
    return (
      <div className={`ms-coins ${kind}`}>
        <span className="ms-coins-name">{name}</span>
        <span className="ms-coins-sub">{sub}</span>
        <div className="ms-coin-grid">{cell.trials.slice(0, 100).map((x, i) => <i key={i} className={i < shown ? (x[0] ? "fire" : "calm") : ""} />)}</div>
        <span className="ms-coins-res" aria-live="polite">{shown >= 100 ? fill(t.shouts, { n }) : "\u00a0"}</span>
      </div>
    );
  };
  return <div className="ms-coins-row">{board(fair, t.fair, t.fairSub, "fair")}{board(sticky, t.sticky, t.stickySub, "sticky")}</div>;
}

function useCoinRun(onDone: () => void): [number, () => void, () => void] {
  const [shown, setShown] = useState(0);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);
  const run = () => {
    if (timer.current) window.clearInterval(timer.current);
    if (reduceMotion()) { setShown(100); onDone(); return; }
    setShown(0);
    timer.current = window.setInterval(() => setShown((s) => {
      if (s >= 98) { if (timer.current) window.clearInterval(timer.current); onDone(); return 100; }
      return s + 2;
    }), 40);
  };
  const reset = () => { if (timer.current) window.clearInterval(timer.current); setShown(0); };
  return [shown, run, reset];
}

function Wiggle({ values }: { values: (number | null)[] }) {
  const W = 560, H = 160, pad = 14;
  const pts = values.map((v, i) => (v === null ? null : [pad + (i / (values.length - 1)) * (W - 2 * pad), H / 2 - v * 26] as const)).filter(Boolean) as [number, number][];
  return (
    <svg className="ms-wiggle" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Groundwater model, one value per year">
      <line x1={pad} x2={W - pad} y1={H / 2} y2={H / 2} className="zero" />
      <path d={pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("")} />
    </svg>
  );
}

/* ---------- chapter 4: thermometers ---------- */
function Thermo({ value, label, sub, warm }: { value: number; label: string; sub: string; warm: boolean }) {
  const level = warm ? 0.72 : 0.3;
  return (
    <div className={`ms-thermo ${warm ? "warm" : "cool"}`}>
      <svg viewBox="0 0 60 200" aria-hidden="true">
        <rect x="22" y="10" width="16" height="150" rx="8" className="tube" />
        <rect x="26" y={14 + (1 - level) * 142} width="8" height={level * 142} rx="4" className="mercury" />
        <circle cx="30" cy="172" r="18" className="bulb" />
      </svg>
      <div><span className="ms-thermo-l">{label}</span><strong>{warm ? "+" : "−"}{value.toFixed(1)} °C</strong><span className="ms-thermo-s">{sub}</span></div>
    </div>
  );
}

/* ---------- the mission ---------- */
// Each chapter is one screen: a large visual on the left, the question and the verdict on the right.
// On wide screens the whole mission fits the viewport, so nothing important sits below the fold.
export function Mission({ m, lang, startAt = 0, onFullTool, onAnalyst }: { m: Manifest; lang: Lang; startAt?: number; onFullTool: () => void; onAnalyst: () => void }) {
  const t = DICTS[lang].m;
  const { data: ndvi } = useJSON<CaseFile>("cases/Z2_ndvi.json");
  const { data: wit } = useJSON<Witnesses>("witnesses.json");
  const { data: lab } = useJSON<{ grid: LabCell[] }>("lab.json");
  const [step, setStep] = useState(startAt);
  const [done, setDone] = useState<boolean[]>(() => [0, 1, 2, 3, 4, 5].map((i) => i === 0 || i < startAt));
  const [guess, setGuess] = useState<Guess | null>(null);
  const [view1, setView1] = useState<"lens" | "chart">("lens");
  const [wells, setWells] = useState({ n: 0, down: 0 });
  const [why, setWhy] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([null, null, null]);
  const [qView, setQView] = useState(0);
  const top = useRef<HTMLDivElement>(null);
  const finish = (i: number) => setDone((d) => d.map((v, k) => (k === i ? true : v)));
  const [coins, runCoins, resetCoins] = useCoinRun(() => finish(3));
  const go = (i: number) => {
    setStep(i);
    requestAnimationFrame(() => {
      const el = top.current;
      if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
    });
  };
  const restart = () => {
    setDone([true, false, false, false, false, false]); setGuess(null); setView1("lens"); setWells({ n: 0, down: 0 }); setWhy(null);
    setAnswers([null, null, null]); setQView(0); resetCoins(); go(0);
  };

  const loc = NUM_LOCALE[lang];
  const vill = m.impact.et_volume.find((b) => b.zone === "Z2");
  const pools = vill ? Math.round((vill.mm3_2020_2024 * 1e6) / 2500 / 1000) * 1000 : 0;
  const zi = m.wells.by_zone.find((z) => z.juasvi_zone === "I");
  const perDecade = zi ? Math.abs(zi.mean_rate_m_per_yr * 10) : 0;
  const air = m.cases.find((c) => c.id === "Z4_t2m")?.sen_per_decade ?? 0;
  const field = m.cases.find((c) => c.id === "Z2_lst")?.sen_per_decade ?? 0;
  const gws = m.cases.find((c) => c.id === "ZW_gws");
  const gwsSeries = wit?.series.find((s) => s.id === "ZW_gws")?.values ?? [];
  const clues = [t.c1.clue, t.c2.clue, t.c3.clue, t.c4.clue];
  const titles = [t.brief.title, t.c1.title, t.c2.title, t.c3.title, t.c4.title, t.c5.title];
  const score = answers.filter((a, i) => a === t.c5.qs[i].a).length;
  const allAnswered = answers.every((a) => a !== null);
  useEffect(() => { if (allAnswered) finish(5); }, [allAnswered]);

  // When a result appears and the panel is too short for it (small screens), bring the result into view.
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    requestAnimationFrame(() => {
      const p = stage.current?.querySelector<HTMLElement>(".ms-panel");
      const behavior = reduceMotion() ? "auto" : "smooth";
      if (p && p.scrollHeight > p.clientHeight + 2) p.scrollTo({ top: p.scrollHeight, behavior });
      else if (window.innerWidth <= 860) stage.current?.querySelector(".ms-reveal, .ms-feedback, .ms-badge")?.scrollIntoView({ behavior, block: "nearest" });
    });
  }, [guess, wells.n >= 5, done[3], why, qView, answers[qView]]);

  const guideText = [t.brief.datron, t.c1.datron, t.c2.datron, t.c3.datron, t.c4.datron, t.c5.datron][step];
  const nav = step > 0 && (
    <div className="ms-nav">
      <button className="ms-btn ghost" onClick={() => go(step - 1)}>← {t.back}</button>
      {step < 5 && (done[step]
        ? <button className="ms-btn" id="ms-next" onClick={() => go(step + 1)}>{t.next} →</button>
        : <button className="ms-link" onClick={() => { finish(step); go(step + 1); }}>{t.skip}</button>)}
    </div>
  );
  const q = t.c5.qs[qView];

  return (
    <section className="mission" id="investigate" ref={top} aria-label={t.brief.title}>
      <div className="wrap wide ms-frame">
        <div className="ms-progress" role="list">
          {titles.map((ttl, i) => (
            <button key={i} role="listitem" className={`ms-step ${i === step ? "on" : ""} ${done[i] && i !== step ? "done" : ""}`}
              onClick={() => (i <= step || done[i - 1]) && go(i)} aria-current={i === step ? "step" : undefined}>
              <span className="n">{i === 0 ? "★" : i}</span><span className="tl">{ttl}</span>
            </button>
          ))}
        </div>

        <div className="ms-grid">
          <aside className="ms-side">
            <Guide pose={POSE[step]} text={guideText} lang={lang} />
            <div className="ms-notebook">
              <span className="ms-kicker">{t.notebook} · {t.clues} {done.slice(1, 5).filter(Boolean).length}/4</span>
              {done.slice(1, 5).some(Boolean)
                ? <ol>{clues.map((c, i) => done[i + 1] && <li key={i}>{c}</li>)}</ol>
                : <p className="muted small">{t.empty}</p>}
            </div>
            <button className="ms-link" onClick={onFullTool}>{t.fullTool} →</button>
          </aside>

          <div className="ms-stage" key={step} ref={stage}>
            {step === 0 && (
              <div className="ms-card ms-split ms-brief">
                <div className="ms-visual"><LensPeek hint={t.c1.lens} /></div>
                <div className="ms-panel">
                  <span className="ms-kicker">{t.brief.kicker}</span>
                  <h2>{t.brief.title}</h2>
                  <p className="ms-lede">{t.brief.task}</p>
                  <div className="ms-brief-clues">{[1, 2, 3, 4].map((i) => <span key={i} className="ms-clue-slot">🔎 {i}</span>)}</div>
                  <div className="ms-nav"><button className="ms-btn big" id="ms-start" onClick={() => go(1)}>{t.brief.start} →</button></div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="ms-card ms-split">
                <div className="ms-visual">
                  {guess && ndvi && view1 === "chart" ? <YearDots cf={ndvi} lang={lang} label={t.c1.chart} /> : <LensPeek hint={t.c1.lens} />}
                  {guess && ndvi && (
                    <div className="ms-toggle" role="group" aria-label="View">
                      <button aria-pressed={view1 === "lens"} onClick={() => setView1("lens")} title="2004 / 2024">🔎</button>
                      <button aria-pressed={view1 === "chart"} onClick={() => setView1("chart")} title={t.c1.chart}>📈</button>
                    </div>
                  )}
                </div>
                <div className="ms-panel">
                  <span className="ms-kicker">{fill(t.chapter, { n: 1, total: 5 })}</span>
                  <h2>{t.c1.title}</h2>
                  {!guess && <p className="ms-lede">{t.c1.ask}</p>}
                  <h3 className="ms-q">{t.c1.predict}</h3>
                  <div className={`ms-opts ${guess ? "small" : ""}`}>
                    {(["up", "down", "none"] as Guess[]).map((g) => (
                      <button key={g} id={`ms-guess-${g}`} className={`ms-opt ${guess === g ? "picked" : ""}`} onClick={() => { setGuess(g); setView1("chart"); finish(1); }}>
                        <span aria-hidden="true">{g === "up" ? "↗" : g === "down" ? "↘" : "→"}</span>{g === "up" ? t.up : g === "down" ? t.down : t.none}
                      </button>
                    ))}
                  </div>
                  {guess && (
                    <div className="ms-reveal">
                      <div className="ms-verdict"><Stamp ok>{t.proven}</Stamp><span>{t.c1.verdict}</span></div>
                      <p className="ms-analogy">🏊 {fill(t.c1.analogy, { pools: pools.toLocaleString(loc) })}</p>
                    </div>
                  )}
                  {nav}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="ms-card ms-split">
                <div className="ms-visual"><WellsTap lang={lang} onCount={(n, down) => { setWells({ n, down }); if (n >= 5) finish(2); }} /></div>
                <div className="ms-panel">
                  <span className="ms-kicker">{fill(t.chapter, { n: 2, total: 5 })}</span>
                  <h2>{t.c2.title}</h2>
                  {wells.n < 5 && <p className="ms-lede">{t.c2.ask}</p>}
                  <p className="ms-counter">{fill(t.c2.count, { n: wells.n, down: wells.down })}</p>
                  {wells.n >= 5 && (
                    <div className="ms-reveal">
                      <div className="ms-verdict"><Stamp ok={false}>↓</Stamp><span>{fill(t.c2.summary, { total: m.wells.n, pct: Math.round(m.wells.share_falling * 100) })}</span></div>
                      <div className="ms-house-row">
                        <p className="ms-analogy">🏠 {fill(t.c2.analogy, { m: perDecade.toLocaleString(loc, { maximumFractionDigits: 1 }) })}</p>
                        <House meters={Number(perDecade.toFixed(1))} label={t.c2.house} />
                      </div>
                    </div>
                  )}
                  {nav}
                </div>
              </div>
            )}

            {step === 3 && lab && (
              <div className="ms-card ms-split">
                <div className="ms-visual">
                  <CoinBoards lab={lab.grid} lang={lang} shown={coins} />
                </div>
                <div className="ms-panel">
                  <span className="ms-kicker">{fill(t.chapter, { n: 3, total: 5 })}</span>
                  <h2>{t.c3.title}</h2>
                  {coins < 100 && <p className="ms-lede">{t.c3.ask}</p>}
                  {coins < 100 && <div><button className="ms-btn" id="ms-flip" onClick={runCoins} disabled={coins > 0}>{t.c3.run}</button></div>}
                  {coins >= 100 && <p className="ms-lesson">{t.c3.lesson}</p>}
                  {done[3] && gws && (
                    <div className="ms-reveal">
                      <p className="ms-lede small">{t.c3.real}</p>
                      <Wiggle values={gwsSeries} />
                      <div className="ms-versus">
                        <div className="ms-quick">📢 {t.c3.quick}</div>
                        <div className="ms-honest">{t.c3.honest} <Stamp ok={false}>{t.notProven}</Stamp></div>
                      </div>
                    </div>
                  )}
                  {nav}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="ms-card ms-split">
                <div className="ms-visual">
                  <div className="ms-thermos">
                    <Thermo value={Math.abs(air)} warm label={t.c4.air} sub={fill(t.c4.airVal, { a: Math.abs(air).toFixed(1) })} />
                    <Thermo value={Math.abs(field)} warm={false} label={t.c4.fields} sub={fill(t.c4.fieldVal, { b: Math.abs(field).toFixed(1) })} />
                  </div>
                </div>
                <div className="ms-panel">
                  <span className="ms-kicker">{fill(t.chapter, { n: 4, total: 5 })}</span>
                  <h2>{t.c4.title}</h2>
                  {why !== 0 && <p className="ms-lede">{t.c4.ask}</p>}
                  {why !== 0 && <h3 className="ms-q">{t.c4.why}</h3>}
                  <div className="ms-opts col">
                    {t.c4.opts.map((o, i) => why === 0 && i !== 0 ? null : (
                      <button key={i} id={`ms-why-${i}`} className={`ms-opt ${why === i ? (i === 0 ? "right" : "wrong") : ""}`} onClick={() => { setWhy(i); if (i === 0) finish(4); }}>{o}</button>
                    ))}
                  </div>
                  {why !== null && <p className={`ms-feedback ${why === 0 ? "right" : "wrong"}`}>{why === 0 ? t.c4.right : t.c4.wrong}</p>}
                  {why === 0 && <p className="ms-note">{t.c4.note}</p>}
                  {nav}
                </div>
              </div>
            )}

            {step === 5 && !allAnswered && (
              <div className="ms-card ms-single">
                <div className="ms-panel">
                  <span className="ms-kicker">{fill(t.chapter, { n: 5, total: 5 })} · {t.c5.quiz} · {qView + 1}/3</span>
                  <h2>{t.c5.title}</h2>
                  <div className="ms-qdots" aria-hidden="true">{[0, 1, 2].map((i) => <i key={i} className={answers[i] === null ? (i === qView ? "on" : "") : answers[i] === t.c5.qs[i].a ? "right" : "wrong"} />)}</div>
                  <h3 className="ms-q big">{q.q}</h3>
                  <div className="ms-opts col">
                    {q.o.map((o, oi) => {
                      const a = answers[qView], picked = a === oi;
                      return (
                        <button key={oi} id={`ms-q${qView}-${oi}`} disabled={a !== null}
                          className={`ms-opt ${picked ? (oi === q.a ? "right" : "wrong") : a !== null && oi === q.a ? "right ghost" : ""}`}
                          onClick={() => setAnswers(answers.map((x, k) => (k === qView ? oi : x)))}>{o}</button>
                      );
                    })}
                  </div>
                  <div className="ms-nav">
                    <button className="ms-btn ghost" onClick={() => (qView > 0 ? setQView(qView - 1) : go(4))}>← {t.back}</button>
                    {answers[qView] !== null && qView < 2 && <button className="ms-btn" id="ms-qnext" onClick={() => setQView(qView + 1)}>{t.next} →</button>}
                  </div>
                </div>
              </div>
            )}

            {step === 5 && allAnswered && (
              <div className="ms-card ms-split ms-final">
                <div className="ms-visual">
                  <div className="ms-badge">
                    <svg viewBox="0 0 120 120" aria-hidden="true">
                      <circle cx="60" cy="60" r="56" className="b-out" /><circle cx="60" cy="60" r="44" className="b-in" />
                      <path d="M60 30 L68 50 L90 51 L73 64 L79 86 L60 73 L41 86 L47 64 L30 51 L52 50 Z" className="b-star" />
                    </svg>
                    <strong>{t.c5.badge}</strong><span>{t.c5.badgeSub}</span><span className="ms-score">{fill(t.c5.score, { n: score })}</span>
                  </div>
                </div>
                <div className="ms-panel">
                  <span className="ms-kicker">{fill(t.chapter, { n: 5, total: 5 })}</span>
                  <h2>{t.c5.title}</h2>
                  <ul className="ms-lessons">{t.c5.lessons.map((l) => <li key={l}>{l}</li>)}</ul>
                  <div className="ms-end">
                    <span>{t.c5.next}</span>
                    <div className="ms-end-btns">
                      <button className="ms-btn" onClick={onAnalyst}>{t.c5.analyst} →</button>
                      <button className="ms-btn ghost" onClick={restart}>{t.restart}</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
