import { Translation, Product } from "./types";

export const TRANSLATIONS: Translation = {
  nav_home: { nl: "Home", en: "Home", pl: "Start" },
  nav_products: { nl: "Producten", en: "Products", pl: "Produkty" },
  nav_about: { nl: "Over Ons", en: "About Us", pl: "O nas" },
  nav_contact: { nl: "Contact", en: "Contact", pl: "Kontakt" },
  nav_admin: { nl: "Beheer", en: "Admin", pl: "Panel Admin" },
  hero_title: {
    nl: "Maak uw feest onvergetelijk",
    en: "Make Your Party Unforgettable",
    pl: "Uczyń swoją imprezę niezapomnianą",
  },
  hero_subtitle: {
    nl: "Exclusieve verhuur van de mooiste party accessoires.",
    en: "Exclusive rentals of the finest party accessories.",
    pl: "Ekskluzywny wynajem najlepszych akcesoriów imprezowych.",
  },
  btn_explore: { nl: "Ontdek Nu", en: "Explore Now", pl: "Odkryj teraz" },
  btn_add_to_cart: {
    nl: "In Winkelwagen",
    en: "Add to Cart",
    pl: "Dodaj do koszyka",
  },
  btn_ask_question: {
    nl: "Stel een Vraag",
    en: "Ask a Question",
    pl: "Zadaj pytanie",
  },
  btn_preview: { nl: "Snel bekijken", en: "Quick View", pl: "Szybki podgląd" },
  cart_title: { nl: "Winkelwagen", en: "Your Cart", pl: "Twój koszyk" },
  cart_empty: {
    nl: "Uw winkelwagen is leeg.",
    en: "Your cart is empty.",
    pl: "Twój koszyk jest pusty.",
  },
  footer_rights: {
    nl: "Alle rechten voorbehouden.",
    en: "All rights reserved.",
    pl: "Wszelkie prawa zastrzeżone.",
  },
  inquiry_title: { nl: "Vraag over", en: "Inquiry about", pl: "Zapytanie o" },
  form_name: { nl: "Naam", en: "Name", pl: "Imię i nazwisko" },
  form_email: { nl: "E-mail", en: "Email", pl: "E-mail" },
  form_message: { nl: "Bericht", en: "Message", pl: "Wiadomość" },
  form_send: { nl: "Verzenden", en: "Send", pl: "Wyślij" },
  ai_assistant: { nl: "AI Assistent", en: "AI Assistant", pl: "Asystent AI" },
  ai_placeholder: {
    nl: "Typ hier uw vraag over dit product...",
    en: "Type your question about this product here...",
    pl: "Wpisz tutaj swoje pytanie dotyczące tego produktu...",
  },
  contact_info: {
    nl: "Neem contact met ons op",
    en: "Get in touch with us",
    pl: "Skontaktuj się z nami",
  },
  total: { nl: "Totaal", en: "Total", pl: "Suma" },
  checkout: { nl: "Afrekenen", en: "Checkout", pl: "Do kasy" },
  video_section_title: {
    nl: "Beleef de Sfeer",
    en: "Experience the Vibe",
    pl: "Poczuj ten klimat",
  },
  video_section_subtitle: {
    nl: "Bekijk onze nieuwste party setups in actie.",
    en: "Watch our latest party setups in action.",
    pl: "Zobacz nasze najnowsze aranżacje w akcji.",
  },
  subsidy_denhaag_title: {
    nl: "Subsidie Den Haag",
    en: "Den Haag Subsidy",
    pl: "Dofinansowanie Den Haag",
  },
  subsidy_denhaag_desc: {
    nl: "Vraag subsidie aan voor het vieren van Haagse wijkfeesten. Organiseer een geweldig buurtfeest met financiële steun van de gemeente Den Haag.",
    en: "Apply for subsidy for celebrating The Hague neighborhood festivals. Organize a great neighborhood party with financial support from the municipality of The Hague.",
    pl: "Złóż wniosek o dofinansowanie na organizację imprezy sąsiedzkiej w Hadze. Zorganizuj wspaniałe przyjęcie w sąsiedztwie przy wsparciu finansowym gminy Den Haag.",
  },
  subsidy_westland_title: {
    nl: "Subsidie Westland",
    en: "Westland Subsidy",
    pl: "Dofinansowanie Westland",
  },
  subsidy_westland_desc: {
    nl: "Ontdek subsidiemogelijkheden voor evenementen en buurtactiviteiten in de gemeente Westland. Maak gebruik van financiële ondersteuning voor uw lokale feest.",
    en: "Discover subsidy opportunities for events and neighborhood activities in the municipality of Westland. Take advantage of financial support for your local celebration.",
    pl: "Odkryj możliwości dofinansowania wydarzeń i aktywności sąsiedzkich w gminie Westland. Skorzystaj ze wsparcia finansowego na lokalną imprezę.",
  },
  about_title_suffix: { nl: "ons", en: "us", pl: "nas" },
  about_p1: {
    nl: "Welkom bij Party Accessoires Verhuur. We zijn begonnen met een eenvoudige visie: evenementstyling van wereldklasse toegankelijk maken voor iedereen.",
    en: "Welcome to Party Accessoires Verhuur. We started with a simple vision: to make world-class event styling accessible to everyone.",
    pl: "Witamy w Party Accessoires Verhuur. Zaczęliśmy od prostej wizji: udostępnić każdemu stylizację imprez na światowym poziomie.",
  },
  about_p2: {
    nl: 'Of u nu een kleine intieme bijeenkomst plant of een massaal bedrijfsgala, onze apparatuur zorgt voor die "wow"-factor die gasten zich jarenlang zullen herinneren.',
    en: 'Whether you are planning a small intimate gathering or a massive corporate gala, our equipment brings that "wow" factor that guests will remember for years.',
    pl: "Niezależnie od tego, czy planujesz małe, kameralne spotkanie, czy wielką galę firmową, nasz sprzęt zapewnia ten efekt „wow”, który goście zapamiętają na lata.",
  },
  about_stats_events: {
    nl: "Evenementen Jaarlijks",
    en: "Events Yearly",
    pl: "Imprez rocznie",
  },
  about_stats_support: {
    nl: "Service Ondersteuning",
    en: "Service Support",
    pl: "Wsparcie Serwisowe",
  },
  about_quote: {
    nl: '"De beste partyverhuur service in het land. Onze bruiloft was magisch!"',
    en: '"The best party rental service in the country. Our wedding was magical!"',
    pl: '"Najlepsza wypożyczalnia imprezowa w kraju. Nasz ślub był magiczny!"',
  },
  ai_thinking: { nl: "Aan het denken...", en: "Thinking...", pl: "Myślę..." },
  ai_ask_btn: {
    nl: "Vraag AI om hulp",
    en: "Ask AI for help",
    pl: "Zapytaj AI o pomoc",
  },
  contact_placeholder_msg: {
    nl: "Vertel ons over uw evenement...",
    en: "Tell us about your event...",
    pl: "Opowiedz nam o swoim wydarzeniu...",
  },
  form_sent_title: {
    nl: "Bericht Verzonden!",
    en: "Message Sent!",
    pl: "Wiadomość wysłana!",
  },
  form_sent_desc: {
    nl: "We nemen zo snel mogelijk contact met u op.",
    en: "We will get back to you shortly.",
    pl: "Odezwij się do Ciebie wkrótce.",
  },
  price_per_day: { nl: "/ dag", en: "/ day", pl: "/ dzień" },
  qty_label: { nl: "Aantal", en: "Qty", pl: "Ilość" },
  team_section_title: {
    nl: "Ons Team & Partners",
    en: "Our Team & Partners",
    pl: "Nasz Zespół i Partnerzy",
  },
  visit_website: {
    nl: "Bezoek Website",
    en: "Visit Website",
    pl: "Odwiedź stronę",
  },
  social_facebook: { nl: "Facebook", en: "Facebook", pl: "Facebook" },
  service_area_title: {
    nl: "Ons Werkgebied",
    en: "Our Service Area",
    pl: "Obszar Działania",
  },
  service_area_desc: {
    nl: "Wij zijn trotse leveranciers voor de regio Westland en Den Haag. Wij brengen de sfeer direct naar uw locatie!",
    en: "We are proud suppliers for the Westland and Den Haag region. We bring the vibe directly to your location!",
    pl: "Jesteśmy dumnymi dostawcami dla regionu Westland oraz Hagi. Dostarczamy klimat bezpośrednio do Twojej lokalizacji!",
  },
  booking_title: {
    nl: "Reserveer uw Datum",
    en: "Book Your Date",
    pl: "Zarezerwuj termin",
  },
  booking_select_date: {
    nl: "Selecteer een datum",
    en: "Select a date",
    pl: "Wybierz datę",
  },
  booking_btn: {
    nl: "Reservering Bevestigen",
    en: "Confirm Booking",
    pl: "Potwierdź rezerwację",
  },
  admin_dashboard: { nl: "Dashboard", en: "Dashboard", pl: "Pulpit" },
  admin_bookings: { nl: "Boekingen", en: "Bookings", pl: "Rezerwacje" },
  admin_invoices: { nl: "Facturen", en: "Invoices", pl: "Faktury" },
  admin_calendar: { nl: "Kalender", en: "Calendar", pl: "Kalendarz" },
  admin_inventory: { nl: "Voorraad", en: "Inventory", pl: "Magazyn" },
  admin_messages: { nl: "Berichten", en: "Messages", pl: "Wiadomości" },
  admin_total_revenue: {
    nl: "Totale Omzet",
    en: "Total Revenue",
    pl: "Całkowity przychód",
  },
  admin_active_bookings: {
    nl: "Actieve Boekingen",
    en: "Active Bookings",
    pl: "Aktywne rezerwacje",
  },
  admin_gen_invoice: {
    nl: "Factuur Genereren",
    en: "Generate Invoice",
    pl: "Generuj fakturę",
  },
  status_confirmed: { nl: "Bevestigd", en: "Confirmed", pl: "Potwierdzone" },
  status_pending: { nl: "In behandeling", en: "Pending", pl: "Oczekiwanie" },
  status_paid: { nl: "Betaald", en: "Paid", pl: "Opłacone" },
  status_unpaid: { nl: "Onbetaald", en: "Unpaid", pl: "Nieopłacone" },
  admin_add_product: {
    nl: "Product Toevoegen",
    en: "Add Product",
    pl: "Dodaj Produkt",
  },
  cal_available: { nl: "Beschikbaar", en: "Available", pl: "Wolne" },
  cal_partial: {
    nl: "Gedeeltelijk Bezit",
    en: "Partially Booked",
    pl: "Częściowo zajęte",
  },
  cal_blocked: {
    nl: "Volledig Bezet",
    en: "Fully Booked",
    pl: "Całkowicie zajęte",
  },
  cal_manage_day: {
    nl: "Dag beheren",
    en: "Manage Day",
    pl: "Zarządzaj dniem",
  },
  // Dashboard translations
  dash_total_bookings: {
    nl: "Totale Boekingen",
    en: "Total Bookings",
    pl: "Wszystkie Rezerwacje",
  },
  dash_pending: {
    nl: "In behandeling",
    en: "Pending",
    pl: "Oczekujące",
  },
  dash_products: {
    nl: "Producten",
    en: "Products",
    pl: "Produkty",
  },
  dash_product_views: {
    nl: "Product Weergaven",
    en: "Product Views",
    pl: "Wyświetlenia Produktów",
  },
  dash_conversion: {
    nl: "Conversie",
    en: "Conversion",
    pl: "Konwersja",
  },
  dash_paid_invoices: {
    nl: "betaalde facturen",
    en: "paid invoices",
    pl: "opłacone faktury",
  },
  dash_confirmed: {
    nl: "bevestigd",
    en: "confirmed",
    pl: "potwierdzone",
  },
  dash_awaiting_confirmation: {
    nl: "wachten op bevestiging",
    en: "awaiting confirmation",
    pl: "oczekuje na potwierdzenie",
  },
  dash_active_products: {
    nl: "actieve producten",
    en: "active products",
    pl: "aktywne produkty",
  },
  dash_total_views: {
    nl: "totale weergaven",
    en: "total views",
    pl: "wszystkie wyświetlenia",
  },
  dash_view_to_booking: {
    nl: "weergave naar boeking",
    en: "view to booking",
    pl: "wyświetlenie do rezerwacji",
  },
  dash_revenue_over_time: {
    nl: "Omzet in de loop van de tijd",
    en: "Revenue Over Time",
    pl: "Przychód w czasie",
  },
  dash_last_30_days: {
    nl: "Laatste 30 dagen",
    en: "Last 30 Days",
    pl: "Ostatnie 30 dni",
  },
  dash_no_revenue_data: {
    nl: "Geen omzetgegevens beschikbaar",
    en: "No revenue data available",
    pl: "Brak danych o przychodach",
  },
  dash_most_viewed: {
    nl: "Meest bekeken producten",
    en: "Most Viewed Products",
    pl: "Najczęściej oglądane produkty",
  },
  dash_most_purchased: {
    nl: "Meest gekochte producten",
    en: "Most Purchased Products",
    pl: "Najczęściej kupowane produkty",
  },
  dash_no_view_data: {
    nl: "Geen weergavegegevens beschikbaar",
    en: "No view data available",
    pl: "Brak danych o wyświetleniach",
  },
  dash_no_purchase_data: {
    nl: "Geen aankoopgegevens beschikbaar",
    en: "No purchase data available",
    pl: "Brak danych o zakupach",
  },
  dash_category_performance: {
    nl: "Categorie Prestaties",
    en: "Category Performance",
    pl: "Wydajność Kategorii",
  },
  dash_no_category_data: {
    nl: "Geen categoriegegevens beschikbaar",
    en: "No category data available",
    pl: "Brak danych o kategoriach",
  },
  dash_recent_bookings: {
    nl: "Recente Boekingen",
    en: "Recent Bookings",
    pl: "Ostatnie Rezerwacje",
  },
  dash_no_bookings: {
    nl: "Nog geen boekingen",
    en: "No bookings yet",
    pl: "Brak rezerwacji",
  },
  dash_recent_messages: {
    nl: "Recente Berichten",
    en: "Recent Messages",
    pl: "Ostatnie Wiadomości",
  },
  dash_unread: {
    nl: "ongelezen",
    en: "unread",
    pl: "nieprzeczytane",
  },
  dash_no_messages: {
    nl: "Nog geen berichten",
    en: "No messages yet",
    pl: "Brak wiadomości",
  },
  dash_detailed_stats: {
    nl: "Gedetailleerde Statistieken van Product Weergaven",
    en: "Detailed Product View Statistics",
    pl: "Szczegółowe Statystyki Wyświetleń Produktów",
  },
  dash_products_count: {
    nl: "producten",
    en: "products",
    pl: "produktów",
  },
  dash_product: {
    nl: "Product",
    en: "Product",
    pl: "Produkt",
  },
  dash_category: {
    nl: "Categorie",
    en: "Category",
    pl: "Kategoria",
  },
  dash_views: {
    nl: "Weergaven",
    en: "Views",
    pl: "Wyświetlenia",
  },
  dash_unique_sessions: {
    nl: "Unieke Sessies",
    en: "Unique Sessions",
    pl: "Unikalne Sesje",
  },
  dash_avg_per_session: {
    nl: "Gem. per Sessie",
    en: "Avg. per Session",
    pl: "Śr. na Sesję",
  },
  dash_last_viewed: {
    nl: "Laatst Bekeken",
    en: "Last Viewed",
    pl: "Ostatnie Wyświetlenie",
  },
  dash_no_view_stats: {
    nl: "Geen gegevens over weergaven",
    en: "No view data available",
    pl: "Brak danych o wyświetleniach",
  },
  dash_recent_views: {
    nl: "Recente Product Weergaven",
    en: "Recent Product Views",
    pl: "Ostatnie Wyświetlenia Produktów",
  },
  dash_view: {
    nl: "Weergave",
    en: "View",
    pl: "Wyświetlenie",
  },
  dash_click: {
    nl: "Klik",
    en: "Click",
    pl: "Kliknięcie",
  },
  dash_no_recent_views: {
    nl: "Geen recente weergaven",
    en: "No recent views",
    pl: "Brak ostatnich wyświetleń",
  },
  dash_session_stats: {
    nl: "Gebruikerssessie Statistieken",
    en: "User Session Statistics",
    pl: "Statystyki Sesji Użytkowników",
  },
  dash_duration: {
    nl: "Duur",
    en: "Duration",
    pl: "Czas trwania",
  },
  dash_minutes: {
    nl: "min",
    en: "min",
    pl: "min",
  },
  dash_no_session_data: {
    nl: "Geen sessiegegevens",
    en: "No session data",
    pl: "Brak danych o sesjach",
  },
};

export const PROMO_VIDEOS = {
  pl: [
    {
      id: 1,
      url: "/videos/wideo PL.mp4",
      title: {
        nl: "Promo Video 1",
        en: "Promo Video 1",
        pl: "Film Promocyjny 1",
      },
      isVertical: true,
    },
    {
      id: 2,
      url: "/videos/wideo PL 1.mp4",
      title: {
        nl: "Promo Video 2",
        en: "Promo Video 2",
        pl: "Film Promocyjny 2",
      },
      isVertical: true,
    },
    {
      id: 3,
      url: "/videos/wideoPL!.mp4",
      title: {
        nl: "Promo Video 3",
        en: "Promo Video 3",
        pl: "Film Promocyjny 3",
      },
      isVertical: true,
    },
    {
      id: 4,
      url: "/videos/wideo PL NL 1.mp4",
      title: {
        nl: "Party Highlights",
        en: "Party Highlights",
        pl: "Najlepsze Momenty",
      },
      isVertical: true,
    },
    {
      id: 5,
      url: "/videos/wideo  PL .NL.mp4",
      title: {
        nl: "Event Moments",
        en: "Event Moments",
        pl: "Chwile z Imprez",
      },
      isVertical: true,
    },
    {
      id: 6,
      url: "/videos/wideoPL NL2.mp4",
      title: {
        nl: "Party Vibes",
        en: "Party Vibes",
        pl: "Klimat Imprezy",
      },
      isVertical: true,
    },
  ],
  nl: [
    {
      id: 1,
      url: "/videos/wideo NL.mp4",
      title: {
        nl: "Promo Video 1",
        en: "Promo Video 1",
        pl: "Film Promocyjny 1",
      },
      isVertical: true,
    },
    {
      id: 2,
      url: "/videos/wideo NL1.mp4",
      title: {
        nl: "Promo Video 2",
        en: "Promo Video 2",
        pl: "Film Promocyjny 2",
      },
      isVertical: true,
    },
    {
      id: 3,
      url: "/videos/wideo NL 2.mp4",
      title: {
        nl: "Promo Video 3",
        en: "Promo Video 3",
        pl: "Film Promocyjny 3",
      },
      isVertical: true,
    },
    {
      id: 4,
      url: "/videos/wideo PL NL 1.mp4",
      title: {
        nl: "Party Highlights",
        en: "Party Highlights",
        pl: "Najlepsze Momenty",
      },
      isVertical: true,
    },
    {
      id: 5,
      url: "/videos/wideo  PL .NL.mp4",
      title: {
        nl: "Event Moments",
        en: "Event Moments",
        pl: "Chwile z Imprez",
      },
      isVertical: true,
    },
    {
      id: 6,
      url: "/videos/wideoPL NL2.mp4",
      title: {
        nl: "Party Vibes",
        en: "Party Vibes",
        pl: "Klimat Imprezy",
      },
      isVertical: true,
    },
  ],
};

export const PRODUCTS: Product[] = [
  {
    id: "1",
    name: {
      nl: "Popcornmachine",
      en: "Popcorn Machine",
      pl: "Maszyna do popcornu",
    },
    description: {
      nl: "Heerlijke verse popcorn voor elk evenement.",
      en: "Delicious fresh popcorn for every event.",
      pl: "Pyszny, świży popcorn na każdą okazję.",
    },
    price: 50.0,
    image: "/images/produkt-maszyna-do-popcornu.png",
    category: "Catering",
  },
  {
    id: "2",
    name: {
      nl: "Schuimparty-machine",
      en: "Foam Party Machine",
      pl: "Wytwornica piany",
    },
    description: {
      nl: "Creëer een onvergetelijke schuimervaring.",
      en: "Create an unforgettable foam experience.",
      pl: "Stwórz niezapomniane wrażenia z pianą.",
    },
    price: 150.0,
    image: "/images/produkt-wytwornica-piany.png",
    category: "Effects",
  },
  {
    id: "3",
    name: {
      nl: "Fotoshoot op evenement",
      en: "Event Photoshoot",
      pl: "Profesjonalna sesja zdjęciowa",
    },
    description: {
      nl: "Professionele fotografie voor uw mooiste momenten.",
      en: "Professional photography for your finest moments.",
      pl: "Profesjonalna fotografia na Twoje najważniejsze chwile.",
    },
    price: 150.0,
    image: "/images/profesjonalna-sesja-zdjeciowa.png",
    category: "Services",
  },
  {
    id: "4",
    name: { nl: "Fotohokje 360°", en: "360 Photo Booth", pl: "Fotobudka 360°" },
    description: {
      nl: "De nieuwste trend voor interactieve video's.",
      en: "The latest trend for interactive videos.",
      pl: "Najnowszy trend w interaktywnych filmach.",
    },
    price: 150.0,
    image: "/images/produkt-fotobudka-360.png",
    category: "Equipment",
  },
  {
    id: "5",
    name: {
      nl: "Kleine Bar met Bierfustkoeler",
      en: "Small Bar with Keg Cooler",
      pl: "Mały bar z chłodziarką do kegów",
    },
    description: {
      nl: "Perfect voor tuinfeesten en kleine evenementen.",
      en: "Perfect for garden parties and small events.",
      pl: "Idealny na imprezy w ogrodzie i małe wydarzenia.",
    },
    price: 50.0,
    image: "/images/produkt-maly-bar-z-chlodziarka-piwa.png",
    category: "Furniture",
  },
  {
    id: "6",
    name: {
      nl: "Springkussen Clown",
      en: "Bouncy Castle Clown",
      pl: "Dmuchaniec Klaun",
    },
    description: {
      nl: "Met glijbaan voor extra plezier.",
      en: "With slide for extra fun.",
      pl: "Ze zjeżdąlnią dla dodatkowej zabawy.",
    },
    price: 120.0,
    image: "/images/produkt-dmuchaniec-klaun.png",
    category: "Entertainment",
  },
  {
    id: "7",
    name: {
      nl: "Springkussen Mickey Maus",
      en: "Bouncy Castle Mickey Mouse",
      pl: "Dmuchaniec Myszka Miki",
    },
    description: {
      nl: "Met glijbaan, ideaal voor kinderfeestjes.",
      en: "With slide, ideal for kids parties.",
      pl: "Ze zjeżdżalnią, idealny na przyjęcia dla dzieci.",
    },
    price: 120.0,
    image: "/images/produkt-zamek-myszka-miki.png",
    category: "Entertainment",
  },
  {
    id: "8",
    name: {
      nl: "Waterglijbaan Krokodil",
      en: "Water Slide Crocodile",
      pl: "Wodna zjeżdżalnia Krokodyl",
    },
    description: {
      nl: "Opblaasbare waterpret voor warme dagen.",
      en: "Inflatable water fun for hot days.",
      pl: "Dmuchana zabawa wodna na upalne dni.",
    },
    price: 200.0,
    image: "/images/produkt-wodna-zjezdzalnia-krokodyl.png",
    category: "Entertainment",
  },
  {
    id: "9",
    name: {
      nl: "Bubbelmachine",
      en: "Bubble Machine",
      pl: "Maszyna do baniek",
    },
    description: {
      nl: "Vult de lucht met duizenden bubbels.",
      en: "Fills the air with thousands of bubbles.",
      pl: "Wypełnia powietrze tysiącami baniek.",
    },
    price: 15.0,
    image: "/images/produkt-maszyna-do-baniek.png",
    category: "Effects",
  },
  {
    id: "10",
    name: {
      nl: "Animator Zabaw – ROBOT",
      en: "Play Animator – ROBOT",
      pl: "Animator zabaw – ROBOT",
    },
    description: {
      nl: "Interactief entertainment voor jong en oud.",
      en: "Interactive entertainment for young and old.",
      pl: "Interaktywna rozrywka dla młodych i starszych.",
    },
    price: 180.0,
    image: "/images/produkt-animator-zabaw-robot.jpg",
    category: "Services",
  },
  {
    id: "11",
    name: {
      nl: "Standaard Pakket: LED Tent + Audio + FX",
      en: "Standard Package: LED Tent + Audio + FX",
      pl: "Pakiet Standard: Namiot LED + Audio + Efekty",
    },
    description: {
      nl: "Compleet pakket met JBL, Karaoke, Licht en Rook.",
      en: "Complete package with JBL, Karaoke, Light and Smoke.",
      pl: "Kompletny pakiet z JBL, Karaoke, oświetleniem i dymem.",
    },
    price: 275.0,
    originalPrice: 400.0,
    image: "/images/produkt-pakiet-standard-namiot-led-audio-efekty.png",
    category: "Packages",
  },
  {
    id: "12",
    name: {
      nl: "Suikerspinmachine",
      en: "Cotton Candy Machine",
      pl: "Maszyna do waty cukrowej",
    },
    description: {
      nl: "Zelfbediening suikerspin voor elk feest.",
      en: "Self-service cotton candy for any party.",
      pl: "Samoobsługowa wata cukrowa na każdą imprezę.",
    },
    price: 100.0,
    image: "/images/produkt-maszyna-do-waty-cukrowej.png",
    category: "Catering",
  },
  {
    id: "13",
    name: {
      nl: "Uitgebreid Pakket (XL)",
      en: "Extended Package (XL)",
      pl: "Pakiet Rozszerzony (XL)",
    },
    description: {
      nl: "Wszystko ze Standaard (€275) + Atrakcje voor kinderen (springkussens) + Suikerspin- of popcornmachine. Nu €400 (was €570) + BTW.",
      en: "Everything from Standard (€275) + Kids attractions (inflatables) + Cotton candy or popcorn machine. Now €400 (was €570) + VAT.",
      pl: "Wszystko z pakietu Standard (€275) + Atrakcje dla dzieci (dmuchańce) + Maszyna do waty cukrowej lub popcornu. Promocja €400 z 570€ + VAT.",
    },
    price: 400.0,
    originalPrice: 570.0,
    image: "/images/produkt-pakiet-rozszerzony-xl.png",
    category: "Packages",
  },
  {
    id: "14",
    name: {
      nl: "Zaalverhuur - Party Locatie",
      en: "Hall Rental - Event Venue",
      pl: "Wynajem Sali - Miejsce na Imprezę",
    },
    description: {
      nl: "Zaal beschikbaar op zaterdag van 12:00 tot 23:00 en zondag de hele dag. ACTIE: Bij huur van de zaal krijgt u 50% KORTING op alle andere attracties en artikelen!",
      en: "Hall available on Saturday from 12:00 to 23:00 and Sunday all day. OFFER: When renting the hall, you get 50% DISCOUNT on all other attractions and items!",
      pl: "Sala dostępna w sobotę (12:00 - 23:00) oraz niedzielę (cały dzień). PROMOCJA: Przy wynajmie sali otrzymujesz 50% ZNIŻKI na każdą inną atrakcję z naszej oferty!",
    },
    price: 275.0,
    image: "/images/wynajem-sali-miejsce-na-impreze.jpeg",
    category: "Packages",
    address: "Mangaanstraat 50, The Hague, Netherlands",
  },
  {
    id: "15",
    name: {
      nl: "DJ voor Nederlandse Feesten",
      en: "DJ for Dutch Parties",
      pl: "DJ na holenderskie imprezy",
    },
    description: {
      nl: "Professionele DJ gespecialiseerd in Nederlandse feesten en evenementen. Van hits tot classics - de perfecte sfeer voor elk Nederlands feest!",
      en: "Professional DJ specialized in Dutch parties and events. From hits to classics - the perfect atmosphere for every Dutch party!",
      pl: "Profesjonalny DJ specjalizujący się w holenderskich imprezach i wydarzeniach. Od hitów po klasyki - idealna atmosfera na każdą holenderską imprezę!",
    },
    price: 0,
    customPriceText: {
      nl: "Prijs in overleg met artiest",
      en: "Price to be agreed with artist",
      pl: "Cena do uzgodnienia z artystą",
    },
    image: "/images/holenderski-dj.jpeg",
    category: "Entertainment",
    contactLink: "https://www.instagram.com/stick070?igsh=azRpNDJhbWRyN3I2",
  },
  {
    id: "16",
    name: {
      nl: "DJ voor Poolse Feesten",
      en: "DJ for Polish Parties",
      pl: "DJ na polskie imprezy",
    },
    description: {
      nl: "Professionele DJ gespecialiseerd in Poolse feesten en evenementen. Van disco polo tot moderne hits - authentieke Poolse partystemming!",
      en: "Professional DJ specialized in Polish parties and events. From disco polo to modern hits - authentic Polish party vibes!",
      pl: "Profesjonalny DJ specjalizujący się w polskich imprezach i wydarzeniach. Od disco polo po nowoczesne hity - autentyczna polska atmosfera imprezowa!",
    },
    price: 0,
    customPriceText: {
      nl: "Prijs in overleg met artiest",
      en: "Price to be agreed with artist",
      pl: "Cena do uzgodnienia z artystą",
    },
    image: "/images/polski-dj.jpeg",
    category: "Entertainment",
    contactLink: "https://www.facebook.com/share/16kGL1wWKG/",
  },
  {
    id: "dcb01f77-9a19-4bd0-b147-dd8eed199766",
    name: {
      nl: "Verlichte Marquee Letters",
      en: "Illuminated Marquee Letters",
      pl: "Świecące Litery Marquee",
    },
    description: {
      nl: "Creëer een onvergetelijke sfeer met onze vintage verlichte letters! Perfect voor Gender Reveal, bruiloften, verjaarfeesten. Elke letter 80 cm met warme LED. Stel je eigen tekst samen - van \"LOVE\" tot \"PARTY\" of \"JONGEN OF MEISJE?\". Prijs per letter (€10).",
      en: "Create an unforgettable atmosphere with our vintage illuminated letters! Perfect for Gender Reveals, weddings, birthdays. Each letter 80 cm with warm LED. Compose your own text - from \"LOVE\" to \"PARTY\" or \"BOY OR GIRL?\". Price per letter (€10).",
      pl: "Stwórz niezapomnianą atmosferę z naszymi vintage świecącymi literami! Idealne na Gender Reveal, wesela, urodziny. Każda litera 80 cm z ciepłymi LED. Ułóż własny tekst - od \"MIŁOŚĆ\" po \"PARTY\" lub \"CHŁOPIEC CZY DZIEWCZYNKA?\". Cena za literę (€10).",
    },
    price: 10.0,
    image: "/images/produkt-litery.jpeg",
    category: "Effects",
  },
  {
    id: "coming-soon-baby-shower-1",
    name: {
      nl: "Baby Shower Kostuum Set",
      en: "Baby Shower Costume Set",
      pl: "Zestaw Kostiumów Baby Shower",
    },
    description: {
      nl: "Schattige mascotte kostuums voor een onvergetelijke Gender Reveal of Baby Shower! Roze en blauw babypak met speen - perfect voor foto's en entertainment.",
      en: "Adorable mascot costumes for an unforgettable Gender Reveal or Baby Shower! Pink and blue baby suits with pacifiers - perfect for photos and entertainment.",
      pl: "Urocze kostiumy maskotek na niezapomniany Gender Reveal lub Baby Shower! Różowy i niebieski kombinezon bobasa ze smoczkiem - idealny na zdjęcia i rozrywkę.",
    },
    price: 150.0,
    image: "/images/baby-shower-costumes.jpeg",
    category: "Entertainment",
    comingSoon: true,
  },
];

// Local fallback data for Coming Soon products (used when Supabase is not connected)
export const LOCAL_COMING_SOON_PRODUCTS = [
  {
    id: "coming-soon-baby-shower-1",
    name: {
      nl: "Baby Shower Kostuum Set",
      en: "Baby Shower Costume Set",
      pl: "Zestaw Kostiumów Baby Shower",
    },
    description: {
      nl: "Schattige mascotte kostuums voor een onvergetelijke Gender Reveal of Baby Shower! Roze en blauw babypak met speen - perfect voor foto's en entertainment.",
      en: "Adorable mascot costumes for an unforgettable Gender Reveal or Baby Shower! Pink and blue baby suits with pacifiers - perfect for photos and entertainment.",
      pl: "Urocze kostiumy maskotek na niezapomniany Gender Reveal lub Baby Shower! Różowy i niebieski kombinezon bobasa ze smoczkiem - idealny na zdjęcia i rozrywkę.",
    },
    price: 150.0,
    image: "/images/baby-shower-costumes.jpeg",
    category: "Entertainment",
    availableFrom: "2026-05-01",
    isActive: true,
  },
  {
    id: "coming-soon-letter-lights-1",
    name: {
      nl: "Verlichte Marquee Letters",
      en: "Illuminated Marquee Letters",
      pl: "Świecące Litery Marquee",
    },
    description: {
      nl: "Creëer een onvergetelijke sfeer met onze vintage verlichte letters! Perfect voor Gender Reveal, bruiloften, verjaarfeesten. Elke letter 80 cm met warme LED. Prijs per letter (€10).",
      en: "Create an unforgettable atmosphere with our vintage illuminated letters! Perfect for Gender Reveals, weddings, birthdays. Each letter 80 cm with warm LED. Price per letter (€10).",
      pl: "Stwórz niezapomnianą atmosferę z naszymi vintage świecącymi literami! Idealne na Gender Reveal, wesela, urodziny. Każda litera 80 cm z ciepłymi LED. Cena za literę (€10).",
    },
    price: 10.0,
    image: "/images/produkt-litery.jpeg",
    category: "Effects",
    availableFrom: "2026-05-01",
    isActive: true,
  },
];
