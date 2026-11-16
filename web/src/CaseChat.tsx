// AI-assisted: Codex (OpenAI).
import { lazy, Suspense, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { brandAsset } from "./data";
import { useEvidence } from "./evidence";
import { pageQuestions } from "./page-chat";
import { useLocale } from "./i18n";
import { CHAT_STREAM_TYPE, MAX_CHAT_MESSAGES, MAX_CHAT_MESSAGE_CHARS,
  type ChatContext, type ChatEvent, type ChatMessage, type ChatRequest, type PageChatContext } from "./chat-contract";
import type { CaseRef } from "./types";
import "./case-chat.css";

const Markdown = lazy(() => import("react-markdown"));

type Turn = { id: number; caseId: string; title: string; question: string; answer: string };
type ChatIssue = "loading" | "unconfigured" | "failed";

async function streamReply(payload: ChatRequest, signal: AbortSignal, onText: (text: string) => void) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (response.status === 503) throw new Error("unconfigured");
  if (!response.ok || !response.body || !response.headers.get("content-type")?.startsWith(CHAT_STREAM_TYPE)) {
    throw new Error("failed");
  }
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let answer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) throw new Error("failed");
      buffer += value;
      let end = buffer.indexOf("\n");
      while (end !== -1) {
        const event = JSON.parse(buffer.slice(0, end)) as ChatEvent;
        buffer = buffer.slice(end + 1);
        if (event.type === "done" && answer.trim()) return answer;
        if (event.type !== "delta" || typeof event.text !== "string") throw new Error("failed");
        answer += event.text;
        onText(answer);
        end = buffer.indexOf("\n");
      }
    }
  } finally {
    void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export function CaseChat({ selected, page, getContext }: {
  selected?: CaseRef;
  page?: PageChatContext;
  getContext: () => ChatContext | PageChatContext | undefined;
}) {
  const { t } = useLocale();
  const { caseTitle, zoneName } = useEvidence();
  const id = useId();
  const launcher = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const hasOpened = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const nextId = useRef(0);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState<Turn | null>(null);
  const [issue, setIssue] = useState<{ code: ChatIssue; caseId: string } | null>(null);
  const scopeId = selected?.id ?? page?.pageId;
  const title = selected ? caseTitle(selected.variable, selected.zone, selected.label) : page?.title ?? "";
  const area = selected ? zoneName(selected.zone, selected.zone_name) : undefined;
  const questions = selected ? [
    t(`What does the verdict mean for ${area}?`, `¿Qué significa el veredicto para ${area}?`),
    t(`How do I read the chart for ${title}?`, `¿Cómo leo el gráfico de ${title}?`),
    selected.kind === "contrast"
      ? t("What does the gap with the reference area measure?", "¿Qué mide la brecha con el área de referencia?")
      : t("What differs between anomalies and original values?", "¿Qué cambia entre anomalías y valores originales?"),
  ] : page ? pageQuestions(page.view).map((question) => t(...question)) : [];

  useEffect(() => () => { activeRequest.current?.abort(); }, []);
  useLayoutEffect(() => {
    const entering = open ? panel.current : launcher.current;
    const leaving = open ? launcher.current : panel.current;
    if (entering) entering.inert = false;
    if (open) {
      hasOpened.current = true;
      input.current?.focus();
    } else if (hasOpened.current) {
      launcher.current?.focus({ preventScroll: true });
    }
    if (leaving) leaving.inert = true;
  }, [open]);
  useEffect(() => {
    if (open && log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [open, turns, pending]);

  function close() {
    setOpen(false);
  }

  async function send(question: string) {
    const content = question.trim();
    if (!content || activeRequest.current) return;
    const context = getContext();
    if (!scopeId) return;
    if (!context || ("caseId" in context ? context.caseId : context.pageId) !== scopeId) {
      setIssue({ code: "loading", caseId: scopeId });
      return;
    }
    const messages: ChatMessage[] = turns.slice(-Math.floor(MAX_CHAT_MESSAGES / 2)).flatMap(({ question, answer }) => [
      { role: "user", content: question }, { role: "assistant", content: answer.slice(0, MAX_CHAT_MESSAGE_CHARS) },
    ]);
    messages.push({ role: "user", content });
    const request = new AbortController();
    activeRequest.current = request;
    const turn = { id: nextId.current++, caseId: scopeId, title, question: content, answer: "" };
    setIssue(null);
    setDraft("");
    setPending(turn);
    try {
      const answer = await streamReply({ messages, uiContext: context }, request.signal,
        (text) => setPending({ ...turn, answer: text }));
      if (!request.signal.aborted) setTurns((previous) => [...previous, { ...turn, answer }]);
    } catch (error) {
      if (!request.signal.aborted) {
        setIssue({ code: error instanceof Error && error.message === "unconfigured" ? "unconfigured" : "failed", caseId: turn.caseId });
        setDraft((previous) => previous || content);
      }
    } finally {
      if (activeRequest.current === request) activeRequest.current = null;
      if (!request.signal.aborted) setPending(null);
    }
  }

  const error = issue && issue.caseId === scopeId ? issue.code : null;

  return <div className={open ? "case-chat is-open" : "case-chat"}>
    <section className="case-chat-panel" ref={panel} id={id} aria-labelledby={`${id}-title`}
      onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); close(); } }}>
      <header className="case-chat-header">
        <div>
          <h2 id={`${id}-title`}>{t("Datron assistant", "Asistente de Datron")}</h2>
          <p>{area && `${area} · `}{title}</p>
        </div>
        <button type="button" className="case-chat-close" onClick={close} aria-label={t("Close chat", "Cerrar chat")}>×</button>
      </header>
      <div className="case-chat-log" ref={log} aria-label={t("Conversation", "Conversación")} aria-live="polite"
        aria-busy={pending !== null} tabIndex={0}>
        {[...turns, ...(pending ? [pending] : [])].map((turn) => <div key={turn.id} className="case-chat-turn">
          {turn.caseId !== scopeId && <small>{turn.title}</small>}
          <p className="case-chat-user">{turn.question}</p>
          <div className="case-chat-answer">{turn.answer
            ? <Suspense fallback={<p>{turn.answer}</p>}>
                <Markdown skipHtml unwrapDisallowed allowedElements={["p", "strong", "em", "ul", "ol", "li", "code", "br"]}>{turn.answer}</Markdown>
              </Suspense>
            : <p>{t("Reading the evidence…", "Revisando la evidencia…")}</p>}</div>
        </div>)}
      </div>
      <div className="case-chat-actions">
        {questions.length > 0 && <p className="control-help" id={`${id}-suggestions-help`}>{t("Select a suggested question to send it to Datron.", "Selecciona una pregunta sugerida para enviársela a Datron.")}</p>}
        <div className="case-chat-suggestions" role="group" aria-describedby={questions.length > 0 ? `${id}-suggestions-help` : undefined} aria-label={t("Suggested questions", "Preguntas sugeridas")}>
          {questions.map((question) => <button key={question} type="button" disabled={pending !== null}
            onClick={() => void send(question)}>{question}</button>)}
        </div>
        {error && <p className="case-chat-error" role="alert">{error === "loading"
          ? t("Wait for the case to finish loading.", "Espera a que termine de cargar el expediente.")
          : error === "unconfigured" ? t("The chat service is unavailable right now.", "El servicio de chat no está disponible en este momento.")
          : t("The response was interrupted. Try again.", "La respuesta se interrumpió. Inténtalo de nuevo.")}</p>}
        <form className="case-chat-form" onSubmit={(event) => { event.preventDefault(); void send(draft); }}>
          <textarea ref={input} rows={2} maxLength={MAX_CHAT_MESSAGE_CHARS} value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void send(draft);
              }
            }}
            aria-label={selected ? t("Ask about this case", "Pregunta sobre este expediente") : t("Ask about this screen", "Pregunta sobre esta pantalla")}
            placeholder={selected ? t("Ask about this case…", "Pregunta sobre este expediente…") : t("Ask about this screen…", "Pregunta sobre esta pantalla…")} />
          <button type="submit" className="btn primary" disabled={pending !== null || !draft.trim()}>{t("Send", "Enviar")}</button>
        </form>
        <p className="case-chat-note">{t("AI answer (Google Gemini). The numbers and the verdict come from the case file; check them there.",
          "Respuesta de IA (Google Gemini). Las cifras y el veredicto vienen del expediente; verifícalos allí.")}</p>
      </div>
    </section>
    <button type="button" className="case-chat-launcher" ref={launcher} aria-expanded={open}
      aria-controls={id} onClick={() => setOpen(true)}>
      <img className="case-chat-mascot" src={brandAsset("datron-chat-128.png")}
        srcSet={`${brandAsset("datron-chat-128.png")} 128w, ${brandAsset("datron-chat-256.png")} 256w`}
        sizes="(max-height: 500px) 72px, (max-width: 560px) 96px, 128px" width={128} height={128} alt="" decoding="async" />
      <span className="btn primary case-chat-launch">
        {t("Ask Datron", "Pregúntale a Datron")}
      </span>
    </button>
  </div>;
}
