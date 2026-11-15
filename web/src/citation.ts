// AI-assisted: Claude (Anthropic). One copyable citation per case: data version, area, period, method and result together.
import type { CaseFile } from "./types";

const VERDICT: Record<string, string> = {
  confirmed: "Confirmed trend", likely: "Likely trend", inconclusive: "Inconclusive", insufficient_data: "Insufficient data",
};

/** Three significant figures with a typographic minus, as the app shows numbers. */
const sig3 = (x: number | null | undefined) =>
  x === null || x === undefined || !Number.isFinite(x) ? "n/a" : Number(x.toPrecision(3)).toString().replace("-", "−");

export function caseCitation(cf: CaseFile, opts: { bbox?: [number, number, number, number]; built: string; url: string }): string {
  const tr = cf.trend;
  const [lo, hi] = tr.sen_ci95_block_bootstrap;
  const box = opts.bbox ? `, box ${opts.bbox.map((v) => `${v}°`).join(", ")} (W, S, E, N)` : "";
  const arma = tr.arma_order ? `regression with ARMA(${tr.arma_order[0]},${tr.arma_order[2]}) errors` : "regression with ARMA errors";
  const units = cf.kind === "contrast" ? "standard deviations" : cf.units;
  return [
    `SciTeX (2026). Oasis Paradox case ${cf.id}: ${cf.label}, ${cf.zone.name}${box}, ${cf.period.replace("/", " to ")}.`,
    `Data: ${cf.source.agency} ${cf.source.product}, version ${cf.source.version}, doi:${cf.source.doi}.`,
    `Method: Theil–Sen slope; block-bootstrap Mann–Kendall (${tr.block_length}-month blocks) and ${arma}; verdict rules in config/verdict.yaml.`,
    `Result: ${sig3(tr.sen_per_decade)} ${units} per decade (95% interval ${sig3(lo)} to ${sig3(hi)}); ${VERDICT[cf.verdict] ?? cf.verdict}.`,
    `Data build ${opts.built}. ${opts.url}`,
  ].join(" ");
}
