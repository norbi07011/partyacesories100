/* Order forms per product type.
 *
 * Every made-to-measure product asks exactly for what a joinery factory needs to price it:
 * sizes in millimetres, the layout seen from the inside, colours that exist for that material
 * and the options that belong to that product. The same answers are written twice — as a short
 * line for the customer's quote list and as a Polish price request for the manufacturer. */

export type Opt = { id: string; nl: string; pl: string; hex?: string };
export type Num = { id: string; nl: string; pl: string; ph: string; min: number; max: number; unit?: string; optional?: boolean };
export type Field =
  | { id: string; type: 'one' | 'many'; nl: string; pl: string; step?: string; options: Opt[] }
  | { id: string; type: 'coats'; nl: string; pl: string; step?: string }
  | { id: string; type: 'panes'; nl: string; pl: string; step?: string; counts: number[]; options: Opt[] };
export type Form = { id: string; nums: Num[]; hint: string; fields: Field[]; draw: 'panes' | 'box' | 'none' };
export type Spec = { form: string; nums: Record<string, string>; panes: string[]; vals: Record<string, string | string[]>; note: string; model?: string };
type Item = { id: string; cat: string; group: string; brand: string; name: string; coats?: string[] };

const o = (id: string, nl: string, pl: string, hex?: string): Opt => ({ id, nl, pl, hex });
const UNSURE = o('advies', 'Weet ik nog niet', 'do ustalenia', 'transparent');

/* ── colours per material ── */
const PVC = [o('wit', 'Wit', 'biały', '#f4f4f1'), o('creme', 'Crème', 'kremowy', '#ece3cf'), o('7016', 'Antraciet', 'antracyt (okleina, RAL 7016)', '#383e42'), o('zwart', 'Zwart', 'czarny (okleina)', '#141416'), o('grijs', 'Grijs', 'szary (okleina)', '#8a8f93'), o('eiken', 'Gouden eik', 'złoty dąb', '#b47a3c'), o('noten', 'Noten', 'orzech', '#5b3a24'), UNSURE];
const ALU = [o('9016', 'Wit RAL 9016', 'biały RAL 9016', '#f4f4f1'), o('7016', 'Antraciet RAL 7016', 'antracyt RAL 7016', '#383e42'), o('9005', 'Zwart RAL 9005', 'czarny RAL 9005', '#0e0e10'), o('7021', 'Zwartgrijs RAL 7021', 'RAL 7021', '#2e3234'), o('7039', 'Kwartsgrijs RAL 7039', 'RAL 7039', '#6c6960'), o('9007', 'Grijs aluminium RAL 9007', 'RAL 9007', '#8f8f8c'), o('hout', 'Houtdecor', 'okleina drewnopodobna', '#8a5a33'), o('ral', 'Andere RAL-kleur', 'inny RAL (do ustalenia)', 'transparent'), UNSURE];
const WOODFIN = [o('wit', 'Dekkend wit', 'kryjący biały RAL 9016', '#f4f4f1'), o('creme', 'Dekkend crème', 'kryjący RAL 9001', '#ece3cf'), o('7016', 'Dekkend antraciet', 'kryjący RAL 7016', '#383e42'), o('groen', 'Dekkend groen', 'kryjący zielony RAL 6009', '#27352a'), o('teak', 'Lazuur teak', 'lazura teak', '#a8622c'), o('noten', 'Lazuur noten', 'lazura orzech', '#5b3a24'), o('eiken', 'Lazuur eiken', 'lazura dąb', '#b98b4e'), o('blank', 'Blanke lak', 'lakier bezbarwny', '#e6c998'), o('ral', 'Andere RAL-kleur', 'inny RAL (do ustalenia)', 'transparent'), UNSURE];
const STEEL = [o('9005', 'Zwart structuur', 'czarny RAL 9005 struktura', '#0e0e10'), o('7016', 'Antraciet', 'antracyt RAL 7016', '#383e42'), o('9016', 'Wit', 'biały RAL 9016', '#f4f4f1'), o('ral', 'Andere RAL-kleur', 'inny RAL (do ustalenia)', 'transparent'), UNSURE];
const SHADE = [o('wit', 'Wit', 'biały', '#f4f4f1'), o('creme', 'Crème', 'kremowy', '#ece3cf'), o('zilver', 'Zilver', 'srebrny', '#b9bcbd'), o('7016', 'Antraciet', 'antracyt RAL 7016', '#383e42'), o('zwart', 'Zwart', 'czarny', '#0e0e10'), o('bruin', 'Bruin', 'brązowy', '#4a3528'), UNSURE];
const WOODS = [o('grenen', 'Grenen', 'sosna'), o('vuren', 'Vuren', 'świerk'), o('eiken', 'Eiken', 'dąb'), o('meranti', 'Meranti', 'meranti'), UNSURE];
type Mat = 'pvc' | 'alu' | 'hout' | 'staal';
const PAL: Record<Mat, Opt[]> = { pvc: PVC, alu: ALU, hout: WOODFIN, staal: STEEL };

/* ── building blocks ── */
const W = (min = 300, max = 7000, ph = '1200'): Num => ({ id: 'w', nl: 'Breedte in mm', pl: 'szerokość', ph, min, max });
const H = (min = 300, max = 3500, ph = '1400'): Num => ({ id: 'h', nl: 'Hoogte in mm', pl: 'wysokość', ph, min, max });
const HINT_FRAME = 'Meet de hele opening, van muur tot muur. Niet zeker? Vul een schatting in — wij komen gratis nameten.';
const colours = (mat: Mat): Field[] => [
  ...(mat === 'hout' ? [{ id: 'houtsoort', type: 'one', nl: 'Houtsoort', pl: 'gatunek drewna', step: 'Hout en kleur', options: WOODS } as Field] : []),
  { id: 'buiten', type: 'one', nl: 'Kleur buitenkant', pl: 'kolor zewnątrz', step: mat === 'hout' ? undefined : 'Welke kleur?', options: PAL[mat] },
  { id: 'binnen', type: 'one', nl: 'Kleur binnenkant', pl: 'kolor wewnątrz', options: PAL[mat] },
];
const GLASS: Field = { id: 'glas', type: 'one', nl: 'Glas', pl: 'szklenie', step: 'Glas en extra’s', options: [o('dubbel', 'HR++ dubbel glas', 'pakiet 2-szybowy'), o('triple', 'Triple glas', 'pakiet 3-szybowy'), UNSURE] };
const extras = (list: Opt[], step?: string): Field => ({ id: 'extras', type: 'many', nl: 'Extra’s', pl: 'dodatki', step, options: list });
const X = {
  rooster: o('rooster', 'Ventilatierooster', 'nawiewnik'), hor: o('hor', 'Hor', 'moskitiera'), rolluik: o('rolluik', 'Rolluik', 'roleta zewnętrzna'), bank: o('vensterbank', 'Vensterbank', 'parapet'),
  roedes: o('roedes', 'Roedes in het glas', 'szprosy'), rc2: o('rc2', 'Inbraakwerend (RC2)', 'okucia antywłamaniowe RC2'), geluid: o('geluid', 'Geluidwerend glas', 'szkło akustyczne'), veilig: o('veiligglas', 'Veiligheidsglas', 'szkło bezpieczne'),
  mat: o('mat', 'Matglas', 'szkło matowe'), dorpel: o('lagedorpel', 'Lage dorpel (drempelloos)', 'niski próg / bezprogowo'), softclose: o('softclose', 'Soft-close', 'domykacz soft-close'),
  screen: o('screens', 'Screens / zonwering', 'screeny'), brief: o('brievenbus', 'Brievenbus', 'wrzutnia na listy'), spion: o('spion', 'Deurspion', 'wizjer'),
};
const DK = [o('dkL', 'Draai-kiep, scharnieren links', 'rozwierno-uchylne, zawiasy z lewej'), o('dkR', 'Draai-kiep, scharnieren rechts', 'rozwierno-uchylne, zawiasy z prawej'), o('kiep', 'Kiep', 'uchylne'), o('vast', 'Vast glas', 'stałe (fix)')];
const OUTW = [o('uitL', 'Naar buiten draaiend, scharnieren links', 'otwierane na zewnątrz, zawiasy z lewej'), o('uitR', 'Naar buiten draaiend, scharnieren rechts', 'otwierane na zewnątrz, zawiasy z prawej'), o('uitzet', 'Uitzetraam (klepraam)', 'odchylane na zewnątrz (górne zawiasy)'), o('vast', 'Vast glas', 'stałe (fix)')];
const SASH = [o('hef', 'Verticaal schuivend', 'przesuwne w pionie'), o('vast', 'Vast glas', 'stałe (fix)')];
const SLIDE = [o('schuif', 'Schuivend', 'przesuwne'), o('vast', 'Vast glas', 'stałe (fix)')];
const TILTSLIDE = [o('kiepschuif', 'Kiep-schuivend', 'uchylno-przesuwne (PSK)'), o('vast', 'Vast glas', 'stałe (fix)')];
const panes = (options: Opt[], counts = [1, 2, 3, 4]): Field => ({ id: 'panes', type: 'panes', nl: 'Aantal vakken', pl: 'podział', step: 'Hoe gaat het open?', counts, options });
const HINGE: Field = { id: 'scharnier', type: 'one', nl: 'Scharnieren (van binnen gezien)', pl: 'zawiasy (widok od wewnątrz)', step: 'Hoe gaat het open?', options: [o('L', 'Links', 'z lewej'), o('R', 'Rechts', 'z prawej')] };
const SWING: Field = { id: 'draait', type: 'one', nl: 'Draait', pl: 'kierunek otwierania', options: [o('binnen', 'Naar binnen', 'do wewnątrz'), o('buiten', 'Naar buiten', 'na zewnątrz')] };
const MOTOR = [o('zender', 'Motor met afstandsbediening', 'silnik + pilot'), o('schakelaar', 'Motor met schakelaar', 'silnik + przełącznik'), o('smart', 'Motor met app / smart home', 'silnik + sterowanie smart home'), o('hand', 'Handbediend', 'ręczne')];
const SIDE: Field = { id: 'zijde', type: 'one', nl: 'Bediening aan de', pl: 'strona sterowania (widok od wewnątrz)', options: [o('L', 'Linkerkant', 'lewa'), o('R', 'Rechterkant', 'prawa')] };

const FORMS: Record<string, Form> = {};
const def = (f: Form) => { FORMS[f.id] = f; return f.id; };

(['pvc', 'alu', 'hout', 'staal'] as Mat[]).forEach((m) => {
  const winX = extras([X.rooster, X.hor, X.rolluik, X.bank, X.roedes, X.rc2, X.geluid, X.veilig, X.mat]);
  def({ id: `raam-${m}`, nums: [W(), H()], hint: HINT_FRAME, draw: 'panes', fields: [panes(DK), ...colours(m), GLASS, winX] });
  def({ id: `raam-uit-${m}`, nums: [W(), H()], hint: HINT_FRAME, draw: 'panes', fields: [panes(OUTW), ...colours(m), GLASS, winX] });
  def({ id: `schuif-${m}`, nums: [W(1200, 12000, '3000'), H(1500, 3500, '2300')], hint: HINT_FRAME, draw: 'panes', fields: [panes(SLIDE, [2, 3, 4]), ...colours(m), GLASS, extras([X.dorpel, X.hor, X.screen, X.rc2, X.softclose, X.veilig])] });
  def({ id: `kiepschuif-${m}`, nums: [W(1200, 5000, '2400'), H(1500, 2700, '2300')], hint: HINT_FRAME, draw: 'panes', fields: [panes(TILTSLIDE, [2, 3, 4]), ...colours(m), GLASS, extras([X.hor, X.screen, X.rc2, X.veilig])] });
  def({ id: `vouw-${m}`, nums: [W(1500, 8000, '3200'), H(1800, 3000, '2300')], hint: HINT_FRAME, draw: 'box', fields: [
    { id: 'vleugels', type: 'one', nl: 'Aantal vleugels', pl: 'liczba skrzydeł', step: 'Hoe gaat het open?', options: ['2', '3', '4', '5', '6', '7'].map((n) => o(n, n, n)) },
    { id: 'vouwt', type: 'one', nl: 'Vouwt naar', pl: 'składanie', options: [o('L', 'Links', 'w lewo'), o('R', 'Rechts', 'w prawo'), o('beide', 'Beide kanten', 'na obie strony')] },
    SWING, ...colours(m), GLASS, extras([X.dorpel, X.hor, X.rc2, X.veilig])] });
  def({ id: `deur-${m}`, nums: [W(700, 3500, '1000'), H(1800, 3000, '2150')], hint: 'Meet de hele opening inclusief zijlicht en bovenlicht. Niet zeker? Vul een schatting in — wij komen gratis nameten.', draw: 'box', fields: [
    HINGE, SWING,
    { id: 'zijlicht', type: 'one', nl: 'Zijlicht', pl: 'doświetle boczne', options: [o('geen', 'Geen', 'brak'), o('L', 'Links', 'z lewej'), o('R', 'Rechts', 'z prawej'), o('beide', 'Beide kanten', 'z obu stron')] },
    { id: 'bovenlicht', type: 'one', nl: 'Bovenlicht', pl: 'naświetle górne', options: [o('nee', 'Nee', 'brak'), o('ja', 'Ja', 'tak')] },
    ...colours(m),
    { id: 'greep', type: 'one', nl: 'Greep buiten', pl: 'pochwyt / klamka', step: 'Greep, slot en extra’s', options: [o('stang', 'Greepstang', 'pochwyt (antaba)'), o('kruk', 'Deurkruk', 'klamka'), o('knop', 'Vaste knop', 'gałka'), UNSURE] },
    { id: 'slot', type: 'one', nl: 'Slot', pl: 'zamek', options: [o('meerpunt', 'Meerpuntssluiting met sleutel', 'zamek wielopunktowy na klucz'), o('auto', 'Automatisch vergrendelend', 'zamek automatyczny'), o('vinger', 'Elektrisch met vingerscan of code', 'elektrozamek + czytnik linii papilarnych / klawiatura'), UNSURE] },
    extras([X.rc2, X.dorpel, X.brief, X.spion, X.hor, X.veilig])] });
});
def({ id: 'hefraam', nums: [W(400, 2500, '900'), H(800, 3000, '1600')], hint: HINT_FRAME, draw: 'panes', fields: [panes(SASH, [2]), ...colours('alu'), GLASS, extras([X.hor, X.roedes, X.veilig])] });
def({ id: 'vormraam', nums: [W(300, 4000, '1200'), H(300, 3500, '1400')], hint: 'Geef de grootste breedte en de grootste hoogte op. Een schets of foto sturen kan daarna via WhatsApp.', draw: 'box', fields: [
  { id: 'vorm', type: 'one', nl: 'Vorm', pl: 'kształt', step: 'Welke vorm?', options: [o('boog', 'Boog', 'łuk'), o('driehoek', 'Driehoek', 'trójkąt'), o('trapezium', 'Trapezium', 'trapez'), o('rond', 'Rond', 'okrągłe')] },
  { id: 'open', type: 'one', nl: 'Moet het open kunnen?', pl: 'otwieranie', options: [o('vast', 'Nee, vast glas', 'stałe (fix)'), o('open', 'Ja', 'otwierane (do ustalenia)')] },
  ...colours('hout'), GLASS] });
def({ id: 'binnenschuif', nums: [{ id: 'w', nl: 'Deurbreedte in mm', pl: 'szerokość skrzydła', ph: '880', min: 500, max: 1300 }, { id: 'h', nl: 'Deurhoogte in mm', pl: 'wysokość skrzydła', ph: '2115', min: 1800, max: 2700 }], hint: 'Vul de maat van de deur in. Heb je alleen de maat van de opening? Zet dat erbij onderaan.', draw: 'box', fields: [
  { id: 'aantal', type: 'one', nl: 'Enkel of dubbel', pl: 'liczba skrzydeł', step: 'Hoe schuift de deur?', options: [o('1', 'Eén deur', '1 skrzydło'), o('2', 'Twee deuren', '2 skrzydła')] },
  { id: 'richting', type: 'one', nl: 'Schuift naar', pl: 'kierunek przesuwu', options: [o('L', 'Links', 'w lewo'), o('R', 'Rechts', 'w prawo'), o('beide', 'Beide kanten', 'na obie strony')] },
  { id: 'systeem', type: 'one', nl: 'Uitvoering', pl: 'system', options: [o('standaard', 'Rail achter een koof', 'system naścienny z maskownicą'), o('loft', 'Zichtbare rail (loft)', 'system loft'), o('magic', 'Onzichtbare geleiding', 'system Magic'), o('wand', 'In de wand', 'kaseta w ścianie'), UNSURE] },
  extras([X.softclose, o('slot', 'Haakslot met sleutel', 'zamek hakowy na klucz'), o('komgreep', 'Komgrepen', 'uchwyty wpuszczane')], 'Extra’s')] });
def({ id: 'binnendeur', nums: [{ id: 'w', nl: 'Deurbreedte in mm', pl: 'szerokość skrzydła', ph: '880', min: 500, max: 1300 }, { id: 'h', nl: 'Deurhoogte in mm', pl: 'wysokość skrzydła', ph: '2115', min: 1800, max: 2700 }, { id: 'wand', nl: 'Wanddikte in mm (voor het kozijn)', pl: 'grubość muru', ph: '100', min: 60, max: 500, optional: true }], hint: 'Meet je huidige deur op: breedte en hoogte van het deurblad. Meest voorkomend in Nederland: 830, 880 of 930 breed en 2015, 2115 of 2315 hoog.', draw: 'box', fields: [
  { id: 'uitvoering', type: 'one', nl: 'Uitvoering', pl: 'wykonanie', step: 'Welke deur?', options: [o('opdek', 'Opdek (deur valt over het kozijn)', 'przylgowe'), o('stomp', 'Stomp (deur valt in het kozijn)', 'bezprzylgowe'), UNSURE] },
  { ...HINGE, step: undefined }, { id: 'decor', type: 'coats', nl: 'Decor / kleur', pl: 'dekor' },
  { id: 'slot', type: 'one', nl: 'Slot', pl: 'zamek', step: 'Slot, kozijn en extra’s', options: [o('loop', 'Loopslot (zonder sleutel)', 'zamek bez klucza'), o('sleutel', 'Dag- en nachtslot met sleutel', 'zamek na klucz'), o('wc', 'Toilet- / badkamerslot', 'blokada WC'), o('cilinder', 'Cilinderslot', 'zamek na wkładkę')] },
  { id: 'kozijn', type: 'one', nl: 'Kozijn erbij?', pl: 'ościeżnica', options: [o('geen', 'Nee, bestaand kozijn blijft', 'bez ościeżnicy'), o('verstelbaar', 'Ja, verstelbaar kozijn', 'ościeżnica regulowana'), o('vast', 'Ja, vast kozijn', 'ościeżnica stała')] },
  extras([o('rooster', 'Ventilatierooster of onderkier', 'podcięcie / tuleje wentylacyjne'), o('valdorpel', 'Valdorpel', 'uszczelka opadająca'), o('zwartbeslag', 'Zwart beslag', 'okucia czarne'), X.mat])] });
def({ id: 'staalbinnen', nums: [W(500, 3000, '900'), H(1800, 3000, '2300')], hint: HINT_FRAME, draw: 'box', fields: [
  { id: 'type', type: 'one', nl: 'Type', pl: 'typ', step: 'Welke deur?', options: [o('draai', 'Draaideur', 'rozwierne'), o('taats', 'Taatsdeur', 'pivot'), o('dubbel', 'Dubbele deur', 'dwuskrzydłowe'), o('vast', 'Vaste wand', 'ścianka stała')] },
  { ...HINGE, step: undefined },
  { id: 'kleur', type: 'one', nl: 'Kleur staal', pl: 'kolor', options: STEEL },
  { id: 'glas', type: 'one', nl: 'Glas', pl: 'szkło', options: [o('helder', 'Helder', 'przezroczyste'), o('mat', 'Mat', 'matowe'), o('rook', 'Rookglas', 'grafitowe'), o('draad', 'Draadglas-look', 'zbrojone (wzór)')] },
  { id: 'verdeling', type: 'one', nl: 'Roedeverdeling', pl: 'podział szprosami', options: [o('geen', 'Geen', 'brak'), o('3', '3 vlakken', '3 pola'), o('4', '4 vlakken', '4 pola'), o('6', '6 vlakken', '6 pól'), UNSURE] }] });
def({ id: 'kozijn', nums: [{ id: 'w', nl: 'Deurbreedte in mm', pl: 'szerokość skrzydła', ph: '880', min: 500, max: 2100 }, { id: 'h', nl: 'Deurhoogte in mm', pl: 'wysokość skrzydła', ph: '2115', min: 1800, max: 2700 }, { id: 'wand', nl: 'Wanddikte in mm', pl: 'grubość muru', ph: '100', min: 60, max: 500 }], hint: 'De wanddikte meet je inclusief stucwerk of tegels, op drie plekken. Geef de grootste maat op.', draw: 'none', fields: [
  { id: 'type', type: 'one', nl: 'Type kozijn', pl: 'typ ościeżnicy', step: 'Welk kozijn?', options: [o('verstelbaar', 'Verstelbaar', 'regulowana'), o('vast', 'Vast', 'stała'), o('tunnel', 'Tunnelkozijn (zonder deur)', 'tunel'), UNSURE] },
  { id: 'voor', type: 'one', nl: 'Voor een', pl: 'do drzwi', options: [o('opdek', 'Opdekdeur', 'przylgowych'), o('stomp', 'Stompe deur', 'bezprzylgowych'), o('dubbel', 'Dubbele deur', 'dwuskrzydłowych')] }] });
def({ id: 'rolluik', nums: [W(400, 5000, '1200'), H(400, 3500, '1400')], hint: 'Meet het raam of de deur waar het rolluik voor komt, van buiten.', draw: 'box', fields: [
  { id: 'bediening', type: 'one', nl: 'Bediening', pl: 'sterowanie', step: 'Hoe wil je het bedienen?', options: MOTOR }, SIDE,
  { id: 'kast', type: 'one', nl: 'Kleur kast en geleiders', pl: 'kolor skrzynki i prowadnic', step: 'Welke kleur?', options: SHADE },
  { id: 'pantser', type: 'one', nl: 'Kleur lamellen of doek', pl: 'kolor pancerza / tkaniny', options: SHADE },
  extras([o('hor', 'Geïntegreerde hor', 'zintegrowana moskitiera'), o('sensor', 'Zon- en windsensor', 'czujnik słońca i wiatru'), o('inbraak', 'Inbraakwerende uitvoering', 'wersja antywłamaniowa')], 'Extra’s')] });
def({ id: 'binnenzon', nums: [W(200, 3000, '900'), H(200, 3000, '1300')], hint: 'Meet het glas, zonder de glaslatten.', draw: 'box', fields: [
  { id: 'bediening', type: 'one', nl: 'Bediening', pl: 'sterowanie', step: 'Bediening en kleur', options: [o('koord', 'Koord of greep', 'sznurek / uchwyt'), o('ketting', 'Ketting', 'łańcuszek'), o('motor', 'Motor', 'silnik')] },
  { id: 'licht', type: 'one', nl: 'Stof', pl: 'tkanina', options: [o('licht', 'Lichtdoorlatend', 'przepuszczająca światło'), o('verduister', 'Verduisterend', 'zaciemniająca'), UNSURE] }] });
def({ id: 'hor', nums: [W(300, 3000, '900'), H(300, 2800, '1300')], hint: 'Meet de opening van het kozijn waar de hor in of op komt.', draw: 'box', fields: [
  { id: 'kleur', type: 'one', nl: 'Kleur frame', pl: 'kolor ramki', step: 'Kleur en gaas', options: SHADE },
  { id: 'gaas', type: 'one', nl: 'Gaas', pl: 'siatka', options: [o('standaard', 'Standaard', 'standardowa'), o('pollen', 'Pollengaas', 'antyalergiczna'), o('huisdier', 'Huisdierbestendig', 'wzmocniona (dla zwierząt)'), o('fijn', 'Extra fijn', 'gęsta')] },
  { id: 'montage', type: 'one', nl: 'Montage', pl: 'montaż', options: [o('dag', 'In de opening', 'we wnęce'), o('kozijn', 'Op het kozijn', 'na ramie'), UNSURE] }] });
def({ id: 'luik', nums: [W(300, 3000, '1000'), H(400, 3000, '1400')], hint: 'Meet het raam waar de luiken bij komen.', draw: 'box', fields: [
  { id: 'aantal', type: 'one', nl: 'Aantal luiken', pl: 'liczba skrzydeł', step: 'Welke luiken?', options: [o('1', '1', '1'), o('2', '2', '2'), o('4', '4 (vouwend)', '4 (łamane)')] },
  { id: 'vulling', type: 'one', nl: 'Vulling', pl: 'wypełnienie', options: [o('vast', 'Vaste lamellen', 'lamele stałe'), o('verstelbaar', 'Verstelbare lamellen', 'lamele ruchome'), o('dicht', 'Dicht paneel', 'panel pełny')] },
  { id: 'werking', type: 'one', nl: 'Werking', pl: 'sposób otwierania', options: [o('draai', 'Draaiend', 'rozwierne'), o('schuif', 'Schuivend', 'przesuwne')] },
  { id: 'kleur', type: 'one', nl: 'Kleur', pl: 'kolor', options: SHADE }] });
def({ id: 'garage', nums: [{ id: 'w', nl: 'Breedte opening in mm', pl: 'szerokość otworu', ph: '2500', min: 1800, max: 7000 }, { id: 'h', nl: 'Hoogte opening in mm', pl: 'wysokość otworu', ph: '2125', min: 1700, max: 3500 }, { id: 'latei', nl: 'Ruimte boven de opening in mm', pl: 'nadproże', ph: '250', min: 0, max: 2000 }, { id: 'diepte', nl: 'Diepte garage in mm', pl: 'głębokość garażu', ph: '5500', min: 2000, max: 20000, optional: true }], hint: 'Meet de opening van binnen. De ruimte boven de opening bepaalt welk veersysteem past.', draw: 'box', fields: [
  { id: 'paneel', type: 'one', nl: 'Paneel', pl: 'przetłoczenie', step: 'Hoe ziet de deur eruit?', options: [o('vlak', 'Vlak', 'bez przetłoczeń'), o('lamel', 'Horizontale lijnen', 'przetłoczenia poziome'), o('cassette', 'Cassettes', 'kasetony'), UNSURE] },
  { id: 'kleur', type: 'one', nl: 'Kleur', pl: 'kolor', options: ALU },
  { id: 'aandrijving', type: 'one', nl: 'Bediening', pl: 'napęd', step: 'Bediening en extra’s', options: [o('motor', 'Motor met handzenders', 'napęd + piloty'), o('smart', 'Motor met app', 'napęd + sterowanie z aplikacji'), o('hand', 'Handbediend', 'ręczna')] },
  extras([o('loopdeur', 'Loopdeur in de garagedeur', 'drzwi serwisowe'), o('ramen', 'Raampjes', 'przeszklenia'), o('nood', 'Noodontgrendeling van buiten', 'awaryjne odblokowanie z zewnątrz'), o('foto', 'Fotocellen', 'fotokomórki')])] });
def({ id: 'garagedraai', nums: [W(1800, 5000, '2500'), H(1700, 3000, '2125')], hint: 'Meet de opening van muur tot muur en van vloer tot latei.', draw: 'box', fields: [
  { id: 'verdeling', type: 'one', nl: 'Verdeling', pl: 'podział skrzydeł', step: 'Hoe gaat het open?', options: [o('sym', 'Twee gelijke deuren', 'symetryczny'), o('asym', 'Smalle loopdeur + brede deur', 'asymetryczny')] },
  { ...SWING, options: [o('buiten', 'Naar buiten', 'na zewnątrz'), o('binnen', 'Naar binnen', 'do wewnątrz')] },
  { id: 'isolatie', type: 'one', nl: 'Isolatie', pl: 'izolacja', options: [o('warm', 'Geïsoleerd', 'profil ciepły (Unico)'), o('koud', 'Ongeïsoleerd', 'profil zimny (Presto)')] },
  { id: 'kleur', type: 'one', nl: 'Kleur', pl: 'kolor', options: STEEL },
  extras([o('ramen', 'Raampjes', 'przeszklenia'), X.rc2])] });
def({ id: 'hek', nums: [{ id: 'lengte', nl: 'Totale lengte in meters', pl: 'długość całkowita', ph: '18', min: 1, max: 500, unit: 'm' }, { id: 'h', nl: 'Hoogte in mm', pl: 'wysokość', ph: '1500', min: 600, max: 2500 }, { id: 'poort', nl: 'Breedte poort in mm', pl: 'szerokość bramy', ph: '4000', min: 800, max: 8000, optional: true }], hint: 'Loop de erfgrens na en tel alle stukken bij elkaar op. Een tekening sturen kan daarna via WhatsApp.', draw: 'none', fields: [
  { id: 'poorttype', type: 'one', nl: 'Poort', pl: 'brama', step: 'Poort en kleur', options: [o('geen', 'Geen poort', 'bez bramy'), o('schuif', 'Schuifpoort', 'przesuwna'), o('draai2', 'Dubbele draaipoort', 'dwuskrzydłowa'), o('draai1', 'Enkele draaipoort', 'jednoskrzydłowa')] },
  { id: 'loopdeur', type: 'one', nl: 'Looppoortje', pl: 'furtka', options: [o('ja', 'Ja', 'tak'), o('nee', 'Nee', 'nie')] },
  { id: 'kleur', type: 'one', nl: 'Kleur', pl: 'kolor', options: ALU },
  extras([o('motor', 'Poortaandrijving', 'napęd bramy'), o('intercom', 'Intercom met camera', 'wideodomofon'), o('brievenbus', 'Brievenbus', 'skrzynka na listy'), o('licht', 'Verlichting', 'oświetlenie')])] });
def({ id: 'pergola', nums: [{ id: 'w', nl: 'Breedte in mm', pl: 'szerokość', ph: '4000', min: 1500, max: 12000 }, { id: 'diepte', nl: 'Diepte in mm', pl: 'wysięg', ph: '3500', min: 1500, max: 8000 }, { id: 'h', nl: 'Doorloophoogte in mm', pl: 'wysokość przejścia', ph: '2400', min: 2000, max: 3200 }], hint: 'Breedte is langs de gevel, diepte is hoe ver de pergola de tuin in komt.', draw: 'none', fields: [
  { id: 'montage', type: 'one', nl: 'Plaatsing', pl: 'montaż', step: 'Plaatsing en kleur', options: [o('gevel', 'Tegen de gevel', 'przyścienna'), o('vrij', 'Vrijstaand', 'wolnostojąca')] },
  { id: 'kleur', type: 'one', nl: 'Kleur', pl: 'kolor', options: ALU },
  extras([o('screens', 'Zip-screens rondom', 'screeny zip'), o('glas', 'Glazen schuifwanden', 'szklane ściany przesuwne'), o('led', 'Ledverlichting', 'oświetlenie LED'), o('heater', 'Verwarming', 'promienniki'), o('regen', 'Regen- en windsensor', 'czujnik deszczu i wiatru')], 'Extra’s')] });

// wood with aluminium cladding: aluminium colours outside, wood finishes inside
const woodAlu = (base: string, id: string) => {
  const f = FORMS[base];
  def({ ...f, id, fields: f.fields.map((x) => (x.id === 'buiten' && x.type === 'one' ? { ...x, nl: 'Kleur aluminium buitenkant', pl: 'kolor nakładki aluminiowej (zewnątrz)', options: ALU } : x.id === 'binnen' && x.type === 'one' ? { ...x, nl: 'Afwerking hout binnenkant', pl: 'wykończenie drewna (wewnątrz)' } : x)) });
};
woodAlu('raam-hout', 'raam-houtalu'); woodAlu('schuif-hout', 'schuif-houtalu');
// fire-rated doors also need the fire class
def({ ...FORMS['deur-alu'], id: 'deur-ei', fields: [{ id: 'ei', type: 'one', nl: 'Brandwerendheid', pl: 'klasa odporności ogniowej', step: 'Brandwerendheid', options: [o('ei30', '30 minuten (EI30)', 'EI30'), o('ei60', '60 minuten (EI60)', 'EI60'), UNSURE] }, ...FORMS['deur-alu'].fields] });
def({ id: 'glasdeur', nums: FORMS.binnendeur.nums.slice(0, 2), hint: FORMS.binnendeur.hint, draw: 'box', fields: [
  { ...HINGE, step: 'Welke deur?' },
  { id: 'glas', type: 'one', nl: 'Glas', pl: 'szkło', options: [o('helder', 'Helder', 'przezroczyste'), o('mat', 'Mat', 'matowe'), o('grafiet', 'Grafiet', 'grafitowe'), o('decor', 'Met decor (zie gekozen model)', 'z dekorem (wg wybranego wzoru)')] },
  { id: 'beslag', type: 'one', nl: 'Kleur beslag', pl: 'kolor okuć', options: [o('alu', 'Aluminium', 'aluminium'), o('zwart', 'Zwart', 'czarny')] },
  { id: 'kozijn', type: 'one', nl: 'Kozijn erbij?', pl: 'ościeżnica', options: [o('geen', 'Nee', 'bez ościeżnicy'), o('ja', 'Ja, kozijn voor glazen deur', 'ościeżnica do drzwi szklanych')] }] });

/** Which order form belongs to a catalogue item; null = nothing to size. */
export const formFor = (it: Item): Form | null => {
  if (it.brand !== 'Eko-Okna') return null;
  const id = it.id; const g = it.group;
  const mat: Mat = /kunststof/.test(g) ? 'pvc' : /hout/.test(g) ? 'hout' : /staal/.test(g) ? 'staal' : 'alu';
  const F = (k: string) => FORMS[k] ?? null;
  if (/kleur|profielen|consoles|exclusive|aio-|zijpanelen|sierrooster|kronen|decors|deur-opties|inlegpanelen/.test(id)) return null;
  if (it.cat === 'ramen') {
    if (!/^Ramen · (kunststof|aluminium|hout|staal)/.test(g)) return null;
    if (id === 'eko-modelramen') return F('vormraam');
    if (id === 'eko-vs-600') return F('hefraam');
    if (/casement|nordline/.test(id)) return F(`raam-uit-${mat}`);
    if (mat === 'hout' && /-alu/.test(id)) return F('raam-houtalu');
    return F(`raam-${mat}`);
  }
  if (it.cat === 'schuif') {
    if (/binnendeuren/.test(g)) return F('binnenschuif');
    if (/fold|bifold|harmonica|vouw|panorama/.test(id)) return F(`vouw-${mat}`);
    if (id === 'eko-patio') return F(`kiepschuif-${mat}`);
    if (mat === 'hout' && /-alu/.test(id)) return F('schuif-houtalu');
    return F(`schuif-${mat}`);
  }
  if (it.cat === 'buiten') return !/^Buitendeuren/.test(g) ? null : /-ei(-|$)/.test(id) ? F('deur-ei') : F(`deur-${/EkoGreen/.test(g) ? 'pvc' : mat}`);
  if (it.cat === 'technisch') return /akoestisch/.test(g) ? F('binnendeur') : F('deur-ei');
  if (it.cat === 'binnen') return /staal/.test(g) ? F('staalbinnen') : id === 'eko-deur-graf' ? F('glasdeur') : F('binnendeur');
  if (it.cat === 'kozijn') return F('kozijn');
  if (it.cat === 'garage') return /Hekwerk/.test(g) ? F('hek') : /Openslaande/.test(g) ? F('garagedraai') : F('garage');
  if (it.cat === 'zonwering') {
    if (/Rolluiken|Geveljaloezie/.test(g)) return F('rolluik');
    if (/Binnenzonwering/.test(g)) return F('binnenzon');
    if (/Hor/i.test(g)) return F('hor');
    if (/Shutters/.test(g)) return F('luik');
    if (/Pergola/.test(g)) return F('pergola');
  }
  return null;
};

export const formById = (id: string): Form | null => FORMS[id] ?? null;

export const emptySpec = (f: Form): Spec => {
  const vals: Spec['vals'] = {}; let panes: string[] = [];
  f.fields.forEach((x) => {
    if (x.type === 'panes') panes = Array.from({ length: x.counts[0] }, (_, i) => (i === 0 ? x.options[x.options.length > 2 ? 1 : 0].id : x.options[x.options.length - 1].id));
    else if (x.type === 'many') vals[x.id] = [];
    else vals[x.id] = '';
  });
  return { form: f.id, nums: {}, panes, vals, note: '' };
};

/** ids of everything that still has to be filled in */
export const missing = (f: Form, s: Spec): string[] => {
  const out: string[] = [];
  f.nums.forEach((n) => { const v = Number(s.nums[n.id]); if (!(n.optional && !s.nums[n.id]) && !(v >= n.min && v <= n.max)) out.push(n.id); });
  f.fields.forEach((x) => { if ((x.type === 'one') && !s.vals[x.id]) out.push(x.id); });
  return out;
};

const pick = (list: Opt[], id: string, key: 'nl' | 'pl') => list.find((x) => x.id === id)?.[key] ?? id;
const lines = (f: Form, s: Spec, key: 'nl' | 'pl'): string[] => {
  const out: string[] = [];
  const size = f.nums.filter((n) => s.nums[n.id]).map((n) => `${n[key].replace(/ in mm| in meters/, '')} ${s.nums[n.id]} ${n.unit ?? 'mm'}`);
  out.push(key === 'pl' ? `Wymiary: ${size.join(', ')}` : size.join(', '));
  f.fields.forEach((x) => {
    if (x.type === 'panes') out.push(`${key === 'pl' ? `Podział: ${s.panes.length} ${s.panes.length === 1 ? 'kwatera' : 'kwatery'}, od lewej (widok od wewnątrz)` : `${s.panes.length} ${s.panes.length === 1 ? 'vak' : 'vakken'}`}: ${s.panes.map((p, i) => `[${i + 1}] ${pick(x.options, p, key)}`).join('; ')}`);
    else if (x.type === 'many') { const v = (s.vals[x.id] as string[]) ?? []; if (v.length) out.push(`${x[key]}: ${v.map((e) => pick(x.options, e, key)).join(', ')}`); }
    else if (x.type === 'coats') { if (s.vals[x.id]) out.push(`${x[key]}: ${s.vals[x.id]}`); }
    else if (s.vals[x.id]) out.push(`${x[key]}: ${pick(x.options, s.vals[x.id] as string, key)}`);
  });
  if (s.note.trim()) out.push(`${key === 'pl' ? 'Uwagi klienta' : 'Opmerking'}: ${s.note.trim()}`);
  return out.map((l) => l.charAt(0).toUpperCase() + l.slice(1));
};

/** One line for the customer's quote list. */
export const specText = (s: Spec): string => { const f = FORMS[s.form]; return f ? lines(f, s, 'nl').join(' · ') : ''; };
/** The same position the way it goes to the factory (Polish). */
export const specFactory = (s: Spec): string[] => { const f = FORMS[s.form]; return f ? [...(s.model ? [`Model / wzór: ${s.model}`] : []), ...lines(f, s, 'pl')] : []; };
