"""Start agenta: dashboard (http://127.0.0.1:8765) + bot Telegram + harmonogram."""
import asyncio
import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import Body, FastAPI, HTTPException
from fastapi.responses import FileResponse

import agent
import crypto
import db
import file_indexer
import notifier
import scheduler
import telegram_bot
from config import (ANTHROPIC_API_KEY, BASE_DIR, CRYPTO_WATCHLIST, HOST, MODEL, PORT, TELEGRAM_ALLOWED_CHAT_IDS,
                    TELEGRAM_BOT_TOKEN, USER_NAME, WATCH_FOLDERS)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("main")
STATE = {"telegram": False}


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init()
    scheduler.start()
    try:
        STATE["telegram"] = await telegram_bot.start()
    except Exception as e:  # noqa: BLE001
        log.error("Telegram nie wystartował: %s", e)
    if WATCH_FOLDERS and not db.one("SELECT 1 FROM files LIMIT 1"):
        asyncio.create_task(asyncio.to_thread(file_indexer.reindex))
    log.info("Dashboard: http://%s:%s", HOST, PORT)
    yield
    await telegram_bot.stop()
    scheduler.scheduler.shutdown(wait=False)


app = FastAPI(title="Personal Agent", lifespan=lifespan)


@app.get("/")
def index():
    return FileResponse(BASE_DIR / "static" / "index.html")


# ---------------- czat ----------------
@app.post("/api/chat")
async def chat(payload: dict = Body(...)):
    msg = (payload.get("message") or "").strip()
    if not msg:
        raise HTTPException(400, "Pusta wiadomość")
    return {"reply": await agent.run(msg, session=payload.get("session", "web"))}


@app.get("/api/chat/history")
def chat_history(session: str = "web", limit: int = 60):
    rows = db.query("SELECT role, content, created FROM chat WHERE session = ? ORDER BY id DESC LIMIT ?", (session, limit))
    return list(reversed(rows))


@app.delete("/api/chat/history")
def chat_clear(session: str = "web"):
    db.execute("DELETE FROM chat WHERE session = ?", (session,))
    return {"ok": True}


# ---------------- generyczne CRUD ----------------
FIELDS = {
    "tasks": {"title", "notes", "project", "priority", "status", "due"},
    "events": {"title", "start", "end", "location", "client", "kind", "notes"},
    "ideas": {"title", "content", "category", "tags", "status"},
    "memory": {"fact"},
}


def _check(table: str) -> set[str]:
    if table not in FIELDS:
        raise HTTPException(404)
    return FIELDS[table]


@app.get("/api/tasks")
def list_tasks(status: str = "all"):
    if status == "open":
        return db.query("SELECT * FROM tasks WHERE status != 'done' ORDER BY due IS NULL, due, id DESC")
    return db.query("SELECT * FROM tasks ORDER BY status = 'done', due IS NULL, due, id DESC LIMIT 300")


@app.get("/api/events")
def list_events(start: str = "", end: str = ""):
    start = start or db.now_str()[:10]
    end = end or "9999-12-31"
    return db.query("SELECT * FROM events WHERE substr(start,1,10) >= ? AND substr(start,1,10) <= ? ORDER BY start",
                    (start, end))


@app.get("/api/ideas")
def list_ideas(q: str = ""):
    if q:
        return db.query("SELECT * FROM ideas WHERE title LIKE ? OR content LIKE ? OR tags LIKE ? ORDER BY id DESC",
                        (f"%{q}%",) * 3)
    return db.query("SELECT * FROM ideas ORDER BY id DESC")


@app.get("/api/memory")
def list_memory():
    return db.query("SELECT * FROM memory ORDER BY id DESC")


@app.post("/api/crud/{table}")
def create(table: str, payload: dict = Body(...)):
    fields = _check(table)
    data = {k: v for k, v in payload.items() if k in fields and v not in (None, "")}
    if not data.get("title") and table != "memory":
        raise HTTPException(400, "Brak tytułu")
    if table == "events" and not data.get("start"):
        raise HTTPException(400, "Brak daty")
    if table == "tasks":
        data.setdefault("status", "todo")
    return {"id": db.insert(table, {**data, "created": db.now_str()})}


@app.patch("/api/crud/{table}/{row_id}")
def patch(table: str, row_id: int, payload: dict = Body(...)):
    fields = _check(table)
    data = {k: v for k, v in payload.items() if k in fields}
    if table in ("tasks", "events") and ({"due", "start"} & data.keys()):
        data["reminded"] = 0
    db.update(table, row_id, data)
    return {"ok": True}


@app.delete("/api/crud/{table}/{row_id}")
def delete(table: str, row_id: int):
    if table not in {*FIELDS, "alerts", "notifications"}:
        raise HTTPException(404)
    db.execute(f"DELETE FROM {table} WHERE id = ?", (row_id,))
    return {"ok": True}


# ---------------- powiadomienia ----------------
@app.get("/api/notifications")
def notifications(limit: int = 50):
    return db.query("SELECT * FROM notifications ORDER BY id DESC LIMIT ?", (limit,))


@app.post("/api/notifications/read")
def notifications_read():
    db.execute("UPDATE notifications SET read = 1 WHERE read = 0")
    return {"ok": True}


@app.post("/api/notifications/test")
async def notifications_test():
    await notifier.notify("🔔 Test powiadomień", "Jeśli to widzisz na telefonie - Telegram działa.", level="info")
    return {"ok": True, "telegram": notifier.has_telegram()}


# ---------------- pliki ----------------
@app.get("/api/files/search")
def files_search(q: str = "", kind: str = "", folders: bool = False, limit: int = 100):
    return file_indexer.search(q, kind=kind, folders_only=folders, limit=limit)


@app.get("/api/files/stats")
def files_stats():
    return file_indexer.stats()


@app.post("/api/files/reindex")
async def files_reindex():
    return await asyncio.to_thread(file_indexer.reindex)


@app.post("/api/files/open")
def files_open(payload: dict = Body(...)):
    return {"ok": file_indexer.open_in_os(payload.get("path", ""))}


# ---------------- krypto ----------------
@app.get("/api/crypto")
async def crypto_prices():
    try:
        return {"watchlist": CRYPTO_WATCHLIST, "prices": await crypto.prices()}
    except Exception as e:  # noqa: BLE001
        return {"watchlist": CRYPTO_WATCHLIST, "prices": {}, "error": str(e)}


@app.get("/api/alerts")
def alerts():
    return db.query("SELECT * FROM alerts ORDER BY active DESC, id DESC")


@app.post("/api/alerts")
def add_alert(payload: dict = Body(...)):
    return {"id": db.insert("alerts", {
        "coin": str(payload["coin"]).lower(), "direction": payload.get("direction", "above"),
        "price": float(payload["price"]), "currency": payload.get("currency", "usd"),
        "active": 1, "created": db.now_str()})}


# ---------------- status ----------------
@app.get("/api/status")
def status():
    return {
        "user": USER_NAME,
        "now": db.now_str(),
        "model": MODEL,
        "claude": bool(ANTHROPIC_API_KEY),
        "telegram": STATE["telegram"],
        "telegram_token": bool(TELEGRAM_BOT_TOKEN),
        "telegram_chats": len(TELEGRAM_ALLOWED_CHAT_IDS),
        "watch_folders": WATCH_FOLDERS,
        "jobs": scheduler.jobs(),
        "unread": (db.one("SELECT COUNT(*) AS n FROM notifications WHERE read = 0") or {"n": 0})["n"],
    }


if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT)
