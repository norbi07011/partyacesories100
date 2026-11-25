import { SizeForm } from './components/SizeForm';
import { emptySpec, formFor, missing as missingFields, specText } from './spec';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, ChevronDown, Expand, Minus, Plus, X } from 'lucide-react';
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

export type CatCat = 'ramen' | 'binnen' | 'entree' | 'buiten' | 'schuif' | 'technisch' | 'kozijn' | 'beslag' | 'zonwering' | 'garage' | 'glas';
/** Variant sprite: tiles of equal height, laid out in one or more rows. items: [x, width, row?] */
type Strip = { w: number; h: number; rows?: number; items: [number, number, number?][] };
export type CatItem = {
  id: string;
  brand: 'Invado' | 'Porta' | 'Eko-Okna';
  /** Eko-Okna items: Dutch text from the manufacturer's Dutch site. */
  descNL?: string;
  features?: string[];
  tech?: string[];
  nl?: boolean; // system made for the Dutch market (block profile)
  gallery?: number; // extra photos g1.webp … gN.webp
  url?: string;
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
    // sharp, recent photography first; the older catalogue scans follow
    .then((d) => d.map((it, i) => [it, i] as const).sort((a, b) => (RANK[a[0].brand] ?? 9) - (RANK[b[0].brand] ?? 9) || a[1] - b[1]).map(([it]) => it))
    .catch(() => []);
  return cache;
};

const RANK: Record<string, number> = { 'Eko-Okna': 0, Invado: 1, Porta: 2 };

export function useCatalog() {
  const [items, setItems] = useState<CatItem[]>([]);
  useEffect(() => {
    let on = true;
    load().then((d) => { if (on) setItems(d); });
    return () => { on = false; };
  }, []);
  return items;
}

/** true once the catalogue request has settled (with or without items). */
export function useCatalogReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    load().then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

/** Guide price in euro derived from the factory list price (see PRICING in company.ts). */
export const guidePrice = (it: CatItem) =>
  // The Porta catalogue is from 2013: its prices are too old to derive a guide price from.
  it.net && it.brand === 'Invado' ? Math.ceil((it.net / PRICING.plnPerEur) * PRICING.markup / 10) * 10 - 1 : 0;

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
  custom: ['Maatwerk', 'Custom', 'Na wymiar'],
  bespoke: ['Volledig op maat gemaakt. Afmetingen, indeling, kleur en glas leggen we samen vast bij het inmeten.', 'Fully made to measure. We settle sizes, layout, colour and glass together at the survey.', 'W całości na wymiar. Wymiary, podział, kolor i szkło ustalamy wspólnie przy pomiarze.'],
  features: ['Eigenschappen', 'Features', 'Cechy'],
  nlMarket: ['Voor de Nederlandse markt', 'Made for the Dutch market', 'Na rynek holenderski'],
  left: ['Linksdraaiend', 'Left-hung', 'Lewe'],
  right: ['Rechtsdraaiend', 'Right-hung', 'Prawe'],
  widthCm: ['Breedte (cm)', 'Width (cm)', 'Szerokość (cm)'],
  heightCm: ['Hoogte (cm)', 'Height (cm)', 'Wysokość (cm)'],
  swing: ['Draairichting', 'Swing direction', 'Kierunek'],
  choose: ['Kies in overleg', 'Decide together later', 'Do ustalenia'],
  sizeNote: ['Nederlandse standaardmaten. De exacte maat leggen we vast bij het inmeten.', 'Dutch standard sizes. The exact size is fixed at the survey.', 'Holenderskie wymiary standardowe. Dokładny wymiar ustalamy przy pomiarze.'],
  openPage: ['Open productpagina', 'Open product page', 'Otwórz stronę produktu'],
  toList: ['Naar de offertelijst', 'Go to quote list', 'Przejdź do listy wyceny'],
} satisfies Record<string, L>;

/** One generated sentence per item, so NL/EN visitors get a readable intro. */
export const intro = (it: CatItem, t: (l: L) => string, lang: string) => {
  if (it.descNL) return it.descNL;
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
export function Sprite({ item, index, className = '', cap = true }: { item: CatItem; index: number; className?: string; cap?: boolean }) {
  const s = item.strip;
  if (!s) return null;
  const [x, w, row = 0] = s.items[Math.min(index, s.items.length - 1)];
  const rows = s.rows ?? 1;
  const px = s.w === w ? 0 : (x / (s.w - w)) * 100;
  const py = rows === 1 ? 0 : (row / (rows - 1)) * 100;
  return (
    <div
      role="img"
      aria-label={item.labels?.[index] ?? item.name}
      className={`mix-blend-multiply bg-no-repeat ${className}`}
      style={{ maxHeight: cap ? s.h : undefined, aspectRatio: `${w} / ${s.h}`, backgroundImage: `url("${asset(`${item.dir}/strip.webp`)}")`, backgroundSize: `${(s.w / w) * 100}% ${rows * 100}%`, backgroundPosition: `${px}% ${py}%` }}
    />
  );
}

/** index -2 = the collection's cover photo (when it has one), otherwise a version from the strip. */
const Lead = ({ item, index, className }: { item: CatItem; index: number; className: string }) => {
  if (item.hero && (index === -2 || !item.strip)) return <img src={asset(`${item.dir}/hero.webp`)} alt={item.name} loading="lazy" draggable={false} style={{ maxHeight: item.hero[1] }} className={`${className} object-contain mix-blend-multiply`} />;
  if (item.strip) return <Sprite item={item} index={Math.max(0, index)} className={className} />;
  return null;
};

/* ───────────── Card ───────────── */

const tag = 'text-[9px] font-semibold uppercase tracking-[0.26em] text-[#1d1a17]/60';
const chipDark = 'px-2.5 py-1 rounded-full bg-[#1d1a17]/85 text-[9px] font-semibold uppercase tracking-[0.22em] text-white';

export function CatCard({ item, open }: { item: CatItem; open: (it: CatItem, index: number) => void }) {
  const t = useT();
  const { lang } = useLanguage();
  const n = item.strip?.items.length ?? 0;
  const [index, setIndex] = useState(item.hero ? -2 : 0);
  const hasLead = !!(item.strip || item.hero);
  const price = guidePrice(item);
  // old, low-resolution catalogue scans are shown smaller instead of being blown up
  const weak = item.brand === 'Porta' || (item.strip ? item.strip.h < 420 : false);
  return (
    <article className="group h-full">
      <button onClick={() => open(item, Math.max(0, index))} className="block w-full text-left" aria-label={`${item.name} — ${t(UI.details)}`}>
        <span className="relative block aspect-[4/5] overflow-hidden bg-[#efece6]">
          {hasLead ? (
            <span className={`absolute flex items-center justify-center ${weak ? 'inset-[18%]' : 'inset-[7%]'}`}>
              <Lead item={item} index={index} className="h-full w-auto max-w-full transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]" />
            </span>
          ) : item.scene && (
            <img src={asset(`${item.dir}/scene.webp`)} alt={item.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]" />
          )}
          {item.nl && <span className="absolute top-4 left-4 text-[9px] font-medium uppercase tracking-[0.26em] text-[#1d1a17]/70">NL-profiel</span>}
        </span>
        <span className="flex items-baseline justify-between gap-4 pt-5">
          <span className="font-display text-[1.7rem] leading-tight text-white">{item.name}</span>
          <span className="text-white/45 text-[10px] uppercase tracking-[0.22em] whitespace-nowrap">{price > 0 ? `${t(UI.from)} ${euro(price)}` : n > 1 ? `${n} ${t(TX.variants)}` : item.brand}</span>
        </span>
        <span className="block text-white/45 text-sm font-light leading-relaxed mt-1.5 line-clamp-1">{t(groupLabel(item.group))}</span>
      </button>
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
        <span className={`text-[11px] font-medium uppercase tracking-[0.28em] transition-colors ${on ? 'text-amber-100' : 'text-white/70 group-hover:text-white'}`}>{title}</span>
        <span className="flex items-center gap-3 text-white/40 text-xs">{items.length}<ChevronDown className={`w-4 h-4 transition-transform duration-300 ${on ? 'rotate-180 text-amber-300' : ''}`} /></span>
      </button>
      {on && (
        <ul className="pb-5 space-y-2.5">
          {items.map((s, i) => (
            <li key={i} lang="pl" className="flex gap-3 text-white/65 font-light text-[15px] leading-relaxed">
              <span className="mt-[0.75em] w-3 h-px bg-amber-200/60 shrink-0" />{s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const Fact = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="py-4 border-b border-white/10">
    <dt className="text-[10px] uppercase tracking-[0.28em] text-white/45 mb-1.5">{label}</dt>
    <dd className="text-white text-[15px] leading-snug">{children}</dd>
  </div>
);

type BodyProps = { item: CatItem; start: number; onNavigate?: () => void; page?: boolean };

/** Gallery + all information + order options. Used by the quick-view dialog and the product page. */
export function CatBody({ item, start, onNavigate, page = false }: BodyProps) {
  const t = useT();
  const { lang } = useLanguage();
  const { addCatalog, count } = useQuote();
  const n = item.strip?.items.length ?? 0;
  // view: -2 = cover photo, -1 = room scene, otherwise a version index
  const [view, setView] = useState(item.hero ? -2 : n ? start : -1);
  const [variant, setVariant] = useState(Math.min(start, Math.max(0, n - 1)));
  const [colour, setColour] = useState('');
  const [width, setWidth] = useState<number | 'maat'>(83);
  const [height, setHeight] = useState<number | 'maat'>(201.5);
  const [hinge, setHinge] = useState<'L' | 'R'>('L');
  const [qty, setQty] = useState(1);
  const [done, setDone] = useState(false);
  const price = guidePrice(item);
  const label = n > 0 ? item.labels?.[variant] : undefined;
  const isDoor = ['binnen', 'entree', 'buiten', 'technisch', 'schuif'].includes(item.cat) && item.brand !== 'Eko-Okna';
  const pick = (i: number) => { setView(i); setVariant(i); setDone(false); };
  // every made-to-measure product type has its own order form (see spec.ts)
  const form = formFor(item);
  const [spec, setSpec] = useState(() => (form ? emptySpec(form) : null));
  const [gaps, setGaps] = useState<string[]>([]);

  const add = () => {
    if (form && spec) {
      const m = missingFields(form, spec);
      setGaps(m);
      // take the customer to the first thing that is still open
      if (m.length) { requestAnimationFrame(() => document.querySelector('[data-gap]')?.scrollIntoView({ block: 'center', behavior: 'smooth' })); return; }
    }
    const parts = [label ?? ''];
    if (form && spec) parts.push(specText(spec));
    if (colour) parts.push(colour);
    if (isDoor) {
      parts.push(`${width === 'maat' ? t(TX.custom) : width} × ${height === 'maat' ? t(TX.custom) : String(height).replace('.', ',')} cm`);
      parts.push(t(hinge === 'L' ? TX.left : TX.right));
    }
    addCatalog({ catId: item.id, name: item.name, brand: item.brand, variant: parts.filter(Boolean).join(' · '), price, ...(form && spec ? { spec: { ...spec, model: label } } : {}) }, qty);
    setDone(true);
    window.setTimeout(() => setDone(false), 2000);
  };

  const f = item.flags;
  const showOriginal = lang !== 'PL' && item.brand !== 'Eko-Okna' && (item.constr.length + item.equip.length + item.opts.length + item.notes.length + item.frame.length > 0);
  const opt = (on: boolean) => `px-3.5 py-2 text-sm border transition-colors ${on ? 'border-amber-200 text-white bg-white/[0.04]' : 'border-white/15 text-white/55 hover:text-white hover:border-white/40'}`;
  const optLabel = 'text-[10px] uppercase tracking-[0.28em] text-white/45 mb-2.5';

  return (
    <div className={`grid grid-cols-1 md:grid-cols-[1.05fr_0.95fr] ${page ? 'gap-6 md:gap-12 items-start' : 'h-full grid-rows-[auto_1fr] md:grid-rows-1'}`}>
      {/* gallery */}
      <div className={`flex flex-col min-h-0 min-w-0 ${page ? 'md:sticky md:top-28' : 'p-4 md:p-6'}`}>
        <Plate className={`${page ? 'h-[56svh] min-h-[360px]' : 'flex-1 min-h-[34svh] md:min-h-0'} flex items-end justify-center ${view === -1 ? '' : 'pt-10 px-8 pb-[4%]'}`}>
          {view === -1 && item.scene
            ? <img src={asset(`${item.dir}/scene.webp`)} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
            : view >= 100
              ? <img src={asset(`${item.dir}/g${view - 99}.webp`)} alt={item.name} className="max-h-full max-w-full object-contain mix-blend-multiply" />
              : <Lead item={item} index={view} className="h-full max-h-full w-auto max-w-full" />}
          {view >= 0 && item.labels?.[view] && <span className={`absolute top-3 left-3 ${chipDark}`}>{item.labels[view]}</span>}
        </Plate>
        {(n + (item.hero ? 1 : 0) + (item.scene ? 1 : 0) + (item.gallery ?? 0) > 1) && (
          <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1 shrink-0">
            {item.scene && (
              <button onClick={() => setView(-1)} aria-label={t(TX.inRoom)} aria-pressed={view === -1} className={`shrink-0 w-24 h-20 rounded-lg overflow-hidden border-2 transition-all ${view === -1 ? 'border-amber-400' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                <img src={asset(`${item.dir}/scene.webp`)} alt="" loading="lazy" className="w-full h-full object-cover" />
              </button>
            )}
            {item.hero && (
              <button onClick={() => setView(-2)} aria-pressed={view === -2} className={`shrink-0 w-14 h-20 rounded-lg overflow-hidden bg-[#f4f2ee] border-2 ${view === -2 ? 'border-amber-400' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                <img src={asset(`${item.dir}/hero.webp`)} alt="" className="w-full h-full object-contain mix-blend-multiply p-1" />
              </button>
            )}
            {Array.from({ length: item.gallery ?? 0 }, (_, i) => (
              <button key={`g${i}`} onClick={() => setView(100 + i)} aria-pressed={view === 100 + i} className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-[#f4f2ee] border-2 transition-all ${view === 100 + i ? 'border-amber-400' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                <img src={asset(`${item.dir}/g${i + 1}.webp`)} alt="" loading="lazy" className="w-full h-full object-contain mix-blend-multiply p-1" />
              </button>
            ))}
            {item.strip?.items.map((_, i) => (
              <button key={i} onClick={() => pick(i)} aria-label={item.labels?.[i] ?? `${i + 1}`} title={item.labels?.[i]} aria-pressed={view === i} className={`shrink-0 w-14 h-20 rounded-lg overflow-hidden bg-[#f4f2ee] border-2 flex items-end justify-center pt-1 transition-all ${view === i ? 'border-amber-400' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                <Sprite item={item} index={i} className="h-full w-auto" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* information */}
      <div className={`min-w-0 ${page ? '' : 'min-h-0 overflow-y-auto p-6 md:p-10 md:pl-4'}`}>
        <p className="sd-label mb-5">{item.brand} · {t(groupLabel(item.group))}</p>
        {page
          ? <h1 className="font-display text-5xl md:text-7xl text-white leading-none mb-3">{item.name}</h1>
          : <h2 className="font-display text-5xl md:text-6xl text-white leading-none mb-3 pr-12">{item.name}</h2>}
        {lang === 'PL' && item.tagline && <p className="font-display italic text-2xl text-amber-100/90 mb-5">{item.tagline}</p>}
        <p className="text-white/65 font-light text-lg leading-relaxed mb-3 max-w-xl">{intro(item, t, lang)}</p>
        {item.descPL && <p lang="pl" className={`leading-relaxed mb-4 ${lang === 'PL' ? 'text-zinc-300 text-lg' : 'text-zinc-500 text-sm italic'}`}>{lang === 'PL' ? item.descPL : `„${item.descPL}”`}</p>}
        {!page && <Link to={`/product/${item.id}`} onClick={onNavigate} className="inline-flex items-center gap-1.5 text-amber-300/80 hover:text-amber-200 text-sm underline underline-offset-4 mb-2">{t(TX.openPage)}</Link>}

        {/* order options */}
        <div className="mt-8 pt-8 border-t border-white/10 space-y-6">
          {n > 1 && (
            <div>
              <p className={optLabel}>{t(TX.nVariants)}</p>
              <div className="flex flex-wrap gap-1.5">
                {(item.labels ?? item.strip!.items.map((_, k) => String(k + 1))).map((l, i) => <button key={i} onClick={() => pick(i)} aria-pressed={variant === i} className={opt(variant === i)}>{l}</button>)}
              </div>
            </div>
          )}
          {item.coats.length > 0 && !form && (
            <div>
              <label className={`block ${optLabel}`} htmlFor={`col-${item.id}`}>{t(TX.colours)}</label>
              <select id={`col-${item.id}`} value={colour} onChange={(e) => setColour(e.target.value)} className="w-full max-w-xs py-2.5 text-white text-sm">
                <option value="">{t(TX.choose)}</option>
                {item.coats.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          {isDoor && (
            <>
              <div>
                <p className={optLabel}>{t(TX.widthCm)}</p>
                <div className="flex flex-wrap gap-1.5">
                  {[63, 68, 73, 78, 83, 88, 93].map((w) => <button key={w} onClick={() => setWidth(w)} className={opt(width === w)}>{w}</button>)}
                  <button onClick={() => setWidth('maat')} className={opt(width === 'maat')}>{t(TX.custom)}</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-8 gap-y-5">
                <div>
                  <p className={optLabel}>{t(TX.heightCm)}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[201.5, 211.5, 231.5].map((h) => <button key={h} onClick={() => setHeight(h)} className={opt(height === h)}>{String(h).replace('.', ',')}</button>)}
                    <button onClick={() => setHeight('maat')} className={opt(height === 'maat')}>{t(TX.custom)}</button>
                  </div>
                </div>
                <div>
                  <p className={optLabel}>{t(TX.swing)}</p>
                  <div className="flex gap-1.5">
                    <button onClick={() => setHinge('L')} className={opt(hinge === 'L')}>{t(TX.left)}</button>
                    <button onClick={() => setHinge('R')} className={opt(hinge === 'R')}>{t(TX.right)}</button>
                  </div>
                </div>
              </div>
              <p className="text-white/40 text-xs">{t(TX.sizeNote)}</p>
            </>
          )}
          {form && spec
            ? <SizeForm form={form} spec={spec} coats={item.coats} missing={gaps} onChange={(n) => { setSpec(n); if (gaps.length) setGaps(missingFields(form, n)); setDone(false); }} />
            : item.brand === 'Eko-Okna' && <p className="text-white/55 text-sm">{t(TX.bespoke)}</p>}
          <div className="flex flex-wrap items-end justify-between gap-6 pt-7 border-t border-white/10">
            <div>
              {price > 0
                ? <><p className="font-display text-5xl text-white leading-none">{euro(price * qty)}</p><p className="text-white/55 text-sm mt-1">{t(UI.from)} · {t(UI.inclVat)}</p></>
                : <p className="sd-label">{t(TX.onRequest)}</p>}
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center h-[3.25rem] border border-white/20">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="−" className="w-10 h-11 flex items-center justify-center text-white hover:text-amber-300"><Minus className="w-4 h-4" /></button>
                <span className="w-6 text-center text-white tabular-nums" aria-live="polite">{qty}</span>
                <button onClick={() => setQty((q) => Math.min(99, q + 1))} aria-label="+" className="w-10 h-11 flex items-center justify-center text-white hover:text-amber-300"><Plus className="w-4 h-4" /></button>
              </div>
              <button onClick={add} className="sd-btn">
                {done ? <Check className="w-4 h-4" /> : null} {t(done ? UI.added : TX.ask)}
              </button>
            </div>
          </div>
          {(done || count > 0) && (
            <Link to="/offertelijst" onClick={onNavigate} className="sd-link">{t(TX.toList)} ({count})</Link>
          )}
        </div>

        <h3 className="sd-label mt-14 mb-5">{t(TX.facts)}</h3>
        <dl className="grid grid-cols-2 gap-x-10 border-t border-white/10 mb-10">
          <Fact label={t(TX.maker)}>{item.brand}</Fact>
          {item.nl && <Fact label="NL">{t(TX.nlMarket)}</Fact>}
          {(item.tech ?? []).map((x) => { const m = x.match(/^(\S+)\s+(.*)$/); return m ? <Fact key={x} label={m[2]}>{m[1]}</Fact> : null; })}
          <Fact label={t(TX.type)}>{t(groupLabel(item.group))}</Fact>
          {n > 0 && <Fact label={t(TX.nVariants)}>{n}</Fact>}
          {item.widths && <Fact label={t(TX.widths)}>{item.widths[0]}–{item.widths[1]} {t(TX.cm)}</Fact>}
          {item.brand === 'Invado' && item.cat === 'binnen' && <Fact label={t(TX.fit)}>{t(f.flush ? TX.fitBoth : TX.fitRebated)}</Fact>}
          {f.double && <Fact label={t(TX.double)}>{t(TX.yes)}</Fact>}
          {f.sliding && <Fact label={t(TX.sliding)}>{t(TX.yes)}</Fact>}
          {f.vent && <Fact label={t(TX.vent)}>{t(TX.yes)}</Fact>}
        </dl>

        {showOriginal && <p className="text-white/40 text-xs mb-2">{t(TX.original)}</p>}
        <div className="border-t border-white/10">
          <Section title={t(TX.features)} items={item.features ?? []} open />
          <Section title={t(TX.constr)} items={item.constr} open />
          <Section title={t(TX.equip)} items={item.equip} open={page} />
          <Section title={t(TX.equip2)} items={item.equip2} />
          <Section title={t(TX.frame)} items={item.frame} />
          <Section title={t(TX.opts)} items={item.opts} />
          <Section title={t(TX.notes)} items={item.notes} />
        </div>
        <p className="text-white/35 text-xs mt-6">{item.brand === 'Eko-Okna' ? 'Bron: ekookna.nl.' : `${t(TX.source)} ${item.brand} ${item.brand === 'Invado' ? '2/2021' : '2/2013'}, p. ${item.page}.`} {t(UI.indicative)}</p>
      </div>
    </div>
  );
}

export function CatDialog({ item, start, onClose }: { item: CatItem; start: number; onClose: () => void }) {
  const t = useT();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    lockScroll(true);
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { lockScroll(false); window.removeEventListener('keydown', onKey); };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center md:p-6" role="dialog" aria-modal="true" aria-label={item.name}>
      <button className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-default" onClick={onClose} aria-label={t(UI.close)} tabIndex={-1} />
      <div data-lenis-prevent className="relative w-full max-w-6xl h-[94svh] md:h-[88svh] overflow-hidden rounded-t-[2rem] md:rounded-[2rem] bg-[#141210] border border-white/10 shadow-2xl animate-[sd-sheet_.5s_cubic-bezier(.16,1,.3,1)]">
        <button ref={closeRef} onClick={onClose} aria-label={t(UI.close)} className="absolute top-4 right-4 z-20 w-11 h-11 rounded-full bg-black/60 border border-white/15 text-white flex items-center justify-center hover:border-amber-400 transition-colors">
          <X className="w-5 h-5" />
        </button>
        <CatBody item={item} start={start} onNavigate={onClose} />
      </div>
      <style>{`@keyframes sd-sheet{from{opacity:0;transform:translateY(40px) scale(.98)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}

/** A catalogue cover photo on a studio plate, for page headers. Renders nothing without the catalogue. */
export function CatPhoto({ id, className = '', bare = false }: { id: string; className?: string; bare?: boolean }) {
  const item = useCatalog().find((c) => c.id === id);
  if (!item || !(item.hero || item.strip)) return null;
  if (bare) return <Lead item={item} index={-2} className={className} />;
  return (
    <Plate className={`flex items-end justify-center pt-8 pb-[4%] px-6 ${className}`}>
      <Lead item={item} index={-2} className="h-full w-auto max-w-full" />
    </Plate>
  );
}
