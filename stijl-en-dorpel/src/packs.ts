import { useSyncExternalStore } from 'react';

/**
 * Preview builds can only ship a limited number of files, so the catalogue photos are bundled
 * into a few "pack" files (plain concatenated WebP files + an index). Normal builds don't use this.
 */
type Entry = [pack: number, offset: number, length: number];
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
const base = import.meta.env.BASE_URL;
export const PACKED = !!import.meta.env.VITE_PREVIEW;

let index: Record<string, Entry> | null = null;
const urls = new Map<string, string>();
const started = new Set<number>();
const listeners = new Set<() => void>();
let version = 0;
const bump = () => { version++; listeners.forEach((l) => l()); };

if (PACKED) {
  fetch(`${base}fabriek/packs/index.json`)
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}))
    .then((j) => { index = j; bump(); });
}

function load(pack: number) {
  if (started.has(pack)) return;
  started.add(pack);
  fetch(`${base}fabriek/packs/p${pack}.jpg`)
    .then((r) => r.arrayBuffer())
    .then((buf) => {
      for (const [path, [p, off, len]] of Object.entries(index!)) {
        if (p === pack) urls.set(path, URL.createObjectURL(new Blob([buf.slice(off, off + len)], { type: 'image/webp' })));
      }
      bump();
    })
    .catch(() => started.delete(pack));
}

/** URL for a packed photo, a blank pixel while its pack loads, or null when the file isn't packed. */
export function packed(path: string): string | null {
  if (!PACKED || !path.startsWith('fabriek/') || !path.endsWith('.webp')) return null;
  const hit = urls.get(path);
  if (hit) return hit;
  if (!index) return BLANK;
  const e = index[path];
  if (!e) return null;
  load(e[0]);
  return BLANK;
}

/** Re-renders the caller whenever a pack finishes loading. */
export function usePackVersion() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => version);
}
