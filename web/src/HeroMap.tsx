// AI-assisted: Claude (Anthropic). Landing view: a detective's lens over Ica. Outside the lens the land is shown in 2004,
// inside it in 2024. The lens tours four pieces of evidence on its own; the reader can take it over with a pointer.
import { useEffect, useMemo, useRef, useState } from "react";
import { asset, brandAsset, useJSON } from "./data";
import { useLocale } from "./i18n";
import { verdictLabel } from "./evidence";
import type { Manifest, MapMeta } from "./types";

interface HeroMeta extends MapMeta {
  hero?: { bbox: [number, number, number, number]; before: { file: string; source: string }; after: { file: string; source: string } };
}

interface Evidence { lon: number; lat: number; place: string; finding: string; source: string; verdict: string; tone: string; alarm?: string }

const LABELS: { lon: number; lat: number; text: string; kind: "place" | "sea" | "range" }[] = [
  { lon: -76.36, lat: -13.97, text: "Pacific Ocean", kind: "sea" },
  { lon: -76.25, lat: -13.84, text: "Paracas", kind: "place" },
  { lon: -75.73, lat: -14.07, text: "Ica", kind: "place" },
  { lon: -75.42, lat: -13.80, text: "Andes", kind: "range" },
];

const RATIO = 2118 / 1200;   // hero image aspect
const TRAVEL_MS = 1700;
const DWELL_MS = 3600;
const RESUME_MS = 4000;
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export function HeroMap({ m, primary, onMap }: {
  m: Manifest; primary: { label: string; go: () => void }; onMap: () => void;
}) {
  const { language, t, signed, pct } = useLocale();
  const { data: meta } = useJSON<HeroMeta>("map.json");
  const stage = useRef<HTMLDivElement>(null);
  const size = useRef({ w: 1, h: 1 });
  const manualUntil = useRef(0);
  const pos = useRef({ x: 0, y: 0 });
  const [active, setActive] = useState<number | null>(null);
  const [cardSide, setCardSide] = useState<"right" | "left">("right");
  const [datronSays, setDatronSays] = useState(true);

  // Datron's line shows for a few seconds on arrival, then only on hover or focus.
  useEffect(() => { const t = setTimeout(() => setDatronSays(false), 6500); return () => clearTimeout(t); }, []);

  const evidence: Evidence[] = useMemo(() => {
    const c = (id: string) => m.cases.find((k) => k.id === id);
    const zi = m.wells.by_zone.find((z) => z.juasvi_zone === "I");
    const ndvi = c("Z2_ndvi"), lst = c("Z1_lst"), air = c("Z4_t2m");
    const out: Evidence[] = [];
    if (ndvi) out.push({ lon: -75.95, lat: -13.89, place: t("Villacurí plains", "Llanuras de Villacurí"), finding: t(`Greenness ${signed(ndvi.sen_per_decade, 2)} per decade`, `Verdor ${signed(ndvi.sen_per_decade, 2)} por década`),
      source: "MODIS NDVI", verdict: verdictLabel(language, ndvi.verdict), tone: ndvi.verdict });
    if (zi) out.push({ lon: -75.72, lat: -14.0, place: t("Ica Valley, north", "Norte del valle de Ica"), finding: t(`Water table ${signed(zi.mean_rate_m_per_yr, 2)} m per year`, `Nivel freático ${signed(zi.mean_rate_m_per_yr, 2)} m por año`),
      source: t(`${zi.n} field wells (JUASVI)`, `${zi.n} pozos de campo (JUASVI)`), verdict: t(`${pct(zi.share_falling)} of wells falling`, `Descenso en el ${pct(zi.share_falling)} de pozos`), tone: "field" });
    if (lst) out.push({ lon: -75.68, lat: -14.22, place: t("Ica Valley fields", "Campos del valle de Ica"), finding: t(`Surface ${signed(lst.sen_per_decade, 2)} °C per decade`, `Superficie ${signed(lst.sen_per_decade, 2)} °C por década`),
      source: t("MODIS land surface temperature", "Temperatura superficial de MODIS"), verdict: verdictLabel(language, lst.verdict), tone: lst.verdict,
      alarm: t("The classic test calls it significant. The combined evidence is inconclusive.", "La prueba clásica señala una tendencia significativa. El análisis combinado es no concluyente.") });
    if (air) out.push({ lon: -75.43, lat: -13.95, place: t("Andean headwaters", "Cabecera andina"), finding: t(`Air ${signed(air.sen_per_decade, 2)} °C per decade`, `Aire ${signed(air.sen_per_decade, 2)} °C por década`),
      source: t("MERRA-2 reanalysis", "Reanálisis MERRA-2"), verdict: verdictLabel(language, air.verdict), tone: air.verdict });
    return out;
  }, [m, language, t, signed, pct]);

  useEffect(() => {
    const el = stage.current;
    const hero = meta?.hero;
    if (!el || !hero || evidence.length === 0) return;
    const [W, S, E, N] = hero.bbox;
    const ro = new ResizeObserver(([e]) => { size.current = { w: e.contentRect.width, h: e.contentRect.height }; });
    ro.observe(el);
    size.current = { w: el.clientWidth, h: el.clientHeight };
    // image coordinates -> stage pixels (the image covers the stage, centred)
    const toPx = (lon: number, lat: number) => {
      const { w, h } = size.current;
      const cw = Math.max(w, h * RATIO), ch = cw / RATIO;
      return { x: (w - cw) / 2 + ((lon - W) / (E - W)) * cw, y: (h - ch) / 2 + ((N - lat) / (N - S)) * ch };
    };
    const place = (x: number, y: number) => {
      pos.current = { x, y };
      el.style.setProperty("--lx", `${x.toFixed(1)}px`);
      el.style.setProperty("--ly", `${y.toFixed(1)}px`);
    };
    const first = toPx(evidence[0].lon, evidence[0].lat);
    place(first.x, first.y);
    setCardSide(first.x > size.current.w * 0.62 ? "left" : "right");
    setActive(0);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => ro.disconnect();

    let i = 0, from = first, t0 = performance.now(), phase: "dwell" | "travel" = "dwell", raf = 0;
    const tick = (now: number) => {
      if (now < manualUntil.current) { t0 = now; from = pos.current; phase = "travel"; raf = requestAnimationFrame(tick); return; }
      if (phase === "dwell") {
        const p = toPx(evidence[i].lon, evidence[i].lat);
        place(p.x, p.y);
        if (now - t0 > DWELL_MS) { phase = "travel"; t0 = now; from = p; i = (i + 1) % evidence.length; setActive(null); }
      } else {
        const to = toPx(evidence[i].lon, evidence[i].lat);
        const k = ease(Math.min(1, (now - t0) / TRAVEL_MS));
        place(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k);
        if (k >= 1) { phase = "dwell"; t0 = now; setCardSide(to.x > size.current.w * 0.62 ? "left" : "right"); setActive(i); }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [meta, evidence]);

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

  const hero = meta?.hero;
  const [W, S, E, N] = hero?.bbox ?? [0, 0, 1, 1];
  const lpos = (lon: number, lat: number) => ({ left: `${((lon - W) / (E - W)) * 100}%`, top: `${((N - lat) / (N - S)) * 100}%` });
  const ev = active !== null ? evidence[active] : null;

  return (
    <header className="hero-map" id="top">
      <div className="hm-stage" ref={stage} onPointerMove={follow} onPointerDown={follow}>
        {hero && (
          <>
            <div className="hm-layer hm-base">
              <div className="hm-canvas"><img src={asset(hero.before.file)} alt={t("Landsat true-color image of Ica and Villacurí in 2004", "Imagen Landsat en color natural de Ica y Villacurí en 2004")} /></div>
            </div>
            <div className="hm-layer hm-after">
              <div className="hm-canvas"><img src={asset(hero.after.file)} alt={t("The same area in 2024, seen through the detective's lens", "La misma área en 2024, vista a través de la lupa")} /></div>
            </div>
            <div className="hm-layer" aria-hidden="true">
              <div className="hm-canvas">
                {LABELS.map((l) => (
                  <span key={l.text} className={`hm-label hm-${l.kind}`} style={lpos(l.lon, l.lat)}>
                    {l.kind === "place" && <i />}{l.text === "Pacific Ocean" ? t("Pacific Ocean", "Océano Pacífico") : l.text}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
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
            {ev.alarm && <span className="ev-alarm">⚠ {ev.alarm}</span>}
          </div>
        )}
        <span className="hm-legend" aria-hidden="true"><i className="lg-out" />2004 <i className="lg-in" />{t("Inside the lens: 2024", "Dentro de la lupa: 2024")}</span>

        <div className="hm-copy">
          <div className="wrap">
            <div className="case-line">
              <span className="case-title">{t("Ica, Peru · NASA Earth observations", "Ica, Perú · Observaciones de la Tierra de NASA")}</span>
            </div>
            <h1>{t("Greener fields.", "Campos más verdes.")}<br />{t("Falling water levels in", "El agua baja en los")} <em>{t("monitored wells", "pozos monitoreados")}</em>.</h1>
            <p className="hm-lede">
              {t("Follow the evidence from an individual well to NASA satellites. Test what each dataset can tell you about Ica.", "Sigue la evidencia desde un pozo individual hasta los satélites de NASA. Comprueba qué puede decir cada serie sobre Ica.")}
            </p>
            <div className="hm-cta">
              <button className="hm-btn primary" id="hero-primary" onClick={primary.go}>{primary.label}</button>
              <button className="hm-btn ghost" onClick={onMap}>{t("Explore the map", "Explorar el mapa")}</button>
            </div>
          </div>
        </div>
        <span className="hm-credit">Landsat 5 (2004) · Landsat 8/9 (2024) · {t("NASA/USGS via Google Earth Engine", "NASA/USGS a través de Google Earth Engine")}</span>
        <div className={`hm-datron ${datronSays ? "says" : ""}`} tabIndex={0} aria-label={t("Datron, the SciTeX guide (AI-generated illustration). Take the lens and look at the evidence.", "Datron, guía de SciTeX (ilustración generada con IA). Toma la lupa y observa la evidencia.")}
          onMouseEnter={() => setDatronSays(true)} onMouseLeave={() => setDatronSays(false)} onFocus={() => setDatronSays(true)} onBlur={() => setDatronSays(false)}>
          <span className="hm-bubble" aria-hidden="true">{t("Take the lens and look at the evidence.", "Toma la lupa y observa la evidencia.")}<small>{t("Datron, your SciTeX guide", "Datron, tu guía de SciTeX")}</small></span>
          <img src={brandAsset("datron-detective.png")} alt="" title={t("Datron (AI-generated illustration)", "Datron (ilustración generada con IA)")} />
        </div>
      </div>
    </header>
  );
}

