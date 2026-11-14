"""Narzędzia, których agent (Claude) używa do działania: zadania, kalendarz, pomysły, pliki, krypto..."""
import asyncio
import json
from datetime import datetime, timedelta

import crypto
import db
import file_indexer
from notifier import notify

# ---------------------------------------------------------------------------
# Definicje narzędzi (JSON Schema) widziane przez model
# ---------------------------------------------------------------------------
_S = {"type": "string"}
PROJECT_STATUSES = ["zapytanie", "potwierdzony", "produkcja", "postprodukcja", "oddany", "oplacony", "anulowany"]

TOOLS: list[dict] = [
    # --- zadania ---
    {
        "name": "add_task",
        "description": "Dodaje zadanie do listy zadań użytkownika. Używaj, gdy użytkownik mówi co ma zrobić, "
                       "albo gdy rozbijasz projekt (np. teledysk) na kroki.",
        "input_schema": {"type": "object", "properties": {
            "title": _S,
            "notes": _S,
            "project": {"type": "string", "description": "Np. nazwa klienta lub projektu."},
            "priority": {"type": "string", "enum": ["low", "normal", "high"]},
            "due": {"type": "string", "description": "Termin w formacie YYYY-MM-DDTHH:MM (czas lokalny)."},
        }, "required": ["title"]},
    },
    {
        "name": "list_tasks",
        "description": "Zwraca zadania. Domyślnie nieukończone.",
        "input_schema": {"type": "object", "properties": {
            "status": {"type": "string", "enum": ["open", "todo", "doing", "done", "all"]},
            "project": _S,
        }},
    },
    {
        "name": "update_task",
        "description": "Zmienia zadanie: status (todo/doing/done), tytuł, termin, priorytet, notatki.",
        "input_schema": {"type": "object", "properties": {
            "id": {"type": "integer"},
            "status": {"type": "string", "enum": ["todo", "doing", "done"]},
            "title": _S, "notes": _S, "due": _S, "project": _S,
            "priority": {"type": "string", "enum": ["low", "normal", "high"]},
        }, "required": ["id"]},
    },
    {
        "name": "delete_task",
        "description": "Usuwa zadanie na stałe.",
        "input_schema": {"type": "object", "properties": {"id": {"type": "integer"}}, "required": ["id"]},
    },
    # --- kalendarz ---
    {
        "name": "add_event",
        "description": "Dodaje wydarzenie do kalendarza (sesja zdjęciowa, plan teledysku, spotkanie z klientem, montaż...).",
        "input_schema": {"type": "object", "properties": {
            "title": _S,
            "start": {"type": "string", "description": "YYYY-MM-DDTHH:MM czas lokalny"},
            "end": {"type": "string", "description": "YYYY-MM-DDTHH:MM czas lokalny (opcjonalnie)"},
            "location": _S, "client": _S, "notes": _S,
            "kind": {"type": "string", "enum": ["sesja", "teledysk", "spotkanie", "montaz", "inne"]},
        }, "required": ["title", "start"]},
    },
    {
        "name": "list_events",
        "description": "Zwraca wydarzenia z kalendarza w zakresie dat (domyślnie od dziś na 14 dni).",
        "input_schema": {"type": "object", "properties": {
            "from_date": {"type": "string", "description": "YYYY-MM-DD"},
            "to_date": {"type": "string", "description": "YYYY-MM-DD"},
        }},
    },
    {
        "name": "update_event",
        "description": "Zmienia wydarzenie w kalendarzu.",
        "input_schema": {"type": "object", "properties": {
            "id": {"type": "integer"}, "title": _S, "start": _S, "end": _S,
            "location": _S, "client": _S, "notes": _S, "kind": _S,
        }, "required": ["id"]},
    },
    {
        "name": "delete_event",
        "description": "Usuwa wydarzenie z kalendarza.",
        "input_schema": {"type": "object", "properties": {"id": {"type": "integer"}}, "required": ["id"]},
    },
    # --- pomysły ---
    {
        "name": "add_idea",
        "description": "Zapisuje pomysł użytkownika (koncept sesji, ujęcie, scenariusz teledysku, pomysł na biznes...). "
                       "Rozwiń go zwięźle w polu content, jeśli użytkownik dał tylko hasło.",
        "input_schema": {"type": "object", "properties": {
            "title": _S, "content": _S,
            "category": {"type": "string", "description": "np. sesja, teledysk, ujęcie, biznes, sprzęt, inne"},
            "tags": {"type": "string", "description": "tagi po przecinku"},
        }, "required": ["title"]},
    },
    {
        "name": "list_ideas",
        "description": "Przeszukuje zapisane pomysły (po tekście i/lub kategorii).",
        "input_schema": {"type": "object", "properties": {"query": _S, "category": _S}},
    },
    {
        "name": "update_idea",
        "description": "Rozwija lub zmienia pomysł (treść, status: nowy/rozwijany/zrealizowany/odlozony).",
        "input_schema": {"type": "object", "properties": {
            "id": {"type": "integer"}, "title": _S, "content": _S, "category": _S, "tags": _S,
            "status": {"type": "string", "enum": ["nowy", "rozwijany", "zrealizowany", "odlozony"]},
        }, "required": ["id"]},
    },
    # --- projekty / klienci ---
    {
        "name": "add_project",
        "description": "Tworzy projekt/zlecenie (sesja, teledysk, reklama, ślub...) z klientem, terminem i stawką.",
        "input_schema": {"type": "object", "properties": {
            "name": _S, "client": _S, "contact": {"type": "string", "description": "telefon / e-mail klienta"},
            "kind": {"type": "string", "enum": ["sesja", "teledysk", "reklama", "slub", "event", "inne"]},
            "status": {"type": "string", "enum": PROJECT_STATUSES},
            "deadline": {"type": "string", "description": "YYYY-MM-DD termin oddania"},
            "fee": {"type": "number", "description": "stawka w PLN"},
            "folder": {"type": "string", "description": "folder z materiałami na dysku"},
            "notes": _S,
        }, "required": ["name"]},
    },
    {
        "name": "list_projects",
        "description": "Lista projektów/zleceń (domyślnie aktywne) z liczbą otwartych zadań.",
        "input_schema": {"type": "object", "properties": {
            "status": {"type": "string", "description": "active | all | konkretny status"}, "query": _S}},
    },
    {
        "name": "update_project",
        "description": "Zmienia projekt: status, termin, stawka, opłacenie (paid=true), notatki, folder.",
        "input_schema": {"type": "object", "properties": {
            "id": {"type": "integer"}, "name": _S, "client": _S, "contact": _S, "kind": _S,
            "status": {"type": "string", "enum": PROJECT_STATUSES}, "deadline": _S, "fee": {"type": "number"},
            "paid": {"type": "boolean"}, "folder": _S, "notes": _S,
        }, "required": ["id"]},
    },
    # --- pamięć ---
    {
        "name": "remember",
        "description": "Zapamiętuje trwały fakt o użytkowniku, jego klientach, sprzęcie, preferencjach. "
                       "Używaj samodzielnie, gdy usłyszysz coś wartego zapamiętania.",
        "input_schema": {"type": "object", "properties": {"fact": _S}, "required": ["fact"]},
    },
    {
        "name": "forget",
        "description": "Usuwa fakt z pamięci (id z listy w promptcie systemowym).",
        "input_schema": {"type": "object", "properties": {"id": {"type": "integer"}}, "required": ["id"]},
    },
    # --- pliki ---
    {
        "name": "search_files",
        "description": "Szuka plików na komputerze użytkownika (w zaindeksowanych folderach) po słowach z nazwy pliku, "
                       "ścieżki, aparatu lub obiektywu (EXIF). kind: zdjecie, raw, wideo, audio, projekt, dokument, inne. "
                       "Daty filtrują po dacie zrobienia zdjęcia (EXIF) lub modyfikacji. "
                       "folders_only=true zwraca foldery (np. 'gdzie są zdjęcia z sesji X').",
        "input_schema": {"type": "object", "properties": {
            "query": _S,
            "kind": {"type": "string", "enum": ["zdjecie", "raw", "wideo", "audio", "projekt", "dokument", "inne"]},
            "ext": {"type": "string", "description": "rozszerzenie np. cr3, mov"},
            "camera": {"type": "string", "description": "fragment nazwy aparatu, np. A7 IV"},
            "lens": {"type": "string", "description": "fragment nazwy obiektywu, np. 85mm"},
            "modified_after": {"type": "string", "description": "YYYY-MM-DD"},
            "modified_before": {"type": "string", "description": "YYYY-MM-DD"},
            "folders_only": {"type": "boolean"},
            "limit": {"type": "integer"},
        }},
    },
    {
        "name": "file_stats",
        "description": "Statystyki zaindeksowanych plików: ile zdjęć/wideo, ile miejsca, ostatnio zmieniane foldery.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "reindex_files",
        "description": "Ponownie skanuje foldery użytkownika (gdy pyta o świeże pliki, których nie ma w indeksie).",
        "input_schema": {"type": "object", "properties": {}},
    },
    # --- powiadomienia ---
    {
        "name": "send_notification",
        "description": "Wysyła użytkownikowi powiadomienie na Telegram i do dashboardu. Używaj, gdy prosi "
                       "o przesłanie czegoś na telefon.",
        "input_schema": {"type": "object", "properties": {"title": _S, "body": _S}, "required": ["title"]},
    },
    {
        "name": "schedule_reminder",
        "description": "Ustawia jednorazowe przypomnienie o podanej godzinie (zapisane jako zadanie z terminem; "
                       "przypomnienie przyjdzie na Telegram).",
        "input_schema": {"type": "object", "properties": {
            "text": _S, "at": {"type": "string", "description": "YYYY-MM-DDTHH:MM"},
        }, "required": ["text", "at"]},
    },
    # --- krypto ---
    {
        "name": "crypto_prices",
        "description": "Aktualne ceny kryptowalut (USD i PLN, zmiana 24h). coins = ID z CoinGecko, np. bitcoin, ethereum.",
        "input_schema": {"type": "object", "properties": {"coins": {"type": "array", "items": _S}}},
    },
    {
        "name": "add_price_alert",
        "description": "Alert cenowy: powiadom, gdy coin przekroczy cenę w górę (above) lub w dół (below).",
        "input_schema": {"type": "object", "properties": {
            "coin": _S, "direction": {"type": "string", "enum": ["above", "below"]},
            "price": {"type": "number"}, "currency": {"type": "string", "enum": ["usd", "pln"]},
        }, "required": ["coin", "direction", "price"]},
    },
    {
        "name": "list_price_alerts",
        "description": "Lista aktywnych alertów cenowych.",
        "input_schema": {"type": "object", "properties": {}},
    },
]

# Narzędzia po stronie Anthropic: wyszukiwanie w sieci i czytanie stron
SERVER_TOOLS: list[dict] = [
    {"type": "web_search_20260209", "name": "web_search", "max_uses": 6},
    {"type": "web_fetch_20260209", "name": "web_fetch", "max_uses": 6},
]


# ---------------------------------------------------------------------------
# Wykonanie narzędzi
# ---------------------------------------------------------------------------
def _clean(data: dict, allowed: set[str]) -> dict:
    return {k: v for k, v in data.items() if k in allowed and v is not None}


async def execute(name: str, args: dict):
    """Zwraca tekst (JSON) albo listę bloków treści (np. zdjęcia dla view_photos)."""
    import mcp_client
    import modules
    try:
        mod = modules.owner(name)
        if mod is not None:
            result = await mod.execute(name, args or {})
        elif mcp_client.manager.owns(name):
            return await mcp_client.manager.call(name, args or {})
        else:
            result = await _execute(name, args or {})
    except Exception as e:  # noqa: BLE001 - błąd wraca do modelu jako tool_result
        return json.dumps({"error": f"{type(e).__name__}: {e}"}, ensure_ascii=False)
    if isinstance(result, list) and result and isinstance(result[0], dict) and result[0].get("type") in ("text", "image"):
        return result
    return json.dumps(result, ensure_ascii=False, default=str)


async def _execute(name: str, a: dict):
    now = db.now_str()
    match name:
        case "add_task":
            data = _clean(a, {"title", "notes", "project", "priority", "due"})
            tid = db.insert("tasks", {**data, "status": "todo", "created": now})
            return {"ok": True, "id": tid}
        case "list_tasks":
            status = a.get("status", "open")
            where, p = [], []
            if status == "open":
                where.append("status != 'done'")
            elif status != "all":
                where.append("status = ?"); p.append(status)
            if a.get("project"):
                where.append("project LIKE ?"); p.append(f"%{a['project']}%")
            clause = ("WHERE " + " AND ".join(where)) if where else ""
            return db.query(f"SELECT id, title, notes, project, priority, status, due FROM tasks {clause} "
                            f"ORDER BY due IS NULL, due, id DESC LIMIT 100", p)
        case "update_task":
            data = _clean(a, {"title", "notes", "project", "priority", "due", "status"})
            if "due" in data:
                data["reminded"] = 0
            db.update("tasks", a["id"], data)
            return {"ok": True}
        case "delete_task":
            db.execute("DELETE FROM tasks WHERE id = ?", (a["id"],))
            return {"ok": True}

        case "add_event":
            data = _clean(a, {"title", "start", "end", "location", "client", "notes", "kind"})
            eid = db.insert("events", {**data, "created": now})
            return {"ok": True, "id": eid}
        case "list_events":
            start = a.get("from_date") or now[:10]
            end = a.get("to_date") or (datetime.fromisoformat(start) + timedelta(days=14)).strftime("%Y-%m-%d")
            return db.query("SELECT id, title, start, end, location, client, kind, notes FROM events "
                            "WHERE start >= ? AND start <= ? ORDER BY start", (start, end + "T23:59"))
        case "update_event":
            data = _clean(a, {"title", "start", "end", "location", "client", "notes", "kind"})
            if "start" in data:
                data["reminded"] = 0
            db.update("events", a["id"], data)
            return {"ok": True}
        case "delete_event":
            db.execute("DELETE FROM events WHERE id = ?", (a["id"],))
            return {"ok": True}

        case "add_idea":
            data = _clean(a, {"title", "content", "category", "tags"})
            iid = db.insert("ideas", {**data, "status": "nowy", "created": now})
            return {"ok": True, "id": iid}
        case "list_ideas":
            where, p = [], []
            for word in (a.get("query") or "").split():
                where.append("(title LIKE ? OR content LIKE ? OR tags LIKE ?)")
                p += [f"%{word}%"] * 3
            if a.get("category"):
                where.append("category LIKE ?"); p.append(f"%{a['category']}%")
            clause = ("WHERE " + " AND ".join(where)) if where else ""
            return db.query(f"SELECT * FROM ideas {clause} ORDER BY id DESC LIMIT 50", p)
        case "update_idea":
            db.update("ideas", a["id"], _clean(a, {"title", "content", "category", "tags", "status"}))
            return {"ok": True}

        case "add_project":
            data = _clean(a, {"name", "client", "contact", "kind", "status", "deadline", "fee", "folder", "notes"})
            pid = db.insert("projects", {"status": "zapytanie", **data, "created": now})
            return {"ok": True, "id": pid}
        case "list_projects":
            status = a.get("status", "active")
            where, p = [], []
            if status == "active":
                where.append("status NOT IN ('oplacony','anulowany')")
            elif status != "all":
                where.append("status = ?"); p.append(status)
            for word in (a.get("query") or "").split():
                where.append("(name LIKE ? OR client LIKE ? OR notes LIKE ?)"); p += [f"%{word}%"] * 3
            clause = ("WHERE " + " AND ".join(where)) if where else ""
            return db.query(
                f"SELECT p.*, (SELECT COUNT(*) FROM tasks t WHERE t.status != 'done' AND "
                f"(t.project_id = p.id OR t.project = p.name)) AS open_tasks FROM projects p {clause} "
                f"ORDER BY deadline IS NULL, deadline", p)
        case "update_project":
            data = _clean(a, {"name", "client", "contact", "kind", "status", "deadline", "fee", "folder", "notes", "paid"})
            if "paid" in data:
                data["paid"] = 1 if data["paid"] else 0
            db.update("projects", a["id"], data)
            return {"ok": True}

        case "remember":
            mid = db.insert("memory", {"fact": a["fact"], "created": now})
            return {"ok": True, "id": mid}
        case "forget":
            db.execute("DELETE FROM memory WHERE id = ?", (a["id"],))
            return {"ok": True}

        case "search_files":
            rows = file_indexer.search(
                query=a.get("query", ""), kind=a.get("kind", ""), ext=a.get("ext", ""),
                modified_after=a.get("modified_after", ""), modified_before=a.get("modified_before", ""),
                camera=a.get("camera", ""), lens=a.get("lens", ""),
                folders_only=bool(a.get("folders_only")), limit=a.get("limit", 40),
            )
            if not rows and not db.one("SELECT 1 FROM files LIMIT 1"):
                return {"results": [], "info": "Indeks plików jest pusty - ustaw WATCH_FOLDERS w .env i uruchom reindex."}
            return {"results": rows}
        case "file_stats":
            return file_indexer.stats()
        case "reindex_files":
            return await asyncio.to_thread(file_indexer.reindex)

        case "send_notification":
            await notify(a["title"], a.get("body", ""), level="info")
            return {"ok": True}
        case "schedule_reminder":
            tid = db.insert("tasks", {"title": f"⏰ {a['text']}", "due": a["at"], "priority": "high",
                                      "status": "todo", "created": now})
            return {"ok": True, "task_id": tid}

        case "crypto_prices":
            return await crypto.prices(a.get("coins"))
        case "add_price_alert":
            aid = db.insert("alerts", {"coin": a["coin"].lower(), "direction": a["direction"], "price": a["price"],
                                       "currency": a.get("currency", "usd"), "active": 1, "created": now})
            return {"ok": True, "id": aid}
        case "list_price_alerts":
            return db.query("SELECT * FROM alerts WHERE active = 1")

    return {"error": f"Nieznane narzędzie: {name}"}
