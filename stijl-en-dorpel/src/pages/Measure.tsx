import { useState } from 'react';
import { CheckCircle2, Ruler } from 'lucide-react';
import { useLanguage, useT, type L } from '../i18n';
import { useDocumentTitle } from '../ui';
import { WIDTHS, HEIGHTS, modelById } from '../data/doors';
import { Door } from '../components/Door';
import { QuoteForm } from '../components/QuoteForm';
import { PageHero, Badge, Kicker } from '../components/PageHero';
import { Reveal, SplitText } from '../fx/components';

const TX = {
  badge: ['Inmeten', 'Measuring', 'Pomiar'],
  title: ['Meten is weten', 'Measure twice, fit once', 'Dobry pomiar to połowa montażu'],
  sub: [
    'Een deur die een paar millimeter te groot of te klein is, klemt of tocht. Laat ons inmeten — of doe het zelf met de gids hieronder.',
    'A door that is a few millimetres too big or too small will stick or let draughts in. Let us measure — or do it yourself with the guide below.',
    'Drzwi o kilka milimetrów za duże lub za małe zacinają się albo przepuszczają przeciąg. Zleć pomiar nam — albo zrób go sam według poradnika.',
  ],
  weKicker: ['Wij meten in', 'We measure', 'Mierzymy za Ciebie'],
  weTitle: ['Wat we bij je thuis doen', 'What we do at your home', 'Co robimy u Ciebie w domu'],
  we: [
    ['Elke deuropening apart opmeten: breedte op drie hoogtes, hoogte links en rechts', 'Measure every opening individually: width at three heights, height left and right', 'Mierzymy każdy otwór osobno: szerokość na trzech wysokościach, wysokość z lewej i prawej'],
    ['Controleren of het kozijn te lood en haaks staat', 'Check that the frame is plumb and square', 'Sprawdzamy pion i kąty futryny'],
    ['Draairichting, scharnierposities en slotkast vastleggen', 'Record swing direction, hinge positions and lock case', 'Zapisujemy kierunek otwierania, położenie zawiasów i zamka'],
    ['Vloerafwerking en vrije ruimte onder de deur bespreken', 'Discuss floor finish and clearance under the door', 'Omawiamy wykończenie podłogi i prześwit pod drzwiami'],
    ['Kleurstalen en beslag laten zien, zodat je ter plekke kunt kiezen', 'Show colour samples and hardware so you can choose on the spot', 'Pokazujemy próbki kolorów i okuć, żeby wybrać na miejscu'],
  ],
  selfKicker: ['Zelf inmeten', 'Measure yourself', 'Pomiar samodzielny'],
  selfTitle: ['De inmeetgids', 'The measuring guide', 'Poradnik pomiarowy'],
  selfSub: [
    'Meet altijd in millimeters en meet de sponning van het kozijn — niet de oude deur, want die kan zijn ingekort.',
    'Always measure in millimetres and measure the rebate of the frame — not the old door, as it may have been trimmed.',
    'Mierz zawsze w milimetrach i mierz wrąb futryny — nie stare drzwi, bo mogły być przycięte.',
  ],
  guide: [
    {
      t: ['Breedte', 'Width', 'Szerokość'],
      d: ['Meet de breedte van de sponning boven, in het midden en onder. Noteer de kleinste maat.', 'Measure the rebate width at the top, middle and bottom. Note the smallest.', 'Zmierz szerokość wrębu u góry, w środku i na dole. Zapisz najmniejszy wymiar.'],
    },
    {
      t: ['Hoogte', 'Height', 'Wysokość'],
      d: ['Meet links en rechts van de afgewerkte vloer tot in de sponning van de bovendorpel. Noteer de kleinste maat.', 'Measure left and right from the finished floor up into the rebate of the head. Note the smallest.', 'Zmierz z lewej i prawej od gotowej podłogi do wrębu nadproża. Zapisz najmniejszy wymiar.'],
    },
    {
      t: ['Dikte', 'Thickness', 'Grubość'],
      d: ['Binnendeuren zijn meestal 38 tot 40 mm dik, buitendeuren 38 tot 54 mm. Meet de sponningdiepte van het kozijn.', 'Interior doors are usually 38 to 40 mm thick, exterior doors 38 to 54 mm. Measure the rebate depth of the frame.', 'Drzwi wewnętrzne mają zwykle 38–40 mm, zewnętrzne 38–54 mm. Zmierz głębokość wrębu futryny.'],
    },
    {
      t: ['Draairichting', 'Swing direction', 'Kierunek otwierania'],
      d: ['Ga aan de kant staan waar je de scharnieren ziet. Scharnieren links: linksdraaiend. Scharnieren rechts: rechtsdraaiend.', 'Stand on the side where you see the hinges. Hinges on the left: left-hung. Hinges on the right: right-hung.', 'Stań po stronie, z której widać zawiasy. Zawiasy z lewej: drzwi lewe. Z prawej: prawe.'],
    },
    {
      t: ['Opdek of stomp', 'Rebated or flush', 'Przylgowe czy nie'],
      d: ['Valt de deur met een randje óver het kozijn, dan is het een opdekdeur. Valt hij er helemaal in, dan is hij stomp.', 'If the door overlaps the frame with a lip, it is rebated. If it sits entirely inside, it is flush.', 'Jeśli skrzydło zachodzi felcem na futrynę — to drzwi przylgowe. Jeśli chowa się w całości — bezprzylgowe.'],
    },
    {
      t: ['Scharnieren & slot', 'Hinges & lock', 'Zawiasy i zamek'],
      d: ['Blijft het kozijn zitten? Meet dan van de bovenkant van de sponning tot de bovenkant van elk scharnier en tot het hart van de kruk.', 'Keeping the frame? Measure from the top of the rebate to the top of each hinge and to the centre of the handle.', 'Futryna zostaje? Zmierz od góry wrębu do górnej krawędzi każdego zawiasu i do osi klamki.'],
    },
  ],
  calcTitle: ['Past een standaardmaat?', 'Does a standard size fit?', 'Czy pasuje wymiar standardowy?'],
  calcSub: [
    'Vul de sponningmaat van je kozijn in. We zoeken de dichtstbijzijnde standaarddeur.',
    'Enter the rebate size of your frame. We look for the nearest standard door.',
    'Podaj wymiar wrębu futryny. Znajdziemy najbliższe drzwi standardowe.',
  ],
  w: ['Breedte in mm', 'Width in mm', 'Szerokość w mm'],
  h: ['Hoogte in mm', 'Height in mm', 'Wysokość w mm'],
  fit: ['Standaardmaat', 'Standard size', 'Wymiar standardowy'],
  fitText: ['past in je kozijn. Voordelig en snel leverbaar.', 'fits your frame. Affordable and quickly available.', 'pasuje do Twojej futryny. Tanio i szybko.'],
  trim: ['Standaarddeur, op maat gemaakt', 'Standard door, trimmed to fit', 'Drzwi standardowe, docinane'],
  trimText: ['is de dichtstbijzijnde maat. Wij schaven of korten de deur passend in.', 'is the nearest size. We plane or shorten the door to fit.', 'to najbliższy wymiar. Dostrugamy lub skrócimy skrzydło.'],
  custom: ['Maatwerk aanbevolen', 'Made to measure recommended', 'Zalecane drzwi na wymiar'],
  customText: ['Je kozijn wijkt te veel af van de standaardmaten. We maken de deur precies passend.', 'Your frame differs too much from the standard sizes. We make the door to fit exactly.', 'Futryna zbyt odbiega od standardów. Wykonamy drzwi dokładnie na wymiar.'],
  formKicker: ['Afspraak', 'Appointment', 'Termin'],
  formTitle: ['Plan je inmeetafspraak', 'Book your survey', 'Umów pomiar'],
} satisfies Record<string, L | L[] | { t: L; d: L }[]>;

/* Highlights on top of the technical drawing, one per guide step. */
const Overlay = ({ step }: { step: number }) => {
  const line = 'absolute bg-amber-300 shadow-[0_0_12px_rgba(203,176,132,.9)]';
  const dot = 'absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full bg-amber-300 shadow-[0_0_14px_rgba(203,176,132,1)]';
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {step === 0 && [14, 50, 88].map((y) => <span key={y} className={`${line} h-[2px] left-[8%] right-[8%]`} style={{ top: `${y}%` }} />)}
      {step === 1 && [16, 84].map((x) => <span key={x} className={`${line} w-[2px] top-[4%] bottom-0`} style={{ left: `${x}%` }} />)}
      {step === 2 && <span className={`${line} w-[5px] top-[4%] bottom-0 right-[7%]`} />}
      {step === 3 && [12, 50, 87].map((y) => <span key={y} className={dot} style={{ top: `${y}%`, left: '8.5%' }} />)}
      {step === 4 && <span className="absolute inset-x-[7%] top-[3.5%] bottom-0 border-2 border-dashed border-amber-300 rounded-sm" />}
      {step === 5 && (
        <>
          {[12, 50, 87].map((y) => <span key={y} className={dot} style={{ top: `${y}%`, left: '8.5%' }} />)}
          <span className={dot} style={{ top: '52%', left: '83%' }} />
          <span className={`${line} w-[2px] top-[4%] h-[48%] left-[83%] opacity-60`} />
        </>
      )}
    </div>
  );
};

const nearest = (list: number[], v: number) => list.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));

const SizeCheck = () => {
  const t = useT();
  const [w, setW] = useState('');
  const [h, setH] = useState('');
  const wn = Number(w);
  const hn = Number(h);
  const ready = wn >= 500 && wn <= 1200 && hn >= 1700 && hn <= 2600;
  // standard door leaf sizes in mm; a rebate is typically a few mm larger than the leaf
  const sw = nearest(WIDTHS.map((x) => x * 10), wn - 4);
  const sh = nearest(HEIGHTS.map((x) => x * 10), hn - 4);
  const dw = wn - sw;
  const dh = hn - sh;
  const fits = dw >= 0 && dw <= 8 && dh >= 0 && dh <= 10;
  const trims = dw >= -12 && dw <= 8 && dh >= -30 && dh <= 10;
  const verdict = !ready ? null : fits ? 'fit' : trims ? 'trim' : 'custom';
  const size = `${sw / 10} × ${String(sh / 10).replace('.', ',')} cm`;
  const input = 'w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl px-5 py-4 text-white placeholder:text-zinc-600 outline-none focus:border-amber-500';
  return (
    <div className="bb-glass-card rounded-[2rem] p-6 md:p-10">
      <h3 className="font-display text-3xl md:text-4xl text-white mb-3">{t(TX.calcTitle)}</h3>
      <p className="text-zinc-400 mb-7">{t(TX.calcSub)}</p>
      <div className="grid grid-cols-2 gap-4 max-w-md">
        <label>
          <span className="block text-[11px] uppercase tracking-[0.3em] text-white/55 mb-2">{t(TX.w)}</span>
          <input value={w} onChange={(e) => setW(e.target.value.replace(/[^\d]/g, '').slice(0, 4))} inputMode="numeric" placeholder="834" className={input} />
        </label>
        <label>
          <span className="block text-[11px] uppercase tracking-[0.3em] text-white/55 mb-2">{t(TX.h)}</span>
          <input value={h} onChange={(e) => setH(e.target.value.replace(/[^\d]/g, '').slice(0, 4))} inputMode="numeric" placeholder="2019" className={input} />
        </label>
      </div>
      <div className="mt-7 min-h-[84px]" aria-live="polite">
        {verdict && (
          <div className={`rounded-2xl border px-5 py-4 ${verdict === 'custom' ? 'border-zinc-700 bg-zinc-900/60' : 'border-amber-500/40 bg-amber-500/10'}`}>
            <p className="text-amber-200 font-medium mb-1">{t(verdict === 'fit' ? TX.fit : verdict === 'trim' ? TX.trim : TX.custom)}</p>
            <p className="text-zinc-300 text-sm">
              {verdict === 'custom' ? t(TX.customText) : <><strong className="text-white">{size}</strong> {t(verdict === 'fit' ? TX.fitText : TX.trimText)}</>}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const Measure = () => {
  const t = useT();
  const { lang } = useLanguage();
  useDocumentTitle(t(TX.badge));
  const [step, setStep] = useState(0);
  const model = modelById('haarlem');

  return (
    <>
      <PageHero
        badge={<Badge icon={<Ruler className="w-3.5 h-3.5" />}>{t(TX.badge)}</Badge>}
        title={t(TX.title)}
        subtitle={t(TX.sub)}
        image="hall"
        imagePosition="68% 50%"
      />

      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-24">
          <div>
            <Kicker>{t(TX.weKicker)}</Kicker>
            <SplitText key={`${lang}-we`} as="h2" mode="words" text={t(TX.weTitle)} className="font-display text-5xl md:text-6xl text-white leading-[1]" />
          </div>
          <Reveal stagger={0.07} className="border-t border-white/10">
            {TX.we.map((item, i) => (
              <div key={i} className="flex items-start gap-4 py-5 border-b border-white/10">
                <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0 mt-1" />
                <span className="text-white/85 text-lg font-light">{t(item)}</span>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="py-24 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mb-14">
            <Kicker>{t(TX.selfKicker)}</Kicker>
            <SplitText key={`${lang}-self`} as="h2" mode="words" text={t(TX.selfTitle)} className="font-display text-5xl md:text-7xl text-white leading-[1] mb-6" />
            <p className="text-zinc-400 text-lg">{t(TX.selfSub)}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16 items-start">
            <div className="lg:sticky lg:top-28 flex justify-center rounded-[2rem] border border-white/10 bg-[radial-gradient(70%_60%_at_50%_30%,rgba(230,217,189,.12),transparent_70%)] p-8 md:p-12">
              <div className="relative h-[46svh] min-h-[320px] max-h-[520px]">
                <Door model={model} wire className="h-full w-auto" />
                <Overlay step={step} />
              </div>
            </div>
            <ol className="border-t border-white/10">
              {TX.guide.map((g, i) => {
                const on = step === i;
                return (
                  <li key={i} className="border-b border-white/10">
                    <button
                      onClick={() => setStep(i)}
                      onMouseEnter={() => setStep(i)}
                      onFocus={() => setStep(i)}
                      aria-current={on ? 'step' : undefined}
                      className="w-full text-left flex gap-6 py-6 group"
                    >
                      <span className={`font-display italic text-2xl w-8 shrink-0 transition-colors ${on ? 'text-amber-300' : 'text-zinc-600'}`}>{String(i + 1).padStart(2, '0')}</span>
                      <span>
                        <span className={`block font-display text-3xl mb-2 transition-colors ${on ? 'text-amber-100' : 'text-white group-hover:text-amber-100'}`}>{t(g.t)}</span>
                        <span className={`block leading-relaxed transition-colors ${on ? 'text-zinc-300' : 'text-zinc-500'}`}>{t(g.d)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="mt-16"><SizeCheck /></div>
        </div>
      </section>

      <section className="py-24 border-t border-white/10" id="afspraak">
        <div className="max-w-4xl mx-auto px-6">
          <Kicker>{t(TX.formKicker)}</Kicker>
          <h2 className="font-display text-5xl md:text-6xl text-white mb-10">{t(TX.formTitle)}</h2>
          <QuoteForm defaultKind="inmeten" />
        </div>
      </section>
    </>
  );
};

export default Measure;
