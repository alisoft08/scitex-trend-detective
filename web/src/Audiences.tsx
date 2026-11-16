// AI-assisted: Codex (OpenAI). A starting point for a reproducible comparison.
import { useLocale } from "./i18n";

export function Audiences({ onCompare, onLab }: { onCompare: () => void; onLab: () => void }) {
  const { t } = useLocale();
  return <section className="audiences" aria-labelledby="audiences-title">
    <div className="wrap wide">
      <h2 id="audiences-title">{t("Investigate water storage trends", "Investiga tendencias del almacenamiento de agua")}</h2>
      <p>{t(
        "For students and researchers in hydrology and remote sensing. Compare NASA water storage records across regions, inspect the uncertainty and download a case to reproduce the analysis.",
        "Para estudiantes e investigadores de hidrología y teledetección. Compara series de almacenamiento de agua de NASA entre regiones, revisa la incertidumbre y descarga un caso para reproducir el análisis.",
      )}</p>
      <div className="audience-actions">
        <button type="button" className="btn primary" onClick={onCompare}>{t("Compare GRACE trends in Ica and Northwest India", "Comparar tendencias de GRACE en Ica y el noroeste de India")}</button>
        <button type="button" className="btn research-secondary" onClick={onLab}>{t("See when statistical tests raise a false alarm", "Ver cuándo las pruebas estadísticas dan una falsa alarma")}</button>
      </div>
    </div>
  </section>;
}
