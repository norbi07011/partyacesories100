import type { L } from '../i18n';

/* Site copy that is shared between pages: [NL, EN, PL]. */

export const STEPS: { title: L; desc: L }[] = [
  {
    title: ['Kiezen', 'Choose', 'Wybór'],
    desc: [
      'Kies online je model, kleur, glas en beslag — of doe het samen met ons aan de keukentafel. Je ziet direct een richtprijs.',
      'Pick your model, colour, glass and hardware online — or do it with us at the kitchen table. You see a guide price right away.',
      'Wybierz online model, kolor, szybę i okucia — albo zrób to z nami przy stole. Od razu widzisz cenę orientacyjną.',
    ],
  },
  {
    title: ['Inmeten', 'Measure', 'Pomiar'],
    desc: [
      'We komen langs en meten elk kozijn apart in: breedte, hoogte, dikte, draairichting en of het kozijn nog recht staat.',
      'We visit and measure every frame individually: width, height, thickness, swing direction and whether the frame is still square.',
      'Przyjeżdżamy i mierzymy każdą futrynę osobno: szerokość, wysokość, grubość, kierunek otwierania i pion.',
    ],
  },
  {
    title: ['Maken', 'Make', 'Produkcja'],
    desc: [
      'Je deuren worden op maat gemaakt en in de fabriek afgelakt. Scharnieren en slot worden vooraf ingefreesd.',
      'Your doors are made to size and factory finished. Hinges and lock are machined in beforehand.',
      'Drzwi powstają na wymiar i są lakierowane fabrycznie. Gniazda zawiasów i zamka frezujemy z wyprzedzeniem.',
    ],
  },
  {
    title: ['Monteren', 'Fit', 'Montaż'],
    desc: [
      'Wij hangen af, stellen af en monteren het beslag. De oude deuren en het verpakkingsmateriaal nemen we mee.',
      'We hang, adjust and fit the hardware. We take the old doors and the packaging with us.',
      'Zawieszamy, regulujemy i montujemy okucia. Stare drzwi i opakowania zabieramy ze sobą.',
    ],
  },
];

export const WHY: L[] = [
  ['Eén partij van eerste maat tot laatste scharnier', 'One company from first measurement to last hinge', 'Jedna firma od pierwszego pomiaru do ostatniego zawiasu'],
  ['Elk kozijn apart ingemeten — oude huizen zijn nooit recht', 'Every frame measured individually — old houses are never square', 'Każda futryna mierzona osobno — stare domy nigdy nie są proste'],
  ['Heldere offerte, alles op één pagina', 'A clear quote, everything on one page', 'Czytelna wycena, wszystko na jednej stronie'],
  ['Oude deuren en verpakking nemen we mee', 'We take the old doors and packaging away', 'Zabieramy stare drzwi i opakowania'],
  ['Eén deur of het hele huis — allebei welkom', 'One door or the whole house — both welcome', 'Jedne drzwi czy cały dom — zapraszamy'],
];

export type ServiceIcon = 'door' | 'home' | 'frame' | 'ruler' | 'wrench' | 'layers' | 'lock' | 'wind' | 'recycle';

export const SERVICES: { icon: ServiceIcon; title: L; desc: L; points: L[] }[] = [
  {
    icon: 'door',
    title: ['Binnendeuren vervangen', 'Replacing interior doors', 'Wymiana drzwi wewnętrznych'],
    desc: [
      'Van één deur tot het hele huis. In je bestaande kozijn of met nieuwe kozijnen erbij.',
      'From a single door to the whole house. In your existing frames or with new frames.',
      'Od jednych drzwi po cały dom. W obecnych futrynach lub z nowymi.',
    ],
    points: [
      ['Opdek- en stompe deuren', 'Rebated and flush doors', 'Drzwi przylgowe i bezprzylgowe'],
      ['Standaardmaat of maatwerk', 'Standard size or made to measure', 'Wymiar standardowy lub na miarę'],
      ['Fabrieksmatig afgelakt', 'Factory finished', 'Lakierowane fabrycznie'],
    ],
  },
  {
    icon: 'home',
    title: ['Voordeur & achterdeur', 'Front & back doors', 'Drzwi wejściowe i tylne'],
    desc: [
      'Een nieuwe buitendeur die isoleert, sluit en er weer jaren tegen kan. Inclusief hang- en sluitwerk.',
      'A new exterior door that insulates, locks and lasts for years. Hardware included.',
      'Nowe drzwi zewnętrzne, które izolują, zamykają i wytrzymują lata. Z okuciami.',
    ],
    points: [
      ['HR++ of triple glas', 'HR++ or triple glazing', 'Szyba HR++ lub potrójna'],
      ['Meerpuntssluiting SKG★★★', 'Multi-point lock SKG★★★', 'Zamek wielopunktowy SKG★★★'],
      ['Tuindeuren en boerderijdeuren', 'French doors and stable doors', 'Drzwi tarasowe i dzielone'],
    ],
  },
  {
    icon: 'frame',
    title: ['Kozijnen vervangen', 'Replacing frames', 'Wymiana futryn'],
    desc: [
      'Scheef, rot of gewoon gedateerd? We vervangen het hele kozijn of alleen het aangetaste deel.',
      'Crooked, rotten or just dated? We replace the whole frame or only the damaged part.',
      'Krzywa, zgniła albo po prostu przestarzała? Wymieniamy całą futrynę lub tylko uszkodzoną część.',
    ],
    points: [
      ['Hout, staal, kunststof en hardhout', 'Timber, steel, uPVC and hardwood', 'Drewno, stal, PCV i twarde drewno'],
      ['Onderdorpel vervangen', 'Threshold replacement', 'Wymiana progu'],
      ['Aftimmeren en afkitten', 'Trimming and sealing', 'Obróbka i uszczelnienie'],
    ],
  },
  {
    icon: 'ruler',
    title: ['Inmeten aan huis', 'Survey at home', 'Pomiar w domu'],
    desc: [
      'We meten elke opening in en nemen kleurstalen en beslag mee, zodat je ter plekke kunt kiezen.',
      'We measure every opening and bring colour samples and hardware, so you can choose on the spot.',
      'Mierzymy każdy otwór i przywozimy próbki kolorów i okuć, żeby wybrać na miejscu.',
    ],
    points: [
      ['Inbegrepen bij montage', 'Included with installation', 'W cenie montażu'],
      ['Advies over draairichting en glas', 'Advice on swing direction and glass', 'Doradztwo: kierunek otwierania i szkło'],
      ['Offerte op basis van echte maten', 'Quote based on real measurements', 'Wycena na podstawie rzeczywistych wymiarów'],
    ],
  },
  {
    icon: 'wrench',
    title: ['Montage & afhangen', 'Fitting & hanging', 'Montaż i zawieszanie'],
    desc: [
      'Deur passend maken, scharnieren inkrozen, slot en krukken monteren en alles soepel afstellen.',
      'Trimming the door to fit, cutting in hinges, fitting lock and handles and adjusting it all to run smoothly.',
      'Dopasowanie skrzydła, frezowanie zawiasów, montaż zamka i klamek oraz dokładna regulacja.',
    ],
    points: [
      ['Ook voor deuren die je elders kocht', 'Also for doors you bought elsewhere', 'Także dla drzwi kupionych gdzie indziej'],
      ['Inkorten en schaven op locatie', 'Shortening and planing on site', 'Skracanie i struganie na miejscu'],
      ['Klemmende deuren afstellen', 'Adjusting sticking doors', 'Regulacja zacinających się drzwi'],
    ],
  },
  {
    icon: 'layers',
    title: ['Schuif-, taats- & en-suitedeuren', 'Sliding, pivot & en-suite doors', 'Drzwi przesuwne, osiowe i en-suite'],
    desc: [
      'Maatwerk voor openingen waar een gewone draaideur niet past of niet mooi is.',
      'Made-to-measure solutions for openings where an ordinary hinged door does not fit or look right.',
      'Rozwiązania na wymiar tam, gdzie zwykłe drzwi nie pasują lub nie wyglądają dobrze.',
    ],
    points: [
      ['Staallook met veiligheidsglas', 'Steel look with safety glass', 'Styl loft ze szkłem bezpiecznym'],
      ['Schuifdeur voor of in de wand', 'Sliding door on or in the wall', 'Drzwi przesuwne naścienne lub chowane'],
      ['En-suite met of zonder kasten', 'En-suite with or without cabinets', 'En-suite z szafkami lub bez'],
    ],
  },
  {
    icon: 'lock',
    title: ['Sloten & inbraakwering', 'Locks & security', 'Zamki i zabezpieczenia'],
    desc: [
      'Nieuwe cilinders, veiligheidsbeslag en meerpuntssluitingen volgens het Politiekeurmerk Veilig Wonen.',
      'New cylinders, security hardware and multi-point locks to the Dutch PKVW standard.',
      'Nowe wkładki, okucia antywłamaniowe i zamki wielopunktowe zgodne z holenderskim standardem PKVW.',
    ],
    points: [
      ['SKG-gekeurd hang- en sluitwerk', 'SKG-rated locks and hinges', 'Okucia z atestem SKG'],
      ['Gelijksluitende cilinders', 'Keyed-alike cylinders', 'Wkładki na jeden klucz'],
      ['Kerntrekbeveiliging', 'Anti-snap protection', 'Ochrona przed wyrwaniem wkładki'],
    ],
  },
  {
    icon: 'wind',
    title: ['Tochtwering & isolatie', 'Draught proofing & insulation', 'Uszczelnienie i izolacja'],
    desc: [
      'Een tochtige deur kost elke winter geld. Met valdorpels, profielen en beter glas is dat vaak op te lossen.',
      'A draughty door costs money every winter. Drop seals, strips and better glass often solve it.',
      'Nieszczelne drzwi kosztują co zimę. Progi opadające, uszczelki i lepsza szyba często to rozwiązują.',
    ],
    points: [
      ['Valdorpels en tochtprofielen', 'Drop seals and draught strips', 'Progi opadające i uszczelki'],
      ['Glas vervangen door HR++', 'Upgrade glass to HR++', 'Wymiana szyby na HR++'],
      ['Geluidwerende binnendeuren', 'Sound-reducing interior doors', 'Drzwi wewnętrzne wyciszające'],
    ],
  },
  {
    icon: 'recycle',
    title: ['Afvoer & afwerking', 'Removal & finishing', 'Wywóz i wykończenie'],
    desc: [
      'We laten het netjes achter: oude deuren mee, naden gekit, koplatten gezet en de vloer gestofzuigd.',
      'We leave it tidy: old doors taken away, joints sealed, architraves fitted and the floor vacuumed.',
      'Zostawiamy porządek: stare drzwi zabrane, szczeliny uszczelnione, opaski założone, podłoga odkurzona.',
    ],
    points: [
      ['Oude deuren gescheiden afgevoerd', 'Old doors disposed of responsibly', 'Stare drzwi oddane do recyklingu'],
      ['Koplatten en architraven', 'Architraves and trims', 'Opaski i listwy'],
      ['Bijwerken van lakwerk', 'Paint touch-ups', 'Poprawki lakiernicze'],
    ],
  },
];

export const FAQ: { q: L; a: L }[] = [
  {
    q: ['Kan mijn bestaande kozijn blijven zitten?', 'Can my existing frame stay?', 'Czy obecna futryna może zostać?'],
    a: [
      'Meestal wel. Als het kozijn stevig is en niet te scheef staat, maken we de nieuwe deur passend in het bestaande kozijn. Dat scheelt hak- en stucwerk. Bij het inmeten zie je meteen of het kan.',
      'Usually, yes. If the frame is solid and not too far out of square, we make the new door fit the existing frame. That saves plastering work. You will know at the survey.',
      'Zwykle tak. Jeśli futryna jest stabilna i w miarę prosta, dopasowujemy nowe drzwi do istniejącej. Oszczędza to kucia i tynkowania. Wszystko wyjaśni się przy pomiarze.',
    ],
  },
  {
    q: ['Opdek of stomp — wat is het verschil?', 'Rebated or flush — what is the difference?', 'Przylgowe czy bezprzylgowe — jaka różnica?'],
    a: [
      'Een opdekdeur heeft een sponning en valt deels óver het kozijn; je vindt ze vooral bij stalen kozijnen. Een stompe deur valt helemaal ín het kozijn, zoals bij de meeste houten kozijnen. Je hoeft het niet zelf uit te zoeken: wij kijken ernaar bij het inmeten.',
      'A rebated door has a lip and partly overlaps the frame; you mostly see them with steel frames. A flush door sits entirely inside the frame, as with most timber frames. No need to work it out yourself — we check during the survey.',
      'Drzwi przylgowe mają felc i częściowo zachodzą na futrynę — typowe dla futryn stalowych. Bezprzylgowe chowają się w całości w futrynie, jak przy większości drewnianych. Nie musisz tego sprawdzać — zrobimy to przy pomiarze.',
    ],
  },
  {
    q: ['Wat kost het inmeten?', 'What does the survey cost?', 'Ile kosztuje pomiar?'],
    a: [
      'Het inmeten is inbegrepen als je de deuren door ons laat monteren. Kies je voor alleen levering, dan meet je zelf met onze inmeetgids — of je boekt het inmeten los erbij.',
      'The survey is included when we install the doors. If you choose delivery only, you measure yourself with our measuring guide — or book the survey separately.',
      'Pomiar jest w cenie, jeśli zlecasz nam montaż. Przy samej dostawie mierzysz samodzielnie według naszego poradnika — albo zamawiasz pomiar osobno.',
    ],
  },
  {
    q: ['Hoe lang duurt het?', 'How long does it take?', 'Ile to trwa?'],
    a: [
      'Standaardmaten zijn sneller leverbaar dan maatwerk en buitendeuren. De levertijd staat altijd in je offerte. Het monteren zelf plannen we zo dat je zo kort mogelijk zonder deuren zit.',
      'Standard sizes are available sooner than made-to-measure and exterior doors. The lead time is always stated in your quote. We plan the fitting so you are without doors for as short a time as possible.',
      'Wymiary standardowe są dostępne szybciej niż drzwi na miarę i zewnętrzne. Termin zawsze podajemy w wycenie. Montaż planujemy tak, by dom był bez drzwi jak najkrócej.',
    ],
  },
  {
    q: ['Kan ik de deuren ook zelf afhangen?', 'Can I hang the doors myself?', 'Czy mogę zamontować drzwi samodzielnie?'],
    a: [
      'Ja. Kies in de configurator voor “alleen levering”. In de inmeetgids lees je precies welke maten we van je nodig hebben.',
      'Yes. Choose “delivery only” in the configurator. The measuring guide tells you exactly which measurements we need.',
      'Tak. W konfiguratorze wybierz „tylko dostawa”. W poradniku pomiarowym znajdziesz dokładnie, jakich wymiarów potrzebujemy.',
    ],
  },
  {
    q: ['Heb ik een vergunning nodig voor een nieuwe voordeur?', 'Do I need a permit for a new front door?', 'Czy potrzebuję pozwolenia na nowe drzwi wejściowe?'],
    a: [
      'Voor het vervangen van een deur door een vergelijkbare deur is meestal geen vergunning nodig. Bij een monument, een beschermd stadsgezicht of een VvE gelden vaak wel regels over kleur en indeling. Check dat vooraf bij je gemeente of VvE.',
      'Replacing a door with a similar one usually needs no permit. For listed buildings, conservation areas or an owners’ association there are often rules on colour and layout. Check with your municipality or association first.',
      'Wymiana drzwi na podobne zwykle nie wymaga pozwolenia. W zabytkach, strefach chronionych i we wspólnotach (VvE) często obowiązują zasady dotyczące koloru i podziału. Sprawdź to wcześniej w gminie lub wspólnocie.',
    ],
  },
];
