import { packed } from '../packs';
import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { finishById, HANDLES, modelImages, type DoorModel, type GlassId, type HandleId, type Part, type Product } from '../data/doors';

/* Every door on the site is drawn from data (see data/doors.ts) — no photos.
 * A leaf is 100 × 240 units; frame, rail, threshold and hardware are added around it. */

const FT = 9; // frame thickness
const GAP = 1.5; // gap between double leaves
const GOLD = '#cbb084';

type Props = {
  model: DoorModel;
  finish?: string;
  glass?: GlassId;
  handle?: HandleId;
  hinge?: 'L' | 'R';
  frame?: boolean;
  wire?: boolean; // technical-drawing look
  className?: string;
  style?: CSSProperties;
  title?: string;
};

const mirror = (p: Part): Part => {
  if (p.k === 'groove') return { ...p, x1: 100 - p.x1, x2: 100 - p.x2 };
  return { ...p, x: 100 - p.x - p.w };
};

export function Door({
  model, finish, glass: glassProp, handle = 'rvs', hinge = 'L', frame = true, wire = false, className = '', style, title,
}: Props) {
  const glass = glassProp ?? model.glassDefault ?? 'helder';
  const uid = useId().replace(/:/g, '');
  const fin = finishById(finish ?? model.finish);
  const hw = HANDLES.find((h) => h.id === handle)?.hex ?? '#c4c8cc';
  const showFrame = frame && model.kind === 'draai';
  const ext = model.cat === 'buiten';
  const rail = model.kind === 'schuif' ? 16 : 0;
  const W = model.leaves * 100 + (model.leaves - 1) * GAP;
  const ox = showFrame ? FT : 0;
  const oy = (showFrame ? FT : 0) + rail;
  const sill = showFrame && ext ? 6 : 0;
  const totalW = W + ox * 2;
  const totalH = oy + 240 + sill;
  const bar = model.steel ? 1.8 : 3.2;
  const body = model.steel ? '#161616' : fin.hex;

  const glassBase: Record<GlassId, string> = { helder: '#11181c', mat: '#c9d0cf', gerookt: '#151517', ribbel: '#8fa1a4' };

  const leaf = (i: number) => {
    // handle side: single leaf follows `hinge`; double leaves meet in the middle
    const handleLeft = model.leaves === 2 ? i === 1 : hinge === 'R';
    const parts = handleLeft ? model.parts.map(mirror) : model.parts;
    const hx = handleLeft ? 11 : 89;
    const dir = handleLeft ? 1 : -1;
    const hingeX = handleLeft ? 99 : -1;
    const stroke = wire ? GOLD : undefined;

    return (
      <g key={i} transform={`translate(${ox + i * (100 + GAP)} ${oy})`}>
        {/* leaf body */}
        <rect width="100" height="240" fill={wire ? 'rgba(203,176,132,.04)' : body} stroke={wire ? GOLD : 'rgba(0,0,0,.55)'} strokeWidth={wire ? 0.9 : 0.6} />
        {!wire && fin.wood && !model.steel && <rect width="100" height="240" fill={`url(#${uid}-grain)`} />}
        {!wire && <rect width="100" height="240" fill={`url(#${uid}-light)`} />}

        {parts.map((p, j) => {
          if (p.k === 'groove') {
            return wire ? (
              <line key={j} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={GOLD} strokeWidth="0.6" />
            ) : (
              <g key={j}>
                <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke="rgba(0,0,0,.45)" strokeWidth="1.3" />
                <line x1={p.x1 + (p.x1 === p.x2 ? 1 : 0)} y1={p.y1 + (p.y1 === p.y2 ? 1 : 0)} x2={p.x2 + (p.x1 === p.x2 ? 1 : 0)} y2={p.y2 + (p.y1 === p.y2 ? 1 : 0)} stroke="rgba(255,255,255,.12)" strokeWidth="0.5" />
              </g>
            );
          }
          if (p.k === 'panel') {
            return wire ? (
              <g key={j}>
                <rect x={p.x} y={p.y} width={p.w} height={p.h} fill="none" stroke={GOLD} strokeWidth="0.7" />
                <rect x={p.x + 4} y={p.y + 4} width={p.w - 8} height={p.h - 8} fill="none" stroke={GOLD} strokeWidth="0.35" opacity=".6" />
              </g>
            ) : (
              <g key={j}>
                <rect x={p.x} y={p.y} width={p.w} height={p.h} fill="rgba(0,0,0,.2)" stroke="rgba(0,0,0,.4)" strokeWidth="0.7" />
                <path d={`M${p.x} ${p.y + p.h} H${p.x + p.w} V${p.y}`} fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="0.7" />
                <rect x={p.x + 4} y={p.y + 4} width={p.w - 8} height={p.h - 8} fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.14)" strokeWidth="0.5" />
                <path d={`M${p.x + 4} ${p.y + p.h - 4} H${p.x + p.w - 4} V${p.y + 4}`} fill="none" stroke="rgba(0,0,0,.3)" strokeWidth="0.6" />
              </g>
            );
          }
          // glass
          const vs = Array.from({ length: p.v ?? 0 }, (_, n) => p.x + (p.w * (n + 1)) / ((p.v ?? 0) + 1));
          const hs = Array.from({ length: p.h2 ?? 0 }, (_, n) => p.y + (p.h * (n + 1)) / ((p.h2 ?? 0) + 1));
          return (
            <g key={j}>
              {wire ? (
                <>
                  <rect x={p.x} y={p.y} width={p.w} height={p.h} fill="rgba(203,176,132,.08)" stroke={GOLD} strokeWidth="0.7" />
                  <path d={`M${p.x + 3} ${p.y + p.h * 0.3} L${p.x + p.w * 0.35} ${p.y + 3} M${p.x + 3} ${p.y + p.h * 0.45} L${p.x + p.w * 0.6} ${p.y + 3}`} stroke={GOLD} strokeWidth="0.4" opacity=".7" />
                </>
              ) : (
                <>
                  <rect x={p.x} y={p.y} width={p.w} height={p.h} fill={glassBase[glass]} opacity={glass === 'mat' ? 0.92 : glass === 'ribbel' ? 0.8 : 1} />
                  {glass === 'helder' && <rect x={p.x} y={p.y} width={p.w} height={p.h} fill={`url(#${uid}-clear)`} />}
                  {glass === 'ribbel' && <rect x={p.x} y={p.y} width={p.w} height={p.h} fill={`url(#${uid}-rib)`} />}
                  <rect x={p.x} y={p.y} width={p.w} height={p.h} fill={`url(#${uid}-shine)`} opacity={glass === 'mat' ? 0.35 : 1} />
                  <rect x={p.x} y={p.y} width={p.w} height={p.h} fill="none" stroke="rgba(0,0,0,.6)" strokeWidth="0.9" />
                </>
              )}
              {vs.map((x) => <line key={`v${x}`} x1={x} y1={p.y} x2={x} y2={p.y + p.h} stroke={stroke ?? body} strokeWidth={wire ? 0.6 : bar} />)}
              {hs.map((y) => <line key={`h${y}`} x1={p.x} y1={y} x2={p.x + p.w} y2={y} stroke={stroke ?? body} strokeWidth={wire ? 0.6 : bar} />)}
            </g>
          );
        })}

        {/* hinges */}
        {showFrame && !wire && [22, 116, 208].map((y) => (
          <rect key={y} x={hingeX} y={y} width="2" height="10" rx="0.6" fill={hw} stroke="rgba(0,0,0,.5)" strokeWidth="0.3" />
        ))}

        {/* hardware */}
        {model.kind === 'schuif' ? (
          <rect x={hx - 2} y="108" width="4" height="28" rx="2" fill={wire ? 'none' : '#0c0c0c'} stroke={wire ? GOLD : hw} strokeWidth="0.6" />
        ) : model.pull ? (
          <g>
            <rect x={hx - 1.6} y="78" width="3.2" height="84" rx="1.6" fill={wire ? 'none' : hw} stroke={wire ? GOLD : 'rgba(0,0,0,.5)'} strokeWidth={wire ? 0.6 : 0.3} />
            {!wire && <rect x={hx - 0.6} y="80" width="1" height="80" rx="0.5" fill="rgba(255,255,255,.35)" />}
          </g>
        ) : (
          <g>
            <circle cx={hx} cy="124" r="3.3" fill={wire ? 'none' : hw} stroke={wire ? GOLD : 'rgba(0,0,0,.55)'} strokeWidth={wire ? 0.6 : 0.4} />
            <rect x={dir === 1 ? hx : hx - 14} y="122.7" width="14" height="2.6" rx="1.3" fill={wire ? 'none' : hw} stroke={wire ? GOLD : 'rgba(0,0,0,.55)'} strokeWidth={wire ? 0.6 : 0.3} />
            {!wire && <rect x={dir === 1 ? hx + 1 : hx - 13} y="123" width="12" height="0.7" rx="0.3" fill="rgba(255,255,255,.4)" />}
            {(ext || wire) && <circle cx={hx} cy="138" r="1.9" fill={wire ? 'none' : hw} stroke={wire ? GOLD : 'rgba(0,0,0,.55)'} strokeWidth="0.4" />}
          </g>
        )}
      </g>
    );
  };

  return (
    <svg viewBox={`0 0 ${totalW} ${totalH}`} className={className} style={style} role="img" aria-label={title ?? `${model.name}`}>
      <defs>
        <linearGradient id={`${uid}-light`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".13" />
          <stop offset=".45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".28" />
        </linearGradient>
        <linearGradient id={`${uid}-clear`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#bfe0ea" stopOpacity=".34" />
          <stop offset=".6" stopColor="#ffe2b0" stopOpacity=".12" />
          <stop offset="1" stopColor="#bf9f6e" stopOpacity=".22" />
        </linearGradient>
        <linearGradient id={`${uid}-shine`} x1="0" y1="0" x2="1" y2="0.6">
          <stop offset=".28" stopColor="#fff" stopOpacity="0" />
          <stop offset=".4" stopColor="#fff" stopOpacity=".2" />
          <stop offset=".47" stopColor="#fff" stopOpacity="0" />
          <stop offset=".55" stopColor="#fff" stopOpacity=".1" />
          <stop offset=".6" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <pattern id={`${uid}-grain`} width="9" height="120" patternUnits="userSpaceOnUse">
          <path d="M1.5 0 C3 30 0 60 2 120 M5 0 C4 40 7 80 5.5 120 M7.8 0 C8.6 50 7 90 8 120" fill="none" stroke="rgba(0,0,0,.2)" strokeWidth="0.5" />
          <path d="M3.4 0 C3 50 4.4 70 3.6 120" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="0.4" />
        </pattern>
        <pattern id={`${uid}-rib`} width="3" height="6" patternUnits="userSpaceOnUse">
          <rect width="1.4" height="6" fill="rgba(255,255,255,.3)" />
          <rect x="1.4" width="0.5" height="6" fill="rgba(0,0,0,.25)" />
        </pattern>
      </defs>

      {/* sliding rail */}
      {rail > 0 && (
        <g>
          <rect x="0" y="3" width={totalW} height="3.4" rx="1.2" fill={wire ? 'none' : '#1c1c1c'} stroke={wire ? GOLD : 'rgba(255,255,255,.18)'} strokeWidth="0.5" />
          {[24, 76].map((x) => (
            <g key={x}>
              <rect x={x - 1.6} y="6" width="3.2" height="16" fill={wire ? 'none' : '#1c1c1c'} stroke={wire ? GOLD : 'rgba(255,255,255,.18)'} strokeWidth="0.4" />
              <circle cx={x} cy="5" r="4.4" fill={wire ? 'none' : '#262626'} stroke={wire ? GOLD : 'rgba(255,255,255,.3)'} strokeWidth="0.6" />
            </g>
          ))}
        </g>
      )}

      {/* frame (kozijn): two stijlen + bovendorpel */}
      {showFrame && (
        <g>
          <path
            d={`M0 0 H${totalW} V${oy + 240} H${totalW - FT} V${FT} H${FT} V${oy + 240} H0 Z`}
            fill={wire ? 'rgba(203,176,132,.05)' : fin.hex}
            stroke={wire ? GOLD : 'rgba(0,0,0,.6)'}
            strokeWidth={wire ? 0.9 : 0.6}
          />
          {!wire && (
            <>
              <path d={`M0 0 H${totalW} V${oy + 240} H${totalW - FT} V${FT} H${FT} V${oy + 240} H0 Z`} fill="rgba(0,0,0,.16)" />
              <path d={`M${FT - 2} ${oy + 240} V${FT - 2} H${totalW - FT + 2} V${oy + 240}`} fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="0.6" />
            </>
          )}
          {sill > 0 && <rect x="0" y={oy + 240} width={totalW} height={sill} fill={wire ? 'none' : '#77726a'} stroke={wire ? GOLD : 'rgba(0,0,0,.6)'} strokeWidth="0.6" />}
        </g>
      )}

      {Array.from({ length: model.leaves }, (_, i) => leaf(i))}
    </svg>
  );
}

/* ───────────── Kozijnen & beslag: small technical illustrations ───────────── */

export function ProductArt({ art, className = '' }: { art: NonNullable<Product['art']>; className?: string }) {
  const s = { fill: 'none', stroke: '#8a6f45', strokeWidth: 1.4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  const tone: Record<string, string> = { 'frame-wood': '#b58a57', 'frame-steel': '#8d9499', 'frame-pvc': '#efece4', 'frame-alu': '#6b4a32' };
  if (art.startsWith('frame')) {
    const c = tone[art];
    const t = art === 'frame-steel' ? 7 : 12;
    return (
      <svg viewBox="0 0 140 200" className={className} role="img" aria-hidden="true">
        <path d={`M20 14 H120 V190 H${120 - t} V${14 + t} H${20 + t} V190 H20 Z`} fill={c} stroke="rgba(0,0,0,.6)" strokeWidth="0.8" />
        <path d={`M20 14 H120 V190 H${120 - t} V${14 + t} H${20 + t} V190 H20 Z`} fill="rgba(0,0,0,.18)" />
        <path d={`M${20 + t - 2.5} 190 V${14 + t - 2.5} H${120 - t + 2.5} V190`} fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="0.8" />
        {(art === 'frame-pvc' || art === 'frame-alu') && <rect x="14" y="190" width="112" height="6" fill="#77726a" stroke="rgba(0,0,0,.6)" strokeWidth="0.6" />}
        {/* cross-section callout */}
        <g transform="translate(52 78)">
          <circle cx="18" cy="18" r="24" fill="#0b0a09" stroke={GOLD} strokeWidth="0.8" />
          {art === 'frame-steel' ? (
            <path d="M6 10 H30 V14 H12 V26 H8 V14 H6 Z" {...s} strokeWidth={1.1} />
          ) : (
            <path d="M6 8 H30 V20 H20 V28 H6 Z" fill={c} stroke={GOLD} strokeWidth="0.9" />
          )}
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 140 200" className={className} role="img" aria-hidden="true">
      {art === 'handle' && (
        <g {...s}>
          <circle cx="52" cy="92" r="16" />
          <circle cx="52" cy="92" r="5" />
          <path d="M52 86 H112 a6 6 0 0 1 0 12 H52" />
          <circle cx="52" cy="140" r="9" />
          <path d="M52 136 v8" />
        </g>
      )}
      {art === 'lock' && (
        <g {...s}>
          <rect x="60" y="22" width="20" height="156" rx="3" />
          <rect x="64" y="34" width="12" height="16" rx="2" />
          <rect x="64" y="92" width="12" height="18" rx="2" />
          <rect x="64" y="150" width="12" height="16" rx="2" />
          <path d="M80 42 h16 M80 101 h22 M80 158 h16" />
          <circle cx="70" cy="128" r="4" />
        </g>
      )}
      {art === 'hinge' && (
        <g {...s}>
          <rect x="36" y="50" width="30" height="100" rx="3" />
          <rect x="74" y="50" width="30" height="100" rx="3" />
          <rect x="64" y="44" width="12" height="112" rx="6" />
          <path d="M64 82 h12 M64 118 h12" />
          {[66, 100, 134].map((y) => <g key={y}><circle cx="48" cy={y} r="2.5" /><circle cx="92" cy={y} r="2.5" /></g>)}
        </g>
      )}
      {art === 'seal' && (
        <g {...s}>
          <rect x="34" y="20" width="72" height="130" />
          <path d="M34 150 h72 v10 h-72 z" />
          <path d="M40 166 q6 8 12 0 q6 8 12 0 q6 8 12 0 q6 8 12 0 q6 8 12 0" />
          <path d="M22 180 h96" strokeDasharray="3 4" />
        </g>
      )}
    </svg>
  );
}

/* Studio ground for product photos: a soft white sweep with a contact shadow. Catalogue
 * photos have white backgrounds, so they are blended (multiply) into it. */
export function Plate({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`${/\babsolute\b/.test(className) ? '' : 'relative'} overflow-hidden bg-[#efece6] ${className}`}>
      {children}
    </div>
  );
}

export const asset = (path: string) => packed(path) ?? `${import.meta.env.BASE_URL}${path}`;

/* Factory photo when the model has one and the file exists; otherwise the drawing. */
export function DoorVisual({ model, finish, index = 0, className = '' }: { model: DoorModel; finish?: string; index?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const { variants } = modelImages(model);
  const src = variants[Math.min(index, variants.length - 1)];
  if (src && !failed) {
    return (
      <img
        src={asset(src)}
        alt={model.name}
        loading="lazy"
        draggable={false}
        onError={() => setFailed(true)}
        className={`${className} object-contain mix-blend-multiply`}
      />
    );
  }
  return <Door model={model} finish={finish} className={`${className} drop-shadow-[0_14px_18px_rgba(60,45,25,.45)]`} />;
}
