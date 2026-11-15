// AI-assisted: Codex (OpenAI). Shared case navigation and progressive detail.
import { useEffect, useState } from "react";
import { useLocale, type Language } from "./i18n";
import { AtlasHero } from "./AtlasHero";
import { Workspace } from "./Workspace";
import { ComparisonDesk } from "./ComparisonDesk";
import { Lab } from "./Lab";
import { MapView } from "./MapView";
import { useJSON } from "./data";
import { LEVELS, useLevel, type Level } from "./levels";
import type { Manifest } from "./types";

const DEFAULT_CASE = "Z2_ndvi";
const DEFAULT_PAIR = ["Z2_ndvi", "Z5_ndvi"] as const;
const VIEWS = [
  { id: "investigate", label: ["Detective desk", "Mesa de investigación"] },
  { id: "map", label: ["Evidence map", "Mapa de evidencias"] },
  { id: "method", label: ["Trend lab", "Laboratorio de tendencias"] },
  { id: "compare", label: ["Compare cases", "Comparar casos"] },
] as const;

function readRoute() {
  const [hash, query] = location.hash.slice(1).split("?");
  const params = new URLSearchParams(query);
  const aliases: Record<string, string> = { evidence: "investigate", why: "map", where: "map", methods: "method", sources: "investigate" };
  const view = /^(mission|explorer)(-[0-5])?$/.test(hash) ? "investigate" : Object.prototype.hasOwnProperty.call(aliases, hash) ? aliases[hash] : hash;
  return { view, params, mission: /^(mission|explorer)(-[0-5])?$/.test(hash) };
}

export default function App() {
  const { t, language, setLanguage } = useLocale();
  const { data: manifest, error } = useJSON<Manifest>("manifest.json");
  const [level, setLevel] = useLevel();
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
  const visible = VIEWS.filter((v) => v.id !== "compare" || level !== "explorer");
  const isHome = !VIEWS.some((v) => v.id === view);

  return (
    <>
      <header className="topnav research-nav">
        <div className="wrap wide">
          <a href="#case" className="brand" aria-label={t("Oasis Paradox home", "Inicio de Oasis Paradox")}>Oasis <span>Paradox</span></a>
          <nav className="nav" aria-label={t("Investigation tools", "Herramientas de investigación")}>
            {visible.map((v) => (
              <a key={v.id} href={v.id === "investigate" ? caseLink(lastCase) : v.id === "compare" ? pairLink(lastPair) : `#${v.id}`}
                className={view === v.id ? "on" : ""} aria-current={view === v.id ? "page" : undefined}>{t(v.label[0], v.label[1])}</a>
            ))}
          </nav>
          <label className="language-switch">
            <span className="sr-only">{t("Language", "Idioma")}</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
              <option value="en" lang="en">English</option>
              <option value="es" lang="es">Español</option>
            </select>
          </label>
        </div>
      </header>
      {error && <p className="wrap error" role="alert">{t("Could not load the case catalogue.", "No se pudo cargar el catálogo de casos.")}</p>}
      {!error && !manifest && <p className="wrap loading" role="status">{t("Loading the evidence…", "Cargando la evidencia…")}</p>}
      {manifest && selectedCase && (
        <main className={`research-app lv-${level}`}>
          {isHome && <AtlasHero />}
          {!isHome && (
            <div className="wrap wide tool-levels">
              <div className="level-switch" role="group" aria-label={t("Reading level", "Nivel de lectura")}>
                {LEVELS.map((l) => (
                  <button key={l.id} id={`tool-level-${l.id}`} aria-pressed={level === l.id} title={t(...l.promise)} onClick={() => changeLevel(l.id)}>{t(...l.name)}</button>
                ))}
              </div>
            </div>
          )}
          {view === "investigate" && <Workspace m={manifest} level={level} selected={selectedCase} onCase={selectCase}
            caseLink={caseLink} startWithLead={route.mission} onLead={followLead} />}
          {view === "map" && <MapView m={manifest} level={level} onCase={selectCase} />}
          {view === "method" && <section className="wrap wide research-page">
            <div className="research-heading"><p className="eyebrow">{t("Simulation", "Simulación")}</p><h1>{t("Put the tests on trial", "Pon a prueba los métodos")}</h1></div>
            <Lab level={level} onCase={() => selectCase("ZW_gws")} />
          </section>}
          {view === "compare" && <ComparisonDesk manifest={manifest} level={level} pair={pair} onPair={selectPair} onCase={selectCase} href={pairLink(pair)} />}
        </main>
      )}
    </>
  );
}
