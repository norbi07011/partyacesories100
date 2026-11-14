"""Mózg agenta: pętla Claude + narzędzia, ze strumieniowaniem odpowiedzi i obsługą zdjęć."""
import asyncio
import logging
from typing import Awaitable, Callable

import anthropic

import config
import db
import extra_tools
import mcp_client
import memory
import skills
from tools import SERVER_TOOLS, TOOLS, execute

log = logging.getLogger("agent")

HISTORY_TURNS = 20      # ile ostatnich wiadomości rozmowy pamiętać w kontekście
MAX_STEPS = 15          # maksymalna liczba kroków (wywołań narzędzi) na jedno polecenie
_locks: dict[str, asyncio.Lock] = {}
_client: anthropic.AsyncAnthropic | None = None
_client_key: str | None = None

Emit = Callable[[dict], Awaitable[None]]

TOOL_LABELS = {
    "add_task": "Dodaję zadanie", "list_tasks": "Sprawdzam zadania", "update_task": "Aktualizuję zadanie",
    "delete_task": "Usuwam zadanie", "add_event": "Wpisuję do kalendarza", "list_events": "Sprawdzam kalendarz",
    "update_event": "Zmieniam wydarzenie", "delete_event": "Usuwam wydarzenie", "add_idea": "Zapisuję pomysł",
    "list_ideas": "Przeglądam pomysły", "update_idea": "Rozwijam pomysł", "remember": "Zapamiętuję",
    "forget": "Usuwam z pamięci", "search_files": "Szukam plików na dysku", "file_stats": "Sprawdzam pliki",
    "reindex_files": "Skanuję foldery", "send_notification": "Wysyłam powiadomienie",
    "schedule_reminder": "Ustawiam przypomnienie", "crypto_prices": "Sprawdzam ceny krypto",
    "add_price_alert": "Ustawiam alert cenowy", "list_price_alerts": "Sprawdzam alerty",
    "add_project": "Zakładam projekt", "list_projects": "Przeglądam projekty", "update_project": "Aktualizuję projekt",
    "web_search": "Szukam w internecie", "web_fetch": "Czytam stronę",
    **extra_tools.LABELS,
}
# które widoki dashboardu odświeżyć po danym narzędziu
TOOL_CHANGES = {
    "add_task": "tasks", "update_task": "tasks", "delete_task": "tasks", "schedule_reminder": "tasks",
    "add_event": "events", "update_event": "events", "delete_event": "events",
    "add_idea": "ideas", "update_idea": "ideas", "remember": "memory", "forget": "memory",
    "add_project": "projects", "update_project": "projects", "add_price_alert": "alerts",
    "send_notification": "notifications", "reindex_files": "files",
    **extra_tools.CHANGES,
}

BASE_PROMPT = """Jesteś osobistym agentem AI, doradcą i asystentem użytkownika.

Twoje role:
- Doradca kreatywny: pomagasz rozwijać pomysły na sesje zdjęciowe, teledyski, ujęcia, światło, kadry, scenariusze i
  shot-listy. Myślisz jak doświadczony operator i fotograf: konkret, sprzęt, światło, lokacja, logistyka, budżet.
  Gdy użytkownik przyśle zdjęcie lub kadr - oceniasz kompozycję, światło, kolor i podpowiadasz, co poprawić.
- Planista: prowadzisz kalendarz, zadania i projekty (zlecenia klientów). Duże projekty rozbijasz na kroki z terminami
  (preprodukcja -> zdjęcia -> selekcja/montaż -> kolor -> oddanie klientowi) i łączysz je z projektem.
- Strażnik pomysłów: każdy pomysł, o którym użytkownik wspomni, zapisujesz narzędziem add_idea.
- Znasz pliki na komputerze użytkownika (search_files, także po aparacie i obiektywie z EXIF) i pomagasz je
  odnaleźć - podawaj pełne ścieżki folderów.
- Szukasz w internecie (web_search / web_fetch), gdy pytanie dotyczy aktualnych informacji, cen, sprzętu,
  lokacji, trendów - i podajesz źródła.
- Krypto: sprawdzasz ceny, analizę techniczną i ustawiasz alerty. Nie udzielasz porad inwestycyjnych - podajesz dane i ryzyka.
- Planując plener sprawdzasz pogodę oraz złotą i niebieską godzinę (weather_forecast).
- Oglądasz zdjęcia z dysku (view_photos), czytasz dokumenty (read_document), sprawdzasz pliki wideo (media_info).
- Dłuższe materiały (shot-listy, wyceny, briefy, call sheety) zapisujesz w bibliotece dokumentów (save_document).
- Pamiętasz wszystko: gdy użytkownik nawiązuje do wcześniejszych rozmów lub ustaleń, użyj recall.
- Prowadzisz finanse: każdy przychód, koszt, stratę i inwestycję, o której wspomni użytkownik, zapisujesz od razu
  (add_transaction) z właściwym obszarem (Stratfanat, Strony WWW, Teledyski, Fotografia, Krypto, Prywatne).
  Gdy prosi o statystyki / raport / „jak mi idzie” – użyj umiejętności Raport finansowy i pokaż wykresy jako bloki ```chart.

Zasady:
- Odpowiadaj po polsku, zwięźle i konkretnie. Formatuj krótkim markdownem (listy, pogrubienia).
- Działaj, zamiast pytać: jeśli prośba jest jasna (np. "jutro o 10 sesja z Kasią w Łazienkach"), od razu użyj narzędzi
  i potwierdź, co zrobiłeś. Dopytuj tylko, gdy brakuje czegoś kluczowego.
- Daty interpretuj względem aktualnego czasu podanego w wiadomości. Format dat w narzędziach: YYYY-MM-DDTHH:MM.
- Zapisuj w pamięci (remember) trwałe fakty: klienci, sprzęt, stawki, preferencje, ważne osoby.
- Nie usuwaj danych bez wyraźnej prośby użytkownika.
"""

WEEKDAYS = ["poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota", "niedziela"]


def get_client() -> anthropic.AsyncAnthropic:
    """Klient tworzony na nowo, gdy klucz zmieni się w ustawieniach."""
    global _client, _client_key
    if _client is None or _client_key != config.ANTHROPIC_API_KEY:
        _client = anthropic.AsyncAnthropic(api_key=config.ANTHROPIC_API_KEY or None)
        _client_key = config.ANTHROPIC_API_KEY
    return _client


VOICE_PROMPT = """TRYB ROZMOWY GŁOSOWEJ: Twoja odpowiedź zostanie przeczytana na głos. Mów naturalnie i krótko
(zwykle 1-3 zdania, maks. ok. 80 słów), jak w rozmowie telefonicznej. Bez markdown, list, tabel, emoji i linków.
Liczby i godziny zapisuj tak, by dobrze brzmiały. Jeśli wynik jest długi (np. shot-lista), zapisz go narzędziem
save_document i powiedz krótko, co zapisałeś. Gdy coś jest niejasne, dopytaj jednym krótkim pytaniem."""


def tool_list(local: bool = False) -> list[dict]:
    web = extra_tools.LOCAL_WEB_TOOLS if local else SERVER_TOOLS
    return [*TOOLS, *extra_tools.TOOLS, *mcp_client.manager.tool_defs(), *web]


def profile_text() -> str:
    try:
        return config.PROFILE_PATH.read_text(encoding="utf-8").strip()
    except OSError:
        return ""


def _system_prompt(voice: bool = False) -> list[dict]:
    facts = db.query("SELECT id, fact FROM memory ORDER BY id")
    mem = "\n".join(f"[{f['id']}] {f['fact']}" for f in facts) or "(pusto)"
    who = f"Użytkownik: {config.USER_NAME or 'nieznane imię'}. {config.USER_PROFILE}".strip()
    blocks = [{"type": "text", "text": BASE_PROMPT}]
    prof = profile_text()
    if prof:
        blocks.append({"type": "text", "text": f"PROFIL UŻYTKOWNIKA (to wiesz o nim od początku):\n{prof}"})
    catalog = skills.catalog_text()
    if catalog:
        blocks.append({"type": "text", "text": catalog})
    summary = memory.current_summary()
    blocks.append({"type": "text", "text": f"{who}\n\nPamięć długoterminowa (fakty o użytkowniku):\n{mem}"
                   + (f"\n\nNotatnik pamięci (streszczenie wcześniejszych rozmów):\n{summary}" if summary else "")})
    if voice:
        blocks.append({"type": "text", "text": VOICE_PROMPT})
    return blocks


def _history(session: str) -> list[dict]:
    rows = db.query("SELECT role, content FROM chat WHERE session = ? ORDER BY id DESC LIMIT ?",
                    (session, HISTORY_TURNS))
    rows.reverse()
    msgs: list[dict] = []
    for r in rows:
        if msgs and msgs[-1]["role"] == r["role"]:
            msgs[-1]["content"] += "\n\n" + r["content"]
        else:
            msgs.append({"role": r["role"], "content": r["content"]})
    while msgs and msgs[0]["role"] != "user":
        msgs.pop(0)
    return msgs


def _text(content) -> str:
    return "\n".join(b.text for b in content if getattr(b, "type", "") == "text").strip()


async def _noop(_: dict) -> None:
    return None


async def run(user_text: str, session: str = "web", save: bool = True,
              images: list[dict] | None = None, emit: Emit | None = None, voice: bool = False) -> str:
    """Wykonuje polecenie użytkownika i zwraca odpowiedź tekstową.

    images: lista {"media_type": "image/jpeg", "data": "<base64>"}
    emit: opcjonalny callback dostający zdarzenia {"type": "text"|"tool"|"changed", ...} do podglądu na żywo.
    """
    emit = emit or _noop
    local = config.PROVIDER == "ollama"
    if not local and not config.ANTHROPIC_API_KEY:
        return ("⚠️ Agent nie ma jeszcze klucza do Claude. Wejdź w **Ustawienia** i wklej klucz API "
                "albo wybierz darmowy model lokalny (Ollama).")

    lock = _locks.setdefault(session, asyncio.Lock())
    async with lock:
        n = db.now()
        stamp = f"[Teraz: {n:%Y-%m-%d %H:%M}, {WEEKDAYS[n.weekday()]}]"
        history = _history(session) if save else []
        text = f"{stamp}\n{user_text or 'Co sądzisz o tym zdjęciu?'}"
        if local:
            import local_llm
            system = "\n\n".join(b["text"] for b in _system_prompt(voice))
            parts, changed, error = await local_llm.run_loop(system, history, text, images, tool_list(local=True),
                                                             execute, emit, MAX_STEPS)
        else:
            content: list[dict] = [
                {"type": "image", "source": {"type": "base64", "media_type": im["media_type"], "data": im["data"]}}
                for im in (images or [])
            ]
            content.append({"type": "text", "text": text})
            parts, changed, error = await _run_claude([*history, {"role": "user", "content": content}], voice, emit)
        if error:
            return "⚠️ " + error
        reply = "\n\n".join(parts).strip() or "✅ Gotowe."
        if save:
            saved_user = ("🎙 " if voice else "") + ("[📷 zdjęcie] " if images else "") + (user_text or "")
            db.insert("chat", {"session": session, "role": "user", "content": saved_user, "created": db.now_str()})
            db.insert("chat", {"session": session, "role": "assistant", "content": reply, "created": db.now_str()})
            asyncio.create_task(memory.maybe_summarize(complete))
        return reply


async def complete(prompt: str, max_tokens: int = 4000) -> str:
    """Jedno proste zapytanie do aktualnego modelu (np. streszczenia pamięci)."""
    if config.PROVIDER == "ollama":
        import local_llm
        return await local_llm.complete(prompt, max_tokens)
    resp = await get_client().messages.create(model=config.MODEL, max_tokens=max_tokens, output_config={"effort": "low"},
                                              messages=[{"role": "user", "content": prompt}])
    return "\n".join(b.text for b in resp.content if b.type == "text").strip()


async def _run_claude(messages: list[dict], voice: bool, emit: Emit) -> tuple[list[str], set[str], str | None]:
    extra = {"betas": ["server-side-fallback-2026-07-01"], "fallbacks": "default"} if config.FALLBACKS else {}
    client = get_client()
    parts: list[str] = []
    changed: set[str] = set()
    for _ in range(MAX_STEPS):
        try:
            async with client.beta.messages.stream(
                model=config.MODEL,
                max_tokens=32000,
                system=_system_prompt(voice),
                tools=tool_list(),
                messages=messages,
                output_config={"effort": config.EFFORT},
                cache_control={"type": "ephemeral"},
                **extra,
            ) as stream:
                async for event in stream:
                    etype = getattr(event, "type", "")
                    if etype == "text":
                        await emit({"type": "text", "text": event.text})
                    elif etype == "content_block_start":
                        block = event.content_block
                        if getattr(block, "type", "") in ("tool_use", "server_tool_use"):
                            await emit({"type": "tool", "name": block.name,
                                        "label": TOOL_LABELS.get(block.name, block.name)})
                response = await stream.get_final_message()
        except anthropic.AuthenticationError:
            return parts, changed, "Nieprawidłowy klucz API Claude — popraw go w **Ustawieniach**."
        except anthropic.PermissionDeniedError as e:
            return parts, changed, f"Brak dostępu do modelu {config.MODEL}: {e.message}"
        except anthropic.RateLimitError:
            return parts, changed, "Limit zapytań API — spróbuj za chwilę."
        except anthropic.APIStatusError as e:
            log.exception("Błąd API")
            return parts, changed, f"Błąd API Claude ({e.status_code}): {e.message}"
        except anthropic.APIConnectionError:
            return parts, changed, "Brak połączenia z API Claude — sprawdź internet."

        messages.append({"role": "assistant", "content": response.content})
        step_text = _text(response.content)
        if step_text:
            parts.append(step_text)
        if response.stop_reason == "refusal":
            if not step_text:
                parts.append("Nie mogę pomóc w tej sprawie.")
            break
        if response.stop_reason == "pause_turn":
            continue  # długie wyszukiwanie w sieci - kontynuuj
        if response.stop_reason != "tool_use":
            break
        calls = [b for b in response.content if b.type == "tool_use"]
        results = await asyncio.gather(*(execute(c.name, c.input) for c in calls))
        messages.append({"role": "user", "content": [
            {"type": "tool_result", "tool_use_id": c.id, "content": r} for c, r in zip(calls, results)
        ]})
        now_changed = {TOOL_CHANGES[c.name] for c in calls if c.name in TOOL_CHANGES}
        if now_changed:
            changed |= now_changed
            await emit({"type": "changed", "what": sorted(now_changed)})
        await emit({"type": "text", "text": "\n\n"})
    else:
        parts.append("_Zadanie wymagało zbyt wielu kroków — doprecyzuj proszę polecenie._")
    return parts, changed, None
