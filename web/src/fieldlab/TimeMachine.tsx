// AI-assisted: Claude (Anthropic). Instrument 1: satellite time machine (Landsat picture + MODIS green-area meter).
import { useEffect, useRef, useState, type ReactNode } from "react";
import { asset, useJSON } from "../data";
import { fill, NUM_LOCALE, type Lang } from "../i18n";
import type { GeoFeature } from "../types";
import { greenAt, type FieldState, type Yearly, type ZoneId } from "./logic";
import { FIELD_TEXT } from "./text";

const FIELD_KM2 = 0.00714; // one football pitch, 105 m × 68 m

function ZoneOutlines({ y }: { y: Yearly }) {
  const { data: zones } = useJSON<{ features: GeoFeature<{ id: string }>[] }>("zones.geojson");
  if (!zones) return null;
  const [W, S, E, N] = y.bbox;
  const VW = 1000, VH = 1000 * ((N - S) / (E - W));
  const pts = (id: string) => {
    const f = zones.features.find((z) => z.properties.id === id);
    return f ? (f.geometry.coordinates[0] as [number, number][]).map(([lo, la]) => `${(((lo - W) / (E - W)) * VW).toFixed(1)},${(((N - la) / (N - S)) * VH).toFixed(1)}`).join(" ") : "";
  };
  return (
    <svg className="fl-zones" viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" aria-hidden="true">
      <polygon points={pts("Z2")} className="z2" /><polygon points={pts("Z1")} className="z1" />
    </svg>
  );
}

function Meter({ label, km2, max, lang, t, headline }: { label: string; km2: number | null; max: number; lang: Lang; t: (typeof FIELD_TEXT)["en"]["time"]; headline?: boolean }) {
  const loc = NUM_LOCALE[lang];
  return (
    <div className={`fl-meter ${headline ? "headline" : ""}`}>
      <span className="fl-meter-l">{label}</span>
      {km2 === null ? <span className="fl-meter-na">{t.noData}</span> : (
        <>
          <span className="fl-meter-v num">{km2.toLocaleString(loc, { maximumFractionDigits: 0 })}<small> {t.km2}</small></span>
          <span className="fl-meter-bar"><i style={{ width: `${Math.min(100, (km2 / max) * 100)}%` }} /></span>
          <span className="fl-meter-s">{fill(t.fields, { n: Math.round(km2 / FIELD_KM2).toLocaleString(loc) })}</span>
        </>
      )}
    </div>
  );
}

function Spark({ y, year }: { y: Yearly; year: number }) {
  const vals = y.green_km2.Z2, max = Math.max(...vals.map((v) => v ?? 0)) || 1;
  const W = 300, H = 70, n = vals.length;
  const pts = vals.map((v, i) => (v === null || y.years[i] > year ? null : `${((i / (n - 1)) * W).toFixed(1)},${(H - 4 - (v / max) * (H - 10)).toFixed(1)}`)).filter(Boolean);
  return (
    <svg className="fl-spark" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <line x1="0" x2={W} y1={H - 4} y2={H - 4} className="base" />
      {pts.length > 1 && <polyline points={pts.join(" ")} />}
      {pts.length > 0 && <circle r="4" cx={pts[pts.length - 1]!.split(",")[0]} cy={pts[pts.length - 1]!.split(",")[1]} />}
    </svg>
  );
}

export function TimeMachine({ yearly: y, lang, head, nav, onRecord }: {
  yearly: Yearly; lang: Lang; head: ReactNode; nav: ReactNode; onRecord: (r: NonNullable<FieldState["time"]>) => void;
}) {
  const t = FIELD_TEXT[lang].time;
  const first = y.years[0], last = y.years[y.years.length - 1];
  const [year, setYear] = useState(first);
  const [playing, setPlaying] = useState(false);
  const seen = useRef(new Set<number>([first]));
  const [recorded, setRecorded] = useState(false);
  const max = Math.max(...y.green_km2.Z1.map((v) => v ?? 0), ...y.green_km2.Z2.map((v) => v ?? 0)) || 1;

  useEffect(() => { // preload every year so the slider never waits
    y.years.forEach((yr) => { const im = new Image(); im.src = asset(y.images[String(yr)].file); });
  }, [y]);
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setYear((v) => Math.min(v + 1, last)), 650);
    return () => window.clearInterval(id);
  }, [playing, last]);
  useEffect(() => { if (playing && year >= last) setPlaying(false); }, [year, playing, last]);
  useEffect(() => {
    seen.current.add(year);
    if (!recorded && seen.current.has(first) && seen.current.has(last)) {
      setRecorded(true);
      const g = (z: ZoneId, yr: number) => greenAt(y, z, yr);
      onRecord({ z2Start: g("Z2", first), z2End: g("Z2", last), z1Start: g("Z1", first), z1End: g("Z1", last) });
    }
  }, [year]);

  const a = greenAt(y, "Z2", first), b = greenAt(y, "Z2", last);
  const img = y.images[String(year)];
  return (
    <div className="ms-card ms-split fl-time">
      <div className="ms-visual">
        <div className="fl-tm">
          <div className="fl-tm-img">
            <img src={asset(img.file)} alt={`Ica and Villacurí in ${year}, ${img.sensor}`} draggable={false} />
            <ZoneOutlines y={y} />
            <span className="fl-tm-year num">{year}</span>
            <span className="fl-tm-tag" style={{ left: `${((-76.08 - y.bbox[0]) / (y.bbox[2] - y.bbox[0])) * 100}%`, top: `${((y.bbox[3] + 13.8) / (y.bbox[3] - y.bbox[1])) * 100}%` }}>{t.villacuri}</span>
            <span className="fl-tm-tag" style={{ left: `${((-75.62 - y.bbox[0]) / (y.bbox[2] - y.bbox[0])) * 100}%`, top: `${((y.bbox[3] + 14.3) / (y.bbox[3] - y.bbox[1])) * 100}%` }}>{t.valley}</span>
          </div>
          <div className="fl-tm-ctl">
            <button className="ms-btn small" id="fl-play" onClick={() => { if (year >= last) setYear(first); setPlaying(!playing); }}>{playing ? t.pause : `▶ ${t.play}`}</button>
            <input id="fl-year" type="range" min={first} max={last} step={1} value={year} aria-label="Year"
              onChange={(e) => { setPlaying(false); setYear(Number(e.target.value)); }} />
            <span className="fl-tm-ends"><span>{first}</span><span>{last}</span></span>
          </div>
        </div>
      </div>
      <div className="ms-panel">
        {head}
        <p className="ms-lede">{t.ask}</p>
        <Meter label={t.villacuri} km2={greenAt(y, "Z2", year)} max={max} lang={lang} t={t} headline />
        <Spark y={y} year={year} />
        <Meter label={t.valley} km2={greenAt(y, "Z1", year)} max={max} lang={lang} t={t} />
        {recorded && a !== null && b !== null
          ? <p className="fl-finding">🔎 {fill(t.finding, { a: Math.round(a), b: Math.round(b), k: (b / Math.max(a, 1)).toFixed(1) })}</p>
          : <p className="ms-note">{t.hint}</p>}
        <p className="ms-note">{fill(t.picture, { sensor: img.sensor })}</p>
        {nav}
      </div>
    </div>
  );
}
