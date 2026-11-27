import { useEffect, useRef, useState } from 'react';
import { reducedMotion } from './core';
import { createWallStudio, type StudioKind } from './wallStudio';
import { InsulationMotion } from '../components/Insulation';

/* Mounts one 3D cutaway. The WebGL context is created when the tile first comes near the
 * screen and runs only while visible; if WebGL is unavailable the line drawing is shown. */
export function Studio3D({ kind, className = '' }: { kind: StudioKind; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let api: ReturnType<typeof createWallStudio> = null;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !api) {
        api = createWallStudio(el, kind, { reduce: reducedMotion() });
        if (!api) { setFailed(true); io.disconnect(); return; }
        (el as HTMLDivElement & { __studio?: unknown }).__studio = api;
      }
      if (api) { if (e.isIntersecting) api.start(); else api.stop(); }
    }, { rootMargin: '120px' });
    io.observe(el);
    return () => { io.disconnect(); api?.destroy(); };
  }, [kind]);
  if (failed) return <InsulationMotion kind={kind} className={`${className} p-[14%]`} />;
  return <div ref={host} className={`sd-studio ${className}`} aria-hidden="true" />;
}
