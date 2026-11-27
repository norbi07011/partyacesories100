import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Lang = 'NL' | 'EN' | 'PL';
/** One string in every language: [NL, EN, PL]. */
export type L = readonly [string, string, string];

const IDX: Record<Lang, 0 | 1 | 2> = { NL: 0, EN: 1, PL: 2 };
const LANGS: Lang[] = ['NL', 'EN', 'PL'];

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void } | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem('sd-lang') as Lang | null;
      if (saved && LANGS.includes(saved)) return saved;
    } catch { /* storage blocked */ }
    return 'NL';
  });
  useEffect(() => {
    try { localStorage.setItem('sd-lang', lang); } catch { /* ignore */ }
    document.documentElement.lang = lang.toLowerCase();
  }, [lang]);
  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
};

export const useLanguage = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useLanguage must be used within LanguageProvider');
  return c;
};

/** Returns a translator: t(['nl', 'en', 'pl']). */
export const useT = () => {
  const { lang } = useLanguage();
  const i = IDX[lang];
  return (l: L) => l[i];
};

export const euro = (n: number) =>
  new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
