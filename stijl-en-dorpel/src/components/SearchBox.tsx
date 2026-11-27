import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { useT, type L } from '../i18n';
import { useCatalog, groupLabel, Thumb } from '../catalog';
import { search } from '../search';
import { useTransitionNavigate } from '../fx/Engine';
import { lockScroll } from '../fx/core';

const TX = {
  open: ['Zoeken', 'Search', 'Szukaj'],
  ph: ['Zoek een product, bijvoorbeeld raam, schuifpui of DP06', 'Search a product, e.g. window, sliding door or DP06', 'Szukaj produktu, np. okno, drzwi przesuwne albo DP06'],
  none: ['Niets gevonden. Probeer een ander woord, of bekijk alle producten.', 'Nothing found. Try another word, or view all products.', 'Nic nie znaleziono. Spróbuj innego słowa albo zobacz wszystkie produkty.'],
  all: ['Alle resultaten bekijken', 'View all results', 'Zobacz wszystkie wyniki'],
  hints: ['Veel gezocht', 'Popular', 'Często szukane'],
} satisfies Record<string, L>;
const HINTS = ['Kunststof ramen', 'Schuifpui', 'Voordeur aluminium', 'Binnendeuren', 'Rolluiken', 'Horren', 'Garagedeur', 'Hekwerk'];

export function SearchBox({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const go = useTransitionNavigate();
  const catalog = useCatalog();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const hits = useMemo(() => search(catalog, q, 8), [catalog, q]);

  useEffect(() => { lockScroll(open); if (open) window.setTimeout(() => input.current?.focus(), 60); return () => lockScroll(false); }, [open]);
  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === '/' && !/input|textarea|select/i.test((e.target as HTMLElement).tagName)) { e.preventDefault(); setOpen(true); } };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, []);

  const close = () => { setOpen(false); setQ(''); };
  const pick = (i: number) => { const h = hits[i]; if (!h) return; close(); go(`/product/${h.item.id}${h.variant >= 0 ? `?v=${h.variant}` : ''}`); };
  const all = () => { const s = q.trim(); close(); go(`/producten${s ? `?q=${encodeURIComponent(s)}` : ''}`); };

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label={t(TX.open)} className={compact ? 'w-11 h-11 border border-white/20 flex items-center justify-center text-white' : 'inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-white transition-colors'}>
        <Search className="w-4 h-4" />{!compact && <span>{t(TX.open)}</span>}
      </button>
      {/* portalled: the header is transformed, which would otherwise trap a fixed overlay inside it */}
      {open && createPortal(
        <div role="dialog" aria-modal="true" aria-label={t(TX.open)} className="fixed inset-0 z-[80] bg-[#0b0a09] overflow-y-auto" data-lenis-prevent onKeyDown={(e) => {
          if (e.key === 'Escape') close();
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(hits.length - 1, a + 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
          if (e.key === 'Enter') { e.preventDefault(); if (hits.length) pick(active); else all(); }
        }}>
          <div className="max-w-3xl mx-auto px-6 pt-6 pb-16">
            <div className="flex items-center gap-4 border-b border-white/25">
              <Search className="w-5 h-5 text-white/50 shrink-0" />
              <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t(TX.ph)} aria-label={t(TX.open)} style={{ border: 0 }} className="flex-1 min-w-0 py-5 text-xl md:text-2xl text-white placeholder:text-white/30" />
              <button onClick={close} aria-label="Close" className="w-11 h-11 shrink-0 flex items-center justify-center text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            {q.trim().length < 2 ? (
              <div className="pt-10">
                <p className="sd-label mb-5">{t(TX.hints)}</p>
                <div className="flex flex-wrap gap-2">
                  {HINTS.map((h) => <button key={h} onClick={() => setQ(h)} className="px-4 py-2.5 text-sm border border-white/15 text-white/70 hover:text-white hover:border-white/40 transition-colors">{h}</button>)}
                </div>
              </div>
            ) : hits.length === 0 ? (
              <p className="pt-10 text-white/60">{t(TX.none)}</p>
            ) : (
              <ul className="pt-4">
                {hits.map((h, i) => (
                  <li key={h.item.id}>
                    <button onClick={() => pick(i)} onMouseEnter={() => setActive(i)} className={`w-full flex items-center gap-5 py-3 px-3 -mx-3 text-left border-b border-white/10 transition-colors ${i === active ? 'bg-white/[0.05]' : ''}`}>
                      <Thumb item={h.item} index={h.variant} className="w-14 h-[4.5rem] shrink-0" />
                      <span className="min-w-0">
                        <span className="block font-display text-2xl text-white truncate">{h.item.name}{h.variant >= 0 && h.item.labels?.[h.variant] ? <span className="text-amber-200/80"> · {h.item.labels[h.variant]}</span> : null}</span>
                        <span className="block text-white/45 text-[11px] uppercase tracking-[0.22em] truncate">{t(groupLabel(h.item.group))}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {q.trim().length >= 2 && <button onClick={all} className="sd-link mt-8">{t(TX.all)}</button>}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
