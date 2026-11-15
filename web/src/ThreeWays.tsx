// AI-assisted: Claude (Anthropic). The problem the tool solves, in three real examples from this atlas: a satellite trend can
// fool you through memory, scale or a single witness. Every number is read from the engine's output; nothing is computed here
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
    <h3 id="three-ways-title">Three ways a satellite trend can fool you</h3>
    <p className="three-ways-lede">NASA data make it easy to claim a trend in minutes, and easy to get it wrong. Oasis Paradox checks all
      three before it calls a trend real. These examples come from the atlas below.</p>
    <div className="three-ways-grid">
      <article className="three-way">
        <span className="three-way-no">1 · Memory</span>
        <strong>The model says Ica's aquifer is rising. The wells say it is falling.</strong>
        <p>NASA's groundwater model (GLDAS) over Ica trends upward, and the classic Mann-Kendall test calls it significant
          {pText && <> (p = {pText})</>}. Yet {wells}% of the monitored wells are falling. Monthly data carry memory, and the classic
          test mistakes it for a trend. Our engine says: inconclusive. Across the atlas the classic test raised {alarms} such alarms
          in GLDAS groundwater; the engine finds a confirmed or likely trend in {engine.length} of {classic.length} aquifers.</p>
        <button className="text-button" onClick={() => onCase("ZW_gws")}>Open that false alarm</button>
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
        <span className="three-way-no">3 · A single witness</span>
        <strong>One variable tells half the story.</strong>
        <p>{both.length > 0
          ? <>In {both.map((a) => shortName(a.name)).join(", ").replace(/, ([^,]*)$/, " and $1")}, GRACE confirms a water loss while
            the cropland gets greener and uses more water (MODIS). Read alone, greening looks like good news. Read together, and with
            no proven fall in rain, the witnesses point to irrigation.</>
          : <>Each aquifer page puts six NASA witnesses side by side, so a change in one can be checked against the others.</>}</p>
        {both[0] && <button className="text-button" onClick={() => onOpen(both[0].id)}>See the witnesses for {shortName(both[0].name)}</button>}
      </article>
    </div>
  </section>;
}
