// AI-assisted: Codex (OpenAI).
import type { CaseFile, PeriodGrid, Verdict, Window } from "./types";

export const MAX_CHAT_MESSAGES = 13;
export const MAX_CHAT_MESSAGE_CHARS = 4_000;
export const MAX_CHAT_CONTEXT_BYTES = 2_000;
export const CHAT_STREAM_TYPE = "application/x-ndjson";

export type HoveredPoint = {
  chart: "case" | "field-desert";
  date: string;
  value: number;
  unit: string;
  referenceValue?: number;
};

export type ChatContext = {
  caseId: string;
  studyArea: string;
  nasaVariable: string;
  dataset: CaseFile["source"];
  period: string;
  verdict: Verdict;
  slope: { value: number | null; unit: string };
  confidenceInterval95: [number | null, number | null];
  pValue: number | null;
  userLevel: "Explorer" | "Analyst" | "Expert";
  chartMode: "Anomalies" | "Original values";
  sensitivityWindow: Window | null;
  selectedPeriod?: PeriodGrid["periods"][number];
  referenceArea?: string;
  desertComparison: boolean;
  hoveredPoint?: HoveredPoint;
  values: {
    kind: "anomaly" | "original" | "standardized-gap";
    unit: string;
    min: number | null;
    max: number | null;
    last: { date: string; value: number } | null;
    validMonths: number;
    totalMonths: number;
  };
  language: "en" | "es";
};

export const CHAT_PAGES = ["aquifer", "ica", "map", "method", "compare", "sources"] as const;
export type ChatPage = typeof CHAT_PAGES[number];

export type PageChatContext = {
  view: ChatPage;
  pageId: string;
  title: string;
  facts: { label: string; value: string }[];
  language: "en" | "es";
};

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type ChatRequest = { messages: ChatMessage[]; uiContext: ChatContext | PageChatContext };
export type ChatEvent = { type: "delta"; text: string } | { type: "done" } | { type: "error" };
