import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, CheckCircle2, Expand, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { useT, euro, type L } from '../i18n';
import { UI, useDocumentTitle } from '../ui';
import {
  MODELS, PRODUCTS, FINISHES, defaultConfig, modelById, modelImages, type DoorModel, type Product,
} from '../data/doors';
import { useQuote } from '../quote';
import { Door, DoorVisual, Plate, ProductArt, asset } from '../components/Door';
import { PageHero, Badge } from '../components/PageHero';
import { flyTo, lockScroll } from '../fx/core';
import { CTA } from './Home';
import { useCatalog, CatCard, CatDialog, CatPhoto, groupLabel, guidePrice, type CatItem } from '../catalog';

type Cat = 'all' | 'ramen' | 'binnen' | 'buiten' | 'schuif' | 'kozijn' | 'zonwering' | 'garage' | 'glas' | 'technisch' | 'systeem' | 'beslag';
type Brand = 'all' | 'Eko-Okna' | 'Invado' | 'Porta' | 'huis';
const CATS: Cat[] = ['ramen', 'binnen', 'buiten', 'schuif', 'kozijn', 'zonwering', 'garage', 'glas', 'technisch', 'systeem', 'beslag'];

const TX = {
  title: ['Ramen, deuren & kozijnen', 'Windows, doors & frames', 'Okna, drzwi i futryny'],
  windows: ['Ramen', 'Windows', 'Okna'],
  shading: ['Rolluiken & horren', 'Shutters & insect screens', 'Rolety i moskitiery'],
  garage: ['Garagedeuren', 'Garage doors', 'Bramy garażowe'],
  glass: ['Glas', 'Glazing', 'Szyby'],
  pick: ['Kies een categorie', 'Choose a category', 'Wybierz kategorię'],
  products: ['producten', 'products', 'produktów'],
  sub: [
    'Ramen, binnen- en buitendeuren, schuifpuien, kozijnen en beslag van drie fabrikanten, elk op maat te maken. Zet je favorieten op de offertelijst.',
    'Windows, interior and exterior doors, sliding systems, frames and hardware from three manufacturers, each made to measure. Put your favourites on the quote list.',
    'Okna, drzwi wewnętrzne i zewnętrzne, systemy przesuwne, futryny i okucia trzech producentów, wszystko na wymiar. Dodaj ulubione do listy wyceny.',
  ],
  badge: ['Collectie', 'Collection', 'Kolekcja'],
  kinds: {
    draai: ['Draaideur', 'Hinged door', 'Drzwi rozwierane'],
    schuif: ['Schuifdeur', 'Sliding door', 'Drzwi przesuwne'],
    taats: ['Taatsdeur', 'Pivot door', 'Drzwi osiowe'],
  },
  systems: ['Systemen & afwerking', 'Systems & finishing', 'Systemy i wykończenie'],
  entrance: ['Voordeuren & entree', 'Front & entrance doors', 'Drzwi wejściowe'],
  sliding: ['Schuif & vouw', 'Sliding & folding', 'Przesuwne i łamane'],
  technical: ['Technisch', 'Technical', 'Techniczne'],
  allBrands: ['Alle merken', 'All brands', 'Wszystkie marki'],
  search: ['Zoek op naam, bijvoorbeeld Corato of klamka', 'Search by name, for example Corato', 'Szukaj po nazwie, np. Corato lub klamka'],
  sortCat: ['Catalogusvolgorde', 'Catalogue order', 'Kolejność katalogowa'],
  sortName: ['Naam A–Z', 'Name A–Z', 'Nazwa A–Z'],
  sortLow: ['Prijs laag–hoog', 'Price low–high', 'Cena rosnąco'],
  sortHigh: ['Prijs hoog–laag', 'Price high–low', 'Cena malejąco'],
  sort: ['Sorteren', 'Sort', 'Sortuj'],
  none: ['Niets gevonden. Probeer een andere zoekterm of filter.', 'Nothing found. Try another search term or filter.', 'Nic nie znaleziono. Spróbuj innej frazy lub filtra.'],
  results: ['Zoekresultaten', 'Search results', 'Wyniki wyszukiwania'],
  quoteShort: ['Offerte', 'Quote', 'Wycena'],
  house: ['Huiscollectie', 'House collection', 'Kolekcja własna'],
  houseTitle: ['Huiscollectie · zelf samen te stellen', 'House collection · configure it yourself', 'Kolekcja własna · do samodzielnej konfiguracji'],
  double: ['dubbel', 'double', 'podwójne'],
  count: ['resultaten', 'results', 'wyników'],
  colourHint: ['Kleur', 'Colour', 'Kolor'],
  variants: ['uitvoeringen', 'versions', 'wariantów'],
  variant: ['Uitvoering', 'Version', 'Wariant'],
  details: ['Bekijk details', 'View details', 'Zobacz szczegóły'],
  inRoom: ['In het interieur', 'In the room', 'We wnętrzu'],
  note: [
    'Staat jouw deur er niet tussen? We maken ook deuren naar eigen ontwerp of naar het voorbeeld van je bestaande deuren.',
    'Is your door not listed? We also make doors to your own design or matching your existing ones.',
    'Nie ma tu Twoich drzwi? Wykonujemy też drzwi według projektu lub na wzór istniejących.',
  ],
} satisfies Record<string, L | Record<string, L>>;

const chipDark = 'text-[9px] font-semibold uppercase tracking-[0.26em] text-[#1d1a17]/60';
const chipBrand = chipDark;

/* A photo that renders nothing when the file is missing, so the layout stays intact. */
const Photo = ({ src, alt, className, fallback = null }: { src: string; alt: string; className: string; fallback?: ReactNode }) => {
  const [ok, setOk] = useState(true);
  if (!ok) return <>{fallback}</>;
  return <img src={asset(src)} alt={alt} loading="lazy" draggable={false} onError={() => setOk(false)} className={className} />;
};

/** Drawing shown while a product has no (loadable) photo. */
const FALLBACK_ART: Record<string, NonNullable<Product['art']>> = {
  kozijn: 'frame-wood', beslag: 'handle', systeem: 'seal',
  zawiasy: 'hinge', wkladka: 'lock', uszczelka: 'seal', prog: 'seal', wentylacja: 'seal',
};
const fallbackArt = (p: Product) => p.art ?? FALLBACK_ART[p.id] ?? FALLBACK_ART[p.cat] ?? 'handle';

/* ───────────── Detail dialog ───────────── */

type Detail =
  | { kind: 'door'; m: DoorModel; index: number }
  | { kind: 'product'; p: Product };

const DetailDialog = ({ detail, onClose }: { detail: Detail; onClose: () => void }) => {
  const t = useT();
  const { addDoor, addProduct } = useQuote();
  const [index, setIndex] = useState(detail.kind === 'door' ? detail.index : 0);
  const [done, setDone] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    lockScroll(true);
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { lockScroll(false); window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const isDoor = detail.kind === 'door';
  const images = isDoor ? modelImages(detail.m) : { variants: detail.p.photos ?? [], scene: undefined };
  const all = [...images.variants, ...(images.scene ? [images.scene] : [])];
  const current = all[Math.min(index, all.length - 1)];
  const isScene = current !== undefined && (current === images.scene || (!isDoor && !!detail.p.cover));
  const title = isDoor ? detail.m.name : t(detail.p.name);
  const price = isDoor ? detail.m.price : detail.p.price;
  const brand = isDoor ? detail.m.brand : detail.p.brand;

  const add = () => {
    if (isDoor) addDoor(defaultConfig(detail.m));
    else addProduct(detail.p.id);
    setDone(true);
    window.setTimeout(() => setDone(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center md:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-default" onClick={onClose} aria-label={t(UI.close)} tabIndex={-1} />
      <div data-lenis-prevent className="relative w-full max-w-6xl max-h-[94svh] overflow-y-auto rounded-t-[2rem] md:rounded-[2rem] bg-[#141210] border border-white/10 shadow-2xl animate-[sd-sheet_.5s_cubic-bezier(.16,1,.3,1)]">
        <button ref={closeRef} onClick={onClose} aria-label={t(UI.close)} className="absolute top-4 right-4 z-10 w-11 h-11 rounded-full bg-black/60 border border-white/15 text-white flex items-center justify-center hover:border-amber-400 transition-colors">
          <X className="w-5 h-5" />
        </button>
        <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr]">
          <div className="p-4 md:p-6">
            <Plate className={`flex items-center justify-center ${isScene ? '' : 'p-6 md:p-10'} h-[46svh] md:h-[66svh] min-h-[320px]`}>
              {current
                ? <img src={asset(current)} alt={title} className={isScene ? 'w-full h-full object-cover' : 'max-h-full max-w-full object-contain mix-blend-multiply'} />
                : isDoor
                  ? <Door model={detail.m} className="h-full w-auto drop-shadow-[0_18px_24px_rgba(60,45,25,.45)]" />
                  : detail.p.art && <ProductArt art={detail.p.art} className="h-full w-auto" />}
            </Plate>
            {all.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
                {all.map((src, i) => (
                  <button
                    key={src}
                    onClick={() => setIndex(i)}
                    aria-label={src === images.scene ? t(TX.inRoom) : `${t(TX.variant)} ${i + 1}`}
                    aria-pressed={index === i}
                    className={`shrink-0 w-16 h-20 rounded-xl overflow-hidden bg-[#efe9dd] border-2 transition-all ${index === i ? 'border-amber-400' : 'border-transparent opacity-70 hover:opacity-100'}`}
                  >
                    <img src={asset(src)} alt="" className={`w-full h-full ${src === images.scene || (!isDoor && detail.p.cover) ? 'object-cover' : 'object-contain mix-blend-multiply p-1'}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 md:p-10 md:pl-4 flex flex-col">
            {brand && <p className="text-amber-300/80 text-[11px] font-medium uppercase tracking-[0.4em] mb-4">{brand}</p>}
            <h2 className="font-display text-5xl md:text-6xl text-white leading-none mb-3 pr-12">{title}</h2>
            {isDoor && <p className="text-amber-300/70 text-[11px] uppercase tracking-[0.3em] mb-6">{t(detail.m.style)}</p>}
            <p className="text-zinc-300 text-lg leading-relaxed mb-6">{t(isDoor ? detail.m.desc : detail.p.desc)}</p>
            {isDoor && (
              <ul className="space-y-2.5 mb-8">
                {detail.m.specs.map((s, i) => (
                  <li key={i} className="flex items-start gap-3 text-zinc-400"><CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" /> {t(s)}</li>
                ))}
              </ul>
            )}
            <div className="mt-auto pt-6 border-t border-white/10">
              <p className="font-display text-5xl bb-text-gold leading-none mb-1">{euro(price)}</p>
              <p className="text-white/55 text-sm mb-1">{t(UI.from)} · {isDoor ? t(UI.inclVat) : t(detail.p.unit)}</p>
              <p className="text-white/40 text-xs mb-6">{t(UI.indicative)}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                {isDoor && (
                  <Link to={`/configurator?model=${detail.m.id}`} onClick={onClose} className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-bold transition-colors">
                    <SlidersHorizontal className="w-4 h-4" /> {t(UI.configure)}
                  </Link>
                )}
                <button onClick={add} className={`flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full border font-bold transition-colors ${done ? 'bg-amber-200 text-black border-amber-200' : isDoor ? 'border-zinc-700 hover:border-amber-500 text-white' : 'bg-amber-500 hover:bg-amber-400 text-black border-amber-500'}`}>
                  {done ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />} {t(done ? UI.added : UI.addToQuote)}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes sd-sheet{from{opacity:0;transform:translateY(40px) scale(.98)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
};

/* ───────────── Cards ───────────── */

const DoorCard = ({ m, open }: { m: DoorModel; open: (d: Detail) => void }) => {
  const t = useT();
  const { addDoor } = useQuote();
  const [finish, setFinish] = useState(m.finish);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const art = useRef<HTMLDivElement>(null);
  const { variants } = modelImages(m);
  const hasPhotos = variants.length > 0;
  const swatches = FINISHES.filter((f) => f.id === m.finish || ['9010', '7016', '9005', 'salie', 'eiken'].includes(f.id)).slice(0, 5);

  const add = async () => {
    if (art.current) await flyTo(art.current);
    addDoor({ ...defaultConfig(m), finish });
    setDone(true);
    window.setTimeout(() => setDone(false), 1800);
  };

  return (
    <article className="group h-full flex flex-col">
      <button onClick={() => open({ kind: 'door', m, index })} className="relative block text-left" aria-label={`${m.name} — ${t(TX.details)}`}>
        <Plate className="h-[22rem]">
          <div ref={art} className="absolute inset-x-0 top-9 bottom-0 flex items-end justify-center">
            <DoorVisual model={m} finish={finish} index={index} className="h-full w-auto max-w-[80%] transition-transform duration-700 ease-out group-hover:scale-[1.035]" />
          </div>
          <span className={`absolute top-3 left-3 ${chipDark}`}>{t(TX.kinds[m.kind])}{m.leaves === 2 ? ` · ${t(TX.double)}` : ''}</span>
          {m.brand && <span className={`absolute top-3 right-3 ${chipBrand}`}>{m.brand}</span>}
          <span className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-[#1d1a17]/85 text-amber-100 flex items-center justify-center opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
            <Expand className="w-4 h-4" />
          </span>
        </Plate>
      </button>

      <div className="flex-1 flex flex-col pt-5">
        <div className="flex items-baseline justify-between gap-4 mb-1">
          <h3 className="font-display text-3xl text-white">{m.name}</h3>
          <p className="text-amber-200 whitespace-nowrap"><span className="text-white/45 text-xs mr-1">{t(UI.from)}</span>{euro(m.price)}</p>
        </div>
        <p className="text-amber-300/70 text-[11px] uppercase tracking-[0.3em] mb-4">{t(m.style)}</p>
        <p className="text-zinc-400 text-sm leading-relaxed mb-5 flex-1">{t(m.desc)}</p>

        {hasPhotos && variants.length > 1 && (
          <div className="flex items-center gap-2 mb-5" role="group" aria-label={t(TX.variant)}>
            {variants.slice(0, 6).map((src, i) => (
              <button
                key={src}
                onClick={() => setIndex(i)}
                aria-label={`${t(TX.variant)} ${i + 1}`}
                aria-pressed={index === i}
                className={`w-9 h-12 rounded-lg overflow-hidden bg-[#efe9dd] border-2 transition-all ${index === i ? 'border-amber-400' : 'border-transparent opacity-60 hover:opacity-100'}`}
              >
                <Photo src={src} alt="" className="w-full h-full object-contain mix-blend-multiply p-0.5" />
              </button>
            ))}
          </div>
        )}
        {!hasPhotos && !m.steel && (
          <div className="flex items-center gap-2 mb-5" role="group" aria-label={t(TX.colourHint)}>
            {swatches.map((f) => (
              <button
                key={f.id}
                onClick={() => setFinish(f.id)}
                title={t(f.name)}
                aria-label={t(f.name)}
                aria-pressed={finish === f.id}
                className={`w-7 h-7 rounded-full border-2 transition-all ${finish === f.id ? 'border-amber-300 scale-110' : 'border-white/15 hover:border-white/50'}`}
                style={{ background: f.hex }}
              />
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Link to={`/configurator?model=${m.id}&finish=${finish}`} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-[#ece7dc] hover:bg-white text-black text-sm font-semibold transition-colors">
            <SlidersHorizontal className="w-4 h-4" /> {t(UI.configure)}
          </Link>
          <button onClick={add} aria-label={t(UI.addToQuote)} title={t(UI.addToQuote)} className={`shrink-0 inline-flex items-center gap-1.5 px-4 h-12 rounded-full border text-sm font-medium transition-colors ${done ? 'bg-amber-200 text-black border-amber-200' : 'border-zinc-700 hover:border-amber-500 text-white'}`}>
            {done ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {t(TX.quoteShort)}
          </button>
        </div>
      </div>
    </article>
  );
};

const ProductCard = ({ p, open }: { p: Product; open: (d: Detail) => void }) => {
  const t = useT();
  const { addProduct } = useQuote();
  const [done, setDone] = useState(false);
  const art = useRef<HTMLDivElement>(null);
  const photo = p.photos?.[0];
  const add = async () => {
    if (art.current) await flyTo(art.current);
    addProduct(p.id);
    setDone(true);
    window.setTimeout(() => setDone(false), 1800);
  };
  return (
    <article className="group h-full flex flex-col">
      <button onClick={() => open({ kind: 'product', p })} className="relative block text-left" aria-label={`${t(p.name)} — ${t(TX.details)}`}>
        <Plate className="h-60">
          <div ref={art} className="absolute inset-0 flex items-center justify-center p-5">
            {photo
              ? <Photo src={photo} alt={t(p.name)} className={p.cover ? 'absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]' : 'max-h-full max-w-full object-contain mix-blend-multiply rounded-lg transition-transform duration-700 ease-out group-hover:scale-[1.04]'} fallback={<ProductArt art={fallbackArt(p)} className="h-[82%] w-auto" />} />
              : p.art && <ProductArt art={p.art} className="h-full w-auto" />}
          </div>
          {p.brand && <span className={`absolute top-3 right-3 ${chipBrand}`}>{p.brand}</span>}
          {(p.photos?.length ?? 0) > 1 && <span className={`absolute top-3 left-3 ${chipDark}`}>{p.photos!.length} ×</span>}
        </Plate>
      </button>
      <div className="flex-1 flex flex-col pt-5">
        <h3 className="font-display text-2xl text-white mb-2">{t(p.name)}</h3>
        <p className="text-zinc-400 text-sm leading-relaxed mb-5 flex-1">{t(p.desc)}</p>
        <div className="flex items-center justify-between gap-3">
          <p className="text-amber-200"><span className="text-white/45 text-xs mr-1">{t(UI.from)}</span>{euro(p.price)} <span className="text-white/45 text-xs">{t(p.unit)}</span></p>
          <button onClick={add} aria-label={t(UI.addToQuote)} title={t(UI.addToQuote)} className={`shrink-0 inline-flex items-center gap-1.5 px-4 h-11 rounded-full border text-sm font-medium transition-colors ${done ? 'bg-amber-200 text-black border-amber-200' : 'border-zinc-700 hover:border-amber-500 text-white'}`}>
            {done ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {t(TX.quoteShort)}
          </button>
        </div>
      </div>
    </article>
  );
};

const Shop = () => {
  const t = useT();
  useDocumentTitle(t(TX.title));
  const catalog = useCatalog();
  const [params, setParams] = useSearchParams();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [cat, setCat] = useState<{ item: CatItem; index: number } | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'cat' | 'name' | 'low' | 'high'>('cat');
  const raw = params.get('cat') as Cat | null;
  const tab: Cat = raw && CATS.includes(raw) ? raw : 'all';
  const rawBrand = params.get('merk') as Brand | null;
  const brand: Brand = rawBrand && ['Eko-Okna', 'Invado', 'Porta', 'huis'].includes(rawBrand) ? rawBrand : 'all';
  const tabs: [Cat, L][] = [
    ['all', UI.all], ['ramen', TX.windows], ['binnen', UI.interior], ['buiten', TX.entrance], ['schuif', TX.sliding], ['kozijn', UI.frames],
    ['zonwering', TX.shading], ['garage', TX.garage], ['glas', TX.glass], ['technisch', TX.technical], ['systeem', TX.systems], ['beslag', UI.hardware],
  ];
  const brands: [Brand, string][] = [['all', t(TX.allBrands)], ['Eko-Okna', 'Eko-Okna'], ['Invado', 'Invado'], ['Porta', 'Porta'], ['huis', t(TX.house)]];
  const go = (next: { cat?: Cat; merk?: Brand }) => {
    const c = next.cat ?? tab;
    const b = next.merk ?? brand;
    setParams({ ...(c !== 'all' ? { cat: c } : {}), ...(b !== 'all' ? { merk: b } : {}) }, { replace: true });
  };

  const inTab = (c: string) => tab === 'all' || c === tab || (tab === 'buiten' && c === 'entree');
  const q = query.trim().toLowerCase();
  const hit = (...texts: (string | undefined)[]) => !q || texts.some((x) => x?.toLowerCase().includes(q));
  const factory = catalog.filter((it) => inTab(it.cat) && (brand === 'all' || brand === it.brand) && hit(it.name, it.brand, it.tagline, t(groupLabel(it.group)), ...(it.labels ?? [])));
  // the illustrated house collection only shows under its own filter (or when nothing else exists)
  const doors = brand === 'huis' || (brand === 'all' && catalog.length === 0) ? MODELS.filter((m) => inTab(m.cat) && hit(m.name, t(m.style), t(m.desc))) : [];
  const products = PRODUCTS.filter((p) => inTab(p.cat) && (p.photos || catalog.length === 0 || brand === 'huis') && (brand === 'all' || (brand === 'huis' ? !p.brand : p.brand === brand)) && hit(t(p.name), t(p.desc), p.brand));
  const flat = sort !== 'cat' || !!q;
  if (sort === 'name') factory.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'low' || sort === 'high') {
    const dir = sort === 'low' ? 1 : -1;
    // items without a guide price go last
    factory.sort((a, b) => ((guidePrice(a) || (dir > 0 ? 1e9 : -1)) - (guidePrice(b) || (dir > 0 ? 1e9 : -1))) * dir);
    doors.sort((a, b) => (a.price - b.price) * dir);
    products.sort((a, b) => (a.price - b.price) * dir);
  }
  const productGroups = ([
    [UI.frames, products.filter((p) => p.cat === 'kozijn')],
    [TX.systems, products.filter((p) => p.cat === 'systeem')],
    [UI.hardware, products.filter((p) => p.cat === 'beslag')],
  ] as [L, Product[]][]).filter(([, list]) => list.length > 0);
  // factory items grouped by brand + range, in catalogue order
  const factoryGroups: { key: string; brand: string; label: L; items: CatItem[] }[] = [];
  factory.forEach((it) => {
    const key = flat ? 'all' : `${it.brand}-${it.group}`;
    let g = factoryGroups.find((x) => x.key === key);
    if (!g) { g = { key, brand: flat ? '' : it.brand, label: flat ? TX.results : groupLabel(it.group), items: [] }; factoryGroups.push(g); }
    g.items.push(it);
  });
  const total = factory.length + doors.length + products.length;
  // the unfiltered start view shows category tiles instead of several hundred cards
  const overview = tab === 'all' && brand === 'all' && !q && sort === 'cat' && catalog.length > 0;
  const tiles = tabs.filter(([id]) => id !== 'all').map(([id, label]) => {
    const inCat = (c: string) => c === id || (id === 'buiten' && c === 'entree');
    const list = catalog.filter((it) => inCat(it.cat));
    const sample = (list.find((it) => it.nl && (it.hero || it.strip)) ?? list.find((it) => it.hero || it.strip))?.id;
    const withScene = list.find((it) => it.brand === 'Eko-Okna' && it.scene && it.scene[0] >= 1200) ?? list.find((it) => it.scene && it.scene[0] >= 1200);
    return { id, label, count: list.length + PRODUCTS.filter((p) => p.photos && inCat(p.cat)).length, sample, scene: withScene ? `${withScene.dir}/scene.jpg` : undefined };
  }).filter((x) => x.count > 0);
  const chip = (on: boolean) => `shrink-0 px-5 py-2.5 rounded-full text-sm font-medium border transition-all ${on ? 'bg-amber-500 text-black border-amber-500' : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-amber-500/50 hover:text-white'}`;
  const heading = (label: string, count: number, kicker?: string) => (
    <div className="flex items-end justify-between gap-6 mt-28 md:mt-36 mb-12 pb-6 border-b border-white/10">
      <div>
        {kicker && <p className="text-amber-300/80 text-[11px] font-medium uppercase tracking-[0.4em] mb-3">{kicker}</p>}
        <h2 className="font-display text-4xl md:text-5xl text-white leading-none">{label}</h2>
      </div>
      <span className="font-display italic text-2xl text-amber-300/60">{String(count).padStart(2, '0')}</span>
    </div>
  );

  return (
    <>
      <PageHero
        badge={<Badge>{t(TX.badge)}</Badge>}
        title={t(TX.title)}
        subtitle={t(TX.sub)}
        minH="min-h-[62svh]"
        image="interior"
        imagePosition="34% 50%"
      />

      <section className="relative pb-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="sticky top-0 z-40 -mx-6 px-6 bg-[#0b0a09]/95 backdrop-blur border-y border-white/10">
            <div className="flex gap-7 overflow-x-auto no-scrollbar" role="tablist">
              {tabs.map(([id, label]) => (
                <button key={id} role="tab" aria-selected={tab === id} onClick={() => go({ cat: id })} className={`shrink-0 py-4 text-[11px] font-medium uppercase tracking-[0.22em] border-b transition-colors ${tab === id ? 'text-white border-amber-200' : 'text-white/45 border-transparent hover:text-white'}`}>{t(label)}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-x-10 gap-y-4 py-6">
            <label className="relative flex-1 max-w-md">
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t(TX.search)} aria-label={t(TX.search)} className="w-full py-2.5 text-white text-sm placeholder:text-white/35" />
            </label>
            <label className="flex items-center gap-3 text-white/45 text-[11px] uppercase tracking-[0.22em]">
              {t(TX.allBrands)}
              <select value={brand} onChange={(e) => go({ merk: e.target.value as Brand })} className="py-2.5 text-white text-sm normal-case tracking-normal">
                {brands.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-3 text-white/45 text-[11px] uppercase tracking-[0.22em]">
              {t(TX.sort)}
              <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="py-2.5 text-white text-sm normal-case tracking-normal">
                <option value="cat">{t(TX.sortCat)}</option>
                <option value="name">{t(TX.sortName)}</option>
                <option value="low">{t(TX.sortLow)}</option>
                <option value="high">{t(TX.sortHigh)}</option>
              </select>
            </label>
            <span className="md:ml-auto text-white/40 text-[11px] uppercase tracking-[0.22em] whitespace-nowrap">{total} {t(TX.count)}</span>
          </div>
          {total === 0 && <p className="text-center text-zinc-400 text-lg py-24">{t(TX.none)}</p>}

          {overview && (
            <div>
              {heading(t(TX.pick), tiles.length)}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-14">
                {tiles.map(({ id, label, count, sample, scene }) => (
                  <button key={id} onClick={() => go({ cat: id })} className="group text-left">
                    <span className="relative block aspect-[4/5] overflow-hidden bg-[#efece6]">
                      {scene
                        ? <img src={asset(scene)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.04]" />
                        : sample && <span className="absolute inset-[9%] flex items-center justify-center"><CatPhoto id={sample} bare className="max-h-full max-w-full transition-transform duration-[1400ms] ease-out group-hover:scale-[1.04]" /></span>}
                    </span>
                    <span className="flex items-baseline justify-between gap-3 pt-5">
                      <span className="font-display text-3xl md:text-4xl text-white">{t(label)}</span>
                      <span className="text-white/40 text-[11px] uppercase tracking-[0.22em] whitespace-nowrap">{count}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}


          {!overview && factoryGroups.map((g) => (
            <div key={g.key}>
              {heading(t(g.label), g.items.length, g.brand || undefined)}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-20">
                {g.items.map((it) => <CatCard key={it.id} item={it} open={(item, index) => setCat({ item, index })} />)}
              </div>
            </div>
          ))}

          {!overview && doors.length > 0 && (
            <div>
              {heading(t(TX.houseTitle), doors.length, 'Stijl & Dorpel')}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-14">
                {doors.map((m) => <DoorCard key={m.id} m={m} open={setDetail} />)}
              </div>
            </div>
          )}

          {!overview && productGroups.map(([label, list], gi) => (
            <div key={`${tab}-${gi}`}>
              {heading(t(label), list.length)}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-14">
                {list.map((p) => <ProductCard key={p.id} p={p} open={setDetail} />)}
              </div>
            </div>
          ))}

          <div className="mt-32 pt-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-t border-white/10">
            <div>
              <p className="text-white/80 text-lg max-w-2xl">{t(TX.note)}</p>
              <p className="text-white/40 text-sm mt-2">{t(UI.indicative)}</p>
            </div>
            <Link to="/contact" className="sd-link shrink-0">
              {t(UI.nav.contact)} <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
      <CTA />
      {detail && <DetailDialog key={detail.kind === 'door' ? detail.m.id : detail.p.id} detail={detail} onClose={() => setDetail(null)} />}
      {cat && <CatDialog key={cat.item.id} item={cat.item} start={cat.index} onClose={() => setCat(null)} />}
    </>
  );
};

export default Shop;
