import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Plus, DoorOpen, Home as HomeIcon, Frame, Ruler, Wrench, Layers, Lock, Wind, Recycle } from 'lucide-react';
import { useLanguage, useT, type L } from '../i18n';
import { UI, useDocumentTitle } from '../ui';
import { STEPS, SERVICES, FAQ, type ServiceIcon } from '../data/content';
import { useCatalog } from '../catalog';
import { Recommended } from './HomeShowcase';
import { Picture, MEDIA, type MediaName } from '../components/Media';
import { asset } from '../components/Door';
import { Kicker } from '../components/PageHero';
import { SplitText, Reveal } from '../fx/components';

export const SERVICE_ICONS: Record<ServiceIcon, typeof DoorOpen> = {
  door: DoorOpen, home: HomeIcon, frame: Frame, ruler: Ruler, wrench: Wrench, layers: Layers, lock: Lock, wind: Wind, recycle: Recycle,
};

const TX = {
  heroKicker: ['Deuren & kozijnen · heel Nederland', 'Doors & frames · all of the Netherlands', 'Drzwi i futryny · cała Holandia'],
  heroTitle: ['Nieuwe deuren. Precies op maat.', 'New doors. Made to fit.', 'Nowe drzwi. Dokładnie na wymiar.'],
  heroSub: [
    'Wij vervangen binnendeuren, buitendeuren en kozijnen. Jij kiest het model — wij meten in, maken en monteren.',
    'We replace interior doors, exterior doors and frames. You choose the model — we measure, make and fit.',
    'Wymieniamy drzwi wewnętrzne, zewnętrzne i futryny. Ty wybierasz model — my mierzymy, produkujemy i montujemy.',
  ],
  heroCta: ['Bekijk de collectie', 'View the collection', 'Zobacz kolekcję'],
  view: ['Bekijk', 'View', 'Zobacz'],
  rowInterior: ['Stijldeuren, vlakke deuren, glas en staallook. Meer dan dertig collecties, elk in meerdere modellen en decors.', 'Stile doors, flush doors, glass and steel-look. More than thirty collections, each in several models and finishes.', 'Drzwi ramowe, płytowe, szklane i loftowe. Ponad trzydzieści kolekcji, każda w wielu modelach i dekorach.'],
  rowWindowsTitle: ['Ramen en voordeuren', 'Windows and front doors', 'Okna i drzwi wejściowe'],
  rowWindows: ['Kunststof, aluminium en hout, met profielen die voor Nederlandse kozijnen zijn gemaakt. Voordeur, ramen en garagedeur in één lijn.', 'uPVC, aluminium and timber, with profiles made for Dutch frames. Front door, windows and garage door in one line.', 'PVC, aluminium i drewno, z profilami na rynek holenderski. Drzwi, okna i brama w jednej linii.'],
  rowFrames: ['Een deur is zo goed als het kozijn waarin hij hangt. Vast, verstelbaar of volledig onzichtbaar in de wand.', 'A door is only as good as the frame it hangs in. Fixed, adjustable or fully concealed in the wall.', 'Drzwi są tak dobre, jak ościeżnica, w której wiszą. Stała, regulowana lub całkowicie ukryta w ścianie.'],
  scroll: ['Scroll om de deur te openen', 'Scroll to open the door', 'Przewiń, aby otworzyć drzwi'],
  outroKicker: ['Stap binnen', 'Step inside', 'Wejdź do środka'],
  outroTitle: ['Welkom thuis.', 'Welcome home.', 'Witaj w domu.'],
  outroSub: [
    'Van eerste maat tot laatste scharnier — door één vakploeg.',
    'From first measurement to last hinge — by one crew.',
    'Od pierwszego pomiaru do ostatniego zawiasu — jedna ekipa.',
  ],
  marquee: [
    ['Binnendeuren', 'Voordeuren', 'Kozijnen', 'Schuifdeuren', 'Taatsdeuren', 'En-suite', 'Inmeten', 'Montage', 'Tuindeuren'],
    ['Interior doors', 'Front doors', 'Frames', 'Sliding doors', 'Pivot doors', 'En-suite', 'Measuring', 'Fitting', 'French doors'],
    ['Drzwi wewnętrzne', 'Drzwi wejściowe', 'Futryny', 'Drzwi przesuwne', 'Drzwi osiowe', 'En-suite', 'Pomiar', 'Montaż', 'Drzwi tarasowe'],
  ],
  facts: [
    ['Collecties & modellen', 'Collections & models', 'Kolekcji i modeli'],
    ['Kleuren & houtsoorten', 'Colours & timbers', 'Kolorów i oklein'],
    ['Glassoorten', 'Glass types', 'Rodzaje szkła'],
    ['Aanspreekpunt', 'Point of contact', 'Osoba kontaktowa'],
  ],
  modelsKicker: ['Collectie', 'Collection', 'Kolekcja'],
  modelsTitle: ['Kies je model', 'Choose your model', 'Wybierz model'],
  drag: ['Sleep of klik om te bladeren', 'Drag or click to browse', 'Przeciągnij lub kliknij'],
  processKicker: ['Werkwijze', 'How it works', 'Jak pracujemy'],
  processTitle: ['In vier stappen een nieuwe deur', 'A new door in four steps', 'Nowe drzwi w czterech krokach'],
  anatomyKicker: ['Waar onze naam vandaan komt', 'Where our name comes from', 'Skąd nasza nazwa'],
  anatomyTitle: ['Een goede deur begint bij stijl en dorpel', 'A good door starts with stile and sill', 'Dobre drzwi zaczynają się od futryny'],
  anatomyText: [
    'Een kozijn bestaat uit twee stijlen en een dorpel. Staan die niet haaks, dan gaat de mooiste deur klemmen. Daarom beginnen wij altijd daar — met een rolmaat, een waterpas en geduld.',
    'A door frame is made of two stiles (stijlen) and a sill (dorpel). If they are not square, even the finest door will stick. That is why we always start there — with a tape measure, a level and patience.',
    'Futryna to dwa stojaki (stijlen) i próg lub nadproże (dorpel). Jeśli nie trzymają kąta, najpiękniejsze drzwi będą się zacinać. Dlatego zawsze zaczynamy od nich — z miarą, poziomicą i cierpliwością.',
  ],
  labels: {
    head: ['Bovendorpel', 'Head', 'Nadproże'],
    stile: ['Stijl', 'Stile', 'Stojak'],
    leaf: ['Deurblad', 'Door leaf', 'Skrzydło'],
    panel: ['Paneel', 'Panel', 'Płycina'],
    sill: ['Dorpel', 'Sill', 'Próg'],
  },
  servicesKicker: ['Wat we doen', 'What we do', 'Co robimy'],
  servicesTitle: ['Alles rond deuren', 'Everything about doors', 'Wszystko o drzwiach'],
  allServices: ['Alle diensten', 'All services', 'Wszystkie usługi'],
  faqTitle: ['Veelgestelde vragen', 'Frequently asked questions', 'Najczęstsze pytania'],
  faqSub: [
    'Staat je vraag er niet bij? Bel, mail of stuur een foto via WhatsApp — je krijgt dezelfde dag antwoord.',
    'Is your question not listed? Call, e-mail or send a photo on WhatsApp — you will hear back the same day.',
    'Nie ma tu twojego pytania? Zadzwoń, napisz lub wyślij zdjęcie przez WhatsApp — odpowiemy tego samego dnia.',
  ],
  rail: {
    collection: ['Collectie', 'Collection', 'Kolekcja'],
    models: ['Modellen', 'Models', 'Modele'],
    process: ['Werkwijze', 'Process', 'Proces'],
    craft: ['Vakwerk', 'Craft', 'Rzemiosło'],
    services: ['Diensten', 'Services', 'Usługi'],
    faq: ['Vragen', 'Questions', 'Pytania'],
  },
  ctaTitle: ['Klaar voor nieuwe deuren?', 'Ready for new doors?', 'Gotowi na nowe drzwi?'],
  ctaSub: [
    'Stel je deur samen en vraag een offerte aan — of plan direct een inmeetafspraak.',
    'Configure your door and request a quote — or book a survey right away.',
    'Skonfiguruj drzwi i poproś o wycenę — albo od razu umów pomiar.',
  ],
} satisfies Record<string, L | L[] | [string[], string[], string[]] | Record<string, L>>;

/* ═════════════════════════════  HERO — one photo, one sentence, one button  ═════════════════════════════ */

const Hero = () => {
  const t = useT();
  const { lang } = useLanguage();
  return (
    <section className="relative h-[100svh] min-h-[620px] flex items-end overflow-hidden [contain:paint]">
      <Picture name="entrance" alt={t(MEDIA.entrance.alt)} position="68% 50%" drift={10} eager />
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/25 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0a09] via-transparent to-black/40" />
      <div className="relative max-w-7xl mx-auto px-6 w-full pb-20 md:pb-28">
        <p className="sd-label mb-7">{t(TX.heroKicker)}</p>
        <SplitText key={`${lang}-hero`} as="h1" mode="words" trigger="load" text={t(TX.heroTitle)} className="font-display text-[3.4rem] sm:text-7xl lg:text-[7.5rem] text-white leading-[0.95] max-w-4xl mb-10" />
        <div className="flex flex-wrap items-center gap-x-10 gap-y-6">
          <Link to="/producten" className="sd-btn">{t(TX.heroCta)} <ArrowRight className="w-4 h-4" /></Link>
          <Link to="/inmeten" className="sd-link">{t(UI.bookSurvey)}</Link>
        </div>
      </div>
    </section>
  );
};

/* ═════════════════════════════  EDITORIAL — large photo next to a short text, alternating  ═════════════════════════════ */

type Row = { to: string; title: L; text: L; photo?: MediaName; src?: string; position?: string };

const Editorial = () => {
  const t = useT();
  const { lang } = useLanguage();
  const catalog = useCatalog();
  const facade = catalog.find((it) => it.id === 'eko-aio-modena' && it.scene);
  const rows: Row[] = [
    { to: '/producten?cat=binnen', title: UI.interior, text: TX.rowInterior, photo: 'interior', position: '34% 50%' },
    ...(facade ? [{ to: '/producten?cat=ramen', title: TX.rowWindowsTitle, text: TX.rowWindows, src: asset(`${facade.dir}/scene.jpg`) } as Row] : []),
    { to: '/producten?cat=kozijn', title: UI.frames, text: TX.rowFrames, photo: 'hall', position: '62% 50%' },
  ];
  return (
    <section className="py-32 md:py-48">
      <div className="max-w-7xl mx-auto px-6 space-y-28 md:space-y-40">
        {rows.map((r, i) => (
          <Reveal key={r.to} className={`grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 items-center`}>
            <Link to={r.to} className={`group relative block md:col-span-7 aspect-[4/3] overflow-hidden bg-zinc-900 ${i % 2 ? 'md:order-2' : ''}`}>
              <div className="absolute inset-0 transition-transform duration-[1600ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.04]">
                {r.photo
                  ? <Picture name={r.photo} alt={t(MEDIA[r.photo].alt)} position={r.position} drift={6} sizes="(min-width: 768px) 58vw, 100vw" />
                  : <img src={r.src} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />}
              </div>
            </Link>
            <div className="md:col-span-5">
              <p className="sd-label mb-6">{String(i + 1).padStart(2, '0')}</p>
              <SplitText key={`${lang}-row-${i}`} as="h2" mode="words" text={t(r.title)} className="font-display text-5xl md:text-7xl text-white leading-[0.98] mb-7" />
              <p className="text-white/60 font-light text-lg leading-relaxed max-w-md mb-9">{t(r.text)}</p>
              <Link to={r.to} className="sd-link">{t(TX.view)} <ArrowRight className="w-4 h-4" /></Link>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
};

/* ═════════════════════════════  PROCESS — four plain steps  ═════════════════════════════ */

const Process = () => {
  const t = useT();
  const { lang } = useLanguage();
  return (
    <section className="py-32 md:py-48 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-20 items-start">
        <div className="lg:col-span-5 lg:sticky lg:top-32">
          <p className="sd-label mb-6">{t(TX.processKicker)}</p>
          <SplitText key={`${lang}-proc`} as="h2" mode="words" text={t(TX.processTitle)} className="font-display text-5xl md:text-7xl text-white leading-[0.98]" />
        </div>
        <Reveal stagger={0.1} className="lg:col-span-7 border-t border-white/10">
          {STEPS.map((s, i) => (
            <div key={i} className="grid grid-cols-[4rem_1fr] md:grid-cols-[6rem_1fr] gap-4 py-9 md:py-11 border-b border-white/10">
              <span className="font-display italic text-4xl md:text-5xl text-amber-200/70 leading-none">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="font-display text-3xl md:text-4xl text-white leading-tight mb-3">{t(s.title)}</h3>
                <p className="text-white/55 font-light leading-relaxed max-w-lg">{t(s.desc)}</p>
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
};

/* ═════════════════════════════  SERVICES — a list, not a grid of boxes  ═════════════════════════════ */

const Services = () => {
  const t = useT();
  const { lang } = useLanguage();
  return (
    <section className="py-32 md:py-48 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 md:mb-24">
          <div>
            <p className="sd-label mb-6">{t(TX.servicesKicker)}</p>
            <SplitText key={`${lang}-svc`} as="h2" mode="words" text={t(TX.servicesTitle)} className="font-display text-5xl md:text-7xl text-white leading-[0.98]" />
          </div>
          <Link to="/diensten" className="sd-link self-start md:self-auto">{t(TX.allServices)} <ArrowRight className="w-4 h-4" /></Link>
        </div>
        <Reveal stagger={0.06} className="grid grid-cols-1 md:grid-cols-2 gap-x-20 border-t border-white/10">
          {SERVICES.slice(0, 6).map((s, i) => (
            <Link key={i} to="/diensten" className="group flex items-baseline gap-6 py-8 border-b border-white/10">
              <span className="text-white/35 text-xs tracking-[0.2em] w-6 shrink-0">{String(i + 1).padStart(2, '0')}</span>
              <span>
                <span className="block font-display text-3xl text-white group-hover:text-amber-100 transition-colors mb-2">{t(s.title)}</span>
                <span className="block text-white/50 font-light text-[15px] leading-relaxed max-w-md">{t(s.desc)}</span>
              </span>
            </Link>
          ))}
        </Reveal>
      </div>
    </section>
  );
};

/* ═════════════════════════════  FAQ  ═════════════════════════════ */

export const FaqList = () => {
  const t = useT();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="border-t border-white/10">
      {FAQ.map((f, i) => {
        const on = open === i;
        return (
          <div key={i} className="border-b border-white/10">
            <button
              onClick={() => setOpen(on ? null : i)}
              aria-expanded={on}
              className="w-full flex items-center justify-between gap-6 py-6 text-left group"
            >
              <span className={`font-display text-2xl md:text-3xl transition-colors ${on ? 'text-amber-200' : 'text-white group-hover:text-amber-100'}`}>{t(f.q)}</span>
              <span className={`shrink-0 w-10 h-10 sd-round border flex items-center justify-center transition-all duration-500 ${on ? 'rotate-45 border-amber-400 text-amber-300' : 'border-zinc-700 text-zinc-400'}`}>
                <Plus className="w-4 h-4" />
              </span>
            </button>
            <div className={`grid transition-all duration-500 ease-out ${on ? 'grid-rows-[1fr] opacity-100 pb-7' : 'grid-rows-[0fr] opacity-0'}`}>
              <p className="overflow-hidden text-zinc-400 text-lg leading-relaxed max-w-3xl">{t(f.a)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Faq = () => {
  const t = useT();
  const { lang } = useLanguage();
  return (
    <section className="py-32 md:py-48 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[0.75fr_1.25fr] gap-12 lg:gap-20 items-start">
        <div className="lg:sticky lg:top-32">
          <p className="sd-label mb-6">FAQ</p>
          <SplitText key={`${lang}-faq`} as="h2" mode="words" text={t(TX.faqTitle)} className="font-display text-5xl md:text-6xl text-white leading-[1] mb-7" />
          <p className="text-white/65 text-lg font-light leading-relaxed max-w-sm mb-8">{t(TX.faqSub)}</p>
          <Link to="/contact" className="sd-link">
            {t(UI.nav.contact)} <ArrowRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
          </Link>
        </div>
        <FaqList />
      </div>
    </section>
  );
};

/* ═════════════════════════════  CTA  ═════════════════════════════ */

export const CTA = () => {
  const t = useT();
  const { lang } = useLanguage();
  return (
    <section className="py-36 md:py-56 border-t border-white/10">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <p className="sd-label mb-8">Stijl &amp; Dorpel</p>
        <SplitText key={`${lang}-cta`} as="h2" mode="words" text={t(TX.ctaTitle)} className="font-display text-5xl md:text-8xl text-white mb-8 leading-[0.98]" />
        <p className="text-white/55 font-light text-lg mb-12 max-w-xl mx-auto">{t(TX.ctaSub)}</p>
        <div className="flex flex-wrap gap-x-10 gap-y-6 justify-center items-center">
          <Link to="/contact" className="sd-btn">{t(UI.requestQuote)} <ArrowRight className="w-4 h-4" /></Link>
          <Link to="/inmeten" className="sd-link">{t(UI.bookSurvey)}</Link>
        </div>
      </div>
    </section>
  );
};

const Home = () => {
  useDocumentTitle();
  return (
    <>
      <Hero />
      <Editorial />
      <Recommended />
      <Process />
      <Services />
      <Faq />
      <CTA />
    </>
  );
};

export default Home;
