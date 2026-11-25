import {
  useEffect, useLayoutEffect, useRef, useState, type ReactNode, type CSSProperties, type ElementType,
} from 'react';
import { gsap, ScrollTrigger, scrollState, reducedMotion, isTouch, introState, follow } from './core';

/** true once the particle intro (if any) has finished. */
export function useIntroReady() {
  const [ready, setReady] = useState(() => !introState.pending);
  useEffect(() => {
    if (ready) return;
    const on = () => setReady(true);
    window.addEventListener('bb:intro-done', on);
    if (!introState.pending) setReady(true);
    return () => window.removeEventListener('bb:intro-done', on);
  }, [ready]);
  return ready;
}

/* ═══════════════════  Kinetic typography / split-text reveal  ═══════════════════ */

type SplitProps = {
  text: string;
  as?: ElementType;
  className?: string;
  mode?: 'chars' | 'words';
  trigger?: 'load' | 'scroll';
  delay?: number;
  stagger?: number;
  charClassName?: string;
};

export function SplitText({
  text, as: Tag = 'div', className = '', mode = 'chars', trigger = 'scroll',
  delay = 0, stagger, charClassName = '',
}: SplitProps) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const parts = el.querySelectorAll<HTMLElement>('[data-split]');
    const ctx = gsap.context(() => {
      const from = { x: 0, y: 0, yPercent: 115, rotateX: -85, opacity: 0, transformOrigin: '50% 100%' };
      const anim: gsap.TweenVars = {
        x: 0, y: 0, yPercent: 0, rotateX: 0, opacity: 1,
        duration: 1.05, ease: 'expo.out', delay,
        stagger: stagger ?? (mode === 'chars' ? 0.028 : 0.07),
        immediateRender: true,
        clearProps: 'transform,opacity',
      };
      if (trigger === 'scroll') anim.scrollTrigger = { trigger: el, start: 'top 88%', once: true };
      gsap.fromTo(parts, from, anim);
    }, el);
    return () => ctx.revert();
  }, [text, mode, trigger, delay, stagger]);

  const words = text.split(' ');
  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {words.map((word, wi) => (
        <span key={wi} aria-hidden="true" className="inline-block whitespace-nowrap" style={{ perspective: 600 }}>
          {mode === 'words' ? (
            <span className="inline-block overflow-hidden align-bottom pb-[0.08em] -mb-[0.08em]">
              <span data-split className={`inline-block will-change-transform ${charClassName}`}>{word}</span>
            </span>
          ) : (
            Array.from(word).map((ch, ci) => (
              <span key={ci} className="inline-block overflow-hidden align-bottom pb-[0.08em] -mb-[0.08em]">
                <span data-split className={`inline-block will-change-transform ${charClassName}`}>{ch}</span>
              </span>
            ))
          )}
          {wi < words.length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </Tag>
  );
}

/* ═══════════════════  Reveal on scroll (blur + 3D)  ═══════════════════ */

type RevealProps = {
  children: ReactNode;
  className?: string;
  variant?: 'up' | 'left' | 'right' | 'zoom' | 'flip';
  delay?: number;
  stagger?: number; // when set, animates direct children one after another
  as?: ElementType;
  style?: CSSProperties;
};

const FROM: Record<NonNullable<RevealProps['variant']>, gsap.TweenVars> = {
  up: { y: 80, rotateX: -22, scale: 0.96 },
  left: { x: -90, rotateY: 18 },
  right: { x: 90, rotateY: -18 },
  zoom: { scale: 0.82, z: -200 },
  flip: { rotateX: -70, y: 40, transformOrigin: '50% 0%' },
};

export function Reveal({ children, className = '', variant = 'up', delay = 0, stagger, as: Tag = 'div', style }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const targets = stagger !== undefined ? Array.from(el.children) : [el];
    const ctx = gsap.context(() => {
      gsap.from(targets, {
        ...FROM[variant],
        opacity: 0,
        filter: 'blur(14px)',
        duration: 1.2,
        ease: 'expo.out',
        delay,
        stagger: stagger ?? 0,
        clearProps: 'filter,transform',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      });
    }, el);
    return () => ctx.revert();
  }, [variant, delay, stagger]);
  return (
    <Tag ref={ref} className={className} style={{ perspective: 1200, ...style }}>
      {children}
    </Tag>
  );
}

/* ═══════════════════  Parallax (scroll-linked)  ═══════════════════ */

export function Parallax({ children, speed = 0.2, className = '', scale }: { children: ReactNode; speed?: number; className?: string; scale?: [number, number] }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(el,
        { yPercent: -speed * 100, ...(scale ? { scale: scale[0] } : {}) },
        {
          yPercent: speed * 100, ...(scale ? { scale: scale[1] } : {}), ease: 'none',
          scrollTrigger: { trigger: el.parentElement || el, start: 'top bottom', end: 'bottom top', scrub: true },
        });
    });
    return () => ctx.revert();
  }, [speed, scale]);
  return <div ref={ref} className={`will-change-transform ${className}`}>{children}</div>;
}

/* ═══════════════════  Magnetic button  ═══════════════════ */

export function Magnetic({ children, strength = 0.4, className = '' }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || isTouch() || reducedMotion()) return;
    const inner = el.firstElementChild as HTMLElement | null;
    const xTo = follow(el, 'x', { duration: 0.6, ease: 'power3.out' });
    const yTo = follow(el, 'y', { duration: 0.6, ease: 'power3.out' });
    const ixTo = inner ? follow(inner, 'x', { duration: 0.6, ease: 'power3.out' }) : null;
    const iyTo = inner ? follow(inner, 'y', { duration: 0.6, ease: 'power3.out' }) : null;
    let engaged = false;
    const reset = () => {
      engaged = false;
      gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.3)', overwrite: 'auto' });
      if (inner) gsap.to(inner, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.3)', overwrite: 'auto' });
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const reach = Math.max(r.width, r.height) * 0.9 + 40;
      if (Math.hypot(dx, dy) > reach) {
        if (engaged) reset();
        return;
      }
      engaged = true;
      xTo(dx * strength); yTo(dy * strength);
      ixTo?.(dx * strength * 0.35); iyTo?.(dy * strength * 0.35);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
    };
  }, [strength]);
  return <span ref={ref} className={`inline-block will-change-transform ${className}`}>{children}</span>;
}

/* ═══════════════════  3D tilt card with glare  ═══════════════════ */

export function TiltCard({
  children, className = '', max = 12, glare = true, scale = 1.02, style,
}: { children: ReactNode; className?: string; max?: number; glare?: boolean; scale?: number; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || isTouch() || reducedMotion()) return;
    const rx = follow(el, 'rotateX', { duration: 0.5, ease: 'power3.out' });
    const ry = follow(el, 'rotateY', { duration: 0.5, ease: 'power3.out' });
    const sc = follow(el, 'scale', { duration: 0.5, ease: 'power3.out' });
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      ry((px - 0.5) * max * 2);
      rx(-(py - 0.5) * max * 2);
      sc(scale);
      if (glareRef.current) {
        glareRef.current.style.opacity = '1';
        glareRef.current.style.background =
          `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(255,236,179,.38), rgba(255,255,255,.06) 35%, transparent 60%)`;
      }
    };
    const onLeave = () => {
      rx(0); ry(0); sc(1);
      if (glareRef.current) glareRef.current.style.opacity = '0';
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [max, scale]);
  return (
    <div style={{ perspective: 1000, ...style }} className="h-full">
      <div ref={ref} className={`relative h-full will-change-transform ${className}`} style={{ transformStyle: 'preserve-3d' }}>
        {children}
        {glare && (
          <div
            ref={glareRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 mix-blend-soft-light z-30"
          />
        )}
      </div>
    </div>
  );
}

/* ═══════════════════  Count-up on scroll / rolling number  ═══════════════════ */

export function CountUp({ to, suffix = '', prefix = '', duration = 2.2, className = '' }: { to: number; suffix?: string; prefix?: string; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion()) { el.textContent = `${prefix}${to}${suffix}`; return; }
    const obj = { v: 0 };
    el.textContent = `${prefix}0${suffix}`;
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 92%',
      once: true,
      onEnter: () => gsap.to(obj, {
        v: to, duration, ease: 'power3.out',
        onUpdate: () => { el.textContent = `${prefix}${Math.round(obj.v).toLocaleString('nl-NL')}${suffix}`; },
      }),
    });
    return () => st.kill();
  }, [to, suffix, prefix, duration]);
  return <span ref={ref} className={`tabular-nums ${className}`}>{prefix}{to}{suffix}</span>;
}

/* ═══════════════════  Scroll-velocity marquee  ═══════════════════ */

export function VelocityMarquee({
  items, baseSpeed = 1.2, reverse = false, className = '', itemClassName = '',
}: { items: string[]; baseSpeed?: number; reverse?: boolean; className?: string; itemClassName?: string }) {
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let x = 0;
    let skew = 0;
    let raf = 0;
    const dir = reverse ? -1 : 1;
    const loop = () => {
      const half = el.scrollWidth / 2;
      const v = scrollState.velocity;
      const speed = (baseSpeed + Math.abs(v) * 0.35) * dir * (v < 0 ? -1 : 1);
      x -= reducedMotion() ? 0 : speed;
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      skew += (Math.max(-14, Math.min(14, -v * 0.6)) - skew) * 0.12;
      el.style.transform = `translate3d(${x}px,0,0) skewX(${skew}deg)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [baseSpeed, reverse, items]);
  const row = [...items, ...items];
  return (
    <div className={`overflow-hidden select-none ${className}`} aria-hidden="true">
      <div ref={track} className="flex w-max will-change-transform">
        {[0, 1].map((k) => (
          <div key={k} className="flex shrink-0">
            {row.map((it, i) => (
              <span key={`${k}-${i}`} className={`flex items-center shrink-0 ${itemClassName}`}>
                {it}
                <WindowGlyph className="mx-8 md:mx-12 w-[0.6em] h-[0.6em] text-amber-500 shrink-0" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export const WindowGlyph = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect x="6" y="2" width="12" height="20" />
    <circle cx="14.5" cy="12.5" r="0.9" fill="currentColor" />
  </svg>
);

/* ═══════════════════  Scroll-driven text fill (mask reveal)  ═══════════════════ */

export function TextFill({ text, className = '' }: { text: string; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!wrap.current || !fill.current) return;
    if (reducedMotion()) { fill.current.style.clipPath = 'inset(0 0 0 0)'; return; }
    const ctx = gsap.context(() => {
      gsap.fromTo(fill.current,
        { clipPath: 'inset(0 100% 0 0)' },
        {
          clipPath: 'inset(0 0% 0 0)', ease: 'none',
          scrollTrigger: { trigger: wrap.current, start: 'top 95%', end: 'bottom bottom', scrub: 0.6 },
        });
      gsap.fromTo(wrap.current, { letterSpacing: '0.12em', scale: 0.92 }, {
        letterSpacing: '-0.02em', scale: 1, ease: 'none',
        scrollTrigger: { trigger: wrap.current, start: 'top bottom', end: 'bottom bottom', scrub: true },
      });
    });
    return () => ctx.revert();
  }, [text]);
  return (
    <div ref={wrap} className={`relative select-none leading-[0.85] font-black uppercase whitespace-nowrap ${className}`} aria-hidden="true">
      <div className="bb-text-outline">{text}</div>
      <div ref={fill} className="absolute inset-0 bb-text-gold" style={{ clipPath: 'inset(0 100% 0 0)' }}>{text}</div>
    </div>
  );
}

/* ═══════════════════  Floating / levitating (bob)  ═══════════════════ */

export function Float({ children, amp = 14, duration = 4, delay = 0, className = '' }: { children: ReactNode; amp?: number; duration?: number; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || reducedMotion()) return;
    const tw = gsap.to(ref.current, {
      y: -amp, rotation: amp * 0.08, duration, delay, ease: 'sine.inOut', yoyo: true, repeat: -1,
    });
    return () => { tw.kill(); };
  }, [amp, duration, delay]);
  return <div ref={ref} className={`will-change-transform ${className}`}>{children}</div>;
}
