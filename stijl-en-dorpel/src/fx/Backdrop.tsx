import { useEffect, useRef } from 'react';
import { reducedMotion, isMobile, scrollState } from './core';

/* ──────────────────────────  Volumetric spotlights  ────────────────────────── */

export function Spotlights({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden="true">
      <div className="bb-beam bb-beam-1" />
      <div className="bb-beam bb-beam-2" />
      <div className="bb-beam bb-beam-3" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black to-transparent" />
    </div>
  );
}

/* ──────────────────────────  Dust particles in the light  ────────────────────────── */

export function Dust({ count = 90, className = '' }: { count?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;
    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const n = isMobile() ? Math.round(count * 0.5) : count;
    const ps = Array.from({ length: n }, () => ({
      x: Math.random(), y: Math.random(), z: Math.random(),
      vx: (Math.random() - 0.5) * 0.00025, vy: -0.0001 - Math.random() * 0.00035,
      ph: Math.random() * Math.PI * 2,
    }));
    let raf = 0;
    const loop = (now: number) => {
      ctx.clearRect(0, 0, w, h);
      const vel = scrollState.velocity * 0.00004;
      for (const p of ps) {
        p.x += p.vx + Math.sin(now / 2000 + p.ph) * 0.00015;
        p.y += p.vy - vel;
        if (p.y < -0.02) p.y = 1.02;
        if (p.y > 1.02) p.y = -0.02;
        if (p.x < -0.02) p.x = 1.02;
        if (p.x > 1.02) p.x = -0.02;
        const tw = 0.5 + 0.5 * Math.sin(now / 600 + p.ph * 3);
        const r = 0.6 + p.z * 1.8;
        ctx.globalAlpha = (0.15 + p.z * 0.55) * tw;
        ctx.fillStyle = p.z > 0.7 ? '#e6d9bd' : '#cbb084';
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(loop);
    };
    if (!reducedMotion()) raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [count]);
  return <canvas ref={ref} aria-hidden="true" className={`absolute inset-0 w-full h-full pointer-events-none ${className}`} />;
}
