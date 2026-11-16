// AI-assisted: Claude (Anthropic). Three numbers that say why the case matters; every value comes from the engine's JSON.
import { useJSON } from "./data";
import { useLocale } from "./i18n";
import type { Manifest, Simulation } from "./types";

const pct = (v: number) => `${Math.round(v * 100)}%`;

export function ImpactBand({ m, onOpen }: { m: Manifest; onOpen: (target: string) => void }) {
  const { t } = useLocale();
  const { data: sim } = useJSON<Simulation>("simulation.json");
  const im = m.impact;
  const fp = sim?.false_positive.find((f) => f.phi === 0.9);
  return (
    <section className="impact-band" aria-label="Why this case matters">
      <div className="wrap wide impact-grid">
        <article className="impact-tile">
          <span className="eyebrow">The stake</span>
          <strong className="num">{Math.round(im.overdraft_m3_per_yr / 1e6)} million m³</strong>
          <p>of groundwater consumed each year beyond what the Ica aquifer recharges.</p>
          <span className="small muted">Salmoral et al., 2020 · published estimate</span>
        </article>
        <article className="impact-tile">
          <span className="eyebrow">From space</span>
          <strong className="num">{im.footprint_to_irrigated}×</strong>
          <p>larger than the farms: the area one GRACE measurement averages, so the satellites cannot localise the loss.</p>
          <button className="text-button" onClick={() => onOpen("#map")}>{t("Open the Ica wells and satellite map →", "Abrir el mapa de pozos y satélites de Ica →")}</button>
        </article>
        <article className="impact-tile">
          <span className="eyebrow">Honest statistics</span>
          <strong className="num">{fp ? `${pct(fp.mk_classic)} → ${pct(fp.consensus)}` : "…"}</strong>
          <p>false alarms: a classic test, then our rule, on trendless data with groundwater-like memory.</p>
          <button className="text-button" onClick={() => onOpen("#method")}>{t("Open Trend lab to compare false alarms →", "Abrir el Laboratorio de tendencias para comparar falsas alarmas →")}</button>
        </article>
      </div>
    </section>
  );
}
