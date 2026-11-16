// AI-assisted: Claude (Anthropic). Who uses the tool and which decision it supports.
import { useLocale, type Translation } from "./i18n";

const TILES: { who: Translation; decision: Translation; does: Translation; cta: Translation; target: string }[] = [
  { who: ["Water agencies and users' boards", "Autoridades del agua y juntas de usuarios"],
    decision: ["Can satellites monitor our aquifer?", "¿Pueden los satélites monitorear nuestro acuífero?"],
    does: ["The atlas shows where GRACE confirms a loss and where well measurements can complement it.",
      "El atlas muestra dónde GRACE confirma una pérdida y dónde conviene complementar sus datos con mediciones en pozos."],
    cta: ["Open the aquifer atlas", "Abrir el atlas de acuíferos"], target: "#atlas" },
  { who: ["Journalists and NGOs", "Periodistas y ONG"],
    decision: ["Can we trust a claimed trend?", "¿Qué tan sólida es la tendencia que nos presentan?"],
    does: ["See the uncertainty, statistical tests and NASA source. In Ica, for example, the classic test flags an increase in modeled groundwater, but the combined result is inconclusive.",
      "Consulta la incertidumbre, las pruebas estadísticas y la fuente de NASA. En Ica, por ejemplo, la prueba clásica señala un aumento del agua subterránea modelada, pero el resultado combinado es no concluyente."],
    cta: ["See why the tests disagree", "Ver por qué discrepan las pruebas"], target: "case:ZW_gws" },
  { who: ["Researchers and teachers", "Investigadores y docentes"],
    decision: ["Does the verdict hold up?", "¿Se sostiene el veredicto?"],
    does: ["Review the pre-registered rule, robustness over different periods and the results after leaving out one year. Run a simulation and download data, code and settings to reproduce a case.",
      "Revisa la regla prerregistrada, la robustez en distintos periodos y los resultados al retirar un año. Ejecuta una simulación y descarga los datos, el código y la configuración para reproducir un análisis."],
    cta: ["Put the tests on trial", "Explorar la simulación de las pruebas"], target: "#method" },
];

export function Audiences({ onOpen }: { onOpen: (target: string) => void }) {
  const { t } = useLocale();
  return <section className="audiences" aria-labelledby="audiences-title">
    <div className="wrap wide">
      <p className="eyebrow">{t("Who it is for", "A quién se dirige")}</p>
      <h2 id="audiences-title">{t("For anyone about to say “NASA data show…”", "Para quienes se preguntan qué muestran los datos de NASA")}</h2>
      <p className="audiences-lede">{t("Check the source, scale and method before using a trend in a report, a story or a class.",
        "Comprueba la fuente, la escala y el método antes de usar una tendencia en un informe, un artículo o una clase.")}</p>
      <div className="audience-grid">
        {TILES.map((tile) => <article key={tile.target} className="audience-tile">
          <span className="eyebrow">{t(...tile.who)}</span>
          <strong>{t(...tile.decision)}</strong>
          <p>{t(...tile.does)}</p>
          <button className="text-button" onClick={() => onOpen(tile.target)}>{t(...tile.cta)}</button>
        </article>)}
      </div>
    </div>
  </section>;
}
