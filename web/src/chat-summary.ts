// AI-assisted: Codex (OpenAI).
import type { ChatContext } from "./chat-contract";
import type { CaseFile } from "./types";

type Controls = Pick<ChatContext, "userLevel" | "chartMode" | "sensitivityWindow" | "selectedPeriod" | "referenceArea" | "hoveredPoint" | "language">;
type Labels = Pick<ChatContext, "studyArea" | "nasaVariable"> & { unit: string; slopeUnit: string };

export function summarizeCase(cf: CaseFile, controls: Controls, labels: Labels): ChatContext {
  const desertComparison = cf.kind === "contrast";
  // An Explorer in a contrast sees both original series, but the active case is still the standardized gap.
  const original = !desertComparison && controls.chartMode === "Original values";
  let min: number | null = null;
  let max: number | null = null;
  let last: ChatContext["values"]["last"] = null;
  for (const point of cf.series) {
    const value = original ? point.value : point.anomaly;
    if (!point.valid || value === null || !Number.isFinite(value)) continue;
    min = min === null ? value : Math.min(min, value);
    max = max === null ? value : Math.max(max, value);
    if (last === null || point.date > last.date) last = { date: point.date, value };
  }
  return {
    caseId: cf.id,
    studyArea: labels.studyArea,
    nasaVariable: labels.nasaVariable,
    dataset: cf.source,
    period: cf.period,
    verdict: cf.verdict,
    slope: { value: cf.trend.sen_per_decade, unit: labels.slopeUnit },
    confidenceInterval95: cf.trend.sen_ci95_block_bootstrap,
    pValue: cf.trend.p_block_bootstrap,
    ...controls,
    desertComparison,
    values: {
      kind: desertComparison ? "standardized-gap" : original ? "original" : "anomaly",
      unit: labels.unit,
      min,
      max,
      last,
      validMonths: cf.n_valid,
      totalMonths: cf.n,
    },
  };
}
