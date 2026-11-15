// AI-assisted: Codex (OpenAI).
import dns from "node:dns";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import { detectAll } from "tinyld";
import {
  CHAT_PAGES, CHAT_STREAM_TYPE, MAX_CHAT_CONTEXT_BYTES, MAX_CHAT_MESSAGES, MAX_CHAT_MESSAGE_CHARS,
  type ChatContext, type ChatEvent, type ChatMessage,
} from "../src/chat-contract";
import { OASIS_MANUAL } from "./chat-manual";

// Both vite dev and the Vercel function use this Node handler.
dns.setDefaultResultOrder("ipv4first");

const MAX_BODY_BYTES = 128 * 1024;
const HEADERS = { "Cache-Control": "no-store, no-transform", "X-Content-Type-Options": "nosniff" };
type Env = { GEMINI_API_KEY?: string; GEMINI_MODEL?: string };

const languageNames = new Intl.DisplayNames("en", { type: "language" });

function identifyQuestionLanguage(question: string): string | undefined {
  const text = question.replace(/`[^`]*`/g, " ").replace(/\bZ(?:\d+|W)_[\w]+\b/g, " ");
  const [first, second] = detectAll(text);
  return first && first.accuracy >= 0.6 && first.accuracy - (second?.accuracy ?? 0) >= 0.15
    ? first.lang : undefined;
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isMessage(value: unknown): value is ChatMessage {
  return record(value) && (value.role === "user" || value.role === "assistant")
    && typeof value.content === "string" && value.content.trim().length > 0
    && value.content.length <= MAX_CHAT_MESSAGE_CHARS;
}

const isText = (value: unknown, maxLength: number): value is string =>
  typeof value === "string" && value.length <= maxLength;
const isDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}$/.test(value);
const isNullableNumber = (value: unknown): value is number | null =>
  value === null || (typeof value === "number" && Number.isFinite(value));

function isWindow(value: unknown) {
  return value === null || (record(value)
    && Number.isInteger(value.start) && Number.isInteger(value.end)
    && isNullableNumber(value.sen_per_decade) && isNullableNumber(value.p_block_bootstrap));
}

function isPoint(value: unknown) {
  return value === undefined || (record(value) && (value.chart === "case" || value.chart === "field-desert")
    && isDate(value.date) && Number.isFinite(value.value) && isText(value.unit, 64)
    && (value.referenceValue === undefined || Number.isFinite(value.referenceValue)));
}

function isDataset(value: unknown): value is ChatContext["dataset"] {
  return record(value) && isText(value.agency, 64) && isText(value.product, 160)
    && isText(value.version, 48) && isText(value.doi, 128) && isText(value.resolution, 160);
}

function isValues(value: unknown): value is ChatContext["values"] {
  return record(value) && (value.kind === "anomaly" || value.kind === "original" || value.kind === "standardized-gap")
    && isText(value.unit, 64) && isNullableNumber(value.min) && isNullableNumber(value.max)
    && (value.last === null || (record(value.last) && isDate(value.last.date) && Number.isFinite(value.last.value)))
    && typeof value.validMonths === "number" && Number.isSafeInteger(value.validMonths) && value.validMonths >= 0
    && typeof value.totalMonths === "number" && Number.isSafeInteger(value.totalMonths) && value.totalMonths >= value.validMonths;
}

function parsePageContext(value: Record<string, unknown>) {
  const { view, pageId, title, facts, language } = value;
  if (!CHAT_PAGES.some((item) => item === view) || !isText(pageId, 180) || !isText(title, 160)
    || !Array.isArray(facts) || facts.length > 12 || (language !== "en" && language !== "es")) return null;
  const cleanFacts: { label: string; value: string }[] = [];
  for (const fact of facts) {
    if (!record(fact) || !isText(fact.label, 160) || !isText(fact.value, 160)) return null;
    cleanFacts.push({ label: fact.label, value: fact.value });
  }
  return { view, pageId, title, facts: cleanFacts, language };
}

function parseContext(value: unknown) {
  if (!record(value) || new TextEncoder().encode(JSON.stringify(value)).byteLength >= MAX_CHAT_CONTEXT_BYTES) return null;
  if ("view" in value) return parsePageContext(value);
  const { caseId, studyArea, nasaVariable, dataset, period, verdict, slope, confidenceInterval95, pValue,
    userLevel, chartMode, sensitivityWindow, selectedPeriod, referenceArea, desertComparison, hoveredPoint, values, language } = value;
  if (typeof caseId !== "string" || !/^[A-Za-z0-9_]{1,80}$/.test(caseId)
    || !isText(studyArea, 120) || !isText(nasaVariable, 180) || !isDataset(dataset) || !isText(period, 40)
    || (verdict !== "confirmed" && verdict !== "likely" && verdict !== "inconclusive" && verdict !== "insufficient_data")
    || !record(slope) || !isNullableNumber(slope.value) || !isText(slope.unit, 84)
    || !Array.isArray(confidenceInterval95) || confidenceInterval95.length !== 2 || !confidenceInterval95.every(isNullableNumber)
    || !isNullableNumber(pValue) || (pValue !== null && (pValue < 0 || pValue > 1))
    || (userLevel !== "Explorer" && userLevel !== "Analyst" && userLevel !== "Expert")
    || (chartMode !== "Anomalies" && chartMode !== "Original values")
    || !isWindow(sensitivityWindow) || !isPoint(hoveredPoint) || !isValues(values)
    || (referenceArea !== undefined && !isText(referenceArea, 120))
    || (selectedPeriod !== undefined && (!record(selectedPeriod) || !isWindow(selectedPeriod)
      || !Number.isSafeInteger(selectedPeriod.n) || !isNullableNumber(selectedPeriod.p_arma)
      || !["both", "one", "none", "insufficient"].some((result) => result === selectedPeriod.result)))
    || desertComparison !== (values.kind === "standardized-gap") || (language !== "en" && language !== "es")) return null;

  const { agency, product, version, doi, resolution } = dataset;
  const window = record(sensitivityWindow) ? sensitivityWindow : null;
  const point = record(hoveredPoint) ? hoveredPoint : undefined;
  return {
    caseId, studyArea, nasaVariable, dataset: { agency, product, version, doi, resolution }, period, verdict,
    slope: { value: slope.value, unit: slope.unit }, confidenceInterval95, pValue, userLevel, chartMode,
    sensitivityWindow: window && {
      start: window.start, end: window.end, sen_per_decade: window.sen_per_decade, p_block_bootstrap: window.p_block_bootstrap,
    },
    selectedPeriod: record(selectedPeriod) ? {
      start: selectedPeriod.start, end: selectedPeriod.end, n: selectedPeriod.n, sen_per_decade: selectedPeriod.sen_per_decade,
      p_block_bootstrap: selectedPeriod.p_block_bootstrap, p_arma: selectedPeriod.p_arma, result: selectedPeriod.result,
    } : undefined,
    referenceArea, desertComparison,
    hoveredPoint: point && {
      chart: point.chart, date: point.date, value: point.value, unit: point.unit, referenceValue: point.referenceValue,
    },
    values: {
      kind: values.kind, unit: values.unit, min: values.min, max: values.max, validMonths: values.validMonths,
      totalMonths: values.totalMonths, last: values.last && { date: values.last.date, value: values.last.value },
    },
    language,
  };
}

export async function chatResponse(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { ...HEADERS, Allow: "POST" } });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return new Response(null, { status: 403, headers: HEADERS });
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json" || !request.body) return new Response(null, { status: 415, headers: HEADERS });
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) return new Response(null, { status: 413, headers: HEADERS });

  let body: unknown;
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  try {
    let size = 0;
    let json = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        void reader.cancel().catch(() => undefined);
        return new Response(null, { status: 413, headers: HEADERS });
      }
      json += decoder.decode(value, { stream: true });
    }
    body = JSON.parse(json + decoder.decode());
  } catch {
    return new Response(null, { status: 400, headers: HEADERS });
  } finally {
    reader.releaseLock();
  }

  const messages = record(body) ? body.messages : undefined;
  const context = record(body) ? parseContext(body.uiContext) : null;
  if (!context || !Array.isArray(messages) || !messages.length || messages.length > MAX_CHAT_MESSAGES
    || !messages.every(isMessage) || messages[messages.length - 1].role !== "user") {
    return new Response(null, { status: 400, headers: HEADERS });
  }
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey) return new Response(null, { status: 503, headers: HEADERS });

  const { language: interfaceLanguage, ...summary } = context;
  const questionLanguage = identifyQuestionLanguage(messages[messages.length - 1].content);
  const languageInstruction = questionLanguage
    ? `Respond in ${languageNames.of(questionLanguage)}. This is the language of the latest question.`
    : `Infer the language from the latest question. Only use ${languageNames.of(interfaceLanguage)} if the question has no identifiable language.`;
  const model = env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";
  // Gemini 2.5 Flash supports a zero budget. Gemini 3 uses model-specific thinking levels.
  const thinkingConfig = /^gemini-2\.5-flash(?:-|$)/.test(model) ? { thinkingBudget: 0 }
    : /^gemini-3\.(?:1|5)-flash-lite(?:-|$)/.test(model) ? { thinkingLevel: "minimal" }
    : /^gemini-[34]\./.test(model) ? { thinkingLevel: "low" }
    : undefined;

  const abort = new AbortController();
  const firstTextDeadline = AbortSignal.timeout(10_000);
  const totalDeadline = AbortSignal.timeout(35_000);
  const signal = AbortSignal.any([request.signal, abort.signal, totalDeadline]);
  const onFirstTextTimeout = () => abort.abort("No text received from Gemini within 10 seconds");
  firstTextDeadline.addEventListener("abort", onFirstTextTimeout, { once: true });
  const generation = streamText({
    providerOptions: thinkingConfig && { google: { thinkingConfig } },
    model: createGoogleGenerativeAI({ apiKey })(model),
    system: OASIS_MANUAL + "\n\n" + languageInstruction
      + "\n\nCurrent data snapshot (JSON):\n" + JSON.stringify({ ...summary, language: questionLanguage }),
    messages: messages.map(({ role, content }) => ({ role, content })),
    maxOutputTokens: 700,
    maxRetries: 0,
    abortSignal: signal,
    onError: () => { /* Provider errors are reported as a generic stream event. */ },
  });
  const encoder = new TextEncoder();
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatEvent) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        let hasText = false;
        for await (const part of generation.fullStream) {
          if (part.type === "error" || part.type === "abort") throw new Error("Generation interrupted");
          if (part.type === "text-delta" && part.text) {
            if (!hasText && part.text.trim()) {
              hasText = true;
              firstTextDeadline.removeEventListener("abort", onFirstTextTimeout);
            }
            send({ type: "delta", text: part.text });
          }
        }
        if (!request.signal.aborted && !cancelled) send({ type: hasText && !signal.aborted ? "done" : "error" });
      } catch {
        if (!request.signal.aborted && !cancelled) send({ type: "error" });
      } finally {
        firstTextDeadline.removeEventListener("abort", onFirstTextTimeout);
        if (!cancelled) controller.close();
      }
    },
    cancel() { cancelled = true; abort.abort(); },
  });
  return new Response(stream, { headers: { ...HEADERS, "Content-Type": `${CHAT_STREAM_TYPE}; charset=utf-8` } });
}
