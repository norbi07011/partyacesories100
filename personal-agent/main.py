"""Start agenta: dashboard (http://127.0.0.1:8765) + bot Telegram + harmonogram."""
import asyncio
import json
import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import Body, FastAPI, HTTPException, Request
from fastapi.responses import (FileResponse, JSONResponse, PlainTextResponse, RedirectResponse, Response,
                               StreamingResponse)
from fastapi.staticfiles import StaticFiles

import advisor
import agent
import auth
import computer
import config
import evals
import knowledge_base
import media
import modules
import crypto
import db
import file_indexer
import finance
import ics
import local_llm
import mcp_client
import memory
import notifier
import scheduler
import skills
import telegram_bot
import voice

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("main")
MAX_IMAGES = 4


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init()
    memory.init()
    finance.init()
    for mod in (auth, computer, advisor, knowledge_base, evals):
        mod.init()
    for name in ("stratfanat", "inspiration", "websites", "trading"):
        try:
            m = __import__(name)
            m.init()
            if hasattr(m, "router"):
                pass
            if hasattr(m, "alerts"):
                advisor.register_provider(m.alerts)
        except Exception as e:  # noqa: BLE001
            log.warning("Moduł %s: %s", name, e)
    modules.loaded()
    scheduler.start()
    await telegram_bot.start()
    await mcp_client.manager.start()
    voice.preload()
    if config.WATCH_FOLDERS:
        asyncio.create_task(asyncio.to_thread(file_indexer.reindex))
    log.info("Dashboard: http://%s:%s", config.HOST, config.PORT)
    yield
    await telegram_bot.stop()
    await mcp_client.manager.stop()
    scheduler.scheduler.shutdown(wait=False)


app = FastAPI(title="Studio Agent", lifespan=lifespan)
app.mount("/static", StaticFiles(directory=config.BASE_DIR / "static"), name="static")


@app.middleware("http")
async def auth_guard(request: Request, call_next):
    """Z komputera: bez logowania. Z sieci/tunelu (telefon): wymagane hasło (+2FA)."""
    path = request.url.path
    if auth.is_remote(request) and not auth.is_public(path):
        if not auth.session_valid(request.cookies.get(auth.COOKIE)):
            if path.startswith("/api/"):
                return JSONResponse({"detail": "Zaloguj się"}, status_code=401)
            return RedirectResponse("/login")
    response = await call_next(request)
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    return response


def _include_routers() -> None:
    for name, attr in (("inspiration", "router"), ("stratfanat", "router"), ("websites", "router"), ("trading.api", "router")):
        try:
            m = __import__(name, fromlist=[attr])
            app.include_router(getattr(m, attr))
        except Exception as e:  # noqa: BLE001
            log.warning("API modułu %s niedostępne: %s", name, e)


_include_routers()


@app.get("/login")
def login_page():
    return FileResponse(config.BASE_DIR / "static" / "login.html", headers={"Cache-Control": "no-store"})


@app.get("/manifest.webmanifest")
def manifest():
    return JSONResponse({
        "name": "Studio Agent", "short_name": "Agent", "start_url": "/", "scope": "/", "display": "standalone",
        "background_color": "#0c0c0d", "theme_color": "#0c0c0d", "lang": "pl", "orientation": "portrait",
        "icons": [{"src": "/static/icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
                  {"src": "/static/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}],
    }, media_type="application/manifest+json")


@app.get("/sw.js")
def service_worker():
    return FileResponse(config.BASE_DIR / "static" / "sw.js", media_type="application/javascript",
                        headers={"Cache-Control": "no-cache", "Service-Worker-Allowed": "/"})


# ================================================================ logowanie
@app.get("/api/auth/status")
def auth_status(request: Request):
    return auth.status(request)


@app.post("/api/auth/login")
def auth_login(request: Request, payload: dict = Body(...)):
    try:
        token = auth.login(payload.get("password", ""), payload.get("code"), auth.client_ip(request),
                           request.headers.get("user-agent", ""))
    except ValueError as e:
        raise HTTPException(401, str(e))
    secure = request.headers.get("x-forwarded-proto") == "https" or request.url.scheme == "https"
    resp = JSONResponse({"ok": True})
    resp.set_cookie(auth.COOKIE, token, max_age=auth.SESSION_DAYS * 86400, httponly=True, samesite="lax", secure=secure)
    return resp


@app.post("/api/auth/logout")
def auth_logout(request: Request):
    auth.logout(request.cookies.get(auth.COOKIE))
    resp = JSONResponse({"ok": True})
    resp.delete_cookie(auth.COOKIE)
    return resp


def _local_only(request: Request) -> None:
    if auth.is_remote(request):
        raise HTTPException(403, "Tę zmianę można zrobić tylko na komputerze")


@app.post("/api/auth/password")
def auth_password(request: Request, payload: dict = Body(...)):
    _local_only(request)
    try:
        auth.set_password(payload.get("password", ""))
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"ok": True}


@app.post("/api/auth/totp/setup")
def auth_totp_setup(request: Request):
    _local_only(request)
    return auth.totp_setup()


@app.post("/api/auth/totp/enable")
def auth_totp_enable(request: Request, payload: dict = Body(...)):
    _local_only(request)
    if not auth.totp_enable(payload.get("code", "")):
        raise HTTPException(400, "Kod się nie zgadza – sprawdź czas w telefonie i spróbuj ponownie")
    return {"ok": True}


@app.post("/api/auth/totp/disable")
def auth_totp_disable(request: Request):
    _local_only(request)
    auth.totp_disable()
    return {"ok": True}


@app.get("/api/auth/sessions")
def auth_sessions():
    return auth.sessions()


@app.delete("/api/auth/sessions")
def auth_sessions_clear():
    auth.logout_all()
    return {"ok": True}


@app.get("/api/remote/info")
def remote_info():
    """Jak wejść z telefonu: adresy w sieci domowej + stan Tailscale."""
    import shutil
    import socket
    import subprocess
    ips = set()
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            if not info[4][0].startswith("127."):
                ips.add(info[4][0])
    except OSError:
        pass
    ts = {"installed": bool(shutil.which("tailscale")), "ip": None, "dns": None}
    if ts["installed"]:
        try:
            out = subprocess.run(["tailscale", "status", "--json"], capture_output=True, text=True, timeout=5)
            j = json.loads(out.stdout or "{}")
            me = j.get("Self", {})
            ts.update(ip=(me.get("TailscaleIPs") or [None])[0], dns=(me.get("DNSName") or "").rstrip(".") or None,
                      online=me.get("Online"))
        except Exception:  # noqa: BLE001
            pass
    return {"lan_ips": sorted(ips), "port": config.PORT, "host": config.HOST, "tailscale": ts,
            "cloudflared": bool(shutil.which("cloudflared")), "password_set": auth.password_set(),
            "totp_enabled": auth.totp_enabled()}


@app.get("/")
def index():
    return FileResponse(config.BASE_DIR / "static" / "index.html", headers={"Cache-Control": "no-store"})


# ================================================================ czat
def _images(payload: dict) -> list[dict]:
    out = []
    for im in (payload.get("images") or [])[:MAX_IMAGES]:
        mt, data = im.get("media_type", ""), im.get("data", "")
        if mt in ("image/jpeg", "image/png", "image/webp", "image/gif") and data:
            out.append({"media_type": mt, "data": data})
    return out


@app.post("/api/chat")
async def chat(payload: dict = Body(...)):
    msg = (payload.get("message") or "").strip()
    images = _images(payload)
    if not msg and not images:
        raise HTTPException(400, "Pusta wiadomość")
    return {"reply": await agent.run(msg, session=payload.get("session", "web"), images=images)}


@app.post("/api/chat/stream")
async def chat_stream(payload: dict = Body(...)):
    """Odpowiedź na żywo (Server-Sent Events): tekst, używane narzędzia, zmienione dane."""
    msg = (payload.get("message") or "").strip()
    images = _images(payload)
    if not msg and not images:
        raise HTTPException(400, "Pusta wiadomość")
    queue: asyncio.Queue = asyncio.Queue()

    async def emit(ev: dict) -> None:
        await queue.put(ev)

    async def work():
        try:
            reply = await agent.run(msg, session=payload.get("session", "web"), images=images, emit=emit,
                                    voice=bool(payload.get("voice")))
            await queue.put({"type": "done", "reply": reply})
        except Exception as e:  # noqa: BLE001
            log.exception("Błąd agenta")
            await queue.put({"type": "done", "reply": f"⚠️ Błąd agenta: {e}"})

    task = asyncio.create_task(work())

    async def gen():
        while True:
            ev = await queue.get()
            yield f"data: {json.dumps(ev, ensure_ascii=False)}\n\n"
            if ev["type"] == "done":
                break
        await task

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.get("/api/chat/history")
def chat_history(session: str = "web", limit: int = 60):
    rows = db.query("SELECT role, content, created FROM chat WHERE session = ? ORDER BY id DESC LIMIT ?", (session, limit))
    return list(reversed(rows))


@app.delete("/api/chat/history")
def chat_clear(session: str = "web"):
    db.execute("DELETE FROM chat WHERE session = ?", (session,))
    return {"ok": True}


# ================================================================ listy
@app.get("/api/tasks")
def list_tasks(status: str = "all", project_id: int | None = None):
    where = ["1=1"]
    params: list = []
    if status == "open":
        where.append("status != 'done'")
    if project_id:
        p = db.one("SELECT name FROM projects WHERE id = ?", (project_id,))
        where.append("(project_id = ? OR project = ?)")
        params += [project_id, p["name"] if p else ""]
    return db.query(f"SELECT * FROM tasks WHERE {' AND '.join(where)} "
                    f"ORDER BY status = 'done', due IS NULL, due, id DESC LIMIT 300", params)


@app.get("/api/events")
def list_events(start: str = "", end: str = "", q: str = ""):
    start = start or db.now_str()[:10]
    end = end or "9999-12-31"
    sql = "SELECT * FROM events WHERE substr(start,1,10) >= ? AND substr(start,1,10) <= ?"
    params = [start, end]
    if q:
        sql += " AND (title LIKE ? OR location LIKE ? OR client LIKE ?)"
        params += [f"%{q}%"] * 3
    return db.query(sql + " ORDER BY start", params)


@app.get("/api/ideas")
def list_ideas(q: str = "", category: str = ""):
    where, params = ["1=1"], []
    if q:
        where.append("(title LIKE ? OR content LIKE ? OR tags LIKE ?)")
        params += [f"%{q}%"] * 3
    if category:
        where.append("category = ?")
        params.append(category)
    return db.query(f"SELECT * FROM ideas WHERE {' AND '.join(where)} ORDER BY id DESC", params)


@app.get("/api/projects")
def list_projects(status: str = "active"):
    where = "WHERE status NOT IN ('oplacony','anulowany')" if status == "active" else ""
    return db.query(
        f"SELECT p.*, (SELECT COUNT(*) FROM tasks t WHERE t.status != 'done' AND (t.project_id = p.id OR t.project = p.name))"
        f" AS open_tasks, (SELECT COUNT(*) FROM tasks t WHERE (t.project_id = p.id OR t.project = p.name)) AS all_tasks"
        f" FROM projects p {where} ORDER BY status IN ('oplacony','anulowany'), deadline IS NULL, deadline, id DESC")


@app.get("/api/memory")
def list_memory():
    return db.query("SELECT * FROM memory ORDER BY id DESC")


@app.get("/api/search")
def global_search(q: str):
    like = f"%{q}%"
    return {
        "events": db.query("SELECT id, title, start FROM events WHERE title LIKE ? OR location LIKE ? OR client LIKE ? "
                           "ORDER BY start DESC LIMIT 6", (like, like, like)),
        "tasks": db.query("SELECT id, title, status, due FROM tasks WHERE title LIKE ? OR notes LIKE ? OR project LIKE ? "
                          "LIMIT 6", (like, like, like)),
        "ideas": db.query("SELECT id, title FROM ideas WHERE title LIKE ? OR content LIKE ? OR tags LIKE ? LIMIT 6",
                          (like, like, like)),
        "projects": db.query("SELECT id, name, client FROM projects WHERE name LIKE ? OR client LIKE ? LIMIT 6", (like, like)),
        "folders": file_indexer.search(q, folders_only=True, limit=6),
        "documents": db.query("SELECT id, title, kind FROM documents WHERE title LIKE ? OR content LIKE ? LIMIT 6",
                              (like, like)),
        "conversations": memory.recall(q, limit=5)["rozmowy"],
    }


# ================================================================ generyczne CRUD
FIELDS = {
    "tasks": {"title", "notes", "project", "project_id", "priority", "status", "due"},
    "events": {"title", "start", "end", "location", "client", "kind", "notes", "project_id"},
    "ideas": {"title", "content", "category", "tags", "status"},
    "memory": {"fact"},
    "projects": {"name", "client", "contact", "kind", "status", "deadline", "fee", "paid", "folder", "notes"},
    "documents": {"title", "kind", "content", "project_id"},
    "transactions": {"date", "type", "amount", "currency", "category", "area", "description", "project_id"},
    "holdings": {"name", "kind", "coin_id", "quantity", "cost", "current_value", "notes"},
}
REQUIRED = {"tasks": "title", "events": "title", "ideas": "title", "memory": "fact", "projects": "name", "documents": "title",
            "transactions": "type", "holdings": "name"}


def _check(table: str) -> set[str]:
    if table not in FIELDS:
        raise HTTPException(404)
    return FIELDS[table]


def _norm(data: dict) -> dict:
    out = {}
    for k, v in data.items():
        if v == "":
            v = None
        if k in ("fee", "amount", "quantity", "cost", "current_value") and v is not None:
            try:
                v = float(str(v).replace(",", ".").replace(" ", ""))
            except ValueError:
                raise HTTPException(400, "Nieprawidłowa kwota")
        if k in ("paid",):
            v = 1 if v in (True, 1, "1", "true", "on") else 0
        if k in ("project_id",) and v is not None:
            v = int(v)
        out[k] = v
    return out


@app.get("/api/crud/{table}/{row_id}")
def get_row(table: str, row_id: int):
    _check(table)
    row = db.one(f"SELECT * FROM {table} WHERE id = ?", (row_id,))
    if not row:
        raise HTTPException(404)
    return row


@app.post("/api/crud/{table}")
async def create(table: str, payload: dict = Body(...)):
    fields = _check(table)
    data = _norm({k: v for k, v in payload.items() if k in fields})
    data = {k: v for k, v in data.items() if v is not None}
    if not data.get(REQUIRED[table]):
        raise HTTPException(400, "Brak nazwy")
    if table == "events" and not data.get("start"):
        raise HTTPException(400, "Brak daty")
    if table == "tasks":
        data.setdefault("status", "todo")
    if table == "projects":
        data.setdefault("status", "zapytanie")
    if table == "transactions":
        if data.get("type") not in finance.TYPES or not data.get("amount"):
            raise HTTPException(400, "Podaj typ i kwotę")
        data["amount"] = abs(data["amount"])
        data.setdefault("date", db.now().strftime("%Y-%m-%d"))
    new_id = db.insert(table, {**data, "created": db.now_str()})
    if table == "transactions":
        asyncio.create_task(advisor.on_transaction(data))
    return {"id": new_id}


@app.patch("/api/crud/{table}/{row_id}")
def patch(table: str, row_id: int, payload: dict = Body(...)):
    fields = _check(table)
    data = _norm({k: v for k, v in payload.items() if k in fields})
    if REQUIRED[table] in data and not data[REQUIRED[table]]:
        raise HTTPException(400, "Brak nazwy")
    if table in ("tasks", "events") and ({"due", "start"} & data.keys()):
        data["reminded"] = 0
    if table == "documents":
        data["updated"] = db.now_str()
    db.update(table, row_id, data)
    return {"ok": True}


@app.delete("/api/crud/{table}/{row_id}")
def delete(table: str, row_id: int):
    if table not in {*FIELDS, "alerts", "notifications"}:
        raise HTTPException(404)
    db.execute(f"DELETE FROM {table} WHERE id = ?", (row_id,))
    return {"ok": True}


# ================================================================ finanse
@app.get("/api/finance/report")
def finance_report(month: str = "", year: str = ""):
    return finance.report(month or None, year or None)


@app.get("/api/finance/transactions")
def finance_transactions(month: str = "", area: str = "", type: str = "", q: str = ""):
    where, params = ["1=1"], []
    if month:
        where.append("substr(date,1,len(?)) = ?".replace("len(?)", str(len(month))))
        params.append(month)
    for k, v in (("area", area), ("type", type)):
        if v:
            where.append(f"{k} = ?")
            params.append(v)
    if q:
        where.append("(description LIKE ? OR category LIKE ?)")
        params += [f"%{q}%"] * 2
    return db.query(f"SELECT * FROM transactions WHERE {' AND '.join(where)} ORDER BY date DESC, id DESC LIMIT 500", params)


@app.get("/api/finance/meta")
def finance_meta():
    return {"types": finance.TYPES, "areas": finance.AREAS, "categories": finance.CATEGORIES}


@app.get("/api/finance/portfolio")
async def finance_portfolio():
    return await finance.portfolio()


@app.get("/api/finance/export.csv")
def finance_export():
    import csv
    import io
    rows = db.query("SELECT date, type, amount, currency, area, category, description FROM transactions ORDER BY date")
    buf = io.StringIO()
    w = csv.writer(buf, delimiter=";")
    w.writerow(["data", "typ", "kwota", "waluta", "obszar", "kategoria", "opis"])
    for r in rows:
        w.writerow([r["date"], r["type"], str(r["amount"]).replace(".", ","), r["currency"], r["area"], r["category"], r["description"]])
    return Response("\ufeff" + buf.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": 'attachment; filename="finanse.csv"'})


# ================================================================ profil i model AI
@app.get("/api/profile")
def profile_get():
    return {"text": agent.profile_text()}


@app.post("/api/profile")
def profile_save(payload: dict = Body(...)):
    text = (payload.get("text") or "").strip()
    if len(text) > 50000:
        raise HTTPException(400, "Profil jest za długi")
    config.PROFILE_PATH.write_text(text + "\n", encoding="utf-8")
    return {"ok": True}


@app.get("/api/llm/status")
async def llm_status():
    return {"provider": config.PROVIDER, "model": config.OLLAMA_MODEL if config.PROVIDER == "ollama" else config.MODEL,
            "ollama": await local_llm.status()}


@app.post("/api/llm/pull")
async def llm_pull(payload: dict = Body(...)):
    model = (payload.get("model") or config.OLLAMA_MODEL).strip()
    if local_llm.PULL["running"]:
        return {"running": True}
    asyncio.create_task(local_llm.pull(model))
    return {"started": True, "model": model}


# ================================================================ komputer
@app.get("/api/computer/status")
async def computer_status():
    return await asyncio.to_thread(computer.status)


@app.get("/api/computer/processes")
async def computer_processes(sort: str = "cpu", limit: int = 20):
    return await asyncio.to_thread(computer.processes, sort, limit)


@app.post("/api/computer/screenshot")
async def computer_screenshot():
    shot = await asyncio.to_thread(computer.screenshot)
    if shot.get("error"):
        raise HTTPException(503, shot["error"])
    return {"path": shot["path"], "width": shot["width"], "height": shot["height"], "url": "/api/computer/screenshot/latest"}


@app.get("/api/computer/screenshot/latest")
def computer_screenshot_latest():
    files = sorted((config.DATA_DIR / "screens").glob("screen-*.jpg")) if (config.DATA_DIR / "screens").exists() else []
    if not files:
        raise HTTPException(404)
    return FileResponse(files[-1], media_type="image/jpeg", headers={"Cache-Control": "no-store"})


@app.post("/api/computer/open")
async def computer_open(payload: dict = Body(...)):
    return await computer.execute("computer_open", {"target": payload.get("target", "")})


@app.post("/api/computer/action")
async def computer_action(payload: dict = Body(...)):
    """Akcja z dashboardu (np. przycisk Uśpij) – też przechodzi przez zatwierdzanie."""
    tool = payload.get("tool")
    if tool not in computer.RISKY:
        raise HTTPException(400, "Nieznana akcja")
    return await computer.request_action(tool, payload.get("args") or {}, source="dashboard")


@app.get("/api/computer/actions")
def computer_actions(status: str = ""):
    if status:
        return db.query("SELECT * FROM computer_actions WHERE status = ? ORDER BY id DESC LIMIT 50", (status,))
    return db.query("SELECT * FROM computer_actions ORDER BY id DESC LIMIT 50")


@app.post("/api/computer/actions/{action_id}/{decision}")
async def computer_decide(action_id: int, decision: str):
    return await computer.decide(action_id, decision == "approve")


@app.get("/api/computer/log")
def computer_log():
    return db.query("SELECT * FROM computer_log ORDER BY id DESC LIMIT 100")


# ================================================================ doradca i reguły
@app.get("/api/advisor/insights")
def advisor_insights(status: str = "open"):
    return advisor.list_insights(status)


@app.post("/api/advisor/run")
async def advisor_run():
    new = await advisor.run_monitor()
    return {"new": len(new), "insights": advisor.list_insights()}


@app.post("/api/advisor/insights/{iid}")
def advisor_set(iid: int, payload: dict = Body(...)):
    db.update("insights", iid, {"status": payload.get("status", "done"), "updated": db.now_str()})
    return {"ok": True}


@app.get("/api/rules")
def rules_list():
    return db.query("SELECT * FROM rules ORDER BY id DESC")


@app.post("/api/rules")
def rules_add(payload: dict = Body(...)):
    if not payload.get("name") or payload.get("trigger") not in ("daily", "hourly", "weekly", "insight", "transaction") \
            or payload.get("action") not in ("notify", "task", "agent"):
        raise HTTPException(400, "Podaj nazwę, wyzwalacz i akcję")
    return {"id": db.insert("rules", {k: payload.get(k, "") for k in ("name", "trigger", "trigger_value", "action", "action_value")}
                            | {"enabled": 1, "created": db.now_str()})}


@app.patch("/api/rules/{rid}")
def rules_patch(rid: int, payload: dict = Body(...)):
    db.update("rules", rid, {k: v for k, v in payload.items() if k in ("name", "trigger", "trigger_value", "action", "action_value", "enabled")})
    return {"ok": True}


@app.delete("/api/rules/{rid}")
def rules_delete(rid: int):
    db.execute("DELETE FROM rules WHERE id = ?", (rid,))
    return {"ok": True}


@app.post("/api/rules/{rid}/run")
async def rules_run(rid: int):
    r = db.one("SELECT * FROM rules WHERE id = ?", (rid,))
    if not r:
        raise HTTPException(404)
    asyncio.create_task(advisor._apply(r))
    return {"ok": True}


# ================================================================ wiedza lokalna
@app.get("/api/kb/search")
async def kb_search(q: str, limit: int = 10):
    return await knowledge_base.search(q, limit)


@app.post("/api/kb/reindex")
async def kb_reindex():
    asyncio.create_task(knowledge_base.reindex())
    return {"started": True}


@app.get("/api/kb/status")
def kb_status():
    total = db.one("SELECT COUNT(*) n, SUM(vec IS NOT NULL) e FROM kb_chunks")
    return {**knowledge_base.STATE, "chunks": total["n"], "embedded": total["e"] or 0, "last": db.kv_get("kb_last_index"),
            "embed_model": knowledge_base.EMBED_MODEL}


@app.get("/api/kb/graph")
def kb_graph():
    return knowledge_base.graph()


@app.get("/api/kb/entity")
def kb_entity(name: str):
    return knowledge_base.entity_info(name)


@app.post("/api/kb/entities")
def kb_entity_add(payload: dict = Body(...)):
    if not payload.get("name"):
        raise HTTPException(400, "Podaj nazwę")
    return {"id": knowledge_base.upsert_entity(payload["name"], payload.get("type", "osoba"), payload.get("notes", ""),
                                               payload.get("contact", ""))}


@app.delete("/api/kb/entities/{eid}")
def kb_entity_delete(eid: int):
    db.execute("DELETE FROM kb_relations WHERE a = ? OR b = ?", (eid, eid))
    db.execute("DELETE FROM kb_entities WHERE id = ?", (eid,))
    return {"ok": True}


@app.post("/api/kb/relations")
def kb_relation_add(payload: dict = Body(...)):
    return knowledge_base.link(payload["a"], payload["rel"], payload["b"], payload.get("a_type", "osoba"), payload.get("b_type", "firma"))


@app.get("/api/kb/decisions")
def kb_decisions():
    return db.query("SELECT * FROM kb_decisions ORDER BY date DESC, id DESC LIMIT 200")


@app.post("/api/kb/decisions")
def kb_decision_add(payload: dict = Body(...)):
    if not payload.get("topic") or not payload.get("decision"):
        raise HTTPException(400, "Podaj temat i decyzję")
    return {"id": db.insert("kb_decisions", {"date": payload.get("date") or db.now().strftime("%Y-%m-%d"), "topic": payload["topic"],
            "decision": payload["decision"], "reason": payload.get("reason", ""), "people": payload.get("people", ""),
            "created": db.now_str()})}


@app.delete("/api/kb/decisions/{did}")
def kb_decision_delete(did: int):
    db.execute("DELETE FROM kb_decisions WHERE id = ?", (did,))
    return {"ok": True}


# ================================================================ foto / wideo
@app.get("/api/media/cards")
async def media_cards():
    return await asyncio.to_thread(media.detect_cards)


@app.post("/api/media/import")
async def media_import(payload: dict = Body(...)):
    if media.IMPORT["running"]:
        return {"running": True}
    if not payload.get("source") or not payload.get("project"):
        raise HTTPException(400, "Wybierz kartę i wpisz nazwę projektu")
    if payload.get("library"):
        db.kv_set("media_library", payload["library"])
    asyncio.create_task(media.import_card(payload["source"], payload["project"], payload.get("backup") or None))
    return {"started": True}


@app.get("/api/media/import")
def media_import_status():
    return {**media.IMPORT, "library": str(media._library() or "")}


@app.get("/api/media/archive")
async def media_archive(months: int = 6, min_gb: float = 2):
    return await asyncio.to_thread(media.archive_candidates, months, min_gb)


@app.post("/api/media/subtitles")
async def media_subtitles(payload: dict = Body(...)):
    res = await asyncio.to_thread(media.subtitles_sync, payload.get("path", ""), payload.get("language", "pl"))
    if res.get("error"):
        raise HTTPException(400, res["error"])
    return res


# ================================================================ testy jakości
@app.post("/api/evals/run")
async def evals_run():
    if evals.STATE["running"]:
        return {"running": True}
    asyncio.create_task(evals.run())
    return {"started": True}


@app.get("/api/evals")
def evals_history():
    return evals.history()


# ================================================================ dokumenty
@app.get("/api/documents")
def list_documents(q: str = "", kind: str = ""):
    where, params = ["1=1"], []
    if q:
        where.append("(title LIKE ? OR content LIKE ?)")
        params += [f"%{q}%"] * 2
    if kind:
        where.append("kind = ?")
        params.append(kind)
    return db.query(f"SELECT id, title, kind, project_id, created, updated, substr(content, 1, 220) AS preview "
                    f"FROM documents WHERE {' AND '.join(where)} ORDER BY COALESCE(updated, created) DESC", params)


@app.get("/api/documents/{doc_id}/download")
def download_document(doc_id: int):
    d = db.one("SELECT * FROM documents WHERE id = ?", (doc_id,))
    if not d:
        raise HTTPException(404)
    safe = "".join(c if c.isalnum() or c in " -_" else "_" for c in d["title"])[:80].strip() or "dokument"
    return Response(f"# {d['title']}\n\n{d['content']}", media_type="text/markdown; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{safe}.md"'})


# ================================================================ głos
@app.get("/api/voice/status")
def voice_status():
    return voice.status()


@app.post("/api/voice/tts")
async def voice_tts(payload: dict = Body(...)):
    text = (payload.get("text") or "").strip()
    if not text:
        raise HTTPException(400, "Brak tekstu")
    engine = voice.status()["tts_engine"]
    if engine == "piper":
        try:
            audio = await asyncio.to_thread(voice.piper_tts_sync, text)
        except Exception as e:  # noqa: BLE001
            raise HTTPException(503, f"Głos offline niedostępny: {e}")
        return Response(audio, media_type="audio/wav", headers={"Cache-Control": "no-store"})
    if engine != "edge":
        raise HTTPException(503, "Wybrano głos przeglądarki")
    try:
        audio = await asyncio.wait_for(voice.tts(text, payload.get("voice")), timeout=25)
    except Exception as e:  # noqa: BLE001 - spróbuj głosu offline, potem przeglądarki
        if voice.PiperVoice and voice.piper_installed_voices():
            audio = await asyncio.to_thread(voice.piper_tts_sync, text)
            return Response(audio, media_type="audio/wav", headers={"Cache-Control": "no-store"})
        raise HTTPException(503, f"Synteza mowy niedostępna: {type(e).__name__}")
    return Response(audio, media_type="audio/mpeg", headers={"Cache-Control": "no-store"})


@app.post("/api/voice/piper/download")
async def voice_piper_download(payload: dict = Body(...)):
    if voice.PIPER_DL["running"]:
        return {"running": True}
    asyncio.create_task(voice.download_piper_voice(payload.get("voice") or config.PIPER_VOICE))
    return {"started": True}


@app.post("/api/voice/transcribe")
async def voice_transcribe(request: Request):
    audio = await request.body()
    if not audio:
        raise HTTPException(400, "Brak nagrania")
    if len(audio) > 25_000_000:
        raise HTTPException(413, "Nagranie za długie")
    ctype = request.headers.get("content-type", "")
    suffix = ".ogg" if "ogg" in ctype else ".mp4" if "mp4" in ctype else ".wav" if "wav" in ctype else ".webm"
    try:
        text = await voice.transcribe(audio, suffix)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(503, f"Rozpoznawanie mowy niedostępne: {e}")
    return {"text": text}


# ================================================================ umiejętności i MCP
@app.get("/api/skills")
def skills_list():
    agent._merge_registry()
    builtin_tools = [{"name": t["name"], "label": agent.TOOL_LABELS.get(t["name"], t["name"]),
                      "description": t.get("description", "")[:240]} for t in [*agent.TOOLS, *modules.tools()]]
    builtin_tools += [{"name": "web_search", "label": "Szukam w internecie", "description": "Wyszukiwanie w sieci (Claude)"},
                      {"name": "web_fetch", "label": "Czytam stronę", "description": "Czytanie stron internetowych (Claude)"}]
    return {"skills": skills.all_skills(), "tools": builtin_tools, "mcp": mcp_client.manager.status(),
            "mcp_available": mcp_client.AVAILABLE}


@app.post("/api/skills")
def skills_save(payload: dict = Body(...)):
    name = (payload.get("name") or "").strip()
    body = (payload.get("body") or "").strip()
    if not name or not body:
        raise HTTPException(400, "Podaj nazwę i instrukcje")
    return {"id": skills.save(name, payload.get("description", ""), body, payload.get("id") or None)}


@app.patch("/api/skills/{skill_id}")
def skills_toggle(skill_id: str, payload: dict = Body(...)):
    skills.set_enabled(skill_id, bool(payload.get("enabled")))
    return {"ok": True}


@app.delete("/api/skills/{skill_id}")
def skills_delete(skill_id: str):
    return {"ok": skills.delete(skill_id)}


@app.get("/api/mcp/config")
def mcp_config_get():
    text = config.MCP_CONFIG.read_text(encoding="utf-8") if config.MCP_CONFIG.exists() else '{\n  "servers": {}\n}'
    example = (config.BASE_DIR / "mcp_servers.example.json")
    return {"text": text, "example": example.read_text(encoding="utf-8") if example.exists() else ""}


@app.post("/api/mcp/config")
async def mcp_config_save(payload: dict = Body(...)):
    try:
        mcp_client.save_config(payload.get("text", ""))
    except ValueError as e:
        raise HTTPException(400, f"Błąd w JSON: {e}")
    await mcp_client.manager.reload()
    await asyncio.sleep(1.5)
    return {"ok": True, "servers": mcp_client.manager.status()}


@app.post("/api/mcp/reload")
async def mcp_reload():
    await mcp_client.manager.reload()
    await asyncio.sleep(1.5)
    return {"servers": mcp_client.manager.status()}


@app.get("/api/memory/summary")
def memory_summary():
    rows = db.query("SELECT text, created FROM summaries ORDER BY id DESC LIMIT 1")
    total = (db.one("SELECT COUNT(*) AS n FROM chat") or {"n": 0})["n"]
    return {"summary": rows[0] if rows else None, "messages": total}


# ================================================================ kalendarz .ics
@app.get("/api/calendar.ics")
def calendar_export():
    return Response(ics.export(), media_type="text/calendar",
                    headers={"Content-Disposition": 'attachment; filename="studio-agent.ics"'})


@app.post("/api/calendar/import")
async def calendar_import(request: Request):
    body = await request.body()
    if len(body) > 10_000_000:
        raise HTTPException(413, "Plik za duży")
    return ics.import_ics(body.decode("utf-8", errors="replace"))


# ================================================================ powiadomienia
@app.get("/api/notifications")
def notifications(limit: int = 50):
    return db.query("SELECT * FROM notifications ORDER BY id DESC LIMIT ?", (limit,))


@app.post("/api/notifications/read")
def notifications_read():
    db.execute("UPDATE notifications SET read = 1 WHERE read = 0")
    return {"ok": True}


@app.delete("/api/notifications")
def notifications_clear():
    db.execute("DELETE FROM notifications")
    return {"ok": True}


@app.post("/api/notifications/test")
async def notifications_test():
    await notifier.notify("🔔 Test powiadomień", "Jeśli to widzisz na telefonie — Telegram działa.", level="info")
    return {"ok": True, "telegram": notifier.has_telegram() and telegram_bot.STATE["running"]}


# ================================================================ pliki
@app.get("/api/files/search")
def files_search(q: str = "", kind: str = "", camera: str = "", lens: str = "", after: str = "", before: str = "",
                 folders: bool = False, limit: int = 120):
    return file_indexer.search(q, kind=kind, camera=camera, lens=lens, modified_after=after,
                               modified_before=before, folders_only=folders, limit=limit)


@app.get("/api/files/stats")
def files_stats():
    return file_indexer.stats()


@app.post("/api/files/reindex")
async def files_reindex(full: bool = False):
    if file_indexer.STATUS["running"]:
        return {"running": True}
    asyncio.create_task(asyncio.to_thread(file_indexer.reindex, None, full))
    return {"started": True}


@app.get("/api/files/thumb")
async def files_thumb(path: str, size: int = 480):
    data = await asyncio.to_thread(file_indexer.thumbnail, path, max(64, min(size, 1600)))
    if not data:
        raise HTTPException(404)
    return Response(data, media_type="image/jpeg", headers={"Cache-Control": "max-age=86400"})


@app.post("/api/files/open")
def files_open(payload: dict = Body(...)):
    return {"ok": file_indexer.open_in_os(payload.get("path", ""))}


# ================================================================ krypto
@app.get("/api/crypto")
async def crypto_markets():
    try:
        return {"watchlist": config.CRYPTO_WATCHLIST, "markets": await crypto.markets()}
    except Exception as e:  # noqa: BLE001
        return {"watchlist": config.CRYPTO_WATCHLIST, "markets": [], "error": str(e)}


@app.get("/api/alerts")
def alerts():
    return db.query("SELECT * FROM alerts ORDER BY active DESC, id DESC")


@app.post("/api/alerts")
def add_alert(payload: dict = Body(...)):
    try:
        price = float(str(payload["price"]).replace(",", "."))
    except (KeyError, ValueError):
        raise HTTPException(400, "Podaj cenę")
    return {"id": db.insert("alerts", {
        "coin": str(payload.get("coin", "")).strip().lower(), "direction": payload.get("direction", "above"),
        "price": price, "currency": payload.get("currency", "usd"), "active": 1, "created": db.now_str()})}


# ================================================================ ustawienia
@app.get("/api/settings")
def settings_get():
    pending = db.kv_get("tg_pending_chat")
    chat_id, _, name = (pending or "").partition("|")
    return {**config.public_values(),
            "telegram_pending": {"chat_id": chat_id, "name": name} if pending else None}


@app.post("/api/settings")
async def settings_save(payload: dict = Body(...)):
    old_folders = list(config.WATCH_FOLDERS)
    changed = config.save(payload)
    scheduler.reschedule()
    if {"TELEGRAM_BOT_TOKEN", "TELEGRAM_ALLOWED_CHAT_IDS"} & set(changed):
        await telegram_bot.restart()
    if config.WATCH_FOLDERS != old_folders or "INDEX_EXIF" in changed:
        asyncio.create_task(asyncio.to_thread(file_indexer.reindex, None, "INDEX_EXIF" in changed))
    restart_needed = bool({"HOST", "PORT"} & set(changed))
    return {"ok": True, "changed": changed, "restart_needed": restart_needed}


@app.post("/api/settings/telegram/pair")
async def telegram_pair():
    pending = db.kv_get("tg_pending_chat")
    if not pending:
        raise HTTPException(400, "Napisz najpierw /start do bota")
    chat_id = pending.split("|")[0]
    ids = [str(i) for i in config.TELEGRAM_ALLOWED_CHAT_IDS]
    if chat_id not in ids:
        ids.append(chat_id)
    config.save({"TELEGRAM_ALLOWED_CHAT_IDS": ",".join(ids)})
    db.execute("DELETE FROM kv WHERE key = 'tg_pending_chat'")
    await telegram_bot.restart()
    await notifier.notify("✅ Telegram połączony", "Od teraz będę tu wysyłać przypomnienia i odpowiadać na wiadomości.")
    return {"ok": True}


@app.post("/api/settings/test-claude")
async def test_claude():
    if config.PROVIDER == "ollama":
        st = await local_llm.status()
        if not st["running"]:
            return {"ok": False, "error": "Ollama nie działa — zainstaluj ją z ollama.com"}
        if not st["model_ready"]:
            return {"ok": False, "error": f"Model {config.OLLAMA_MODEL} nie jest pobrany"}
        try:
            reply = await local_llm.complete("Odpowiedz jednym słowem: działa?", 20)
            return {"ok": True, "reply": reply}
        except Exception as e:  # noqa: BLE001
            return {"ok": False, "error": str(e)[:300]}
    if not config.ANTHROPIC_API_KEY:
        return {"ok": False, "error": "Brak klucza"}
    try:
        await agent.get_client().models.retrieve(config.MODEL)
        return {"ok": True}
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "error": str(e)[:300]}


@app.post("/api/jobs/{job_id}/run")
async def run_job(job_id: str):
    if not await scheduler.run_now(job_id):
        raise HTTPException(404)
    return {"ok": True}


@app.get("/api/backup")
async def download_backup():
    target = config.DATA_DIR / "backup-download.db"
    await asyncio.to_thread(db.backup_to, target)
    return FileResponse(target, filename=f"studio-agent-{db.now():%Y-%m-%d}.db", media_type="application/octet-stream")


# ================================================================ status
@app.get("/api/status")
def status():
    return {
        "user": config.USER_NAME,
        "now": db.now_str(),
        "model": config.OLLAMA_MODEL if config.PROVIDER == "ollama" else config.MODEL,
        "provider": config.PROVIDER,
        "claude": bool(config.ANTHROPIC_API_KEY) or config.PROVIDER == "ollama",
        "anthropic_key": bool(config.ANTHROPIC_API_KEY),
        "telegram": telegram_bot.STATE["running"],
        "telegram_bot": telegram_bot.STATE["username"],
        "telegram_error": telegram_bot.STATE["error"],
        "telegram_token": bool(config.TELEGRAM_BOT_TOKEN),
        "telegram_chats": len(config.TELEGRAM_ALLOWED_CHAT_IDS),
        "watch_folders": config.WATCH_FOLDERS,
        "files_indexing": file_indexer.STATUS["running"],
        "jobs": scheduler.jobs(),
        "voice": voice.status(),
        "mcp_tools": len(mcp_client.manager.tool_map),
        "skills": len(skills.enabled()),
        "disk": scheduler.disk_free(),
        "unread": (db.one("SELECT COUNT(*) AS n FROM notifications WHERE read = 0") or {"n": 0})["n"],
        "last_notification": (db.one("SELECT MAX(id) AS id FROM notifications") or {"id": None})["id"],
    }


@app.get("/api/health", response_class=PlainTextResponse)
def health():
    return "ok"


if __name__ == "__main__":
    uvicorn.run(app, host=config.HOST, port=config.PORT)
