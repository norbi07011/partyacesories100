-- Add Letter Lights Product (Świecące Litery)
-- This product allows customers to select individual letters (€10 per letter)

INSERT INTO products (
  id,
  name_nl,
  name_en,
  name_pl,
  description_nl,
  description_en,
  description_pl,
  price,
  original_price,
  image_url,
  category,
  created_at,
  updated_at
) VALUES (
  'e7f8a9b0-1234-5678-90ab-cdef12345678', -- UUID for letter lights
  'Verlichte Marquee Letters',
  'Illuminated Marquee Letters',
  'Świecące Litery Marquee',
  'Creëer een onvergetelijke sfeer met onze vintage verlichte letters! Perfect voor Gender Reveal, bruiloften, verjaarfeesten en elk speciaal evenement. Elke letter is 80 cm hoog met warme LED-lampen die een magische gloed geven. Stel je eigen tekst samen - van "LOVE" tot "PARTY" of zelfs "JONGEN OF MEISJE?". Professioneel, stijlvol en Instagram-waardig! Inclusief reflecterende sokkel voor extra glamour. Prijs per letter, dus je betaalt alleen voor wat je nodig hebt.',
  'Create an unforgettable atmosphere with our vintage illuminated letters! Perfect for Gender Reveals, weddings, birthdays and any special event. Each letter is 80 cm tall with warm LED lights that create a magical glow. Compose your own text - from "LOVE" to "PARTY" or even "BOY OR GIRL?". Professional, stylish and Instagram-worthy! Includes reflective base for extra glamour. Price per letter, so you only pay for what you need.',
  'Stwórz niezapomnianą atmosferę z naszymi vintage świecącymi literami! Idealne na Gender Reveal, wesela, urodziny i każde wyjątkowe wydarzenie. Każda litera ma 80 cm wysokości z ciepłymi lampkami LED tworzącymi magiczną poświatę. Ułóż własny tekst - od "MIŁOŚĆ" po "PARTY" lub nawet "CHŁOPIEC CZY DZIEWCZYNKA?". Profesjonalne, stylowe i idealne na Instagram! Z refleksyjną podstawą dla dodatkowego glamouru. Cena za literę, więc płacisz tylko za to czego potrzebujesz.',
  10.00, -- €10 per letter
  NULL,
  '/images/produkt litery .jpeg',
  'Effects', -- Category: Effects (special effects/decorations)
  NOW(),
  NOW()
);

-- Note: After running this SQL, update App.tsx:
-- Change line: const PRODUCTS_WITH_LETTER_OPTIONS = ["LETTER_LIGHTS_ID"];
-- To: const PRODUCTS_WITH_LETTER_OPTIONS = ["e7f8a9b0-1234-5678-90ab-cdef12345678"];
