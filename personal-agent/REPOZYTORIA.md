# Najlepsze repozytoria pod osobistego agenta – analiza (listopad 2026)

Cel: agent na komputerze, który jest doradcą, planuje zadania, prowadzi kalendarz i pomysły, zna pliki na dysku,
szuka w sieci, pisze na Telegramie, a w przyszłości analizuje krypto w tle.

> Liczby gwiazdek się zmieniają, a część zestawień w sieci przygotowali dostawcy konkurencyjnych produktów.
> Przed instalacją sprawdź aktywność repozytorium (ostatnie commity, otwarte issues) i licencję.

## TL;DR – co wybrać

| Potrzeba | Wybór | Dlaczego |
|---|---|---|
| **Gotowy dashboard i Telegram pod Ciebie, prosta rozbudowa** | **Studio Agent (ten folder)** | Mały kod w Pythonie, który przeczytasz w całości. Kalendarz, pomysły, pliki, krypto pod zawód fotografa |
| Największy ekosystem gotowych „skills” i kanałów | **OpenClaw** | Najpopularniejszy agent open-source na komputer (Telegram, WhatsApp, Discord, pliki, kalendarz, przeglądarka) |
| Agent, który sam się uczy nowych umiejętności | **Hermes Agent** (Nous Research) | Pamięć i samodzielnie tworzone skills, działa na Telegramie i Discordzie |
| Najlżejszy rdzeń do własnych eksperymentów | **nanobot** / **NanoClaw** | Mały kod; NanoClaw jest zbudowany na Claude Agent SDK |
| Druga głowa / przeszukiwanie dokumentów | **Khoj** | Czat z własnymi notatkami i PDF-ami, wyszukiwanie semantyczne |
| Automatyzacje bez kodu | **n8n** | Setki integracji (Gmail, Google Calendar, Drive, Instagram) i wyzwalacze |
| Krypto (później) | **CCXT**, **Freqtrade** | Dane z ponad 100 giełd i backtesty strategii |

**Rekomendacja:** zacznij od **Studio Agent** (prywatny, prosty, pod Twój zawód). Gdy będziesz chciał więcej,
podłączaj gotowe serwery **MCP** (lista niżej) albo postaw obok **OpenClaw** czy **Hermes Agent** na ten sam bot Telegram.
To jednak oznacza drugą usługę do utrzymania.

---

## 1. Pełne agenty „od wszystkiego”

### OpenClaw — `github.com/openclaw/openclaw`
- Agent działający lokalnie, rozmawiasz z nim przez Telegram, WhatsApp, Discord lub Signal.
- Plusy: ogromna społeczność, rejestr gotowych umiejętności, pamięć, dostęp do plików, przeglądarki i terminala.
- Minusy: duża powierzchnia ataku. Ma pełny dostęp do komputera, a umiejętności od społeczności to cudzy kod.
  Instaluj tylko zaufane skills i najlepiej na osobnym koncie użytkownika.
- Instalacja: Node.js 22+, potem `npm i -g openclaw` i `openclaw onboard`.

### Hermes Agent (Nous Research) — `github.com/NousResearch/hermes-agent`
- Agent z pamięcią, który sam tworzy umiejętności z doświadczeń. Działa na Telegramie i Discordzie.
- Plusy: najbliższy odpowiednik OpenClaw, mocny w długotrwałej pamięci.
- Minusy: więcej konfiguracji. Najlepiej działa na serwerze lub VPS, który pracuje 24/7.

### nanobot / NanoClaw
- Małe rdzenie agentów: kanały czatu, WebUI, pamięć, MCP. NanoClaw (TypeScript) używa Claude Agent SDK.
- Dobre, jeśli chcesz zrozumieć cały kod i rozbudowywać go po swojemu.

### Inne warte uwagi
- **Open Interpreter** (`OpenInterpreter/open-interpreter`): agent wykonujący kod i polecenia na komputerze.
- **Nerve** (`serxa/nerve`): runtime na Claude Agent SDK z botem Telegram i pamięcią w Markdown.
- **MPA** (`mattmezza/mpa`): asystent w Dockerze z Telegramem, e-mailem i kalendarzem przez CalDAV.
- **Iva**: asystent na Telegramie, który zapisuje pamięć do sejfu Obsidian.

## 2. Mózg, pamięć i wiedza

| Repo | Do czego |
|---|---|
| `anthropics/claude-agent-sdk-python` | Silnik Claude Code jako biblioteka: pliki, bash, web, subagenci. Następny krok, jeśli agent ma też edytować pliki |
| `anthropics/anthropic-sdk-python` | Oficjalne SDK, którego używa Studio Agent |
| `khoj-ai/khoj` | Druga głowa: czat z dokumentami, notatkami, PDF-ami |
| `mem0ai/mem0` | Warstwa pamięci długoterminowej dla agentów |
| `letta-ai/letta` | Agenci ze stanem i pamięcią (dawniej MemGPT) |
| `open-webui/open-webui` | Alternatywny interfejs czatu, także z modelami lokalnymi (Ollama) |

## 3. Serwery MCP – gotowe „wtyczki” umiejętności

MCP (Model Context Protocol) to standard podłączania narzędzi do agentów AI. Repozytorium zbiorcze:
`modelcontextprotocol/servers` oraz lista `punkpeye/awesome-mcp-servers`.

| Umiejętność | Serwer MCP |
|---|---|
| Pliki na dysku (pełny odczyt i zapis) | `@modelcontextprotocol/server-filesystem` |
| Google Calendar / Gmail / Drive | oficjalne serwery Google Workspace MCP |
| Notion / Obsidian | `makenotion/notion-mcp-server`, serwery MCP dla Obsidiana |
| Przeglądarka (automatyzacja) | `microsoft/playwright-mcp` |
| Wyszukiwanie w sieci | Brave Search MCP, Tavily MCP (Studio Agent ma już web search przez Claude) |
| Pamięć w grafie | `@modelcontextprotocol/server-memory` |
| Social media (Instagram, TikTok, planowanie postów) | Metricool, Postiz |

## 4. Fotografia i wideo – przydatne narzędzia do podpięcia jako umiejętności

| Repo / narzędzie | Do czego |
|---|---|
| `exiftool` (Phil Harvey) / `pyexiftool` | Odczyt EXIF: aparat, obiektyw, ISO, data, GPS → wyszukiwanie „zdjęcia z 85 mm” |
| `immich-app/immich` | Samodzielnie hostowana galeria zdjęć z rozpoznawaniem twarzy i wyszukiwaniem semantycznym (CLIP) |
| `photoprism/photoprism` | Alternatywa dla Immich: katalog zdjęć z AI |
| `openai/whisper` / `SYSTRAN/faster-whisper` | Transkrypcja nagrań i wywiadów, napisy do teledysków |
| `FFmpeg` | Konwersje, proxy, miniatury klatek z wideo |
| `Breakthrough/PySceneDetect` | Automatyczne cięcie materiału na ujęcia |

## 5. Krypto (na przyszłość)

| Repo | Do czego |
|---|---|
| `ccxt/ccxt` | Jedno API do ponad 100 giełd: ceny, świece, order book (na start tylko odczyt) |
| `freqtrade/freqtrade` | Bot tradingowy z backtestami i powiadomieniami na Telegram |
| `hummingbot/hummingbot` | Market making i arbitraż (zaawansowane) |
| CoinGecko API | Używane już w Studio Agent: ceny bez klucza |

Zasada bezpieczeństwa: agent AI dostaje klucze giełdowe **tylko do odczytu**. Żadnych uprawnień do wypłat.

## 6. Co już jest wbudowane w Studio Agent

| Z ekosystemu | Jak użyte |
|---|---|
| `rany2/edge-tts` | Naturalny polski głos agenta (Zofia/Marek) w rozmowie i na Telegramie |
| `SYSTRAN/faster-whisper` | Rozpoznawanie mowy offline (głosówki Telegram, Firefox) |
| Web Speech API | Rozpoznawanie mowy w Chrome/Edge w rozmowie głosowej i dyktowaniu |
| `modelcontextprotocol/python-sdk` | Podłączanie dowolnych serwerów MCP (zakładka Umiejętności) |
| `ianare/exif-py`, Pillow, FFmpeg | EXIF, miniatury zdjęć, RAW i wideo, informacje o plikach wideo |
| `py-pdf/pypdf`, `python-docx` | Czytanie scenariuszy, briefów i umów |
| Open-Meteo, NBP, CoinGecko | Pogoda, kursy walut, krypto (bez kluczy) |
| SQLite FTS5 | Wyszukiwanie w całej historii rozmów (pamięć) |

## 7. Plan rozbudowy Studio Agent

1. ~~EXIF w indeksie plików~~ ✅  ~~Wiadomości głosowe~~ ✅  ~~Zdjęcia na Telegramie~~ ✅  ~~Moduł klientów~~ ✅
2. **Synchronizacja z Google Calendar:** kalendarz w telefonie (Google Calendar API albo MCP).
3. **Wiadomości głosowe na Telegramie:** transkrypcja przez Whisper, potem agent.
4. **Zdjęcia na Telegramie:** wysyłasz kadr, agent ocenia kompozycję i światło (Claude vision).
5. **Analiza krypto w tle:** CCXT + zadanie w `scheduler.py`, które co godzinę liczy wskaźniki i powiadamia o sygnałach.
6. **Moduł klientów (CRM):** wyceny, faktury, statusy zleceń.

## Źródła
- https://openalternative.co/blog/best-openclaw-alternatives
- https://composio.dev/blog/openclaw-alternatives
- https://www.bitdoze.com/openclaw-alternatives/
- https://theguidex.com/best-openclaw-alternatives/
- https://github.com/serxa/nerve
- https://awesome.ecosyste.ms/projects/github.com%2Fmattmezza%2Fmpa
- https://github.com/smixs/iva-agent/wiki
