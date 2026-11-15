// AI-assisted: Claude (Anthropic). The citation must carry data version, area, period, method and result in one string.
import { describe, expect, it } from "vitest";
import { caseCitation } from "./citation";
import type { CaseFile } from "./types";

const cf = {
  id: "ZIN_tws_grace", kind: "case", label: "Total water storage (GRACE satellites)", units: "mm", period: "2004-01/2024-12",
  verdict: "confirmed",
  zone: { id: "ZIN", name: "Northwest India (Punjab, Haryana, Rajasthan)", role: "aquifer" },
  source: { agency: "NASA/JPL", product: "GRACE/GRACE-FO JPL Mascon, Coastal Resolution Improvement", version: "RL06.3Mv04",
    doi: "10.5067/TEMSC-3JC634", resolution: "3° mascons" },
  trend: { sen_per_decade: -222.549196, sen_ci95_block_bootstrap: [-263.355322, -181.400538], block_length: 36, arma_order: [1, 0, 0] },
} as unknown as CaseFile;

describe("caseCitation", () => {
  const text = caseCitation(cf, { bbox: [70, 26, 78, 32], built: "2026-11-15T22:48Z", url: "https://example.org/#investigate?case=ZIN_tws_grace" });

  it("names the case, the area with its box and the period", () => {
    expect(text).toContain("Oasis Paradox case ZIN_tws_grace");
    expect(text).toContain("Northwest India (Punjab, Haryana, Rajasthan)");
    expect(text).toContain("box 70°, 26°, 78°, 32° (W, S, E, N)");
    expect(text).toContain("2004-01 to 2024-12");
  });
  it("gives the data product, version and DOI", () => {
    expect(text).toContain("NASA/JPL GRACE/GRACE-FO JPL Mascon, Coastal Resolution Improvement, version RL06.3Mv04, doi:10.5067/TEMSC-3JC634");
  });
  it("states the method and the result with three significant figures", () => {
    expect(text).toContain("block-bootstrap Mann–Kendall (36-month blocks)");
    expect(text).toContain("ARMA(1,0) errors");
    expect(text).toContain("−223 mm per decade (95% interval −263 to −181); Confirmed trend");
  });
  it("ends with the data build and the link", () => {
    expect(text).toMatch(/Data build 2026-11-15T22:48Z\. https:\/\/example\.org\/#investigate\?case=ZIN_tws_grace$/);
  });
  it("leaves the box out when it is unknown", () => {
    expect(caseCitation(cf, { built: "x", url: "u" })).not.toContain("box ");
  });
});
