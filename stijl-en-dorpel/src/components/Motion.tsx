import { useEffect, useRef, useState } from 'react';

/* Small looping animations that show how a product moves: a window tilting and turning,
 * a sliding door, a folding wall, a front door, a sectional garage door and a roller shutter.
 * Drawn with plain boxes and CSS transforms — no video, a few hundred bytes each. They only
 * run while they are on screen and stand still for visitors who prefer reduced motion. */

export type MotionKind = 'draaikiep' | 'schuif' | 'vouw' | 'deur' | 'garage' | 'rolluik';

const frame = 'absolute inset-0 border-[3px] border-[#e6d9bd]';
const glass = 'bg-[linear-gradient(135deg,rgba(230,217,189,.16),rgba(230,217,189,.04)_55%,rgba(230,217,189,.12))]';
const sash = `absolute border-2 border-[#e6d9bd] ${glass}`;

export function Motion({ kind, className = '' }: { kind: MotionKind; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const wide = kind === 'schuif' || kind === 'vouw' || kind === 'garage';

  return (
    <div ref={box} className={`sd-motion ${on ? 'sd-run' : ''} relative mx-auto ${wide ? 'aspect-[4/3]' : 'aspect-[3/4]'} ${className}`} style={{ perspective: '900px' }} aria-hidden="true">
      {kind === 'draaikiep' && (
        <>
          <div className={frame} />
          <div className="absolute inset-[7%] sd-m-turn" style={{ transformOrigin: '0 50%', transformStyle: 'preserve-3d' }}>
            <div className={`${sash} inset-0 sd-m-tilt`} style={{ transformOrigin: '50% 100%' }}>
              <span className="absolute right-[5%] top-1/2 -translate-y-1/2 w-[5%] h-[16%] bg-[#e6d9bd] sd-m-handle" style={{ transformOrigin: '50% 12%' }} />
            </div>
          </div>
        </>
      )}
      {kind === 'deur' && (
        <>
          <div className={frame} style={{ borderBottomWidth: 0 }} />
          <div className="absolute inset-x-[6%] top-[5%] bottom-0 sd-m-door bg-[#2a2622] border-2 border-[#e6d9bd]" style={{ transformOrigin: '0 50%' }}>
            <span className="absolute left-[18%] top-[14%] w-[12%] h-[62%] border border-[#e6d9bd]/70 bg-[#e6d9bd]/15" />
            <span className="absolute right-[10%] top-[30%] w-[4%] h-[38%] bg-[#e6d9bd]" />
          </div>
        </>
      )}
      {kind === 'schuif' && (
        <>
          <div className={frame} />
          <div className={`${sash} top-[6%] bottom-[6%] right-[4%] w-[47%]`} />
          <div className={`${sash} top-[6%] bottom-[6%] left-[4%] w-[47%] sd-m-slide`}>
            <span className="absolute right-[6%] top-1/2 -translate-y-1/2 w-[3%] h-[24%] bg-[#e6d9bd]" />
          </div>
          <span className="absolute inset-x-0 bottom-0 h-[3px] bg-[#e6d9bd]" />
        </>
      )}
      {kind === 'vouw' && (
        <>
          <div className={frame} />
          <div className="absolute inset-[6%] flex">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`relative h-full border-2 border-[#e6d9bd] ${glass} sd-m-fold ${i % 2 ? 'sd-m-fold-b' : 'sd-m-fold-a'}`} />
            ))}
          </div>
        </>
      )}
      {kind === 'garage' && (
        <>
          <div className={frame} style={{ borderBottomWidth: 0 }} />
          <div className="absolute inset-x-[4%] top-[5%] bottom-0 overflow-hidden">
            <div className="absolute inset-0 sd-m-lift bg-[#2a2622] flex flex-col">
              {[0, 1, 2, 3].map((i) => <span key={i} className="flex-1 border border-[#e6d9bd]/80" />)}
            </div>
          </div>
        </>
      )}
      {kind === 'rolluik' && (
        <>
          <div className="absolute inset-x-0 top-0 h-[13%] border-[3px] border-[#e6d9bd] bg-[#2a2622]" />
          <div className="absolute inset-x-[4%] top-[13%] bottom-0 border-[3px] border-t-0 border-[#e6d9bd]">
            <div className={`absolute inset-[6%] border-2 border-[#e6d9bd]/60 ${glass}`} />
            <div className="absolute inset-x-0 top-0 h-full sd-m-roll bg-[repeating-linear-gradient(180deg,#2a2622_0_9px,#e6d9bd_9px_10px)]" style={{ transformOrigin: '50% 0' }} />
          </div>
        </>
      )}
    </div>
  );
}
