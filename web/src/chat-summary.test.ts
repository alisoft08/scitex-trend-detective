// AI-assisted: Claude (Anthropic). The chat receives numbers rounded as the app shows them, so it cannot quote six decimals.
import { describe, expect, it } from "vitest";
import { summarizeCase } from "./chat-summary";
import type { CaseFile } from "./types";

const cf = {
  id: "Z2_lst", kind: "case", verdict: "confirmed", period: "2004-01/2024-12", n: 3, n_valid: 3,
  source: { agency: "NASA", product: "MOD11A2", version: "6.1", doi: "10.5067/x", resolution: "1 km" },
  trend: { sen_per_decade: -2.275209, sen_ci95_block_bootstrap: [-2.789974, -1.850781], p_block_bootstrap: 0.0012345 },
  series: [
    { date: "2004-01", value: 31.123456, anomaly: 0.123456, valid: true },
    { date: "2004-02", value: 30.987654, anomaly: -0.0004567, valid: true },
    { date: "2004-03", value: 29.5, anomaly: 1.98765, valid: true },
  ],
} as unknown as CaseFile;
const controls = { userLevel: "expert", chartMode: "Anomalies", sensitivityWindow: null, selectedPeriod: null,
  referenceArea: null, hoveredPoint: undefined, language: "en" } as never;
const labels = { studyArea: "Villacurí fields", nasaVariable: "Surface temperature", unit: "°C", slopeUnit: "°C per decade" };

describe("summarizeCase", () => {
  it("rounds the slope, its interval and the p-value to three significant figures", () => {
    const s = summarizeCase(cf, controls, labels);
    expect(s.slope.value).toBe(-2.28);
    expect(s.confidenceInterval95).toEqual([-2.79, -1.85]);
    expect(s.pValue).toBe(0.00123);
  });
  it("rounds the summary values the same way", () => {
    const s = summarizeCase(cf, controls, labels);
    expect(s.values.min).toBe(-0.000457);
    expect(s.values.max).toBe(1.99);
    expect(s.values.last).toEqual({ date: "2004-03", value: 1.99 });
  });
});
