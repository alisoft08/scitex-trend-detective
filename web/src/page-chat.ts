// AI-assisted: Codex (OpenAI). A compact snapshot of the active research screen.
import { CHAT_PAGES, type ChatPage, type PageChatContext } from "./chat-contract";
import { atlasName } from "./atlas-locale";
import { DATASETS } from "./Sources";
import { summaryRecords } from "./resume-data";
import type { Translation } from "./i18n";
import type { AtlasEntry, AtlasWitness, CaseRef, Manifest } from "./types";

const TITLES: Record<ChatPage, Translation> = {
  resume: ["Area overview", "Resumen de la zona"],
  aquifer: ["Aquifer", "Acuífero"],
  ica: ["Ica deep dive", "Análisis de Ica"],
  method: ["Test the tests", "Laboratorio de tendencias"],
  compare: ["Compare cases", "Comparar casos"],
  sources: ["Sources", "Fuentes"],
};

const QUESTIONS: Record<ChatPage, Translation[]> = {
  resume: [
    ["What are the main changes in this area?", "¿Cuáles son los principales cambios en esta zona?"],
    ["Do these four records cover the same area?", "¿Estas cuatro series cubren la misma área?"],
    ["How should I interpret a trend to evaluate?", "¿Cómo interpreto una tendencia a evaluar?"],
  ],
  aquifer: [
    ["What do the NASA witnesses measure?", "¿Qué miden los testigos de NASA?"],
    ["How do I interpret the GRACE result?", "¿Cómo interpreto el resultado de GRACE?"],
    ["How do I read the lens?", "¿Cómo leo la lupa?"],
  ],
  ica: [
    ["How do I read the satellite lens?", "¿Cómo leo la lupa satelital?"],
    ["Why can wells and GRACE disagree?", "¿Por qué pueden discrepar los pozos y GRACE?"],
    ["How are GRACE and GLDAS different in Ica?", "¿En qué se diferencian GRACE y GLDAS en Ica?"],
  ],
  method: [
    ["What does the simulation test?", "¿Qué evalúa la simulación?"],
    ["Why can correlated months cause false alarms?", "¿Por qué los meses correlacionados causan falsas alarmas?"],
    ["How does a block bootstrap work here?", "¿Cómo funciona aquí el bootstrap por bloques?"],
  ],
  compare: [
    ["How do I compare these results?", "¿Cómo comparo estos resultados?"],
    ["Can I compare these slopes directly?", "¿Puedo comparar directamente estas pendientes?"],
    ["What should I check in the intervals?", "¿Qué debo observar en los intervalos?"],
  ],
  sources: [
    ["Which sources measure changes in water storage?", "¿Qué fuentes miden cambios en el almacenamiento de agua?"],
    ["What is the difference between observed and modeled data?", "¿En qué se diferencian los datos observados y modelados?"],
    ["Where can I find the product references?", "¿Dónde encuentro las referencias de los productos?"],
  ],
};

export const pageQuestions = (view: ChatPage) => QUESTIONS[view];

function isChatPage(view: string): view is ChatPage {
  return CHAT_PAGES.some((page) => page === view);
}

function trend(value: number | null, units: string, verdict: string) {
  return value === null ? verdict : `${value} ${units}/decade; ${verdict}`;
}

function caseFact(c: CaseRef) {
  return { label: `${c.zone_name} · ${c.label}`, value: trend(c.sen_per_decade, c.units, c.verdict) };
}

function aquiferFacts(a: AtlasEntry): PageChatContext["facts"] {
  const ica = a.id === "ZW";
  const witnesses: [string, AtlasWitness | undefined][] = [
    [ica ? "Regional total water storage (GRACE)" : "Total water storage (GRACE)", a.tws],
    ["Groundwater storage (GLDAS)", a.gws], ["Rainfall", a.rain],
    ["Greenness", a.ndvi], ["Evapotranspiration", a.et], ["Air temperature", a.t2m], ["Surface temperature", a.lst],
    ["Cropland–reference greenness gap", a.ndvi_gap], ["Cropland–reference surface temperature gap", a.lst_gap],
  ];
  const facts = witnesses.flatMap(([label, w]) => w ? [{ label, value: trend(w.per_decade, w.units, w.verdict) }] : []);
  if (!ica && a.impact?.grace_km3_per_yr != null) facts.push({ label: "GRACE regional total water", value: `${a.impact.grace_km3_per_yr} km³/year` });
  if (a.impact?.crop_water_mm3_2020_2024 != null) facts.push({
    label: "Cropland water use, 2020–2024", value: `${a.impact.crop_water_mm3_2020_2024} million m³/year (MODIS ET)`,
  });
  return facts;
}

export function pageChatContext(view: string, params: URLSearchParams, manifest: Manifest,
  pair: readonly [string, string], language: "en" | "es"): PageChatContext | undefined {
  if (!isChatPage(view)) return undefined;
  const title = TITLES[view][language === "en" ? 0 : 1];
  const page: PageChatContext = { view, pageId: view, title, facts: [], language };
  switch (view) {
    case "resume": {
      const selected = manifest.cases.find((record) => record.id === params.get("case"));
      if (!selected) return page;
      return { ...page, pageId: `resume:${selected.zone}`, title: `${title} · ${selected.zone_name}`,
        facts: [{ label: "Period", value: manifest.period }, ...summaryRecords(manifest, selected).flatMap((record) => record ? [caseFact(record)] : []),
          { label: "Interpretation", value: "GRACE: regional total water. GLDAS: modeled groundwater, assimilates GRACE. Records may cover distinct study areas; use each area label." }] };
    }
    case "aquifer":
    case "ica": {
      const id = view === "ica" ? "ZW" : params.get("id");
      const a = manifest.atlas?.find((entry) => entry.id === id);
      if (!a) return page;
      return { ...page, pageId: `${view}:${a.id}`, title: view === "ica" ? title : atlasName(language, a), facts: aquiferFacts(a) };
    }
    case "compare":
      return { ...page, pageId: `compare:${pair.join(":")}`, facts: pair.flatMap((id) => {
        const c = manifest.cases.find((item) => item.id === id);
        return c ? [caseFact(c)] : [];
      }) };
    case "sources":
      return { ...page, facts: DATASETS.slice(0, 7).map(([label, agency, kind, , url]) => ({
        label, value: `${agency} · ${kind} · ${url}`,
      })) };
    default:
      return page;
  }
}
