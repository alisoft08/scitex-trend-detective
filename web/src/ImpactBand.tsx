// AI-assisted: Claude (Anthropic). Three numbers that say why the case matters; every value comes from the engine's JSON.
import { useJSON } from "./data";
import { useLocale } from "./i18n";
import type { Manifest, Simulation } from "./types";

export function ImpactBand({ m, onOpen }: { m: Manifest; onOpen: (target: string) => void }) {
  const { t, fmt, pct } = useLocale();
  const { data: sim } = useJSON<Simulation>("simulation.json");
  const im = m.impact;
  const fp = sim?.false_positive.find((f) => f.phi === 0.9);
  return (
    <section className="impact-band" aria-label={t("Why this case matters", "Por qué importa este caso")}>
      <div className="wrap wide impact-grid">
        <article className="impact-tile">
          <span className="eyebrow">{t("Groundwater use", "Uso de agua subterránea")}</span>
          <strong className="num">{fmt(Math.round(im.overdraft_m3_per_yr / 1e6))} {t("million m³", "millones de m³")}</strong>
          <p>{t("of groundwater used each year beyond the recharge of the Ica aquifer.",
            "de agua subterránea al año por encima de la recarga del acuífero de Ica.")}</p>
          <span className="small muted">Salmoral et al., 2020 · {t("published estimate", "estimación publicada")}</span>
        </article>
        <article className="impact-tile">
          <span className="eyebrow">{t("Satellite scale", "Escala satelital")}</span>
          <strong className="num">{im.footprint_to_irrigated}×</strong>
          <p>{t("larger than the farms. A GRACE measurement averages over that area, which limits its ability to locate a loss.",
            "el área agrícola. Una medición de GRACE promedia toda esa superficie, lo que limita su capacidad para localizar una pérdida.")}</p>
        </article>
        <article className="impact-tile">
          <span className="eyebrow">{t("False alarms", "Falsas alarmas")}</span>
          <strong className="num">{fp ? `${pct(fp.mk_classic)} → ${pct(fp.consensus)}` : "…"}</strong>
          <p>{t("false alarms from the classic test and then from our rule, on correlated data with no trend.",
            "de falsas alarmas con la prueba clásica y con nuestra regla, en datos correlacionados sin tendencia.")}</p>
          <button className="text-button" onClick={() => onOpen("#method")}>{t("Open Trend lab to compare false alarms →", "Abrir el Laboratorio de tendencias para comparar falsas alarmas →")}</button>
        </article>
      </div>
    </section>
  );
}
