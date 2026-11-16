// AI-assisted: Codex (OpenAI). Geographic boundaries for the detective desk filter.
import { describe, expect, it } from "vitest";
import published from "../public/data/manifest.json";
import { studyAreasForZone } from "./study-areas";
import type { Manifest } from "./types";

const manifest = published as unknown as Manifest;
const ids = (zone: string) => studyAreasForZone(manifest, zone).map((area) => area.id).sort();

describe("Study area follows the selected country or region", () => {
  it.each(["ZW", "Z1", "Z2", "Z4", "Z5"])("keeps Ica's local areas together when entering from %s", (zone) => {
    expect(ids(zone)).toEqual(["Z1", "Z2", "Z4", "Z5", "ZW"]);
  });

  it.each(["ZC", "ZCR", "ZHP", "ZHPR"])("allows both US study regions and their reference areas from %s", (zone) => {
    expect(ids(zone)).toEqual(["ZC", "ZCR", "ZHP", "ZHPR"]);
  });

  it.each([
    ["ZINR", ["ZIN", "ZINR"]],
    ["ZAR", ["ZAR", "ZARR"]],
    ["ZTE", ["ZTE", "ZTER"]],
    ["ZGUR", ["ZGU", "ZGUR"]],
  ])("keeps %s within its region, including a natural-land reference", (zone, expected) => {
    expect(ids(zone)).toEqual(expected);
  });

  it("keeps the selected area available for every published zone", () => {
    for (const zone of manifest.zones.filter((area) => manifest.cases.some((record) => record.zone === area.id && record.kind === "case"))) {
      expect(ids(zone.id)).toContain(zone.id);
    }
  });

  it("falls back to the selected area when the atlas is unavailable", () => {
    expect(studyAreasForZone({ ...manifest, atlas: undefined }, "Z2").map((area) => area.id)).toEqual(["Z2"]);
  });
});
