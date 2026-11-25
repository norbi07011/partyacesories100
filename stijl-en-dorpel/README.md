# Stijl & Dorpel — deuren & kozijnen

Website voor een (nieuw) bedrijf dat deuren en kozijnen vervangt in Nederland:
collectie met 16 deurmodellen, configurator met richtprijs, offertelijst, diensten,
inmeetgids en contact. Drie talen: NL / EN / PL.

De vormgeving volgt de stijl van `BETROUW-BOUW1` (warm zwart, champagne-accent,
Instrument Serif + Inter, GSAP/Lenis-animaties). De `src/fx/`-map is daaruit overgenomen.

## Starten

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # productie-build in dist/
npm run lint     # typecheck
```

## Vóór livegang aanpassen

| Wat | Waar |
| --- | --- |
| Telefoon, e-mail, adres, KvK, btw, openingstijden (**nu placeholders**) | `src/company.ts` |
| Prijzen (**nu richtprijzen / voorbeelden**) | `src/data/doors.ts` |
| Modellen, kleuren, glas, beslag, kozijnen | `src/data/doors.ts` |
| Teksten diensten, werkwijze, FAQ | `src/data/content.ts` |
| Privacy, voorwaarden, cookies (basisteksten, laat juridisch nakijken) | `src/pages/Legal.tsx` |
| Titel, beschrijving, social-preview | `index.html` |

De fabriekscollecties (Invado 2/2021: 42 collecties; Porta 2/2013: 65 collecties) staan in `public/fabriek/` als `catalog.json` plus afbeeldingen, gegenereerd uit de catalogi. Die map wordt niet gecommit tot de fabrikanten toestemming geven; zonder de map toont de winkel alleen de huiscollectie. Richtprijzen voor Invado volgen uit `PRICING` in `src/company.ts`; Porta staat op 'prijs op aanvraag' omdat de catalogus uit 2013 is. Alle deuren worden getekend als SVG uit de data in `src/data/doors.ts` — er zijn geen
foto's nodig. Een nieuw model toevoegen is één object in de `MODELS`-lijst.

## Formulieren

Er is geen betaalmodule: deuren zijn maatwerk, dus de "winkelwagen" is een offertelijst
die als aanvraag wordt verstuurd.

- **Netlify**: het formulier `offerte` werkt direct via Netlify Forms (zet e-mailnotificaties
  aan in het Netlify-dashboard).
- **Andere hosting**: lukt het versturen niet, dan opent de site het e-mailprogramma van de
  bezoeker met de aanvraag al ingevuld (adres uit `src/company.ts`).

## Deploy

`netlify.toml` staat klaar (build `npm run build`, publish `dist`, SPA-redirect).
