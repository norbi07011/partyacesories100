import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

/** Shared, mutable scroll state written by Lenis and read by rAF loops. */
export const scrollState = {
  lenis: null as Lenis | null,
  velocity: 0,
  direction: 1 as 1 | -1 | 0,
  scroll: 0,
  progress: 0,
};

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const isTouch = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: none), (pointer: coarse)').matches;

export const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 768;

/** Eased "follow" setter for pointer-driven effects (like gsap.quickTo, but
 * tolerant of other tweens touching the same element). */
export const follow = (el: gsap.TweenTarget, prop: string, vars: { duration?: number; ease?: string } = {}) =>
  (value: number) => {
    gsap.to(el, { [prop]: value, duration: vars.duration ?? 0.6, ease: vars.ease ?? 'power3.out', overwrite: 'auto' });
  };

/** Stop/start smooth scrolling (for modals and overlays). */
export const lockScroll = (locked: boolean) => {
  const l = scrollState.lenis;
  if (l) {
    if (locked) l.stop();
    else l.start();
  }
  document.documentElement.style.overflow = locked ? 'hidden' : '';
};

export const scrollToTop = (immediate = true) => {
  if (scrollState.lenis) scrollState.lenis.scrollTo(0, { immediate, force: true });
  else window.scrollTo(0, 0);
};

/* ──────────────────────────  Screen shake  ────────────────────────── */

export const screenShake = (intensity = 14, duration = 0.5, target: string | Element = '#main-content') => {
  if (reducedMotion()) return;
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return;
  const steps = Math.round(duration / 0.04);
  const tl = gsap.timeline({ onComplete: () => gsap.set(el, { clearProps: 'transform' }) });
  for (let i = 0; i < steps; i++) {
    const falloff = 1 - i / steps;
    tl.to(el, {
      x: (Math.random() - 0.5) * 2 * intensity * falloff,
      y: (Math.random() - 0.5) * 2 * intensity * falloff,
      rotation: (Math.random() - 0.5) * 1.2 * falloff,
      duration: 0.04,
      ease: 'none',
    });
  }
  tl.to(el, { x: 0, y: 0, rotation: 0, duration: 0.08 });
};

/* ──────────────────────────  Confetti  ──────────────────────────
 * Canvas particle burst. Pieces are tiny window frames (kozijntjes),
 * glass shards and gold squares – the construction take on confetti. */

type Piece = {
  x: number; y: number; vx: number; vy: number;
  rot: number; vr: number; size: number; color: string;
  shape: 0 | 1 | 2; life: number; tilt: number; vt: number;
};

const CONFETTI_COLORS = ['#bf9f6e', '#cbb084', '#e6d9bd', '#a2845a', '#ffffff', '#a1a1aa'];

export const confettiBurst = (
  x = window.innerWidth / 2,
  y = window.innerHeight / 2,
  opts: { count?: number; spread?: number; power?: number; angle?: number } = {},
) => {
  if (reducedMotion()) return;
  const { count = 120, spread = Math.PI * 2, power = 14, angle = -Math.PI / 2 } = opts;
  const canvas = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  Object.assign(canvas.style, {
    position: 'fixed', inset: '0', width: '100vw', height: '100vh',
    pointerEvents: 'none', zIndex: '400',
  });
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  const pieces: Piece[] = Array.from({ length: count }, () => {
    const a = angle + (Math.random() - 0.5) * spread;
    const v = power * (0.45 + Math.random() * 0.75);
    return {
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.4,
      size: 7 + Math.random() * 9,
      color: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
      shape: Math.floor(Math.random() * 3) as 0 | 1 | 2,
      life: 1,
      tilt: Math.random() * Math.PI,
      vt: 0.08 + Math.random() * 0.12,
    };
  });

  let raf = 0;
  const draw = () => {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    let alive = 0;
    for (const p of pieces) {
      p.vy += 0.32;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.tilt += p.vt;
      p.life -= 0.0055;
      if (p.life <= 0 || p.y > window.innerHeight + 40) continue;
      alive++;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.abs(Math.cos(p.tilt)) * 0.8 + 0.2); // 3D flutter
      ctx.globalAlpha = Math.min(1, p.life * 2);
      const s = p.size;
      if (p.shape === 0) {
        // mini window frame with a cross mullion
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(-s / 2, -s / 2, s, s);
        ctx.beginPath();
        ctx.moveTo(0, -s / 2); ctx.lineTo(0, s / 2);
        ctx.moveTo(-s / 2, 0); ctx.lineTo(s / 2, 0);
        ctx.stroke();
      } else if (p.shape === 1) {
        // glass shard
        ctx.fillStyle = 'rgba(186, 230, 253, 0.65)';
        ctx.beginPath();
        ctx.moveTo(0, -s / 2); ctx.lineTo(s / 2, s / 3); ctx.lineTo(-s / 3, s / 2);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(-s / 2, -s / 4, s, s / 2);
      }
      ctx.restore();
    }
    if (alive > 0) raf = requestAnimationFrame(draw);
    else {
      cancelAnimationFrame(raf);
      canvas.remove();
    }
  };
  raf = requestAnimationFrame(draw);
};

/* ──────────────────────────  Fly-to-target  ──────────────────────────
 * Clones an element (usually a service photo) and flies it in an arc
 * into the target – our version of "fly to cart": fly to the quote. */

export const flyTo = (source: Element, targetSelector = '[data-fly-target]'): Promise<void> =>
  new Promise((resolve) => {
    const target = document.querySelector(targetSelector);
    if (!target || reducedMotion()) return resolve();
    const s = source.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    const clone = source.cloneNode(true) as HTMLElement;
    Object.assign(clone.style, {
      position: 'fixed', left: `${s.left}px`, top: `${s.top}px`,
      width: `${s.width}px`, height: `${s.height}px`, margin: '0',
      zIndex: '500', pointerEvents: 'none', borderRadius: '24px', overflow: 'hidden',
      boxShadow: '0 30px 80px rgba(191, 159, 110,.45)', objectFit: 'cover',
    });
    document.body.appendChild(clone);
    const dx = t.left + t.width / 2 - (s.left + s.width / 2);
    const dy = t.top + t.height / 2 - (s.top + s.height / 2);
    const scale = Math.max(0.04, Math.min(t.width / s.width, 0.12));
    const proxy = { p: 0 };
    gsap.to(proxy, {
      p: 1,
      duration: 0.95,
      ease: 'power2.in',
      onUpdate: () => {
        const p = proxy.p;
        // quadratic arc: lift up then dive into the target
        const arc = -Math.sin(p * Math.PI) * Math.min(260, Math.abs(dy) * 0.6 + 120);
        clone.style.transform = `translate(${dx * p}px, ${dy * p + arc}px) scale(${1 - (1 - scale) * p}) rotate(${p * -18}deg)`;
        clone.style.opacity = String(1 - Math.max(0, p - 0.85) * 6);
      },
      onComplete: () => {
        clone.remove();
        gsap.fromTo(target, { scale: 1.35 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.35)', clearProps: 'scale' });
        confettiBurst(t.left + t.width / 2, t.top + t.height / 2, { count: 28, power: 7, spread: Math.PI * 2 });
        resolve();
      },
    });
  });

/* ──────────────────────────  Intro state  ────────────────────────── */

export const introState = { pending: false };
export const finishIntro = () => {
  introState.pending = false;
  window.dispatchEvent(new CustomEvent('bb:intro-done'));
};

/* ──────────────────────────  Victory scene trigger  ────────────────────────── */

export const celebrate = () => window.dispatchEvent(new CustomEvent('bb:celebrate'));
