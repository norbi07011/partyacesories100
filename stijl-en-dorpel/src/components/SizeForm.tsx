import { useT, type L } from '../i18n';
import { COLOURS, EXTRAS, OPENINGS, type Opening, type Spec } from '../spec';

const TX = {
  title: ['Jouw maten', 'Your sizes', 'Twoje wymiary'],
  step1: ['Hoe groot?', 'How big?', 'Jaki rozmiar?'],
  step2: ['Hoe gaat het open?', 'How does it open?', 'Jak się otwiera?'],
  step3: ['Welke kleur?', 'Which colour?', 'Jaki kolor?'],
  step4: ['Glas en extra’s', 'Glass and extras', 'Szkło i dodatki'],
  width: ['Breedte in mm', 'Width in mm', 'Szerokość w mm'],
  height: ['Hoogte in mm', 'Height in mm', 'Wysokość w mm'],
  hint: ['Meet de hele opening, van muur tot muur. Niet zeker? Vul een schatting in — wij komen gratis nameten.', 'Measure the whole opening, wall to wall. Not sure? Enter an estimate — we come and measure for free.', 'Zmierz cały otwór, od muru do muru. Nie masz pewności? Wpisz przybliżony wymiar — przyjedziemy na bezpłatny pomiar.'],
  parts: ['Aantal vakken', 'Number of sections', 'Liczba kwater'],
  inside: ['Zo zie je het van binnen', 'This is the view from inside', 'Widok od wewnątrz'],
  section: ['Vak', 'Section', 'Kwatera'],
  outside: ['Buitenkant', 'Outside', 'Na zewnątrz'],
  indoor: ['Binnenkant', 'Inside', 'Wewnątrz'],
  double: ['HR++ dubbel glas', 'Double glazing', 'Pakiet 2-szybowy'],
  triple: ['Triple glas', 'Triple glazing', 'Pakiet 3-szybowy'],
  hingeL: ['Scharnieren links', 'Hinges left', 'Zawiasy z lewej'],
  hingeR: ['Scharnieren rechts', 'Hinges right', 'Zawiasy z prawej'],
  swingIn: ['Draait naar binnen', 'Opens inwards', 'Otwiera się do wewnątrz'],
  swingOut: ['Draait naar buiten', 'Opens outwards', 'Otwiera się na zewnątrz'],
  note: ['Nog iets dat we moeten weten? (mag leeg blijven)', 'Anything else we should know? (optional)', 'Coś jeszcze? (opcjonalnie)'],
  bad: ['Vul breedte en hoogte in millimeters in, bijvoorbeeld 1200 en 1400.', 'Enter width and height in millimetres, for example 1200 and 1400.', 'Wpisz szerokość i wysokość w milimetrach, np. 1200 i 1400.'],
} satisfies Record<string, L>;

/** The frame as seen from inside, with the usual opening symbols. */
function Drawing({ spec }: { spec: Spec }) {
  const W = 220; const H = 150; const n = spec.kind === 'deur' ? 1 : spec.panes.length; const pw = (W - 16) / n;
  const panes: Opening[] = spec.kind === 'deur' ? [spec.hinge === 'L' ? 'dkL' : 'dkR'] : spec.panes;
  return (
    <svg viewBox={`-28 -6 ${W + 40} ${H + 34}`} className="w-full max-w-[280px]" role="img" aria-hidden="true">
      <rect x="0" y="0" width={W} height={H} fill="none" stroke="#e6d9bd" strokeWidth="2" />
      {panes.map((p, i) => {
        const x = 8 + i * pw; const y = 8; const w = pw - (i < n - 1 ? 4 : 0); const h = H - 16; const mid = x + w / 2;
        return (
          <g key={i} stroke="#e6d9bd" strokeWidth="1" fill="none">
            <rect x={x} y={y} width={w} height={h} fill="rgba(230,217,189,.06)" />
            {p === 'dkL' && <path d={`M${x + w} ${y} L${x} ${y + h / 2} L${x + w} ${y + h}`} />}
            {p === 'dkR' && <path d={`M${x} ${y} L${x + w} ${y + h / 2} L${x} ${y + h}`} />}
            {(p === 'kiep' || ((p === 'dkL' || p === 'dkR') && spec.kind !== 'deur')) && <path d={`M${x} ${y + h} L${mid} ${y} L${x + w} ${y + h}`} strokeDasharray={p === 'kiep' ? undefined : '3 3'} />}
            {p === 'schuif' && <path d={`M${x + w * 0.25} ${y + h / 2} H${x + w * 0.75} M${x + w * 0.62} ${y + h / 2 - 6} L${x + w * 0.75} ${y + h / 2} L${x + w * 0.62} ${y + h / 2 + 6}`} />}
            <text x={mid} y={y + h - 8} textAnchor="middle" fill="#e6d9bd" stroke="none" fontSize="10" opacity=".7">{n > 1 ? i + 1 : ''}</text>
          </g>
        );
      })}
      <g fill="#fff" fontSize="11" textAnchor="middle">
        <path d={`M0 ${H + 12} H${W}`} stroke="#fff" strokeOpacity=".4" />
        <text x={W / 2} y={H + 26}>{spec.w ? `${spec.w} mm` : '← →'}</text>
        <path d={`M-12 0 V${H}`} stroke="#fff" strokeOpacity=".4" />
        <text x={-16} y={H / 2} transform={`rotate(-90 -16 ${H / 2})`}>{spec.h ? `${spec.h} mm` : '↑ ↓'}</text>
      </g>
    </svg>
  );
}

export function SizeForm({ spec, onChange, error }: { spec: Spec; onChange: (s: Spec) => void; error: boolean }) {
  const t = useT();
  const set = (patch: Partial<Spec>) => onChange({ ...spec, ...patch });
  const tile = (on: boolean) => `px-4 py-3 text-sm text-left border transition-colors ${on ? 'border-amber-200 text-white bg-white/[0.05]' : 'border-white/15 text-white/60 hover:text-white hover:border-white/40'}`;
  const step = (n: number, label: string) => (
    <p className="flex items-baseline gap-3 mb-4"><span className="font-display italic text-2xl text-amber-200/80">{n}</span><span className="text-white text-base">{label}</span></p>
  );
  const big = 'w-full py-3 text-2xl text-white placeholder:text-white/25';
  const openings: Opening[] = spec.kind === 'schuif' ? ['schuif', 'vast'] : ['dkL', 'dkR', 'kiep', 'vast'];
  const setCount = (n: number) => set({ panes: Array.from({ length: n }, (_, i) => spec.panes[i] ?? (spec.kind === 'schuif' ? (i === 0 ? 'schuif' : 'vast') : 'vast')) });
  const counts = spec.kind === 'schuif' ? [2, 3, 4] : [1, 2, 3, 4];

  return (
    <div className="space-y-10">
      <p className="sd-label">{t(TX.title)}</p>

      <div>
        {step(1, t(TX.step1))}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-8 items-center">
          <div className="grid grid-cols-2 gap-6">
            <label className="block">
              <span className="block text-[11px] uppercase tracking-[0.22em] text-white/50 mb-1">{t(TX.width)}</span>
              <input inputMode="numeric" pattern="[0-9]*" value={spec.w} onChange={(e) => set({ w: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) })} placeholder="1200" aria-invalid={error} className={big} />
            </label>
            <label className="block">
              <span className="block text-[11px] uppercase tracking-[0.22em] text-white/50 mb-1">{t(TX.height)}</span>
              <input inputMode="numeric" pattern="[0-9]*" value={spec.h} onChange={(e) => set({ h: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) })} placeholder="1400" aria-invalid={error} className={big} />
            </label>
            <p className="col-span-2 text-white/45 text-sm leading-relaxed">{t(TX.hint)}</p>
            {error && <p role="alert" className="col-span-2 text-amber-200 text-sm">{t(TX.bad)}</p>}
          </div>
          <div className="text-center">
            <Drawing spec={spec} />
            <p className="text-white/40 text-[10px] uppercase tracking-[0.22em] mt-1">{t(TX.inside)}</p>
          </div>
        </div>
      </div>

      <div>
        {step(2, t(TX.step2))}
        {spec.kind === 'deur' ? (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => set({ hinge: 'L' })} aria-pressed={spec.hinge === 'L'} className={tile(spec.hinge === 'L')}>{t(TX.hingeL)}</button>
            <button type="button" onClick={() => set({ hinge: 'R' })} aria-pressed={spec.hinge === 'R'} className={tile(spec.hinge === 'R')}>{t(TX.hingeR)}</button>
            <button type="button" onClick={() => set({ swing: 'binnen' })} aria-pressed={spec.swing === 'binnen'} className={tile(spec.swing === 'binnen')}>{t(TX.swingIn)}</button>
            <button type="button" onClick={() => set({ swing: 'buiten' })} aria-pressed={spec.swing === 'buiten'} className={tile(spec.swing === 'buiten')}>{t(TX.swingOut)}</button>
          </div>
        ) : (
          <>
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/50 mb-2">{t(TX.parts)}</p>
            <div className="flex gap-2 mb-5">
              {counts.map((n) => <button type="button" key={n} onClick={() => setCount(n)} aria-pressed={spec.panes.length === n} className={`${tile(spec.panes.length === n)} w-14 text-center`}>{n}</button>)}
            </div>
            <div className="space-y-4">
              {spec.panes.map((p, i) => (
                <div key={i}>
                  {spec.panes.length > 1 && <p className="text-[11px] uppercase tracking-[0.22em] text-white/50 mb-2">{t(TX.section)} {i + 1}</p>}
                  <div className="grid grid-cols-2 gap-2">
                    {openings.map((o) => (
                      <button type="button" key={o} onClick={() => set({ panes: spec.panes.map((x, k) => (k === i ? o : x)) })} aria-pressed={p === o} className={tile(p === o)}>
                        {t([OPENINGS[o].nl, OPENINGS[o].en, OPENINGS[o].pl])}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div>
        {step(3, t(TX.step3))}
        {(['out', 'in'] as const).map((side) => (
          <div key={side} className="mb-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/50 mb-2">{t(side === 'out' ? TX.outside : TX.indoor)}</p>
            <div className="flex flex-wrap gap-2">
              {COLOURS.map((c) => (
                <button type="button" key={c.id} onClick={() => set({ [side]: c.id } as Partial<Spec>)} aria-pressed={spec[side] === c.id} className={`${tile(spec[side] === c.id)} inline-flex items-center gap-2.5 !py-2.5`}>
                  <span className="w-4 h-4 border border-white/30 sd-round" style={{ background: c.hex }} />{c.nl}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div>
        {step(4, t(TX.step4))}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button type="button" onClick={() => set({ glass: 'dubbel' })} aria-pressed={spec.glass === 'dubbel'} className={tile(spec.glass === 'dubbel')}>{t(TX.double)}</button>
          <button type="button" onClick={() => set({ glass: 'triple' })} aria-pressed={spec.glass === 'triple'} className={tile(spec.glass === 'triple')}>{t(TX.triple)}</button>
        </div>
        <div className="flex flex-wrap gap-2 mb-5">
          {EXTRAS.filter((e) => e.kinds.includes(spec.kind)).map((e) => {
            const on = spec.extras.includes(e.id);
            return <button type="button" key={e.id} onClick={() => set({ extras: on ? spec.extras.filter((x) => x !== e.id) : [...spec.extras, e.id] })} aria-pressed={on} className={`${tile(on)} !py-2.5`}>{on ? '✓ ' : '+ '}{e.nl}</button>;
          })}
        </div>
        <label className="block">
          <span className="block text-[11px] uppercase tracking-[0.22em] text-white/50 mb-1">{t(TX.note)}</span>
          <input value={spec.note} onChange={(e) => set({ note: e.target.value.slice(0, 200) })} className="w-full py-2.5 text-white text-sm" />
        </label>
      </div>
    </div>
  );
}
