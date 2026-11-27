import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, Minus, Plus, RotateCcw } from 'lucide-react';
import { useT, euro, type L } from '../i18n';
import { UI, useDocumentTitle } from '../ui';
import {
  MODELS, FINISHES, GLASS, HANDLES, FRAMES, SERVICE, WIDTHS, HEIGHTS,
  modelById, defaultConfig, hasGlass, needsFrame, priceOf, type DoorConfig, type Category,
} from '../data/doors';
import { useQuote, describeDoor } from '../quote';
import { Door } from '../components/Door';
import { flyTo } from '../fx/core';

const TX = {
  title: ['Stel je deur samen', 'Configure your door', 'Skonfiguruj drzwi'],
  sub: [
    'Kies model, kleur en afwerking. Je ziet de deur en de richtprijs direct veranderen.',
    'Choose model, colour and finish. The door and the guide price update as you go.',
    'Wybierz model, kolor i wykończenie. Drzwi i cena orientacyjna zmieniają się na bieżąco.',
  ],
  model: ['Model', 'Model', 'Model'],
  colour: ['Kleur', 'Colour', 'Kolor'],
  glass: ['Glas', 'Glass', 'Szkło'],
  handle: ['Beslag', 'Hardware', 'Okucia'],
  size: ['Maat', 'Size', 'Wymiar'],
  width: ['Breedte (cm)', 'Width (cm)', 'Szerokość (cm)'],
  height: ['Hoogte (cm)', 'Height (cm)', 'Wysokość (cm)'],
  custom: ['Maatwerk', 'Custom', 'Na wymiar'],
  customHint: [
    'Vul je maat in millimeters in, of laat leeg — dan bepalen we die bij het inmeten.',
    'Enter your size in millimetres, or leave it empty — we will determine it at the survey.',
    'Podaj wymiar w milimetrach albo zostaw puste — ustalimy go przy pomiarze.',
  ],
  hinge: ['Draairichting', 'Swing direction', 'Kierunek otwierania'],
  hingeL: ['Linksdraaiend', 'Left-hung', 'Lewe'],
  hingeR: ['Rechtsdraaiend', 'Right-hung', 'Prawe'],
  hingeHint: [
    'Sta aan de kant waar je de scharnieren ziet. Zitten ze links? Dan is de deur linksdraaiend.',
    'Stand on the side where you see the hinges. Are they on the left? Then the door is left-hung.',
    'Stań po stronie, z której widać zawiasy. Są po lewej? To drzwi lewe.',
  ],
  frame: ['Kozijn', 'Frame', 'Futryna'],
  service: ['Levering & montage', 'Delivery & fitting', 'Dostawa i montaż'],
  qty: ['Aantal', 'Quantity', 'Ilość'],
  perDoor: ['per stuk', 'each', 'za sztukę'],
  total: ['Richtprijs totaal', 'Guide price total', 'Cena orientacyjna łącznie'],
  reset: ['Opnieuw beginnen', 'Start over', 'Zacznij od nowa'],
  toList: ['Naar de offertelijst', 'Go to quote list', 'Przejdź do listy wyceny'],
  summary: ['Jouw deur', 'Your door', 'Twoje drzwi'],
  mm: ['mm', 'mm', 'mm'],
} satisfies Record<string, L>;

const Group = ({ n, title, hint, children }: { n: number; title: string; hint?: string; children: ReactNode }) => (
  <section className="py-8 border-b border-white/10">
    <div className="flex items-baseline gap-4 mb-5">
      <span className="font-display italic text-amber-300/80 text-xl w-7 shrink-0">{String(n).padStart(2, '0')}</span>
      <h2 className="text-white text-sm font-bold uppercase tracking-[0.3em]">{title}</h2>
    </div>
    <div className="pl-11">
      {children}
      {hint && <p className="text-white/45 text-sm mt-4 max-w-lg">{hint}</p>}
    </div>
  </section>
);

const chip = (on: boolean) =>
  `px-4 py-2.5 rounded-full text-sm font-medium border transition-all ${on ? 'bg-amber-500 text-black border-amber-500' : 'bg-zinc-900/60 text-zinc-300 border-zinc-800 hover:border-amber-500/50 hover:text-white'}`;

const optionCard = (on: boolean) =>
  `w-full text-left rounded-2xl border px-5 py-4 transition-all ${on ? 'border-amber-400 bg-amber-500/10' : 'border-zinc-800 bg-zinc-900/50 hover:border-amber-500/40'}`;

const Configurator = () => {
  const t = useT();
  useDocumentTitle(t(TX.title));
  const [params, setParams] = useSearchParams();
  const { addDoor, count } = useQuote();
  const preview = useRef<HTMLDivElement>(null);

  const [cfg, setCfg] = useState<DoorConfig>(() => {
    const m = modelById(params.get('model'));
    const base = defaultConfig(m);
    const f = params.get('finish');
    return f && FINISHES.some((x) => x.id === f) ? { ...base, finish: f } : base;
  });
  const [cat, setCat] = useState<Category>(() => modelById(cfg.model).cat);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const m = modelById(cfg.model);
  const set = (patch: Partial<DoorConfig>) => { setCfg((c) => ({ ...c, ...patch })); setAdded(false); };

  // keep the URL shareable
  useEffect(() => {
    setParams({ model: cfg.model, finish: cfg.finish }, { replace: true });
  }, [cfg.model, cfg.finish, setParams]);

  const pickModel = (id: string) => {
    const nm = modelById(id);
    set({ model: id, finish: nm.steel ? '9005' : cfg.finish, frame: needsFrame(nm) ? cfg.frame : 'behouden' });
  };

  const unit = priceOf(cfg);
  const add = async () => {
    if (preview.current) await flyTo(preview.current);
    addDoor(cfg, qty);
    setAdded(true);
  };

  let n = 0;
  const list = MODELS.filter((x) => x.cat === cat);

  return (
    <div className="pt-28 md:pt-36 pb-24">
      <div className="max-w-7xl mx-auto px-6">
        <header className="max-w-3xl mb-10 md:mb-14">
          <p className="flex items-center gap-4 text-amber-300/90 text-[11px] font-medium uppercase tracking-[0.45em] mb-6">
            <span className="h-px w-10 bg-amber-400/60" />{t(UI.nav.configurator)}
          </p>
          <h1 className="font-display text-5xl md:text-7xl text-white leading-[0.95] mb-5">{t(TX.title)}</h1>
          <p className="text-zinc-400 text-lg">{t(TX.sub)}</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-10 lg:gap-16 items-start">
          {/* ───── live preview ───── */}
          <div className="lg:sticky lg:top-28">
            <div className="relative rounded-[2rem] overflow-hidden border border-white/10 bg-[radial-gradient(70%_60%_at_50%_30%,rgba(230,217,189,.2),rgba(11,10,9,0)_70%),linear-gradient(180deg,#191613,#0b0a09)]">
              <div className="absolute inset-x-0 bottom-0 h-[18%] bg-gradient-to-b from-[#2a241d] to-[#15120f] border-t border-white/10" aria-hidden="true" />
              <div ref={preview} className="relative h-[56svh] min-h-[380px] max-h-[640px] flex items-end justify-center pt-8 pb-[7%]">
                <Door
                  key={m.id}
                  model={m}
                  finish={cfg.finish}
                  glass={cfg.glass}
                  handle={cfg.handle}
                  hinge={cfg.hinge}
                  className="h-full w-auto max-w-[88%] drop-shadow-[0_30px_40px_rgba(0,0,0,.7)] animate-[sd-pop_.6s_cubic-bezier(.16,1,.3,1)]"
                />
              </div>
              <div className="absolute top-5 left-5 right-5 flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-3xl text-white leading-none">{m.name}</p>
                  <p className="text-amber-300/70 text-[10px] uppercase tracking-[0.3em] mt-2">{t(m.style)}</p>
                </div>
                <button onClick={() => { setCfg(defaultConfig(m)); setQty(1); setAdded(false); }} className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-full bg-black/50 border border-white/10 text-white/60 hover:text-white text-xs transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" /> {t(TX.reset)}
                </button>
              </div>
            </div>
            <p className="hidden lg:block text-white/40 text-xs mt-4 leading-relaxed">{describeDoor(cfg, t).join(' · ')}</p>
          </div>

          {/* ───── options ───── */}
          <div>
            <Group n={++n} title={t(TX.model)}>
              <div className="flex gap-2 mb-5">
                {(['binnen', 'buiten'] as Category[]).map((c) => (
                  <button key={c} onClick={() => setCat(c)} className={chip(cat === c)}>{t(c === 'binnen' ? UI.interior : UI.exterior)}</button>
                ))}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {list.map((x) => {
                  const on = x.id === m.id;
                  return (
                    <button
                      key={x.id}
                      onClick={() => pickModel(x.id)}
                      aria-pressed={on}
                      className={`rounded-2xl border p-3 pt-4 flex flex-col items-center gap-2 transition-all ${on ? 'border-amber-400 bg-amber-500/10' : 'border-zinc-800 bg-zinc-900/50 hover:border-amber-500/40'}`}
                    >
                      <Door model={x} finish={x.steel ? undefined : cfg.finish} className="h-24 w-auto max-w-full" />
                      <span className={`text-xs font-medium ${on ? 'text-amber-200' : 'text-zinc-400'}`}>{x.name}</span>
                    </button>
                  );
                })}
              </div>
            </Group>

            {!m.steel && (
              <Group n={++n} title={t(TX.colour)}>
                <div className="flex flex-wrap gap-3">
                  {FINISHES.map((f) => {
                    const on = cfg.finish === f.id;
                    return (
                      <button key={f.id} onClick={() => set({ finish: f.id })} aria-pressed={on} title={t(f.name)} className="group flex flex-col items-center gap-2 w-[72px]">
                        <span className={`relative w-12 h-12 rounded-full border-2 transition-all flex items-center justify-center ${on ? 'border-amber-300 scale-110' : 'border-white/15 group-hover:border-white/50'}`} style={{ background: f.hex }}>
                          {on && <Check className="w-4 h-4 mix-blend-difference text-white" />}
                        </span>
                        <span className={`text-[10px] leading-tight text-center ${on ? 'text-amber-200' : 'text-zinc-500'}`}>{t(f.name).split(' · ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-white/45 text-sm mt-4">{t(FINISHES.find((f) => f.id === cfg.finish)!.name)}</p>
              </Group>
            )}

            {hasGlass(m) && (
              <Group n={++n} title={t(TX.glass)}>
                <div className="flex flex-wrap gap-2">
                  {GLASS.map((g) => (
                    <button key={g.id} onClick={() => set({ glass: g.id })} className={chip(cfg.glass === g.id)}>
                      {t(g.name)}{g.price > 0 && <span className="opacity-60"> +{euro(g.price)}</span>}
                    </button>
                  ))}
                </div>
              </Group>
            )}

            <Group n={++n} title={t(TX.handle)}>
              <div className="flex flex-wrap gap-2">
                {HANDLES.map((h) => (
                  <button key={h.id} onClick={() => set({ handle: h.id })} className={`${chip(cfg.handle === h.id)} inline-flex items-center gap-2`}>
                    <span className="w-4 h-4 rounded-full border border-black/40" style={{ background: h.hex }} />
                    {t(h.name)}{h.price > 0 && <span className="opacity-60"> +{euro(h.price)}</span>}
                  </button>
                ))}
              </div>
            </Group>

            <Group n={++n} title={t(TX.size)} hint={cfg.width === 'maat' || cfg.height === 'maat' ? t(TX.customHint) : undefined}>
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/55 mb-3">{t(TX.width)}</p>
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {WIDTHS.map((w) => <button key={w} onClick={() => set({ width: w })} className={chip(cfg.width === w)}>{w}</button>)}
                <button onClick={() => set({ width: 'maat' })} className={chip(cfg.width === 'maat')}>{t(TX.custom)}</button>
                {cfg.width === 'maat' && (
                  <label className="inline-flex items-center gap-2 text-zinc-400 text-sm">
                    <input value={cfg.customW ?? ''} onChange={(e) => set({ customW: e.target.value.replace(/[^\d]/g, '').slice(0, 4) })} inputMode="numeric" placeholder="845" aria-label={t(TX.width)} className="w-24 bg-zinc-900/60 border border-zinc-800 rounded-full px-4 py-2.5 text-white outline-none focus:border-amber-500" />
                    {t(TX.mm)}
                  </label>
                )}
              </div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/55 mb-3">{t(TX.height)}</p>
              <div className="flex flex-wrap items-center gap-2">
                {HEIGHTS.map((h) => <button key={h} onClick={() => set({ height: h })} className={chip(cfg.height === h)}>{String(h).replace('.', ',')}</button>)}
                <button onClick={() => set({ height: 'maat' })} className={chip(cfg.height === 'maat')}>{t(TX.custom)}</button>
                {cfg.height === 'maat' && (
                  <label className="inline-flex items-center gap-2 text-zinc-400 text-sm">
                    <input value={cfg.customH ?? ''} onChange={(e) => set({ customH: e.target.value.replace(/[^\d]/g, '').slice(0, 4) })} inputMode="numeric" placeholder="2090" aria-label={t(TX.height)} className="w-24 bg-zinc-900/60 border border-zinc-800 rounded-full px-4 py-2.5 text-white outline-none focus:border-amber-500" />
                    {t(TX.mm)}
                  </label>
                )}
              </div>
            </Group>

            {m.kind === 'draai' && m.leaves === 1 && (
              <Group n={++n} title={t(TX.hinge)} hint={t(TX.hingeHint)}>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => set({ hinge: 'L' })} className={chip(cfg.hinge === 'L')}>{t(TX.hingeL)}</button>
                  <button onClick={() => set({ hinge: 'R' })} className={chip(cfg.hinge === 'R')}>{t(TX.hingeR)}</button>
                </div>
              </Group>
            )}

            {needsFrame(m) && (
              <Group n={++n} title={t(TX.frame)}>
                <div className="grid gap-3">
                  {FRAMES.map((f) => {
                    const p = f.price[m.cat === 'buiten' ? 1 : 0];
                    const on = cfg.frame === f.id;
                    return (
                      <button key={f.id} onClick={() => set({ frame: f.id })} aria-pressed={on} className={optionCard(on)}>
                        <span className="flex items-baseline justify-between gap-4">
                          <span className={`font-medium ${on ? 'text-amber-100' : 'text-white'}`}>{t(f.name)}</span>
                          <span className="text-sm text-white/55 whitespace-nowrap">{p > 0 ? `+${euro(p)}` : '—'}</span>
                        </span>
                        <span className="block text-sm text-zinc-500 mt-1">{t(f.hint)}</span>
                      </button>
                    );
                  })}
                </div>
              </Group>
            )}

            <Group n={++n} title={t(TX.service)}>
              <div className="grid gap-3">
                {SERVICE.map((s) => {
                  const p = s.price[m.cat === 'buiten' ? 1 : 0];
                  const on = cfg.service === s.id;
                  return (
                    <button key={s.id} onClick={() => set({ service: s.id })} aria-pressed={on} className={optionCard(on)}>
                      <span className="flex items-baseline justify-between gap-4">
                        <span className={`font-medium ${on ? 'text-amber-100' : 'text-white'}`}>{t(s.name)}</span>
                        <span className="text-sm text-white/55 whitespace-nowrap">{p > 0 ? `+${euro(p)}` : '—'}</span>
                      </span>
                      <span className="block text-sm text-zinc-500 mt-1">{t(s.hint)}</span>
                    </button>
                  );
                })}
              </div>
            </Group>

            {/* ───── summary ───── */}
            <div className="mt-10 bb-glass-card rounded-[2rem] p-6 md:p-8">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/55 mb-3">{t(TX.summary)}</p>
              <p className="font-display text-3xl text-white mb-2">{m.name}</p>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">{describeDoor(cfg, t).join(' · ')}</p>

              <div className="flex flex-wrap items-end justify-between gap-6 pt-6 border-t border-white/10">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/55 mb-2">{t(TX.qty)}</p>
                  <div className="inline-flex items-center rounded-full border border-zinc-700">
                    <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="−" className="w-11 h-11 flex items-center justify-center text-white hover:text-amber-300"><Minus className="w-4 h-4" /></button>
                    <span className="w-8 text-center text-white font-medium tabular-nums" aria-live="polite">{qty}</span>
                    <button onClick={() => setQty((q) => Math.min(99, q + 1))} aria-label="+" className="w-11 h-11 flex items-center justify-center text-white hover:text-amber-300"><Plus className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/55 mb-1">{t(TX.total)}</p>
                  <p className="font-display text-5xl md:text-6xl bb-text-gold leading-none">{euro(unit * qty)}</p>
                  {qty > 1 && <p className="text-white/45 text-sm mt-1">{euro(unit)} {t(TX.perDoor)}</p>}
                </div>
              </div>
              <p className="text-white/40 text-xs mt-4">{t(UI.indicative)}</p>

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button onClick={add} className={`flex-1 inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full font-bold transition-colors ${added ? 'bg-amber-200 text-black' : 'bg-amber-500 hover:bg-amber-400 text-black'}`}>
                  {added ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />} {t(added ? UI.added : UI.addToQuote)}
                </button>
                {count > 0 && (
                  <Link to="/offertelijst" className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full border border-zinc-700 hover:border-amber-500 text-white font-bold transition-colors">
                    {t(TX.toList)} ({count}) <ArrowRight className="w-5 h-5" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes sd-pop{from{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
};

export default Configurator;
