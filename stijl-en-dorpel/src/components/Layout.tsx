import { SearchBox } from './SearchBox';
import { useState, useEffect, useRef, type ReactNode, type CSSProperties } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Menu, X, Phone, Mail, MapPin, ArrowUpRight, ClipboardList, Clock, MessageCircle } from 'lucide-react';
import { useLanguage, useT, type Lang } from '../i18n';
import { UI } from '../ui';
import { company } from '../company';
import { useQuote } from '../quote';
import { SmoothScroll, ScrollProgress, PageTransitions } from '../fx/Engine';
import { Magnetic, TextFill, Reveal } from '../fx/components';
import { scrollState, lockScroll } from '../fx/core';

export const Logo = ({ className = 'w-10 h-10' }: { className?: string }) => (
  <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
    <rect width="64" height="64" rx="14" fill="#141210" stroke="rgba(203,176,132,.35)" />
    <rect x="19" y="10" width="26" height="44" rx="2" fill="none" stroke="#cbb084" strokeWidth="3" />
    <path d="M19 54h26" stroke="#e6d9bd" strokeWidth="5" strokeLinecap="round" />
    <circle cx="39" cy="33" r="2.6" fill="#e6d9bd" />
  </svg>
);

const LanguageSwitcher = () => {
  const { lang: currentLang, setLang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const languages: { code: Lang; flag: string }[] = [
    { code: 'NL', flag: '🇳🇱' },
    { code: 'EN', flag: '🇬🇧' },
    { code: 'PL', flag: '🇵🇱' },
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select language"
        className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-zinc-900/70 backdrop-blur border border-zinc-800 hover:border-amber-500 transition-colors text-white text-sm font-medium"
      >
        <span>{languages.find((l) => l.code === currentLang)?.flag}</span>
        <span>{currentLang}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, rotateX: -30 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, y: 10, rotateX: -30 }}
            style={{ transformOrigin: 'top' }}
            className="absolute right-0 mt-2 w-32 bg-zinc-900/95 backdrop-blur border border-zinc-800 rounded-xl overflow-hidden shadow-2xl z-50"
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => { setLang(lang.code); setIsOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors hover:bg-zinc-800 ${currentLang === lang.code ? 'text-amber-500 bg-zinc-800/50' : 'text-zinc-400'}`}
              >
                <span>{lang.flag}</span>
                <span className="text-sm font-medium">{lang.code}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const QuotePill = ({ compact = false }: { compact?: boolean }) => {
  const t = useT();
  const { count } = useQuote();
  return (
    <Link
      to="/offertelijst"
      data-fly-target=""
      aria-label={`${t(UI.nav.quote)} (${count})`}
      className={`relative flex items-center gap-2 rounded-full border border-amber-200/40 text-amber-100 text-sm font-medium tracking-wide hover:bg-amber-200 hover:text-black hover:border-amber-200 transition-colors ${compact ? 'w-11 h-11 justify-center' : 'pl-4 pr-5 py-2.5'}`}
    >
      <ClipboardList className="w-4 h-4" />
      {!compact && <span>{t(UI.nav.quote)}</span>}
      {count > 0 && (
        <span className={`min-w-5 h-5 px-1.5 sd-round bg-amber-400 text-black text-[11px] font-bold flex items-center justify-center ${compact ? 'absolute -top-1 -right-1' : ''}`}>
          {count}
        </span>
      )}
    </Link>
  );
};

/* Smart sticky header: hides when scrolling down, returns when scrolling up. */
const Navbar = () => {
  const t = useT();
  const [isScrolled, setIsScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let raf = 0;
    let last = window.scrollY;
    const loop = () => {
      const y = scrollState.lenis ? scrollState.lenis.scroll : window.scrollY;
      setIsScrolled(y > 50);
      if (Math.abs(y - last) > 6) {
        setHidden(y > last && y > 240);
        last = y;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    lockScroll(isMobileMenuOpen);
    return () => lockScroll(false);
  }, [isMobileMenuOpen]);

  useEffect(() => { setIsMobileMenuOpen(false); }, [location.pathname]);

  const navLinks = [
    { name: t(UI.nav.doors), href: '/producten' },
    { name: t(UI.nav.configurator), href: '/configurator' },
    { name: t(UI.nav.services), href: '/diensten' },
    { name: t(UI.nav.insulation), href: '/isolatie' },
    { name: t(UI.nav.measure), href: '/inmeten' },
    { name: t(UI.nav.about), href: '/over-ons' },
    { name: t(UI.nav.contact), href: '/contact' },
  ];

  const solid = isScrolled || location.pathname !== '/';

  return (
    <>
      <nav
        style={{ viewTransitionName: 'site-header' } as CSSProperties}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${hidden && !isMobileMenuOpen ? '-translate-y-full' : 'translate-y-0'} ${solid ? 'bg-black/70 backdrop-blur-xl py-3 border-b border-zinc-800/80' : 'bg-transparent py-6'}`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center space-x-3 group shrink-0">
            <span className="text-lg sm:text-2xl text-white font-display whitespace-nowrap">
              Stijl <span className="text-amber-200/70">&amp;</span> <span className="italic text-amber-200">Dorpel</span>
            </span>
          </Link>

          <div className="hidden xl:flex items-center space-x-6">
            {navLinks.map((link) => {
              const active = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative text-sm font-medium transition-colors group py-1 ${active ? 'text-amber-500' : 'text-zinc-300 hover:text-white'}`}
                >
                  {link.name}
                  <span className={`absolute left-0 -bottom-0.5 h-px bg-amber-500 transition-all duration-500 ${active ? 'w-full' : 'w-0 group-hover:w-full'}`} />
                </Link>
              );
            })}
            <SearchBox />
            <LanguageSwitcher />
            <Magnetic strength={0.35}><QuotePill /></Magnetic>
          </div>

          <div className="xl:hidden flex items-center space-x-2">
            <SearchBox compact />
            <LanguageSwitcher />
            <QuotePill compact />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="relative z-[60] w-11 h-11 rounded-full bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-white"
              aria-label={isMobileMenuOpen ? t(UI.close) : t(UI.menu)}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ clipPath: 'circle(0% at 92% 4%)' }}
            animate={{ clipPath: 'circle(150% at 92% 4%)' }}
            exit={{ clipPath: 'circle(0% at 92% 4%)' }}
            transition={{ duration: 0.7, ease: [0.7, 0, 0.3, 1] }}
            className="xl:hidden fixed inset-0 z-[45] bg-black/95 backdrop-blur-xl flex flex-col justify-center px-8 pt-20 pb-8 overflow-y-auto"
            data-lenis-prevent
          >
            <div className="flex flex-col space-y-3">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ y: 60, opacity: 0, rotateX: -60 }}
                  animate={{ y: 0, opacity: 1, rotateX: 0 }}
                  transition={{ delay: 0.25 + i * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    to={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-baseline gap-4 text-4xl font-display tracking-tight ${location.pathname === link.href ? 'text-amber-500' : 'text-white'}`}
                  >
                    <span className="text-xs font-mono text-zinc-600">0{i + 1}</span>
                    {link.name}
                  </Link>
                </motion.div>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mt-10 pt-8 border-t border-white/10"
            >
              <div className="grid grid-cols-2 gap-3 mb-7">
                <Link to="/configurator" onClick={() => setIsMobileMenuOpen(false)} className="h-12 rounded-full bg-amber-200 text-black text-sm font-semibold flex items-center justify-center">{t(UI.configure)}</Link>
                <Link to="/inmeten" onClick={() => setIsMobileMenuOpen(false)} className="h-12 rounded-full border border-white/25 text-white text-sm font-medium flex items-center justify-center text-center leading-tight px-3">{t(UI.bookSurvey)}</Link>
              </div>
              <div className="flex flex-wrap items-center gap-x-7 gap-y-3 text-sm">
                <a href={company.phoneHref} className="inline-flex items-center gap-2 text-amber-200 font-medium"><Phone className="w-4 h-4" /> {company.phoneDisplay}</a>
                <a href={`mailto:${company.email}`} className="inline-flex items-center gap-2 text-white/70"><Mail className="w-4 h-4" /> {company.email}</a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const Footer = () => {
  const t = useT();
  return (
    <footer className="relative bg-black/80 backdrop-blur-sm pt-24 border-t border-zinc-900 overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-6">
        <Reveal stagger={0.12} className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <span className="text-2xl text-white font-display">
                Stijl <span className="text-amber-200/70">&amp;</span> <span className="italic text-amber-200">Dorpel</span>
              </span>
            </div>
            <p className="text-zinc-500 max-w-sm leading-relaxed mb-8">{t(UI.footer)}</p>
            <div className="space-y-3 text-sm">
              <a href={company.phoneHref} className="flex items-center gap-3 text-zinc-400 hover:text-amber-500 transition-colors">
                <Phone className="w-4 h-4 text-amber-500" /> {company.phoneDisplay}
              </a>
              <a href={`mailto:${company.email}`} className="flex items-center gap-3 text-zinc-400 hover:text-amber-500 transition-colors">
                <Mail className="w-4 h-4 text-amber-500" /> {company.email}
              </a>
              <p className="flex items-center gap-3 text-zinc-400">
                <MapPin className="w-4 h-4 text-amber-500" /> {company.street}, {company.postcode} {company.city}
              </p>
              <p className="flex items-center gap-3 text-zinc-400">
                <Clock className="w-4 h-4 text-amber-500" /> {company.hours}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-sm">{t(UI.menu)}</h4>
            <ul className="space-y-4">
              {([
                ['/deuren', UI.nav.doors], ['/configurator', UI.nav.configurator], ['/diensten', UI.nav.services], ['/isolatie', UI.nav.insulation],
                ['/inmeten', UI.nav.measure], ['/over-ons', UI.nav.about], ['/contact', UI.nav.contact],
              ] as const).map(([href, label]) => (
                <li key={href}>
                  <Link to={href} className="group inline-flex items-center gap-1 text-zinc-500 hover:text-amber-500 transition-colors">
                    {t(label)}
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-sm">{t(UI.legal)}</h4>
            <ul className="space-y-4">
              <li><Link to="/privacy" className="text-zinc-500 hover:text-amber-500 transition-colors">{t(UI.privacy)}</Link></li>
              <li><Link to="/voorwaarden" className="text-zinc-500 hover:text-amber-500 transition-colors">{t(UI.terms)}</Link></li>
              <li><Link to="/cookies" className="text-zinc-500 hover:text-amber-500 transition-colors">{t(UI.cookies)}</Link></li>
            </ul>
            <p className="mt-8 text-zinc-600 text-xs leading-relaxed">KvK {company.kvk}<br />Btw {company.btw}</p>
          </div>
        </Reveal>

        <div className="pt-8 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-zinc-600 text-sm">© {new Date().getFullYear()} {company.legalName}. {t(UI.rights)}</p>
        </div>
      </div>

      <div className="relative mt-10 pb-6 flex justify-center">
      </div>
    </footer>
  );
};

export const Layout = ({ children }: { children: ReactNode }) => (
  <div className="relative text-white font-sans selection:bg-amber-500 selection:text-black min-h-screen flex flex-col">
    <SmoothScroll />
    <PageTransitions />
    <ScrollProgress />
    <a
      href="#main-content"
      onClick={(e) => { e.preventDefault(); document.getElementById('main-content')?.focus(); }}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-amber-500 focus:text-black focus:rounded-lg focus:font-bold"
    >
      Skip to content
    </a>
    <Navbar />
    <main id="main-content" tabIndex={-1} className="relative z-10 flex-grow outline-none">
      {children}
    </main>
    <div className="relative z-10">
      <Footer />
    </div>
    <a
      href={company.whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp"
      className="fixed z-40 right-4 bottom-4 md:right-6 md:bottom-6 inline-flex items-center gap-2 pl-4 pr-5 h-12 rounded-full bg-[#1f8f4e] hover:bg-[#25a55a] text-white text-sm font-semibold shadow-[0_12px_30px_-8px_rgba(0,0,0,.7)] transition-colors"
    >
      <MessageCircle className="w-5 h-5" /> <span className="hidden sm:inline">WhatsApp</span>
    </a>
  </div>
);
