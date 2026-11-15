// AI-assisted: Claude (Anthropic). Same satellite, same engine, two irrigated valleys: GRACE's verdicts point in opposite
// directions. Every number is read from the engine's case files; nothing is computed here.
import { useJSON } from "./data";
import { CasePlot } from "./CaseFile";
import { EVIDENCE_TEXT } from "./evidence";
import { signed } from "./format";
import type { Level } from "./levels";
import type { CaseFile, Manifest } from "./types";

const ICA = "ZW_tws_grace", CV = "ZC_tws_grace";

function Valley({ path, place, note, level }: { path: string; place: string; note: string; level: Level }) {
  const { data: cf } = useJSON<CaseFile>(path);
  if (!cf) return <article className="valley panel"><p className="loading">Loading {place}…</p></article>;
  const up = (cf.trend.sen_per_decade ?? 0) > 0;
  return <article className="valley panel">
    <p className="eyebrow">{place}</p>
    <div className="valley-result">
      <strong className="num">{signed(cf.trend.sen_per_decade, 3)} mm<span>/decade</span></strong>
      <span className={`pill ${cf.verdict}`}>{EVIDENCE_TEXT[cf.verdict]} · {up ? "rising" : "falling"}</span>
    </div>
    <CasePlot cf={cf} simple={level === "explorer"} />
    <p className="small">{note}</p>
  </article>;
}

export function TwoValleys({ m, level, onCase, onCompare }: {
  m: Manifest; level: Level; onCase: (id: string) => void; onCompare: () => void;
}) {
  if (!m.cases.some((c) => c.id === CV)) return null;
  const ica = m.cases.find((c) => c.id === ICA), cv = m.cases.find((c) => c.id === CV);
  const footprint = Math.round(m.impact.grace_footprint_km2 / 1000);
  return <section className="two-valleys" aria-labelledby="two-valleys-title">
    <div className="wrap wide">
      <header className="two-valleys-head">
        <p className="eyebrow">Same satellite · same engine · opposite verdicts</p>
        <h2 id="two-valleys-title">Two irrigated valleys seen by GRACE</h2>
        <p>{level === "explorer"
          ? "Both valleys pump groundwater to grow crops. From space, California's water is clearly going down, while Ica's seems to go up. Why? Ica's farms are tiny next to the area one GRACE measurement covers, so rain and snow in the Andes hide the loss that wells measure on the ground."
          : `Both valleys irrigate with groundwater. In California's Central Valley the loss is large and spread over several GRACE mascons, so the satellites resolve it. In Ica, ${footprint} thousand km² of footprint average the overdraft with a wetter Andean signal, so the net trend is positive while ${Math.round(m.wells.share_falling * 100)}% of the ${m.wells.n} JUASVI wells fall. A trend detective asks two questions: is the trend significant, and at what scale can this instrument see it?`}</p>
      </header>
      <div className="valley-grid">
        <Valley path={ica?.path ?? `cases/${ICA}.json`} place="Ica, Peru · GRACE total water" level={level}
          note="Rising: the Andean wet signal outweighs Ica's pumping inside one footprint. Wells say the aquifer is falling." />
        <Valley path={cv?.path ?? `cases/${CV}.json`} place="Central Valley, California · GRACE total water" level={level}
          note="Falling: drought and pumping across the valley, the loss first measured from space by Famiglietti et al. (2011)." />
      </div>
      <div className="link-row">
        <button className="text-button" onClick={() => onCase(CV)}>Open the California case →</button>
        {level !== "explorer" && <button className="text-button" onClick={onCompare}>Compare the two side by side →</button>}
      </div>
    </div>
  </section>;
}
