import type { CatItem } from './catalog';

/* Product search that forgives typos and understands Dutch, English and Polish everyday words. */

export const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]+/g, ' ').trim();

/** everyday words → the word the catalogue uses */
const SYN: Record<string, string> = {
  okno: 'ramen', okna: 'ramen', window: 'ramen', windows: 'ramen', raam: 'ramen', kozijn: 'kozijnen', futryna: 'kozijnen', oscieznica: 'kozijnen', frame: 'kozijnen',
  drzwi: 'deuren', door: 'deuren', doors: 'deuren', deur: 'deuren', voordeur: 'buitendeuren', wejsciowe: 'buitendeuren', zewnetrzne: 'buitendeuren', wewnetrzne: 'binnendeuren', binnendeur: 'binnendeuren', buitendeur: 'buitendeuren',
  przesuwne: 'schuif', schuifpui: 'schuif', schuifdeur: 'schuif', sliding: 'schuif', hs: 'hst', tarasowe: 'schuif', harmonijka: 'vouw', harmonica: 'vouw', bifold: 'fold',
  roleta: 'rolluiken', rolety: 'rolluiken', rolluik: 'rolluiken', shutter: 'rolluiken', zaluzje: 'jaloezie', jaloezieen: 'jaloezie', screen: 'screens',
  moskitiera: 'hor', moskitiery: 'hor', horren: 'hor', mug: 'hor', okiennice: 'luiken', luik: 'luiken',
  brama: 'garage', bramy: 'garage', garagedeur: 'garage', poort: 'garage', ogrodzenie: 'hekwerk', ogrodzenia: 'hekwerk', hek: 'hekwerk', fence: 'hekwerk', schutting: 'hekwerk',
  klamka: 'kruk', klamki: 'kruk', handle: 'kruk', greep: 'grepen', pochwyt: 'grepen', szklo: 'glas', szyba: 'glas', glass: 'glas',
  drewno: 'hout', drewniane: 'hout', wood: 'hout', houten: 'hout', pcv: 'kunststof', pvc: 'kunststof', plastik: 'kunststof', alu: 'aluminium', stal: 'staal', steel: 'staal', stalen: 'staal',
  pergole: 'pergola', overkapping: 'pergola', veranda: 'pergola', kolor: 'kleur', kolory: 'kleur', colour: 'kleur', kleuren: 'kleur',
};

const lev1 = (a: string, b: string) => {
  // true when the words differ by at most one edit
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0; let j = 0; let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (a.length < b.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
};

type Entry = { item: CatItem; name: string; words: string[]; hay: string; labels: string[] };
let cacheFor: CatItem[] | null = null; let index: Entry[] = [];
const build = (items: CatItem[]) => {
  if (cacheFor === items) return index;
  cacheFor = items;
  index = items.map((item) => {
    const name = fold(item.name);
    return { item, name, words: name.split(' '), hay: fold(`${item.brand} ${item.group} ${item.cat} ${item.descNL ?? ''} ${(item.features ?? []).join(' ')}`), labels: (item.labels ?? []).map(fold) };
  });
  return index;
};

export type Hit = { item: CatItem; variant: number; score: number };

export function search(items: CatItem[], query: string, limit = 60): Hit[] {
  const q = fold(query);
  if (q.length < 2) return [];
  const terms = q.split(' ').map((w) => SYN[w] ?? w);
  const out: Hit[] = [];
  for (const e of build(items)) {
    let score = 0; let variant = -1; let all = true;
    // an exact design code such as "dp06" or "ekoline 97"
    const li = e.labels.findIndex((l) => l === q || l.replace(/ 0+/g, ' ') === q.replace(/ 0+/g, ' '));
    if (li >= 0) { score += 120; variant = li; }
    for (const term of terms) {
      let s = 0;
      if (e.name === term) s = 100;
      else if (e.name.startsWith(term)) s = 70;
      else if (e.words.some((w) => w.startsWith(term))) s = 55;
      else if (term.length >= 5 && e.name.includes(term)) s = 40;
      else if (e.hay.split(' ').some((w) => w.startsWith(term))) s = 22;
      else if (term.length >= 4 && e.words.some((w) => w.length >= 4 && lev1(w.slice(0, term.length + 1), term))) s = 30;
      else if (term.length >= 5 && e.hay.split(' ').some((w) => lev1(w, term))) s = 12;
      else if (variant < 0) { const k = e.labels.findIndex((l) => l.split(' ').includes(term)); if (k >= 0 && terms.length > 1) { s = 18; variant = k; } }
      if (!s && li < 0) { all = false; break; }
      score += s;
    }
    if (!all || !score) continue;
    if (e.item.brand === 'Eko-Okna') score += 3;
    // real products before colour charts, accessories and overview pages
    if (terms.some((x) => fold(e.item.group).startsWith(x))) score += 30;
    if (e.item.nl) score += 6;
    if (/kleur|extra|decors|All In One|· binnendeuren$/.test(e.item.group) || /profielen|consoles|modelramen|exclusive/.test(e.item.id)) score -= 45;
    out.push({ item: e.item, variant, score });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** material of an item, read from its range name */
export const materialOf = (it: CatItem): 'kunststof' | 'aluminium' | 'hout' | 'staal' | '' =>
  /kunststof|EkoGreen/.test(it.group) ? 'kunststof' : /aluminium/.test(it.group) ? 'aluminium' : /hout/.test(it.group) ? 'hout' : /staal/.test(it.group) ? 'staal' : '';
