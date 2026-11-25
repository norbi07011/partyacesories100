import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useLanguage, useT, type L } from '../i18n';
import { UI } from '../ui';
import { Kicker } from '../components/PageHero';
import { Picture, MEDIA, type MediaName } from '../components/Media';
import { scrollState } from '../fx/core';
import { SplitText, Reveal } from '../fx/components';

const TX = {
  catKicker: ['Collectie', 'Collection', 'Kolekcja'],
  catTitle: ['Voor elke opening in huis', 'For every opening in the house', 'Do każdego otworu w domu'],
  catAll: ['Alle producten', 'All products', 'Wszystkie produkty'],
  view: ['Bekijk', 'View', 'Zobacz'],
  quoteKicker: ['Thuiskomen', 'Coming home', 'Powrót do domu'],
  quote: [
    'Een deur is het eerste wat je aanraakt als je thuiskomt.',
    'A door is the first thing you touch when you come home.',
    'Drzwi to pierwsza rzecz, której dotykasz, wracając do domu.',
  ],
  quoteText: [
    'Daarom letten we op wat je elke dag voelt: een kruk die goed in de hand ligt, een deur die zacht sluit en een naad die overal even breed is.',
    'That is why we care about what you feel every day: a handle that sits well in the hand, a door that closes softly and a gap that is even all round.',
    'Dlatego dbamy o to, co czujesz każdego dnia: klamkę, która dobrze leży w dłoni, drzwi, które cicho się zamykają, i równą szczelinę na całym obwodzie.',
  ],
  quoteLink: ['Zo werken wij', 'How we work', 'Jak pracujemy'],
} satisfies Record<string, L>;

const TILES: { to: string; photo: MediaName; position: string; title: L; sub: L }[] = [
  {
    to: '/deuren?cat=binnen', photo: 'interior', position: '34% 50%', title: UI.interior,
    sub: ['Vlak, paneel, glas of staallook', 'Flush, panelled, glazed or steel-look', 'Gładkie, płycinowe, przeszklone lub loftowe'],
  },
  {
    to: '/deuren?cat=buiten', photo: 'entrance', position: '76% 50%', title: UI.exterior,
    sub: ['Veilig, geïsoleerd en op maat', 'Secure, insulated and made to measure', 'Bezpieczne, ocieplone i na wymiar'],
  },
  {
    to: '/deuren?cat=kozijn', photo: 'hall', position: '62% 50%', title: UI.frames,
    sub: ['Hout, staal of onzichtbaar', 'Timber, steel or concealed', 'Drewniane, stalowe lub ukryte'],
  },
];

/* ═════════════════════════════  CATEGORIES — three photo doors into the shop  ═════════════════════════════ */

export const Categories = () => {
  const t = useT();
  const { lang } = useLanguage();
  return (
    <section className="relative py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 md:mb-16">
          <div>
            <Kicker>{t(TX.catKicker)}</Kicker>
            <SplitText key={`${lang}-cat`} as="h2" mode="words" text={t(TX.catTitle)} className="font-display text-5xl md:text-7xl text-white leading-[1] max-w-3xl" />
          </div>
          <Link to="/deuren" className="group inline-flex items-center gap-3 self-start md:self-auto text-amber-100 text-sm font-medium tracking-wide border-b border-amber-200/40 hover:border-amber-200 pb-1.5 transition-colors">
            {t(TX.catAll)} <ArrowRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
          </Link>
        </div>

        <Reveal stagger={0.12} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-[1.3fr_1fr_1fr] gap-4 md:gap-5">
          {TILES.map((tile, i) => (
            <Link
              key={tile.to}
              to={tile.to}
              className="group relative block h-[62vw] max-h-[420px] md:max-h-none md:h-[clamp(420px,66vh,640px)] overflow-hidden rounded-[22px] bg-zinc-900 ring-1 ring-white/10 hover:ring-amber-200/50 transition-shadow duration-700"
            >
              <div className="absolute inset-0 transition-transform duration-[1400ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.06]">
                <Picture name={tile.photo} alt={t(MEDIA[tile.photo].alt)} position={tile.position} drift={6} sizes="(min-width: 768px) 40vw, 100vw" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/25" />
              <span className="absolute top-5 left-6 font-display italic text-xl text-white/80">{String(i + 1).padStart(2, '0')}</span>
              <span className="absolute top-4 right-4 w-11 h-11 rounded-full border border-white/30 bg-black/20 backdrop-blur-sm text-white flex items-center justify-center transition-all duration-500 group-hover:bg-amber-200 group-hover:border-amber-200 group-hover:text-black group-hover:rotate-45">
                <ArrowUpRight className="w-4 h-4" />
              </span>
              <div className="absolute inset-x-0 bottom-0 p-6 md:p-7">
                <h3 className="font-display text-4xl md:text-[2.6rem] text-white leading-none mb-2.5">{t(tile.title)}</h3>
                <p className="text-white/75 text-sm md:text-[15px]">{t(tile.sub)}</p>
                <span className="mt-5 block h-px w-full origin-left scale-x-[.18] bg-amber-200/80 transition-transform duration-700 ease-out group-hover:scale-x-100" />
              </div>
            </Link>
          ))}
        </Reveal>
      </div>
    </section>
  );
};

/* ═════════════════════════════  STATEMENT — full-bleed photo with one sentence  ═════════════════════════════ */

export const Statement = () => {
  const t = useT();
  const { lang } = useLanguage();
  return (
    <section className="relative min-h-[88svh] flex items-center overflow-hidden [contain:paint]">
      <Picture name="hall" alt={t(MEDIA.hall.alt)} position="72% 50%" drift={14} className="opacity-95" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/35 to-transparent md:from-black/60 md:via-black/10" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b0a09] via-transparent to-[#0b0a09]" />
      <div className="relative max-w-7xl mx-auto px-6 w-full py-28">
        <div className="max-w-2xl">
          <Kicker>{t(TX.quoteKicker)}</Kicker>
          <SplitText key={`${lang}-quote`} as="p" mode="words" text={t(TX.quote)} className="font-display text-[2.6rem] sm:text-6xl lg:text-7xl text-white leading-[1.02] mb-8" />
          <Reveal>
            <p className="text-white/75 font-light text-lg leading-relaxed max-w-lg mb-9">{t(TX.quoteText)}</p>
            <Link to="/over-ons" className="group inline-flex items-center gap-3 text-amber-100 text-sm font-medium tracking-wide border-b border-amber-200/40 hover:border-amber-200 pb-1.5 transition-colors">
              {t(TX.quoteLink)} <ArrowRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

/* ═════════════════════════════  SECTION RAIL — where am I on this long page  ═════════════════════════════
 * Desktop only. Reads the wrappers marked with data-rail, highlights the one in view and
 * scrolls to a chapter on click. */

export const SectionRail = () => {
  const { lang } = useLanguage();
  const [items, setItems] = useState<{ el: HTMLElement; label: string }[]>([]);
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const collect = () => setItems(Array.from(document.querySelectorAll<HTMLElement>('[data-rail]')).map((el) => ({ el, label: el.dataset.rail || '' })));
    collect();
    const id = window.setTimeout(collect, 600); // sections that mount after the catalogue loads
    return () => window.clearTimeout(id);
  }, [lang]);

  useEffect(() => {
    if (!items.length) return;
    let raf = 0;
    let last = -1;
    const loop = () => {
      const mid = window.innerHeight * 0.5;
      let idx = 0;
      items.forEach((it, i) => { if (it.el.getBoundingClientRect().top <= mid) idx = i; });
      const end = items[items.length - 1].el.getBoundingClientRect().bottom;
      const show = window.scrollY > window.innerHeight * 0.6 && end > mid;
      if (idx !== last) { last = idx; setActive(idx); }
      setVisible(show);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [items]);

  const go = (el: HTMLElement) => {
    const y = el.getBoundingClientRect().top + window.scrollY;
    if (scrollState.lenis) scrollState.lenis.scrollTo(y, { duration: 1.4 });
    else window.scrollTo({ top: y, behavior: 'smooth' });
  };

  return (
    <nav
      aria-label="Page sections"
      className={`hidden xl:flex fixed z-30 right-3 2xl:right-6 top-1/2 -translate-y-1/2 flex-col items-end gap-1 transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      {items.map((it, i) => (
        <button key={i} type="button" onClick={() => go(it.el)} aria-current={i === active ? 'true' : undefined} className="group flex items-center gap-3 py-1.5 pl-6">
          <span className={`px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-sm text-[10px] uppercase tracking-[0.28em] opacity-0 translate-x-1 transition-all duration-500 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 ${i === active ? 'text-amber-200' : 'text-white/80'}`}>
            {it.label}
          </span>
          <span className={`h-px transition-all duration-500 ${i === active ? 'w-9 bg-amber-200' : 'w-4 bg-white/35 group-hover:w-6 group-hover:bg-white/70'}`} />
        </button>
      ))}
    </nav>
  );
};
