import { useT, type L } from '../i18n';
import { UI, useDocumentTitle } from '../ui';
import { company } from '../company';
import { Kicker } from '../components/PageHero';

/* Korte, eerlijke basisteksten. Laat ze juridisch nakijken voordat de site live gaat. */

type Section = { h: L; p: L };
const who = `${company.legalName}, ${company.street}, ${company.postcode} ${company.city} (KvK ${company.kvk})`;

const PAGES: Record<'privacy' | 'terms' | 'cookies', { title: L; sections: Section[] }> = {
  privacy: {
    title: UI.privacy,
    sections: [
      {
        h: ['Wie zijn wij', 'Who we are', 'Kim jesteśmy'],
        p: [`${who} is verantwoordelijk voor de verwerking van je persoonsgegevens.`, `${who} is responsible for processing your personal data.`, `${who} odpowiada za przetwarzanie Twoich danych osobowych.`],
      },
      {
        h: ['Welke gegevens', 'Which data', 'Jakie dane'],
        p: [
          'Als je een formulier invult, verwerken we je naam, e-mailadres, telefoonnummer, postcode, plaats en wat je ons in het bericht vertelt. Andere gegevens verzamelen we niet.',
          'When you fill in a form we process your name, email address, phone number, postcode, town and whatever you tell us in the message. We collect nothing else.',
          'Gdy wypełniasz formularz, przetwarzamy imię i nazwisko, e-mail, telefon, kod pocztowy, miejscowość oraz treść wiadomości. Innych danych nie zbieramy.',
        ],
      },
      {
        h: ['Waarvoor', 'What for', 'W jakim celu'],
        p: [
          'Alleen om je aanvraag te beantwoorden, een afspraak te plannen, een offerte te maken en een opdracht uit te voeren. We verkopen je gegevens niet en gebruiken ze niet voor reclame van anderen.',
          'Only to answer your request, plan an appointment, prepare a quote and carry out an order. We do not sell your data or use it for third-party advertising.',
          'Wyłącznie po to, by odpowiedzieć na zapytanie, umówić termin, przygotować wycenę i wykonać zlecenie. Nie sprzedajemy danych i nie używamy ich do reklam osób trzecich.',
        ],
      },
      {
        h: ['Hoe lang', 'How long', 'Jak długo'],
        p: [
          'Aanvragen zonder opdracht verwijderen we uiterlijk na twaalf maanden. Gegevens bij een opdracht bewaren we zo lang als de wet dat voor de administratie voorschrijft.',
          'Requests that do not lead to an order are deleted after twelve months at the latest. Data belonging to an order is kept for as long as the law requires for accounting.',
          'Zapytania bez zlecenia usuwamy najpóźniej po dwunastu miesiącach. Dane związane ze zleceniem przechowujemy tak długo, jak wymagają tego przepisy księgowe.',
        ],
      },
      {
        h: ['Je rechten', 'Your rights', 'Twoje prawa'],
        p: [
          `Je mag je gegevens inzien, laten corrigeren of laten verwijderen. Mail naar ${company.email}. Ben je het niet met ons eens, dan kun je een klacht indienen bij de Autoriteit Persoonsgegevens.`,
          `You may access your data, have it corrected or have it deleted. Email ${company.email}. If you disagree with us, you can lodge a complaint with the Dutch Data Protection Authority.`,
          `Możesz wglądać w swoje dane, poprawiać je lub żądać usunięcia. Napisz na ${company.email}. W razie sporu możesz złożyć skargę do holenderskiego organu ochrony danych (Autoriteit Persoonsgegevens).`,
        ],
      },
    ],
  },
  terms: {
    title: UI.terms,
    sections: [
      {
        h: ['Richtprijzen en offertes', 'Guide prices and quotes', 'Ceny orientacyjne i wyceny'],
        p: [
          'De prijzen op deze website zijn richtprijzen inclusief btw. Een overeenkomst komt pas tot stand nadat je onze schriftelijke offerte hebt geaccepteerd.',
          'The prices on this website are guide prices including VAT. An agreement only comes into being once you have accepted our written quote.',
          'Ceny na stronie są orientacyjne i zawierają VAT. Umowa powstaje dopiero po zaakceptowaniu naszej pisemnej wyceny.',
        ],
      },
      {
        h: ['Maatwerk', 'Made to measure', 'Produkty na wymiar'],
        p: [
          'Deuren en kozijnen worden speciaal voor jou op maat gemaakt. Voor maatwerk geldt het wettelijke herroepingsrecht niet. Controleer je offerte daarom goed voordat je akkoord geeft.',
          'Doors and frames are made specially to your measurements. The statutory right of withdrawal does not apply to made-to-measure goods. Please check your quote carefully before you accept.',
          'Drzwi i futryny wykonujemy specjalnie na Twój wymiar. Ustawowe prawo odstąpienia nie obejmuje produktów na zamówienie. Sprawdź dokładnie wycenę przed akceptacją.',
        ],
      },
      {
        h: ['Levering en montage', 'Delivery and fitting', 'Dostawa i montaż'],
        p: [
          'De levertijd en de montagedatum staan in de offerte en zijn een zo goed mogelijke planning. Bij vertraging laten we dat zo snel mogelijk weten.',
          'Lead time and fitting date are stated in the quote and are our best planning. In case of delay we let you know as soon as possible.',
          'Termin dostawy i montażu podajemy w wycenie jako najlepszy możliwy plan. O opóźnieniu informujemy jak najszybciej.',
        ],
      },
      {
        h: ['Betaling en garantie', 'Payment and warranty', 'Płatność i gwarancja'],
        p: [
          'De betalingsafspraken en de garantie op product en montage staan in je offerte. De wettelijke garantie blijft altijd gelden.',
          'Payment terms and the warranty on product and fitting are stated in your quote. Your statutory rights always apply.',
          'Warunki płatności oraz gwarancja na produkt i montaż są określone w wycenie. Uprawnienia ustawowe zawsze obowiązują.',
        ],
      },
    ],
  },
  cookies: {
    title: UI.cookies,
    sections: [
      {
        h: ['Geen volgcookies', 'No tracking cookies', 'Bez ciasteczek śledzących'],
        p: [
          'Deze website plaatst geen advertentie- of volgcookies en deelt geen surfgedrag met derden.',
          'This website sets no advertising or tracking cookies and shares no browsing behaviour with third parties.',
          'Ta strona nie używa ciasteczek reklamowych ani śledzących i nie udostępnia danych o przeglądaniu.',
        ],
      },
      {
        h: ['Wat we wel opslaan', 'What we do store', 'Co zapisujemy'],
        p: [
          'In je eigen browser bewaren we twee dingen: je taalkeuze en je offertelijst. Die gegevens blijven op je apparaat en worden pas verstuurd als je zelf een aanvraag verzendt.',
          'We keep two things in your own browser: your language choice and your quote list. That data stays on your device and is only sent when you submit a request yourself.',
          'W Twojej przeglądarce zapisujemy dwie rzeczy: wybór języka i listę wyceny. Dane pozostają na urządzeniu i są wysyłane dopiero, gdy sam wyślesz zapytanie.',
        ],
      },
      {
        h: ['Lettertypen', 'Fonts', 'Czcionki'],
        p: [
          'De lettertypen worden geladen via Google Fonts. Daarbij ontvangt Google je IP-adres.',
          'Fonts are loaded from Google Fonts. Google receives your IP address in the process.',
          'Czcionki są ładowane z Google Fonts. Google otrzymuje przy tym Twój adres IP.',
        ],
      },
    ],
  },
};

const Legal = ({ page }: { page: keyof typeof PAGES }) => {
  const t = useT();
  const data = PAGES[page];
  useDocumentTitle(t(data.title));
  return (
    <div className="pt-32 md:pt-40 pb-24">
      <div className="max-w-3xl mx-auto px-6">
        <Kicker>{t(UI.legal)}</Kicker>
        <h1 className="font-display text-5xl md:text-7xl text-white leading-[0.95] mb-14">{t(data.title)}</h1>
        <div className="border-t border-white/10">
          {data.sections.map((s, i) => (
            <section key={i} className="py-8 border-b border-white/10">
              <h2 className="font-display text-3xl text-amber-100 mb-3">{t(s.h)}</h2>
              <p className="text-zinc-400 text-lg leading-relaxed">{t(s.p)}</p>
            </section>
          ))}
        </div>
        <p className="text-zinc-600 text-sm mt-8">{company.legalName} · {company.email} · {company.phoneDisplay}</p>
      </div>
    </div>
  );
};

export default Legal;
