import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, Expand, Plus, X } from 'lucide-react';
import { useLanguage, useT, euro, type L } from './i18n';
import { UI } from './ui';
import { PRICING } from './company';
import { useQuote } from './quote';
import { Plate, asset } from './components/Door';
import { lockScroll } from './fx/core';

/* ─────────────────────────────────────────────────────────────────────────
 * Factory catalogue (Invado 2/2021, Porta 2/2013).
 * The data and images are generated from the manufacturers' catalogues and live in
 * public/fabriek/ (catalog.json + images). That folder is not committed until the
 * manufacturers have cleared the material; without it the shop simply shows the
 * house collection.
 * ───────────────────────────────────────────────────────────────────────── */

export type CatCat = 'binnen' | 'entree' | 'buiten' | 'schuif' | 'technisch' | 'kozijn' | 'beslag';
type Strip = { w: number; h: number; items: [number, number][] };
export type CatItem = {
  id: string;
  brand: 'Invado' | 'Porta';
  cat: CatCat;
  group: string;
  name: string;
  page: number;
  tagline: string;
  descPL: string;
  net: number | null;
  gross: number | null;
  flags: { flush?: boolean; double?: boolean; sliding?: boolean; vent?: boolean };
  constr: string[];
  equip: string[];
  equip2: string[];
  frame: string[];
  notes: string[];
  opts: string[];
  coats: string[];
  widths: [number, number] | null;
  dir: string;
  scene?: [number, number];
  hero?: [number, number];
  strip?: Strip;
  labels?: string[];
};

let cache: Promise<CatItem[]> | null = null;
const load = () => {
  cache ??= fetch(asset('fabriek/catalog.json'))
    .then((r) => (r.ok ? r.json() : []))
    .then((d) => (Array.isArray(d) ? (d as CatItem[]) : []))
    .catch(() => []);
  return cache;
};

export function useCatalog() {
  const [items, setItems] = useState<CatItem[]>([]);
  useEffect(() => {
    let on = true;
    load().then((d) => { if (on) setItems(d); });
    return () => { on = false; };
  }, []);
  return items;
}

/** Guide price in euro derived from the factory list price (see PRICING in company.ts). */
export const guidePrice = (it: CatItem) =>
  // The Porta catalogue is from 2013: its prices are too old to derive a guide price from.
  it.net && it.brand !== 'Porta' ? Math.ceil((it.net / PRICING.plnPerEur) * PRICING.markup / 10) * 10 - 1 : 0;

const GROUPS: Record<string, L> = {
  'Binnendeuren · modulair': ['Binnendeuren · modulair', 'Interior doors · modular', 'Drzwi wewnętrzne · modułowe'],
  'Binnendeuren · vlak': ['Binnendeuren · vlak', 'Interior doors · flat', 'Drzwi wewnętrzne · płaskie'],
  'Binnendeuren · decor': ['Binnendeuren · decor', 'Interior doors · decor foil', 'Drzwi wewnętrzne · okleina syntetyczna'],
  'Binnendeuren · fineer': ['Binnendeuren · echt fineer', 'Interior doors · real veneer', 'Drzwi wewnętrzne · okleina naturalna'],
  Villadora: ['Villadora · massief karakter', 'Villadora · classic joinery', 'Villadora · stolarka klasyczna'],
  'Glazen deuren': ['Glazen deuren', 'Glass doors', 'Drzwi szklane'],
  'Vouw- en schuifdeuren': ['Vouw- en schuifdeuren', 'Folding & sliding doors', 'Drzwi łamane i przesuwne'],
  Woningtoegangsdeuren: ['Woningtoegangsdeuren', 'Apartment entrance doors', 'Drzwi wejściowe do mieszkań'],
  Buitendeuren: ['Buitendeuren', 'Exterior doors', 'Drzwi zewnętrzne'],
  'Technische deuren': ['Technische deuren', 'Technical doors', 'Drzwi techniczne'],
  Kozijnen: ['Kozijnen', 'Frames', 'Ościeżnice'],
  'Beslag & toebehoren': ['Beslag & toebehoren', 'Hardware & accessories', 'Okucia i akcesoria'],
};
export const groupLabel = (g: string): L => GROUPS[g] ?? [g, g, g];

const TX = {
  variants: ['uitvoeringen', 'versions', 'wariantów'],
  inRoom: ['Sfeerbeeld', 'In the room', 'Aranżacja'],
  facts: ['Kenmerken', 'Key facts', 'Najważniejsze cechy'],
  type: ['Type', 'Type', 'Typ'],
  maker: ['Fabrikant', 'Manufacturer', 'Producent'],
  nVariants: ['Uitvoeringen', 'Versions', 'Warianty'],
  widths: ['Breedtes', 'Widths', 'Szerokości'],
  fit: ['Aanslag', 'Fit', 'Przylga'],
  fitBoth: ['Opdek en stomp', 'Rebated and flush', 'Przylgowe i bezprzylgowe'],
  fitRebated: ['Opdek', 'Rebated', 'Przylgowe'],
  yes: ['Ja', 'Yes', 'Tak'],
  double: ['Dubbele deur', 'Double door', 'Drzwi dwuskrzydłowe'],
  sliding: ['Schuifsysteem', 'Sliding system', 'System przesuwny'],
  vent: ['Ventilatie', 'Ventilation', 'Wentylacja'],
  colours: ['Kleuren & decors', 'Colours & decors', 'Kolory i okleiny'],
  constr: ['Constructie', 'Construction', 'Konstrukcja'],
  equip: ['Standaarduitrusting', 'Standard equipment', 'Wyposażenie standardowe'],
  equip2: ['Standaarduitrusting · stompe deur', 'Standard equipment · flush door', 'Wyposażenie standardowe · bezprzylgowe'],
  opts: ['Opties tegen meerprijs', 'Options at extra cost', 'Opcje za dopłatą'],
  frame: ['Kozijn', 'Frame', 'Ościeżnica'],
  notes: ['Goed om te weten', 'Good to know', 'Warto wiedzieć'],
  original: [
    'Fabrieksgegevens in het Pools (origineel). Wij lichten ze toe in je offerte.',
    'Factory data in Polish (original). We explain it in your quote.',
    'Dane producenta.',
  ],
  source: ['Bron: catalogus', 'Source: catalogue', 'Źródło: katalog'],
  cm: ['cm', 'cm', 'cm'],
  chosen: ['Gekozen uitvoering', 'Selected version', 'Wybrany wariant'],
  ask: ['Offerte aanvragen', 'Request a quote', 'Poproś o wycenę'],
  onRequest: ['Prijs op aanvraag', 'Price on request', 'Cena na zapytanie'],
} satisfies Record<string, L>;

/** One generated sentence per item, so NL/EN visitors get a readable intro. */
export const intro = (it: CatItem, t: (l: L) => string, lang: string) => {
  const n = it.labels?.length ?? 0;
  const g = t(groupLabel(it.group)).toLowerCase();
  const f = it.flags;
  const extra: L[] = [];
  if (f.flush) extra.push(['als opdek- of stompe deur', 'as a rebated or flush door', 'w wersji przylgowej lub bezprzylgowej']);
  if (f.double) extra.push(['als dubbele deur', 'as a double door', 'jako drzwi dwuskrzydłowe']);
  if (f.sliding) extra.push(['als schuifdeur', 'as a sliding door', 'w systemie przesuwnym']);
  const list = extra.map(t).join(', ');
  if (lang === 'NL') return `${it.name} komt uit de collectie ${g} van ${it.brand}${n > 1 ? ` en is er in ${n} uitvoeringen` : ''}.${list ? ` Leverbaar ${list}.` : ''}`;
  if (lang === 'EN') return `${it.name} is part of the ${it.brand} ${g} range${n > 1 ? ` and comes in ${n} versions` : ''}.${list ? ` Available ${list}.` : ''}`;
  return `${it.name} to kolekcja ${it.brand} (${g})${n > 1 ? `, dostępna w ${n} wariantach` : ''}.${list ? ` Dostępne ${list}.` : ''}`;
};

/* ───────────── Images ───────────── */

/** One variant cut out of the collection's strip image. */
export function Sprite({ item, index, className = '' }: { item: CatItem; index: number; className?: string }) {
  const s = item.strip;
  if (!s) return null;
  const [x, w] = s.items[Math.min(index, s.items.length - 1)];
  const pos = s.w === w ? 0 : (x / (s.w - w)) * 100;
  return (
    <div
      role="img"
      aria-label={item.labels?.[index] ?? item.name}
      className={`mix-blend-multiply bg-no-repeat ${className}`}
      style={{ aspectRatio: `${w} / ${s.h}`, backgroundImage: `url("${asset(`${item.dir}/strip.jpg`)}")`, backgroundSize: `${(s.w / w) * 100}% 100%`, backgroundPosition: `${pos}% 0` }}
    />
  );
}

const Lead = ({ item, index, className }: { item: CatItem; index: number; className: string }) => {
  if (item.strip) return <Sprite item={item} index={index} className={className} />;
  if (item.hero) return <img src={asset(`${item.dir}/hero.jpg`)} alt={item.name} loading="lazy" draggable={false} className={`${className} object-contain mix-blend-multiply`} />;
  return null;
};

/* ───────────── Card ───────────── */

const chipDark = 'px-2.5 py-1 rounded-full bg-[#1d1a17]/85 text-[9px] font-semibold uppercase tracking-[0.22em] text-amber-100';
const chipBrand = 'px-2.5 py-1 rounded-full bg-white/80 border border-[#1d1a17]/15 text-[9px] font-bold uppercase tracking-[0.22em] text-[#1d1a17]';

export function CatCard({ item, open }: { item: CatItem; open: (it: CatItem, index: number) => void }) {
  const t = useT();
  const { lang } = useLanguage();
  const [index, setIndex] = useState(0);
  const n = item.strip?.items.length ?? 0;
  const hasLead = !!(item.strip || item.hero);
  const price = guidePrice(item);
  return (
    <article className="group h-full flex flex-col rounded-[2rem] bg-[#151311] border border-white/10 p-3 hover:border-amber-400/50 transition-colors duration-500">
      <button onClick={() => open(item, index)} className="relative block text-left" aria-label={`${item.name} — ${t(UI.details)}`}>
        <Plate className="h-[21rem]">
          {hasLead ? (
            <div className="absolute inset-x-0 top-10 bottom-0 flex items-end justify-center">
              <Lead item={item} index={index} className="h-full w-auto max-w-[82%] transition-transform duration-700 ease-out group-hover:scale-[1.035]" />
            </div>
          ) : item.scene && (
            <img src={asset(`${item.dir}/scene.jpg`)} alt={item.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
          )}
          {n > 1 && <span className={`absolute top-3 left-3 ${chipDark}`}>{n} {t(TX.variants)}</span>}
          <span className={`absolute top-3 right-3 ${chipBrand}`}>{item.brand}</span>
          <span className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-[#1d1a17]/85 text-amber-100 flex items-center justify-center opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
            <Expand className="w-4 h-4" />
          </span>
        </Plate>
      </button>
      <div className="flex-1 flex flex-col px-3 pt-5 pb-3">
        <div className="flex items-baseline justify-between gap-4 mb-1">
          <h3 className="font-display text-[1.7rem] leading-tight text-white">{item.name}</h3>
          <p className="text-amber-200 whitespace-nowrap">{price > 0 ? <><span className="text-white/45 text-xs mr-1">{t(UI.from)}</span>{euro(price)}</> : <span className="text-xs uppercase tracking-[0.2em] text-amber-200/80">{t(TX.onRequest)}</span>}</p>
        </div>
        <p className="text-amber-300/70 text-[11px] uppercase tracking-[0.28em] mb-4">{t(groupLabel(item.group))}</p>
        <p className="text-zinc-400 text-sm leading-relaxed mb-5 flex-1 line-clamp-3">{lang === 'PL' && item.descPL ? item.descPL : intro(item, t, lang)}</p>
        {n > 1 && (
          <div className="flex items-center gap-1.5 mb-5 overflow-hidden" role="group" aria-label={t(TX.nVariants)}>
            {item.strip!.items.slice(0, 7).map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={item.labels?.[i] ?? `${i + 1}`}
                title={item.labels?.[i]}
                aria-pressed={index === i}
                className={`shrink-0 w-8 h-11 rounded-md overflow-hidden bg-[#efe9dd] border-2 flex items-end justify-center transition-all ${index === i ? 'border-amber-400' : 'border-transparent opacity-60 hover:opacity-100'}`}
              >
                <Sprite item={item} index={i} className="h-full w-auto" />
              </button>
            ))}
            {n > 7 && <span className="text-white/40 text-xs ml-1">+{n - 7}</span>}
          </div>
        )}
        <button onClick={() => open(item, index)} className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold transition-colors">
          {t(UI.details)}
        </button>
      </div>
    </article>
  );
}

/* ───────────── Detail dialog ───────────── */

const Section = ({ title, items, open = false }: { title: string; items: string[]; open?: boolean }) => {
  const [on, setOn] = useState(open);
  if (!items.length) return null;
  return (
    <div className="border-b border-white/10">
      <button onClick={() => setOn(!on)} aria-expanded={on} className="w-full flex items-center justify-between gap-4 py-4 text-left group">
        <span className={`text-sm font-bold uppercase tracking-[0.25em] transition-colors ${on ? 'text-amber-200' : 'text-white group-hover:text-amber-100'}`}>{title}</span>
        <span className="flex items-center gap-3 text-white/40 text-xs">{items.length}<ChevronDown className={`w-4 h-4 transition-transform duration-300 ${on ? 'rotate-180 text-amber-300' : ''}`} /></span>
      </button>
      {on && (
        <ul className="pb-5 space-y-2.5">
          {items.map((s, i) => (
            <li key={i} lang="pl" className="flex gap-3 text-zinc-300 text-[15px] leading-relaxed">
              <span className="mt-[0.6em] w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />{s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const Fact = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="bg-[#141210] p-4">
    <dt className="text-[10px] uppercase tracking-[0.28em] text-white/45 mb-1.5">{label}</dt>
    <dd className="text-white text-[15px] leading-snug">{children}</dd>
  </div>
);

export function CatDialog({ item, start, onClose }: { item: CatItem; start: number; onClose: () => void }) {
  const t = useT();
  const { lang } = useLanguage();
  const { addCatalog } = useQuote();
  const n = item.strip?.items.length ?? 0;
  // view: -1 = room scene, otherwise a variant index
  const [view, setView] = useState(n || item.hero ? start : -1);
  const [done, setDone] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const price = guidePrice(item);
  const label = view >= 0 ? item.labels?.[view] : undefined;

  useEffect(() => {
    lockScroll(true);
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { lockScroll(false); window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const add = () => {
    addCatalog({ catId: item.id, name: item.name, brand: item.brand, variant: label ?? '', price });
    setDone(true);
    window.setTimeout(() => setDone(false), 1800);
  };

  const f = item.flags;
  const showOriginal = lang !== 'PL' && (item.constr.length + item.equip.length + item.opts.length + item.notes.length + item.frame.length > 0);

  return (
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center md:p-6" role="dialog" aria-modal="true" aria-label={item.name}>
      <button className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-default" onClick={onClose} aria-label={t(UI.close)} tabIndex={-1} />
      <div data-lenis-prevent className="relative w-full max-w-6xl h-[94svh] md:h-[88svh] overflow-hidden rounded-t-[2rem] md:rounded-[2rem] bg-[#141210] border border-white/10 shadow-2xl animate-[sd-sheet_.5s_cubic-bezier(.16,1,.3,1)] grid grid-cols-1 md:grid-cols-[1.05fr_0.95fr] grid-rows-[auto_1fr] md:grid-rows-1">
        <button ref={closeRef} onClick={onClose} aria-label={t(UI.close)} className="absolute top-4 right-4 z-20 w-11 h-11 rounded-full bg-black/60 border border-white/15 text-white flex items-center justify-center hover:border-amber-400 transition-colors">
          <X className="w-5 h-5" />
        </button>

        {/* gallery */}
        <div className="p-4 md:p-6 flex flex-col min-h-0 min-w-0">
          <Plate className={`flex-1 min-h-[34svh] md:min-h-0 flex items-end justify-center ${view === -1 ? '' : 'pt-8 px-8'}`}>
            {view === -1 && item.scene
              ? <img src={asset(`${item.dir}/scene.jpg`)} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
              : <Lead item={item} index={Math.max(0, view)} className="h-full max-h-full w-auto max-w-full" />}
            {label && <span className={`absolute top-3 left-3 ${chipDark}`}>{label}</span>}
          </Plate>
          {(n > 1 || (item.scene && (n > 0 || item.hero))) && (
            <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1 shrink-0">
              {item.scene && (
                <button onClick={() => setView(-1)} aria-label={t(TX.inRoom)} aria-pressed={view === -1} className={`shrink-0 w-24 h-20 rounded-xl overflow-hidden border-2 transition-all ${view === -1 ? 'border-amber-400' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                  <img src={asset(`${item.dir}/scene.jpg`)} alt="" loading="lazy" className="w-full h-full object-cover" />
                </button>
              )}
              {n === 0 && item.hero && (
                <button onClick={() => setView(0)} aria-pressed={view === 0} className={`shrink-0 w-14 h-20 rounded-xl overflow-hidden bg-[#efe9dd] border-2 ${view === 0 ? 'border-amber-400' : 'border-transparent opacity-70'}`}>
                  <img src={asset(`${item.dir}/hero.jpg`)} alt="" className="w-full h-full object-contain mix-blend-multiply p-1" />
                </button>
              )}
              {item.strip?.items.map((_, i) => (
                <button key={i} onClick={() => setView(i)} aria-label={item.labels?.[i] ?? `${i + 1}`} title={item.labels?.[i]} aria-pressed={view === i} className={`shrink-0 w-14 h-20 rounded-xl overflow-hidden bg-[#efe9dd] border-2 flex items-end justify-center pt-1 transition-all ${view === i ? 'border-amber-400' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                  <Sprite item={item} index={i} className="h-full w-auto" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* information */}
        <div className="min-h-0 min-w-0 overflow-y-auto p-6 md:p-10 md:pl-4">
          <p className="text-amber-300/80 text-[11px] font-medium uppercase tracking-[0.4em] mb-4">{item.brand} · {t(groupLabel(item.group))}</p>
          <h2 className="font-display text-5xl md:text-6xl text-white leading-none mb-3 pr-12">{item.name}</h2>
          {lang === 'PL' && item.tagline && <p className="font-display italic text-2xl text-amber-100/90 mb-5">{item.tagline}</p>}
          <p className="text-zinc-300 text-lg leading-relaxed mb-3">{intro(item, t, lang)}</p>
          {item.descPL && <p lang="pl" className={`leading-relaxed mb-6 ${lang === 'PL' ? 'text-zinc-300 text-lg' : 'text-zinc-500 text-sm italic'}`}>{lang === 'PL' ? item.descPL : `„${item.descPL}”`}</p>}

          <div className="flex flex-wrap items-end justify-between gap-4 py-6 border-y border-white/10 mb-8">
            <div>
              {price > 0
                ? <><p className="font-display text-5xl bb-text-gold leading-none">{euro(price)}</p><p className="text-white/55 text-sm mt-1">{t(UI.from)} · {t(UI.inclVat)}</p></>
                : <p className="font-display text-4xl bb-text-gold leading-none">{t(TX.onRequest)}</p>}
              {label && <p className="text-white/45 text-xs mt-2">{t(TX.chosen)}: <span className="text-amber-200">{label}</span></p>}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={add} className={`inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-bold transition-colors ${done ? 'bg-amber-200 text-black' : 'bg-amber-500 hover:bg-amber-400 text-black'}`}>
                {done ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />} {t(done ? UI.added : UI.addToQuote)}
              </button>
              <Link to="/offertelijst" onClick={onClose} className="inline-flex items-center justify-center px-6 py-3.5 rounded-full border border-zinc-700 hover:border-amber-500 text-white font-bold transition-colors">{t(TX.ask)}</Link>
            </div>
          </div>

          <h3 className="text-[11px] uppercase tracking-[0.4em] text-white/45 mb-4">{t(TX.facts)}</h3>
          <dl className="grid grid-cols-2 gap-px bg-white/10 rounded-2xl overflow-hidden mb-8">
            <Fact label={t(TX.maker)}>{item.brand}</Fact>
            <Fact label={t(TX.type)}>{t(groupLabel(item.group))}</Fact>
            {n > 0 && <Fact label={t(TX.nVariants)}>{n}</Fact>}
            {item.widths && <Fact label={t(TX.widths)}>{item.widths[0]}–{item.widths[1]} {t(TX.cm)}</Fact>}
            {item.brand === 'Invado' && item.cat === 'binnen' && <Fact label={t(TX.fit)}>{t(f.flush ? TX.fitBoth : TX.fitRebated)}</Fact>}
            {f.double && <Fact label={t(TX.double)}>{t(TX.yes)}</Fact>}
            {f.sliding && <Fact label={t(TX.sliding)}>{t(TX.yes)}</Fact>}
            {f.vent && <Fact label={t(TX.vent)}>{t(TX.yes)}</Fact>}
          </dl>

          {item.coats.length > 0 && (
            <div className="mb-8">
              <h3 className="text-[11px] uppercase tracking-[0.4em] text-white/45 mb-4">{t(TX.colours)} · {item.coats.length}</h3>
              <div className="flex flex-wrap gap-1.5">
                {item.coats.map((c) => <span key={c} lang="pl" className="px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs">{c}</span>)}
              </div>
            </div>
          )}

          {showOriginal && <p className="text-white/40 text-xs mb-2">{t(TX.original)}</p>}
          <div className="border-t border-white/10">
            <Section title={t(TX.constr)} items={item.constr} open />
            <Section title={t(TX.equip)} items={item.equip} />
            <Section title={t(TX.equip2)} items={item.equip2} />
            <Section title={t(TX.frame)} items={item.frame} />
            <Section title={t(TX.opts)} items={item.opts} />
            <Section title={t(TX.notes)} items={item.notes} />
          </div>
          <p className="text-white/35 text-xs mt-6">{t(TX.source)} {item.brand} {item.brand === 'Invado' ? '2/2021' : '2/2013'}, p. {item.page}. {t(UI.indicative)}</p>
        </div>
      </div>
      <style>{`@keyframes sd-sheet{from{opacity:0;transform:translateY(40px) scale(.98)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
