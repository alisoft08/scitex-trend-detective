// AI-assisted: Claude (Anthropic). The map room: Earth Engine images, zones, wells and annotated findings
// on one lon/lat frame, with a 2004/2024 swipe and a CSS "fly to" zoom on each finding.
import { useMemo, useState } from "react";
import { asset, useJSON } from "./data";
import { fmt, pct, signed } from "./format";
import type { GeoFeature, Manifest, MapMeta, WellProps, WellsSummary } from "./types";

const VB_W = 1432;
const VB_H = 1700;

type Mode = "trend" | "compare" | "photo";
const MODES: { id: Mode; label: string }[] = [
  { id: "trend", label: "Change 2004–2024" },
  { id: "compare", label: "Swipe 2004 | 2024" },
  { id: "photo", label: "Photo 2024" },
];

const ZONE_SHORT: Record<string, string> = { Z1: "Ica Valley", Z2: "Villacurí", Z5: "Desert control" };

interface Finding {
  id: string;
  lon: number;
  lat: number;
  title: string;
  stat: string;
  text: string;
}

export function MapView({ m }: { m: Manifest }) {
  const { data: meta } = useJSON<MapMeta>("map.json");
  const { data: zones } = useJSON<{ features: GeoFeature<{ id: string; name: string }>[] }>("zones.geojson");
  const { data: wellGeo } = useJSON<{ features: GeoFeature<WellProps>[] }>("wells.geojson");
  const [mode, setMode] = useState<Mode>("trend");
  const [cut, setCut] = useState(50);
  const [sel, setSel] = useState<WellProps | null>(null);
  const [showWells, setShowWells] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [focus, setFocus] = useState<string | null>(null);

  const findings: Finding[] = useMemo(() => {
    if (!wellGeo) return [];
    const centroid = (zone: string) => {
      const pts = wellGeo.features.filter((f) => f.properties.juasvi_zone === zone).map((f) => f.geometry.coordinates as [number, number]);
      return [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
    };
    const zi = m.wells.by_zone.find((z) => z.juasvi_zone === "I")!;
    const ziv = m.wells.by_zone.find((z) => z.juasvi_zone === "IV")!;
    const c = (id: string) => m.cases.find((k) => k.id === id)!;
    const [lonI, latI] = centroid("I");
    const [lonIV, latIV] = centroid("IV");
    return [
      { id: "villacuri", lon: -75.94, lat: -13.9, title: "Villacurí: desert turned to farmland",
        stat: `${signed(c("Z2_ndvi").sen_per_decade, 2)} NDVI per decade · ${m.verdict_labels[c("Z2_ndvi").verdict].toLowerCase()}`,
        text: "Blue patches are fields that appeared or grew greener since 2004. Switch to the swipe view to see them in the photos." },
      { id: "north", lon: lonI, lat: latI, title: "North valley: the water table falls",
        stat: `${pct(zi.share_falling)} of ${zi.n} wells falling · ${signed(zi.mean_rate_m_per_yr, 2)} m per year`,
        text: "Every monitored well in JUASVI zone I dropped. At this rate the water table sinks about five meters per decade." },
      { id: "foothills", lon: lonIV, lat: latIV, title: "Foothills: some wells rise",
        stat: `${ziv.n} wells · ${signed(ziv.mean_rate_m_per_yr, 2)} m per year`,
        text: "Closer to where the river enters the valley, the water table goes up. The aquifer does not fall everywhere." },
      { id: "desert", lon: -76.0, lat: -14.27, title: "Untouched desert: the control",
        stat: `+${(c("Z5_ndvi").sen_per_decade ?? 0).toFixed(3)} NDVI per decade, about a hundredth of Villacurí`,
        text: "No irrigation, almost no change. Subtracting this desert from the farms removes the weather both places share." },
    ];
  }, [wellGeo, m]);

  if (!meta || !zones || !wellGeo) return <div className="map-room-loading">Loading the map…</div>;

  const [W, S, E, N] = meta.bbox;
  const fx = (lon: number) => (lon - W) / (E - W);       // 0..1 across
  const fy = (lat: number) => (N - lat) / (N - S);       // 0..1 down
  const kmAcross = (E - W) * 111.32 * Math.cos(((N + S) / 2) * (Math.PI / 180));

  const f = findings.find((x) => x.id === focus);
  const k = f && mode !== "compare" ? 2.3 : 1;
  const clamp = (v: number) => Math.min(0, Math.max(100 - 100 * k, v));
  const tx = f && k > 1 ? clamp(50 - k * fx(f.lon) * 100) : 0;
  const ty = f && k > 1 ? clamp(50 - k * fy(f.lat) * 100) : 0;
  const scaleKm = k > 1 ? 5 : 20;

  const trend = meta.images["ndvi_trend"];
  const base = mode === "trend" ? trend : meta.images["landsat_2024"];
  const zoneFeats = zones.features.filter((z) => ["Z1", "Z2", "Z5"].includes(z.properties.id));

  const pickMode = (md: Mode) => { setMode(md); if (md === "compare") setFocus(null); };

  return (
    <div className="maproom">
      <div className="map-col">
        <div className={`mapv ${mode}`} style={{ ["--k" as string]: k }}>
          <div className="map-layer" style={{ transform: `translate(${tx}%, ${ty}%) scale(${k})` }}>
            <img src={asset(base.file)} alt={base.source} draggable={false} />
            {mode === "compare" && (
              <img className="after" src={asset(meta.images["landsat_2004"].file)} alt={meta.images["landsat_2004"].source}
                style={{ clipPath: `inset(0 ${100 - cut}% 0 0)` }} draggable={false} />
            )}
            <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none" aria-label="Zones and wells">
              {showZones && zoneFeats.map((z) => {
                const ring: [number, number][] = z.geometry.coordinates[0];
                const xs = ring.map((c) => fx(c[0]) * VB_W), ys = ring.map((c) => fy(c[1]) * VB_H);
                const x0 = Math.min(...xs), y0 = Math.min(...ys);
                return <rect key={z.properties.id} className="zone" x={x0} y={y0} width={Math.max(...xs) - x0} height={Math.max(...ys) - y0} rx={6} />;
              })}
              {showWells && wellGeo.features.map((w) => {
                const p = w.properties;
                const [lon, lat] = w.geometry.coordinates as [number, number];
                const r = 7 + Math.min(Math.abs(p.rate_m_per_yr), 1.5) * 8;
                return (
                  <circle key={p.well_id} className={`well ${p.rate_m_per_yr < 0 ? "fall" : "rise"} ${sel?.well_id === p.well_id ? "sel" : ""}`}
                    cx={fx(lon) * VB_W} cy={fy(lat) * VB_H} r={r} tabIndex={mode === "compare" ? -1 : 0} role="button"
                    aria-label={`Well ${p.well_id}: ${signed(p.rate_m_per_yr)} m per year`}
                    onClick={() => setSel(p)} onKeyDown={(e) => e.key === "Enter" && setSel(p)} />
                );
              })}
            </svg>
            {showZones && zoneFeats.map((z) => {
              const ring: [number, number][] = z.geometry.coordinates[0];
              return (
                <span key={z.properties.id} className="zone-tag"
                  style={{ left: `${Math.min(...ring.map((c) => fx(c[0]))) * 100}%`, top: `${Math.min(...ring.map((c) => fy(c[1]))) * 100}%` }}>
                  {ZONE_SHORT[z.properties.id]}
                </span>
              );
            })}
            {mode !== "compare" && findings.map((fd, i) => (
              <button key={fd.id} className={`pin ${focus === fd.id ? "on" : ""}`} aria-label={`Finding ${i + 1}: ${fd.title}`}
                style={{ left: `${fx(fd.lon) * 100}%`, top: `${fy(fd.lat) * 100}%` }}
                onClick={() => setFocus(focus === fd.id ? null : fd.id)}>{i + 1}</button>
            ))}
          </div>

          {mode === "compare" && (
            <>
              <span className="swipe-line" style={{ left: `${cut}%` }}><span className="swipe-knob" aria-hidden="true">⇆</span></span>
              <span className="swipe-tag l">2004</span><span className="swipe-tag r">2024</span>
              <input className="swipe-input" type="range" min={0} max={100} value={cut} onChange={(e) => setCut(Number(e.target.value))}
                aria-label="Drag to compare 2004 and 2024" />
            </>
          )}

          <div className="map-ctl top-left" role="group" aria-label="Map view">
            {MODES.map((md) => (
              <button key={md.id} id={`mode-${md.id}`} aria-pressed={mode === md.id} onClick={() => pickMode(md.id)}>{md.label}</button>
            ))}
          </div>
          <div className="map-ctl top-right">
            <label><input type="checkbox" checked={showWells} onChange={(e) => setShowWells(e.target.checked)} /> Wells</label>
            <label><input type="checkbox" checked={showZones} onChange={(e) => setShowZones(e.target.checked)} /> Zones</label>
            {k > 1 && <button className="reset" onClick={() => setFocus(null)}>Reset view</button>}
          </div>

          {k === 1 && (
            <div className="graticule" aria-hidden="true">
              {[-76.0, -75.8, -75.6, -75.4].map((lon) => (
                <span key={lon} className="gx" style={{ left: `${fx(lon) * 100}%` }}>{Math.abs(lon).toFixed(1)}°W</span>
              ))}
              {[-13.8, -14.0, -14.2, -14.4].map((lat) => (
                <span key={lat} className="gy" style={{ top: `${fy(lat) * 100}%` }}>{Math.abs(lat).toFixed(1)}°S</span>
              ))}
            </div>
          )}
          <div className="scalebar" aria-hidden="true">
            <span className="bar" style={{ width: `${(scaleKm / kmAcross) * 100 * k}%` }} />
            <span>{scaleKm} km</span>
          </div>
          <div className="north" aria-hidden="true">
            <svg viewBox="0 0 20 28" width="16" height="22"><path d="M10 1 17 22 10 17 3 22Z" /></svg>
            <span>N</span>
          </div>

          {sel && (
            <div className="well-card" role="status">
              <button className="close" aria-label="Close" onClick={() => setSel(null)}>×</button>
              <span className="eyebrow">Well {sel.well_id} · JUASVI zone {sel.juasvi_zone}</span>
              <strong className={sel.rate_m_per_yr < 0 ? "fall" : "rise"}>
                {signed(sel.rate_m_per_yr, 2)} m per year
              </strong>
              <span className="small">Water level {fmt(sel.depth_start_m)} m → {fmt(sel.depth_end_m)} m below ground over {fmt(sel.years, 2)} years.</span>
            </div>
          )}
        </div>

        <div className="map-legend">
          {mode === "trend" && trend.palette && (
            <div className="lg">
              <span className="eyebrow">Greenness change per decade (NDVI)</span>
              <div className="ramp" style={{ background: `linear-gradient(90deg, ${trend.palette.join(",")})` }} />
              <div className="ramp-labels"><span>−0.3 fields faded</span><span>0</span><span>+0.3 new or greener fields</span></div>
            </div>
          )}
          {mode !== "trend" && (
            <div className="lg">
              <span className="eyebrow">Landsat true color, yearly median</span>
              <span className="small">Landsat 5 (2004) and Landsat 8/9 (2024). Irrigated fields are the dark green patchwork.</span>
            </div>
          )}
          {showWells && (
            <div className="lg">
              <span className="eyebrow">Wells, 2010–2025 (JUASVI)</span>
              <span className="small lg-wells">
                <svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="5.5" className="lg-fall" /></svg> water table falling
                <svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="5.5" className="lg-rise" /></svg> rising
                <span className="muted">· size = speed</span>
              </span>
            </div>
          )}
        </div>
        <p className="map-caption">{base.source}. {mode === "trend" ? trend.note : ""} Rendered with Google Earth Engine.</p>
      </div>

      <div className="map-rail">
        <span className="eyebrow">03 · Where it happens</span>
        <h2>New fields in Villacurí. Falling wells in the valley.</h2>
        <p className="rail-lede">Four findings, one map. Click a number to fly to it.</p>
        <ol className="findings">
          {findings.map((fd, i) => (
            <li key={fd.id}>
              <button className={`finding ${focus === fd.id ? "on" : ""}`} aria-pressed={focus === fd.id}
                onClick={() => { if (mode === "compare") setMode("trend"); setFocus(focus === fd.id ? null : fd.id); }}>
                <span className="n">{i + 1}</span>
                <span className="body">
                  <span className="t">{fd.title}</span>
                  <span className="s">{fd.stat}</span>
                  {focus === fd.id && <span className="x">{fd.text}</span>}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <div className="rail-block">
          <span className="eyebrow">Water table by JUASVI zone</span>
          <WellsBars wells={m.wells} />
        </div>
        <p className="small rail-note">
          Zones are provisional boxes. Ica Valley and Villacurí keep only cropland pixels (yearly peak NDVI above 0.4 in 2020–2024);
          the desert control keeps only pixels that never turned green.
        </p>
      </div>
    </div>
  );
}

const JUASVI_ZONE_TEXT: Record<string, string> = {
  I: "I · north", II: "II · center", III: "III · south", IV: "IV · foothills",
};

export function WellsBars({ wells }: { wells: WellsSummary }) {
  const max = 0.8;
  return (
    <div className="wellbars">
      {wells.by_zone.map((z) => {
        const v = z.mean_rate_m_per_yr;
        const w = (Math.min(Math.abs(v), max) / max) * 50;
        return (
          <div className="wellbar" key={z.juasvi_zone}>
            <span>{JUASVI_ZONE_TEXT[z.juasvi_zone] ?? z.juasvi_zone} <span className="muted">({z.n})</span></span>
            <span className="track" aria-label={`mean ${signed(v)} m per year`}>
              <span className="axis0" />
              <span className={`bar ${v < 0 ? "fall" : "rise"}`} style={v < 0 ? { right: "50%", width: `${w}%` } : { left: "50%", width: `${w}%` }} />
            </span>
            <span className="num small">{signed(v, 2)} m/yr</span>
          </div>
        );
      })}
    </div>
  );
}
