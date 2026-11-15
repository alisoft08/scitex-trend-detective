// AI-assisted: Codex (OpenAI). Shared case navigation and progressive detail.
import { useEffect, useState } from "react";
import { HeroMap } from "./HeroMap";
import { Workspace } from "./Workspace";
import { ComparisonDesk } from "./ComparisonDesk";
import { Lab } from "./Lab";
import { MapView } from "./MapView";
import { Sources } from "./Sources";
import { ImpactBand } from "./ImpactBand";
import { TwoValleys } from "./TwoValleys";
import { Audiences } from "./Audiences";
import { FieldLab } from "./FieldLab";
import { useLang } from "./i18n";
import { useJSON } from "./data";
import { LEVELS, useLevel, type Level } from "./levels";
import type { Manifest } from "./types";

const DEFAULT_CASE = "Z2_ndvi";
const DEFAULT_PAIR = ["Z2_ndvi", "Z5_ndvi"] as const;
const VIEWS = [
  { id: "field-lab", label: "Field lab" },
  { id: "investigate", label: "Detective desk" },
  { id: "map", label: "Evidence map" },
  { id: "method", label: "Trend lab" },
  { id: "compare", label: "Compare cases" },
  { id: "sources", label: "Sources" },
] as const;

function readRoute() {
  const [hash, query] = location.hash.slice(1).split("?");
  const params = new URLSearchParams(query);
  const aliases: Record<string, string> = { evidence: "investigate", why: "map", where: "map", methods: "method", about: "sources" };
  const view = /^(mission|explorer)(-[0-5])?$/.test(hash) ? "field-lab" : Object.prototype.hasOwnProperty.call(aliases, hash) ? aliases[hash] : hash;
  return { view, params, mission: /^(mission|explorer)(-[0-5])?$/.test(hash) };
}

export default function App() {
  const { data: manifest, error } = useJSON<Manifest>("manifest.json");
  const [level, setLevel] = useLevel();
  const [lang, setLang] = useLang();
  const [route, setRoute] = useState(readRoute);
  const [lastCase, setLastCase] = useState(DEFAULT_CASE);
  const [lastPair, setLastPair] = useState<readonly [string, string]>(DEFAULT_PAIR);

  useEffect(() => {
    const update = () => setRoute(readRoute());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  useEffect(() => {
    if (route.view === "compare" && level === "explorer") setLevel("analyst");
  }, [route]);

  useEffect(() => {
    const id = route.params.get("case");
    if (manifest?.cases.some((c) => c.id === id) && id) setLastCase(id);
    const a = route.params.get("left"), b = route.params.get("right");
    if (a && b && a !== b && manifest?.cases.some((c) => c.id === a) && manifest.cases.some((c) => c.id === b)) setLastPair([a, b]);
  }, [route, manifest]);

  const view = route.view === "compare" && level === "explorer" ? "investigate" : route.view;
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
  const changeLevel = (next: Level) => {
    setLevel(next);
    if (route.view === "compare" && next === "explorer") navigate(caseLink(lastCase));
  };

  const selectedCase = manifest?.cases.find((c) => c.id === route.params.get("case"))
    ?? manifest?.cases.find((c) => c.id === lastCase) ?? manifest?.cases[0];
  const a = route.params.get("left"), b = route.params.get("right");
  const pair: readonly [string, string] = a && b && a !== b && manifest?.cases.some((c) => c.id === a) && manifest.cases.some((c) => c.id === b)
    ? [a, b] : lastPair;
  const visible = VIEWS.filter((v) => (v.id !== "compare" || level !== "explorer") && (v.id !== "field-lab" || level === "explorer"));
  const isHome = !VIEWS.some((v) => v.id === view);

  return (
    <>
      <header className="topnav research-nav">
        <div className="wrap wide">
          <a href="#case" className="brand" aria-label="Oasis Paradox home">Oasis <span>Paradox</span></a>
          <nav className="nav" aria-label="Investigation tools">
            {visible.map((v) => (
              <a key={v.id} href={v.id === "investigate" ? caseLink(lastCase) : v.id === "compare" ? pairLink(lastPair) : `#${v.id}`}
                className={view === v.id ? "on" : ""} aria-current={view === v.id ? "page" : undefined}>{v.label}</a>
            ))}
          </nav>
          <div className="level-switch" role="group" aria-label="Reading level">
            {LEVELS.map((l) => (
              <button key={l.id} id={`nav-level-${l.id}`} aria-pressed={level === l.id} title={l.promise} onClick={() => changeLevel(l.id)}>{l.name}</button>
            ))}
          </div>
        </div>
      </header>
      {error && <p className="wrap error" role="alert">{error}</p>}
      {!error && !manifest && <p className="wrap loading" role="status">Loading the evidence…</p>}
      {manifest && selectedCase && (
        <main className={`research-app lv-${level}`}>
          {isHome && <HeroMap m={manifest} primary={level === "explorer"
            ? { label: "Start the field lab →", go: () => navigate("#field-lab") }
            : { label: "Open the detective desk →", go: () => selectCase(lastCase) }} onMap={() => navigate("#map")} />}
          {isHome && <ImpactBand m={manifest} onOpen={navigate} />}
          {isHome && <TwoValleys m={manifest} level={level} onCase={selectCase} onCompare={() => selectPair(["ZW_tws_grace", "ZC_tws_grace"])} />}
          {isHome && <Audiences onStart={(next) => { setLevel(next); if (next === "explorer") navigate("#field-lab"); else selectCase(lastCase); }} />}
          {view === "field-lab" && <FieldLab m={manifest} lang={lang} onLang={setLang}
            startAt={Number(/-(\d)$/.exec(location.hash.split("?")[0])?.[1] ?? 0)}
            onFullTool={() => selectCase(lastCase)} onAnalyst={() => { setLevel("analyst"); selectCase(lastCase); }} />}
          {view === "investigate" && <Workspace m={manifest} level={level} selected={selectedCase} onCase={selectCase}
            caseLink={caseLink} startWithLead={route.mission} onLead={followLead} />}
          {view === "map" && <MapView m={manifest} level={level} onCase={selectCase} />}
          {view === "method" && <section className="wrap wide research-page">
            <div className="research-heading"><p className="eyebrow">Simulation</p><h1>Put the tests on trial</h1></div>
            <Lab level={level} onCase={() => selectCase("ZW_gws")} />
          </section>}
          {view === "sources" && <Sources m={manifest} />}
          {view === "compare" && <ComparisonDesk manifest={manifest} level={level} pair={pair} onPair={selectPair} onCase={selectCase} href={pairLink(pair)} />}
        </main>
      )}
    </>
  );
}
