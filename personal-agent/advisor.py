"""Doradca: agent sam pilnuje firmy.

1) Monitor (co godzinę, bez AI – szybko i lokalnie): szuka problemów i okazji → „wnioski” (insights)
   z priorytetem i sugestią. Nowe ważne wnioski idą na Telegram.
2) Reguły „jeśli… to…”: proste automatyzacje ustawiane w dashboardzie albo przez agenta.
3) Przegląd tygodniowy (poniedziałek rano): agent podsumowuje tydzień i daje rekomendacje.
"""
import json
import logging
from datetime import timedelta

import config
import db
from notifier import notify

log = logging.getLogger("advisor")

SCHEMA = """
CREATE TABLE IF NOT EXISTS insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    severity TEXT DEFAULT 'info',      -- info | warn | critical | opportunity
    area TEXT DEFAULT '',
    title TEXT NOT NULL,
    body TEXT DEFAULT '',
    suggestion TEXT DEFAULT '',
    status TEXT DEFAULT 'new',         -- new | seen | done | dismissed
    created TEXT NOT NULL,
    updated TEXT
);
CREATE TABLE IF NOT EXISTS rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    trigger TEXT NOT NULL,             -- daily | hourly | weekly | insight | transaction
    trigger_value TEXT DEFAULT '',     -- HH:MM | dzień tygodnia | typ wniosku | próg kwoty
    action TEXT NOT NULL,              -- notify | task | agent
    action_value TEXT DEFAULT '',      -- treść powiadomienia / tytuł zadania / polecenie dla agenta
    enabled INTEGER DEFAULT 1,
    last_run TEXT,
    runs INTEGER DEFAULT 0,
    created TEXT NOT NULL
);
"""
_providers = []   # moduły z funkcją alerts() -> list[dict] (np. stratfanat, websites)


def init() -> None:
    with db._lock:
        db._conn.executescript(SCHEMA)
        db._conn.commit()


def register_provider(fn) -> None:
    _providers.append(fn)


# ------------------------------------------------------------------ reguły wbudowane
def _pl(n: int, one: str, few: str, many: str) -> str:
    if n == 1:
        return f"{n} {one}"
    if 2 <= n % 10 <= 4 and not 12 <= n % 100 <= 14:
        return f"{n} {few}"
    return f"{n} {many}"


def _builtin_checks() -> list[dict]:
    out = []
    now = db.now()
    today = now.strftime("%Y-%m-%d")
    nows = now.strftime("%Y-%m-%dT%H:%M")

    # zadania po terminie
    overdue = db.query("SELECT id, title, due FROM tasks WHERE status != 'done' AND due IS NOT NULL AND due < ? ORDER BY due", (nows,))
    if overdue:
        out.append({"key": f"overdue_{today}", "severity": "warn" if len(overdue) < 5 else "critical", "area": "Zadania",
                    "title": f"{_pl(len(overdue), 'zadanie', 'zadania', 'zadań')} po terminie",
                    "body": "\n".join(f"• {t['title']} (termin {t['due'][:16].replace('T', ' ')})" for t in overdue[:8]),
                    "suggestion": "Przełóż albo zamknij zaległe zadania – poproś agenta o nowy plan na dziś."})

    # projekty oddane i nieopłacone > 7 dni
    for p in db.query("SELECT * FROM projects WHERE status = 'oddany' AND (paid IS NULL OR paid = 0)"):
        ref = p.get("deadline") or (p.get("created") or "")[:10]
        if ref and ref <= (now - timedelta(days=7)).strftime("%Y-%m-%d"):
            out.append({"key": f"unpaid_{p['id']}", "severity": "warn", "area": "Projekty",
                        "title": f"Nieopłacone: {p['name']} ({p['fee'] or 0:.0f} zł)",
                        "body": f"Projekt oddany, brak płatności od ponad 7 dni. Klient: {p.get('client') or '—'}.",
                        "suggestion": "Wyślij uprzejme przypomnienie o płatności (umiejętność Wiadomość do klienta)."})

    # projekty z terminem w ciągu 3 dni, które nie są w postprodukcji/oddane
    soon = (now + timedelta(days=3)).strftime("%Y-%m-%d")
    for p in db.query("SELECT * FROM projects WHERE deadline IS NOT NULL AND deadline BETWEEN ? AND ? "
                      "AND status IN ('zapytanie','potwierdzony','produkcja')", (today, soon)):
        out.append({"key": f"deadline_{p['id']}_{p['deadline']}", "severity": "warn", "area": "Projekty",
                    "title": f"Termin za ≤3 dni: {p['name']}", "body": f"Status: {p['status']}, oddanie {p['deadline']}.",
                    "suggestion": "Sprawdź, czy zdążysz – rozpisz ostatnie kroki na zadania."})

    # finanse: koszty w tym miesiącu vs średnia 3 miesięcy (per kategoria)
    month = now.strftime("%Y-%m")
    cur = {r["category"]: r["s"] for r in db.query(
        "SELECT category, SUM(amount) s FROM transactions WHERE type='koszt' AND substr(date,1,7)=? GROUP BY category", (month,))}
    prev = {r["category"]: r["s"] / 3 for r in db.query(
        "SELECT category, SUM(amount) s FROM transactions WHERE type='koszt' AND date >= date(?, '-3 months') AND date < ? "
        "GROUP BY category", (month + "-01", month + "-01"))}
    for cat, val in cur.items():
        avg = prev.get(cat) or 0
        if avg > 50 and val > avg * 1.5 and val - avg > 200:
            out.append({"key": f"costspike_{month}_{cat}", "severity": "warn", "area": "Finanse",
                        "title": f"Koszty „{cat or 'inne'}” wyższe o {round((val / avg - 1) * 100)}%",
                        "body": f"W tym miesiącu {val:.0f} zł, średnio {avg:.0f} zł/mies.",
                        "suggestion": "Sprawdź, skąd wzrost – może da się ograniczyć ten koszt."})

    # finanse: brak przychodów w obszarze, który zwykle zarabia (po 20. dniu miesiąca)
    if now.day >= 20:
        areas_prev = {r["area"] for r in db.query(
            "SELECT DISTINCT area FROM transactions WHERE type='przychod' AND date >= date(?, '-3 months') AND date < ?",
            (month + "-01", month + "-01"))}
        areas_now = {r["area"] for r in db.query(
            "SELECT DISTINCT area FROM transactions WHERE type='przychod' AND substr(date,1,7)=?", (month,))}
        for area in sorted(areas_prev - areas_now):
            out.append({"key": f"noincome_{month}_{area}", "severity": "opportunity", "area": "Finanse",
                        "title": f"Brak przychodów: {area} w tym miesiącu",
                        "body": "W poprzednich miesiącach ten obszar zarabiał.",
                        "suggestion": f"Zaplanuj działania sprzedażowe dla obszaru {area} (oferta, post, kontakt z klientami)."})

    # dysk z danymi
    try:
        import shutil
        u = shutil.disk_usage(config.DATA_DIR)
        if u.free / u.total < 0.08:
            out.append({"key": f"disk_{today}", "severity": "critical", "area": "Komputer",
                        "title": f"Mało miejsca na dysku: {u.free / 1e9:.0f} GB wolne",
                        "body": "Kończy się miejsce na dysku z danymi agenta.",
                        "suggestion": "Zarchiwizuj stare projekty wideo/zdjęcia na dysk zewnętrzny."})
    except OSError:
        pass

    # pomysły nowe od >30 dni
    old_ideas = db.one("SELECT COUNT(*) n FROM ideas WHERE status='nowy' AND created < ?",
                       ((now - timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%S"),))
    if old_ideas and old_ideas["n"] >= 3:
        out.append({"key": f"ideas_{month}", "severity": "opportunity", "area": "Pomysły",
                    "title": f"{_pl(old_ideas['n'], 'pomysł czeka', 'pomysły czekają', 'pomysłów czeka')} ponad miesiąc",
                    "body": "Masz pomysły, do których nie wróciłeś.",
                    "suggestion": "Wybierz jeden i rozwiń go z agentem – może to następny projekt lub drop."})
    return out


async def run_monitor() -> list[dict]:
    """Zbiera wnioski ze wszystkich źródeł, zapisuje nowe, powiadamia o ważnych."""
    found = _builtin_checks()
    for prov in _providers:
        try:
            found.extend(prov() or [])
        except Exception as e:  # noqa: BLE001
            log.warning("Źródło wniosków nie zadziałało: %s", e)
    new = []
    for f in found:
        existing = db.one("SELECT id, status FROM insights WHERE key = ?", (f["key"],))
        if existing:
            if existing["status"] in ("new", "seen"):
                db.update("insights", existing["id"], {"title": f["title"], "body": f.get("body", ""), "updated": db.now_str()})
            continue
        iid = db.insert("insights", {"key": f["key"], "severity": f.get("severity", "info"), "area": f.get("area", ""),
                                     "title": f["title"], "body": f.get("body", ""), "suggestion": f.get("suggestion", ""),
                                     "status": "new", "created": db.now_str()})
        new.append({**f, "id": iid})
    for f in new:
        if f.get("severity") in ("warn", "critical"):
            icon = "🔴" if f["severity"] == "critical" else "🟠"
            await notify(f"{icon} {f['title']}", f"{f.get('body', '')}\n\n💡 {f.get('suggestion', '')}".strip(), level="alert")
        await _fire_rules("insight", f)
    return new


def list_insights(status: str = "open") -> list[dict]:
    if status == "open":
        return db.query("SELECT * FROM insights WHERE status IN ('new','seen') ORDER BY "
                        "CASE severity WHEN 'critical' THEN 0 WHEN 'warn' THEN 1 WHEN 'opportunity' THEN 2 ELSE 3 END, id DESC")
    return db.query("SELECT * FROM insights ORDER BY id DESC LIMIT 200")


# ------------------------------------------------------------------ reguły użytkownika
async def _apply(rule: dict, context: dict | None = None) -> None:
    import agent
    text = rule["action_value"] or rule["name"]
    if context:
        text = text.replace("{tytul}", context.get("title", "")).replace("{kwota}", str(context.get("amount", "")))
    if rule["action"] == "notify":
        await notify(f"⚙️ {rule['name']}", text, level="info")
    elif rule["action"] == "task":
        db.insert("tasks", {"title": text[:200], "status": "todo", "priority": "normal", "created": db.now_str(),
                            "notes": f"Utworzone przez regułę „{rule['name']}”"})
    elif rule["action"] == "agent":
        reply = await agent.run(text + (f"\n\nKontekst: {json.dumps(context, ensure_ascii=False)}" if context else ""),
                                session="system:rules", save=False)
        await notify(f"🤖 {rule['name']}", reply[-1500:], level="brief")
    db.update("rules", rule["id"], {"last_run": db.now_str(), "runs": (rule.get("runs") or 0) + 1})


async def tick_rules() -> None:
    """Co minutę: reguły czasowe."""
    now = db.now()
    hm, today = now.strftime("%H:%M"), now.strftime("%Y-%m-%d")
    for r in db.query("SELECT * FROM rules WHERE enabled = 1 AND trigger IN ('daily','hourly','weekly')"):
        last = r.get("last_run") or ""
        due = False
        if r["trigger"] == "daily":
            due = hm >= (r["trigger_value"] or "09:00") and last[:10] != today
        elif r["trigger"] == "hourly":
            due = last[:13] != now.strftime("%Y-%m-%dT%H")
        elif r["trigger"] == "weekly":
            days = ["pon", "wt", "śr", "czw", "pt", "sob", "nd"]
            want = (r["trigger_value"] or "pon 09:00").split()
            day_ok = days.index(want[0][:3]) == now.weekday() if want and want[0][:3] in days else now.weekday() == 0
            due = day_ok and hm >= (want[1] if len(want) > 1 else "09:00") and last[:10] != today
        if due:
            try:
                await _apply(r)
            except Exception as e:  # noqa: BLE001
                log.warning("Reguła %s: %s", r["name"], e)


async def _fire_rules(trigger: str, context: dict) -> None:
    for r in db.query("SELECT * FROM rules WHERE enabled = 1 AND trigger = ?", (trigger,)):
        v = (r["trigger_value"] or "").strip().lower()
        if trigger == "insight" and v and v not in (context.get("severity", "") + " " + context.get("area", "").lower()):
            continue
        if trigger == "transaction":
            try:
                parts = v.split()
                if parts and parts[0] in ("przychod", "koszt", "strata", "inwestycja") and context.get("type") != parts[0]:
                    continue
                if len(parts) > 1 and float(context.get("amount", 0)) < float(parts[1]):
                    continue
            except ValueError:
                pass
        try:
            await _apply(r, context)
        except Exception as e:  # noqa: BLE001
            log.warning("Reguła %s: %s", r["name"], e)


async def on_transaction(tx: dict) -> None:
    await _fire_rules("transaction", {"title": tx.get("description", ""), **tx})


# ------------------------------------------------------------------ przegląd tygodniowy
async def weekly_review() -> None:
    import agent
    text = await agent.run(
        "Zrób mój przegląd tygodnia: co zrobiłem (zadania zamknięte), co zaległe, kalendarz na nowy tydzień, finanse "
        "tygodnia vs poprzedni (finance_report za bieżący miesiąc), projekty i płatności, Stratfanat (sprzedaż/magazyn, "
        "jeśli dostępne), otwarte wnioski doradcy. Na końcu: 3 najważniejsze priorytety na ten tydzień i 1 pomysł na rozwój. "
        "Zapisz jako dokument „Przegląd tygodnia”.", session="system:weekly", save=False)
    await notify("🗓 Przegląd tygodnia", text[-1800:], level="brief")


# ------------------------------------------------------------------ narzędzia agenta
_S = {"type": "string"}
TOOLS = [
    {"name": "advisor_insights", "description": "Aktualne wnioski doradcy (problemy, ryzyka, okazje) z priorytetem i sugestią. "
     "Używaj, gdy użytkownik pyta 'co powinienem zrobić', 'co się dzieje w firmie', przy briefach i przeglądach.",
     "input_schema": {"type": "object", "properties": {"refresh": {"type": "boolean"}}}},
    {"name": "advisor_resolve", "description": "Oznacza wniosek doradcy jako załatwiony (done) albo odrzucony (dismissed).",
     "input_schema": {"type": "object", "properties": {"id": {"type": "integer"}, "status": {"type": "string", "enum": ["done", "dismissed"]}},
                      "required": ["id"]}},
    {"name": "add_rule", "description": "Tworzy automatyzację 'jeśli… to…'. trigger: daily (trigger_value 'HH:MM'), hourly, "
     "weekly ('pon 09:00'), insight (trigger_value: 'warn'/'critical'/obszar), transaction ('koszt 1000' = koszt ≥1000 zł). "
     "action: notify (treść), task (tytuł zadania), agent (polecenie dla agenta, wynik przychodzi jako powiadomienie).",
     "input_schema": {"type": "object", "properties": {"name": _S,
                      "trigger": {"type": "string", "enum": ["daily", "hourly", "weekly", "insight", "transaction"]},
                      "trigger_value": _S, "action": {"type": "string", "enum": ["notify", "task", "agent"]}, "action_value": _S},
                      "required": ["name", "trigger", "action"]}},
    {"name": "list_rules", "description": "Lista automatyzacji 'jeśli… to…'.", "input_schema": {"type": "object", "properties": {}}},
]
NAMES = {t["name"] for t in TOOLS}
LABELS = {"advisor_insights": "Sprawdzam, co wymaga uwagi", "advisor_resolve": "Zamykam wniosek",
          "add_rule": "Tworzę automatyzację", "list_rules": "Przeglądam automatyzacje"}
CHANGES = {"advisor_resolve": "advisor", "add_rule": "advisor"}


async def execute(name: str, a: dict):
    match name:
        case "advisor_insights":
            if a.get("refresh"):
                await run_monitor()
            return list_insights()
        case "advisor_resolve":
            db.update("insights", a["id"], {"status": a.get("status", "done"), "updated": db.now_str()})
            return {"ok": True}
        case "add_rule":
            rid = db.insert("rules", {k: a.get(k, "") for k in ("name", "trigger", "trigger_value", "action", "action_value")}
                            | {"enabled": 1, "created": db.now_str()})
            return {"ok": True, "id": rid}
        case "list_rules":
            return db.query("SELECT * FROM rules ORDER BY id DESC")
    return {"error": f"Nieznane narzędzie {name}"}
