# Studio Agent – osobisty agent AI na Twój komputer

Agent „od wszystkiego” dla fotografa i operatora: doradca kreatywny, planista, kalendarz, notatnik pomysłów,
wyszukiwarka plików na dysku, wyszukiwarka w internecie, powiadomienia na Telegram i baza pod przyszłą analizę krypto.

```
┌──────────── Twój komputer ────────────┐
│  Dashboard (przeglądarka)  ◄──┐       │        ┌──────────────┐
│  http://127.0.0.1:8765        │       │        │  Claude API  │  mózg + web search
│                               ▼       │◄──────►│  (Anthropic) │
│  main.py ─ agent.py ─ tools.py        │        └──────────────┘
│     │        │                        │        ┌──────────────┐
│     │        └─ SQLite (data/agent.db)│◄──────►│  Telegram    │  czat z telefonu
│     ├─ scheduler.py (przypomnienia,   │        └──────────────┘  + powiadomienia
│     │   poranny brief, alerty krypto) │        ┌──────────────┐
│     └─ file_indexer.py ─► Twoje dyski │◄──────►│  CoinGecko   │  ceny krypto
└───────────────────────────────────────┘        └──────────────┘
```

## Co potrafi

| Funkcja | Jak |
|---|---|
| 📱 Sterowanie z telefonu | Aplikacja na telefon (PWA) + logowanie hasłem i 2FA. Zakładka **Komputer**: CPU/RAM/dyski, procesy, zrzut ekranu, otwieranie programów, blokada/uśpienie/restart/wyłączenie. Ryzykowne akcje czekają na Twoją zgodę (dashboard albo przycisk na Telegramie). Komendy Telegram `/komputer`, `/zrzut` |
| 🧭 Doradca | Co godzinę sam szuka problemów i okazji: zaległe zadania, nieopłacone projekty, skoki kosztów, brak sprzedaży, mało miejsca, strony klientów, magazyn. Ważne zgłasza na Telegram. Automatyzacje „jeśli… to…” i przegląd tygodnia w poniedziałek |
| 🧠 Pamięć lokalna | Wyszukiwanie po znaczeniu w dokumentach, pomysłach, rozmowach i plikach z Twoich folderów (lokalnie przez Ollamę), graf osób i firm, dziennik decyzji. Nic nie wychodzi do sieci |
| 👕 Stratfanat | Produkty i magazyn wg rozmiarów, sprzedaż i dostawy (od razu w finansach), kolekcje i dropy, trendy, projekty z makietami ubrań (SVG) i wizualizacjami AI (lokalny ComfyUI). Umiejętności: projektant mody, trendy streetwear, rozwój marki, kampania dropu |
| 🌐 Strony WWW klientów | Monitoring działania co 10 min, SSL, domeny, odnowienia hostingu, audyt SEO/wydajności, abonamenty |
| 📈 Trading demo | Z Twojego projektu MESSUAI: wykres świecowy ze wskaźnikami, analizy agentek AI, konto demo (wirtualne pieniądze), boty demo, backtest, baza wiedzy tradingowej. Żadnych prawdziwych zleceń |
| 📥 Foto/wideo | Import z karty pamięci do uporządkowanych folderów + kopia zapasowa, foldery do archiwizacji, napisy .srt do filmów (lokalnie) |
| 🎙 Dyktafon | W rozmowie mikrofon włącza się dopiero po naciśnięciu „Dyktafon” (albo spacji); głos offline Piper; własna wyszukiwarka SearXNG; testy jakości modelu |
| 🆓 Darmowy model lokalny | Domyślnie agent działa na Twoim komputerze przez Ollamę (Qwen3 8B): bez opłat i bez wysyłania danych do chmury. Claude można włączyć w Ustawieniach |
| 👤 Zna Cię od startu | Plik `profil.md` (edycja w Ustawieniach → Profil i firma): Stratfanat, strony WWW, teledyski, fotografia, krypto, cele i stawki |
| 💰 Finanse i portfel | Przychody, koszty, straty i inwestycje w podziale na obszary (Stratfanat, WWW, teledyski, foto, krypto). Wykresy, marża, porównanie z poprzednim miesiącem, portfel z wyceną krypto, eksport CSV. Mówisz „zapłaciłem 120 zł za hosting”, a agent sam to zapisuje |
| 📊 Raport miesięczny | Co 1. dzień miesiąca agent przygotowuje raport z wykresami i wnioskami (Dokumenty i powiadomienie). Na żądanie: „pokaż statystyki” |
| 📞 Rozmowa głosowa (jak FaceTime) | Przycisk „Porozmawiaj”: mówisz, a agent odpowiada głosem. Animowana kula reaguje na Twój i swój głos, są napisy na żywo i transkrypcja. Możesz włączyć kamerę i „pokazać kadr” agentowi. Dotknięcie kuli przerywa agentowi. Wszystko zapisuje się w historii czatu |
| 🎙 Głos wszędzie | Dyktowanie w czacie (mikrofon), czytanie odpowiedzi na głos (głośnik przy wiadomości), głosówki na Telegramie z odpowiedzią tekstem i głosem |
| 🧠 Pamięta wszystko | Każda rozmowa (czat, Telegram, głos) jest zapisana i przeszukiwalna. Starsze rozmowy agent streszcza w „notatnik pamięci”, a narzędziem `recall` wraca do dawnych ustaleń |
| ⭐ Umiejętności | 8 wbudowanych instrukcji eksperckich: shot-lista, wycena, brief teledysku, selekcja zdjęć, plan dnia zdjęciowego, post do social media, wiadomość do klienta, analiza krypto. Możesz je edytować i dopisywać własne |
| 🔌 Serwery MCP | Podłączanie gotowych wtyczek z ekosystemu MCP (pliki, przeglądarka, Notion, GitHub, bazy danych…) bez programowania |
| 🌤 Pogoda i światło | Prognoza na 16 dni oraz wschód, zachód, złota i niebieska godzina liczone z pozycji słońca dla dowolnego miejsca |
| 📄 Dokumenty | Biblioteka shot-list, wycen, briefów i call sheetów (podgląd, edycja, pobieranie .md, druk do PDF) |
| 💬 Czat w dashboardzie i na Telegramie | Piszesz normalnie: „jutro 10:00 sesja z Kasią w Łazienkach”, a agent sam wpisuje to do kalendarza. Odpowiedź pojawia się na żywo, razem z tym, co agent właśnie robi |
| 📷 Ocena kadru i selekcja | Wrzucasz zdjęcie do czatu (spinacz, wklejenie albo przeciągnięcie) lub wysyłasz je na Telegram, a agent ocenia kompozycję, światło i kolor. Agent sam przegląda też zdjęcia z dysku i wybiera najlepsze z sesji |
| 📅 Kalendarz | Sesje, teledyski, spotkania i montaże. Kliknij dzień, żeby dodać wydarzenie, albo wydarzenie, żeby je edytować. Import i eksport `.ics` (Google, Apple, Outlook). Przypomnienie na Telegram |
| ✅ Zadania | Kanban z przeciąganiem, filtr po projekcie, zadania po terminie oznaczone na czerwono |
| 💼 Projekty i klienci | Zlecenia od zapytania do zapłaty: stawka, termin oddania, kontakt, folder z materiałami, postęp zadań, suma do zapłaty |
| 💡 Pomysły | Każdy pomysł z rozmowy trafia do bazy. Przycisk „Rozwiń z agentem” dopisuje koncept, światło, shot-listę i sprzęt |
| 📁 Pliki i zdjęcia | Galeria z miniaturami (JPG, RAW, wideo). Wyszukiwanie po nazwie, aparacie, obiektywie i dacie zrobienia (EXIF), przycisk „Otwórz folder” |
| 🌐 Internet | Wyszukiwanie i czytanie stron (sprzęt, ceny, lokacje, trendy) ze źródłami |
| 🔔 Powiadomienia | Telegram, dashboard i powiadomienia systemowe przeglądarki |
| ☀️ Poranny brief | Codziennie o wybranej godzinie plan dnia na Telegram |
| 🧠 Pamięć | Agent zapamiętuje fakty o Tobie, klientach i sprzęcie. Możesz je przejrzeć i edytować w Ustawieniach |
| 📈 Krypto | Ceny, wykresy z 7 dni, alerty cenowe i powiadomienia o dużych ruchach (powyżej 8% w 24h) |
| 🔎 Szukaj wszędzie | Ctrl+K: kalendarz, zadania, projekty, pomysły i foldery w jednym miejscu |
| ⚙️ Ustawienia w dashboardzie | Klucze, Telegram, foldery i harmonogram zmieniasz bez edytowania plików i bez restartu |
| 💾 Kopia zapasowa | Co noc kopia bazy (7 dni wstecz) plus przycisk „Pobierz kopię bazy” |

## Instalacja (ok. 10 minut)

### 1. Zainstaluj Pythona
Windows: https://www.python.org/downloads/ (przy instalacji zaznacz **„Add Python to PATH”**). Wymagany Python 3.10+.
Opcjonalnie **FFmpeg** (https://ffmpeg.org), żeby widzieć miniatury filmów.

### 2. Uruchom
- **Windows:** dwuklik `start.bat`
- **Mac / Linux:** `./start.sh`

Za pierwszym razem skrypt zainstaluje wszystko sam. Dashboard otworzy się pod **http://127.0.0.1:8765**.

### 3. Podłącz w dashboardzie (zakładka **Ustawienia**)
0. **Model AI (darmowy, lokalny):** `start.bat` sam instaluje [Ollamę](https://ollama.com) (przez winget) i pobiera model `qwen3:8b`
   (jednorazowo ok. 5 GB; najlepiej 16 GB RAM albo karta graficzna z 8 GB). Słabszy komputer: wybierz `qwen3:4b`.
   W Ustawieniach → „Mózg agenta” widać stan i jest przycisk „Pobierz model”. Do oceniania zdjęć pobierz też `qwen2.5vl:7b`.
   Uzupełnij **Profil i firma**, żeby agent znał Cię od pierwszej rozmowy.
1. **Claude (opcjonalnie, płatny, mądrzejszy):** na https://console.anthropic.com/settings/keys utwórz klucz i doładuj konto (Billing).
   Wklej klucz i kliknij „Sprawdź połączenie”. Płacisz za użycie; koszt obniżysz, wybierając poziom myślenia `low`
   albo model `claude-sonnet-5-5`.
2. **Telegram:** w Telegramie napisz do **@BotFather**, wyślij `/newbot` i skopiuj token. Wklej go w Ustawieniach i zapisz.
   Potem napisz do swojego bota `/start`, a w dashboardzie kliknij **„Dodaj ten czat”**.
   Bot odpowiada **tylko** na dodane czaty.
3. **Foldery:** wpisz foldery ze zdjęciami i filmami, każdy w nowej linii, np. `D:\Zdjecia` i `D:\Teledyski`.
   Agent zeskanuje je od razu i co noc o 3:30 (kolejne skany czytają tylko nowe pliki).
   Pliki nigdzie nie są wysyłane: w bazie lądują tylko nazwy, ścieżki, daty i EXIF.

### 4. Rozmowa głosowa
- Najlepiej działa w **Chrome lub Edge** (rozpoznawanie mowy przeglądarki, po polsku). Przy pierwszej rozmowie zezwól na mikrofon.
- Głos agenta to naturalny polski lektor (Zofia albo Marek, `edge-tts`, wymaga internetu). Bez internetu agent mówi głosem systemu.
- **Offline / Firefox / głosówki z Telegrama:** skrypt startowy próbuje doinstalować `faster-whisper` (`requirements-voice.txt`).
  Przy pierwszym użyciu pobiera model (small ≈ 460 MB). W Ustawieniach ustaw „Rozpoznawanie mowy: Whisper”.
- Ustawienia głosu są w zakładce **Ustawienia → Głos i rozmowa** (przycisk „Posłuchaj”).

### 5. Dodatkowe umiejętności (MCP, opcjonalnie)
Zakładka **Umiejętności → Serwery MCP → „Wstaw przykłady”**. Włącz wybrany serwer (`"enabled": true`) i kliknij „Zapisz i połącz”.
Serwery uruchamiane przez `npx` wymagają [Node.js](https://nodejs.org). Katalog serwerów: https://github.com/modelcontextprotocol/servers

### 6. Dostęp z telefonu (gdy nie ma Cię w domu)
1. Dashboard → **Komputer → Dostęp z telefonu**: ustaw hasło (i najlepiej 2FA – zeskanuj kod QR w Google Authenticator/Aegis).
2. Zainstaluj **Tailscale** na komputerze i telefonie (https://tailscale.com/download), zaloguj się tym samym kontem.
3. Na komputerze raz uruchom: `tailscale serve --bg 8765` – dostaniesz adres `https://<komputer>.<sieć>.ts.net`
   (HTTPS jest potrzebny do mikrofonu w rozmowie głosowej na telefonie).
4. Otwórz ten adres na telefonie, zaloguj się i wybierz „Dodaj do ekranu głównego” – masz aplikację Studio Agent.
Komputer musi być włączony (możesz wyłączyć usypianie albo użyć Wake-on-LAN).

### 7. Wyszukiwarka SearXNG (opcjonalnie, bez limitów)
Z Docker Desktop: w folderze `searxng/` uruchom `docker compose up -d` (najpierw zmień `secret_key` w `settings.yml`),
potem w Ustawieniach wpisz `SEARXNG_URL = http://127.0.0.1:8888`.

### 8. Wizualizacje ubrań AI (opcjonalnie)
Zainstaluj [ComfyUI](https://github.com/comfyanonymous/ComfyUI) z modelem SDXL i uruchom (port 8188).
Agent sam wyśle tam prompt projektu. Bez ComfyUI dostajesz techniczne makiety SVG.

### 9. Autostart z Windows (opcjonalnie)
Naciśnij `Win + R`, wpisz `shell:startup` i wklej tam skrót do `start.bat`.

## Przykładowe polecenia

- „W sobotę 14:00 plener z Martą w Kazimierzu, przypomnij mi dzień wcześniej o naładowaniu baterii”
- „Rozpisz mi produkcję teledysku dla zespołu X — zdjęcia 5 grudnia, oddanie do 20-go”
- „Pomysł: teledysk w jednym ujęciu w pustym basenie, zimne światło” → zapisany i rozwinięty
- „Gdzie są surówki BRAW z października?”
- „Pokaż zdjęcia zrobione 85-tką w październiku”
- „Nowe zlecenie: teledysk dla zespołu X, 8500 zł, oddanie 20 grudnia — rozpisz zadania”
- (zdjęcie) „Co poprawić w tym kadrze?”
- „Wybierz 5 najlepszych zdjęć z sesji Marta”
- „Jaka będzie pogoda i złota godzina w sobotę w Kazimierzu?” → plan dnia zdjęciowego
- „Zrób wycenę teledysku: 2 dni zdjęciowe, montaż, kolor” → dokument z wyceną
- „Co ustaliliśmy w zeszłym tygodniu z Nocnym Miastem?” → agent przeszukuje pamięć
- (rozmowa głosowa z włączoną kamerą) „Pokaż kadr” → „Jak ustawić światło przy tym tle?”
- „Znajdź w sieci najlepsze lampy LED do 3000 zł i porównaj”
- „Ile jest teraz bitcoin? Daj znać, jak spadnie poniżej 80 tys. USD”
- „Zapamiętaj: moja stawka za dzień zdjęciowy to 2500 zł netto”
- „Sprzedałem 4 bluzy Stratfanat po 180 zł” / „Zapłaciłem 89 zł za hosting” / „Kupiłem BTC za 1000 zł”
- „Pokaż statystyki za październik” → wykresy, obszary, portfel, wnioski
- „Ile zarobiłem w tym roku na teledyskach?”

## Rozbudowa – jak dodać nową umiejętność

1. **Nowa umiejętność bez programowania:** zakładka Umiejętności → „+ Nowa umiejętność” (albo plik `.md` w folderze `skills/`).
   Opisujesz, kiedy jej użyć, i podajesz instrukcje krok po kroku. Agent wczyta ją sam, gdy zadanie będzie pasować.
1. **Nowe narzędzie (kod):** w `tools.py` dodaj definicję do listy `TOOLS` i obsługę w `_execute()`. Agent sam zacznie z niego korzystać.
2. **Nowe zadanie w tle:** w `scheduler.py` dopisz funkcję, wpis w `JOBS` i `add_job` w `_plan()`. Pojawi się w Ustawieniach z przyciskiem „Uruchom teraz”.
   Analiza krypto ma gotowe miejsce w `crypto.analyze_market()`.
3. **Gotowe integracje (MCP):** zakładka Umiejętności albo plik `mcp_servers.json` (wzór: `mcp_servers.example.json`).
   Więcej w [REPOZYTORIA.md](REPOZYTORIA.md).

## Bezpieczeństwo
- Dashboard słucha tylko na `127.0.0.1` (niedostępny z sieci). Nie zmieniaj `HOST` na `0.0.0.0` bez dodania hasła.
- Telegram: bot obsługuje wyłącznie dodane czaty (`TELEGRAM_ALLOWED_CHAT_IDS`).
- Miniatury, „Otwórz folder”, oglądanie zdjęć i czytanie dokumentów przez agenta działają tylko dla plików z zaindeksowanych folderów.
- Serwery MCP to zewnętrzny kod: włączaj tylko zaufane. `mcp_servers.json` może zawierać tokeny, dlatego jest w `.gitignore`.
- Mikrofon i kamera działają tylko w trakcie rozmowy. Rozpoznawanie mowy w Chrome/Edge przetwarza głos na serwerach Google/Microsoft.
  Whisper działa w całości lokalnie.
- Agent nie usuwa plików z dysku i nie ma dostępu do terminala — tylko czyta indeks i może otworzyć folder.
- Krypto: tylko odczyt cen i alerty. Żadnych kluczy giełdowych ani transakcji.
- Plik `.env` zawiera klucze — nie wysyłaj go nikomu i nie wrzucaj do repozytorium (jest w `.gitignore`).

## Pliki projektu

| Plik | Rola |
|---|---|
| `main.py` | Start: serwer dashboardu + API, bot Telegram, harmonogram |
| `agent.py` | Pętla agenta Claude (pamięć rozmowy, narzędzia, web search) |
| `tools.py` | Umiejętności agenta (kalendarz, zadania, pomysły, pliki, krypto, powiadomienia) |
| `telegram_bot.py` | Bot Telegram + komendy `/dzis`, `/zadania`, `/pomysl`, `/szukaj`, `/nowy` |
| `scheduler.py` | Przypomnienia, poranny brief, alerty krypto, nocne skanowanie |
| `file_indexer.py` | Indeks plików z dysku, EXIF, miniatury |
| `crypto.py` | Ceny CoinGecko i alerty |
| `db.py` | Baza SQLite w `data/agent.db` |
| `ics.py` | Import i eksport kalendarza `.ics` |
| `voice.py` | Głos: synteza (edge-tts) i rozpoznawanie mowy (faster-whisper) |
| `memory.py` | Pamięć: wyszukiwanie w historii (FTS5) i streszczenia rozmów |
| `skills.py`, `skills/` | Umiejętności (instrukcje w Markdown) |
| `auth.py` | Logowanie przy dostępie z sieci (hasło, 2FA, sesje) |
| `computer.py` | Sterowanie komputerem + kolejka zatwierdzeń |
| `advisor.py` | Doradca: wnioski, automatyzacje, przegląd tygodnia |
| `knowledge_base.py` | Pamięć lokalna: wyszukiwanie semantyczne, graf osób i firm, decyzje |
| `media.py` | Import z karty, archiwizacja, napisy |
| `evals.py` | Testy jakości modelu |
| `stratfanat.py`, `brand/` | Marka Stratfanat: magazyn, sprzedaż, kolekcje, projekty, trendy |
| `websites.py` | Strony klientów: monitoring i audyt |
| `trading/`, `knowledge/trading/` | Trading demo (z projektu MESSUAI) |
| `modules.py` | Rejestr modułów z narzędziami |
| `searxng/` | Gotowa konfiguracja własnej wyszukiwarki |
| `local_llm.py` | Darmowy model lokalny (Ollama): pętla agenta, pobieranie modeli |
| `finance.py` | Finanse, raporty i portfel |
| `profil.md` | Co agent wie o Tobie od startu |
| `extra_tools.py` | Pogoda i złota godzina, oglądanie zdjęć, dokumenty, waluty, analiza krypto |
| `mcp_client.py` | Podłączanie serwerów MCP |
| `config.py` | Ustawienia (`.env`), edytowalne z dashboardu |
| `static/` | Dashboard (`index.html`, `app.css`, `app.js`, `voice.js` – rozmowa głosowa, `charts.js` – wykresy) |
| `data/` | Baza, kopie zapasowe, miniatury (tworzone automatycznie, nie trafiają do repozytorium) |
