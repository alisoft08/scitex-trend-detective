// AI-assisted: Claude (Anthropic). Types for the JSON data contract (web/public/data).

export type Verdict = "confirmed" | "likely" | "inconclusive" | "insufficient_data";
export type DataType = "observed" | "modeled" | "estimated" | "classified";
export type Witness = "greenness" | "water" | "climate" | "heat";

export interface Zone {
  id: string;
  name: string;
  role: string;
  description: string;
  mask?: string;
}

export interface CaseRef {
  id: string;
  path: string;
  kind: "case" | "contrast";
  zone: string;
  zone_name: string;
  variable: string;
  label: string;
  short: string;
  witness: Witness;
  data_type: DataType;
  verdict: Verdict;
  sen_per_decade: number | null;
  ci95: [number | null, number | null];
  units: string;
}

export interface WellsZone {
  juasvi_zone: string;
  n: number;
  mean_rate_m_per_yr: number;
  median_rate_m_per_yr: number;
  share_falling: number;
}

export interface WellsSummary {
  n: number;
  median_rate_m_per_yr: number;
  mean_rate_m_per_yr: number;
  share_falling: number;
  by_zone: WellsZone[];
  period: string;
  note: string;
}

export interface DemoCase {
  id: string;
  title: string;
  case?: string;
  cases?: string[];
  contrast?: string;
  text: string;
}

export interface Impact {
  overdraft_m3_per_yr: number;
  overdraft_source: string;
  olympic_pools_per_yr: number;
  grace_footprint_km2: number;
  irrigated_area_km2: number;
  irrigated_area_note: string;
  et_volume: {
    zone: string; zone_name: string; verdict: Verdict; cropland_km2: number;
    et_mm_2004_2008: number; et_mm_2020_2024: number; mm3_2004_2008: number; mm3_2020_2024: number;
    change_mm_per_yr: number; change_mm3_per_yr: number; change_mm3_ci95: [number, number];
  }[];
  et_note: string;
  signal_mm_per_yr: number;
  grace_observed_mm_per_yr: number;
  implied_other_gain_mm_per_yr: number;
  footprint_to_irrigated: number;
  gldas_cell_km2: number;
  grace_noise_sd_mm: number;
  grace_phi: number;
  grace_years_to_detect: number | null;
  grace_years_available: number;
  gldas_phi: number | null;
  gldas_n: number;
  gldas_n_eff: number | null;
  zone_i_m_per_decade: number;
  note: string;
}

export interface Manifest {
  project: string;
  tagline: string;
  generated_at: string;
  period: string;
  zones: Zone[];
  cases: CaseRef[];
  wells: WellsSummary;
  impact: Impact;
  files: Record<string, string>;
  verdict_labels: Record<Verdict, string>;
  demo_cases: DemoCase[];
  provisional: string;
}

export interface SeriesPoint {
  date: string;
  value: number | null;
  anomaly: number | null;
  valid: boolean;
}

export interface Window {
  start: number;
  end: number;
  sen_per_decade: number | null;
  p_block_bootstrap: number | null;
}

export interface Trend {
  sen_per_decade: number | null;
  sen_ci95_block_bootstrap: [number | null, number | null];
  intercept: number | null;
  p_mk_classic: number | null;
  p_hamed_rao: number | null;
  p_block_bootstrap: number | null;
  block_length: number;
  arma_order: number[] | null;
  phi: number | null;
  beta_arma_per_decade: number | null;
  p_arma: number | null;
  confounders: string[];
  enso_lag_months: number | null;
  beta_with_confounders_per_decade: number | null;
  p_with_confounders: number | null;
  windows: Window[];
  windows_same_sign: number;
  windows_significant: number;
  jackknife?: { year: number; sen_per_decade: number | null; p_block_bootstrap: number | null }[];
  jackknife_flips_sign: boolean;
  jackknife_significant: number;
  jackknife_n: number;
  years_to_detect: number | null;
  n_eff: number | null;
}

export type CriterionKey = "C0" | "C1" | "C2" | "C3" | "C4" | "C5" | "C6";

export interface CaseFile {
  id: string;
  kind: "case" | "contrast";
  zone: Zone;
  variable: string;
  label: string;
  short: string;
  units: string;
  witness: Witness;
  definition: string;
  data_type: DataType;
  source: { product: string; version: string; doi: string; resolution: string; agency: string };
  period: string;
  n: number;
  n_valid: number;
  series: SeriesPoint[];
  trend: Trend;
  criteria: Record<CriterionKey, boolean | null>;
  criteria_labels: Record<CriterionKey, string>;
  verdict: Verdict;
  verdict_label: string;
  classic_test_says_significant: boolean;
  summary: string;
  summary_note: string;
  notes: string[];
}

export interface Simulation {
  n: number;
  alpha: number;
  reps_false_positive: number;
  reps_power: number;
  design: string;
  tests: { id: string; label: string }[];
  false_positive: ({ phi: number } & Record<string, number>)[];
  power: ({ phi: number } & Record<string, number>)[];
}

export interface Witnesses {
  years: number[];
  series: { id: string; label: string; values: (number | null)[] }[];
}

export interface MapMeta {
  bbox: [number, number, number, number];
  images: Record<string, { file: string; source: string; units?: string; min?: number; max?: number; palette?: string[]; note?: string }>;
}

export interface GeoFeature<P> {
  type: "Feature";
  geometry: { type: string; coordinates: any };
  properties: P;
}

export interface WellProps {
  well_id: string;
  juasvi_zone: string;
  rate_m_per_yr: number;
  years: number;
  date_start: string;
  date_end: string;
  depth_start_m: number;
  depth_end_m: number;
}
