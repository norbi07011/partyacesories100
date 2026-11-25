import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, Plus, SlidersHorizontal } from 'lucide-react';
import { useT, euro, type L } from '../i18n';
import { UI, useDocumentTitle } from '../ui';
import { MODELS, PRODUCTS, FINISHES, defaultConfig, modelById, type DoorModel, type Product } from '../data/doors';
import { useQuote } from '../quote';
import { Door, ProductArt } from '../components/Door';
import { PageHero, Badge } from '../components/PageHero';
import { Reveal, TiltCard } from '../fx/components';
import { flyTo } from '../fx/core';
import { CTA } from './Home';

type Cat = 'all' | 'binnen' | 'buiten' | 'kozijn' | 'beslag';

const TX = {
  title: ['Deuren & kozijnen', 'Doors & frames', 'Drzwi i futryny'],
  sub: [
    'Zestien modellen, elk op maat te maken en in elke kleur af te lakken. Zet je favorieten op de offertelijst of stel ze eerst helemaal samen.',
    'Sixteen models, each made to measure and finished in any colour. Put your favourites on the quote list, or configure them fully first.',
    'Szesnaście modeli, każdy na wymiar i w dowolnym kolorze. Dodaj ulubione do listy wyceny albo najpierw je skonfiguruj.',
  ],
  badge: ['Collectie', 'Collection', 'Kolekcja'],
  kinds: {
    draai: ['Draaideur', 'Hinged door', 'Drzwi rozwierane'],
    schuif: ['Schuifdeur', 'Sliding door', 'Drzwi przesuwne'],
    taats: ['Taatsdeur', 'Pivot door', 'Drzwi osiowe'],
  },
  double: ['dubbel', 'double', 'podwójne'],
  count: ['resultaten', 'results', 'wyników'],
  colourHint: ['Kleur', 'Colour', 'Kolor'],
  note: [
    'Staat jouw deur er niet tussen? We maken ook deuren naar eigen ontwerp of naar het voorbeeld van je bestaande deuren.',
    'Is your door not listed? We also make doors to your own design or matching your existing ones.',
    'Nie ma tu Twoich drzwi? Wykonujemy też drzwi według projektu lub na wzór istniejących.',
  ],
} satisfies Record<string, L | Record<string, L>>;

const DoorCard = ({ m }: { m: DoorModel }) => {
  const t = useT();
  const { addDoor } = useQuote();
  const [finish, setFinish] = useState(m.finish);
  const [done, setDone] = useState(false);
  const art = useRef<HTMLDivElement>(null);
  const swatches = FINISHES.filter((f) => f.id === m.finish || ['9010', '7016', '9005', 'salie', 'eiken'].includes(f.id)).slice(0, 5);

  const add = async () => {
    if (art.current) await flyTo(art.current);
    addDoor({ ...defaultConfig(m), finish });
    setDone(true);
    window.setTimeout(() => setDone(false), 1800);
  };

  return (
    <TiltCard max={6} className="h-full">
      <article className="group h-full flex flex-col bb-glass-card rounded-3xl overflow-hidden hover:border-amber-500/60 transition-colors">
        <Link to={`/configurator?model=${m.id}&finish=${finish}`} className="relative block h-80 bg-[radial-gradient(70%_70%_at_50%_25%,rgba(230,217,189,.18),transparent)]" aria-label={`${m.name} — ${t(UI.configure)}`}>
          <div ref={art} className="absolute inset-x-0 top-6 bottom-0 flex items-end justify-center">
            <Door model={m} finish={finish} className="h-full w-auto max-w-[86%] drop-shadow-[0_20px_30px_rgba(0,0,0,.65)] transition-transform duration-700 group-hover:scale-[1.03]" />
          </div>
          <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/60 border border-white/10 text-[10px] uppercase tracking-[0.25em] text-white/70">
            {t(TX.kinds[m.kind])}{m.leaves === 2 ? ` · ${t(TX.double)}` : ''}
          </span>
        </Link>
        <div className="flex-1 flex flex-col p-6 border-t border-white/10">
          <div className="flex items-baseline justify-between gap-4 mb-1">
            <h3 className="font-display text-3xl text-white">{m.name}</h3>
            <p className="text-amber-200 whitespace-nowrap"><span className="text-white/45 text-xs mr-1">{t(UI.from)}</span>{euro(m.price)}</p>
          </div>
          <p className="text-amber-300/70 text-[11px] uppercase tracking-[0.3em] mb-4">{t(m.style)}</p>
          <p className="text-zinc-400 text-sm leading-relaxed mb-5 flex-1">{t(m.desc)}</p>
          {!m.steel && (
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
            <Link to={`/configurator?model=${m.id}&finish=${finish}`} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold transition-colors">
              <SlidersHorizontal className="w-4 h-4" /> {t(UI.configure)}
            </Link>
            <button onClick={add} aria-label={t(UI.addToQuote)} title={t(UI.addToQuote)} className={`w-12 h-12 shrink-0 rounded-full border flex items-center justify-center transition-colors ${done ? 'bg-amber-200 text-black border-amber-200' : 'border-zinc-700 hover:border-amber-500 text-white'}`}>
              {done ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </article>
    </TiltCard>
  );
};

const ProductCard = ({ p }: { p: Product }) => {
  const t = useT();
  const { addProduct } = useQuote();
  const [done, setDone] = useState(false);
  const art = useRef<HTMLDivElement>(null);
  const add = async () => {
    if (art.current) await flyTo(art.current);
    addProduct(p.id);
    setDone(true);
    window.setTimeout(() => setDone(false), 1800);
  };
  return (
    <article className="h-full flex flex-col bb-glass-card rounded-3xl overflow-hidden hover:border-amber-500/60 transition-colors">
      <div className="relative h-56 bg-[radial-gradient(70%_70%_at_50%_30%,rgba(230,217,189,.14),transparent)] flex items-center justify-center">
        <div ref={art} className="h-44"><ProductArt art={p.art} className="h-full w-auto" /></div>
      </div>
      <div className="flex-1 flex flex-col p-6 border-t border-white/10">
        <h3 className="font-display text-2xl text-white mb-2">{t(p.name)}</h3>
        <p className="text-zinc-400 text-sm leading-relaxed mb-5 flex-1">{t(p.desc)}</p>
        <div className="flex items-center justify-between gap-3">
          <p className="text-amber-200"><span className="text-white/45 text-xs mr-1">{t(UI.from)}</span>{euro(p.price)} <span className="text-white/45 text-xs">{t(p.unit)}</span></p>
          <button onClick={add} className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-medium transition-colors ${done ? 'bg-amber-200 text-black border-amber-200' : 'border-zinc-700 hover:border-amber-500 text-white'}`}>
            {done ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {t(done ? UI.added : UI.addToQuote)}
          </button>
        </div>
      </div>
    </article>
  );
};

const Shop = () => {
  const t = useT();
  useDocumentTitle(t(TX.title));
  const [params, setParams] = useSearchParams();
  const raw = params.get('cat') as Cat | null;
  const cat: Cat = raw && ['binnen', 'buiten', 'kozijn', 'beslag'].includes(raw) ? raw : 'all';
  const tabs: [Cat, L][] = [['all', UI.all], ['binnen', UI.interior], ['buiten', UI.exterior], ['kozijn', UI.frames], ['beslag', UI.hardware]];
  const doors = MODELS.filter((m) => cat === 'all' || m.cat === cat);
  const products = PRODUCTS.filter((p) => cat === 'all' || p.cat === cat);

  return (
    <>
      <PageHero
        badge={<Badge>{t(TX.badge)}</Badge>}
        title={t(TX.title)}
        subtitle={t(TX.sub)}
        minH="min-h-[62svh]"
        aside={
          <div className="flex items-end gap-5 pr-6">
            <Door model={modelById('tuindorp')} className="h-[300px] w-auto drop-shadow-[0_30px_50px_rgba(0,0,0,.7)]" />
            <Door model={modelById('gracht')} className="h-[380px] w-auto drop-shadow-[0_30px_50px_rgba(0,0,0,.7)]" />
            <Door model={modelById('loods')} className="h-[300px] w-auto drop-shadow-[0_30px_50px_rgba(0,0,0,.7)]" />
          </div>
        }
      />

      <section className="relative pb-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="-mx-6 px-6 py-4 border-y border-white/10 flex items-center justify-between gap-4 mb-12">
            <div className="flex gap-2 overflow-x-auto no-scrollbar" role="tablist">
              {tabs.map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={cat === id}
                  onClick={() => setParams(id === 'all' ? {} : { cat: id }, { replace: true })}
                  className={`shrink-0 px-5 py-2.5 rounded-full text-sm font-medium border transition-all ${cat === id ? 'bg-amber-500 text-black border-amber-500' : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-amber-500/50 hover:text-white'}`}
                >
                  {t(label)}
                </button>
              ))}
            </div>
            <span className="hidden md:block text-white/45 text-[11px] uppercase tracking-[0.3em] whitespace-nowrap">{doors.length + products.length} {t(TX.count)}</span>
          </div>

          {doors.length > 0 && (
            <Reveal key={`d-${cat}`} stagger={0.06} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {doors.map((m) => <DoorCard key={m.id} m={m} />)}
            </Reveal>
          )}

          {products.length > 0 && (
            <>
              {doors.length > 0 && <h2 className="font-display text-4xl md:text-5xl text-white mt-24 mb-10">{t(UI.frames)} · {t(UI.hardware)}</h2>}
              <Reveal key={`p-${cat}`} stagger={0.06} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map((p) => <ProductCard key={p.id} p={p} />)}
              </Reveal>
            </>
          )}

          <div className="mt-16 flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-3xl border border-white/10 p-8">
            <div>
              <p className="text-white/80 text-lg max-w-2xl">{t(TX.note)}</p>
              <p className="text-white/40 text-sm mt-2">{t(UI.indicative)}</p>
            </div>
            <Link to="/contact" className="shrink-0 inline-flex items-center gap-2 px-7 py-4 rounded-full border border-zinc-700 hover:border-amber-500 hover:text-amber-300 font-bold transition-colors">
              {t(UI.nav.contact)} <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
      <CTA />
    </>
  );
};

export default Shop;
