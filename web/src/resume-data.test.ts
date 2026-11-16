// AI-assisted: Codex (OpenAI). Check the geographic scope of dashboard sources.
import { describe, expect, it } from "vitest";
import published from "../public/data/manifest.json";
import { SUMMARY_VARIABLES, summaryRecords, summaryRegion } from "./resume-data";
import type { Manifest } from "./types";

const m = published as unknown as Manifest;
const selected = (zone: string) => m.cases.find((record) => record.zone === zone && record.kind === "case")!;

describe("Resume geographic scope", () => {
  it("uses the four published witnesses for every aquifer", () => {
    for (const region of m.atlas!) {
      const records = summaryRecords(m, selected(region.id));
      expect(records.map((record) => record?.variable)).toEqual([...SUMMARY_VARIABLES]);
      expect(records.map((record) => record?.id)).toEqual([region.tws.id, region.gws.id, region.ndvi?.id, region.rain.id]);
    }
  });

  it("keeps local Ica vegetation and labels regional water and headwater rainfall through their source cases", () => {
    const records = summaryRecords(m, selected("Z1"));
    expect(records.map((record) => record?.zone)).toEqual(["ZW", "ZW", "Z1", "Z4"]);
    expect(summaryRegion(m, "Z1")?.id).toBe("ZW");
  });

  it("retains reference-area vegetation while resolving its own aquifer's water", () => {
    for (const region of m.atlas!.filter((entry) => entry.id !== "ZW")) {
      const reference = m.cases.find((record) => record.zone === region.id && record.ref_zone)?.ref_zone;
      expect(reference).toBeTruthy();
      const records = summaryRecords(m, selected(reference!));
      expect(records[0]?.id).toBe(region.tws.id);
      expect(records[1]?.id).toBe(region.gws.id);
      expect(records[2]?.zone).toBe(reference);
    }
  });

  it("leaves unavailable signals empty instead of borrowing another region's data", () => {
    const limited = { ...m, atlas: undefined };
    const records = summaryRecords(limited, selected("Z2"));
    expect(records[0]).toBeUndefined();
    expect(records[1]).toBeUndefined();
    expect(records[2]?.zone).toBe("Z2");
    expect(records[3]).toBeUndefined();
  });
});
