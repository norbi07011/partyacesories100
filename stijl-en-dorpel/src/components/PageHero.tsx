import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useLanguage } from '../i18n';
import { gsap, reducedMotion } from '../fx/core';
import { Spotlights, Dust } from '../fx/Backdrop';
import { SplitText, useIntroReady } from '../fx/components';
import { Picture, type MediaName } from './Media';

/* Shared sub-page hero: warm light, spotlights + dust, kinetic title. */
export function PageHero({
  badge, title, subtitle, children, aside, minH = 'min-h-[72svh]', image, imagePosition = '50% 50%',
}: {
  badge?: ReactNode;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  aside?: ReactNode;
  minH?: string;
  /** sfeerfoto rechts achter de titel */
  image?: MediaName;
  imagePosition?: string;
}) {
  const { lang } = useLanguage();
  const ready = useIntroReady();
  const sec = useRef<HTMLElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const side = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (reducedMotion()) return;
    const ctx = gsap.context(() => {
      const st = { trigger: sec.current, start: 'top top', end: 'bottom top', scrub: true };
      gsap.to(copy.current, { yPercent: -20, opacity: 0.2, ease: 'none', scrollTrigger: st });
      if (side.current) gsap.to(side.current, { yPercent: 12, ease: 'none', scrollTrigger: st });
    }, sec);
    return () => ctx.revert();
  }, []);

  useLayoutEffect(() => {
    if (!ready || reducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.from('.ph-fade', { y: 30, opacity: 0, filter: 'blur(10px)', duration: 1.1, ease: 'expo.out', stagger: 0.1, delay: 0.35, clearProps: 'filter' });
    }, sec);
    return () => ctx.revert();
  }, [ready]);

  return (
    <section ref={sec} className={`relative ${minH} flex items-center pt-32 pb-16 overflow-hidden`}>
      {image && (
        <div className="absolute inset-y-0 right-0 z-0 w-full lg:w-[64%] overflow-hidden" aria-hidden="true">
          <Picture name={image} position={imagePosition} eager drift={10} sizes="(min-width: 1024px) 64vw, 100vw" className="opacity-50 lg:opacity-100" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/35 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/35" />
        </div>
      )}
      <div className={`absolute inset-0 z-0 bg-[radial-gradient(70%_80%_at_78%_45%,rgba(191,159,110,.2),transparent_65%)] ${image ? 'opacity-40' : ''}`} />
      <div className={`absolute inset-0 z-0 bg-gradient-to-t from-black via-transparent ${image ? 'to-transparent' : 'to-black/40'}`} />
      {!image && <Spotlights className="z-[1] opacity-60" />}
      <Dust className="z-[2]" count={image ? 30 : 60} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 items-center">
        <div ref={copy} className="max-w-3xl">
          {badge && <div className="ph-fade mb-8">{badge}</div>}
          <SplitText
            key={`${lang}-${title}`}
            as="h1"
            text={title}
            mode={title.length > 22 ? 'words' : 'chars'}
            trigger="load"
            className="font-display text-5xl md:text-7xl lg:text-8xl text-white leading-[0.95] tracking-tight mb-8"
          />
          {subtitle && <p className="ph-fade text-lg md:text-xl text-zinc-300 leading-relaxed max-w-2xl mb-10">{subtitle}</p>}
          {children && <div className="ph-fade">{children}</div>}
        </div>
        {aside && <div ref={side} className="ph-fade hidden lg:block">{aside}</div>}
      </div>
    </section>
  );
}

export const Badge = ({ icon, children }: { icon?: ReactNode; children: ReactNode }) => (
  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-widest backdrop-blur">
    {icon}
    {children}
  </span>
);

export const Kicker = ({ children, center = false }: { children: ReactNode; center?: boolean }) => (
  <p className={`flex items-center gap-4 text-amber-300/90 text-[11px] font-medium uppercase tracking-[0.3em] md:tracking-[0.45em] mb-6 ${center ? 'justify-center' : ''}`}>
    <span className="h-px w-10 bg-amber-400/60" />
    {children}
    {center && <span className="h-px w-10 bg-amber-400/60" />}
  </p>
);
