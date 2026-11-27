import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useT, type L } from '../i18n';

/* Looping line drawings that show where the insulation goes: under the floor, against the
 * roof and inside the cavity wall. Plain SVG moved with CSS; they run only while on screen
 * (same switch as the product animations) and stand still under reduced motion. */

export type InsulationKind = 'vloer' | 'dak' | 'spouw' | 'gevel';

const line = { fill: 'none', stroke: '#e6d9bd', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const soft = { ...line, strokeWidth: 1, opacity: 0.45 };
const fill = 'rgba(230,217,189,.3)';

/** three rising heat waves, anchored at x/y */
const Heat = ({ x, y }: { x: number; y: number }) => (
  <g className="sd-i-rise">
    {[0, 14, 28].map((d) => (
      <path key={d} d={`M${x + d} ${y} q-5 -7 0 -14 q5 -7 0 -14`} {...line} strokeWidth={1.5} stroke="#d9a86a" />
    ))}
  </g>
);

export function InsulationMotion({ kind, className = '' }: { kind: InsulationKind; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={box} className={`sd-motion ${on ? 'sd-run' : ''} ${className}`} aria-hidden="true">
      <svg viewBox="0 0 240 180" className="w-full h-full overflow-visible">
        {kind === 'vloer' && (
          <>
            <Heat x={92} y={52} />
            <path d="M14 66 H226" {...line} strokeWidth={3} />
            {[30, 86, 142, 198].map((x) => <rect key={x} x={x} y={69} width={12} height={34} {...line} />)}
            {[44, 100, 156].map((x, i) => (
              <rect key={x} x={x} y={71} width={40} height={30} fill={fill} stroke="#e6d9bd" strokeWidth={1} className="sd-i-wipe" style={{ animationDelay: `${i * 0.35}s` }} />
            ))}
            <path d="M14 152 H226" {...line} />
            {[24, 52, 80, 108, 136, 164, 192].map((x) => <path key={x} d={`M${x} 152 l-10 12`} {...soft} />)}
            <path d="M22 66 V152 M218 66 V152" {...soft} />
          </>
        )}
        {kind === 'dak' && (
          <>
            <Heat x={106} y={136} />
            <path d="M40 152 L120 56 L200 152" fill="none" stroke={fill} strokeWidth={13} strokeLinejoin="round" pathLength={1} className="sd-i-draw" />
            <path d="M14 160 L120 32 L226 160" {...line} strokeWidth={3} />
            <path d="M30 160 H210" {...line} />
            <path d="M52 160 V132 M188 160 V132" {...soft} />
          </>
        )}
        {kind === 'spouw' && (
          <>
            <rect x={70} y={16} width={30} height={148} {...line} />
            <rect x={130} y={16} width={30} height={148} {...line} />
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <path key={i} d={`M70 ${34 + i * 18.5} h30 M130 ${34 + i * 18.5} h30 M${i % 2 ? 80 : 90} ${16 + i * 18.5} v18.5 M${i % 2 ? 150 : 140} ${16 + i * 18.5} v18.5`} {...soft} />
            ))}
            <rect x={101} y={16} width={28} height={148} fill={fill} className="sd-i-fill" />
            <g className="sd-i-push">
              {[52, 90, 128].map((y) => <path key={y} d={`M214 ${y} h-34 m8 -6 l-8 6 l8 6`} {...line} strokeWidth={1.5} stroke="#d9a86a" />)}
            </g>
            <path d="M14 164 H226" {...line} />
          </>
        )}
        {kind === 'gevel' && (
          <>
            <rect x={150} y={16} width={30} height={148} {...line} />
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <path key={i} d={`M150 ${34 + i * 18.5} h30 M${i % 2 ? 160 : 170} ${16 + i * 18.5} v18.5`} {...soft} />
            ))}
            <rect x={110} y={16} width={39} height={148} fill={fill} stroke="#e6d9bd" strokeWidth={1} className="sd-i-fill" />
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <rect key={i} x={97} y={18 + i * 18.5} width={11} height={15} fill="#a5673f" stroke="#e6d9bd" strokeWidth={1} className="sd-i-pop" style={{ animationDelay: `${(7 - i) * 0.18}s` }} />
            ))}
            <g className="sd-i-push">
              {[52, 90, 128].map((y) => <path key={y} d={`M226 ${y} h-30 m8 -6 l-8 6 l8 6`} {...line} strokeWidth={1.5} stroke="#d9a86a" />)}
            </g>
            <path d="M14 164 H226" {...line} />
          </>
        )}
      </svg>
    </div>
  );
}

/** A framed tile: hairline border, corner marks and a slow sheen on hover. */
export const Frame = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <span className={`sd-frame flex items-center justify-center ${className}`}>
    <i /><i /><i /><i />
    {children}
  </span>
);

export const INSULATION: { kind: InsulationKind; title: L; text: L }[] = [
  { kind: 'vloer', title: ['Vloerisolatie', 'Floor insulation', 'Izolacja podłogi'], text: ['Geen koude voeten meer: we isoleren vanuit de kruipruimte.', 'No more cold feet: we insulate from the crawl space.', 'Koniec z zimną podłogą: ocieplamy od strony przestrzeni podpodłogowej.'] },
  { kind: 'dak', title: ['Dakisolatie', 'Roof insulation', 'Izolacja dachu'], text: ['De meeste warmte verdwijnt door het dak. Daar begint de winst.', 'Most heat leaves through the roof. That is where the gain starts.', 'Najwięcej ciepła ucieka przez dach. Tu zysk jest największy.'] },
  { kind: 'spouw', title: ['Spouwmuurisolatie', 'Cavity wall insulation', 'Izolacja ścian szczelinowych'], text: ['De lege ruimte in de gevel gevuld, zonder breekwerk binnen.', 'The empty space in the wall filled, with no work indoors.', 'Pusta szczelina w ścianie wypełniona, bez prac w środku domu.'] },
  { kind: 'gevel', title: ['Gevelisolatie met steenstrips', 'Facade insulation with brick slips', 'Ocieplenie elewacji z płytką klinkierową'], text: ['Een warme jas om het huis, afgewerkt als echt metselwerk.', 'A warm coat around the house, finished like real brickwork.', 'Ciepły płaszcz wokół domu, wykończony jak prawdziwy mur.'] },
];

export const InsulationTiles = () => {
  const t = useT();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-14">
      {INSULATION.map((m) => (
        <Link key={m.kind} to={`/isolatie#${m.kind}`} className="group block">
          <Frame className="h-56"><InsulationMotion kind={m.kind} className="h-[70%] aspect-[4/3]" /></Frame>
          <span className="block font-display text-2xl md:text-3xl text-white mt-5 mb-1.5">{t(m.title)}</span>
          <span className="block text-white/50 font-light text-sm leading-relaxed max-w-xs">{t(m.text)}</span>
        </Link>
      ))}
    </div>
  );
};
