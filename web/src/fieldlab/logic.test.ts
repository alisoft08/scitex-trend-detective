// AI-assisted: Claude (Anthropic). Tests for the Explorer field-lab helpers (pure functions, real data shapes).
import { describe, expect, it } from "vitest";
import { buildNotebook, drillAt, greenAt, snapGrace, type Well, type Yearly, type ZoneRings } from "./logic";

const box = (w: number, s: number, e: number, n: number): [number, number][] => [[w, s], [e, s], [e, n], [w, n], [w, s]];
const ZONES: ZoneRings = { Z1: box(-75.82, -14.45, -75.62, -13.95), Z2: box(-76.08, -14.0, -75.8, -13.8) };
const well = (id: string, lon: number, lat: number, rate: number): Well => ({
  type: "Feature", geometry: { type: "Point", coordinates: [lon, lat] },
  properties: { well_id: id, juasvi_zone: "I", rate_m_per_yr: rate, years: 12, date_start: "01/10/2013", date_end: "30/09/2025", depth_start_m: 24, depth_end_m: 31 },
});
const WELLS = [well("A", -75.7, -14.05, -0.6), well("B", -75.65, -14.3, 0.4)];
const YEARLY: Yearly = {
  bbox: [-76.45, -14.4, -75.25, -13.72], years: Array.from({ length: 21 }, (_, i) => 2004 + i),
  images: {}, green_km2: { Z1: Array.from({ length: 21 }, (_, i) => 300 + i), Z2: Array.from({ length: 21 }, (_, i) => (i === 8 ? null : 50 + 5 * i)) },
  method: "", picture: "", region: { file: "", bbox: [-80, -18, -72, -10], source: "" }, grace_cell: { center: [-75.85, -14.12], size_deg: 3 },
};

describe("greenAt", () => {
  it("returns the measured area for a year", () => { expect(greenAt(YEARLY, "Z2", 2024)).toBe(150); });
  it("returns null when that year has no measurement", () => { expect(greenAt(YEARLY, "Z2", 2012)).toBeNull(); });
  it("returns null for a year outside the record", () => { expect(greenAt(YEARLY, "Z1", 1999)).toBeNull(); });
});

describe("drillAt", () => {
  it("finds the well half a kilometre away", () => {
    const r = drillAt([-75.7 + 0.5 / (111.32 * Math.cos((14.05 * Math.PI) / 180)), -14.05], WELLS, ZONES);
    expect(r.kind).toBe("well");
    if (r.kind === "well") expect(r.well.properties.well_id).toBe("A");
  });
  it("says Villacurí has no public wells", () => { expect(drillAt([-75.95, -13.9], WELLS, ZONES).kind).toBe("villacuri"); });
  it("finds nothing in the sea", () => { expect(drillAt([-76.4, -14.2], WELLS, ZONES).kind).toBe("none"); });
});

describe("snapGrace", () => {
  const cell = YEARLY.grace_cell;
  it("recognises the Ica cell", () => { expect(snapGrace([-75.9, -14.0], cell)).toEqual({ center: [-75.85, -14.12], isIca: true }); });
  it("jumps one whole cell east", () => {
    const r = snapGrace([-75.85 + 3.2, -14.12], cell);
    expect(r.isIca).toBe(false);
    expect(r.center[0]).toBeCloseTo(-75.85 + 3, 9);
    expect(r.center[1]).toBeCloseTo(-14.12, 9);
  });
});

describe("buildNotebook", () => {
  it("leaves four empty slots and no stamp when nothing was used", () => {
    const nb = buildNotebook({});
    expect(nb.entries.map((e) => e.id)).toEqual(["time", "wells", "grace", "witness"]);
    expect(nb.entries.every((e) => !e.used)).toBe(true);
    expect(nb.complete).toBe(false);
  });
  it("is complete when the four instruments were used, whatever they showed", () => {
    const nb = buildNotebook({ time: { z2Start: 50, z2End: 150, z1Start: 300, z1End: 320 }, wells: { drilled: ["B"], falling: 0 }, grace: true, witness: true });
    expect(nb.complete).toBe(true);
  });
  it("counts each drilled well once", () => {
    const nb = buildNotebook({ wells: { drilled: ["A", "A", "B"], falling: 1 } });
    expect(nb.wellsDrilled).toBe(2);
  });
});
