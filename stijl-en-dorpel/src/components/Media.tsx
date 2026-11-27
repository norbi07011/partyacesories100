import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { gsap, reducedMotion } from '../fx/core';

/**
 * Sfeerfoto's in public/media/. Elke foto heeft een grote (1920) en een kleine (960) versie.
 * Nieuwe foto toevoegen: zet `naam.jpg` en `naam-960.jpg` in public/media/ en voeg de naam hier toe.
 */
export const MEDIA = {
  hall: { alt: ['Groene paneeldeur op een kier in een gang met visgraatvloer', 'Green panelled door ajar in a hallway with herringbone floor', 'Zielone drzwi płycinowe uchylone w korytarzu z podłogą w jodełkę'] },
  interior: { alt: ['Witte paneeldeuren in een lichte woonkamer', 'White panelled doors in a bright living room', 'Białe drzwi płycinowe w jasnym salonie'] },
  entrance: { alt: ['Antraciet voordeur met messing greep in een donkere bakstenen gevel', 'Anthracite front door with brass pull in a dark brick facade', 'Antracytowe drzwi wejściowe z mosiężnym pochwytem w ciemnej ceglanej elewacji'] },
} as const;

export type MediaName = keyof typeof MEDIA;

const base = import.meta.env.BASE_URL;
export const mediaUrl = (name: MediaName, small = false) => `${base}media/${name}${small ? '-960' : ''}.jpg`;

/**
 * A photo that fills its (positioned, overflow-hidden) parent. The image is slightly taller than
 * the box and drifts while the box crosses the viewport; on first sight it settles from a soft zoom.
 */
export function Picture({
  name, alt = '', className = '', position = '50% 50%', drift = 8, eager = false, sizes = '100vw',
}: {
  name: MediaName;
  alt?: string;
  className?: string;
  position?: string;
  /** vertical travel in % of the box; 0 switches the parallax off */
  drift?: number;
  eager?: boolean;
  sizes?: string;
}) {
  const img = useRef<HTMLImageElement>(null);

  useLayoutEffect(() => {
    const el = img.current;
    if (!el || !drift || reducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(el, { yPercent: -drift / 2 }, {
        yPercent: drift / 2, ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
    return () => ctx.revert();
  }, [drift]);

  const grow = drift ? `${drift}%` : '0%';
  return (
    <img
      ref={img}
      src={mediaUrl(name)}
      srcSet={`${mediaUrl(name, true)} 960w, ${mediaUrl(name)} 1920w`}
      sizes={sizes}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className={`absolute left-0 w-full max-w-none object-cover will-change-transform ${className}`}
      style={{ top: `-${grow}`, height: `calc(100% + ${grow} + ${grow})`, objectPosition: position } as CSSProperties}
    />
  );
}
