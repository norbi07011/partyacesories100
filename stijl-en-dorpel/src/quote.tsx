import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  FINISHES, FRAMES, GLASS, HANDLES, SERVICE, PRODUCTS, hasGlass, modelById, needsFrame, priceOf, type DoorConfig,
} from './data/doors';
import type { L } from './i18n';

/* The "offertelijst" — a cart without payment. Doors are made to measure, so
 * the list is sent as a quote request instead of being paid online. */

export type QuoteItem =
  | { key: string; type: 'door'; config: DoorConfig; qty: number }
  | { key: string; type: 'product'; productId: string; qty: number }
  | { key: string; type: 'catalog'; catId: string; name: string; brand: string; variant: string; price: number; qty: number };

type Ctx = {
  items: QuoteItem[];
  count: number;
  total: number;
  addDoor: (c: DoorConfig, qty?: number) => void;
  addProduct: (id: string) => void;
  addCatalog: (c: { catId: string; name: string; brand: string; variant: string; price: number }, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const QuoteCtx = createContext<Ctx | undefined>(undefined);
const KEY = 'sd-quote-v1';

export const itemPrice = (it: QuoteItem) =>
  it.type === 'door' ? priceOf(it.config) : it.type === 'catalog' ? it.price : PRODUCTS.find((p) => p.id === it.productId)?.price ?? 0;

export const QuoteProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<QuoteItem[]>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* ignore */ }
  }, [items]);

  const addDoor = useCallback((config: DoorConfig, qty = 1) => {
    setItems((l) => [...l, { key: `d-${Date.now()}-${Math.round(Math.random() * 1e4)}`, type: 'door', config, qty }]);
  }, []);
  const addProduct = useCallback((productId: string) => {
    setItems((l) => {
      const hit = l.find((i) => i.type === 'product' && i.productId === productId);
      if (hit) return l.map((i) => (i === hit ? { ...i, qty: i.qty + 1 } : i));
      return [...l, { key: `p-${productId}`, type: 'product', productId, qty: 1 }];
    });
  }, []);
  const addCatalog = useCallback((c: { catId: string; name: string; brand: string; variant: string; price: number }, qty = 1) => {
    setItems((l) => {
      const key = `c-${c.catId}-${c.variant}`;
      const hit = l.find((i) => i.key === key);
      if (hit) return l.map((i) => (i === hit ? { ...i, qty: i.qty + qty } : i));
      return [...l, { key, type: 'catalog', qty, ...c }];
    });
  }, []);
  const setQty = useCallback((key: string, qty: number) => {
    setItems((l) => l.map((i) => (i.key === key ? { ...i, qty: Math.max(1, Math.min(99, qty)) } : i)));
  }, []);
  const remove = useCallback((key: string) => setItems((l) => l.filter((i) => i.key !== key)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<Ctx>(() => ({
    items,
    count: items.reduce((n, i) => n + i.qty, 0),
    total: items.reduce((n, i) => n + itemPrice(i) * i.qty, 0),
    addDoor, addProduct, addCatalog, setQty, remove, clear,
  }), [items, addDoor, addProduct, addCatalog, setQty, remove, clear]);

  return <QuoteCtx.Provider value={value}>{children}</QuoteCtx.Provider>;
};

export const useQuote = () => {
  const c = useContext(QuoteCtx);
  if (!c) throw new Error('useQuote must be used within QuoteProvider');
  return c;
};

/* ───────────── Human-readable summaries ───────────── */

const MAATWERK: L = ['maatwerk', 'made to measure', 'na wymiar'];
const HINGE: Record<'L' | 'R', L> = {
  L: ['linksdraaiend', 'left-hung', 'lewe'],
  R: ['rechtsdraaiend', 'right-hung', 'prawe'],
};

export const sizeLabel = (c: DoorConfig, t: (l: L) => string) => {
  const w = c.width === 'maat' ? (c.customW ? `${c.customW} mm` : t(MAATWERK)) : `${c.width} cm`;
  const h = c.height === 'maat' ? (c.customH ? `${c.customH} mm` : t(MAATWERK)) : `${String(c.height).replace('.', ',')} cm`;
  return `${w} × ${h}`;
};

export const describeDoor = (c: DoorConfig, t: (l: L) => string): string[] => {
  const m = modelById(c.model);
  const out = [
    t(FINISHES.find((f) => f.id === c.finish)?.name ?? FINISHES[0].name),
    sizeLabel(c, t),
  ];
  if (hasGlass(m)) out.push(t(GLASS.find((g) => g.id === c.glass)!.name));
  out.push(t(HANDLES.find((h) => h.id === c.handle)!.name));
  if (m.kind === 'draai' && m.leaves === 1) out.push(t(HINGE[c.hinge]));
  if (needsFrame(m)) out.push(t(FRAMES.find((f) => f.id === c.frame)!.name));
  out.push(t(SERVICE.find((s) => s.id === c.service)!.name));
  return out;
};

export const itemTitle = (it: QuoteItem, t: (l: L) => string) => {
  if (it.type === 'door') {
    const m = modelById(it.config.model);
    return `${m.name} — ${t(m.style)}`;
  }
  if (it.type === 'catalog') return `${it.name} — ${it.brand}`;
  const p = PRODUCTS.find((x) => x.id === it.productId);
  return p ? t(p.name) : it.productId;
};

/** Plain-text version of the list for the quote request. */
export const quoteAsText = (items: QuoteItem[], t: (l: L) => string) =>
  items
    .map((it, i) => {
      const line = `${i + 1}. ${it.qty}× ${itemTitle(it, t)}`;
      if (it.type === 'catalog') return it.variant ? `${line}\n   ${it.variant}` : line;
      return it.type === 'door' ? `${line}\n   ${describeDoor(it.config, t).join(' · ')}` : line;
    })
    .join('\n');
