import type { CaseRef } from "./types";

export function comparisonPair(cases: CaseRef[], variable: string, zoneA: string, zoneB: string): readonly [string, string] | undefined {
  const choices = cases.filter((c) => c.variable === variable);
  const preferredA = choices.find((c) => c.zone === zoneA);
  const preferredB = choices.find((c) => c.zone === zoneB && c.zone !== preferredA?.zone);
  const a = preferredA ?? choices.find((c) => c.zone !== preferredB?.zone);
  const b = preferredB ?? choices.find((c) => c.zone !== a?.zone);
  return a && b ? [a.id, b.id] : undefined;
}
