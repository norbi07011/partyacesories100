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
| 💬 Czat w dashboardzie i na Telegramie | Piszesz normalnie: „jutro 10:00 sesja z Kasią w Łazienkach” → agent sam wpisuje do kalendarza |
| 📅 Kalendarz | Sesje / teledyski / spotkania / montaże. Przypomnienie na Telegram przed wydarzeniem |
| ✅ Zadania | Kanban: do zrobienia → w trakcie → zrobione. Agent rozbija projekty na kroki z terminami |
| 💡 Pomysły | Każdy pomysł z rozmowy trafia do bazy; agent pomaga go rozwinąć (światło, kadry, shot-lista) |
| 📁 Pliki | Indeks folderów ze zdjęciami/wideo (RAW, BRAW, MOV, projekty DaVinci/Premiere/Lightroom…). „Gdzie są zdjęcia ze ślubu Nowaków?” |
| 🌐 Internet | Wyszukiwanie i czytanie stron (sprzęt, ceny, lokacje, trendy) ze źródłami |
| 🔔 Powiadomienia | Telegram + dashboard + powiadomienia systemowe przeglądarki |
| ☀️ Poranny brief | Codziennie o 8:00 plan dnia na Telegram |
| 🧠 Pamięć | Agent zapamiętuje fakty o Tobie, klientach, sprzęcie |
| 📈 Krypto | Ceny, alerty cenowe na Telegram — gotowe miejsce na analizy w tle |

## Instalacja (ok. 10 minut)

### 1. Zainstaluj Pythona
Windows: https://www.python.org/downloads/ → przy instalacji zaznacz **„Add Python to PATH”**. Wymagany Python 3.10+.

### 2. Pobierz agenta
Skopiuj folder `personal-agent` na dysk, np. `C:\Agent\`.

### 3. Klucz do Claude (mózg agenta)
1. Wejdź na https://console.anthropic.com → zarejestruj się → **API Keys** → *Create Key*.
2. Doładuj konto (Billing). Płacisz za użycie – sprawdzaj koszty w zakładce Usage;
   koszt obniżysz, ustawiając `AGENT_EFFORT=low` albo `AGENT_MODEL=claude-sonnet-5-5`.

### 4. Bot Telegram
1. W Telegramie napisz do **@BotFather** → `/newbot` → podaj nazwę → skopiuj **token**.
2. Token wklej do `.env` jako `TELEGRAM_BOT_TOKEN`.
3. Uruchom agenta, napisz do swojego bota `/start` – odpisze Twoje **chat_id**.
4. Wpisz je do `.env` jako `TELEGRAM_ALLOWED_CHAT_IDS` i uruchom agenta ponownie.
   Bot odpowiada **tylko** na czaty z tej listy.

### 5. Uruchom
- **Windows:** dwuklik `start.bat` (za pierwszym razem zainstaluje wszystko i otworzy `.env` do uzupełnienia)
- **Mac / Linux:** `./start.sh`

Dashboard otworzy się pod **http://127.0.0.1:8765**.

### 6. Ustaw foldery z plikami
W `.env`:
```
WATCH_FOLDERS=D:\Zdjecia;D:\Teledyski;E:\Archiwum
```
Agent skanuje je przy starcie i co noc o 3:30 (albo przycisk „Przeskanuj foldery”).
Indeksuje nazwy, ścieżki, typy, rozmiary i daty — nie wysyła Twoich plików nigdzie.

### 7. Autostart z Windows (opcjonalnie)
`Win + R` → `shell:startup` → wklej tam skrót do `start.bat`.

## Przykładowe polecenia

- „W sobotę 14:00 plener z Martą w Kazimierzu, przypomnij mi dzień wcześniej o naładowaniu baterii”
- „Rozpisz mi produkcję teledysku dla zespołu X — zdjęcia 5 grudnia, oddanie do 20-go”
- „Pomysł: teledysk w jednym ujęciu w pustym basenie, zimne światło” → zapisany i rozwinięty
- „Gdzie są surówki BRAW z października?”
- „Znajdź w sieci najlepsze lampy LED do 3000 zł i porównaj”
- „Ile jest teraz bitcoin? Daj znać, jak spadnie poniżej 80 tys. USD”
- „Zapamiętaj: moja stawka za dzień zdjęciowy to 2500 zł netto”

## Rozbudowa – jak dodać nową umiejętność

1. **Nowe narzędzie:** w `tools.py` dodaj definicję do listy `TOOLS` i obsługę w `_execute()`. Agent sam zacznie z niego korzystać.
2. **Nowe zadanie w tle:** w `scheduler.py` dopisz funkcję i `scheduler.add_job(...)` (np. analiza krypto co godzinę → `notify(...)`).
3. **Gotowe integracje (MCP):** patrz [REPOZYTORIA.md](REPOZYTORIA.md) — Google Calendar, Gmail, Notion, giełdy itd.

## Bezpieczeństwo
- Dashboard słucha tylko na `127.0.0.1` (niedostępny z sieci). Nie zmieniaj `HOST` na `0.0.0.0` bez dodania hasła.
- Telegram: bot obsługuje wyłącznie chat_id z `TELEGRAM_ALLOWED_CHAT_IDS`.
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
| `file_indexer.py` | Indeks plików z dysku |
| `crypto.py` | Ceny CoinGecko i alerty |
| `db.py` | Baza SQLite w `data/agent.db` |
| `static/index.html` | Dashboard |
