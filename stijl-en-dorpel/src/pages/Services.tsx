import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Wrench } from 'lucide-react';
import { useLanguage, useT, type L } from '../i18n';
import { UI, useDocumentTitle } from '../ui';
import { SERVICES, STEPS } from '../data/content';
import { CatPhoto } from '../catalog';
import { PageHero, Badge, Kicker } from '../components/PageHero';
import { Reveal, SplitText, Magnetic } from '../fx/components';
import { SERVICE_ICONS, FaqList, CTA } from './Home';

const TX = {
  title: ['Alles rond deuren', 'Everything about doors', 'Wszystko o drzwiach'],
  sub: [
    'Vervangen, inmeten, monteren, beveiligen en afwerken. Eén ploeg, één afspraak, één offerte.',
    'Replacing, measuring, fitting, securing and finishing. One crew, one appointment, one quote.',
    'Wymiana, pomiar, montaż, zabezpieczenie i wykończenie. Jedna ekipa, jeden termin, jedna wycena.',
  ],
  badge: ['Diensten', 'Services', 'Usługi'],
  priceKicker: ['Eerlijk over kosten', 'Honest about cost', 'Uczciwie o kosztach'],
  priceTitle: ['Wat bepaalt de prijs?', 'What determines the price?', 'Od czego zależy cena?'],
  price: [
    {
      t: ['Het model', 'The model', 'Model'],
      d: ['Een vlakke deur is voordeliger dan een paneeldeur, glas of staallook. Buitendeuren zijn geïsoleerd en daardoor duurder.', 'A flush door costs less than a panel, glazed or steel-look door. Exterior doors are insulated and therefore cost more.', 'Gładkie drzwi są tańsze niż płycinowe, przeszklone czy loftowe. Zewnętrzne są ocieplone, więc droższe.'],
    },
    {
      t: ['De maat', 'The size', 'Wymiar'],
      d: ['Standaardmaten liggen op voorraad. Wijkt je kozijn af — vaak in oudere huizen — dan wordt de deur op maat gemaakt.', 'Standard sizes are in stock. If your frame differs — common in older houses — the door is made to measure.', 'Wymiary standardowe są dostępne od ręki. Gdy futryna odbiega od normy — częste w starszych domach — drzwi robimy na wymiar.'],
    },
    {
      t: ['Het kozijn', 'The frame', 'Futryna'],
      d: ['Kan het bestaande kozijn blijven, dan is dat de voordeligste route. Een nieuw kozijn kost meer, maar lost scheefstand en houtrot in één keer op.', 'Keeping the existing frame is the cheapest route. A new frame costs more, but fixes misalignment and rot in one go.', 'Zachowanie obecnej futryny to najtańsza opcja. Nowa kosztuje więcej, ale za jednym razem usuwa krzywizny i zgniliznę.'],
    },
    {
      t: ['Het werk', 'The work', 'Robocizna'],
      d: ['Afhangen, afstellen, beslag monteren en de oude deur afvoeren: je ziet het als aparte regel in de offerte.', 'Hanging, adjusting, fitting hardware and removing the old door: shown as a separate line in the quote.', 'Zawieszenie, regulacja, okucia i wywóz starych drzwi: osobna pozycja w wycenie.'],
    },
  ],
  stepsTitle: ['Zo werken we', 'How we work', 'Jak pracujemy'],
  faqTitle: ['Veelgestelde vragen', 'Frequently asked questions', 'Najczęstsze pytania'],
} satisfies Record<string, L | { t: L; d: L }[]>;

const Services = () => {
  const t = useT();
  const { lang } = useLanguage();
  useDocumentTitle(t(TX.badge));
  return (
    <>
      <PageHero
        badge={<Badge icon={<Wrench className="w-3.5 h-3.5" />}>{t(TX.badge)}</Badge>}
        title={t(TX.title)}
        subtitle={t(TX.sub)}
        image="entrance"
        imagePosition="70% 50%"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <Magnetic><Link to="/contact" className="inline-flex items-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-full transition-colors">{t(UI.requestQuote)} <ArrowRight className="w-5 h-5" /></Link></Magnetic>
          <Link to="/inmeten" className="inline-flex items-center justify-center px-8 py-4 rounded-full border border-zinc-700 hover:border-amber-500 text-white font-bold transition-colors">{t(UI.bookSurvey)}</Link>
        </div>
      </PageHero>

      <section className="py-24 md:py-36">
        <div className="max-w-7xl mx-auto px-6 border-t border-white/10">
          {SERVICES.map((s, i) => {
            const Icon = SERVICE_ICONS[s.icon];
            return (
              <Reveal key={i} className="grid grid-cols-1 lg:grid-cols-[auto_1fr_1fr] gap-6 lg:gap-14 py-12 border-b border-white/10 group">
                <div className="flex lg:flex-col items-center lg:items-start gap-5">
                  <span className="font-display italic text-amber-300/70 text-2xl w-10">{String(i + 1).padStart(2, '0')}</span>
                  <span className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300 group-hover:bg-amber-500 group-hover:text-black transition-colors duration-500">
                    <Icon className="w-6 h-6" />
                  </span>
                </div>
                <div>
                  <h2 className="font-display text-4xl md:text-5xl text-white mb-4">{t(s.title)}</h2>
                  <p className="text-zinc-400 text-lg leading-relaxed max-w-xl">{t(s.desc)}</p>
                </div>
                <ul className="space-y-3 self-center">
                  {s.points.map((p, j) => (
                    <li key={j} className="flex items-start gap-3 text-zinc-300">
                      <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" /> {t(p)}
                    </li>
                  ))}
                </ul>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="py-24 md:py-36 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <Kicker>{t(TX.priceKicker)}</Kicker>
          <SplitText key={`${lang}-price`} as="h2" mode="words" text={t(TX.priceTitle)} className="font-display text-5xl md:text-7xl text-white leading-[1] mb-14" />
          <Reveal stagger={0.1} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 rounded-[2rem] overflow-hidden">
            {TX.price.map((p, i) => (
              <div key={i} className="bg-black p-8 md:p-10">
                <div className="font-display text-6xl bb-text-outline leading-none mb-6">0{i + 1}</div>
                <h3 className="font-display text-3xl text-white mb-3">{t(p.t)}</h3>
                <p className="text-zinc-400 leading-relaxed">{t(p.d)}</p>
              </div>
            ))}
          </Reveal>
          <p className="text-white/40 text-sm mt-6">{t(UI.indicative)}</p>
        </div>
      </section>

      <section className="py-24 md:py-36 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <SplitText key={`${lang}-steps`} as="h2" mode="words" text={t(TX.stepsTitle)} className="font-display text-5xl md:text-7xl text-white leading-[1] mb-14" />
          <Reveal stagger={0.1} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map((s, i) => (
              <div key={i} className="relative pt-8 border-t border-amber-500/40">
                <span className="absolute -top-3 left-0 px-3 bg-[#0b0a09] font-mono text-xs text-amber-300 tracking-[0.3em]">0{i + 1}</span>
                <h3 className="font-display text-3xl text-white mb-3">{t(s.title)}</h3>
                <p className="text-zinc-400 leading-relaxed">{t(s.desc)}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="py-24 md:py-36 border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="font-display text-5xl md:text-6xl text-white mb-12">{t(TX.faqTitle)}</h2>
          <FaqList />
        </div>
      </section>
      <CTA />
    </>
  );
};

export default Services;
