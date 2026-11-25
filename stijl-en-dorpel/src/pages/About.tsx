import { Link } from 'react-router-dom';
import { ArrowRight, Hammer, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { useLanguage, useT, type L } from '../i18n';
import { UI, useDocumentTitle } from '../ui';
import { WHY } from '../data/content';
import { modelById } from '../data/doors';
import { Door } from '../components/Door';
import { PageHero, Badge, Kicker } from '../components/PageHero';
import { Reveal, SplitText, TiltCard } from '../fx/components';
import { CTA } from './Home';

const TX = {
  badge: ['Over ons', 'About us', 'O nas'],
  title: ['Vakmensen met een rolmaat', 'Craftsmen with a tape measure', 'Fachowcy z miarką'],
  sub: [
    'Stijl & Dorpel doet één ding: deuren en kozijnen. Dat doen we van het eerste advies tot de laatste schroef in het scharnier.',
    'Stijl & Dorpel does one thing: doors and frames. From the first advice to the last screw in the hinge.',
    'Stijl & Dorpel robi jedno: drzwi i futryny. Od pierwszej porady po ostatnią śrubę w zawiasie.',
  ],
  storyKicker: ['Ons verhaal', 'Our story', 'Nasza historia'],
  storyTitle: ['Waarom alleen deuren?', 'Why only doors?', 'Dlaczego tylko drzwi?'],
  story: [
    [
      'Een deur gebruik je tientallen keren per dag. Je merkt hem pas op als hij klemt, tocht of piept. Juist daarom verdient hij meer aandacht dan hij meestal krijgt.',
      'You use a door dozens of times a day. You only notice it when it sticks, lets in a draught or squeaks. That is exactly why it deserves more attention than it usually gets.',
      'Drzwi używasz dziesiątki razy dziennie. Zauważasz je dopiero, gdy się zacinają, przepuszczają przeciąg albo skrzypią. Dlatego zasługują na więcej uwagi, niż zwykle dostają.',
    ],
    [
      'Bij een verbouwing zijn deuren vaak een sluitpost: besteld bij de één, ingemeten door de ander, afgehangen door een derde. Gaat er iets mis, dan wijst iedereen naar elkaar.',
      'In a renovation, doors are often an afterthought: ordered from one party, measured by another, hung by a third. If something goes wrong, everyone points at each other.',
      'Przy remoncie drzwi często schodzą na koniec: zamówione u jednych, mierzone przez drugich, montowane przez trzecich. Gdy coś pójdzie nie tak, każdy wskazuje na kogoś innego.',
    ],
    [
      'Wij doen het anders. Dezelfde mensen die bij je inmeten, hangen de deur ook af. Eén aanspreekpunt, één offerte, en een deur die sluit zoals een deur hoort te sluiten.',
      'We do it differently. The same people who measure at your home also hang the door. One point of contact, one quote, and a door that closes the way a door should.',
      'My robimy to inaczej. Ci sami ludzie, którzy mierzą, potem montują. Jedna osoba kontaktowa, jedna wycena i drzwi, które zamykają się tak, jak powinny.',
    ],
  ],
  valuesTitle: ['Waar we voor staan', 'What we stand for', 'Nasze zasady'],
  values: [
    {
      t: ['Vakwerk', 'Craft', 'Rzemiosło'],
      d: ['Een naad van twee millimeter rondom, scharnieren die dragen en een slot dat valt zonder duwen. Daar meten we onszelf aan af.', 'A two-millimetre gap all round, hinges that carry and a latch that catches without a push. That is our measure.', 'Dwumilimetrowa szczelina dookoła, zawiasy, które niosą, i zamek, który łapie bez pchania. Taką mamy miarę.'],
    },
    {
      t: ['Duidelijkheid', 'Clarity', 'Jasność'],
      d: ['Je weet vooraf wat je krijgt, wat het kost en wanneer we komen. Verandert er iets, dan hoor je dat van ons — niet achteraf.', 'You know in advance what you get, what it costs and when we come. If anything changes, you hear it from us — not afterwards.', 'Z góry wiesz, co dostajesz, ile to kosztuje i kiedy przyjedziemy. Jeśli coś się zmienia, dowiesz się od nas — nie po fakcie.'],
    },
    {
      t: ['Netjes werken', 'Tidy work', 'Porządek'],
      d: ['Vloeren afgedekt, zaagwerk buiten, oude deuren mee. Je huis is geen bouwplaats.', 'Floors covered, sawing done outside, old doors taken away. Your home is not a building site.', 'Podłogi zabezpieczone, cięcie na zewnątrz, stare drzwi zabrane. Twój dom to nie plac budowy.'],
    },
  ],
  areaKicker: ['Werkgebied', 'Service area', 'Obszar działania'],
  areaTitle: ['Door heel Nederland', 'Across the Netherlands', 'W całej Holandii'],
  areaText: [
    'We leveren en monteren in heel Nederland. Voor het inmeten plannen we afspraken per regio, zodat je niet lang hoeft te wachten.',
    'We deliver and fit throughout the Netherlands. Surveys are planned per region, so you do not have to wait long.',
    'Dostarczamy i montujemy w całej Holandii. Pomiary planujemy regionami, żeby nie trzeba było długo czekać.',
  ],
  promises: ['Onze afspraken met jou', 'Our promises to you', 'Nasze zobowiązania'],
} satisfies Record<string, L | L[] | { t: L; d: L }[]>;

const ICONS = [Hammer, Sparkles, ShieldCheck];

const About = () => {
  const t = useT();
  const { lang } = useLanguage();
  useDocumentTitle(t(TX.badge));
  return (
    <>
      <PageHero
        badge={<Badge>{t(TX.badge)}</Badge>}
        title={t(TX.title)}
        subtitle={t(TX.sub)}
        aside={
          <div className="flex items-end gap-6 pr-8">
            <Door model={modelById('delft')} wire className="h-[340px] w-auto" />
            <Door model={modelById('delft')} className="h-[400px] w-auto drop-shadow-[0_30px_50px_rgba(0,0,0,.7)]" />
          </div>
        }
      />

      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-24">
          <div>
            <Kicker>{t(TX.storyKicker)}</Kicker>
            <SplitText key={`${lang}-story`} as="h2" mode="words" text={t(TX.storyTitle)} className="font-display text-5xl md:text-7xl text-white leading-[1]" />
          </div>
          <Reveal stagger={0.12} className="space-y-7">
            {TX.story.map((p, i) => (
              <p key={i} className={i === 0 ? 'font-display text-3xl md:text-4xl text-white/90 leading-snug' : 'text-zinc-400 text-lg leading-relaxed'}>{t(p)}</p>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="py-24 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <SplitText key={`${lang}-values`} as="h2" mode="words" text={t(TX.valuesTitle)} className="font-display text-5xl md:text-7xl text-white leading-[1] mb-14" />
          <Reveal stagger={0.1} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TX.values.map((v, i) => {
              const Icon = ICONS[i];
              return (
                <TiltCard key={i} max={6} className="h-full">
                  <div className="h-full bb-glass-card rounded-3xl p-8 md:p-10">
                    <span className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300 mb-8"><Icon className="w-6 h-6" /></span>
                    <h3 className="font-display text-4xl text-white mb-4">{t(v.t)}</h3>
                    <p className="text-zinc-400 leading-relaxed">{t(v.d)}</p>
                  </div>
                </TiltCard>
              );
            })}
          </Reveal>
        </div>
      </section>

      <section className="py-24 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-24">
          <div>
            <Kicker>{t(TX.areaKicker)}</Kicker>
            <h2 className="font-display text-5xl md:text-6xl text-white leading-[1] mb-6">{t(TX.areaTitle)}</h2>
            <p className="text-zinc-400 text-lg leading-relaxed mb-8 max-w-lg">{t(TX.areaText)}</p>
            <Link to="/inmeten" className="inline-flex items-center gap-2 px-7 py-4 rounded-full border border-zinc-700 hover:border-amber-500 hover:text-amber-300 font-bold transition-colors">
              <MapPin className="w-5 h-5" /> {t(UI.bookSurvey)} <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.4em] text-white/45 mb-5">{t(TX.promises)}</p>
            <Reveal stagger={0.07} className="border-t border-white/10">
              {WHY.map((item, i) => (
                <div key={i} className="flex items-baseline gap-6 py-5 border-b border-white/10">
                  <span className="font-display italic text-amber-300/80 text-xl w-8 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-white/85 text-lg font-light">{t(item)}</span>
                </div>
              ))}
            </Reveal>
          </div>
        </div>
      </section>
      <CTA />
    </>
  );
};

export default About;
