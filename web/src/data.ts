// AI-assisted: Claude (Anthropic). Loading the static JSON produced by the Python engine.
import { useEffect, useState } from "react";

const cache = new Map<string, Promise<unknown>>();

// The single-file build (scripts/build_standalone.py) embeds every JSON file and image in the page,
// so it also works when opened straight from disk, without a server.
type Embedded = { data?: Record<string, unknown>; assets?: Record<string, string> };
const EMBED: Embedded = (globalThis as unknown as { __OASIS__?: Embedded }).__OASIS__ ?? {};

export function loadJSON<T>(path: string): Promise<T> {
  if (!cache.has(path) && EMBED.data && path in EMBED.data) cache.set(path, Promise.resolve(EMBED.data[path]));
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(`data/${path}`).then((r) => {
        if (!r.ok) throw new Error(`Could not load data/${path} (HTTP ${r.status})`);
        return r.json();
      }).catch((error: unknown) => {
        cache.delete(path);
        throw error;
      }),
    );
  }
  return cache.get(path) as Promise<T>;
}

export function useJSON<T>(path: string | null): { data: T | null; error: string | null } {
  const [state, setState] = useState<{ path: string; data: T | null; error: string | null }>();
  useEffect(() => {
    if (!path) return;
    let alive = true;
    loadJSON<T>(path)
      .then((data) => { if (alive) setState({ path, data, error: null }); })
      .catch((e: Error) => { if (alive) setState({ path, data: null, error: e.message }); });
    return () => { alive = false; };
  }, [path]);
  return state && state.path === path ? state : { data: null, error: null };
}

export const asset = (p: string) => EMBED.assets?.[`data/${p}`] ?? `data/${p}`;
export const brandAsset = (p: string) => EMBED.assets?.[`brand/${p}`] ?? `brand/${p}`;
