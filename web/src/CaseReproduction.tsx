// AI-assisted: Codex (OpenAI). Provenance and downloadable evidence for a case.
import { useState, type RefObject } from "react";
import { caseCitation, caseGeometry } from "./case-research";
import { useEvidence } from "./evidence";
import { useLocale } from "./i18n";
import type { CaseFile } from "./types";

export function CaseReproduction({ cf, referenceId, generatedAt, title, detailsRef }: {
  cf: CaseFile; referenceId?: string; generatedAt: string; title: string; detailsRef: RefObject<HTMLDetailsElement>;
}) {
  const { t, language } = useLocale();
  const { casePeriod, dataKind, zoneName, mask, resolution } = useEvidence();
  const [copyState, setCopyState] = useState<"copied" | "manual">();
  const [downloadState, setDownloadState] = useState<"preparing" | "ready" | "error">();
  const geometry = caseGeometry(cf.zone.id, referenceId);
  const citation = caseCitation(cf, generatedAt, { language, title, zone: zoneName(cf.zone.id, cf.zone.name) });
  const geometryUrl = `data:application/geo+json;charset=utf-8,${encodeURIComponent(JSON.stringify(geometry))}`;
  const hasGeometry = geometry.features.length === (referenceId ? 2 : 1);
  const { source } = cf;

  async function copyCitation() {
    try {
      await navigator.clipboard.writeText(citation);
      setCopyState("copied");
    } catch {
      setCopyState("manual");
    }
  }

  async function download() {
    setDownloadState("preparing");
    try {
      const { downloadCase } = await import("./reproduction");
      await downloadCase(cf, { generatedAt, language, title, citation, geometry });
      setDownloadState("ready");
    } catch {
      setDownloadState("error");
    }
  }

  return <details open className="research-details action-scroll-target" ref={detailsRef}>
    <summary>{t("Cite and reproduce this result", "Citar y reproducir este resultado")}</summary>
    <p className="control-help">{t(
      "Copy the citation for a report, download the study areas as GeoJSON for a map, or download the ZIP with the processed data and scripts to reproduce the full-period analysis.",
      "Copia la cita para un informe, descarga las áreas de estudio en GeoJSON para un mapa o descarga el ZIP con los datos procesados y los scripts para reproducir el análisis del periodo completo.",
    )}</p>
    <dl className="research-facts">
      <div><dt>{t("Case ID and data snapshot", "ID del caso y fecha de los datos")}</dt><dd>{cf.id} · {generatedAt}</dd></div>
      <div><dt>{t("Full analysis period", "Periodo completo del análisis")}</dt><dd>{casePeriod(cf.period)} · {cf.n_valid}/{cf.n} {t("valid months", "meses válidos")}</dd></div>
      <div><dt>{t("Input dataset and version", "Fuente de datos y versión")}</dt><dd>
        {source.agency} · {source.product} ({source.version}) · {dataKind(cf)} · {resolution(cf)}
        {" · "}<a href={`https://doi.org/${source.doi}`} target="_blank" rel="noreferrer">{t("Dataset DOI", "DOI de la fuente")}</a>
      </dd></div>
      {geometry.features.map(({ properties: area }) => <div key={area.id}>
        <dt>{area.id === cf.zone.id ? t("Analysis polygon", "Polígono de análisis") : t("Reference polygon", "Polígono de referencia")}</dt>
        <dd>{zoneName(area.id, area.name)} ({area.id}){area.mask && <> · {mask(area.id, area.mask)}</>}</dd>
      </div>)}
      <div><dt>{t("Statistical method", "Método estadístico")}</dt><dd>{t(
        "Theil–Sen slope, 95% block bootstrap interval, block-bootstrap Mann–Kendall and regression with ARMA errors.",
        "Pendiente de Theil–Sen, intervalo del 95 % con bootstrap por bloques, Mann–Kendall con bootstrap por bloques y regresión con errores ARMA.",
      )}</dd></div>
    </dl>
    <p className="small muted">{t(
      "The analysis polygons define the sampled areas and can differ from official aquifer boundaries. The ZIP reproduces the full-period result from the processed series.",
      "Los polígonos de análisis definen las áreas muestreadas y pueden diferir de los límites oficiales de los acuíferos. El ZIP reproduce el resultado del periodo completo a partir de las series procesadas.",
    )}</p>
    <p className="small">{citation}</p>
    <div className="evidence-actions">
      <button type="button" className="btn research-secondary" onClick={() => void copyCitation()}>
        {copyState === "copied" ? t("Citation copied", "Cita copiada") : t("Copy citation", "Copiar cita")}
      </button>
      {hasGeometry && <a className="btn research-secondary" href={geometryUrl} download={`${cf.id}-study-area.geojson`}>
        {t("Download GeoJSON", "Descargar GeoJSON")}
      </a>}
      <button type="button" className="btn primary" disabled={downloadState === "preparing"} onClick={() => void download()}>
        {t("Download evidence ZIP", "Descargar ZIP de evidencias")}
      </button>
    </div>
    {copyState && <p className="small" role="status">{copyState === "copied" ? t("Citation copied to clipboard.", "Cita copiada al portapapeles.")
      : t("Select the citation above to copy it manually.", "Selecciona la cita de arriba para copiarla manualmente.")}</p>}
    {downloadState && <p className="small" role="status">{downloadState === "preparing" ? t("Preparing…", "Preparando…")
      : downloadState === "ready" ? t("Download ready.", "Descarga lista.") : t("Export failed. Try again.", "No se pudo exportar. Inténtalo de nuevo.")}</p>}
  </details>;
}
