import type { L } from './i18n';

/* What the factory needs to price a made-to-measure window, sliding door or front door.
 * All sizes in millimetres, outer frame size, seen from the inside — the convention joinery
 * factories work with. */

export type SpecKind = 'raam' | 'schuif' | 'deur';
export type Opening = 'vast' | 'dkL' | 'dkR' | 'kiep' | 'schuif';
export type Spec = {
  kind: SpecKind;
  w: string;
  h: string;
  panes: Opening[];
  out: string;
  in: string;
  glass: 'dubbel' | 'triple';
  extras: string[];
  /** doors: hinge side and swing */
  hinge: 'L' | 'R';
  swing: 'binnen' | 'buiten';
  note: string;
  /** chosen design within the collection, e.g. "DP06" */
  model?: string;
};

export const OPENINGS: Record<Opening, { nl: string; en: string; pl: string }> = {
  vast: { nl: 'vast glas', en: 'fixed', pl: 'stałe (fix)' },
  dkL: { nl: 'draai-kiep, scharnieren links', en: 'tilt & turn, hinges left', pl: 'rozwierno-uchylne, zawiasy z lewej' },
  dkR: { nl: 'draai-kiep, scharnieren rechts', en: 'tilt & turn, hinges right', pl: 'rozwierno-uchylne, zawiasy z prawej' },
  kiep: { nl: 'kiep', en: 'tilt only', pl: 'uchylne' },
  schuif: { nl: 'schuivend', en: 'sliding', pl: 'przesuwne' },
};

export const COLOURS: { id: string; nl: string; pl: string; hex: string }[] = [
  { id: 'wit', nl: 'Wit', pl: 'biały', hex: '#f4f4f1' },
  { id: 'creme', nl: 'Crème', pl: 'kremowy', hex: '#ece3cf' },
  { id: 'antraciet', nl: 'Antraciet (RAL 7016)', pl: 'antracyt RAL 7016', hex: '#383e42' },
  { id: 'zwart', nl: 'Zwart (RAL 9005)', pl: 'czarny RAL 9005', hex: '#0e0e10' },
  { id: 'hout', nl: 'Houtdecor', pl: 'okleina drewnopodobna (do ustalenia)', hex: '#8a5a33' },
  { id: 'advies', nl: 'Weet ik nog niet', pl: 'do ustalenia', hex: 'transparent' },
];

export const EXTRAS: { id: string; kinds: SpecKind[]; nl: string; pl: string }[] = [
  { id: 'rooster', kinds: ['raam', 'schuif'], nl: 'Ventilatierooster', pl: 'nawiewnik' },
  { id: 'hor', kinds: ['raam', 'schuif', 'deur'], nl: 'Hor', pl: 'moskitiera' },
  { id: 'rolluik', kinds: ['raam', 'schuif'], nl: 'Rolluik', pl: 'roleta zewnętrzna' },
  { id: 'vensterbank', kinds: ['raam'], nl: 'Vensterbank', pl: 'parapet' },
  { id: 'roedes', kinds: ['raam', 'deur'], nl: 'Roedes in het glas', pl: 'szprosy' },
  { id: 'veilig', kinds: ['raam', 'schuif', 'deur'], nl: 'Inbraakwerend (RC2)', pl: 'okucia antywłamaniowe RC2' },
];

export const emptySpec = (kind: SpecKind): Spec => ({
  kind, w: '', h: '', panes: kind === 'raam' ? ['dkR'] : kind === 'schuif' ? ['schuif', 'vast'] : [],
  out: 'antraciet', in: 'wit', glass: 'dubbel', extras: [], hinge: 'L', swing: 'binnen', note: '',
});

const mm = (v: string) => Number(String(v).replace(',', '.'));
export const specValid = (s: Spec) => mm(s.w) >= 300 && mm(s.w) <= 7000 && mm(s.h) >= 300 && mm(s.h) <= 3500;

const colour = (id: string, key: 'nl' | 'pl') => COLOURS.find((c) => c.id === id)?.[key] ?? id;

/** One line for the customer's quote list. */
export const specText = (s: Spec, t: (l: L) => string): string => {
  const parts = [`${mm(s.w)} × ${mm(s.h)} mm`];
  if (s.kind === 'deur') parts.push(`${s.hinge === 'L' ? t(['scharnieren links', 'hinges left', 'zawiasy z lewej']) : t(['scharnieren rechts', 'hinges right', 'zawiasy z prawej'])}, ${s.swing === 'binnen' ? t(['naar binnen draaiend', 'opens inwards', 'do wewnątrz']) : t(['naar buiten draaiend', 'opens outwards', 'na zewnątrz'])}`);
  else parts.push(s.panes.map((p, i) => `${i + 1}: ${t([OPENINGS[p].nl, OPENINGS[p].en, OPENINGS[p].pl])}`).join(' | '));
  parts.push(`${t(['buiten', 'outside', 'zewn.'])} ${colour(s.out, 'nl')} / ${t(['binnen', 'inside', 'wewn.'])} ${colour(s.in, 'nl')}`);
  parts.push(s.glass === 'triple' ? t(['triple glas', 'triple glazing', 'pakiet 3-szybowy']) : t(['HR++ dubbel glas', 'double glazing', 'pakiet 2-szybowy']));
  if (s.extras.length) parts.push(s.extras.map((e) => EXTRAS.find((x) => x.id === e)?.nl ?? e).join(', '));
  if (s.note.trim()) parts.push(s.note.trim());
  return parts.join(' · ');
};

/** The same position written the way it is sent to the factory (Polish). */
export const specFactory = (s: Spec): string[] => {
  const out = [...(s.model ? [`Model / wzór: ${s.model}`] : []), `Wymiar: ${mm(s.w)} × ${mm(s.h)} mm (szerokość × wysokość, wymiar zewnętrzny ramy)`];
  if (s.kind === 'deur') out.push(`Otwieranie: zawiasy z ${s.hinge === 'L' ? 'lewej' : 'prawej'}, ${s.swing === 'binnen' ? 'do wewnątrz' : 'na zewnątrz'} (widok od wewnątrz)`);
  else out.push(`Podział: ${s.panes.length} ${s.panes.length === 1 ? 'kwatera' : 'kwatery'}, od lewej (widok od wewnątrz): ${s.panes.map((p, i) => `[${i + 1}] ${OPENINGS[p].pl}`).join('; ')}`);
  out.push(`Kolor: zewnątrz ${colour(s.out, 'pl')} / wewnątrz ${colour(s.in, 'pl')}`);
  out.push(`Szklenie: ${s.glass === 'triple' ? 'pakiet 3-szybowy' : 'pakiet 2-szybowy'}`);
  if (s.extras.length) out.push(`Dodatki: ${s.extras.map((e) => EXTRAS.find((x) => x.id === e)?.pl ?? e).join(', ')}`);
  if (s.note.trim()) out.push(`Uwagi klienta: ${s.note.trim()}`);
  return out;
};
