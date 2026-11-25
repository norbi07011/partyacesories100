import { useT, type L } from '../i18n';
import type { Field, Form, Opt, Spec } from '../spec';

const TX = {
  title: ['Jouw maten en wensen', 'Your sizes and wishes', 'Twoje wymiary i życzenia'],
  size: ['Hoe groot?', 'How big?', 'Jaki rozmiar?'],
  inside: ['Zo zie je het van binnen', 'View from inside', 'Widok od wewnątrz'],
  section: ['Vak', 'Section', 'Kwatera'],
  note: ['Nog iets dat we moeten weten? (mag leeg blijven)', 'Anything else we should know? (optional)', 'Coś jeszcze? (opcjonalnie)'],
  bad: ['Vul de gemarkeerde velden nog in.', 'Please complete the marked fields.', 'Uzupełnij zaznaczone pola.'],
  optional: ['mag leeg blijven', 'optional', 'opcjonalnie'],
  choose: ['Kies…', 'Choose…', 'Wybierz…'],
} satisfies Record<string, L>;

/** The frame as seen from inside, with the usual opening symbols. */
function Drawing({ form, spec }: { form: Form; spec: Spec }) {
  const W = 220; const H = 150; const w = spec.nums.w; const h = spec.nums.h;
  const panes = form.draw === 'panes' ? spec.panes : [spec.vals.scharnier === 'L' ? 'dkL' : spec.vals.scharnier === 'R' ? 'dkR' : 'vast'];
  const n = panes.length; const pw = (W - 16) / n; const door = form.draw === 'box';
  return (
    <svg viewBox={`-28 -6 ${W + 40} ${H + 34}`} className="w-full max-w-[280px]" role="img" aria-hidden="true">
      <rect x="0" y="0" width={W} height={H} fill="none" stroke="#e6d9bd" strokeWidth="2" />
      {panes.map((p, i) => {
        const x = 8 + i * pw; const y = 8; const ww = pw - (i < n - 1 ? 4 : 0); const hh = H - 16; const mid = x + ww / 2;
        const left = p === 'dkL' || p === 'uitL'; const right = p === 'dkR' || p === 'uitR';
        return (
          <g key={i} stroke="#e6d9bd" strokeWidth="1" fill="none">
            <rect x={x} y={y} width={ww} height={hh} fill="rgba(230,217,189,.06)" />
            {left && <path d={`M${x + ww} ${y} L${x} ${y + hh / 2} L${x + ww} ${y + hh}`} />}
            {right && <path d={`M${x} ${y} L${x + ww} ${y + hh / 2} L${x} ${y + hh}`} />}
            {(p === 'kiep' || p === 'kiepschuif' || ((p === 'dkL' || p === 'dkR') && !door)) && <path d={`M${x} ${y + hh} L${mid} ${y} L${x + ww} ${y + hh}`} strokeDasharray={p === 'kiep' ? undefined : '3 3'} />}
            {p === 'uitzet' && <path d={`M${x} ${y} L${mid} ${y + hh} L${x + ww} ${y}`} />}
            {(p === 'schuif' || p === 'kiepschuif') && <path d={`M${x + ww * 0.25} ${y + hh / 2} H${x + ww * 0.75} M${x + ww * 0.62} ${y + hh / 2 - 6} L${x + ww * 0.75} ${y + hh / 2} L${x + ww * 0.62} ${y + hh / 2 + 6}`} />}
            {p === 'hef' && <path d={`M${mid} ${y + hh * 0.75} V${y + hh * 0.25} M${mid - 6} ${y + hh * 0.38} L${mid} ${y + hh * 0.25} L${mid + 6} ${y + hh * 0.38}`} />}
            <text x={mid} y={y + hh - 8} textAnchor="middle" fill="#e6d9bd" stroke="none" fontSize="10" opacity=".7">{n > 1 ? i + 1 : ''}</text>
          </g>
        );
      })}
      <g fill="#fff" fontSize="11" textAnchor="middle">
        <path d={`M0 ${H + 12} H${W}`} stroke="#fff" strokeOpacity=".4" />
        <text x={W / 2} y={H + 26}>{w ? `${w} mm` : '← →'}</text>
        <path d={`M-12 0 V${H}`} stroke="#fff" strokeOpacity=".4" />
        <text x={-16} y={H / 2} transform={`rotate(-90 -16 ${H / 2})`}>{h ? `${h} mm` : '↑ ↓'}</text>
      </g>
    </svg>
  );
}

export function SizeForm({ form, spec, onChange, missing, coats = [] }: { form: Form; spec: Spec; onChange: (s: Spec) => void; missing: string[]; coats?: string[] }) {
  const t = useT();
  const nl = (x: { nl: string }) => x.nl;
  const set = (patch: Partial<Spec>) => onChange({ ...spec, ...patch });
  const val = (id: string, v: string | string[]) => set({ vals: { ...spec.vals, [id]: v } });
  const tile = (on: boolean) => `px-4 py-3 text-sm text-left border transition-colors ${on ? 'border-amber-200 text-white bg-white/[0.05]' : 'border-white/15 text-white/60 hover:text-white hover:border-white/40'}`;
  const small = 'block text-[11px] uppercase tracking-[0.22em] mb-2';
  const lab = (id: string, text: string) => <p data-gap={missing.includes(id) || undefined} className={`${small} ${missing.includes(id) ? 'text-amber-200' : 'text-white/50'}`}>{text}{missing.includes(id) ? ' *' : ''}</p>;
  let n = 1;
  const step = (label: string) => <p className="flex items-baseline gap-3 mb-5 pt-2"><span className="font-display italic text-2xl text-amber-200/80">{n++}</span><span className="text-white text-base">{label}</span></p>;
  const swatch = (o: Opt) => o.hex ? <span className="w-4 h-4 shrink-0 border border-white/30 sd-round" style={{ background: o.hex }} /> : null;

  const field = (f: Field) => {
    if (f.type === 'panes') {
      const setCount = (c: number) => set({ panes: Array.from({ length: c }, (_, i) => spec.panes[i] ?? f.options[f.options.length - 1].id) });
      return (
        <div key={f.id}>
          {f.counts.length > 1 && <>
            {lab(f.id, nl(f))}
            <div className="flex gap-2 mb-5">{f.counts.map((c) => <button type="button" key={c} onClick={() => setCount(c)} aria-pressed={spec.panes.length === c} className={`${tile(spec.panes.length === c)} w-14 text-center`}>{c}</button>)}</div>
          </>}
          <div className="space-y-4">
            {spec.panes.map((p, i) => (
              <div key={i}>
                {spec.panes.length > 1 && <p className={`${small} text-white/50`}>{t(TX.section)} {i + 1}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {f.options.map((o) => <button type="button" key={o.id} onClick={() => set({ panes: spec.panes.map((x, k) => (k === i ? o.id : x)) })} aria-pressed={p === o.id} className={tile(p === o.id)}>{o.nl}</button>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (f.type === 'coats') {
      return (
        <label key={f.id} className="block">
          {lab(f.id, nl(f))}
          {coats.length > 0
            ? <select value={(spec.vals[f.id] as string) ?? ''} onChange={(e) => val(f.id, e.target.value)} className="w-full max-w-sm py-2.5 text-white text-sm"><option value="">{t(TX.choose)}</option>{coats.map((c) => <option key={c} value={c}>{c}</option>)}</select>
            : <input value={(spec.vals[f.id] as string) ?? ''} onChange={(e) => val(f.id, e.target.value.slice(0, 60))} className="w-full max-w-sm py-2.5 text-white text-sm" />}
        </label>
      );
    }
    if (f.type === 'many') {
      const cur = (spec.vals[f.id] as string[]) ?? [];
      return (
        <div key={f.id}>
          {lab(f.id, nl(f))}
          <div className="flex flex-wrap gap-2">
            {f.options.map((o) => { const on = cur.includes(o.id); return <button type="button" key={o.id} onClick={() => val(f.id, on ? cur.filter((x) => x !== o.id) : [...cur, o.id])} aria-pressed={on} className={`${tile(on)} !py-2.5`}>{on ? '✓ ' : '+ '}{o.nl}</button>; })}
          </div>
        </div>
      );
    }
    const colour = f.options.some((o) => o.hex);
    return (
      <div key={f.id}>
        {lab(f.id, nl(f))}
        <div className={colour || f.options.every((o) => o.nl.length < 14) ? 'flex flex-wrap gap-2' : 'grid grid-cols-1 sm:grid-cols-2 gap-2'}>
          {f.options.map((o) => <button type="button" key={o.id} onClick={() => val(f.id, o.id)} aria-pressed={spec.vals[f.id] === o.id} className={`${tile(spec.vals[f.id] === o.id)} inline-flex items-center gap-2.5 !py-2.5`}>{swatch(o)}{o.nl}</button>)}
        </div>
      </div>
    );
  };

  // group the fields into numbered steps: a field with `step` opens a new one
  const groups: { label?: string; fields: Field[] }[] = [];
  form.fields.forEach((f) => { if (f.step || !groups.length) groups.push({ label: f.step, fields: [f] }); else groups[groups.length - 1].fields.push(f); });

  return (
    <div className="space-y-10">
      <p className="sd-label">{t(TX.title)}</p>
      <div>
        {step(t(TX.size))}
        <div className={`grid grid-cols-1 gap-8 items-center ${form.draw === 'none' ? '' : 'sm:grid-cols-[1fr_auto]'}`}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            {form.nums.map((x) => (
              <label key={x.id} className="block">
                <span data-gap={missing.includes(x.id) || undefined} className={`${small} !mb-1 ${missing.includes(x.id) ? 'text-amber-200' : 'text-white/50'}`}>{x.nl}{x.optional ? ` (${t(TX.optional)})` : ''}{missing.includes(x.id) ? ' *' : ''}</span>
                <input inputMode="numeric" pattern="[0-9]*" value={spec.nums[x.id] ?? ''} onChange={(e) => set({ nums: { ...spec.nums, [x.id]: e.target.value.replace(/[^0-9]/g, '').slice(0, 5) } })} placeholder={x.ph} aria-invalid={missing.includes(x.id)} className="w-full py-3 text-2xl text-white placeholder:text-white/25" />
              </label>
            ))}
            <p className="col-span-2 text-white/45 text-sm leading-relaxed">{form.hint}</p>
          </div>
          {form.draw !== 'none' && (
            <div className="text-center">
              <Drawing form={form} spec={spec} />
              <p className="text-white/40 text-[10px] uppercase tracking-[0.22em] mt-1">{t(TX.inside)}</p>
            </div>
          )}
        </div>
      </div>
      {groups.map((g, i) => (
        <div key={i}>
          {g.label && step(g.label)}
          <div className="space-y-6">{g.fields.map(field)}</div>
        </div>
      ))}
      <label className="block">
        <span className={`${small} !mb-1 text-white/50`}>{t(TX.note)}</span>
        <input value={spec.note} onChange={(e) => set({ note: e.target.value.slice(0, 200) })} className="w-full py-2.5 text-white text-sm" />
      </label>
      {missing.length > 0 && <p role="alert" className="text-amber-200 text-sm">{t(TX.bad)}</p>}
    </div>
  );
}
