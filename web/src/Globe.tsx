// AI-assisted: Claude (Anthropic). A dependency-free 3D globe: orthographic projection of the MODIS world mosaic drawn
// pixel by pixel on a canvas, with HTML markers on top (real buttons, so they are clickable and keyboard-friendly).
import { useEffect, useRef, useState } from "react";
import { asset } from "./data";
import { createGlobeGL } from "./globeGL";
import { useLocale } from "./i18n";

export interface GlobeMarker {
  id: string; lonlat: [number, number]; label: string; tone: "down" | "up" | "flat"; focus?: boolean;
  thumb?: string; value?: string;            // mini card: satellite close-up and the headline number
  dir?: "ne" | "nw" | "se" | "sw";           // where the mini card sits relative to the point
}
const OFFSET: Record<NonNullable<GlobeMarker["dir"]>, [number, number]> = { ne: [46, -54], nw: [-46, -54], se: [46, 54], sw: [-46, 54] };

// The texture is plate carrée from lon -180..180 and lat 90..-90 (pipeline/world_map.py).
const TEX_N = 90, TEX_S = -90;
const POLAR: [number, number, number] = [228, 234, 240];   // Antarctic plateau beyond the land-cover grid
const rad = Math.PI / 180;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

function project(lon: number, lat: number, lon0: number, lat0: number) {
  const l = lon * rad, p = lat * rad, l0 = lon0 * rad, p0 = lat0 * rad;
  const cosc = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l - l0);
  return { x: Math.cos(p) * Math.sin(l - l0), y: Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l - l0), visible: cosc > 0.05 };
}

export function Globe({ markers, selection, onSelect, size = 520, label, autoRotate = false, initialView }: {
  markers: GlobeMarker[]; selection: { id: string }; onSelect: (id: string) => void; size?: number; label: string;
  autoRotate?: boolean;  // spin slowly on its own; pauses while dragged or after a pick
  initialView?: { lon: number; lat: number };
}) {
  const { t } = useLocale();
  const lastSelection = useRef(selection);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const idleUntil = useRef(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const fallbackCanvas = useRef<HTMLCanvasElement>(null);
  const tex = useRef<{ data: Uint8ClampedArray; w: number; h: number } | null>(null);
  const view = useRef({ lon: 0, lat: 0 });
  const anim = useRef<{ from: [number, number]; to: [number, number]; t0: number; dur: number } | null>(null);
  const drag = useRef<{ x: number; y: number; lon: number; lat: number } | null>(null);
  const pins = useRef<Record<string, HTMLButtonElement | null>>({});
  const [ready, setReady] = useState(false);
  const [textureError, setTextureError] = useState(false);
  const focus = markers.find((m) => m.id === selection.id) ?? markers.find((m) => m.focus) ?? markers[0];
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
    img.onload = () => { imgRef.current = img; setReady(true); };
    img.onerror = () => setTextureError(true);
    img.src = asset("img/world_modis.jpg");
    if (initialView) {
      view.current = initialView;
    } else if (autoRotate) {
      view.current = { lon: focus ? focus.lonlat[0] : 0, lat: 22 };   // tilted north so the Arctic and the curvature show
    } else if (focus) {
      view.current = { lon: focus.lonlat[0] + (reduced ? 0 : 140), lat: reduced ? focus.lonlat[1] : 10 };
      if (!reduced) anim.current = { from: [view.current.lon, view.current.lat], to: [focus.lonlat[0], Math.max(-55, focus.lonlat[1])], t0: performance.now() + 400, dur: 3600 };
    }
    return () => { img.onload = null; img.onerror = null; };
  }, []);

  useEffect(() => {
    if (lastSelection.current === selection) return;
    lastSelection.current = selection;
    const m = markers.find((x) => x.id === selection.id);
    if (m) { flyTo(m.lonlat[0], m.lonlat[1]); idleUntil.current = performance.now() + 8000; }
  }, [selection]);

  // Render loop: only redraws while the view changes.
  useEffect(() => {
    if (!ready) return;
    const gpuCanvas = canvas.current!, cpuCanvas = fallbackCanvas.current!;
    // GPU first (sharp, 60 frames a second); the canvas-2D renderer below is the fallback.
    const dprGL = Math.min(window.devicePixelRatio || 1, 2);
    gpuCanvas.width = gpuCanvas.height = Math.min(2048, Math.round(size * dprGL));
    const glr = createGlobeGL(gpuCanvas, imgRef.current!);
    gpuCanvas.hidden = !glr;
    cpuCanvas.hidden = !!glr;
    const cv = glr ? gpuCanvas : cpuCanvas;
    cv.dataset.renderer = glr ? "webgl2" : "canvas2d";
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const N = glr ? cv.width : Math.min(1300, Math.round(size * dpr));
    if (!glr) { cv.width = N; cv.height = N; }
    if (!glr && !tex.current) {                                // CPU texture, only when the GPU path is unavailable
      const c = document.createElement("canvas"), im = imgRef.current!;
      c.width = 2400; c.height = 1200;
      const g2 = c.getContext("2d")!;
      g2.drawImage(im, 0, 0, c.width, c.height);
      tex.current = { data: g2.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height };
    }
    const g = glr ? null : cv.getContext("2d")!;
    const out = g ? g.createImageData(N, N) : null;
    const r = N / 2 - 2, cx = N / 2, cy = N / 2;
    let raf = 0, last = { lon: NaN, lat: NaN }, lastStep = 1;
    let lastT = performance.now(), lastSpin = 0;
    const draw = () => {
      const now = performance.now(), dtS = Math.min(0.1, (now - lastT) / 1000); lastT = now;
      // Slow spin, west to east as seen from space (about 6 degrees a second): every frame on the GPU, ~20 a second on the CPU.
      const spinning = autoRotate && !reduced && !anim.current && !drag.current && now > idleUntil.current;
      if (spinning && (glr || now - lastSpin > 50)) {
        view.current = { lon: view.current.lon - 6 * Math.max(dtS, Math.min(0.2, (now - lastSpin) / 1000)), lat: view.current.lat };
        lastSpin = now;
      } else if (!spinning) lastSpin = now;
      const a = anim.current;
      if (a) {
        const k = Math.min(1, Math.max(0, (performance.now() - a.t0) / a.dur));
        const e = ease(k);
        view.current = { lon: a.from[0] + (a.to[0] - a.from[0]) * e, lat: a.from[1] + (a.to[1] - a.from[1]) * e };
        if (k >= 1) anim.current = null;
      }
      const { lon: lon0, lat: lat0 } = view.current;
      // While the globe moves, draw every second pixel (2x2 blocks); once it stops, redraw at full resolution.
      const step = glr ? 1 : anim.current || drag.current ? 2 : 1;
      if (lon0 !== last.lon || lat0 !== last.lat || (step === 1 && lastStep === 2)) {
        last = { lon: lon0, lat: lat0 }; lastStep = step;
        if (glr) glr.draw(lon0, lat0);
        else {
        const t = tex.current!, d = out!.data;
        const sp = Math.sin(lat0 * rad), cp = Math.cos(lat0 * rad);
        const put = (i0: number, px: number, py: number, R: number, G: number, B: number, A: number) => {
          for (let dy = 0; dy < step && py + dy < N; dy++)
            for (let dx = 0; dx < step && px + dx < N; dx++) {
              const k = i0 + (dy * N + dx) * 4;
              d[k] = R; d[k + 1] = G; d[k + 2] = B; d[k + 3] = A;
            }
        };
        for (let py = 0; py < N; py += step) {
          const y = (cy - py) / r;
          for (let px = 0; px < N; px += step) {
            const x = (px - cx) / r, rho2 = x * x + y * y, i = (py * N + px) * 4;
            if (rho2 > 1) { put(i, px, py, 0, 0, 0, 0); continue; }
            const z = Math.sqrt(1 - rho2);
            const lat = Math.asin(z * sp + y * cp) / rad;
            let lon = lon0 + Math.atan2(x, z * cp - y * sp) / rad;
            lon = ((lon + 540) % 360) - 180;
            let R: number, G: number, B: number;
            if (lat < -80) { [R, G, B] = POLAR; }
            else {
              const tx = Math.min(t.w - 1, Math.floor(((lon + 180) / 360) * t.w));
              const ty = Math.min(t.h - 1, Math.floor(((TEX_N - lat) / (TEX_N - TEX_S)) * t.h));
              const j = (ty * t.w + tx) * 4;
              R = t.data[j]; G = t.data[j + 1]; B = t.data[j + 2];
            }
            const light = 0.45 + 0.55 * Math.pow(z, 0.6);       // soft day-side shading
            put(i, px, py, R * light, G * light, B * light, 255);
          }
        }
        g!.putImageData(out!, 0, 0);
        }
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
    return () => { cancelAnimationFrame(raf); glr?.dispose(); };
  }, [ready, size, markers]);

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    anim.current = null;
    drag.current = { x: e.clientX, y: e.clientY, lon: view.current.lon, lat: view.current.lat };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = drag.current; if (!s) return;
    const k = 180 / e.currentTarget.clientWidth;
    view.current = { lon: s.lon - (e.clientX - s.x) * k, lat: Math.max(-55, Math.min(55, s.lat + (e.clientY - s.y) * k)) };
  };
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, [number, number]> = { ArrowLeft: [-15, 0], ArrowRight: [15, 0], ArrowUp: [0, 10], ArrowDown: [0, -10] };
    const s = step[e.key]; if (!s) return;
    e.preventDefault();
    flyTo(view.current.lon + s[0], view.current.lat + s[1], 500);
  };

  const stopDrag = () => {
    drag.current = null;
    idleUntil.current = performance.now() + 4000;
  };

  return (
    <div className="globe-stage">
    <div className="globe" style={{ width: size, maxWidth: "100%" }} role="group" aria-label={label} tabIndex={0}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={stopDrag} onPointerCancel={stopDrag} onKeyDown={onKey}>
      <div className="globe-halo" aria-hidden="true" />
      <canvas ref={canvas} className="globe-canvas" aria-hidden="true" />
      <canvas ref={fallbackCanvas} className="globe-canvas" hidden aria-hidden="true" />
      {!ready && <p className="globe-loading" role="status">{textureError
        ? t("Could not load the MODIS mosaic.", "No se pudo cargar el mosaico de MODIS.")
        : t("Loading MODIS mosaic…", "Cargando el mosaico de MODIS…")}</p>}
      {ready && markers.map((m) => {
        return <button key={m.id} type="button" ref={(el) => { pins.current[m.id] = el; }}
          className={`globe-pin ${m.tone} ${m.focus ? "focus" : ""} ${selection.id === m.id ? "on" : ""}`}
          style={{ visibility: "hidden" }} onClick={() => onSelect(m.id)}
          aria-pressed={selection.id === m.id} aria-label={m.label}>
          <span className="globe-dot" aria-hidden="true">{m.tone === "down" ? "↓" : m.tone === "up" ? "↑" : "?"}</span>
          {m.thumb ? (() => {
            const [dx, dy] = OFFSET[m.dir ?? "ne"];
            const len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx) * 180 / Math.PI;
            return <>
              <span className="globe-stem" aria-hidden="true" style={{ width: len, transform: `rotate(${ang}deg)` }} />
              <span className={`globe-mini ${m.dir ?? "ne"}`} aria-hidden="true" style={{ left: `calc(50% + ${dx}px)`, top: `calc(50% + ${dy}px)` }}>
                <img src={m.thumb} alt="" />
                <span className="globe-mini-text"><b>{m.label}</b>{m.value && <i>{m.value}</i>}</span>
              </span>
            </>;
          })() : <span className="globe-tag">{m.label}</span>}
        </button>;
      })}
    </div>
    </div>
  );
}
