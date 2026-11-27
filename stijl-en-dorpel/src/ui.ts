import { useEffect } from 'react';
import type { L } from './i18n';
import { company } from './company';

/** Shared interface strings: [NL, EN, PL]. */
export const UI = {
  nav: {
    doors: ['Producten', 'Products', 'Produkty'],
    configurator: ['Configurator', 'Configurator', 'Konfigurator'],
    services: ['Diensten', 'Services', 'Usługi'],
    insulation: ['Isolatie', 'Insulation', 'Izolacja'],
    measure: ['Inmeten', 'Measuring', 'Pomiar'],
    about: ['Over ons', 'About', 'O nas'],
    contact: ['Contact', 'Contact', 'Kontakt'],
    quote: ['Offertelijst', 'Quote list', 'Lista wyceny'],
  },
  from: ['vanaf', 'from', 'od'],
  inclVat: ['incl. btw', 'incl. VAT', 'z VAT'],
  indicative: ['Richtprijs incl. btw. De definitieve prijs volgt na het inmeten.', 'Guide price incl. VAT. The final price follows after the survey.', 'Cena orientacyjna z VAT. Ostateczna cena po pomiarze.'],
  details: ['Bekijk details', 'View details', 'Zobacz szczegóły'],
  configure: ['Stel samen', 'Configure', 'Skonfiguruj'],
  addToQuote: ['Op de offertelijst', 'Add to quote list', 'Dodaj do wyceny'],
  added: ['Toegevoegd', 'Added', 'Dodano'],
  requestQuote: ['Offerte aanvragen', 'Request a quote', 'Poproś o wycenę'],
  bookSurvey: ['Inmeetafspraak maken', 'Book a survey', 'Umów pomiar'],
  viewDoors: ['Bekijk alle deuren', 'View all doors', 'Zobacz wszystkie drzwi'],
  interior: ['Binnendeuren', 'Interior doors', 'Drzwi wewnętrzne'],
  exterior: ['Buitendeuren', 'Exterior doors', 'Drzwi zewnętrzne'],
  frames: ['Kozijnen', 'Frames', 'Futryny'],
  hardware: ['Beslag & tochtwering', 'Hardware & seals', 'Okucia i uszczelki'],
  all: ['Alles', 'All', 'Wszystko'],
  close: ['Sluiten', 'Close', 'Zamknij'],
  menu: ['Menu', 'Menu', 'Menu'],
  legal: ['Juridisch', 'Legal', 'Informacje prawne'],
  privacy: ['Privacyverklaring', 'Privacy statement', 'Polityka prywatności'],
  terms: ['Algemene voorwaarden', 'Terms & conditions', 'Regulamin'],
  cookies: ['Cookies', 'Cookies', 'Cookies'],
  rights: ['Alle rechten voorbehouden.', 'All rights reserved.', 'Wszelkie prawa zastrzeżone.'],
  footer: [
    'Deuren en kozijnen vervangen zonder gedoe: kiezen, inmeten, maken en monteren door één partij.',
    'Replacing doors and frames without the hassle: choosing, measuring, making and fitting by one company.',
    'Wymiana drzwi i futryn bez kłopotu: wybór, pomiar, produkcja i montaż w jednej firmie.',
  ],
} satisfies Record<string, L | Record<string, L>>;

export function useDocumentTitle(pageTitle?: string) {
  useEffect(() => {
    const base = `${company.name} – ${company.tagline}`;
    document.title = pageTitle ? `${pageTitle} | ${company.name}` : base;
    return () => { document.title = base; };
  }, [pageTitle]);
}
