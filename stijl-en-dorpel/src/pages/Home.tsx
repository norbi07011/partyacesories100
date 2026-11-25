import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown, MousePointer2, Plus,
  DoorOpen, Home as HomeIcon, Frame, Ruler, Wrench, Layers, Lock, Wind, Recycle,
} from 'lucide-react';
import { useLanguage, useT, euro, type L } from '../i18n';
import { UI, useDocumentTitle } from '../ui';
import { MODELS, FINISHES, GLASS, defaultConfig, modelById } from '../data/doors';
import { STEPS, WHY, SERVICES, FAQ, type ServiceIcon } from '../data/content';
import { useQuote } from '../quote';
import { Door } from '../components/Door';
import { Kicker } from '../components/PageHero';
import { gsap, reducedMotion, isMobile, flyTo } from '../fx/core';
import { useTransitionNavigate } from '../fx/Engine';
import { Spotlights, Dust } from '../fx/Backdrop';
import { SplitText, Reveal, Magnetic, CountUp, VelocityMarquee, TiltCard } from '../fx/components';

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
    ['Deurmodellen', 'Door models', 'Modeli drzwi'],
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
  ctaTitle: ['Klaar voor nieuwe deuren?', 'Ready for new doors?', 'Gotowi na nowe drzwi?'],
  ctaSub: [
    'Stel je deur samen en vraag een offerte aan — of plan direct een inmeetafspraak.',
    'Configure your door and request a quote — or book a survey right away.',
    'Skonfiguruj drzwi i poproś o wycenę — albo od razu umów pomiar.',
  ],
} satisfies Record<string, L | L[] | [string[], string[], string[]] | Record<string, L>>;

/* ═════════════════════════════  HERO — the door opens as you scroll  ═════════════════════════════ */

const Hero = () => {
  const t = useT();
  const { lang } = useLanguage();
  const section = useRef<HTMLElement>(null);
  const leaf = useRef<HTMLDivElement>(null);
  const model = modelById('gracht');

  useLayoutEffect(() => {
    if (reducedMotion()) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: section.current, start: 'top top', end: '+=170%', scrub: 1, pin: true, anticipatePin: 1 },
      });
      tl.fromTo(leaf.current, { rotateY: 16 }, { rotateY: 84, duration: 1, ease: 'power1.inOut' }, 0)
        .fromTo('.hero-glow', { opacity: 0.25, scale: 0.8 }, { opacity: 1, scale: 1.5, duration: 1 }, 0)
        .fromTo('.hero-spill', { opacity: 0.2, scaleY: 0.5 }, { opacity: 0.9, scaleY: 1, duration: 1 }, 0)
        .fromTo('.hero-doorway', { scale: 1 }, { scale: 1.14, duration: 1 }, 0)
        .to('.hero-intro', { opacity: 0, y: -90, duration: 0.35 }, 0.08)
        .to('.hero-hint', { opacity: 0, duration: 0.1 }, 0)
        .fromTo('.hero-outro', { opacity: 0, y: 70 }, { opacity: 1, y: 0, duration: 0.3 }, 0.62);
      gsap.from('.hero-in', { y: 40, opacity: 0, filter: 'blur(10px)', duration: 1.1, ease: 'expo.out', stagger: 0.12, delay: 0.5, clearProps: 'filter' });
    }, section);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={section} className="relative h-[100svh] overflow-hidden">
      <Spotlights className="opacity-40" />
      <Dust count={70} />
      <div className="hero-glow absolute right-[-10%] md:right-[2%] top-1/2 -translate-y-1/2 w-[90vw] md:w-[52vw] aspect-square rounded-full bg-[radial-gradient(circle,rgba(236,220,188,.42),rgba(191,159,110,.16)_40%,transparent_68%)] pointer-events-none" />

      {/* doorway */}
      <div className="absolute inset-0 flex items-start md:items-center justify-center md:justify-end md:pr-[9vw] lg:pr-[13vw] pt-24 md:pt-10">
        <div className="hero-doorway relative h-[40svh] md:h-[70svh] max-h-[720px] aspect-[100/240] will-change-transform" style={{ perspective: 1500 }}>
          {/* light from the room behind */}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#fff6e0_0%,#f0d7a4_55%,#c9a86f_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_30%,#ffffff,transparent)] opacity-80" />
          {/* frame: two stijlen and a bovendorpel */}
          <div className="absolute -inset-x-[5%] -top-[2.2%] bottom-0 border-x-[0.9vh] border-t-[0.9vh] border-[#1d1a17] shadow-[inset_0_0_0_1px_rgba(203,176,132,.45),0_0_120px_rgba(0,0,0,.8)] pointer-events-none" />
          {/* the leaf, hinged on the left */}
          <div
            ref={leaf}
            className="absolute inset-0 will-change-transform "
            style={{ transformOrigin: '0% 50%', transform: 'rotateY(24deg)' }}
          >
            <Door model={model} frame={false} handle="messing" className="w-full h-full" />
          </div>
          {/* light spilling over the floor */}
          <div
            className="hero-spill absolute left-1/2 top-full -translate-x-1/2 w-[260%] h-[34svh] origin-top pointer-events-none opacity-40"
            style={{ clipPath: 'polygon(31% 0, 69% 0, 100% 100%, 0 100%)', background: 'linear-gradient(180deg, rgba(240,215,164,.55), rgba(191,159,110,.12) 55%, transparent)' }}
          />
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black from-30% via-black/75 via-50% to-transparent md:bg-gradient-to-r md:from-black md:from-0% md:via-black/55 md:via-50% md:to-transparent pointer-events-none" />

      {/* copy */}
      <div className="hero-intro absolute inset-0 flex items-end md:items-center pb-16 md:pb-0">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="max-w-2xl">
            <div className="hero-in"><Kicker>{t(TX.heroKicker)}</Kicker></div>
            <SplitText key={`${lang}-hero`} as="h1" mode="words" trigger="load" delay={0.2} text={t(TX.heroTitle)} className="font-display text-[12vw] sm:text-7xl lg:text-[6.5rem] text-white leading-[0.95] tracking-tight mb-5 md:mb-7" />
            <p className="hero-in text-white/75 font-light text-base md:text-xl leading-relaxed max-w-xl mb-7 md:mb-9">{t(TX.heroSub)}</p>
            <div className="hero-in flex flex-col sm:flex-row gap-4">
              <Magnetic strength={0.35}>
                <Link to="/configurator" className="group inline-flex items-center gap-4 pl-8 pr-2.5 py-2.5 bg-amber-200 text-black font-semibold tracking-wide rounded-full hover:bg-white transition-colors">
                  {t(UI.configure)}
                  <span className="w-11 h-11 rounded-full bg-black text-amber-200 flex items-center justify-center group-hover:rotate-[-45deg] transition-transform duration-500">
                    <ArrowRight className="w-5 h-5" />
                  </span>
                </Link>
              </Magnetic>
              <Magnetic strength={0.25}>
                <Link to="/inmeten" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full border border-white/25 hover:border-amber-300 text-white font-medium backdrop-blur-sm transition-colors">
                  <Ruler className="w-4 h-4" /> {t(UI.bookSurvey)}
                </Link>
              </Magnetic>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-outro absolute inset-0 md:right-[45%] flex flex-col items-center justify-center text-center px-6 opacity-0 pointer-events-none">
        <div className="absolute inset-0 md:right-[45%] bg-[radial-gradient(60%_50%_at_50%_50%,rgba(11,10,9,.8),transparent)]" />
        <p className="relative text-amber-300 text-xs font-bold uppercase tracking-[0.4em] mb-5">{t(TX.outroKicker)}</p>
        <h2 className="relative font-display text-6xl md:text-8xl lg:text-9xl text-white leading-none mb-6">{t(TX.outroTitle)}</h2>
        <p className="relative text-white/80 font-light text-lg md:text-2xl max-w-2xl">{t(TX.outroSub)}</p>
      </div>

      <div className="hero-hint absolute bottom-6 inset-x-0 flex justify-center items-center gap-2 text-white/45 text-[11px] uppercase tracking-[0.35em]">
        <ChevronDown className="w-4 h-4 animate-bounce" /> {t(TX.scroll)}
      </div>
    </section>
  );
};

/* ═════════════════════════════  MARQUEE + FACTS  ═════════════════════════════ */

const Marquee = () => {
  const { lang } = useLanguage();
  const items = TX.marquee[lang === 'NL' ? 0 : lang === 'EN' ? 1 : 2];
  return (
    <section className="relative py-10 md:py-12 border-y border-white/10">
      <VelocityMarquee items={items} baseSpeed={0.5} itemClassName="font-display italic text-4xl md:text-6xl text-white/80" />
    </section>
  );
};

const Facts = () => {
  const t = useT();
  const facts = [MODELS.length, FINISHES.length, GLASS.length, 1];
  return (
    <section className="relative py-20 md:py-28">
      <Reveal stagger={0.1} className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 border-y border-white/10">
        {facts.map((n, i) => (
          <div key={i} className={`py-10 md:py-14 px-4 md:px-8 ${i % 2 ? 'border-l border-white/10' : ''} ${i === 2 ? 'lg:border-l border-t lg:border-t-0 border-white/10' : ''} ${i === 3 ? 'border-t lg:border-t-0 border-white/10' : ''}`}>
            <div className="font-display text-6xl md:text-8xl bb-text-gold leading-none"><CountUp to={n} /></div>
            <div className="mt-5 text-white/55 text-[11px] md:text-xs uppercase tracking-[0.3em]">{t(TX.facts[i])}</div>
          </div>
        ))}
      </Reveal>
    </section>
  );
};

/* ═════════════════════════════  3D COVERFLOW — MODELS  ═════════════════════════════ */

const ModelCarousel = () => {
  const t = useT();
  const { lang } = useLanguage();
  const { addDoor } = useQuote();
  const go = useTransitionNavigate();
  const n = MODELS.length;
  const [active, setActive] = useState(0);
  const drag = useRef<{ x: number } | null>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const step = isMobile() ? 150 : 250;
  const move = (d: number) => setActive((a) => (a + d + n) % n);
  const m = MODELS[active];

  const add = async () => {
    const el = cards.current[active];
    if (el) await flyTo(el);
    addDoor(defaultConfig(m));
  };

  return (
    <section className="relative py-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-amber-500 text-xs font-bold uppercase tracking-[0.4em] mb-4">{t(TX.modelsKicker)}</p>
          <SplitText key={`${lang}-models`} as="h2" text={t(TX.modelsTitle)} className="font-display text-4xl md:text-6xl text-white" />
        </div>

        <div
          className="relative h-[360px] md:h-[460px] select-none touch-pan-y cursor-grab active:cursor-grabbing"
          style={{ perspective: 1400 }}
          onPointerDown={(e) => { drag.current = { x: e.clientX }; }}
          onPointerUp={(e) => {
            if (!drag.current) return;
            const dx = e.clientX - drag.current.x;
            drag.current = null;
            if (Math.abs(dx) > 40) move(dx < 0 ? 1 : -1);
          }}
          onPointerLeave={() => { drag.current = null; }}
        >
          <div className="absolute inset-0 flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
            {MODELS.map((it, i) => {
              let off = i - active;
              if (off > n / 2) off -= n;
              if (off < -n / 2) off += n;
              const abs = Math.abs(off);
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => (off === 0 ? undefined : setActive(i))}
                  aria-label={it.name}
                  tabIndex={abs > 2 ? -1 : 0}
                  className="absolute w-[220px] h-[310px] md:w-[300px] md:h-[410px] rounded-3xl overflow-hidden border border-zinc-800 bg-gradient-to-b from-zinc-800/60 to-zinc-950 transition-all duration-[900ms] ease-[cubic-bezier(.16,1,.3,1)]"
                  style={{
                    transform: `translateX(${off * step}px) translateZ(${-abs * 190}px) rotateY(${-off * 40}deg)`,
                    zIndex: 20 - abs,
                    opacity: abs > 2 ? 0 : 1 - abs * 0.18,
                    pointerEvents: abs > 2 ? 'none' : 'auto',
                    boxShadow: off === 0 ? '0 40px 120px -20px rgba(191, 159, 110,.45)' : 'none',
                    borderColor: off === 0 ? 'rgba(191, 159, 110,.6)' : undefined,
                  }}
                >
                  <div className="absolute inset-x-0 top-0 h-2/3 bg-[radial-gradient(60%_60%_at_50%_30%,rgba(230,217,189,.16),transparent)]" />
                  <div ref={(el) => { cards.current[i] = el; }} className="absolute inset-x-0 top-6 bottom-20 flex items-end justify-center">
                    <Door model={it} className="h-full w-auto max-w-[82%] drop-shadow-[0_18px_30px_rgba(0,0,0,.6)]" />
                  </div>
                  <div className="absolute bottom-0 inset-x-0 p-5 text-left bg-gradient-to-t from-black via-black/80 to-transparent">
                    <div className="text-amber-500 font-mono text-xs mb-1">{String(i + 1).padStart(2, '0')} · {t(it.cat === 'binnen' ? UI.interior : UI.exterior)}</div>
                    <div className="text-white font-display text-2xl leading-tight">{it.name}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <button onClick={() => move(-1)} aria-label="Previous" className="absolute left-0 md:left-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bb-glass-card flex items-center justify-center hover:border-amber-500 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => move(1)} aria-label="Next" className="absolute right-0 md:right-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bb-glass-card flex items-center justify-center hover:border-amber-500 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <p className="text-center text-zinc-600 text-xs uppercase tracking-[0.3em] mt-6 flex items-center justify-center gap-2">
          <MousePointer2 className="w-3.5 h-3.5" /> {t(TX.drag)}
        </p>

        <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-4xl mx-auto">
          {MODELS.map((it, i) => (
            <button
              key={it.id}
              onClick={() => setActive(i)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-300 ${i === active ? 'bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/30 scale-105' : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-amber-500/50 hover:text-white'}`}
            >
              {it.name}
            </button>
          ))}
        </div>

        <div key={active} className="mt-12 max-w-3xl mx-auto text-center animate-[bb-panel_.7s_cubic-bezier(.16,1,.3,1)]">
          <p className="text-amber-200/80 text-sm uppercase tracking-[0.3em] mb-3">{t(m.style)} · {t(UI.from)} {euro(m.price)}</p>
          <p className="text-zinc-400 text-lg leading-relaxed mb-6">{t(m.desc)}</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-8">
            {m.specs.map((f, i) => (
              <span key={i} className="flex items-center gap-2 text-zinc-300 text-sm">
                <CheckCircle2 className="w-4 h-4 text-amber-500" /> {t(f)}
              </span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Magnetic>
              <button onClick={() => go(`/configurator?model=${m.id}`)} className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-full inline-flex items-center gap-2 shadow-xl shadow-amber-500/25 transition-colors">
                {t(UI.configure)} <ArrowRight className="w-5 h-5" />
              </button>
            </Magnetic>
            <Magnetic strength={0.3}>
              <button onClick={add} className="px-8 py-4 rounded-full border border-zinc-700 hover:border-amber-500 text-white font-bold inline-flex items-center gap-2 transition-colors">
                <Plus className="w-5 h-5" /> {t(UI.addToQuote)}
              </button>
            </Magnetic>
          </div>
        </div>
      </div>
      <style>{`@keyframes bb-panel{from{opacity:0;transform:translateY(24px);filter:blur(8px)}to{opacity:1;transform:none;filter:none}}`}</style>
    </section>
  );
};

/* ═════════════════════════════  SCROLLYTELLING — PROCESS  ═════════════════════════════
 * Pinned scene: the door turns as you scroll and evolves with each step —
 * drawing (choose) → dimensions (measure) → finished leaf (make) → hung in its frame (fit). */

const ProcessStory = () => {
  const t = useT();
  const section = useRef<HTMLElement>(null);
  const turn = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(reducedMotion() ? STEPS.length - 1 : 0);
  const model = modelById('tuindorp');

  useLayoutEffect(() => {
    if (reducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: section.current,
          start: 'top top',
          end: `+=${STEPS.length * 90}%`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          onUpdate: (self) => setActive(Math.min(STEPS.length - 1, Math.floor(self.progress * STEPS.length * 0.999))),
        },
      })
        .to('.story-bar', { scaleY: 1, duration: 1 }, 0)
        .fromTo(turn.current, { rotateY: -32 }, { rotateY: 28, duration: 1 }, 0);
    }, section);
    return () => ctx.revert();
  }, []);

  const layer = (on: boolean) => `absolute inset-0 flex items-center justify-center transition-all duration-700 ${on ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`;

  return (
    <section ref={section} className="relative h-[100svh] overflow-hidden flex items-center">
      <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-16 items-center">
        <div className="relative h-[44svh] lg:h-[76vh]" style={{ perspective: 1400 }} aria-hidden="true">
          <div className="absolute inset-[12%] rounded-full bg-amber-300/10 blur-[90px]" />
          <div ref={turn} className="absolute inset-0 will-change-transform" style={{ transformStyle: 'preserve-3d' }}>
            <div className={layer(active <= 1)}>
              <div className="relative h-[86%]">
                <Door model={model} wire frame={false} className="h-full w-auto" />
                {/* dimension lines */}
                <div className={`absolute -bottom-7 inset-x-0 flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] text-amber-200 transition-opacity duration-700 ${active === 1 ? 'opacity-100' : 'opacity-0'}`}>
                  <span className="h-px flex-1 bg-amber-300/70" />830<span className="h-px flex-1 bg-amber-300/70" />
                </div>
                <div className={`absolute -right-9 inset-y-0 flex flex-col items-center gap-2 font-mono text-[10px] tracking-[0.25em] text-amber-200 transition-opacity duration-700 ${active === 1 ? 'opacity-100' : 'opacity-0'}`}>
                  <span className="w-px flex-1 bg-amber-300/70" /><span className="[writing-mode:vertical-rl]">2015</span><span className="w-px flex-1 bg-amber-300/70" />
                </div>
              </div>
            </div>
            <div className={layer(active === 2)}>
              <Door model={model} frame={false} className="h-[86%] w-auto drop-shadow-[0_30px_60px_rgba(0,0,0,.7)]" />
            </div>
            <div className={layer(active === 3)}>
              <Door model={model} className="h-[92%] w-auto drop-shadow-[0_30px_60px_rgba(0,0,0,.7)]" />
            </div>
          </div>
        </div>

        <div className="relative">
          <p className="text-amber-500 text-xs font-bold uppercase tracking-[0.4em] mb-4">{t(TX.processKicker)}</p>
          <h2 className="font-display text-3xl md:text-5xl text-white mb-8 lg:mb-12">{t(TX.processTitle)}</h2>
          <div className="flex gap-6">
            <div className="relative w-px bg-zinc-800 shrink-0">
              <div className="story-bar absolute inset-0 bg-amber-500 origin-top" style={{ transform: reducedMotion() ? 'none' : 'scaleY(0)' }} />
            </div>
            <div className="relative flex-1 min-h-[210px] md:min-h-[240px]">
              {STEPS.map((s, i) => (
                <div
                  key={i}
                  className="absolute inset-0 transition-all duration-700 ease-out"
                  style={{
                    opacity: active === i ? 1 : 0,
                    transform: `translateY(${(i - active) * 40}px) rotateX(${(active - i) * 25}deg)`,
                    filter: active === i ? 'none' : 'blur(8px)',
                  }}
                  aria-hidden={active !== i}
                >
                  <div className="font-display text-7xl md:text-8xl bb-text-outline leading-none mb-4">0{i + 1}</div>
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">{t(s.title)}</h3>
                  <p className="text-zinc-400 text-base md:text-lg max-w-md">{t(s.desc)}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 mt-8 lg:mt-10">
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === active ? 'w-10 bg-amber-500' : 'w-4 bg-zinc-700'}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ═════════════════════════════  ANATOMY + WHY US  ═════════════════════════════ */

const Tag = ({ children, className }: { children: string; className: string }) => (
  <span className={`absolute flex items-center gap-2 font-mono text-[10px] md:text-[11px] uppercase tracking-[0.25em] text-amber-200 whitespace-nowrap ${className}`}>
    {children}
  </span>
);

const Anatomy = () => {
  const t = useT();
  const { lang } = useLanguage();
  return (
    <section className="py-28 md:py-36">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-16 lg:gap-24 items-center">
        <div>
          <Kicker>{t(TX.anatomyKicker)}</Kicker>
          <SplitText key={`${lang}-anat`} as="h2" mode="words" text={t(TX.anatomyTitle)} className="font-display text-5xl md:text-7xl text-white leading-[1] mb-8" />
          <Reveal><p className="text-white/70 font-light text-lg leading-relaxed max-w-xl mb-12">{t(TX.anatomyText)}</p></Reveal>
          <Reveal stagger={0.07} className="border-t border-white/10">
            {WHY.map((item, index) => (
              <div key={index} className="group flex items-baseline gap-6 py-5 border-b border-white/10">
                <span className="font-display italic text-amber-300/80 text-xl w-8 shrink-0">{String(index + 1).padStart(2, '0')}</span>
                <span className="text-white/85 text-lg font-light group-hover:text-white group-hover:translate-x-1 transition-all duration-500">{t(item)}</span>
              </div>
            ))}
          </Reveal>
        </div>
        <Reveal variant="right" className="justify-self-center w-full max-w-[380px]">
          <figure className="relative px-16 md:px-20 py-10">
            <div className="absolute inset-6 rounded-[2.5rem] bg-amber-300/5 blur-2xl" aria-hidden="true" />
            <div className="relative">
              <Door model={modelById('haarlem')} wire className="w-full h-auto" title="Kozijn met deur" />
              <Tag className="left-1/2 -translate-x-1/2 -top-6">{t(TX.labels.head)}</Tag>
              <Tag className="right-full mr-3 top-[30%] after:content-[''] after:w-6 after:h-px after:bg-amber-300/70">{t(TX.labels.stile)}</Tag>
              <Tag className="left-full ml-3 top-[30%] before:content-[''] before:w-6 before:h-px before:bg-amber-300/70">{t(TX.labels.stile)}</Tag>
              <Tag className="left-full ml-3 top-[66%] before:content-[''] before:w-10 before:h-px before:bg-amber-300/70">{t(TX.labels.panel)}</Tag>
              <Tag className="right-full mr-3 top-[50%] after:content-[''] after:w-9 after:h-px after:bg-amber-300/70">{t(TX.labels.leaf)}</Tag>
              <Tag className="left-1/2 -translate-x-1/2 -bottom-7">{t(TX.labels.sill)}</Tag>
              <div className="absolute -inset-x-3 -bottom-1 h-[3px] bg-gradient-to-r from-transparent via-amber-300 to-transparent" aria-hidden="true" />
            </div>
          </figure>
        </Reveal>
      </div>
    </section>
  );
};

/* ═════════════════════════════  SERVICES GRID  ═════════════════════════════ */

const ServicesGrid = () => {
  const t = useT();
  const { lang } = useLanguage();
  return (
    <section className="relative py-28 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div>
            <p className="text-amber-500 text-xs font-bold uppercase tracking-[0.4em] mb-4">{t(TX.servicesKicker)}</p>
            <SplitText key={`${lang}-svc`} as="h2" text={t(TX.servicesTitle)} className="font-display text-5xl md:text-7xl text-white" />
          </div>
          <Magnetic>
            <Link to="/diensten" className="inline-flex items-center gap-2 px-7 py-4 rounded-full border border-zinc-700 hover:border-amber-500 hover:text-amber-400 font-bold transition-colors">
              {t(TX.allServices)} <ArrowUpRight className="w-5 h-5" />
            </Link>
          </Magnetic>
        </div>
        <Reveal stagger={0.08} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {SERVICES.slice(0, 6).map((s, i) => {
            const Icon = SERVICE_ICONS[s.icon];
            return (
              <TiltCard key={i} max={7} className="h-full">
                <Link to="/diensten" className="group block h-full bb-glass-card rounded-3xl p-8 hover:border-amber-500/60 transition-colors">
                  <div className="flex items-center justify-between mb-8">
                    <span className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300">
                      <Icon className="w-6 h-6" />
                    </span>
                    <span className="font-display italic text-amber-300/60 text-xl">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <h3 className="font-display text-3xl text-white mb-3">{t(s.title)}</h3>
                  <p className="text-zinc-400 leading-relaxed">{t(s.desc)}</p>
                </Link>
              </TiltCard>
            );
          })}
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
              <span className={`shrink-0 w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-500 ${on ? 'rotate-45 border-amber-400 text-amber-300' : 'border-zinc-700 text-zinc-400'}`}>
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
    <section className="py-28 md:py-36 border-t border-white/10">
      <div className="max-w-5xl mx-auto px-6">
        <SplitText key={`${lang}-faq`} as="h2" mode="words" text={t(TX.faqTitle)} className="font-display text-5xl md:text-7xl text-white leading-[1] mb-14" />
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
    <section className="relative py-36 md:py-48 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(55%_70%_at_50%_100%,rgba(191,159,110,.28),transparent_70%)]" />
      <div className="absolute inset-x-0 bottom-0 flex justify-center gap-[6vw] opacity-25 pointer-events-none" aria-hidden="true">
        {['delft', 'polder', 'tuindorp', 'gracht', 'loods'].map((id) => (
          <Door key={id} model={modelById(id)} wire frame={false} className="h-[46vh] w-auto translate-y-[18%]" />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
      <div className="relative max-w-5xl mx-auto px-6 text-center">
        <Kicker center>Stijl &amp; Dorpel</Kicker>
        <SplitText key={`${lang}-cta`} as="h2" mode="words" text={t(TX.ctaTitle)} className="font-display text-5xl md:text-8xl text-white mb-8 leading-[0.98]" />
        <p className="text-white/70 font-light text-lg md:text-xl mb-12">{t(TX.ctaSub)}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Magnetic strength={0.4}>
            <Link to="/configurator" className="group inline-flex items-center gap-4 pl-10 pr-3 py-3 bg-amber-200 text-black text-base font-semibold tracking-wide rounded-full hover:bg-white transition-colors">
              {t(UI.configure)}
              <span className="w-11 h-11 rounded-full bg-black text-amber-200 flex items-center justify-center group-hover:rotate-[-45deg] transition-transform duration-500">
                <ArrowRight className="w-5 h-5" />
              </span>
            </Link>
          </Magnetic>
          <Link to="/inmeten" className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-white/25 hover:border-amber-300 text-white font-medium transition-colors">
            <Ruler className="w-4 h-4" /> {t(UI.bookSurvey)}
          </Link>
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
      <Marquee />
      <Facts />
      <ModelCarousel />
      <ProcessStory />
      <Anatomy />
      <ServicesGrid />
      <Faq />
      <CTA />
    </>
  );
};

export default Home;
