/* ─────────────────────────────────────────────────────────────────────────
 * Bedrijfsgegevens — ALLES HIER IS EEN PLACEHOLDER.
 * Vervang telefoon, e-mail, adres, KvK en btw-nummer door de echte gegevens
 * vóórdat de site live gaat. Deze waarden worden overal op de site gebruikt.
 * ───────────────────────────────────────────────────────────────────────── */
export const company = {
  name: 'Stijl & Dorpel',
  legalName: 'Stijl & Dorpel',
  tagline: 'Deuren & kozijnen',
  phoneDisplay: '085 000 00 00',
  phoneHref: 'tel:+31850000000',
  whatsappHref: 'https://wa.me/31600000000',
  email: 'info@stijlendorpel.nl',
  street: 'Voorbeeldstraat 1',
  postcode: '0000 AA',
  city: 'Plaatsnaam',
  kvk: '00000000',
  btw: 'NL000000000B01',
  url: 'https://www.stijlendorpel.nl',
  hours: 'Ma–Vr 08:00–17:30 · Za 09:00–13:00',
};

/** Richtprijs fabriekscollectie = catalogusprijs netto (PLN) / koers × opslag. Pas aan na de inkoopafspraken. */
export const PRICING = { plnPerEur: 4.3, markup: 1.8 };

/** Alle prijzen in src/data/doors.ts zijn richtprijzen (placeholders). */
export const PRICES_ARE_INDICATIVE = true;

/** Kortingscodes: code (hoofdletters maken niet uit) → korting in procenten op de richtprijs. */
export const DISCOUNT_CODES: Record<string, number> = { LEGGINS2: 2, OCTAGON20: 20, SUMMER30: 30 };
