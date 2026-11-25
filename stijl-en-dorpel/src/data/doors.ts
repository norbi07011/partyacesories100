import type { L } from '../i18n';

/* ─────────────────────────────────────────────────────────────────────────
 * Catalogus. Elke deur wordt getekend uit `parts` (zie components/Door.tsx),
 * dus een nieuw model toevoegen = één object hieronder.
 * Coördinaten per deurblad: 100 breed × 240 hoog.
 *
 * LET OP: alle prijzen zijn richtprijzen / placeholders (incl. btw).
 * ───────────────────────────────────────────────────────────────────────── */

export type Part =
  | { k: 'panel'; x: number; y: number; w: number; h: number }
  | { k: 'glass'; x: number; y: number; w: number; h: number; v?: number; h2?: number }
  | { k: 'groove'; x1: number; y1: number; x2: number; y2: number };

export type Category = 'binnen' | 'buiten';
export type Kind = 'draai' | 'schuif' | 'taats';

export type DoorModel = {
  id: string;
  name: string;
  cat: Category;
  kind: Kind;
  leaves: 1 | 2;
  style: L;
  desc: L;
  parts: Part[];
  steel?: boolean; // slank staallook-profiel
  pull?: boolean; // lange greep i.p.v. kruk
  brand?: string; // fabrikant, als het model uit een fabriekscollectie komt
  glassDefault?: GlassId;
  /** Fabrieksfoto's in public/fabriek/<dir>/: 1.jpg … n.jpg (varianten) en optioneel scene.jpg (sfeerbeeld).
   *  Ontbreken de bestanden, dan toont de site de tekening. */
  photos?: { dir: string; count: number; scene?: boolean };
  price: number;
  finish: string; // standaardkleur
  specs: L[];
};

const P = (x: number, y: number, w: number, h: number): Part => ({ k: 'panel', x, y, w, h });
const G = (x: number, y: number, w: number, h: number, v = 0, h2 = 0): Part => ({ k: 'glass', x, y, w, h, v, h2 });
const Gr = (x1: number, y1: number, x2: number, y2: number): Part => ({ k: 'groove', x1, y1, x2, y2 });

const INT: L[] = [
  ['Opdek of stomp leverbaar', 'Rebated or flush fit', 'Wersja przylgowa lub bezprzylgowa'],
  ['Standaardmaten én maatwerk', 'Standard sizes and made to measure', 'Wymiary standardowe i na miarę'],
  ['Afgelakt in kleur naar keuze', 'Factory finished in your colour', 'Lakierowane fabrycznie w wybranym kolorze'],
];
const EXT: L[] = [
  ['Geïsoleerd deurblad, HR++ of triple glas', 'Insulated leaf, HR++ or triple glazing', 'Ocieplone skrzydło, szyba HR++ lub potrójna'],
  ['Meerpuntssluiting, SKG-gekeurd hang- en sluitwerk', 'Multi-point lock, SKG-rated hardware', 'Zamek wielopunktowy, okucia z atestem SKG'],
  ['Tochtprofielen rondom', 'Draught seals all round', 'Uszczelki na całym obwodzie'],
];

/* Invado (modulaire en vlakke collecties, catalogus 2/2021). Tekeningen zijn eigen
 * weergaven van het ontwerp; zet `photo` zodra de fabrikant beeldmateriaal vrijgeeft. */
const INV: L[] = [
  ['Modulaire opbouw met panelen van 22 mm', 'Modular build with 22 mm panels', 'Konstrukcja modułowa, płyciny 22 mm'],
  ['Gehard satinato-glas van 4 mm', '4 mm toughened satin glass', 'Szkło hartowane satinato 4 mm'],
  ['Opdek of stomp, afgeronde kanten', 'Rebated or flush, rounded edges', 'Przylgowe lub bezprzylgowe, zaokrąglone krawędzie'],
];
const INV_FLAT: L[] = [
  ['Vlakke opbouw, licht en vormvast', 'Flat construction, light and stable', 'Konstrukcja płaska, lekka i stabilna'],
  ['Slijtvast decorfolie zonder naden op de kanten', 'Hard-wearing foil with seamless edges', 'Trwała okleina bez łączeń na krawędziach'],
  ['Opdek of stomp leverbaar', 'Rebated or flush fit', 'Wersja przylgowa lub bezprzylgowa'],
];
const MOD: Part[] = [Gr(10, 0, 10, 240), Gr(90, 0, 90, 240)];
const strips = (ys: number[], h = 8): Part[] => ys.map((y) => G(10, y, 80, h));
const PHOTO_COUNT: Record<string, number> = {
  corato: 5, artano: 2, aversa: 2, lago: 4, vinadio: 3, tamparo: 3, 'linea-forte': 5, bianco: 6, larina: 6, strada: 3, taurus: 1,
};
const inv = (m: Omit<DoorModel, 'cat' | 'kind' | 'leaves' | 'brand' | 'glassDefault' | 'specs' | 'photos'> & { specs?: L[] }): DoorModel => ({
  cat: 'binnen', kind: 'draai', leaves: 1, brand: 'Invado', glassDefault: 'mat', specs: INV,
  photos: { dir: `fabriek/invado/${m.id}`, count: PHOTO_COUNT[m.id] ?? 0, scene: m.id !== 'taurus' }, ...m,
});

/** Image paths (relative to the site root) for a model: variants and room scene. */
export const modelImages = (m: DoorModel) => {
  const p = m.photos;
  if (!p || p.count < 1) return { variants: [] as string[], scene: undefined as string | undefined };
  return {
    variants: Array.from({ length: p.count }, (_, i) => `${p.dir}/${i + 1}.jpg`),
    scene: p.scene ? `${p.dir}/scene.jpg` : undefined,
  };
};

const INVADO: DoorModel[] = [
  inv({
    id: 'corato', name: 'Corato', price: 289, finish: 'naturo',
    style: ['Modulair · modern', 'Modular · modern', 'Modułowe · nowoczesne'],
    desc: [
      'Liggende houtmodules, leverbaar dicht of met één tot vier smalle glasstroken. Warm hout, strak lijnenspel — de blikvanger van de collectie.',
      'Horizontal timber modules, solid or with one to four slim glass strips. Warm wood, crisp lines — the eye-catcher of the collection.',
      'Poziome moduły, pełne lub z jednym do czterech wąskich przeszkleń. Ciepłe drewno i czysta linia — ozdoba kolekcji.',
    ],
    parts: [...MOD, ...strips([58, 104]), Gr(10, 150, 90, 150), Gr(10, 196, 90, 196)],
  }),
  inv({
    id: 'artano', name: 'Artano', price: 299, finish: 'eiken',
    style: ['Modulair · verticaal glas', 'Modular · vertical glass', 'Modułowe · pionowa szyba'],
    desc: [
      'Eén hoge glasstrook naast het midden. Laat daglicht door en houdt de deur toch rustig en gesloten.',
      'One tall glass strip just off centre. Lets daylight through while the door stays calm and closed.',
      'Jedno wysokie przeszklenie obok środka. Wpuszcza światło, a drzwi pozostają spokojne.',
    ],
    parts: [...MOD, G(54, 20, 14, 190)],
  }),
  inv({
    id: 'aversa', name: 'Aversa', price: 295, finish: 'naturo',
    style: ['Modulair · minimalistisch', 'Modular · minimalist', 'Modułowe · minimalistyczne'],
    desc: [
      'Verticale houtmodules met een smalle glaslijn langs de rand. Minimalistisch, met net genoeg licht.',
      'Vertical timber modules with a narrow line of glass along the edge. Minimalist, with just enough light.',
      'Pionowe moduły z wąską linią szkła przy krawędzi. Minimalizm z odrobiną światła.',
    ],
    parts: [...MOD, G(76, 18, 9, 204), Gr(40, 0, 40, 240)],
  }),
  inv({
    id: 'lago', name: 'Lago', price: 319, finish: 'sneeuweik',
    style: ['Modulair · lamellen', 'Modular · slatted', 'Modułowe · lamele'],
    desc: [
      'Fijne lamellen met dunne glaslijnen en één breed glasvlak in het midden. Licht en luchtig.',
      'Fine slats with thin glass lines and one wide pane in the middle. Light and airy.',
      'Drobne lamele z cienkimi liniami szkła i jednym szerokim przeszkleniem pośrodku. Lekko i jasno.',
    ],
    parts: [...MOD, ...strips([24, 42, 60], 3), G(10, 84, 80, 46), ...strips([152, 170, 188, 206], 3)],
  }),
  inv({
    id: 'vinadio', name: 'Vinadio', price: 329, finish: 'sneeuweik',
    style: ['Modulair · glasdeur', 'Modular · glazed', 'Modułowe · przeszklone'],
    desc: [
      'Drie grote vlakken matglas in een slank houten raamwerk. Maximaal licht voor gang en overloop.',
      'Three large frosted panes in a slender timber frame. Maximum light for hallway and landing.',
      'Trzy duże tafle matowego szkła w smukłej ramie. Maksimum światła do korytarza.',
    ],
    parts: [...MOD, G(10, 22, 80, 56), G(10, 92, 80, 56), G(10, 162, 80, 56)],
  }),
  inv({
    id: 'linea-forte', name: 'Linea Forte', price: 299, finish: 'sneeuweik',
    style: ['Modulair · lijnen', 'Modular · lines', 'Modułowe · linie'],
    desc: [
      'Vijf haarfijne glaslijnen over een rustig deurblad. Subtiel detail dat pas van dichtbij opvalt.',
      'Five hair-thin glass lines across a calm leaf. A subtle detail you notice up close.',
      'Pięć cieniutkich linii szkła na spokojnym skrzydle. Subtelny detal widoczny z bliska.',
    ],
    parts: [...MOD, ...strips([40, 80, 120, 160, 200], 3)],
  }),
  inv({
    id: 'tamparo', name: 'Tamparo', price: 275, finish: 'sneeuweik',
    style: ['Modulair · dicht', 'Modular · solid', 'Modułowe · pełne'],
    desc: [
      'Volledig dichte deur van zes liggende modules. Voor slaapkamer en badkamer, waar je privacy wilt.',
      'A fully solid door of six horizontal modules. For bedroom and bathroom, where you want privacy.',
      'Pełne drzwi z sześciu poziomych modułów. Do sypialni i łazienki, gdzie liczy się prywatność.',
    ],
    parts: [...MOD, ...[40, 80, 120, 160, 200].map((y) => Gr(10, y, 90, y))],
  }),
  inv({
    id: 'larina', name: 'Larina', price: 309, finish: 'naturo',
    style: ['Modulair · landelijk', 'Modular · country', 'Modułowe · rustykalne'],
    desc: [
      'Glasvak boven twee panelen. Een landelijke deur in moderne uitvoering, mooi in keuken en hal.',
      'A glazed section over two panels. A country door in a modern finish, lovely in kitchen and hall.',
      'Szyba nad dwiema płycinami. Wiejski charakter w nowoczesnym wydaniu — do kuchni i holu.',
    ],
    parts: [G(16, 16, 68, 58), P(16, 86, 68, 62), P(16, 160, 68, 64)],
  }),
  inv({
    id: 'bianco', name: 'Bianco', price: 319, finish: '9010',
    style: ['Modulair · wit', 'Modular · white', 'Modułowe · białe'],
    desc: [
      'Witte deur met twee grote vlakken matglas. Fris, licht en passend bij vrijwel elk interieur.',
      'A white door with two large frosted panes. Fresh, bright and at home in almost any interior.',
      'Białe drzwi z dwiema dużymi taflami matowego szkła. Świeże, jasne, pasują niemal wszędzie.',
    ],
    parts: [G(16, 16, 68, 98), G(16, 128, 68, 96)],
  }),
  inv({
    id: 'strada', name: 'Strada', price: 259, finish: '9010', specs: INV_FLAT,
    style: ['Vlak · design', 'Flat · design', 'Płaskie · design'],
    desc: [
      'Vlakke deur met twee versprongen verticale glasstroken. Speels accent voor een strakke wand.',
      'A flat door with two offset vertical glass strips. A playful accent on a plain wall.',
      'Płaskie drzwi z dwoma przesuniętymi pionowymi przeszkleniami. Lekki akcent na gładkiej ścianie.',
    ],
    parts: [G(40, 34, 8, 104), G(54, 96, 8, 104)],
  }),
  inv({
    id: 'taurus', name: 'Taurus', price: 229, finish: 'noten', specs: INV_FLAT,
    style: ['Vlak · houtdecor', 'Flat · wood decor', 'Płaskie · dekor drewna'],
    desc: [
      'Volledig vlakke deur in houtdecor. Tijdloos en de voordeligste keuze binnen de fabriekscollectie.',
      'A fully flat door in wood decor. Timeless and the most affordable choice in the factory collection.',
      'Całkowicie płaskie drzwi w dekorze drewna. Ponadczasowe i najtańsze w kolekcji fabrycznej.',
    ],
    parts: [],
  }),
];

const OWN: DoorModel[] = [
  {
    id: 'linde', name: 'Linde', cat: 'binnen', kind: 'draai', leaves: 1, price: 189, finish: '9010',
    style: ['Vlak · modern', 'Flush · modern', 'Gładkie · nowoczesne'],
    desc: [
      'Strakke vlakke binnendeur. Rustig, tijdloos en de voordeligste manier om je hele huis in één keer op te frissen.',
      'A clean flush interior door. Calm, timeless and the most affordable way to refresh the whole house at once.',
      'Proste, gładkie drzwi wewnętrzne. Spokojne, ponadczasowe i najtańszy sposób na odświeżenie całego domu.',
    ],
    parts: [], specs: INT,
  },
  {
    id: 'lijn', name: 'Lijn', cat: 'binnen', kind: 'draai', leaves: 1, price: 229, finish: '7016',
    style: ['Lijnfrees · modern', 'Grooved · modern', 'Frezowane · nowoczesne'],
    desc: [
      'Vlakke deur met drie horizontale freeslijnen. Net dat beetje extra tekening zonder druk te worden.',
      'A flush door with three horizontal grooves. Just enough detail without getting busy.',
      'Gładkie drzwi z trzema poziomymi frezami. Odrobina rysunku, bez przesady.',
    ],
    parts: [Gr(0, 60, 100, 60), Gr(0, 120, 100, 120), Gr(0, 180, 100, 180)], specs: INT,
  },
  {
    id: 'texel', name: 'Texel', cat: 'binnen', kind: 'draai', leaves: 1, price: 259, finish: '9001',
    style: ['Shaker · landelijk', 'Shaker · country', 'Shaker · rustykalne'],
    desc: [
      'Eén groot verdiept paneel in shakerstijl. Past net zo goed in een jaren-30-woning als in nieuwbouw.',
      'One large recessed shaker panel. Works just as well in a 1930s home as in a new build.',
      'Jeden duży, zagłębiony panel w stylu shaker. Pasuje i do kamienicy, i do nowego domu.',
    ],
    parts: [P(12, 12, 76, 216)], specs: INT,
  },
  {
    id: 'haarlem', name: 'Haarlem', cat: 'binnen', kind: 'draai', leaves: 1, price: 279, finish: '9010',
    style: ['Paneeldeur · klassiek', 'Panel door · classic', 'Płycinowe · klasyczne'],
    desc: [
      'Klassieke tweevaks paneeldeur met de verhoudingen van een oud-Hollandse deur, in een moderne opbouw.',
      'A classic two-panel door with old Dutch proportions and a modern construction.',
      'Klasyczne drzwi dwupłycinowe o holenderskich proporcjach i współczesnej konstrukcji.',
    ],
    parts: [P(12, 12, 76, 96), P(12, 120, 76, 108)], specs: INT,
  },
  {
    id: 'delft', name: 'Delft', cat: 'binnen', kind: 'draai', leaves: 1, price: 299, finish: '9010',
    style: ['Paneeldeur · klassiek', 'Panel door · classic', 'Płycinowe · klasyczne'],
    desc: [
      'Viervaks paneeldeur. De deur die je in herenhuizen en grachtenpanden terugziet, nu op jouw maat.',
      'A four-panel door — the one you see in town houses and canal houses, now made to your size.',
      'Drzwi czteropłycinowe, jakie spotkasz w kamienicach nad kanałami — teraz na Twój wymiar.',
    ],
    parts: [P(12, 12, 35, 120), P(53, 12, 35, 120), P(12, 144, 35, 84), P(53, 144, 35, 84)], specs: INT,
  },
  {
    id: 'tuindorp', name: 'Tuindorp', cat: 'binnen', kind: 'draai', leaves: 1, price: 369, finish: 'salie',
    style: ["Jaren '30 · glas", '1930s · glazed', 'Lata 30. · z szybą'],
    desc: [
      "Jaren-'30-deur met drie ruitjes boven twee panelen. Laat licht door naar de gang en houdt het karakter van je huis intact.",
      'A 1930s door with three panes over two panels. Lets light through to the hallway and keeps the character of the house.',
      'Drzwi w stylu lat 30.: trzy szybki nad dwiema płycinami. Wpuszczają światło do korytarza i zachowują charakter domu.',
    ],
    parts: [G(14, 14, 72, 52, 2), P(14, 78, 72, 66), P(14, 156, 72, 70)], specs: INT,
  },
  {
    id: 'atelier', name: 'Atelier', cat: 'binnen', kind: 'draai', leaves: 1, price: 429, finish: 'eiken',
    style: ['Glasdeur · hout', 'Glazed · timber', 'Przeszklone · drewno'],
    desc: [
      'Houten deur met drie glasvakken. Maakt van een donkere gang een lichte, zonder dat je de ruimte open hoeft te breken.',
      'A timber door with three glazed sections. Turns a dark hallway into a bright one without knocking down a wall.',
      'Drewniane drzwi z trzema szybami. Rozjaśniają ciemny korytarz bez wyburzania ścian.',
    ],
    parts: [G(14, 14, 72, 64), G(14, 88, 72, 64), G(14, 162, 72, 64)], specs: INT,
  },
  {
    id: 'loods', name: 'Loods', cat: 'binnen', kind: 'taats', leaves: 1, price: 649, finish: '9005', steel: true, pull: true,
    style: ['Staallook · taatsdeur', 'Steel look · pivot', 'Loft · drzwi osiowe'],
    desc: [
      'Taatsdeur met slanke staallook-profielen en acht glasvakken. Draait zonder kozijn, dus ook te plaatsen in een bestaande doorgang.',
      'A pivot door with slim steel-look profiles and eight panes. No frame needed, so it fits an existing opening.',
      'Drzwi osiowe ze smukłymi profilami w stylu stali i ośmioma szybami. Bez ościeżnicy — pasują do istniejącego otworu.',
    ],
    parts: [G(5, 5, 90, 230, 1, 3)],
    specs: [
      ['Taatsscharnier in vloer en plafond, geen kozijn nodig', 'Floor and ceiling pivot, no frame required', 'Zawias osiowy w podłodze i suficie, bez ościeżnicy'],
      ['Veiligheidsglas', 'Safety glass', 'Szkło bezpieczne'],
      ['Altijd op maat gemaakt', 'Always made to measure', 'Zawsze na wymiar'],
    ],
  },
  {
    id: 'rails', name: 'Rails', cat: 'binnen', kind: 'schuif', leaves: 1, price: 489, finish: 'noten',
    style: ['Schuifdeur · loft', 'Sliding · loft', 'Przesuwne · loft'],
    desc: [
      'Schuifdeur op een zichtbare rail. Kost geen draairuimte, ideaal voor badkamer, bijkeuken of inloopkast.',
      'A sliding door on an exposed rail. Needs no swing space — ideal for a bathroom, utility room or walk-in wardrobe.',
      'Drzwi przesuwne na widocznej szynie. Nie zabierają miejsca — idealne do łazienki, spiżarni czy garderoby.',
    ],
    parts: [Gr(25, 0, 25, 240), Gr(50, 0, 50, 240), Gr(75, 0, 75, 240)],
    specs: [
      ['Inclusief rail, rollers en vloergeleider', 'Rail, rollers and floor guide included', 'W komplecie szyna, rolki i prowadnik'],
      ['Softclose mogelijk', 'Soft close available', 'Możliwy cichy domyk'],
      ['Geen kozijn nodig', 'No frame required', 'Bez ościeżnicy'],
    ],
  },
  {
    id: 'jordaan', name: 'Jordaan', cat: 'binnen', kind: 'draai', leaves: 2, price: 1190, finish: '9010',
    style: ['En-suite · dubbel', 'En-suite · double', 'Dwuskrzydłowe · en-suite'],
    desc: [
      'Dubbele en-suitedeuren met glas en roeden. Verbindt woon- en eetkamer, of sluit ze juist warm af.',
      'Double en-suite doors with glazing bars. Connects living and dining room — or closes them off to keep the heat in.',
      'Podwójne drzwi en-suite ze szprosami. Łączą salon z jadalnią albo zamykają je, żeby zatrzymać ciepło.',
    ],
    parts: [G(14, 14, 72, 150, 1, 3), P(14, 176, 72, 50)], specs: INT,
  },

  /* ───────────── Buitendeuren ───────────── */
  {
    id: 'gracht', name: 'Gracht', cat: 'buiten', kind: 'draai', leaves: 1, price: 1890, finish: 'grachtengroen',
    style: ['Voordeur · klassiek', 'Front door · classic', 'Wejściowe · klasyczne'],
    desc: [
      'Klassieke voordeur met bovenlicht en twee panelen. De uitstraling van een stadsdeur, de isolatie van nu.',
      'A classic front door with a top light and two panels. Town-house looks, modern insulation.',
      'Klasyczne drzwi wejściowe z naświetlem i dwiema płycinami. Wygląd kamienicy, dzisiejsza izolacja.',
    ],
    parts: [G(16, 14, 68, 44), P(16, 70, 68, 74), P(16, 156, 68, 68)], specs: EXT,
  },
  {
    id: 'polder', name: 'Polder', cat: 'buiten', kind: 'draai', leaves: 1, price: 2190, finish: '7016', pull: true,
    style: ['Voordeur · modern', 'Front door · modern', 'Wejściowe · nowoczesne'],
    desc: [
      'Vlakke voordeur met een smalle verticale glasstrook en lange greep. Strak, veilig en opvallend ingetogen.',
      'A flush front door with a slim vertical glass strip and a long pull. Clean, secure and quietly striking.',
      'Gładkie drzwi wejściowe z wąskim pionowym przeszkleniem i długim pochwytem. Proste, bezpieczne, eleganckie.',
    ],
    parts: [G(60, 30, 14, 180)], specs: EXT,
  },
  {
    id: 'wad', name: 'Wad', cat: 'buiten', kind: 'draai', leaves: 1, price: 2090, finish: 'duifblauw', pull: true,
    style: ['Voordeur · modern', 'Front door · modern', 'Wejściowe · nowoczesne'],
    desc: [
      'Voordeur met horizontale groeven en drie vierkante ruitjes. Geeft daglicht in de hal zonder inkijk.',
      'A front door with horizontal grooves and three square panes. Daylight in the hall, no view in.',
      'Drzwi wejściowe z poziomymi frezami i trzema kwadratowymi szybkami. Światło w holu, bez zaglądania.',
    ],
    parts: [Gr(0, 48, 100, 48), Gr(0, 96, 100, 96), Gr(0, 144, 100, 144), Gr(0, 192, 100, 192), G(66, 14, 16, 22), G(66, 61, 16, 22), G(66, 109, 16, 22)],
    specs: EXT,
  },
  {
    id: 'tuin', name: 'Tuin', cat: 'buiten', kind: 'draai', leaves: 1, price: 1490, finish: '9010',
    style: ['Achterdeur · glas', 'Back door · glazed', 'Tylne · przeszklone'],
    desc: [
      'Achterdeur met groot glasvlak en borstwering. Veel licht in de keuken, stevig onderin.',
      'A back door with a large pane and a solid lower panel. Lots of light in the kitchen, sturdy below.',
      'Drzwi tylne z dużą szybą i pełnym dołem. Dużo światła w kuchni, solidny dół.',
    ],
    parts: [G(14, 14, 72, 150), P(14, 176, 72, 50)], specs: EXT,
  },
  {
    id: 'veranda', name: 'Veranda', cat: 'buiten', kind: 'draai', leaves: 2, price: 2890, finish: '9005',
    style: ['Tuindeuren · dubbel', 'French doors · double', 'Balkonowe · podwójne'],
    desc: [
      'Openslaande tuindeuren met volledig glas. Zet ze open en de tuin hoort bij de kamer.',
      'Fully glazed French doors. Open them and the garden becomes part of the room.',
      'W pełni przeszklone drzwi tarasowe. Otwórz je, a ogród staje się częścią pokoju.',
    ],
    parts: [G(12, 12, 76, 216)], specs: EXT,
  },
  {
    id: 'hoeve', name: 'Hoeve', cat: 'buiten', kind: 'draai', leaves: 1, price: 1990, finish: 'eiken',
    style: ['Boerderijdeur · landelijk', 'Stable door · country', 'Dzielone · wiejskie'],
    desc: [
      'Boerderijdeur met los te openen bovendeel. Frisse lucht binnen, hond en kinderen ook.',
      'A stable door with a top half that opens on its own. Fresh air in, dog and kids stay in too.',
      'Drzwi dzielone z osobno otwieraną górą. Świeże powietrze w środku — pies i dzieci też.',
    ],
    parts: [G(16, 16, 68, 84, 1, 1), Gr(0, 118, 100, 118), P(16, 134, 68, 92)], specs: EXT,
  },
];

export const MODELS: DoorModel[] = [...INVADO, ...OWN];

export const modelById = (id: string | null | undefined) => MODELS.find((m) => m.id === id) ?? MODELS[0];

/* ───────────── Opties ───────────── */

export type Finish = { id: string; name: L; hex: string; wood?: boolean; price: number };
export const FINISHES: Finish[] = [
  { id: '9010', name: ['Zuiver wit · RAL 9010', 'Pure white · RAL 9010', 'Biel czysta · RAL 9010'], hex: '#efece4', price: 0 },
  { id: '9001', name: ['Crèmewit · RAL 9001', 'Cream · RAL 9001', 'Kremowy · RAL 9001'], hex: '#e4dac4', price: 0 },
  { id: '7016', name: ['Antraciet · RAL 7016', 'Anthracite · RAL 7016', 'Antracyt · RAL 7016'], hex: '#3a4045', price: 0 },
  { id: '9005', name: ['Gitzwart · RAL 9005', 'Jet black · RAL 9005', 'Czarny · RAL 9005'], hex: '#171717', price: 0 },
  { id: 'salie', name: ['Saliegroen', 'Sage green', 'Szałwiowa zieleń'], hex: '#8b9a84', price: 45 },
  { id: 'grachtengroen', name: ['Grachtengroen', 'Canal green', 'Zieleń amsterdamska'], hex: '#1f3b30', price: 45 },
  { id: 'duifblauw', name: ['Duifblauw', 'Dove blue', 'Gołębi błękit'], hex: '#5b7084', price: 45 },
  { id: 'eiken', name: ['Eiken naturel', 'Natural oak', 'Dąb naturalny'], hex: '#b58a57', wood: true, price: 140 },
  { id: 'noten', name: ['Noten', 'Walnut', 'Orzech'], hex: '#5d3f2a', wood: true, price: 180 },
  { id: 'naturo', name: ['Eiken naturo', 'Naturo oak', 'Dąb naturo'], hex: '#c9a273', wood: true, price: 0 },
  { id: 'sneeuweik', name: ['Sneeuweiken', 'Snow oak', 'Dąb śnieżny'], hex: '#d8d2c6', wood: true, price: 0 },
  { id: 'antracieteik', name: ['Antraciet eiken', 'Anthracite oak', 'Dąb antracyt'], hex: '#45423f', wood: true, price: 0 },
];
export const finishById = (id: string) => FINISHES.find((f) => f.id === id) ?? FINISHES[0];

export type GlassId = 'helder' | 'mat' | 'gerookt' | 'ribbel';
export const GLASS: { id: GlassId; name: L; price: number }[] = [
  { id: 'helder', name: ['Helder glas', 'Clear glass', 'Szkło przezroczyste'], price: 0 },
  { id: 'mat', name: ['Mat glas', 'Frosted glass', 'Szkło matowe'], price: 35 },
  { id: 'gerookt', name: ['Rookglas', 'Smoked glass', 'Szkło dymione'], price: 60 },
  { id: 'ribbel', name: ['Ribbelglas', 'Fluted glass', 'Szkło ryflowane'], price: 95 },
];

export type HandleId = 'rvs' | 'zwart' | 'messing';
export const HANDLES: { id: HandleId; name: L; hex: string; price: number }[] = [
  { id: 'rvs', name: ['Geborsteld RVS', 'Brushed steel', 'Stal szczotkowana'], hex: '#c4c8cc', price: 0 },
  { id: 'zwart', name: ['Mat zwart', 'Matt black', 'Czarny mat'], hex: '#222222', price: 15 },
  { id: 'messing', name: ['Messing', 'Brass', 'Mosiądz'], hex: '#c9a45c', price: 30 },
];

export type FrameId = 'behouden' | 'hout' | 'staal' | 'geen';
export const FRAMES: { id: FrameId; name: L; hint: L; price: [number, number] }[] = [
  {
    id: 'behouden', price: [0, 0],
    name: ['Bestaand kozijn behouden', 'Keep the existing frame', 'Zostaje obecna futryna'],
    hint: ['We meten het kozijn in en maken de deur passend.', 'We measure the frame and make the door fit.', 'Mierzymy futrynę i dopasowujemy drzwi.'],
  },
  {
    id: 'hout', price: [245, 690],
    name: ['Nieuw houten kozijn', 'New timber frame', 'Nowa futryna drewniana'],
    hint: ['Gegrond of afgelakt, stomp of opdek.', 'Primed or finished, flush or rebated.', 'Zagruntowana lub lakierowana, przylgowa lub nie.'],
  },
  {
    id: 'staal', price: [165, 165],
    name: ['Nieuw stalen kozijn', 'New steel frame', 'Nowa futryna stalowa'],
    hint: ['Nastelbaar montagekozijn, snel geplaatst.', 'Adjustable fitting frame, quickly installed.', 'Regulowana futryna montażowa, szybki montaż.'],
  },
];

export const WIDTHS = [63, 68, 73, 78, 83, 88, 93];
export const HEIGHTS = [201.5, 211.5, 231.5];

export type ServiceId = 'levering' | 'montage';
export const SERVICE: { id: ServiceId; name: L; hint: L; price: [number, number] }[] = [
  {
    id: 'montage', price: [145, 390],
    name: ['Inmeten + montage', 'Survey + installation', 'Pomiar + montaż'],
    hint: ['Wij meten in, hangen af en voeren de oude deur af.', 'We measure, hang the door and take the old one away.', 'Mierzymy, montujemy i zabieramy stare drzwi.'],
  },
  {
    id: 'levering', price: [0, 0],
    name: ['Alleen levering', 'Delivery only', 'Tylko dostawa'],
    hint: ['Je hangt de deur zelf af. Bezorging in overleg.', 'You hang the door yourself. Delivery by arrangement.', 'Montujesz samodzielnie. Dostawa do uzgodnienia.'],
  },
];

export type DoorConfig = {
  model: string;
  finish: string;
  glass: GlassId;
  handle: HandleId;
  frame: FrameId;
  width: number | 'maat';
  height: number | 'maat';
  customW?: string;
  customH?: string;
  hinge: 'L' | 'R';
  service: ServiceId;
};

export const defaultConfig = (m: DoorModel): DoorConfig => ({
  model: m.id, finish: m.finish, glass: m.glassDefault ?? 'helder', handle: m.finish === '9005' || m.finish === '7016' ? 'rvs' : 'zwart',
  frame: 'behouden', width: 83, height: 201.5, hinge: 'L', service: 'montage',
});

export const hasGlass = (m: DoorModel) => m.parts.some((p) => p.k === 'glass');
export const needsFrame = (m: DoorModel) => m.kind === 'draai';

/** Richtprijs per stuk voor een samengestelde deur. */
export const priceOf = (c: DoorConfig) => {
  const m = modelById(c.model);
  const ext = m.cat === 'buiten' ? 1 : 0;
  let p = m.price;
  p += finishById(c.finish).price * m.leaves * (ext ? 2 : 1);
  if (hasGlass(m)) p += (GLASS.find((g) => g.id === c.glass)?.price ?? 0) * m.leaves;
  p += (HANDLES.find((h) => h.id === c.handle)?.price ?? 0) * m.leaves;
  if (needsFrame(m)) p += FRAMES.find((f) => f.id === c.frame)?.price[ext] ?? 0;
  if (c.width === 'maat' || c.height === 'maat') p += Math.round(m.price * 0.15);
  else {
    if (c.width > 88) p += 35 * m.leaves;
    if (c.height > 201.5) p += (c.height > 211.5 ? 95 : 45) * m.leaves;
  }
  p += (SERVICE.find((s) => s.id === c.service)?.price[ext] ?? 0) * (m.leaves === 2 ? 1.5 : 1);
  return Math.round(p);
};

/* ───────────── Kozijnen & beslag (losse producten) ───────────── */

export type ProductCat = 'kozijn' | 'beslag' | 'systeem';
export type Product = {
  id: string;
  cat: ProductCat;
  name: L;
  desc: L;
  price: number;
  unit: L;
  art?: 'frame-wood' | 'frame-steel' | 'frame-pvc' | 'frame-alu' | 'handle' | 'lock' | 'hinge' | 'seal';
  photos?: string[]; // fabrieksfoto's in public/ (relatief pad)
  cover?: boolean; // foto's zijn sfeerbeelden: beeldvullend tonen
  brand?: string;
};

const PER: L = ['per stuk', 'each', 'za sztukę'];
const PERSET: L = ['per set', 'per set', 'za komplet'];
const PERM: L = ['per meter', 'per metre', 'za metr'];
const F = (dir: string, n = 1) => Array.from({ length: n }, (_, i) => `fabriek/invado/${dir}/${i + 1}.jpg`);
const I = (p: Omit<Product, 'brand'>): Product => ({ brand: 'Invado', ...p });

export const PRODUCTS: Product[] = [
  /* ───────────── Kozijnen ───────────── */
  I({
    id: 'ors', cat: 'kozijn', price: 119, unit: PER, photos: F('ors'),
    name: ['Verstelbaar kozijn', 'Adjustable frame', 'Ościeżnica regulowana'],
    desc: [
      'Kozijn met verstelbare omlijsting dat zich aanpast aan de wanddikte. Dezelfde decorfolie als de deur, dus één geheel.',
      'A frame with adjustable architrave that adapts to the wall thickness. Same decor foil as the door, so it reads as one piece.',
      'Ościeżnica z regulowaną opaską, dopasowuje się do grubości muru. Ta sama okleina co skrzydło — spójna całość.',
    ],
  }),
  I({
    id: 'ob3', cat: 'kozijn', price: 69, unit: PER, photos: F('ob3'),
    name: ['Blokkozijn', 'Block frame', 'Ościeżnica blokowa'],
    desc: [
      'Vaste kozijnbalk voor opdekdeuren. De voordelige keuze, uit te breiden met een afdeklijst.',
      'A fixed frame section for rebated doors. The economical choice, extendable with a cover trim.',
      'Stała ościeżnica do drzwi przylgowych. Ekonomiczny wybór, z możliwością dodania opaski.',
    ],
  }),
  I({
    id: 'sara', cover: true, cat: 'kozijn', price: 349, unit: PER, photos: F('sara', 2),
    name: ['Onzichtbaar kozijn', 'Concealed frame', 'Ościeżnica niewidoczna'],
    desc: [
      'Kozijn dat in de wand verdwijnt. De deur ligt vlak in de muur en kan mee behangen of geschilderd worden.',
      'A frame that disappears into the wall. The door sits flush and can be papered or painted along with the wall.',
      'Ościeżnica ukryta w ścianie. Skrzydło licuje z murem i można je pomalować lub wytapetować razem ze ścianą.',
    ],
  }),
  {
    id: 'kozijn-staal', cat: 'kozijn', art: 'frame-steel', price: 165, unit: PER,
    name: ['Stalen montagekozijn', 'Steel fitting frame', 'Stalowa futryna montażowa'],
    desc: [
      'Nastelbaar stalen kozijn dat we achteraf in een afgewerkte wand plaatsen. Snel, strak en onderhoudsvrij.',
      'An adjustable steel frame fitted into a finished wall. Quick, crisp and maintenance-free.',
      'Regulowana stalowa futryna montowana w wykończonej ścianie. Szybko, równo i bez konserwacji.',
    ],
  },
  {
    id: 'kozijn-kunststof', cat: 'kozijn', art: 'frame-pvc', price: 790, unit: PER,
    name: ['Kunststof buitenkozijn', 'uPVC exterior frame', 'Zewnętrzna futryna PCV'],
    desc: [
      'Geïsoleerd kunststof deurkozijn met lage onderdorpel. Nooit meer schilderen, wel de uitstraling van hout.',
      'An insulated uPVC door frame with a low threshold. No more painting, still the look of timber.',
      'Ocieplona futryna PCV z niskim progiem. Bez malowania, a wygląda jak drewno.',
    ],
  },
  {
    id: 'kozijn-hardhout', cat: 'kozijn', art: 'frame-alu', price: 690, unit: PER,
    name: ['Hardhouten buitenkozijn', 'Hardwood exterior frame', 'Zewnętrzna futryna z twardego drewna'],
    desc: [
      'Hardhouten kozijn met DTS- of hardstenen onderdorpel. De duurzame keuze voor voordeur en achterdeur.',
      'A hardwood frame with a composite or bluestone threshold. The lasting choice for front and back doors.',
      'Futryna z twardego drewna z progiem kompozytowym lub kamiennym. Trwały wybór do drzwi wejściowych.',
    ],
  },

  /* ───────────── Systemen & afwerking ───────────── */
  I({
    id: 'pocket', cover: true, cat: 'systeem', price: 499, unit: PER, photos: F('pocket'),
    name: ['Schuifdeur in de wand', 'Pocket sliding door', 'Drzwi przesuwne chowane w ścianę'],
    desc: [
      'Cassettesysteem voor gipswanden: de deur schuift volledig in de muur. Geen draairuimte, geen rail in zicht.',
      'A cassette system for stud walls: the door slides fully into the wall. No swing space, no visible rail.',
      'System kasetowy do ścian g-k: skrzydło chowa się całkowicie w ścianie. Bez miejsca na otwieranie, bez widocznej szyny.',
    ],
  }),
  I({
    id: 'wall', cover: true, cat: 'systeem', price: 189, unit: PER, photos: F('wall'),
    name: ['Schuifdeur voor de wand', 'Surface sliding door', 'Drzwi przesuwne naścienne'],
    desc: [
      'Schuifsysteem met afdekkap dat vóór de wand loopt. Achteraf te plaatsen, zonder breekwerk.',
      'A sliding system with cover that runs in front of the wall. Fitted afterwards, no demolition needed.',
      'System przesuwny z maskownicą prowadzony po ścianie. Montaż bez kucia, także po remoncie.',
    ],
  }),
  I({
    id: 'amber', cover: true, cat: 'systeem', price: 249, unit: PER, photos: F('amber'),
    name: ['Glazen deur', 'Glass door', 'Drzwi szklane'],
    desc: [
      'Volglazen deur van gehard matglas. Laat het licht door, houdt de inkijk tegen.',
      'A full-glass door in toughened frosted glass. Lets the light through, keeps prying eyes out.',
      'Całoszklane drzwi z hartowanego szkła matowego. Przepuszczają światło, chronią prywatność.',
    ],
  }),
  I({
    id: 'egida', cover: true, cat: 'systeem', price: 449, unit: PER, photos: F('egida'),
    name: ['Appartementdeur RC2', 'Apartment entrance door RC2', 'Drzwi wejściowe do mieszkania RC2'],
    desc: [
      'Binnen-toegangsdeur voor appartementen met inbraakwerendheid RC2, in combinatie met het bijbehorende kozijn en beslag.',
      'An internal entrance door for apartments with RC2 burglar resistance, in combination with the matching frame and hardware.',
      'Drzwi wejściowe wewnętrzne do mieszkań o odporności na włamanie RC2, w komplecie z dedykowaną ościeżnicą i okuciami.',
    ],
  }),
  I({
    id: 'listwy', cover: true, cat: 'systeem', price: 9, unit: PERM, photos: F('listwy', 3),
    name: ['Plinten', 'Skirting boards', 'Listwy przypodłogowe'],
    desc: [
      'Hoge witte plinten in drie profielen. Maken de overgang van vloer naar wand af en passen bij de deuren.',
      'Tall white skirting boards in three profiles. They finish the junction of floor and wall and match the doors.',
      'Wysokie białe listwy w trzech profilach. Wykańczają styk podłogi ze ścianą i pasują do drzwi.',
    ],
  }),

  /* ───────────── Beslag & toebehoren ───────────── */
  I({
    id: 'klamki', cat: 'beslag', price: 29, unit: PERSET, photos: F('klamki'),
    name: ['Deurkrukken', 'Door handles', 'Klamki'],
    desc: [
      'Veertien krukmodellen op rond of vierkant rozet, in chroom, nikkel, antraciet en mat zwart.',
      'Fourteen handle models on round or square roses, in chrome, nickel, anthracite and matt black.',
      'Czternaście modeli klamek na rozecie okrągłej lub kwadratowej: chrom, nikiel, antracyt i czarny mat.',
    ],
  }),
  I({
    id: 'zawiasy', cat: 'beslag', price: 12, unit: PERSET, photos: F('zawiasy'),
    name: ['Scharnieren', 'Hinges', 'Zawiasy'],
    desc: [
      'Inboorscharnieren met afdekkapjes in vier kleuren, of onzichtbare scharnieren voor stompe deuren.',
      'Screw-in hinges with cover caps in four colours, or concealed hinges for flush doors.',
      'Zawiasy czopowe z nasadkami w czterech kolorach albo zawiasy chowane do drzwi bezprzylgowych.',
    ],
  }),
  {
    id: 'slot', cat: 'beslag', art: 'lock', price: 189, unit: PER,
    name: ['Meerpuntssluiting SKG★★★', 'Multi-point lock SKG★★★', 'Zamek wielopunktowy SKG★★★'],
    desc: [
      'Driepuntssluiting met veiligheidscilinder en kerntrekbeveiliging voor buitendeuren.',
      'Three-point lock with security cylinder and anti-snap protection for exterior doors.',
      'Zamek trzypunktowy z wkładką antywłamaniową do drzwi zewnętrznych.',
    ],
  },
  I({
    id: 'wkladka', cat: 'beslag', price: 19, unit: PER, photos: F('wkladka'),
    name: ['Profielcilinder', 'Euro cylinder', 'Wkładka patentowa'],
    desc: [
      'Cilinder voor slaapkamer-, kantoor- of bergingdeur. Op verzoek gelijksluitend voor meerdere deuren.',
      'A cylinder for bedroom, office or storage doors. Keyed alike for several doors on request.',
      'Wkładka do drzwi sypialni, biura lub schowka. Na życzenie w systemie jednego klucza.',
    ],
  }),
  I({
    id: 'uszczelka', cat: 'beslag', price: 49, unit: PER, photos: F('uszczelka'),
    name: ['Valdorpel', 'Drop seal', 'Uszczelka opadająca'],
    desc: [
      'Onzichtbare afdichting onder de deur die zakt zodra de deur sluit. Scheelt tocht, geluid en stookkosten.',
      'A concealed seal under the door that drops when the door closes. Cuts draughts, noise and heating bills.',
      'Niewidoczna uszczelka pod skrzydłem, opada przy zamknięciu. Mniej przeciągów, hałasu i rachunków.',
    ],
  }),
  I({
    id: 'prog', cat: 'beslag', price: 29, unit: PER, photos: F('prog'),
    name: ['Aluminium dorpel', 'Aluminium threshold', 'Próg aluminiowy'],
    desc: [
      'Lage aluminium dorpel als nette overgang tussen twee vloeren. Sluit aan op de valdorpel.',
      'A low aluminium threshold for a neat transition between two floors. Works with the drop seal.',
      'Niski próg aluminiowy jako estetyczne przejście między podłogami. Współpracuje z uszczelką opadającą.',
    ],
  }),
  I({
    id: 'wentylacja', cat: 'beslag', price: 9, unit: PERSET, photos: F('wentylacja'),
    name: ['Ventilatie in de deur', 'Door ventilation', 'Wentylacja w drzwiach'],
    desc: [
      'Ronde of vierkante ventilatiehulzen of een rooster onderin de deur. Nodig voor badkamer en toilet.',
      'Round or square ventilation sleeves or a grille in the bottom of the door. Required for bathroom and toilet.',
      'Okrągłe lub kwadratowe tuleje albo kratka w dolnej części skrzydła. Potrzebne w łazience i toalecie.',
    ],
  }),
  I({
    id: 'kick', cat: 'beslag', price: 59, unit: PER, photos: F('kick'),
    name: ['Schop- en duwplaten', 'Kick and push plates', 'Blachy ochronne kick i push'],
    desc: [
      'RVS-platen die de deur beschermen op drukke plekken. Leverbaar met ventilatieopeningen.',
      'Stainless steel plates that protect the door in busy places. Available with ventilation openings.',
      'Blachy ze stali nierdzewnej chroniące skrzydło w miejscach o dużym ruchu. Także z otworami wentylacyjnymi.',
    ],
  }),
];
