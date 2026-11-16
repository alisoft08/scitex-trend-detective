// AI-assisted: Claude (Anthropic). The detective's-lens landing view, for any place: the land in 2004 outside the lens,
// 2024 inside it. The lens tours a list of stops on its own, each with an evidence card; the reader can take it over.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { brandAsset } from "./data";
import { useLocale } from "./i18n";

export interface LensStop {
  lon: number; lat: number; place: string; finding: string; source: string; verdict: string; tone: string;
  alarm?: string; note?: string;
}
export interface LensLabel { lon: number; lat: number; text: string; kind: "place" | "sea" | "range" }

const TRAVEL_MS = 1700;
const DWELL_MS = 3600;
const RESUME_MS = 4000;
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export function LensHero({ before, after, altBefore, altAfter, bbox, ratio, stops, labels = [], kicker, title, lede,
  primary, secondary, credit, datron = false }: {
  before: string; after: string; altBefore: string; altAfter: string;
  bbox: [number, number, number, number]; ratio: number; stops: LensStop[]; labels?: LensLabel[];
  kicker: string; title: ReactNode; lede: string;
  primary: { label: string; go: () => void }; secondary?: { label: string; go: () => void };
  credit: string; datron?: boolean;
}) {
  const { t } = useLocale();
  const stage = useRef<HTMLDivElement>(null);
  const size = useRef({ w: 1, h: 1 });
  const manualUntil = useRef(0);
  const pos = useRef({ x: 0, y: 0 });
  const [active, setActive] = useState<number | null>(null);
  const [cardSide, setCardSide] = useState<"right" | "left">("right");
  const [datronSays, setDatronSays] = useState(true);
  const [W, S, E, N] = bbox;

  useEffect(() => { const t = setTimeout(() => setDatronSays(false), 6500); return () => clearTimeout(t); }, []);

  useEffect(() => {
    const el = stage.current;
    if (!el || stops.length === 0) return;
    const ro = new ResizeObserver(([e]) => { size.current = { w: e.contentRect.width, h: e.contentRect.height }; });
    ro.observe(el);
    size.current = { w: el.clientWidth, h: el.clientHeight };
    // image coordinates -> stage pixels (the picture covers the stage, centred)
    const toPx = (lon: number, lat: number) => {
      const { w, h } = size.current;
      const cw = Math.max(w, h * ratio), ch = cw / ratio;
      return { x: (w - cw) / 2 + ((lon - W) / (E - W)) * cw, y: (h - ch) / 2 + ((N - lat) / (N - S)) * ch };
    };
    const place = (x: number, y: number) => {
      pos.current = { x, y };
      el.style.setProperty("--lx", `${x.toFixed(1)}px`);
      el.style.setProperty("--ly", `${y.toFixed(1)}px`);
    };
    const first = toPx(stops[0].lon, stops[0].lat);
    place(first.x, first.y);
    setCardSide(first.x > size.current.w * 0.62 ? "left" : "right");
    setActive(0);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => ro.disconnect();

    let i = 0, from = first, t0 = performance.now(), phase: "dwell" | "travel" = "dwell", raf = 0;
    const tick = (now: number) => {
      if (now < manualUntil.current) { t0 = now; from = pos.current; phase = "travel"; raf = requestAnimationFrame(tick); return; }
      if (phase === "dwell") {
        const p = toPx(stops[i].lon, stops[i].lat);
        place(p.x, p.y);
        if (now - t0 > DWELL_MS) { phase = "travel"; t0 = now; from = p; i = (i + 1) % stops.length; setActive(null); }
      } else {
        const to = toPx(stops[i].lon, stops[i].lat);
        const k = ease(Math.min(1, (now - t0) / TRAVEL_MS));
        place(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k);
        if (k >= 1) { phase = "dwell"; t0 = now; setCardSide(to.x > size.current.w * 0.62 ? "left" : "right"); setActive(i); }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [stops, W, S, E, N, ratio]);

  const follow = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".hm-cta, .hm-datron")) return;   // buttons and the mascot keep their own pointer
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    e.currentTarget.style.setProperty("--lx", `${x}px`);
    e.currentTarget.style.setProperty("--ly", `${y}px`);
    pos.current = { x, y };
    manualUntil.current = performance.now() + RESUME_MS;
    if (active !== null) setActive(null);
  };

  const lpos = (lon: number, lat: number) => ({ left: `${((lon - W) / (E - W)) * 100}%`, top: `${((N - lat) / (N - S)) * 100}%` });
  const ev = active !== null ? stops[active] : null;

  return (
    <header className="hero-map" id="top">
      <div className="hm-stage" ref={stage} onPointerMove={follow} onPointerDown={follow} style={{ ["--ratio" as string]: ratio }}>
        <div className="hm-layer hm-base"><div className="hm-canvas"><img src={before} alt={altBefore} /></div></div>
        <div className="hm-layer hm-after"><div className="hm-canvas"><img src={after} alt={altAfter} /></div></div>
        {labels.length > 0 && <div className="hm-layer" aria-hidden="true">
          <div className="hm-canvas">
            {labels.map((l) => <span key={l.text} className={`hm-label hm-${l.kind}`} style={lpos(l.lon, l.lat)}>{l.kind === "place" && <i />}{l.text}</span>)}
          </div>
        </div>}
        <div className="hm-shade" aria-hidden="true" />
        <div className="hm-lens" aria-hidden="true">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="49" className="ring" />
            {Array.from({ length: 24 }, (_, k) => {
              const a = (k / 24) * 2 * Math.PI, long = k % 6 === 0;
              return <line key={k} x1={50 + 49 * Math.cos(a)} y1={50 + 49 * Math.sin(a)}
                x2={50 + (long ? 42 : 45.5) * Math.cos(a)} y2={50 + (long ? 42 : 45.5) * Math.sin(a)} className="tick" />;
            })}
            <path d="M50 44v12M44 50h12" className="cross" />
          </svg>
          <span className="hm-lens-year">2024</span>
          <span className="hm-handle" />
        </div>
        {ev && (
          <div className={`hm-evidence ${cardSide}`} role="status">
            <span className="ev-no">{t("Evidence", "Evidencia")} {String((active ?? 0) + 1).padStart(2, "0")}</span>
            <span className="ev-place">{ev.place}</span>
            <strong className="ev-finding">{ev.finding}</strong>
            <span className="ev-meta">
              <span className={`pill ${ev.tone === "field" ? "inconclusive" : ev.tone}`}>{ev.verdict}</span>
              <span className="ev-src">{ev.source}</span>
            </span>
            {ev.note && <span className="ev-src ev-note">{ev.note}</span>}
            {ev.alarm && <span className="ev-alarm">⚠ {ev.alarm}</span>}
          </div>
        )}
        <span className="hm-legend" aria-hidden="true"><i className="lg-out" />2004 <i className="lg-in" />{t("Inside the lens: 2024", "Dentro de la lupa: 2024")}</span>

        <div className="hm-copy">
          <div className="wrap">
            <div className="case-line"><span className="case-title">{kicker}</span></div>
            <h1>{title}</h1>
            <p className="hm-lede">{lede}</p>
            <div className="hm-cta">
              <button className="hm-btn primary" onClick={primary.go}>{primary.label}</button>
              {secondary && <button className="hm-btn ghost" onClick={secondary.go}>{secondary.label}</button>}
            </div>
          </div>
        </div>
        <span className="hm-credit">{credit}</span>
        {datron && <div className={`hm-datron ${datronSays ? "says" : ""}`} tabIndex={0} aria-label={t("Datron, the SciTeX guide (AI-generated illustration)", "Datron, guía de SciTeX (ilustración generada con IA)")}
          onMouseEnter={() => setDatronSays(true)} onMouseLeave={() => setDatronSays(false)} onFocus={() => setDatronSays(true)} onBlur={() => setDatronSays(false)}>
          <span className="hm-bubble" aria-hidden="true">{t("Use the lens to compare the two images.", "Usa la lupa para comparar las dos imágenes.")}<small>{t("Datron, your SciTeX guide", "Datron, tu guía de SciTeX")}</small></span>
          <img src={brandAsset("datron-detective.png")} alt="" title={t("Datron (AI-generated illustration)", "Datron (ilustración generada con IA)")} />
        </div>}
      </div>
    </header>
  );
}
