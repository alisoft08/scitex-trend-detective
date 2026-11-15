// AI-assisted: Claude (Anthropic). A dependency-free 3D globe: orthographic projection of the MODIS world mosaic drawn
// pixel by pixel on a canvas, with HTML markers on top (real buttons, so they are clickable and keyboard-friendly).
import { useEffect, useRef, useState } from "react";
import { asset } from "./data";

export interface GlobeMarker { id: string; lonlat: [number, number]; label: string; tone: "down" | "up" | "flat"; focus?: boolean }

// The texture is plate carrée from lon -180..180 and lat 75..-60 (pipeline/world_map.py).
const TEX_N = 75, TEX_S = -60;
const OCEAN: [number, number, number] = [22, 34, 58];
const rad = Math.PI / 180;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

function project(lon: number, lat: number, lon0: number, lat0: number) {
  const l = lon * rad, p = lat * rad, l0 = lon0 * rad, p0 = lat0 * rad;
  const cosc = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l - l0);
  return { x: Math.cos(p) * Math.sin(l - l0), y: Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l - l0), visible: cosc > 0.05 };
}

export function Globe({ markers, selected, onSelect, size = 520, label }: {
  markers: GlobeMarker[]; selected: string | null; onSelect: (id: string) => void; size?: number; label: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const tex = useRef<{ data: Uint8ClampedArray; w: number; h: number } | null>(null);
  const view = useRef({ lon: 0, lat: 0 });
  const anim = useRef<{ from: [number, number]; to: [number, number]; t0: number; dur: number } | null>(null);
  const drag = useRef<{ x: number; y: number; lon: number; lat: number } | null>(null);
  const pins = useRef<Record<string, HTMLButtonElement | null>>({});
  const [ready, setReady] = useState(false);
  const focus = markers.find((m) => m.focus) ?? markers[0];
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const flyTo = (lon: number, lat: number, dur = 1400) => {
    const from: [number, number] = [view.current.lon, view.current.lat];
    let dl = ((lon - from[0] + 540) % 360) - 180;          // shortest way round
    const to: [number, number] = [from[0] + dl, Math.max(-55, Math.min(55, lat))];
    if (reduced) { view.current = { lon: to[0], lat: to[1] }; anim.current = null; return; }
    anim.current = { from, to, t0: performance.now(), dur };
  };

  // Load the texture once.
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext("2d")!;
      g.drawImage(img, 0, 0);
      tex.current = { data: g.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height };
      setReady(true);
    };
    img.src = asset("img/world_modis.jpg");
    if (focus) {
      view.current = { lon: focus.lonlat[0] + (reduced ? 0 : 140), lat: reduced ? focus.lonlat[1] : 10 };
      if (!reduced) anim.current = { from: [view.current.lon, view.current.lat], to: [focus.lonlat[0], Math.max(-55, focus.lonlat[1])], t0: performance.now() + 400, dur: 3600 };
    }
  }, []);

  useEffect(() => {
    const m = markers.find((x) => x.id === selected);
    if (m) flyTo(m.lonlat[0], m.lonlat[1]);
  }, [selected]);

  // Render loop: only redraws while the view changes.
  useEffect(() => {
    if (!ready) return;
    const cv = canvas.current!;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const N = Math.round(size * dpr);
    cv.width = N; cv.height = N;
    const g = cv.getContext("2d")!;
    const out = g.createImageData(N, N);
    const r = N / 2 - 2, cx = N / 2, cy = N / 2;
    let raf = 0, last = { lon: NaN, lat: NaN };
    const draw = () => {
      const a = anim.current;
      if (a) {
        const k = Math.min(1, Math.max(0, (performance.now() - a.t0) / a.dur));
        const e = ease(k);
        view.current = { lon: a.from[0] + (a.to[0] - a.from[0]) * e, lat: a.from[1] + (a.to[1] - a.from[1]) * e };
        if (k >= 1) anim.current = null;
      }
      const { lon: lon0, lat: lat0 } = view.current;
      if (lon0 !== last.lon || lat0 !== last.lat) {
        last = { lon: lon0, lat: lat0 };
        const t = tex.current!, d = out.data;
        const sp = Math.sin(lat0 * rad), cp = Math.cos(lat0 * rad);
        for (let py = 0; py < N; py++) {
          const y = (cy - py) / r;
          for (let px = 0; px < N; px++) {
            const x = (px - cx) / r, rho2 = x * x + y * y, i = (py * N + px) * 4;
            if (rho2 > 1) { d[i + 3] = 0; continue; }
            const z = Math.sqrt(1 - rho2);
            const lat = Math.asin(z * sp + y * cp) / rad;
            let lon = lon0 + Math.atan2(x, z * cp - y * sp) / rad;
            lon = ((lon + 540) % 360) - 180;
            let R: number, G: number, B: number;
            if (lat > TEX_N || lat < TEX_S) { [R, G, B] = OCEAN; }   // outside the mosaic (Antarctica and the Arctic Ocean)
            else {
              const tx = Math.min(t.w - 1, Math.floor(((lon + 180) / 360) * t.w));
              const ty = Math.min(t.h - 1, Math.floor(((TEX_N - lat) / (TEX_N - TEX_S)) * t.h));
              const j = (ty * t.w + tx) * 4;
              R = t.data[j]; G = t.data[j + 1]; B = t.data[j + 2];
            }
            const light = 0.45 + 0.55 * Math.pow(z, 0.6);       // soft day-side shading
            d[i] = R * light; d[i + 1] = G * light; d[i + 2] = B * light; d[i + 3] = 255;
          }
        }
        g.putImageData(out, 0, 0);
        for (const m of markers) {                                // move the HTML markers with the globe
          const el = pins.current[m.id]; if (!el) continue;
          const p = project(m.lonlat[0], m.lonlat[1], lon0, lat0);
          el.style.left = `${50 + p.x * 49.6}%`; el.style.top = `${50 - p.y * 49.6}%`;
          el.style.visibility = p.visible ? "visible" : "hidden";
          el.tabIndex = p.visible ? 0 : -1;
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [ready, size, markers]);

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    anim.current = null;
    drag.current = { x: e.clientX, y: e.clientY, lon: view.current.lon, lat: view.current.lat };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = drag.current; if (!s) return;
    const k = 180 / size;
    view.current = { lon: s.lon - (e.clientX - s.x) * k, lat: Math.max(-55, Math.min(55, s.lat + (e.clientY - s.y) * k)) };
  };
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, [number, number]> = { ArrowLeft: [-15, 0], ArrowRight: [15, 0], ArrowUp: [0, 10], ArrowDown: [0, -10] };
    const s = step[e.key]; if (!s) return;
    e.preventDefault();
    flyTo(view.current.lon + s[0], view.current.lat + s[1], 500);
  };

  return (
    <div className="globe" style={{ width: size, maxWidth: "100%" }} role="group" aria-label={label} tabIndex={0}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={() => { drag.current = null; }} onKeyDown={onKey}>
      <div className="globe-halo" aria-hidden="true" />
      <canvas ref={canvas} className="globe-canvas" aria-hidden="true" />
      {!ready && <p className="globe-loading">Loading MODIS mosaic…</p>}
      {ready && markers.map((m) => {
        return <button key={m.id} type="button" ref={(el) => { pins.current[m.id] = el; }}
          className={`globe-pin ${m.tone} ${m.focus ? "focus" : ""} ${selected === m.id ? "on" : ""}`}
          style={{ visibility: "hidden" }} onClick={() => onSelect(m.id)}
          aria-pressed={selected === m.id} aria-label={m.label}>
          <span className="globe-dot" aria-hidden="true">{m.tone === "down" ? "↓" : m.tone === "up" ? "↑" : "?"}</span>
          <span className="globe-tag">{m.label}</span>
        </button>;
      })}
    </div>
  );
}
