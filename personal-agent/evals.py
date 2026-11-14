"""Testy jakości: czy model (lokalny albo Claude) poprawnie używa narzędzi – finanse, zadania, kalendarz, pamięć…

Narzędzia NIE są naprawdę wykonywane: wywołania są przechwytywane i porównywane z oczekiwaniami,
więc test nie zmienia Twoich danych. Uruchamiaj po każdej zmianie modelu (Ustawienia → Testy jakości).
"""
import json
import time
from datetime import timedelta

import config
import db

SCHEMA = """
CREATE TABLE IF NOT EXISTS eval_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model TEXT NOT NULL, passed INTEGER, total INTEGER, seconds REAL, details TEXT, created TEXT NOT NULL
);
"""
STATE = {"running": False, "progress": 0, "total": 0, "current": None}


def init() -> None:
    with db._lock:
        db._conn.executescript(SCHEMA)
        db._conn.commit()


def _call(calls, *names):
    return [c for c in calls if c["name"] in names]


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _weekday_date(weekday: int) -> str:
    now = db.now()
    days = (weekday - now.weekday()) % 7 or 7
    return (now + timedelta(days=days)).strftime("%Y-%m-%d")


CASES = [
    {"id": "koszt_hosting", "prompt": "Zapłaciłem dziś 89 zł za hosting strony klienta.",
     "check": lambda c: any(x["args"].get("type") == "koszt" and _num(x["args"].get("amount")) == 89
                            and x["args"].get("area") == "Strony WWW" for x in _call(c, "add_transaction")),
     "expect": "add_transaction: koszt 89 zł, obszar Strony WWW"},
    {"id": "sprzedaz_bluzy", "prompt": "Sprzedałem 3 bluzy Stratfanat po 180 zł.",
     "check": lambda c: any(x["args"].get("type") == "przychod" and _num(x["args"].get("amount")) == 540
                            and x["args"].get("area") == "Stratfanat" for x in _call(c, "add_transaction"))
     or bool(_call(c, "record_sale")),
     "expect": "przychód 540 zł Stratfanat (add_transaction albo record_sale)"},
    {"id": "inwestycja_btc", "prompt": "Kupiłem bitcoina za 1000 zł.",
     "check": lambda c: any(x["args"].get("type") == "inwestycja" and _num(x["args"].get("amount")) == 1000
                            for x in _call(c, "add_transaction")) or bool(_call(c, "add_holding")),
     "expect": "inwestycja 1000 zł (add_transaction/add_holding)"},
    {"id": "sesja_jutro", "prompt": "Jutro o 10:00 mam sesję zdjęciową z Kasią w Łazienkach.",
     "check": lambda c: any((x["args"].get("start") or "").startswith(
         (db.now() + timedelta(days=1)).strftime("%Y-%m-%d") + "T10") for x in _call(c, "add_event")),
     "expect": "add_event jutro 10:00"},
    {"id": "przypomnienie_piatek", "prompt": "Przypomnij mi w piątek o 15:00, żeby zadzwonić do drukarni.",
     "check": lambda c: any((x["args"].get("at") or x["args"].get("due") or "").startswith(_weekday_date(4) + "T15")
                            for x in _call(c, "schedule_reminder", "add_task")),
     "expect": "schedule_reminder/add_task na piątek 15:00"},
    {"id": "zadanie_pilne", "prompt": "Dodaj pilne zadanie: wysłać wycenę do Nocnego Miasta do środy.",
     "check": lambda c: any(x["args"].get("priority") == "high" and "wycen" in (x["args"].get("title") or "").lower()
                            for x in _call(c, "add_task")),
     "expect": "add_task z priorytetem high"},
    {"id": "statystyki", "prompt": "Pokaż moje statystyki finansowe za ten miesiąc.",
     "check": lambda c: bool(_call(c, "finance_report")), "expect": "finance_report"},
    {"id": "pomysl", "prompt": "Mam pomysł na koszulkę z grafiką neonowego miasta nocą.",
     "check": lambda c: bool(_call(c, "add_idea", "save_design", "design_mockup")), "expect": "add_idea"},
    {"id": "pogoda", "prompt": "Jaka będzie pogoda i złota godzina w sobotę w Krakowie?",
     "check": lambda c: any("krak" in (x["args"].get("place") or "").lower() for x in _call(c, "weather_forecast")),
     "expect": "weather_forecast place=Kraków"},
    {"id": "pamiec_firma", "prompt": "Zapamiętaj, że moja drukarnia to PrintHouse z Łodzi.",
     "check": lambda c: bool(_call(c, "remember", "remember_entity")), "expect": "remember/remember_entity"},
]

FAKE = {
    "list_tasks": [], "list_events": [], "list_projects": [], "list_ideas": [], "list_transactions": [],
    "finance_report": {"okres": "test", "podsumowanie": {"przychod": 1000, "koszt": 400, "zysk": 600}, "wykresy": []},
    "weather_forecast": {"miejsce": "Kraków", "dni": [{"data": "sobota", "pogoda": "słonecznie", "zlota_godzina_wieczor": "15:10–16:20"}]},
}


async def run() -> dict:
    import agent
    if STATE["running"]:
        return {"error": "Test już trwa"}
    STATE.update(running=True, progress=0, total=len(CASES), current=None)
    model = config.OLLAMA_MODEL if config.PROVIDER == "ollama" else config.MODEL
    results, t0 = [], time.time()
    try:
        for case in CASES:
            STATE["current"] = case["id"]
            calls: list[dict] = []

            async def recorder(name, args, _calls=calls):
                _calls.append({"name": name, "args": args or {}})
                return json.dumps(FAKE.get(name, {"ok": True, "id": 1}), ensure_ascii=False)

            t1 = time.time()
            try:
                reply = await agent.run(case["prompt"], session="system:eval", save=False, executor=recorder)
                ok = bool(case["check"](calls))
            except Exception as e:  # noqa: BLE001
                reply, ok = f"błąd: {e}", False
            results.append({"id": case["id"], "prompt": case["prompt"], "expect": case["expect"], "ok": ok,
                            "calls": [f"{c['name']}({json.dumps(c['args'], ensure_ascii=False)[:160]})" for c in calls],
                            "reply": (reply or "")[:300], "seconds": round(time.time() - t1, 1)})
            STATE["progress"] += 1
    finally:
        STATE["running"] = False
    passed = sum(r["ok"] for r in results)
    db.insert("eval_runs", {"model": model, "passed": passed, "total": len(results), "seconds": round(time.time() - t0, 1),
                            "details": json.dumps(results, ensure_ascii=False), "created": db.now_str()})
    return {"model": model, "passed": passed, "total": len(results), "results": results}


def history() -> list[dict]:
    rows = db.query("SELECT id, model, passed, total, seconds, created FROM eval_runs ORDER BY id DESC LIMIT 20")
    last = db.one("SELECT details FROM eval_runs ORDER BY id DESC LIMIT 1")
    return {"runs": rows, "last": json.loads(last["details"]) if last else [], "state": STATE}
