"""Mózg agenta: pętla Claude + narzędzia."""
import asyncio
import logging

import anthropic

import db
from config import ANTHROPIC_API_KEY, EFFORT, FALLBACKS, MODEL, USER_NAME, USER_PROFILE
from tools import SERVER_TOOLS, TOOLS, execute

log = logging.getLogger("agent")
client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY or None)

HISTORY_TURNS = 20      # ile ostatnich wiadomości rozmowy pamiętać w kontekście
MAX_STEPS = 15          # maksymalna liczba kroków (wywołań narzędzi) na jedno polecenie
_locks: dict[str, asyncio.Lock] = {}

BASE_PROMPT = f"""Jesteś osobistym agentem AI, doradcą i asystentem użytkownika{f' ({USER_NAME})' if USER_NAME else ''}.
O użytkowniku: {USER_PROFILE or 'brak opisu'}

Twoje role:
- Doradca kreatywny: pomagasz rozwijać pomysły na sesje zdjęciowe, teledyski, ujęcia, światło, kadry, scenariusze i
  shot-listy. Myślisz jak doświadczony operator i fotograf: konkret, sprzęt, światło, lokacja, logistyka, budżet.
- Planista: prowadzisz kalendarz i listę zadań. Duże projekty rozbijasz na kroki z terminami
  (preprodukcja -> zdjęcia -> selekcja/montaż -> kolor -> oddanie klientowi).
- Strażnik pomysłów: każdy pomysł, o którym użytkownik wspomni, zapisujesz narzędziem add_idea.
- Znasz pliki na komputerze użytkownika (search_files) i pomagasz je odnaleźć - podawaj pełne ścieżki.
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


def _system_prompt() -> list[dict]:
    facts = db.query("SELECT id, fact FROM memory ORDER BY id")
    memory = "\n".join(f"[{f['id']}] {f['fact']}" for f in facts) or "(pusto)"
    return [
        {"type": "text", "text": BASE_PROMPT},
        {"type": "text", "text": f"Pamięć długoterminowa (fakty o użytkowniku):\n{memory}"},
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


async def run(user_text: str, session: str = "web", save: bool = True) -> str:
    """Wykonuje jedno polecenie użytkownika i zwraca odpowiedź tekstową."""
    if not ANTHROPIC_API_KEY:
        return "⚠️ Brak ANTHROPIC_API_KEY w pliku .env - agent nie ma jeszcze mózgu."

    lock = _locks.setdefault(session, asyncio.Lock())
    async with lock:
        n = db.now()
        stamp = f"[Teraz: {n:%Y-%m-%d %H:%M}, {WEEKDAYS[n.weekday()]}]"
        messages = _history(session) if save else []
        messages.append({"role": "user", "content": f"{stamp}\n{user_text}"})

        extra = {}
        if FALLBACKS:
            extra = {"betas": ["server-side-fallback-2026-07-01"], "fallbacks": "default"}

        reply = ""
        for _ in range(MAX_STEPS):
            try:
                response = await client.beta.messages.create(
                    model=MODEL,
                    max_tokens=16000,
                    system=_system_prompt(),
                    tools=[*TOOLS, *SERVER_TOOLS],
                    messages=messages,
                    output_config={"effort": EFFORT},
                    cache_control={"type": "ephemeral"},
                    **extra,
                )
            except anthropic.AuthenticationError:
                return "⚠️ Nieprawidłowy ANTHROPIC_API_KEY."
            except anthropic.RateLimitError:
                return "⚠️ Limit zapytań API - spróbuj za chwilę."
            except anthropic.APIStatusError as e:
                log.exception("Błąd API")
                return f"⚠️ Błąd API Claude ({e.status_code}): {e.message}"
            except anthropic.APIConnectionError:
                return "⚠️ Brak połączenia z API Claude - sprawdź internet."

            messages.append({"role": "assistant", "content": response.content})

            if response.stop_reason == "refusal":
                reply = _text(response.content) or "Nie mogę pomóc w tej sprawie."
                break
            if response.stop_reason == "pause_turn":
                continue  # długie wyszukiwanie w sieci - kontynuuj
            if response.stop_reason != "tool_use":
                reply = _text(response.content)
                break

            calls = [b for b in response.content if b.type == "tool_use"]
            results = await asyncio.gather(*(execute(c.name, c.input) for c in calls))
            messages.append({"role": "user", "content": [
                {"type": "tool_result", "tool_use_id": c.id, "content": r} for c, r in zip(calls, results)
            ]})
        else:
            reply = _text(messages[-1]["content"]) if messages[-1]["role"] == "assistant" else ""
            reply = reply or "Zadanie wymagało zbyt wielu kroków - doprecyzuj proszę polecenie."

        reply = reply or "✅ Gotowe."
        if save:
            db.insert("chat", {"session": session, "role": "user", "content": user_text, "created": db.now_str()})
            db.insert("chat", {"session": session, "role": "assistant", "content": reply, "created": db.now_str()})
        return reply
