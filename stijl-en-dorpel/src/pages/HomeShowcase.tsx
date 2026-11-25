import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage, useT, euro, type L } from '../i18n';
import { UI } from '../ui';
import { useCatalog, guidePrice, groupLabel, intro, Sprite, CatDialog, type CatItem } from '../catalog';
import { Plate, asset } from '../components/Door';
import { gsap, ScrollTrigger, reducedMotion, isMobile } from '../fx/core';
import { SplitText, Magnetic } from '../fx/components';

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
  versions: ['uitvoeringen', 'versions', 'wariantów'],
  scroll: ['Scroll om te draaien', 'Scroll to rotate', 'Przewiń, aby obrócić'],
  view: ['Bekijk collectie', 'View collection', 'Zobacz kolekcję'],
} satisfies Record<string, L>;

const RECOMMENDED = [
  'invado-corato', 'porta-porta-inspire-48', 'invado-lago', 'porta-porta-classic-52', 'invado-larina', 'invado-vinadio',
  'porta-natura-koncept-72', 'invado-d-artagnan', 'invado-bianco', 'porta-londyn-wieden-12', 'invado-destino-unico', 'porta-gdynia-wroclaw-116',
];
const SHOWCASE = ['invado-corato', 'porta-porta-inspire-48', 'invado-larina', 'invado-linea-forte'];

/* ═════════════════════════════  RECOMMENDED — framed carousel  ═════════════════════════════ */

const FramedCard = ({ item, open }: { item: CatItem; open: (it: CatItem) => void }) => {
  const t = useT();
  const price = guidePrice(item);
  const n = item.strip?.items.length ?? 0;
  return (
    <button
      onClick={() => open(item)}
      className="group relative shrink-0 snap-center w-[250px] md:w-[300px] text-left rounded-[1.6rem] p-[3px] bg-[linear-gradient(145deg,#f1e2c1,#8a6f45_28%,#3a2f20_52%,#cbb084_78%,#f1e2c1)] shadow-[0_30px_70px_-30px_rgba(0,0,0,.9)] transition-transform duration-500 hover:-translate-y-2"
      aria-label={`${item.name} — ${t(UI.details)}`}
    >
      <span className="block rounded-[1.45rem] bg-[#12100e] p-2.5">
        <Plate className="h-[300px] md:h-[360px] rounded-[1.1rem] shadow-[inset_0_0_0_1px_rgba(120,98,64,.35),inset_0_0_40px_rgba(120,98,64,.18)]">
          <span className="absolute inset-3 rounded-[0.8rem] border border-[#8a6f45]/35 pointer-events-none" />
          <span className="absolute inset-x-0 top-8 bottom-0 flex items-end justify-center">
            <Sprite item={item} index={0} className="h-full w-auto max-w-[78%] transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
          </span>
          <span className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-white/80 border border-[#1d1a17]/15 text-[9px] font-bold uppercase tracking-[0.22em] text-[#1d1a17]">{item.brand}</span>
          {n > 1 && <span className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-[#1d1a17]/85 text-[9px] font-semibold uppercase tracking-[0.22em] text-amber-100">{n} {t(TX.versions)}</span>}
        </Plate>
        <span className="block px-3 pt-4 pb-3">
          <span className="block font-display text-3xl text-white leading-tight">{item.name}</span>
          <span className="block text-amber-300/70 text-[10px] uppercase tracking-[0.28em] mt-1.5 mb-3">{t(groupLabel(item.group))}</span>
          <span className="flex items-center justify-between gap-3">
            <span className="text-amber-200">{price > 0 ? <><span className="text-white/45 text-xs mr-1">{t(UI.from)}</span>{euro(price)}</> : <span className="text-xs uppercase tracking-[0.2em]">{t(TX.onRequest)}</span>}</span>
            <span className="w-10 h-10 rounded-full border border-amber-300/40 text-amber-200 flex items-center justify-center group-hover:bg-amber-200 group-hover:text-black transition-colors"><ArrowUpRight className="w-4 h-4" /></span>
          </span>
        </span>
      </span>
    </button>
  );
};

export const Recommended = () => {
  const t = useT();
  const { lang } = useLanguage();
  const catalog = useCatalog();
  const track = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<CatItem | null>(null);
  const items = RECOMMENDED.map((id) => catalog.find((c) => c.id === id)).filter((c): c is CatItem => !!c && !!c.strip);
  if (!items.length) return null;
  const move = (d: number) => track.current?.scrollBy({ left: d * 330, behavior: 'smooth' });
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-x-0 top-1/3 h-[420px] bg-amber-500/5 blur-[140px] pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <p className="text-amber-500 text-xs font-bold uppercase tracking-[0.4em] mb-4">{t(TX.recKicker)}</p>
            <SplitText key={`${lang}-rec`} as="h2" mode="words" text={t(TX.recTitle)} className="font-display text-5xl md:text-7xl text-white leading-[1] mb-5" />
            <p className="text-zinc-400 text-lg">{t(TX.recSub)}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => move(-1)} aria-label="Previous" className="w-12 h-12 rounded-full bb-glass-card flex items-center justify-center hover:border-amber-500 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={() => move(1)} aria-label="Next" className="w-12 h-12 rounded-full bb-glass-card flex items-center justify-center hover:border-amber-500 transition-colors"><ChevronRight className="w-5 h-5" /></button>
            <Magnetic>
              <Link to="/deuren" className="hidden md:inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-zinc-700 hover:border-amber-500 hover:text-amber-300 font-bold transition-colors">{t(TX.all)} <ArrowRight className="w-4 h-4" /></Link>
            </Magnetic>
          </div>
        </div>
      </div>
      <div ref={track} data-lenis-prevent-wheel className="relative flex gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory px-6 md:px-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] pt-4 pb-10">
        {items.map((it) => <FramedCard key={it.id} item={it} open={setOpen} />)}
      </div>
      {open && <CatDialog key={open.id} item={open} start={0} onClose={() => setOpen(null)} />}
    </section>
  );
};

/* ═════════════════════════════  3D SHOWCASE — a ring of versions turns as you scroll  ═════════════════════════════
 * Pinned scene. Each collection gets one segment of the scroll: its room photo fades in
 * behind, and its versions stand on a 3D ring that rotates one step per version. */

export const Showcase3D = () => {
  const t = useT();
  const { lang } = useLanguage();
  const catalog = useCatalog();
  const section = useRef<HTMLElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [front, setFront] = useState(0);
  const items = SHOWCASE.map((id) => catalog.find((c) => c.id === id)).filter((c): c is CatItem => !!c && (c.strip?.items.length ?? 0) >= 3);
  const count = items.length;
  const still = reducedMotion();

  useLayoutEffect(() => {
    if (!count || still) return;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section.current,
        start: 'top top',
        end: `+=${count * 130}%`,
        scrub: 1,
        pin: true,
        anticipatePin: 1,
        onUpdate: (self) => {
          const p = Math.min(0.9999, self.progress) * count;
          const a = Math.floor(p);
          const local = p - a;
          const n = Math.min(items[a].strip!.items.length, 7);
          const turn = local * (n - 1);
          if (ring.current) ring.current.style.transform = `translateZ(-${isMobile() ? 180 : 420}px) rotateY(${-turn * (360 / n)}deg)`;
          setActive(a);
          setFront(Math.round(turn) % n);
        },
      });
    }, section);
    const id = window.setTimeout(() => { ScrollTrigger.sort(); ScrollTrigger.refresh(); }, 100);
    return () => { window.clearTimeout(id); ctx.revert(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, still]);

  if (!count) return null;
  const item = items[active];
  const n = Math.min(item.strip!.items.length, 7);
  const radius = isMobile() ? 180 : 420;
  const price = guidePrice(item);

  return (
    <section ref={section} className="relative h-[100svh] overflow-hidden [contain:paint]">
      {items.map((it, i) => it.scene && (
        <img key={it.id} src={asset(`${it.dir}/scene.jpg`)} alt="" loading="lazy" className={`absolute inset-0 w-full h-full object-cover scale-110 blur-[2px] transition-opacity duration-1000 ${i === active ? 'opacity-40' : 'opacity-0'}`} />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(70%_70%_at_62%_50%,transparent,rgba(11,10,9,.86)_75%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b0a09] via-transparent to-[#0b0a09]" />

      <div className="relative h-full max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] items-center gap-6">
        <div className="relative z-10 pt-20 lg:pt-0">
          <p className="text-amber-500 text-xs font-bold uppercase tracking-[0.4em] mb-4">{t(TX.showKicker)}</p>
          <div key={`${item.id}-${lang}`} className="animate-[sd-rise_.8s_cubic-bezier(.16,1,.3,1)]">
            <p className="text-amber-200/80 text-[11px] uppercase tracking-[0.35em] mb-3">{item.brand} · {t(groupLabel(item.group))}</p>
            <h2 className="font-display text-5xl md:text-8xl text-white leading-[0.92] mb-4 md:mb-5">{item.name}</h2>
            <p className="hidden md:block text-white/70 font-light text-lg leading-relaxed max-w-md mb-6">{intro(item, t, lang)}</p>
            <p className="font-display text-3xl bb-text-gold mb-7">{price > 0 ? `${t(UI.from)} ${euro(price)}` : t(TX.onRequest)}</p>
          </div>
          <div className="flex items-center gap-5">
            <Link to={`/deuren?cat=${item.cat === 'entree' ? 'buiten' : item.cat}&merk=${item.brand}`} className="group inline-flex items-center gap-4 pl-7 pr-2.5 py-2.5 bg-amber-200 text-black font-semibold tracking-wide rounded-full hover:bg-white transition-colors">
              {t(TX.view)}
              <span className="w-10 h-10 rounded-full bg-black text-amber-200 flex items-center justify-center group-hover:rotate-[-45deg] transition-transform duration-500"><ArrowRight className="w-4 h-4" /></span>
            </Link>
            <span className="text-white/60 text-sm tabular-nums">{item.labels?.[front] ?? ''}</span>
          </div>
          <div className="flex gap-2 mt-8">
            {items.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === active ? 'w-10 bg-amber-500' : 'w-4 bg-zinc-700'}`} />)}
          </div>
        </div>

        <div className="relative h-[40svh] lg:h-[74svh]" style={{ perspective: 1500 }} aria-hidden="true">
          <div className="absolute left-1/2 bottom-[6%] -translate-x-1/2 w-[70%] h-10 rounded-[100%] bg-amber-300/20 blur-2xl" />
          <div ref={ring} className="absolute inset-0 will-change-transform" style={{ transformStyle: 'preserve-3d', transform: `translateZ(-${radius}px)`, transition: still ? undefined : 'transform .15s linear' }}>
            {Array.from({ length: n }, (_, i) => (
              <div
                key={`${item.id}-${i}`}
                className="absolute left-1/2 top-1/2 w-[116px] h-[256px] md:w-[210px] md:h-[460px] -ml-[58px] -mt-[128px] md:-ml-[105px] md:-mt-[230px] rounded-[1.2rem] p-[3px] bg-[linear-gradient(145deg,#f1e2c1,#8a6f45_30%,#3a2f20_55%,#cbb084)]"
                style={{ transform: `rotateY(${i * (360 / n)}deg) translateZ(${radius}px)`, backfaceVisibility: 'hidden', boxShadow: i === front ? '0 40px 120px -20px rgba(191,159,110,.55)' : '0 20px 60px -30px rgba(0,0,0,.9)' }}
              >
                <Plate className="w-full h-full rounded-[1rem]">
                  <span className="absolute inset-x-0 top-5 bottom-0 flex items-end justify-center">
                    <Sprite item={item} index={i} className="h-full w-auto max-w-[84%]" />
                  </span>
                </Plate>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="absolute bottom-6 inset-x-0 text-center text-white/40 text-[11px] uppercase tracking-[0.35em]">{t(TX.scroll)}</p>
      <style>{`@keyframes sd-rise{from{opacity:0;transform:translateY(30px);filter:blur(8px)}to{opacity:1;transform:none;filter:none}}`}</style>
    </section>
  );
};
