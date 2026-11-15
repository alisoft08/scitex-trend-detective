// AI-assisted: Claude (Anthropic). Instrument 3: weigh water from space (GRACE footprint on its fixed grid, to true scale).
import { useRef, useState, type ReactNode } from "react";
import { asset } from "../data";
import { fill, NUM_LOCALE, type Lang } from "../i18n";
import type { Manifest } from "../types";
import { snapGrace, type Yearly } from "./logic";
import { FIELD_TEXT } from "./text";

const PLACES: { name: string; lonlat: [number, number] }[] = [
  { name: "Lima", lonlat: [-77.04, -12.05] }, { name: "Ica", lonlat: [-75.2, -14.07] }, { name: "Arequipa", lonlat: [-71.54, -16.4] },
];

export function GraceScale({ m, yearly, lang, head, nav, onRecord }: {
  m: Manifest; yearly: Yearly; lang: Lang; head: ReactNode; nav: ReactNode; onRecord: () => void;
}) {
  const t = FIELD_TEXT[lang].grace;
  const loc = NUM_LOCALE[lang];
  const cell = yearly.grace_cell;
  const [W, S, E, N] = yearly.region.bbox;
  const start: [number, number] = [cell.center[0] - cell.size_deg, cell.center[1] + cell.size_deg];
  const [center, setCenter] = useState<[number, number]>(start);
  const [isIca, setIsIca] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const x = (lon: number) => ((lon - W) / (E - W)) * 100;
  const y = (lat: number) => ((N - lat) / (N - S)) * 100;
  const place = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    const lonlat: [number, number] = [W + ((e.clientX - r.left) / r.width) * (E - W), N - ((e.clientY - r.top) / r.height) * (N - S)];
    snapTo(lonlat);
  };
  const snapTo = (lonlat: [number, number]) => {
    const s = snapGrace(lonlat, cell);
    setCenter(s.center); setIsIca(s.isIca);
    if (s.isIca && !recorded) { setRecorded(true); onRecord(); }
  };
  const grace = m.cases.find((c) => c.id === "ZW_tws_grace")?.sen_per_decade ?? null;
  const k = m.impact.footprint_to_irrigated;
  const half = cell.size_deg / 2;
  const farmDeg = Math.sqrt(m.impact.irrigated_area_km2) / 111; // side of a square with the farms' area
  const gridLines: number[] = [];
  for (let i = -3; i <= 3; i++) gridLines.push(i);

  return (
    <div className="ms-card ms-split fl-grace">
      <div className="ms-visual">
        <div className="fl-gr-map" ref={box}
          onPointerDown={(e) => { dragging.current = true; (e.target as Element).setPointerCapture?.(e.pointerId); place(e); }}
          onPointerMove={(e) => { if (dragging.current) place(e); }}
          onPointerUp={() => { dragging.current = false; }} role="application" aria-label={`${t.ask} (arrow keys move the cell)`} tabIndex={0}
          onKeyDown={(e) => {
            const d: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
            const v = d[e.key]; if (!v) return;
            e.preventDefault();
            snapTo([center[0] + v[0] * cell.size_deg, center[1] + v[1] * cell.size_deg]);
          }}>
          <img src={asset(yearly.region.file)} alt="Relief of Peru's coast and Andes (SRTM)" draggable={false} />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="fl-gr-grid" aria-hidden="true">
            {gridLines.map((i) => (
              <g key={i}>
                <line x1={x(cell.center[0] + (i + 0.5) * cell.size_deg)} x2={x(cell.center[0] + (i + 0.5) * cell.size_deg)} y1="0" y2="100" />
                <line y1={y(cell.center[1] + (i + 0.5) * cell.size_deg)} y2={y(cell.center[1] + (i + 0.5) * cell.size_deg)} x1="0" x2="100" />
              </g>
            ))}
          </svg>
          {PLACES.map((p) => <span key={p.name} className="fl-gr-place" style={{ left: `${x(p.lonlat[0])}%`, top: `${y(p.lonlat[1])}%` }}>{p.name}</span>)}
          <span className="fl-gr-farms" title={t.farms} style={{ left: `${x(-75.85)}%`, top: `${y(-14.05)}%`, width: `${(farmDeg / (E - W)) * 100}%` }} />
          <span className={`fl-gr-scale ${isIca ? "on" : ""}`}
            style={{ left: `${x(center[0] - half)}%`, top: `${y(center[1] + half)}%`, width: `${(cell.size_deg / (E - W)) * 100}%`, height: `${(cell.size_deg / (N - S)) * 100}%` }}>
            <b>{t.scale}</b>
          </span>
        </div>
      </div>
      <div className="ms-panel">
        {head}
        <p className="ms-lede">{t.ask}</p>
        {isIca && grace !== null ? (
          <div className="fl-gr-gauges">
            <div className="fl-gauge up"><span>GRACE</span><b>↑</b><small>{fill(t.reading, { v: grace.toLocaleString(loc, { maximumFractionDigits: 1 }) })}</small></div>
            <div className="fl-gauge down"><span>JUASVI</span><b>↓</b><small>{t.wells}</small></div>
          </div>
        ) : <p className="fl-say">{center[0] === start[0] && center[1] === start[1] ? t.hint : t.offCell}</p>}
        {isIca && <p className="ms-lede small">{fill(t.times, { k })}</p>}
        <p className="ms-note">{t.jump}</p>
        {recorded && <p className="fl-finding">🔎 {fill(t.finding, { k })}</p>}
        {nav}
      </div>
    </div>
  );
}
