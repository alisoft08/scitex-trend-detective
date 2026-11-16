// AI-assisted: Claude (Anthropic). Explorer field lab: pure lookups on precomputed data (no statistics here).
import type { GeoFeature, WellProps } from "../types";

export type ZoneId = "Z1" | "Z2";
export type Well = GeoFeature<WellProps>;
export type ZoneRings = Partial<Record<string, [number, number][]>>;

export interface Yearly {
  bbox: [number, number, number, number];
  years: number[];
  images: Record<string, { file: string; sensor: string }>;
  green_km2: Record<ZoneId, (number | null)[]>;
  method: string;
  picture: string;
  region: { file: string; bbox: [number, number, number, number]; source: string };
  grace_cell: { center: [number, number]; size_deg: number };
}

/** Green (irrigated) area measured in a zone that year, or null when there is no measurement. */
export function greenAt(y: Yearly, zone: ZoneId, year: number): number | null {
  const i = y.years.indexOf(year);
  if (i < 0) return null;
  return y.green_km2[zone][i] ?? null;
}

function km(a: [number, number], b: [number, number]): number {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad, dLon = (b[0] - a[0]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function inside(p: [number, number], ring: [number, number][]): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

export type Drill = { kind: "well"; well: Well; km: number } | { kind: "villacuri" } | { kind: "none" };

/** Where the student clicked: the nearest real well within maxKm, Villacurí (no public wells), or nothing. */
export function drillAt(lonlat: [number, number], wells: Well[], zones: ZoneRings, maxKm = 2): Drill {
  let best: Well | null = null, bestKm = Infinity;
  for (const w of wells) {
    const d = km(lonlat, w.geometry.coordinates as [number, number]);
    if (d < bestKm) { best = w; bestKm = d; }
  }
  if (best && bestKm <= maxKm) return { kind: "well", well: best, km: bestKm };
  if (zones.Z2 && inside(lonlat, zones.Z2)) return { kind: "villacuri" };
  return { kind: "none" };
}

/** GRACE data come on a fixed grid of cells: the scale jumps whole cells; only the Ica cell has a reading. */
export function snapGrace(lonlat: [number, number], cell: { center: [number, number]; size_deg: number }) {
  const s = cell.size_deg;
  const ix = Math.round((lonlat[0] - cell.center[0]) / s), iy = Math.round((lonlat[1] - cell.center[1]) / s);
  return { center: [cell.center[0] + ix * s, cell.center[1] + iy * s] as [number, number], isIca: ix === 0 && iy === 0 };
}

export interface FieldState {
  time?: { z2Start: number | null; z2End: number | null; z1Start: number | null; z1End: number | null };
  wells?: { drilled: string[]; falling: number };
  grace?: true;
  witness?: true;
}

export type NotebookId = "time" | "wells" | "grace" | "witness";

/** The student's notebook: which instruments were used; the stamp needs all four, whatever they showed. */
export function buildNotebook(s: FieldState) {
  const entries: { id: NotebookId; used: boolean }[] = [
    { id: "time", used: !!s.time },
    { id: "wells", used: !!s.wells && s.wells.drilled.length > 0 },
    { id: "grace", used: !!s.grace },
    { id: "witness", used: !!s.witness },
  ];
  return { entries, complete: entries.every((e) => e.used), wellsDrilled: new Set(s.wells?.drilled ?? []).size };
}
