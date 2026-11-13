"""Mózg agenta: pętla Claude + narzędzia, ze strumieniowaniem odpowiedzi i obsługą zdjęć."""
import asyncio
import logging
from typing import Awaitable, Callable

import anthropic

import config
import db
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
}
# które widoki dashboardu odświeżyć po danym narzędziu
TOOL_CHANGES = {
    "add_task": "tasks", "update_task": "tasks", "delete_task": "tasks", "schedule_reminder": "tasks",
    "add_event": "events", "update_event": "events", "delete_event": "events",
    "add_idea": "ideas", "update_idea": "ideas", "remember": "memory", "forget": "memory",
    "add_project": "projects", "update_project": "projects", "add_price_alert": "alerts",
    "send_notification": "notifications", "reindex_files": "files",
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
- Krypto: sprawdzasz ceny i ustawiasz alerty. Nie udzielasz porad inwestycyjnych - podajesz dane i ryzyka.

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


def _system_prompt() -> list[dict]:
    facts = db.query("SELECT id, fact FROM memory ORDER BY id")
    memory = "\n".join(f"[{f['id']}] {f['fact']}" for f in facts) or "(pusto)"
    who = f"Użytkownik: {config.USER_NAME or 'nieznane imię'}. {config.USER_PROFILE}".strip()
    return [
        {"type": "text", "text": BASE_PROMPT},
        {"type": "text", "text": f"{who}\n\nPamięć długoterminowa (fakty o użytkowniku):\n{memory}"},
    ]


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
              images: list[dict] | None = None, emit: Emit | None = None) -> str:
    """Wykonuje polecenie użytkownika i zwraca odpowiedź tekstową.

    images: lista {"media_type": "image/jpeg", "data": "<base64>"}
    emit: opcjonalny callback dostający zdarzenia {"type": "text"|"tool"|"changed", ...} do podglądu na żywo.
    """
    emit = emit or _noop
    if not config.ANTHROPIC_API_KEY:
        return ("⚠️ Agent nie ma jeszcze klucza do Claude. Wejdź w **Ustawienia** w dashboardzie i wklej "
                "klucz API z console.anthropic.com — pozostałe funkcje dashboardu działają bez niego.")

    lock = _locks.setdefault(session, asyncio.Lock())
    async with lock:
        n = db.now()
        stamp = f"[Teraz: {n:%Y-%m-%d %H:%M}, {WEEKDAYS[n.weekday()]}]"
        messages = _history(session) if save else []
        content: list[dict] = [
            {"type": "image", "source": {"type": "base64", "media_type": im["media_type"], "data": im["data"]}}
            for im in (images or [])
        ]
        content.append({"type": "text", "text": f"{stamp}\n{user_text or 'Co sądzisz o tym zdjęciu?'}"})
        messages.append({"role": "user", "content": content})

        extra = {"betas": ["server-side-fallback-2026-07-01"], "fallbacks": "default"} if config.FALLBACKS else {}
        client = get_client()
        parts: list[str] = []
        changed: set[str] = set()

        for _ in range(MAX_STEPS):
            try:
                async with client.beta.messages.stream(
                    model=config.MODEL,
                    max_tokens=32000,
                    system=_system_prompt(),
                    tools=[*TOOLS, *SERVER_TOOLS],
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
                return "⚠️ Nieprawidłowy klucz API Claude — popraw go w **Ustawieniach**."
            except anthropic.PermissionDeniedError as e:
                return f"⚠️ Brak dostępu do modelu {config.MODEL}: {e.message}"
            except anthropic.RateLimitError:
                return "⚠️ Limit zapytań API — spróbuj za chwilę."
            except anthropic.APIStatusError as e:
                log.exception("Błąd API")
                return f"⚠️ Błąd API Claude ({e.status_code}): {e.message}"
            except anthropic.APIConnectionError:
                return "⚠️ Brak połączenia z API Claude — sprawdź internet."

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

        reply = "\n\n".join(parts).strip() or "✅ Gotowe."
        if save:
            saved_user = ("[📷 zdjęcie] " if images else "") + (user_text or "")
            db.insert("chat", {"session": session, "role": "user", "content": saved_user, "created": db.now_str()})
            db.insert("chat", {"session": session, "role": "assistant", "content": reply, "created": db.now_str()})
        return reply
