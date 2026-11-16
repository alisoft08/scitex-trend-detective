// AI-assisted: Codex (OpenAI). Shared case navigation and progressive detail.
import { useEffect, useRef, useState } from "react";
import { CaseChat } from "./CaseChat";
import { pageChatContext } from "./page-chat";
import type { ChatContext } from "./chat-contract";
import { HeroMap } from "./HeroMap";
import { Workspace } from "./Workspace";
import { ComparisonDesk } from "./ComparisonDesk";
import { comparisonPair } from "./comparisons";
import { Lab } from "./Lab";
import { Sources } from "./Sources";
import { ImpactBand } from "./ImpactBand";
import { Audiences } from "./Audiences";
import { Atlas } from "./Atlas";
import { AquiferPage } from "./AquiferPage";
import { LanguageSelect, toolsNavigation, useLocale } from "./i18n";
import { useJSON } from "./data";
import type { Manifest, PeriodBounds } from "./types";

const LEVEL = "expert";
const DEFAULT_CASE = "ZIN_tws_grace";   // the desk opens on the clearest confirmed loss, not on Ica
const DEFAULT_PAIR = ["ZIN_tws_grace", "ZW_tws_grace"] as const;   // a loss GRACE sees, and one it cannot
const VIEWS = ["ica", "compare", ...toolsNavigation.map(({ id }) => id)];

function readRoute() {
  const [hash, query] = location.hash.slice(1).split("?");
  const params = new URLSearchParams(query);
  const aliases: Record<string, string> = { evidence: "investigate", methods: "method", about: "sources" };
  const view = /^(mission|explorer)(-[0-5])?$/.test(hash) || hash === "field-lab" ? "investigate"
    : Object.prototype.hasOwnProperty.call(aliases, hash) ? aliases[hash] : hash;
  return { view, params };
}

export default function App() {
  const { data: manifest, error } = useJSON<Manifest>("manifest.json");
  const { t, language } = useLocale();
  const caseChatRef = useRef<(() => ChatContext) | null>(null);
  const [route, setRoute] = useState(readRoute);
  const [lastCase, setLastCase] = useState(DEFAULT_CASE);
  const [lastPair, setLastPair] = useState<readonly [string, string]>(DEFAULT_PAIR);

  const requestedA = manifest?.cases.find((c) => c.id === route.params.get("left"));
  const requestedB = manifest?.cases.find((c) => c.id === route.params.get("right"));
  const [linkedA, linkedB] = manifest && requestedA && requestedB
    ? comparisonPair(manifest.cases, requestedA.variable, requestedA.zone, requestedB.zone) ?? []
    : [];
  const linkedPair = linkedA && linkedB ? [linkedA, linkedB] as const : undefined;
  const adjustedLink = !!requestedA && !!requestedB && (linkedA !== requestedA.id || linkedB !== requestedB.id);

  useEffect(() => {
    const update = () => setRoute(readRoute());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  useEffect(() => {
    const id = route.params.get("case");
    if (manifest?.cases.some((c) => c.id === id) && id) setLastCase(id);
    if (linkedA && linkedB) setLastPair([linkedA, linkedB]);
  }, [route, manifest, linkedA, linkedB]);

  const view = route.view;
  // On an aquifer page, the desk and the compare view open that aquifer, not Ica.
  useEffect(() => {
    if (route.view !== "aquifer" || !manifest?.atlas) return;
    const aq = manifest.atlas.find((x) => x.id === route.params.get("id"));
    if (!aq) return;
    setLastCase(aq.tws.id);
    setLastPair([aq.tws.id, aq.id === "ZW" ? "ZC_tws_grace" : "ZW_tws_grace"]);
  }, [route, manifest]);
  useEffect(() => { window.scrollTo(0, 0); }, [view]);
  const navigate = (target: string) => {
    if (location.hash !== target) {
      history.pushState(null, "", target);
      setRoute(readRoute());
    }
  };
  const caseLink = (id: string, period?: PeriodBounds) => `#investigate?case=${encodeURIComponent(id)}`
    + (period ? `&from=${period.start}&to=${period.end}` : "");
  const pairLink = (pair: readonly [string, string]) => `#compare?left=${encodeURIComponent(pair[0])}&right=${encodeURIComponent(pair[1])}`;
  const selectCase = (id: string, period?: PeriodBounds) => { setLastCase(id); navigate(caseLink(id, period)); };
  const selectPair = (pair: readonly [string, string]) => {
    setLastPair(pair);
    navigate(pairLink(pair));
  };
  const selectedCase = manifest?.cases.find((c) => c.id === route.params.get("case"))
    ?? manifest?.cases.find((c) => c.id === lastCase) ?? manifest?.cases[0];
  const from = route.params.get("from") ?? "";
  const to = route.params.get("to") ?? "";
  const requestedPeriod = selectedCase?.id === route.params.get("case") && /^\d{4}$/.test(from) && /^\d{4}$/.test(to)
    ? { start: Number(from), end: Number(to) } : undefined;
  const pair: readonly [string, string] = linkedPair ?? lastPair;
  const isAquifer = view === "aquifer";
  const isHome = !VIEWS.includes(view) && !isAquifer;
  // On the globe home the white bar stays hidden until the visitor picks an aquifer; other pages always show it.
  const [picked, setPicked] = useState(false);
  const showNav = !isHome || picked;
  const page = !isHome && view !== "investigate" && manifest
    ? pageChatContext(view, route.params, manifest, pair, language) : undefined;

  return (
    <>
      {showNav && <header className="topnav research-nav">
        <div className="wrap wide">
          <a href="#atlas" className="brand" aria-label={t("Oasis Paradox · Back to the globe", "Oasis Paradox · Volver al globo")}>Oasis <span>Paradox</span></a>
          <nav className="nav" aria-label={t("Investigation tools", "Herramientas de investigación")}>
            <a href="#atlas" className="nav-globe">
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="8" cy="8" r="6.5" /><ellipse cx="8" cy="8" rx="2.8" ry="6.5" /><path d="M1.5 8h13" /></svg>
              {t("Globe", "Globo")}
            </a>
            {toolsNavigation.map((v) => (
              <a key={v.id} href={v.id === "investigate" ? caseLink(lastCase) : `#${v.id}`}
                className={view === v.id ? "on" : ""} aria-current={view === v.id ? "page" : undefined}>{t(v.label[0], v.label[1])}</a>
            ))}
          </nav>
          <LanguageSelect />
        </div>
      </header>}
      {error && <p className="wrap error" role="alert">{t("Could not load the atlas data.", "No se pudieron cargar los datos del atlas.")}</p>}
      {!error && !manifest && <p className="wrap loading" role="status">{t("Loading the evidence…", "Cargando la evidencia…")}</p>}
      {manifest && selectedCase && (
        <main className={`research-app lv-${LEVEL} ${showNav ? "" : "no-nav"}`}>
          {isHome && <Atlas m={manifest} onCase={selectCase} showLanguage={!showNav} onPick={() => setPicked(true)} onOpen={(id) => navigate(`#aquifer?id=${id}`)} />}
          {isAquifer && <AquiferPage m={manifest} id={route.params.get("id") ?? ""} onCase={selectCase} onIca={() => navigate("#ica")} onBack={() => navigate("#atlas")} onGo={navigate} />}
          {view === "ica" && <HeroMap m={manifest} primary={{ label: t("View the selected variable’s trend analysis →", "Ver el análisis de tendencia de la variable seleccionada →"), go: () => selectCase(lastCase) }} />}
          {view === "ica" && <ImpactBand m={manifest} onOpen={navigate} />}
          {isHome && <Audiences onOpen={(target) => {
            if (target === "#atlas") document.getElementById("atlas")?.scrollIntoView({ behavior: "smooth", block: "start" });
            else if (target.startsWith("case:")) selectCase(target.slice(5)); else navigate(target);
          }} />}
          {view === "investigate" && <Workspace m={manifest} level={LEVEL} selected={selectedCase} onCase={selectCase}
            caseLink={caseLink} requestedPeriod={requestedPeriod} chatContextRef={caseChatRef} />}
          {view === "method" && <section className="wrap wide research-page">
            <div className="research-heading"><p className="eyebrow">{t("Simulation", "Simulación")}</p><h1>{t("Put the tests on trial", "Pon a prueba los métodos estadísticos")}</h1></div>
            <Lab level={LEVEL} onCase={() => selectCase("ZW_gws")} />
          </section>}
          {view === "sources" && <Sources m={manifest} />}
          {view === "compare" && <ComparisonDesk manifest={manifest} level={LEVEL} pair={pair} onPair={selectPair} onCase={selectCase} href={pairLink(pair)} adjustedLink={adjustedLink} />}
          {!isHome && location.protocol !== "file:" && (
            <CaseChat selected={view === "investigate" ? selectedCase : undefined} page={page}
              getContext={() => view === "investigate" ? caseChatRef.current?.() : page} />
          )}
        </main>
      )}
    </>
  );
}
