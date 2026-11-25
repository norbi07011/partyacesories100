import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage, useT, euro, type L } from '../i18n';
import { UI } from '../ui';
import { useCatalog, guidePrice, groupLabel, intro, Sprite, CatCard, CatDialog, type CatItem } from '../catalog';
import { Plate, asset } from '../components/Door';
import { gsap, ScrollTrigger, reducedMotion, isMobile } from '../fx/core';
import { SplitText } from '../fx/components';

const TX = {
  recKicker: ['Onze favorieten', 'Our favourites', 'Nasze typy'],
  recTitle: ['Meest aanbevolen', 'Most recommended', 'Najbardziej polecane'],
  recSub: [
    'Een selectie uit de fabriekscollecties: modellen die in bijna elk interieur passen.',
    'A selection from the factory collections: models that suit almost any interior.',
    'Wybór z kolekcji fabrycznych: modele, które pasują do niemal każdego wnętrza.',
  ],
  all: ['Hele collectie', 'Full collection', 'Cała kolekcja'],
  onRequest: ['Prijs op aanvraag', 'Price on request', 'Cena na zapytanie'],
  showKicker: ['Eén model, meerdere gezichten', 'One model, several faces', 'Jeden model, wiele twarzy'],
  view: ['Bekijk collectie', 'View collection', 'Zobacz kolekcję'],
} satisfies Record<string, L>;

const RECOMMENDED = [
  'invado-corato', 'porta-porta-inspire-48', 'invado-lago', 'porta-porta-classic-52', 'invado-larina', 'invado-vinadio',
  'porta-natura-koncept-72', 'invado-d-artagnan', 'invado-bianco', 'porta-londyn-wieden-12', 'invado-destino-unico', 'porta-gdynia-wroclaw-116',
];
const SHOWCASE = ['invado-corato', 'porta-porta-inspire-48', 'invado-larina', 'invado-linea-forte'];

/* ═════════════════════════════  RECOMMENDED — horizontal carousel  ═════════════════════════════
 * A native horizontal scroller: the page keeps scrolling vertically with wheel or finger,
 * the row moves with the arrows, a sideways swipe or a trackpad. */

export const Recommended = () => {
  const t = useT();
  const { lang } = useLanguage();
  const catalog = useCatalog();
  const track = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<{ item: CatItem; index: number } | null>(null);
  const items = RECOMMENDED.map((id) => catalog.find((c) => c.id === id)).filter((c): c is CatItem => !!c && !!(c.strip || c.hero));
  if (!items.length) return null;
  const move = (d: number) => track.current?.scrollBy({ left: d * (track.current.clientWidth * 0.8), behavior: 'smooth' });
  return (
    <section className="relative py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <p className="text-amber-500 text-xs font-bold uppercase tracking-[0.4em] mb-4">{t(TX.recKicker)}</p>
            <SplitText key={`${lang}-rec`} as="h2" mode="words" text={t(TX.recTitle)} className="font-display text-5xl md:text-7xl text-white leading-[1] mb-5" />
            <p className="text-zinc-400 text-lg">{t(TX.recSub)}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => move(-1)} aria-label="Previous" className="w-12 h-12 rounded-full border border-white/20 hover:border-white text-white flex items-center justify-center transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={() => move(1)} aria-label="Next" className="w-12 h-12 rounded-full border border-white/20 hover:border-white text-white flex items-center justify-center transition-colors"><ChevronRight className="w-5 h-5" /></button>
            <Link to="/deuren" className="hidden md:inline-flex items-center gap-2 px-6 h-12 rounded-full bg-[#ece7dc] hover:bg-white text-black text-sm font-semibold transition-colors">{t(TX.all)} <ArrowRight className="w-4 h-4" /></Link>
          </div>
        </div>
      </div>
      <div
        ref={track}
        className="flex gap-6 overflow-x-auto overflow-y-hidden no-scrollbar snap-x snap-proximity overscroll-x-contain px-6 md:px-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] pb-4"
        style={{ touchAction: 'pan-x pan-y' }}
      >
        {items.map((it) => (
          <div key={it.id} className="shrink-0 snap-start w-[78vw] sm:w-[320px]">
            <CatCard item={it} open={(item, index) => setOpen({ item, index })} />
          </div>
        ))}
      </div>
      {open && <CatDialog key={open.item.id} item={open.item} start={open.index} onClose={() => setOpen(null)} />}
    </section>
  );
};

/* ═════════════════════════════  3D SHOWCASE  ═════════════════════════════
 * The versions of one collection stand on a 3D ring. The ring turns while the section
 * moves through the viewport — nothing is pinned, so scrolling never stalls. Tabs switch
 * the collection. */

export const Showcase3D = () => {
  const t = useT();
  const { lang } = useLanguage();
  const catalog = useCatalog();
  const section = useRef<HTMLElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const items = SHOWCASE.map((id) => catalog.find((c) => c.id === id)).filter((c): c is CatItem => !!c && (c.strip?.items.length ?? 0) >= 3);
  const count = items.length;
  const item = items[Math.min(active, Math.max(0, count - 1))];
  const n = item ? Math.min(item.strip!.items.length, 7) : 0;
  const mobile = isMobile();
  const radius = mobile ? 170 : 380;

  useLayoutEffect(() => {
    if (!count || reducedMotion() || !ring.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(ring.current, { rotateY: 35 }, {
        rotateY: -325, ease: 'none',
        scrollTrigger: { trigger: section.current, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
      });
    }, section);
    const id = window.setTimeout(() => { ScrollTrigger.sort(); ScrollTrigger.refresh(); }, 100);
    return () => { window.clearTimeout(id); ctx.revert(); };
  }, [count]);

  if (!item) return null;
  const price = guidePrice(item);

  return (
    <section ref={section} className="relative py-24 md:py-32 overflow-hidden [contain:paint]">
      {items.map((it, i) => it.scene && (
        <img key={it.id} src={asset(`${it.dir}/scene.jpg`)} alt="" loading="lazy" className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${i === active ? 'opacity-25' : 'opacity-0'}`} />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(70%_70%_at_65%_50%,transparent,rgba(11,10,9,.9)_78%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b0a09] via-transparent to-[#0b0a09]" />

      <div className="relative max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] items-center gap-10">
        <div className="relative z-10">
          <p className="text-amber-500 text-xs font-bold uppercase tracking-[0.4em] mb-6">{t(TX.showKicker)}</p>
          <div className="flex flex-wrap gap-2 mb-8" role="tablist">
            {items.map((it, i) => (
              <button key={it.id} role="tab" aria-selected={i === active} onClick={() => setActive(i)} className={`px-4 h-10 rounded-full text-sm border transition-colors ${i === active ? 'bg-white text-black border-white font-semibold' : 'border-white/20 text-white/70 hover:text-white hover:border-white/60'}`}>
                {it.name}
              </button>
            ))}
          </div>
          <div key={`${item.id}-${lang}`} className="animate-[sd-rise_.8s_cubic-bezier(.16,1,.3,1)]">
            <p className="text-white/50 text-[11px] uppercase tracking-[0.35em] mb-3">{item.brand} · {t(groupLabel(item.group))}</p>
            <h2 className="font-display text-6xl md:text-8xl text-white leading-[0.92] mb-5">{item.name}</h2>
            <p className="text-white/70 font-light text-lg leading-relaxed max-w-md mb-6">{intro(item, t, lang)}</p>
            <p className="font-display text-3xl text-white mb-7">{price > 0 ? `${t(UI.from)} ${euro(price)}` : t(TX.onRequest)}</p>
          </div>
          <Link to={`/product/${item.id}`} className="group inline-flex items-center gap-4 pl-7 pr-2.5 h-14 bg-[#ece7dc] text-black font-semibold tracking-wide rounded-full hover:bg-white transition-colors">
            {t(TX.view)}
            <span className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center group-hover:rotate-[-45deg] transition-transform duration-500"><ArrowRight className="w-4 h-4" /></span>
          </Link>
        </div>

        <div className="relative h-[340px] md:h-[560px]" style={{ perspective: 1600 }} aria-hidden="true">
          <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d', transform: `translateZ(-${radius}px)` }}>
            <div ref={ring} className="absolute inset-0 will-change-transform" style={{ transformStyle: 'preserve-3d' }}>
              {Array.from({ length: n }, (_, i) => (
                <div
                  key={`${item.id}-${i}`}
                  className="absolute left-1/2 top-1/2 w-[120px] h-[264px] md:w-[210px] md:h-[462px] -ml-[60px] -mt-[132px] md:-ml-[105px] md:-mt-[231px] shadow-[0_40px_80px_-30px_rgba(0,0,0,.9)]"
                  style={{ transform: `rotateY(${i * (360 / n)}deg) translateZ(${radius}px)`, backfaceVisibility: 'hidden' }}
                >
                  <Plate className="w-full h-full">
                    <span className="absolute inset-x-0 top-[6%] bottom-[5%] flex items-end justify-center">
                      <Sprite item={item} index={i} className="h-full w-auto max-w-[80%]" />
                    </span>
                  </Plate>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes sd-rise{from{opacity:0;transform:translateY(30px);filter:blur(8px)}to{opacity:1;transform:none;filter:none}}`}</style>
    </section>
  );
};
