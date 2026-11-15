// Globe and visual design from the team's feature branch. The atlas uses its own data file
// so it can share the home page without expanding the Ica case catalogue.
import { useEffect, useMemo, useState } from "react";
import { Globe, type GlobeMarker } from "./Globe";
import { asset, useJSON } from "./data";
import { useLocale } from "./i18n";
import type { Verdict } from "./types";
import "./atlas-hero.css";

interface Aquifer {
  id: string;
  name: string;
  countries: string[];
  lonlat: [number, number];
  tws: { verdict: Verdict; per_decade: number | null };
}

const spanishNames: Record<string, string> = {
  ZW: "Ica–Villacurí", ZC: "Valle Central de California", ZHP: "Grandes Llanuras (Ogallala)",
  ZIN: "Noroeste de India", ZNC: "Llanura del Norte de China", ZAR: "Sistema acuífero árabe (Saq)",
  ZTE: "Cuenca del Tigris y el Éufrates", ZGU: "Sistema acuífero Guaraní",
};
const spanishCountries: Record<string, string> = {
  Peru: "Perú", "United States": "Estados Unidos", Pakistan: "Pakistán", "Saudi Arabia": "Arabia Saudita",
  Jordan: "Jordania", Iraq: "Irak", Iran: "Irán", Syria: "Siria", Turkey: "Turquía", Brazil: "Brasil",
};
const pinSide: Record<string, NonNullable<GlobeMarker["dir"]>> = {
  ZW: "sw", ZC: "nw", ZHP: "ne", ZIN: "se", ZNC: "ne", ZAR: "sw", ZTE: "nw", ZGU: "se",
};
const shortName = (name: string) => name.replace(/ \(([^)]*)\)/, (match, inner: string) => inner.includes(",") ? "" : match).split(",")[0];
const normalized = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const tone = ({ tws }: Aquifer): GlobeMarker["tone"] => tws.per_decade === null || (tws.verdict !== "confirmed" && tws.verdict !== "likely")
  ? "flat" : tws.per_decade < 0 ? "down" : "up";

function heroGlobeSize() {
  return Math.min(1920, Math.round(window.innerWidth * 0.99));
}

function AtlasStage({ aquifers }: { aquifers: Aquifer[] }) {
  const { t, language, signed } = useLocale();
  const [selection, setSelection] = useState(() => ({
    id: aquifers.find((aquifer) => aquifer.id === "ZTE")?.id ?? aquifers[0].id,
  }));
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [fact, setFact] = useState(0);
  const [size, setSize] = useState(heroGlobeSize);

  useEffect(() => {
    const resize = () => setSize(heroGlobeSize());
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setFact((index) => index + 1), 6500);
    return () => window.clearInterval(timer);
  }, []);

  const markers = useMemo(() => aquifers.map((a): GlobeMarker => ({
    id: a.id, lonlat: a.lonlat, label: language === "es" ? spanishNames[a.id] ?? shortName(a.name) : shortName(a.name).replace(/ \(.*\)/, ""),
    tone: tone(a), thumb: asset(`img/aquifers/${a.id}.jpg`), dir: pinSide[a.id] ?? "ne",
    value: a.tws.per_decade === null ? undefined : `${signed(a.tws.per_decade / 10, 2)} ${t("mm/yr", "mm/año")}`,
  })), [aquifers, language, signed, t]);
  const selected = markers.find((marker) => marker.id === selection.id);

  const countries = (a: Aquifer) => a.countries.map((country) => language === "es" ? spanishCountries[country] ?? country : country).join(", ");
  const name = (a: Aquifer) => language === "es" ? spanishNames[a.id] ?? shortName(a.name) : shortName(a.name);
  const search = normalized(query.trim());
  const matches = aquifers.filter((a) => normalized([
    a.name, spanishNames[a.id], ...a.countries, ...a.countries.map((country) => spanishCountries[country] ?? country),
  ].join(" ")).includes(search));
  const current = open ? matches[active] : undefined;
  const falling = aquifers.filter((a) => tone(a) === "down").length;
  const facts = [
    t("In Ica, GRACE cannot isolate the change beneath the farms. Wells measure it locally.", "En Ica, GRACE no puede aislar el cambio bajo los cultivos. Los pozos lo miden localmente."),
    t(`GRACE shows evidence of declining total water storage in ${falling} of ${aquifers.length} aquifer regions.`,
      `GRACE muestra evidencia de disminución del almacenamiento total de agua en ${falling} de ${aquifers.length} regiones de acuíferos.`),
    t("Compare regional trends from NASA GRACE between 2004 and 2024.", "Compara las tendencias regionales de NASA GRACE entre 2004 y 2024."),
  ];

  function pick(id: string) {
    setSelection({ id });
    setOpen(false);
    setQuery("");
    setActive(0);
  }

  return <section className="atlas" id="atlas" aria-labelledby="atlas-title">
    <div className="atlas-stage">
      <Globe markers={markers} selection={selection} onSelect={pick} size={size} autoRotate initialView={{ lon: 17, lat: 34 }}
        label={t("Globe with aquifer markers. Drag or use the arrow keys to rotate it.", "Globo con marcadores de acuíferos. Arrastra o usa las flechas para girarlo.")} />
      <div className="atlas-overlay"><div className="wrap wide">
        <header className="atlas-head">
          <h1 id="atlas-title">{t("Where are aquifers draining?", "¿Dónde están disminuyendo las reservas de los acuíferos?")}</h1>
        </header>
        <div className="atlas-tools"><div className="atlas-search" onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
        }}>
          <label htmlFor="aquifer-search" className="sr-only">{t("Find an aquifer or a country", "Busca un acuífero o país")}</label>
          <input id="aquifer-search" type="search" value={query}
            placeholder={t("Search aquifer or country", "Buscar acuífero o país")} autoComplete="off"
            role="combobox" aria-expanded={open} aria-controls={open ? "aquifer-list" : undefined}
            aria-activedescendant={current ? `aquifer-option-${current.id}` : undefined}
            onFocus={() => setOpen(true)}
            onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(0); }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
              if (event.key === "Enter" && current) { event.preventDefault(); pick(current.id); }
              if ((event.key === "ArrowDown" || event.key === "ArrowUp") && matches.length) {
                event.preventDefault();
                setOpen(true);
                setActive(open ? (active + (event.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length : 0);
              }
            }} />
          {open && <ul id="aquifer-list" className="atlas-list" role="listbox" aria-label={t("Aquifers", "Acuíferos")}>
            {matches.map((a, index) => <li key={a.id} id={`aquifer-option-${a.id}`} role="option" aria-selected={active === index}
              className={`atlas-item ${active === index ? "on" : ""}`} onPointerDown={(event) => event.preventDefault()} onClick={() => pick(a.id)}>
              <span className={`atlas-dot ${tone(a)}`} aria-hidden="true">{tone(a) === "down" ? "↓" : tone(a) === "up" ? "↑" : "?"}</span>
              <span className="atlas-item-text"><strong>{name(a)}</strong><small>{countries(a)}</small></span>
            </li>)}
            {matches.length === 0 && <li className="small atlas-empty" role="option" aria-disabled="true">
              {t(`No aquifer matches “${query}”.`, `Ningún acuífero coincide con «${query}».`)}
            </li>}
          </ul>}
        </div></div>
      </div></div>
      <p className="atlas-blurb" key={fact}>{facts[fact % facts.length]}</p>
      {selected && <div className="atlas-mobile-selection" aria-hidden="true">
        <img src={selected.thumb} alt="" />
        <span className="globe-mini-text"><b>{selected.label}</b><i>{selected.value}</i></span>
      </div>}
      <div className="atlas-stage-foot"><div className="wrap wide"><p className="small atlas-legend">
        <span><span className="lg down" aria-hidden="true">↓</span> {t("falling", "disminuye")}</span>
        <span><span className="lg up" aria-hidden="true">↑</span> {t("rising", "aumenta")}</span>
        <span><span className="lg flat" aria-hidden="true">?</span> {t("not proven", "no concluyente")}</span>
        <span className="atlas-attribution">{t("Base map: MODIS Terra surface reflectance, 2024 (NASA)", "Mapa base: reflectancia de superficie MODIS Terra, 2024 (NASA)")}</span>
      </p></div></div>
      <p className="sr-only" role="status">{t("Selected aquifer", "Acuífero seleccionado")} · {selected?.label} · {selected?.value}</p>
    </div>
  </section>;
}

export function AtlasHero() {
  const { t } = useLocale();
  const { data, error } = useJSON<{ aquifers: Aquifer[] }>("atlas-hero.json");
  if (error || (data && !data.aquifers.length)) return <p className="wrap error" role="alert">{t("Could not load the aquifer atlas.", "No se pudo cargar el atlas de acuíferos.")}</p>;
  if (!data) return <p className="wrap loading" role="status">{t("Loading the aquifer atlas…", "Cargando el atlas de acuíferos…")}</p>;
  return <AtlasStage aquifers={data.aquifers} />;
}
