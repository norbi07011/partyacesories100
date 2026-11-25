import { useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useLocation, useNavigate, type NavigateOptions } from 'react-router-dom';
import Lenis from 'lenis';
import { gsap, ScrollTrigger, scrollState, reducedMotion, scrollToTop } from './core';

/* ──────────────────────────  Smooth / inertia scroll (Lenis)  ────────────────────────── */

export function SmoothScroll() {
  useEffect(() => {
    if (reducedMotion()) return;
    const lenis = new Lenis({
      duration: 1.3,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.5,
    });
    scrollState.lenis = lenis;
    lenis.on('scroll', (l: Lenis) => {
      scrollState.velocity = l.velocity;
      scrollState.direction = l.direction as 1 | -1 | 0;
      scrollState.scroll = l.scroll;
      scrollState.progress = l.progress;
      ScrollTrigger.update();
    });
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      scrollState.lenis = null;
    };
  }, []);

  // Keep ScrollTrigger measurements fresh as images/fonts/lazy pages change the layout.
  useEffect(() => {
    let t: number | undefined;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(t);
      t = window.setTimeout(() => ScrollTrigger.refresh(), 180);
    });
    ro.observe(document.body);
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener('load', onLoad);
    return () => {
      ro.disconnect();
      window.removeEventListener('load', onLoad);
      window.clearTimeout(t);
    };
  }, []);

  // Fallback scroll metrics when Lenis is disabled (reduced motion).
  useEffect(() => {
    if (!reducedMotion()) return;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollState.scroll = window.scrollY;
      scrollState.progress = max > 0 ? window.scrollY / max : 0;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return null;
}

/* ──────────────────────────  Scroll progress bar  ────────────────────────── */

export function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const y = scrollState.lenis ? scrollState.lenis.scroll : window.scrollY;
      const p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 h-[3px] z-[70] pointer-events-none" aria-hidden="true">
      <div
        ref={bar}
        className="h-full origin-left bg-gradient-to-r from-amber-700 via-amber-400 to-amber-200 shadow-[0_0_12px_rgba(191, 159, 110,0.9)]"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  );
}

/* ──────────────────────────  Page transitions (View Transitions API)  ────────────────────────── */

const runTransition = (update: () => void) => {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  const apply = () => {
    flushSync(update);
    scrollToTop(true);
  };
  if (doc.startViewTransition && !reducedMotion()) doc.startViewTransition(apply);
  else apply();
};

/** navigate() wrapped in a page transition. */
export function useTransitionNavigate() {
  const navigate = useNavigate();
  return useCallback(
    (to: string, options?: NavigateOptions) => runTransition(() => navigate(to, options)),
    [navigate],
  );
}

/** Intercepts internal link clicks and runs them through a View Transition. */
export function PageTransitions() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a');
      if (!a) return;
      if ((a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      const href = a.getAttribute('href');
      if (!href) return;
      let path: string | null = null;
      if (href.startsWith('#/')) path = href.slice(1); // hash router (preview builds)
      else if (href.startsWith('/') && !href.startsWith('//')) path = href;
      if (!path) return;
      e.preventDefault();
      if (path === pathRef.current) {
        scrollState.lenis ? scrollState.lenis.scrollTo(0, { duration: 1.4 }) : window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      runTransition(() => navigate(path!));
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [navigate]);

  // Reset scroll + re-measure triggers on every route change.
  useEffect(() => {
    scrollToTop(true);
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 60);
    return () => window.clearTimeout(id);
  }, [location.pathname]);

  return null;
}
