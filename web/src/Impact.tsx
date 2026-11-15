// AI-assisted: Claude (Anthropic). Impact at a glance (hero tiles) and the scale argument with its equations.
// Every number comes from manifest.impact, computed in Python (scripts/build_web_data.py).
import { Tex } from "./Tex";
import { pct } from "./format";
import type { Impact, Manifest, Simulation } from "./types";

const int = (x: number) => Math.round(x).toLocaleString("en-US");

export function ImpactTiles({ m, sim }: { m: Manifest; sim: Simulation | null }) {
  const im = m.impact;
  const fp = sim?.false_positive.find((f) => f.phi === 0.9);
  const zi = m.wells.by_zone.find((z) => z.juasvi_zone === "I")!;
  return (
    <div className="impact-tiles">
      <article className="tile lead">
        <span className="tile-k">The stake</span>
        <span className="tile-v num">{int(im.olympic_pools_per_yr)}</span>
        <span className="tile-u">Olympic pools a year</span>
        <span className="tile-t">Groundwater consumed by crops beyond what the Ica aquifer recharges (about {int(im.overdraft_m3_per_yr / 1e6)} million m³).</span>
        <span className="tile-f">Salmoral et al., 2020 · estimate</span>
      </article>
      <article className="tile">
        <span className="tile-k">In the field</span>
        <span className="tile-v num">{im.zone_i_m_per_decade.toFixed(1).replace("-", "−")} m</span>
        <span className="tile-u">per decade</span>
        <span className="tile-t">Water-table fall in the north of the valley.</span>
        <span className="tile-f">{zi.n} wells · JUASVI 2010–2025</span>
      </article>
      <article className="tile">
        <span className="tile-k">From space</span>
        <span className="tile-v num">{im.footprint_to_irrigated}×</span>
        <span className="tile-u">bigger than the farms</span>
        <span className="tile-t">One GRACE measurement averages {int(im.grace_footprint_km2)} km²; the irrigated area is about {int(im.irrigated_area_km2)} km².</span>
        <span className="tile-f">NASA/JPL GRACE mascons</span>
      </article>
      <article className="tile">
        <span className="tile-k">Honest statistics</span>
        <span className="tile-v num">{fp ? pct(fp.mk_classic) : "…"}<span className="arrow">→</span>{fp ? pct(fp.consensus) : "…"}</span>
        <span className="tile-u">false alarms</span>
        <span className="tile-t">How often a classic test, then our engine, “finds” a trend in data with no trend.</span>
        <span className="tile-f">Monte Carlo, groundwater-like memory <Tex>{"\\phi = 0.9"}</Tex></span>
      </article>
    </div>
  );
}

/** Area-true squares: one GRACE footprint, one GLDAS cell, and the irrigated area of Ica. */
function Footprints({ im }: { im: Impact }) {
  const S = 300;
  const side = (km2: number) => Math.sqrt(km2 / im.grace_footprint_km2) * S;
  const g = side(im.gldas_cell_km2), a = side(im.irrigated_area_km2);
  const kmSide = Math.sqrt(im.grace_footprint_km2);
  return (
    <figure className="footprints">
      <svg viewBox={`0 0 ${S + 2} ${S + 2}`} role="img"
        aria-label={`Area-true comparison: GRACE footprint ${int(im.grace_footprint_km2)} square km, GLDAS cell ${int(im.gldas_cell_km2)}, irrigated area ${int(im.irrigated_area_km2)}`}>
        <rect className="fp-grace" x="1" y="1" width={S} height={S} rx="4" />
        <rect className="fp-gldas" x="24" y={S - 30 - g} width={g} height={g} />
        <rect className="fp-farm" x={24 + g + 8} y={S - 30 - a} width={a} height={a} />
        <text x="14" y="28" className="fp-l strong">One GRACE measurement</text>
        <text x="14" y="46" className="fp-l">{int(im.grace_footprint_km2)} km² · about {Math.round(kmSide)} km a side</text>
        <text x={24 + g + a + 22} y={S - 30 - g / 2 - 4} className="fp-l strong">Irrigated Ica (filled) and</text>
        <text x={24 + g + a + 22} y={S - 30 - g / 2 + 12} className="fp-l">one GLDAS cell (dashed)</text>
        <text x={24 + g + a + 22} y={S - 30 - g / 2 + 28} className="fp-l">{int(im.irrigated_area_km2)} km² · {int(im.gldas_cell_km2)} km²</text>
      </svg>
      <figcaption>Squares drawn to true area.</figcaption>
    </figure>
  );
}

/** What the satellites can measure instead: water evaporated by the crops (MODIS ET x cropland area). */
export function EtVolume({ m }: { m: Manifest }) {
  const im = m.impact;
  const v = im.et_volume.find((b) => b.zone === "Z2");
  if (!v) return null;
  const total = im.et_volume.reduce((a, b) => a + b.mm3_2020_2024, 0);
  return (
    <div className="etv">
      <div className="etv-head">
        <span className="eyebrow">What NASA satellites do measure</span>
        <h3>The water the crops use</h3>
        <p className="lede-2">
          GRACE cannot isolate Ica's aquifer, but MODIS measures how much water the fields evaporate, pixel by pixel. With almost
          no rain, that water comes from irrigation. Multiplied by the cropland area, it becomes a volume.
        </p>
        <Tex block>{`V = \\text{ET} \\times A = ${(v.et_mm_2020_2024 / 1000).toFixed(3)}\\ \\mathrm{m\\,yr^{-1}} \\times ${(v.cropland_km2 / 100).toFixed(2)}\\times10^{8}\\ \\mathrm{m^{2}} \\approx ${v.mm3_2020_2024.toFixed(0)}\\times10^{6}\\ \\mathrm{m^{3}\\,yr^{-1}}`}</Tex>
      </div>
      <div className="etv-cards">
        {im.et_volume.map((b) => {
          const sure = b.change_mm3_ci95[0] > 0 || b.change_mm3_ci95[1] < 0;
          return (
            <article key={b.zone} className="etv-card">
              <span className="eyebrow">{b.zone_name} · {Math.round(b.cropland_km2)} km² of cropland</span>
              <div className="etv-now"><span className="num">{b.mm3_2020_2024.toFixed(0)}</span> million m³ a year <span className="muted">(2020–2024)</span></div>
              <span className="small muted">{b.mm3_2004_2008.toFixed(0)} million m³ a year on the same land in 2004–2008</span>
              <div className={`etv-change ${sure ? "" : "unsure"}`}>
                <span className="num">{b.change_mm3_per_yr > 0 ? "+" : ""}{b.change_mm3_per_yr.toFixed(0)}</span> million m³ a year more by 2024
                <span className="small muted"> · 95% range {b.change_mm3_ci95[0].toFixed(0)} to {b.change_mm3_ci95[1].toFixed(0)}</span>
              </div>
              <span className={`pill ${b.verdict}`}>{m.verdict_labels[b.verdict]}</span>
            </article>
          );
        })}
      </div>
      <p className="small muted etv-note">
        Together, crops in our two zones evaporate about {total.toFixed(0)} million m³ a year, the same order as the published
        estimate of {(im.overdraft_m3_per_yr / 1e6).toFixed(0)} million m³ of groundwater consumed beyond recharge. {im.et_note}
      </p>
    </div>
  );
}

/** part = "grace": footprint and derivation; "crops": the ET volume and the takeaway; "all": everything (long page). */
export function WhyMissed({ m, part = "all" }: { m: Manifest; part?: "all" | "grace" | "crops" }) {
  const im = m.impact;
  const V = (im.overdraft_m3_per_yr / 1e8).toFixed(2);
  const A = (im.grace_footprint_km2 * 1e6 / 1e11).toFixed(2);
  const sig = im.grace_noise_sd_mm.toFixed(1);
  const om = im.signal_mm_per_yr.toFixed(2);
  const ph = im.grace_phi.toFixed(2);
  const n = im.grace_years_to_detect;
  const takeaway = (
    <aside className="takeaway">
      <span className="eyebrow">What it means</span>
      <p><strong>Satellites see where irrigation spreads and how much water the crops use. Only wells see the water table drop at this scale.</strong> A monitoring plan
        for Ica needs both, and should say out loud which question each one can answer.</p>
      <p className="small muted">{im.note} Overdraft: {im.overdraft_source}.</p>
    </aside>
  );
  if (part === "crops") return <div className="why-crops"><EtVolume m={m} />{takeaway}</div>;
  return (
    <div className="why" id="why-math">
      <Footprints im={im} />
      <ol className="derivation">
        <li>
          <span className="step-k">1 · Spread Ica's overdraft over one GRACE measurement</span>
          <Tex block>{`\\Delta h = \\frac{V}{A} = \\frac{${V}\\times10^{8}\\ \\mathrm{m^{3}\\,yr^{-1}}}{${A}\\times10^{11}\\ \\mathrm{m^{2}}} \\approx ${im.signal_mm_per_yr.toFixed(1)}\\ \\mathrm{mm\\,yr^{-1}}`}</Tex>
          <p>A loss of {im.signal_mm_per_yr.toFixed(1)} mm of water per year, averaged over the whole footprint.</p>
        </li>
        <li>
          <span className="step-k">2 · Could GRACE see that loss on its own?</span>
          <Tex block>{`n^{*} = \\left[\\frac{3.3\\,\\sigma_N}{|\\omega|}\\sqrt{\\frac{1+\\phi}{1-\\phi}}\\right]^{2/3} = \\left[\\frac{3.3\\cdot ${sig}}{${om}}\\sqrt{\\frac{1+${ph}}{1-${ph}}}\\right]^{2/3} \\approx ${n ?? "\\infty"}\\ \\text{years}`}</Tex>
          <p>
            Yes, in principle. With GRACE's own noise (<Tex>{`\\sigma_N = ${sig}`}</Tex> mm) and memory (<Tex>{`\\phi = ${ph}`}</Tex>),
            a steady loss that size stands out after about {n} years (Weatherhead et al., 1998). GRACE has {im.grace_years_available}.
          </p>
        </li>
        <li>
          <span className="step-k">3 · But GRACE weighs everything in its footprint</span>
          <Tex block>{`\\underbrace{+${im.grace_observed_mm_per_yr.toFixed(1)}}_{\\text{GRACE measured}} = \\underbrace{-${im.signal_mm_per_yr.toFixed(1)}}_{\\text{Ica overdraft}} + \\underbrace{${im.implied_other_gain_mm_per_yr.toFixed(1)}}_{\\text{rest of the footprint}}\\quad \\mathrm{mm\\,yr^{-1}}`}</Tex>
          <p>
            GRACE measures water <em>rising</em>. For that to happen while Ica loses {im.signal_mm_per_yr.toFixed(1)} mm a year, the rest of the
            footprint must gain about {im.implied_other_gain_mm_per_yr.toFixed(1)}. The same rise appears over the Andean headwaters, so wetter
            highlands are the likely source. GRACE cannot tell where inside its footprint the water moved.
          </p>
        </li>
      </ol>
      {part === "all" && <div style={{ gridColumn: "1 / -1" }}><EtVolume m={m} /></div>}
      {part === "all" && takeaway}
    </div>
  );
}
