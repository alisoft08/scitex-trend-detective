// AI-assisted: Claude (Anthropic). "Can a satellite see your aquifer?": GRACE trend against the number of GRACE footprints
// the aquifer covers. Hand-drawn SVG; every number comes from the engine's manifest (no statistics here).
import { useState } from "react";
import { useAtlasLocale } from "./atlas-locale";
import { verdictLabel } from "./evidence";
import { useLocale, type Translation } from "./i18n";
import type { AtlasEntry } from "./types";

const W = 760, H = 380, M = { l: 64, r: 24, t: 20, b: 52 };
const X0 = 0.02, X1 = 30;                      // log axis: GRACE footprints covered
const lx = (v: number) => M.l + (Math.log10(v) - Math.log10(X0)) / (Math.log10(X1) - Math.log10(X0)) * (W - M.l - M.r);
const COLOR = { down: "#a8700a", up: "#3c78bb", flat: "#71706f" } as const;
// Label side per aquifer, so neighbours (Arabia, Tigris-Euphrates, High Plains) do not collide.
const LABEL: Record<string, [number, number, "start" | "end"]> = {
  ZW: [12, 4, "start"], ZC: [12, 4, "start"], ZHP: [-12, -8, "end"], ZIN: [12, 4, "start"],
  ZAR: [-12, 14, "end"], ZTE: [12, 2, "start"], ZGU: [-12, -10, "end"],
};
const SHORT: Record<string, Translation> = {
  ZW: ["Ica, Peru", "Ica, Perú"], ZC: ["Central Valley", "Valle Central"], ZHP: ["High Plains", "Altas Llanuras"],
  ZIN: ["NW India", "Noroeste de India"],
  ZAR: ["Arabia (Saq)", "Arabia (Saq)"], ZTE: ["Tigris–Euphrates", "Tigris–Éufrates"], ZGU: ["Guarani", "Guaraní"],
};

export function DetectabilityChart({ atlas, onOpen }: { atlas: AtlasEntry[]; onOpen: (id: string) => void }) {
  const { t, language, fmt, fixed, signedFixed } = useLocale();
  const { shortName } = useAtlasLocale();
  const name = (a: AtlasEntry) => SHORT[a.id] ? t(...SHORT[a.id]) : shortName(a);
  const [hover, setHover] = useState<string | null>(null);
  const pts = atlas.filter((a) => a.tws.per_decade !== null).map((a) => {
    const proven = a.tws.verdict === "confirmed" || a.tws.verdict === "likely";
    const v = (a.tws.per_decade ?? 0) / 10;
    const [lo, hi] = a.tws.ci95.map((c) => (c ?? 0) / 10);
    return { a, x: a.grace_footprints, v, lo, hi, tone: !proven ? "flat" : v < 0 ? "down" : "up", likely: a.tws.verdict === "likely" } as const;
  });
  const ymin = Math.min(-5, ...pts.map((p) => p.lo)) - 2, ymax = Math.max(5, ...pts.map((p) => p.hi)) + 2;
  const ly = (v: number) => M.t + (ymax - v) / (ymax - ymin) * (H - M.t - M.b);
  const yticks = [-25, -20, -15, -10, -5, 0, 5].filter((t) => t >= ymin && t <= ymax);
  const xticks = [0.03, 0.1, 0.3, 1, 3, 10];
  const hp = pts.find((p) => p.a.id === hover);

  return <figure className="detect-chart">
    <div className="detect-plot">
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={t(
        "Total water storage trends versus GRACE footprints. Values are also in the table below.",
        "Tendencias del almacenamiento total de agua frente a las huellas de GRACE. Los valores también aparecen en la tabla de abajo.")}>
        {/* below one footprint GRACE averages the aquifer with land around it */}
        <rect x={lx(X0)} y={M.t} width={lx(1) - lx(X0)} height={H - M.t - M.b} className="detect-band" />
        <text x={(lx(X0) + lx(1)) / 2} y={M.t + 16} className="detect-band-label" textAnchor="middle">{t("smaller than one GRACE footprint", "menos de una huella de GRACE")}</text>
        {yticks.map((t) => <g key={t}>
          <line x1={M.l} x2={W - M.r} y1={ly(t)} y2={ly(t)} className={t === 0 ? "detect-zero" : "detect-grid"} />
          <text x={M.l - 10} y={ly(t) + 4} textAnchor="end" className="detect-tick">{t > 0 ? `+${t}` : t === 0 ? "0" : `−${-t}`}</text>
        </g>)}
        {xticks.map((t) => <g key={t}>
          <line x1={lx(t)} x2={lx(t)} y1={H - M.b} y2={H - M.b + 5} className="detect-axis" />
          <text x={lx(t)} y={H - M.b + 20} textAnchor="middle" className="detect-tick">{fmt(t)}</text>
        </g>)}
        <text x={(M.l + W - M.r) / 2} y={H - 8} textAnchor="middle" className="detect-axis-label">{t("GRACE footprints covered (log scale)", "Huellas de GRACE (escala logarítmica)")}</text>
        <text transform={`translate(16 ${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle" className="detect-axis-label">{t("Total water, mm per year", "Agua total, mm al año")}</text>
        {pts.map((p) => {
          const c = COLOR[p.tone], x = lx(p.x), y = ly(p.v), [dx, dy, anchor] = LABEL[p.a.id] ?? [12, 4, "start"];
          return <g key={p.a.id} className={`detect-pt ${hover === p.a.id ? "on" : ""}`} onMouseEnter={() => setHover(p.a.id)} onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(p.a.id)} onBlur={() => setHover(null)} onClick={() => onOpen(p.a.id)} tabIndex={0} role="button"
            aria-label={`${name(p.a)}: ${signedFixed(p.v, 1)} ${t("mm per year", "mm al año")}, ${verdictLabel(language, p.a.tws.verdict)}, ${fmt(p.x)} ${t("footprints. Open its page.", "huellas. Abrir ficha del acuífero.")}`}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(p.a.id); } }}>
            <line x1={x} x2={x} y1={ly(p.lo)} y2={ly(p.hi)} stroke={c} className="detect-ci" />
            <circle cx={x} cy={y} r={16} className="detect-hit" />
            <circle cx={x} cy={y} r={6.5} fill={p.tone === "flat" ? "#ffffff" : p.likely ? "#ffffff" : c} stroke={c} className="detect-dot" />
            {p.likely && <circle cx={x} cy={y} r={2.6} fill={c} />}
            <text x={x + dx} y={y + dy} textAnchor={anchor} className="detect-label">{name(p.a)}</text>
          </g>;
        })}
      </svg>
      {hp && <div className="detect-tip" style={{ left: `${(lx(hp.x) / W) * 100}%`, top: `${(ly(hp.v) / H) * 100}%` }} role="status">
        <strong>{name(hp.a)}</strong>
        <span>{signedFixed(hp.v, 1)} {t("mm/yr", "mm/año")} ({t("95%", "95 %")}: {fixed(hp.lo, 1)} {t("to", "a")} {fixed(hp.hi, 1)})</span>
        <span>{verdictLabel(language, hp.a.tws.verdict)} · {fmt(hp.x)} {t("footprints", "huellas")}</span>
        <span className="detect-tip-hint">{t("Open the aquifer page", "Abrir la ficha del acuífero")}</span>
      </div>}
    </div>
    <figcaption>
      <span className="detect-legend"><i style={{ background: COLOR.down, borderColor: COLOR.down }} />{t("falling", "descenso")} <i style={{ background: COLOR.up, borderColor: COLOR.up }} />{t("rising", "aumento")} <i className="ring" style={{ borderColor: COLOR.flat }} />{t("trend to evaluate · ring with a dot: likely", "tendencia a evaluar · anillo con punto: probable")}</span>
      {t("GRACE/GRACE-FO JPL mascons, 2004–2024. The whiskers show the 95% slope interval (block bootstrap). Study areas are approximate.",
        "Celdas de concentración de masa de GRACE/GRACE-FO JPL, 2004–2024. Las barras muestran el intervalo del 95 % para la pendiente (bootstrap por bloques). Las áreas de estudio son aproximadas.")}
    </figcaption>
  </figure>;
}
