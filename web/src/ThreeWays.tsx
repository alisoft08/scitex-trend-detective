// AI-assisted: Claude (Anthropic). The problem the tool solves, in three real examples from this atlas: a conclusion from NASA
// data holds up only if it survives three checks, on the source, the scale and the method. Every number is read from the engine's output; nothing is computed here
// beyond counting and unit conversion.
import { useJSON } from "./data";
import { fmt } from "./format";
import type { AtlasEntry, CaseFile, Manifest } from "./types";

const proven = (v?: string) => v === "confirmed" || v === "likely";
const shortName = (name: string) => name.replace(/ \(.*\)/, "").split(",")[0];

export function ThreeWays({ m, onCase, onOpen }: { m: Manifest; onCase: (id: string) => void; onOpen: (id: string) => void }) {
  const atlas = m.atlas ?? [];
  const gwsRef = m.cases.find((c) => c.id === "ZW_gws");
  const { data: gws } = useJSON<CaseFile>(gwsRef?.path ?? null);
  const ica = atlas.find((a) => a.id === "ZW");
  const wells = Math.round(m.wells.share_falling * 100);
  const classic = atlas.filter((a) => a.gws?.per_decade !== null);
  const engine = classic.filter((a) => proven(a.gws?.verdict));
  const alarms = classic.filter((a) => a.gws?.classic_false_alarm).length;
  const both: AtlasEntry[] = atlas.filter((a) => proven(a.tws.verdict) && (a.tws.per_decade ?? 0) < 0
    && proven(a.ndvi?.verdict) && (a.ndvi?.per_decade ?? 0) > 0 && proven(a.et?.verdict) && (a.et?.per_decade ?? 0) > 0
    && !(proven(a.rain.verdict) && (a.rain.per_decade ?? 0) < 0));
  const pClassic = gws?.trend.p_mk_classic;
  const pText = pClassic == null ? null : pClassic < 0.0001 ? fmt(pClassic, 1) : fmt(pClassic, 2);

  return <section className="three-ways" aria-labelledby="three-ways-title">
    <h3 id="three-ways-title">Source, scale and method: three checks before you trust a trend</h3>
    <p className="three-ways-lede">NASA data make it easy to claim a trend in minutes, and easy to get it wrong. Oasis Paradox checks the
      source, the scale and the method before it calls a trend real. These examples come from the atlas below.</p>
    <div className="three-ways-grid">
      <article className="three-way">
        <span className="three-way-no">1 · Source</span>
        <strong>Which source, and is it independent?</strong>
        <p>{both.length > 0
          ? <>In {both.map((a) => shortName(a.name)).join(", ").replace(/, ([^,]*)$/, " and $1")}, GRACE confirms a water loss while
            MODIS shows cropland getting greener and using more water, with no proven fall in rain. Independent witnesses that agree
            point to irrigation. GLDAS does not count as one more: it is a model nudged by GRACE, so when both fall that is one line
            of evidence, not two.</>
          : <>Each aquifer page puts six NASA witnesses side by side, and says which ones are models fed by the others.</>}</p>
        {both[0] && <button className="text-button" onClick={() => onOpen(both[0].id)}>See the witnesses for {shortName(both[0].name)}</button>}
      </article>
      <article className="three-way">
        <span className="three-way-no">2 · Scale</span>
        <strong>A real trend, from the wrong place.</strong>
        <p>GRACE confirms that stored water around Ica is rising{ica?.tws.per_decade != null && <>, {ica.tws.per_decade > 0 ? "+" : "−"}{fmt(Math.abs(ica.tws.per_decade / 10), 2)} mm per year</>}.
          The test is right, but Ica covers {ica ? fmt(ica.grace_footprints * 100, 2) : "a few"}% of one GRACE footprint, so the
          number mostly describes the Andes around it. The chart below shows which aquifers a satellite can see.</p>
        <button className="text-button" onClick={() => onCase("ZW_tws_grace")}>Open the GRACE case for Ica</button>
      </article>
      <article className="three-way">
        <span className="three-way-no">3 · Method</span>
        <strong>The model says Ica's aquifer is rising. The wells say it is falling.</strong>
        <p>NASA's groundwater model (GLDAS) over Ica trends upward, and the classic Mann-Kendall test calls it significant
          {pText && <> (p = {pText})</>}. Yet {wells}% of {m.wells.n} monitored wells fell between their first and last readings
          ({m.wells.period.replace(/ \(.*\)/, "").replace("-", "–")}; two readings per well, so no trend test). Monthly data carry memory, and the classic
          test mistakes it for a trend. Our engine says: inconclusive. Across the atlas the classic test raised {alarms} such alarms
          in GLDAS groundwater; the engine finds a confirmed or likely trend in {engine.length} of {classic.length} aquifers.</p>
        <button className="text-button" onClick={() => onCase("ZW_gws")}>Open that false alarm</button>
      </article>
    </div>
  </section>;
}
