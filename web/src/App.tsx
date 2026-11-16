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
import { MapView } from "./MapView";
import { Sources } from "./Sources";
import { ImpactBand } from "./ImpactBand";
import { Audiences } from "./Audiences";
import { Atlas } from "./Atlas";
import { AquiferPage } from "./AquiferPage";
import { useLocale, type Language } from "./i18n";
import { useJSON } from "./data";
import type { Manifest } from "./types";

const LEVEL = "expert";
const DEFAULT_CASE = "ZW_tws_grace";
const DEFAULT_PAIR = [DEFAULT_CASE, "ZIN_tws_grace"] as const;
const VIEWS = [
  { id: "ica", label: ["Ica deep dive", "Análisis de Ica"] },
  { id: "investigate", label: ["Detective desk", "Mesa de investigación"] },
  { id: "map", label: ["Ica evidence map", "Mapa de evidencias de Ica"] },
  { id: "method", label: ["Trend lab", "Laboratorio de tendencias"] },
  { id: "compare", label: ["Compare cases", "Comparar casos"] },
  { id: "sources", label: ["Sources", "Fuentes"] },
] as const;

function readRoute() {
  const [hash, query] = location.hash.slice(1).split("?");
  const params = new URLSearchParams(query);
  const aliases: Record<string, string> = { evidence: "investigate", why: "map", where: "map", methods: "method", about: "sources" };
  const view = /^(mission|explorer)(-[0-5])?$/.test(hash) || hash === "field-lab" ? "investigate"
    : Object.prototype.hasOwnProperty.call(aliases, hash) ? aliases[hash] : hash;
  return { view, params };
}

export default function App() {
  const { data: manifest, error } = useJSON<Manifest>("manifest.json");
  const { t, language, setLanguage } = useLocale();
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
  const caseLink = (id: string) => `#investigate?case=${encodeURIComponent(id)}`;
  const pairLink = (pair: readonly [string, string]) => `#compare?left=${encodeURIComponent(pair[0])}&right=${encodeURIComponent(pair[1])}`;
  const selectCase = (id: string) => { setLastCase(id); navigate(caseLink(id)); };
  const followLead = (id: string, tool?: "map" | "lab") => {
    setLastCase(id);
    navigate(tool === "map" ? "#map" : tool === "lab" ? "#method" : caseLink(id));
  };
  const selectPair = (pair: readonly [string, string]) => {
    setLastPair(pair);
    navigate(pairLink(pair));
  };
  const selectedCase = manifest?.cases.find((c) => c.id === route.params.get("case"))
    ?? manifest?.cases.find((c) => c.id === lastCase) ?? manifest?.cases[0];
  const pair = linkedPair ?? lastPair;
  const visible = VIEWS.filter((v) => v.id !== "map" && v.id !== "ica");
  const isAquifer = view === "aquifer";
  const isHome = !VIEWS.some((v) => v.id === view) && !isAquifer;
  // On the globe home the white bar stays hidden until the visitor picks an aquifer; other pages always show it.
  const [picked, setPicked] = useState(false);
  const showNav = !isHome || picked;
  const page = !isHome && view !== "investigate" && manifest
    ? pageChatContext(view, route.params, manifest, pair, language) : undefined;

  return (
    <>
      <header className={`topnav research-nav ${showNav ? "" : "nav-hidden"}`} aria-hidden={!showNav || undefined}>
        <div className="wrap wide">
          <a href="#atlas" className="brand" tabIndex={showNav ? undefined : -1} aria-label={t("Oasis Paradox · Back to the global atlas", "Oasis Paradox · Volver al atlas global")}>Oasis <span>Paradox</span></a>
          <nav className="nav" aria-label={t("Investigation tools", "Herramientas de investigación")}>
            {visible.map((v) => (
              <a key={v.id} href={v.id === "investigate" ? caseLink(lastCase) : v.id === "compare" ? pairLink(lastPair) : `#${v.id}`}
                tabIndex={showNav ? undefined : -1} className={view === v.id ? "on" : ""} aria-current={view === v.id ? "page" : undefined}>{t(v.label[0], v.label[1])}</a>
            ))}
          </nav>
          <label className="language-switch">
            <span className="sr-only">{t("Language", "Idioma")}</span>
            <select value={language} tabIndex={showNav ? undefined : -1} onChange={(event) => setLanguage(event.target.value as Language)}>
              <option value="en" lang="en">English</option>
              <option value="es" lang="es">Español</option>
            </select>
          </label>
        </div>
      </header>
      {error && <p className="wrap error" role="alert">{error}</p>}
      {!error && !manifest && <p className="wrap loading" role="status">Loading the evidence…</p>}
      {manifest && selectedCase && (
        <main className={`research-app lv-${LEVEL} ${showNav ? "" : "no-nav"}`}>
          {isHome && <Atlas m={manifest} showLanguage={!showNav} onIca={() => navigate("#ica")} onPick={() => setPicked(true)} onOpen={(id) => navigate(`#aquifer?id=${id}`)} />}
          {isAquifer && <AquiferPage m={manifest} id={route.params.get("id") ?? ""} onCase={selectCase} onIca={() => navigate("#ica")} onBack={() => navigate("#atlas")} onGo={navigate} />}
          {view === "ica" && <HeroMap m={manifest} primary={{ label: t("View the selected variable’s trend analysis →", "Ver análisis de tendencia de la variable seleccionada →"), go: () => selectCase(lastCase) }} onMap={() => navigate("#map")} />}
          {view === "ica" && <ImpactBand m={manifest} onOpen={navigate} />}
          {isHome && <Audiences onCompare={() => selectPair(DEFAULT_PAIR)} onLab={() => navigate("#method")} />}
          {view === "investigate" && <Workspace m={manifest} level={LEVEL} selected={selectedCase} onCase={selectCase}
            caseLink={caseLink} onLead={followLead} chatContextRef={caseChatRef} />}
          {view === "map" && <MapView m={manifest} level={LEVEL} onCase={selectCase} />}
          {view === "method" && <section className="wrap wide research-page">
            <div className="research-heading"><p className="eyebrow">{t("Simulation", "Simulación")}</p><h1>{t("Trend lab", "Laboratorio de tendencias")}</h1></div>
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
