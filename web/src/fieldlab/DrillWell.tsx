// AI-assisted: Claude (Anthropic). Instrument 2: drill a well (JUASVI field wells, first and last reading per well).
import { useState, type ReactNode } from "react";
import { asset, useJSON } from "../data";
import { fill, NUM_LOCALE, type Lang } from "../fieldlab-locale";
import type { GeoFeature, Manifest, MapMeta, WellProps } from "../types";
import { drillAt, type Drill, type FieldState, type Well, type ZoneRings } from "./logic";
import { FIELD_TEXT } from "./text";

const yearOf = (d: string) => d.split("/")[2];

/** Cross-section of the drilled well: ground, pipe, and the water level at its first and last reading. */
function Section({ w, t, lang }: { w: WellProps; t: (typeof FIELD_TEXT)["en"]["wells"]; lang: Lang }) {
  const loc = NUM_LOCALE[lang];
  const maxD = Math.max(w.depth_start_m, w.depth_end_m, 10) * 1.25;
  const H = 230, top = 34, y = (d: number) => top + (d / maxD) * (H - top - 10);
  const falling = w.rate_m_per_yr < 0;
  const f = (v: number) => v.toLocaleString(loc, { maximumFractionDigits: 1 });
  return (
    <svg className={`fl-section ${falling ? "falling" : "rising"}`} viewBox={`0 0 260 ${H}`} role="img"
      aria-label={fill(t.reading, { d1: f(w.depth_start_m), y1: yearOf(w.date_start), d2: f(w.depth_end_m), y2: yearOf(w.date_end) })}>
      <rect x="0" y={top} width="260" height={H - top} className="soil" />
      <rect x="0" y={y(w.depth_end_m)} width="260" height={H - y(w.depth_end_m)} className="aquifer" key={w.well_id} />
      <line x1="0" x2="260" y1={top} y2={top} className="ground" />
      <text x="6" y={top - 8} className="lbl">{t.ground}</text>
      <rect x="118" y={top - 14} width="24" height={H - top + 4} className="pipe" />
      <line x1="40" x2="220" y1={y(w.depth_start_m)} y2={y(w.depth_start_m)} className="lvl old" />
      <text x="224" y={y(w.depth_start_m) + 4} className="lbl">{yearOf(w.date_start)}</text>
      <line x1="40" x2="220" y1={y(w.depth_end_m)} y2={y(w.depth_end_m)} className="lvl new" key={`n${w.well_id}`} />
      <text x="224" y={y(w.depth_end_m) + 4} className="lbl strong">{yearOf(w.date_end)}</text>
      <text x="6" y={y(w.depth_end_m) - 6} className="lbl">{t.water}</text>
    </svg>
  );
}

export function DrillWell({ m, lang, head, nav, onRecord, initial = [] }: {
  m: Manifest; lang: Lang; head: ReactNode; nav: ReactNode; onRecord: (r: NonNullable<FieldState["wells"]>) => void; initial?: string[];
}) {
  const t = FIELD_TEXT[lang].wells;
  const loc = NUM_LOCALE[lang];
  const { data: meta } = useJSON<MapMeta>("map.json");
  const { data: wellGeo } = useJSON<{ features: Well[] }>("wells.geojson");
  const { data: zoneGeo } = useJSON<{ features: GeoFeature<{ id: string }>[] }>("zones.geojson");
  const [drilled, setDrilled] = useState<string[]>(initial);
  const [last, setLast] = useState<Drill | null>(null);
  const [mark, setMark] = useState<[number, number] | null>(null);
  if (!meta || !wellGeo || !zoneGeo) return <div className="ms-card ms-split"><div className="loading">…</div></div>;

  const [W, S, E, N] = meta.bbox;
  const rings: ZoneRings = Object.fromEntries(zoneGeo.features.map((z) => [z.properties.id, z.geometry.coordinates[0]]));
  const wells = wellGeo.features;
  const byId = new Map(wells.map((w) => [w.properties.well_id, w]));
  const falling = drilled.filter((id) => (byId.get(id)?.properties.rate_m_per_yr ?? 0) < 0).length;
  const pos = (lon: number, lat: number) => ({ left: `${((lon - W) / (E - W)) * 100}%`, top: `${((N - lat) / (N - S)) * 100}%` });

  const drill = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    drillAtPoint([W + ((e.clientX - r.left) / r.width) * (E - W), N - ((e.clientY - r.top) / r.height) * (N - S)]);
  };
  // Keyboard: Enter or Space drills the next well not yet drilled.
  const drillKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    const next = wells.find((wl) => !drilled.includes(wl.properties.well_id));
    if (next) drillAtPoint(next.geometry.coordinates as [number, number]);
  };
  const drillAtPoint = (lonlat: [number, number]) => {
    const d = drillAt(lonlat, wells, rings);
    setLast(d); setMark(lonlat);
    if (d.kind === "well") {
      const id = d.well.properties.well_id;
      const next = drilled.includes(id) ? drilled : [...drilled, id];
      setDrilled(next);
      if (next.length >= 3) onRecord({ drilled: next, falling: next.filter((x) => (byId.get(x)?.properties.rate_m_per_yr ?? 0) < 0).length });
    }
  };
  const zi = m.wells.by_zone.find((z) => z.juasvi_zone === "I");
  const w = last?.kind === "well" ? last.well.properties : null;
  const f = (v: number) => Math.abs(v).toLocaleString(loc, { maximumFractionDigits: 2 });
  const sampleDiffers = drilled.length >= 3 && falling / drilled.length < 0.5;
  return (
    <div className="ms-card ms-split fl-drill">
      <div className="ms-visual">
        <div className="fl-drill-map">
          <div className="fl-drill-img" onClick={drill} onKeyDown={drillKey} role="button" tabIndex={0} aria-label={t.ask}>
            <img src={asset(meta.images["landsat_2024"].file)} alt="Ica valley in 2024" draggable={false} />
            {wells.map((wl) => {
              const [lo, la] = wl.geometry.coordinates as [number, number];
              const id = wl.properties.well_id, done = drilled.includes(id);
              return <i key={id} className={`fl-well ${done ? (wl.properties.rate_m_per_yr < 0 ? "down" : "up") : ""}`} style={pos(lo, la)} />;
            })}
            {mark && <span className={`fl-drill-mark ${last?.kind}`} style={pos(mark[0], mark[1])} />}
          </div>
          <span className="fl-legend">{t.legend}</span>
        </div>
      </div>
      <div className="ms-panel">
        {head}
        {!w && <p className="ms-lede">{t.ask}</p>}
        {last?.kind === "villacuri" && <p className="fl-say">{t.villacuri}</p>}
        {last?.kind === "none" && <p className="fl-say">{t.none}</p>}
        {w && (
          <div className="fl-well-card">
            <Section w={w} t={t} lang={lang} />
            <div>
              <p className="fl-reading">{fill(t.reading, { d1: f(w.depth_start_m), y1: yearOf(w.date_start), d2: f(w.depth_end_m), y2: yearOf(w.date_end) })}</p>
              <p className={`fl-rate ${w.rate_m_per_yr < 0 ? "down" : "up"}`}>{w.rate_m_per_yr < 0 ? "↓ " : "↑ "}{fill(w.rate_m_per_yr < 0 ? t.falling : t.rising, { r: f(w.rate_m_per_yr) })}</p>
            </div>
          </div>
        )}
        {drilled.length > 0 && <p className="ms-counter">{fill(t.tally, { n: drilled.length, f: falling, u: drilled.length - falling })}</p>}
        {drilled.length >= 3
          ? <p className="fl-finding">🔎 {fill(t.network, { pct: Math.round(m.wells.share_falling * 100), total: m.wells.n, m: zi ? Math.abs(zi.mean_rate_m_per_yr * 10).toLocaleString(loc, { maximumFractionDigits: 1 }) : "" })}{sampleDiffers && <><br /><span className="ms-note">{t.small}</span></>}</p>
          : <p className="ms-note">{t.hint}</p>}
        {nav}
      </div>
    </div>
  );
}
