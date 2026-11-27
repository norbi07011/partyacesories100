import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowRight, Check, Thermometer } from 'lucide-react';
import { useLanguage, useT, type L } from '../i18n';
import { UI, useDocumentTitle } from '../ui';
import { PageHero, Badge } from '../components/PageHero';
import { Reveal, SplitText } from '../fx/components';
import { QuoteForm } from '../components/QuoteForm';
import { Frame, InsulationMotion, INSULATION, type InsulationKind } from '../components/Insulation';
import { Studio3D } from '../fx/Studio3D';
import type { StudioKind } from '../fx/wallStudio';

const TX = {
  badge: ['Isolatie', 'Insulation', 'Izolacja'],
  title: ['Warm huis, lagere rekening', 'A warm home, a lower bill', 'Ciepły dom, niższe rachunki'],
  sub: [
    'Vloer, dak, spouwmuur en gevel geïsoleerd door één ploeg. We meten op, rekenen de isolatiewaarde uit en werken het netjes af.',
    'Floor, roof, cavity wall and facade insulated by one crew. We survey, calculate the insulation value and finish it neatly.',
    'Podłoga, dach, ściany szczelinowe i elewacja ocieplone przez jedną ekipę. Mierzymy, liczymy wartość izolacji i wykańczamy na czysto.',
  ],
  cta: ['Vraag een offerte aan', 'Request a quote', 'Poproś o wycenę'],
  how: ['Bekijk de werkwijze', 'See how it works', 'Zobacz, jak to robimy'],
  material: ['Materiaal', 'Material', 'Materiał'],
  time: ['Duur', 'Time on site', 'Czas pracy'],
  fits: ['Geschikt voor', 'Suited to', 'Dla kogo'],
  matKicker: ['Materialen', 'Materials', 'Materiały'],
  matTitle: ['Het juiste materiaal op de juiste plek', 'The right material in the right place', 'Właściwy materiał we właściwym miejscu'],
  noteKicker: ['Goed om te weten', 'Good to know', 'Warto wiedzieć'],
  askKicker: ['Offerte', 'Quote', 'Wycena'],
  askTitle: ['Wat wil je isoleren?', 'What would you like to insulate?', 'Co chcesz ocieplić?'],
  askText: ['Kies de onderdelen en vul de oppervlakte in als je die weet. Een schatting is genoeg; we meten alles zelf na.', 'Pick the parts and enter the area if you know it. An estimate is enough; we measure everything ourselves.', 'Wybierz elementy i wpisz powierzchnię, jeśli ją znasz. Wystarczy szacunek; wszystko sami zmierzymy.'],
  area: ['Oppervlakte in m² (schatting)', 'Area in m² (estimate)', 'Powierzchnia w m² (szacunek)'],
  year: ['Bouwjaar van de woning', 'Year the home was built', 'Rok budowy domu'],
  drag: ['Sleep om te draaien', 'Drag to rotate', 'Przeciągnij, aby obrócić'],
  msgHead: ['Aanvraag isolatie', 'Insulation request', 'Zapytanie o izolację'],
} satisfies Record<string, L>;

const DETAIL: Record<InsulationKind, { body: L; material: L; time: L; fits: L; points: L[] }> = {
  vloer: {
    body: [
      'We werken vanuit de kruipruimte, dus je vloer blijft dicht en je kunt gewoon thuis zijn. Tussen de balken komt isolatie, op de bodem een folie tegen vocht.',
      'We work from the crawl space, so your floor stays closed and you can simply be at home. Insulation goes between the joists and a foil on the ground keeps damp out.',
      'Pracujemy od strony przestrzeni podpodłogowej, więc podłoga zostaje nietknięta i możesz być w domu. Między belki trafia izolacja, a na grunt folia przeciw wilgoci.',
    ],
    material: ['Thermokussens, glaswol of PIR-platen', 'Thermal cushions, glass wool or PIR boards', 'Poduszki termiczne, wełna szklana lub płyty PIR'],
    time: ['Meestal één werkdag', 'Usually one working day', 'Zwykle jeden dzień roboczy'],
    fits: ['Woningen met een kruipruimte', 'Homes with a crawl space', 'Domy z przestrzenią podpodłogową'],
    points: [
      ['Warmere vloer en minder tocht', 'A warmer floor and fewer draughts', 'Cieplejsza podłoga i mniej przeciągów'],
      ['Bodemfolie tegen optrekkend vocht', 'Ground foil against rising damp', 'Folia na gruncie przeciw wilgoci'],
      ['Leidingen blijven bereikbaar', 'Pipes stay accessible', 'Rury pozostają dostępne'],
    ],
  },
  dak: {
    body: [
      'We isoleren het schuine dak van binnenuit: isolatie tussen en over de gordingen, een dampremmende folie ervoor en een strakke afwerking. De zolder wordt een kamer waar je het hele jaar kunt zijn.',
      'We insulate the pitched roof from the inside: insulation between and over the purlins, a vapour-control foil in front and a clean finish. The attic becomes a room you can use all year.',
      'Ocieplamy dach skośny od środka: izolacja między i na płatwiach, przed nią folia paroizolacyjna i równe wykończenie. Poddasze staje się pokojem na cały rok.',
    ],
    material: ['PIR-platen of glaswol met dampremmende folie', 'PIR boards or glass wool with vapour-control foil', 'Płyty PIR lub wełna szklana z folią paroizolacyjną'],
    time: ['Eén tot drie werkdagen', 'One to three working days', 'Od jednego do trzech dni roboczych'],
    fits: ['Schuine daken en zoldervloeren', 'Pitched roofs and attic floors', 'Dachy skośne i podłogi strychów'],
    points: [
      ['Koeler in de zomer, warmer in de winter', 'Cooler in summer, warmer in winter', 'Chłodniej latem, cieplej zimą'],
      ['Afgewerkt met platen, klaar om te schilderen', 'Finished with boards, ready to paint', 'Wykończone płytami, gotowe do malowania'],
      ['Ook alleen de zoldervloer is mogelijk', 'Insulating only the attic floor is possible too', 'Możliwe też ocieplenie samej podłogi strychu'],
    ],
  },
  spouw: {
    body: [
      'Via kleine gaatjes in de voegen vullen we de lege ruimte tussen binnen- en buitenmuur. Daarna voegen we de gaatjes in dezelfde kleur dicht. Vooraf kijken we met een camera of de spouw geschikt is.',
      'Through small holes in the joints we fill the empty space between the inner and outer wall. Afterwards we close the holes in the same colour. We first check with a camera whether the cavity is suitable.',
      'Przez małe otwory w fugach wypełniamy pustą przestrzeń między ścianą wewnętrzną i zewnętrzną. Potem zamykamy otwory fugą w tym samym kolorze. Najpierw kamerą sprawdzamy, czy szczelina się nadaje.',
    ],
    material: ['Isolatieparels of ingeblazen glaswol', 'Insulation beads or blown glass wool', 'Granulat izolacyjny lub wdmuchiwana wełna szklana'],
    time: ['Meestal één werkdag', 'Usually one working day', 'Zwykle jeden dzień roboczy'],
    fits: ['Woningen met een lege spouwmuur', 'Homes with an empty cavity wall', 'Domy z pustą ścianą szczelinową'],
    points: [
      ['Geen werk in huis', 'No work indoors', 'Bez prac w domu'],
      ['Camera-inspectie vooraf', 'Camera inspection beforehand', 'Wcześniejsza inspekcja kamerą'],
      ['Natuurcheck (vleermuizen) bespreken we vooraf', 'We discuss the nature check (bats) beforehand', 'Kontrolę przyrodniczą (nietoperze) omawiamy wcześniej'],
    ],
  },
  gevel: {
    body: [
      'Een nieuwe, geïsoleerde gevel van echte baksteen. Met prefab panelen, waarvan de randen als puzzelstukken in elkaar haken, of met losse steenstrips die we één voor één in de lijm zetten. Kies hieronder de methode en kijk hoe het werk verloopt.',
      'A new, insulated facade of real brick. With prefab panels whose edges hook together like puzzle pieces, or with loose brick slips set one by one in adhesive. Pick the method below and watch how the work goes.',
      'Nowa, ocieplona elewacja z prawdziwej cegły. Z gotowych paneli, których krawędzie zazębiają się jak puzzle, albo z pojedynczych płytek klinkierowych osadzanych w kleju. Wybierz metodę poniżej i zobacz, jak przebiega praca.',
    ],
    material: ['Isolatiepanelen met keramische steenstrips', 'Insulation panels with ceramic brick slips', 'Panele izolacyjne z ceramiczną płytką klinkierową'],
    time: ['Eén tot drie weken, met steiger', 'One to three weeks, with scaffolding', 'Od jednego do trzech tygodni, z rusztowaniem'],
    fits: ['Woningen zonder of met een smalle spouw', 'Homes with no cavity or a narrow one', 'Domy bez szczeliny lub z wąską szczeliną'],
    points: [
      ['Hoogste isolatiewaarde van alle gevelopties', 'Highest insulation value of all facade options', 'Najwyższa izolacyjność ze wszystkich opcji dla ściany'],
      ['Prefab panelen of losse steenstrips: we adviseren per gevel', 'Prefab panels or loose slips: we advise per facade', 'Gotowe panele albo pojedyncze płytki: doradzamy dla każdej elewacji'],
      ['We zoeken vooraf uit of een vergunning nodig is', 'We check beforehand whether a permit is needed', 'Wcześniej sprawdzamy, czy potrzebne jest pozwolenie'],
    ],
  },
};

/** what the 3D scene is doing at each stage, shown under the frame */
const STEPS: Record<StudioKind, L[]> = {
  vloer: [
    ['Bodemfolie over de grond van de kruipruimte', 'Ground foil over the crawl-space soil', 'Folia na gruncie pod podłogą'],
    ['Isolatie van onderaf tussen de balken', 'Insulation fitted between the joists from below', 'Izolacja wsuwana od spodu między belki'],
  ],
  dak: [
    ['Isolatieplaten tussen de sporen', 'Insulation boards between the rafters', 'Płyty izolacyjne między krokwie'],
    ['Dampremmende folie, naden afgeplakt', 'Vapour-control foil, seams taped', 'Folia paroizolacyjna, klejone zakłady'],
    ['Afwerkplaat, klaar om te schilderen', 'Finishing board, ready to paint', 'Płyta wykończeniowa, gotowa do malowania'],
  ],
  spouw: [['Isolatieparels vullen de spouw van onder naar boven', 'Insulation beads fill the cavity from the bottom up', 'Granulat wypełnia szczelinę od dołu do góry']],
  gevel: [
    ['Startprofiel waterpas onderaan', 'Starter rail set level at the bottom', 'Listwa startowa wypoziomowana u dołu'],
    ['Panelen rij voor rij in elkaar schuiven en verankeren', 'Panels slid into each other row by row and anchored', 'Panele wsuwane jeden w drugi, rząd po rzędzie, i kotwione'],
    ['Laatste rij sluit aan onder de dakrand', 'Last row closes under the eaves', 'Ostatni rząd zamyka się pod okapem'],
    ['Passtukken vullen de vertanding bij de hoek', 'Closing pieces fill the stepped edge at the corner', 'Docinki zamykają schodkową krawędź przy narożniku'],
    ['Voegen: naden en ankers verdwijnen', 'Pointing: seams and anchors disappear', 'Fugowanie: łączenia i kotwy znikają'],
  ],
  strips: [
    ['Startprofiel waterpas onderaan', 'Starter rail set level at the bottom', 'Listwa startowa wypoziomowana u dołu'],
    ['Isolatieplaten verlijmen, naden verspringend', 'Insulation boards glued, joints staggered', 'Płyty izolacyjne klejone z przesunięciem spoin'],
    ['Wapeningslaag met gaas over de platen', 'Reinforced base coat with mesh over the boards', 'Warstwa zbrojona z siatką na płytach'],
    ['Pluggen door het gaas in de muur', 'Anchors through the mesh into the wall', 'Kołki przez siatkę w mur'],
    ['Lijm kammen en strips zetten, van boven naar beneden langs de draad', 'Adhesive combed and slips set from the top down along the string line', 'Klej grzebieniem i płytki od góry w dół, wzdłuż sznurka'],
    ['Voegen en afborstelen', 'Pointing and brushing off', 'Fugowanie i szczotkowanie'],
  ],
};

const MATERIALS: { t: L; d: L }[] = [
  { t: ['PIR-platen', 'PIR boards', 'Płyty PIR'], d: ['Dun en toch een hoge isolatiewaarde. Voor daken en vloeren waar weinig ruimte is.', 'Thin yet highly insulating. For roofs and floors with little space.', 'Cienkie, a mocno izolują. Na dachy i podłogi, gdzie brakuje miejsca.'] },
  { t: ['Glaswol', 'Glass wool', 'Wełna szklana'], d: ['Soepel tussen balken en gordingen, dempt ook geluid.', 'Flexible between joists and purlins; dampens sound too.', 'Elastyczna między belkami i płatwiami, tłumi też hałas.'] },
  { t: ['Thermokussens', 'Thermal cushions', 'Poduszki termiczne'], d: ['Reflecterende luchtkussens onder de vloer, ongevoelig voor vocht.', 'Reflective air cushions under the floor, unaffected by damp.', 'Odblaskowe poduszki powietrzne pod podłogą, odporne na wilgoć.'] },
  { t: ['Isolatieparels', 'Insulation beads', 'Granulat izolacyjny'], d: ['Vullen de spouw tot in de hoeken en nemen geen water op.', 'Fill the cavity into every corner and take up no water.', 'Wypełniają szczelinę po same narożniki i nie chłoną wody.'] },
  { t: ['Steenstrips', 'Brick slips', 'Płytki klinkierowe'], d: ['Dunne plakken echte baksteen: vorstbestendig en kleurvast.', 'Thin slices of real brick: frost-proof and colour-fast.', 'Cienkie plastry prawdziwej cegły: mrozoodporne i trwałe w kolorze.'] },
  { t: ['Bodemfolie', 'Ground foil', 'Folia na grunt'], d: ['Houdt vocht uit de kruipruimte, zodat de vloer droog blijft.', 'Keeps damp out of the crawl space so the floor stays dry.', 'Zatrzymuje wilgoć z gruntu, więc podłoga zostaje sucha.'] },
];

const NOTES: { t: L; d: L }[] = [
  { t: ['Subsidie', 'Subsidy', 'Dotacja'], d: ['Voor isolatie die door een bedrijf is aangebracht kun je vaak ISDE-subsidie aanvragen. Wij zetten de benodigde gegevens op de factuur; de actuele voorwaarden staan op rvo.nl.', 'For insulation fitted by a company you can often apply for the ISDE subsidy. We put the required details on the invoice; the current conditions are on rvo.nl.', 'Na izolację wykonaną przez firmę często można dostać dotację ISDE. Potrzebne dane wpisujemy na fakturze; aktualne warunki są na rvo.nl.'] },
  { t: ['Eerst kijken, dan adviseren', 'Look first, advise second', 'Najpierw oględziny, potem rada'], d: ['Niet elke vloer, dak of spouw is geschikt. We komen kijken en zeggen eerlijk wat zin heeft en wat niet.', 'Not every floor, roof or cavity is suitable. We come and look, and say honestly what is worth doing.', 'Nie każda podłoga, dach czy szczelina się nadaje. Przyjeżdżamy, oglądamy i mówimy uczciwie, co ma sens.'] },
  { t: ['Eén offerte', 'One quote', 'Jedna wycena'], d: ['Materiaal, arbeid en afwerking als aparte regels, zodat je ziet waar je voor betaalt.', 'Material, labour and finishing as separate lines, so you see what you pay for.', 'Materiał, robocizna i wykończenie w osobnych pozycjach, żeby było widać, za co płacisz.'] },
];

/** One framed 3D scene with the current stage written under it; the facade has two methods. */
const Scene = ({ kind }: { kind: InsulationKind }) => {
  const t = useT();
  const [variant, setVariant] = useState<StudioKind>(kind);
  const [step, setStep] = useState(0);
  const list = STEPS[variant];
  const tab = (v: StudioKind, label: L) => (
    <button type="button" onClick={() => { setVariant(v); setStep(0); }} aria-pressed={variant === v}
      className={`px-4 py-2 text-[11px] uppercase tracking-[0.2em] border transition-colors ${variant === v ? 'border-amber-200 text-black bg-amber-200' : 'border-white/15 text-white/70 hover:border-white/40'}`}>{t(label)}</button>
  );
  return (
    <>
      {kind === 'gevel' && (
        <div className="flex gap-2 mb-3">
          {tab('gevel', ['Prefab panelen', 'Prefab panels', 'Gotowe panele'])}
          {tab('strips', ['Losse steenstrips', 'Loose brick slips', 'Pojedyncze płytki'])}
        </div>
      )}
      <Frame className="aspect-[4/3] w-full"><Studio3D key={variant} kind={variant} className="absolute inset-0" onStep={setStep} /></Frame>
      <div className="flex items-start gap-4 mt-4 min-h-[3.25rem]">
        <span className="font-display italic text-amber-200/80 text-xl leading-none pt-0.5 shrink-0">{Math.min(step, list.length - 1) + 1}/{list.length}</span>
        <p className="text-white/80 leading-snug">{t(list[Math.min(step, list.length - 1)])}</p>
      </div>
      <p className="sd-label mt-1 !tracking-[0.2em] opacity-50">{t(TX.drag)}</p>
    </>
  );
};

const Insulation = () => {
  const t = useT();
  const { lang } = useLanguage();
  const { hash } = useLocation();
  useDocumentTitle(t(TX.badge));
  const [picked, setPicked] = useState<InsulationKind[]>([]);
  const [area, setArea] = useState('');
  const [year, setYear] = useState('');

  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) setTimeout(() => el.scrollIntoView({ block: 'start' }), 80);
  }, [hash]);

  const toggle = (k: InsulationKind) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const prefill = picked.length || area || year
    ? [
        `${t(TX.msgHead)}: ${picked.map((k) => t(INSULATION.find((i) => i.kind === k)!.title)).join(', ') || '-'}`,
        area && `${t(TX.area)}: ${area}`,
        year && `${t(TX.year)}: ${year}`,
      ].filter(Boolean).join('\n')
    : '';
  const field = 'w-full bg-transparent border-b border-white/20 focus:border-amber-200 outline-none py-3 text-white placeholder:text-white/30';

  return (
    <>
      <PageHero
        badge={<Badge icon={<Thermometer className="w-3.5 h-3.5" />}>{t(TX.badge)}</Badge>}
        title={t(TX.title)}
        subtitle={t(TX.sub)}
        aside={<Frame className="w-[30rem] h-[26rem]"><Studio3D kind="gevel" className="absolute inset-0" /></Frame>}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <a href="#aanvraag" className="sd-btn">{t(TX.cta)} <ArrowRight className="w-4 h-4" /></a>
          <a href="#vloer" className="sd-link self-start">{t(TX.how)}</a>
        </div>
      </PageHero>

      <section className="py-20 md:py-32 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 space-y-28 md:space-y-40">
          {INSULATION.map((m, i) => {
            const d = DETAIL[m.kind];
            return (
              <Reveal key={m.kind} className="group grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center scroll-mt-28" >
                <div id={m.kind} className={`scroll-mt-28 ${i % 2 ? 'lg:order-2' : ''}`}>
                  <Scene kind={m.kind} />
                </div>
                <div>
                  <p className="font-display italic text-amber-200/70 text-2xl mb-4">{String(i + 1).padStart(2, '0')}</p>
                  <h2 className="font-display text-4xl md:text-6xl text-white leading-[1] mb-6">{t(m.title)}</h2>
                  <p className="text-white/60 font-light text-lg leading-relaxed max-w-xl mb-8">{t(d.body)}</p>
                  <dl className="border-t border-white/10 mb-8">
                    {([[TX.material, d.material], [TX.time, d.time], [TX.fits, d.fits]] as const).map(([k, v]) => (
                      <div key={k[0]} className="grid grid-cols-[8.5rem_1fr] gap-4 py-3.5 border-b border-white/10">
                        <dt className="sd-label pt-1">{t(k)}</dt>
                        <dd className="text-white/85">{t(v)}</dd>
                      </div>
                    ))}
                  </dl>
                  <ul className="space-y-2.5">
                    {d.points.map((p) => (
                      <li key={p[0]} className="flex items-start gap-3 text-white/70 font-light"><Check className="w-4 h-4 text-amber-200 shrink-0 mt-1" /> {t(p)}</li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="py-24 md:py-36 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <p className="sd-label mb-6">{t(TX.matKicker)}</p>
          <SplitText key={`${lang}-mat`} as="h2" mode="words" text={t(TX.matTitle)} className="font-display text-4xl md:text-6xl text-white leading-[1] max-w-3xl mb-14" />
          <Reveal stagger={0.07} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MATERIALS.map((m, i) => (
              <Frame key={m.t[0]} className="!block p-7 pt-9 min-h-[13rem]">
                <span className="block font-display italic text-amber-200/60 text-lg mb-5">{String(i + 1).padStart(2, '0')}</span>
                <span className="block font-display text-2xl text-white mb-2.5">{t(m.t)}</span>
                <span className="block text-white/55 font-light text-sm leading-relaxed">{t(m.d)}</span>
              </Frame>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="py-24 md:py-36 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <p className="sd-label lg:col-span-3">{t(TX.noteKicker)}</p>
          <Reveal stagger={0.08} className="lg:col-span-9 border-t border-white/10">
            {NOTES.map((n) => (
              <div key={n.t[0]} className="grid grid-cols-1 md:grid-cols-[16rem_1fr] gap-3 md:gap-10 py-8 border-b border-white/10">
                <h3 className="font-display text-2xl md:text-3xl text-white">{t(n.t)}</h3>
                <p className="text-white/60 font-light leading-relaxed max-w-xl">{t(n.d)}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section id="aanvraag" className="py-24 md:py-36 border-t border-white/10 scroll-mt-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="sd-label mb-6">{t(TX.askKicker)}</p>
          <h2 className="font-display text-4xl md:text-6xl text-white leading-[1] mb-5">{t(TX.askTitle)}</h2>
          <p className="text-white/60 font-light max-w-xl mb-10">{t(TX.askText)}</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            {INSULATION.map((m) => {
              const on = picked.includes(m.kind);
              return (
                <button key={m.kind} type="button" onClick={() => toggle(m.kind)} aria-pressed={on}
                  className={`group text-left p-5 border transition-colors ${on ? 'border-amber-200 bg-amber-200/[0.06]' : 'border-white/10 hover:border-white/30'}`}>
                  <InsulationMotion kind={m.kind} className="h-20 aspect-[4/3] mb-4" />
                  <span className="flex items-center justify-between gap-3 text-white">
                    {t(m.title)}
                    <span className={`w-5 h-5 border flex items-center justify-center shrink-0 ${on ? 'border-amber-200 bg-amber-200 text-black' : 'border-white/30'}`}>{on && <Check className="w-3.5 h-3.5" />}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-14">
            <label className="block"><span className="sd-label block mb-1">{t(TX.area)}</span>
              <input inputMode="numeric" value={area} onChange={(e) => setArea(e.target.value.replace(/[^\d.,]/g, '').slice(0, 6))} placeholder="60" className={field} /></label>
            <label className="block"><span className="sd-label block mb-1">{t(TX.year)}</span>
              <input inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="1975" className={field} /></label>
          </div>
          <QuoteForm key={prefill} defaultKind="offerte" includeList={false} prefill={prefill} doors={false} />
          <p className="text-white/40 text-sm mt-6">{t(UI.indicative)}</p>
        </div>
      </section>
    </>
  );
};

export default Insulation;
