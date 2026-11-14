"""Lokalna baza wiedzy i pamięć — WSZYSTKO na Twoim komputerze, nic nie jest wysyłane do sieci.

- Graf pamięci: osoby, firmy, marki, miejsca, projekty + relacje między nimi („Kasia — modelka — współpracuje ze Stratfanat”).
- Wyszukiwanie po znaczeniu (semantyczne): teksty dzielone na fragmenty, wektory liczone lokalnie przez Ollamę
  (model nomic-embed-text), trzymane w SQLite. Bez Ollamy działa wyszukiwanie pełnotekstowe (FTS5).
  Źródła: dokumenty, pomysły, pamięć, notatnik rozmów, projekty, profil, opis marki i pliki tekstowe z Twoich folderów.
- Dziennik decyzji: co postanowiłeś, dlaczego i z kim.
"""
import asyncio
import hashlib
import logging
import struct
from pathlib import Path

import httpx

import config
import db

log = logging.getLogger("kb")
EMBED_MODEL = "nomic-embed-text"
CHUNK = 900
TEXT_EXT = {".txt", ".md", ".pdf", ".docx", ".srt", ".csv"}
MAX_FILE_MB = 15
STATE = {"running": False, "chunks": 0, "embedded": 0, "error": None, "mode": None}

SCHEMA = """
CREATE TABLE IF NOT EXISTS kb_entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'osoba',          -- osoba | firma | marka | projekt | miejsce | inne
    notes TEXT DEFAULT '',
    contact TEXT DEFAULT '',
    created TEXT NOT NULL,
    updated TEXT,
    UNIQUE(name, type)
);
CREATE TABLE IF NOT EXISTS kb_relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    a INTEGER NOT NULL, rel TEXT NOT NULL, b INTEGER NOT NULL,
    notes TEXT DEFAULT '', created TEXT NOT NULL,
    UNIQUE(a, rel, b)
);
CREATE TABLE IF NOT EXISTS kb_decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL, topic TEXT NOT NULL, decision TEXT NOT NULL,
    reason TEXT DEFAULT '', people TEXT DEFAULT '', project_id INTEGER, created TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS kb_chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,               -- np. doc:12, idea:3, file:/ścieżka
    title TEXT DEFAULT '',
    text TEXT NOT NULL,
    hash TEXT NOT NULL,
    vec BLOB,
    updated TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_kb_source ON kb_chunks(source);
CREATE VIRTUAL TABLE IF NOT EXISTS kb_fts USING fts5(text, title, content='kb_chunks', content_rowid='id',
    tokenize='unicode61 remove_diacritics 2');
CREATE TRIGGER IF NOT EXISTS kb_ai AFTER INSERT ON kb_chunks BEGIN
  INSERT INTO kb_fts(rowid, text, title) VALUES (new.id, new.text, new.title); END;
CREATE TRIGGER IF NOT EXISTS kb_ad AFTER DELETE ON kb_chunks BEGIN
  INSERT INTO kb_fts(kb_fts, rowid, text, title) VALUES('delete', old.id, old.text, old.title); END;
"""


def init() -> None:
    with db._lock:
        db._conn.executescript(SCHEMA)
        db._conn.commit()


# ------------------------------------------------------------------ graf
def upsert_entity(name: str, type_: str = "osoba", notes: str = "", contact: str = "") -> int:
    name = name.strip()
    row = db.one("SELECT * FROM kb_entities WHERE lower(name) = lower(?) AND type = ?", (name, type_))
    if row:
        data = {"updated": db.now_str()}
        if notes and notes not in (row["notes"] or ""):
            data["notes"] = ((row["notes"] or "") + "\n" + notes).strip()
        if contact:
            data["contact"] = contact
        db.update("kb_entities", row["id"], data)
        return row["id"]
    return db.insert("kb_entities", {"name": name, "type": type_, "notes": notes, "contact": contact, "created": db.now_str()})


def _find_entity(name: str) -> dict | None:
    return (db.one("SELECT * FROM kb_entities WHERE lower(name) = lower(?)", (name.strip(),))
            or db.one("SELECT * FROM kb_entities WHERE name LIKE ? ORDER BY length(name) LIMIT 1", (f"%{name.strip()}%",)))


def link(a_name: str, rel: str, b_name: str, a_type: str = "osoba", b_type: str = "firma", notes: str = "") -> dict:
    a = _find_entity(a_name) or {"id": upsert_entity(a_name, a_type)}
    b = _find_entity(b_name) or {"id": upsert_entity(b_name, b_type)}
    db.execute("INSERT OR IGNORE INTO kb_relations(a, rel, b, notes, created) VALUES (?,?,?,?,?)",
               (a["id"], rel.strip(), b["id"], notes, db.now_str()))
    return {"ok": True}


def entity_info(name: str) -> dict:
    e = _find_entity(name)
    if not e:
        return {"error": f"Nie znam „{name}”", "podobne": [r["name"] for r in db.query(
            "SELECT name FROM kb_entities WHERE name LIKE ? LIMIT 5", (f"%{name[:4]}%",))]}
    rels = db.query("""SELECT ea.name a, r.rel, eb.name b, r.notes FROM kb_relations r
                       JOIN kb_entities ea ON ea.id = r.a JOIN kb_entities eb ON eb.id = r.b
                       WHERE r.a = ? OR r.b = ?""", (e["id"], e["id"]))
    like = f"%{e['name']}%"
    return {"encja": e, "relacje": rels,
            "projekty": db.query("SELECT id, name, status, fee FROM projects WHERE name LIKE ? OR client LIKE ?", (like, like)),
            "wydarzenia": db.query("SELECT title, start FROM events WHERE title LIKE ? OR client LIKE ? OR notes LIKE ? "
                                   "ORDER BY start DESC LIMIT 8", (like, like, like)),
            "decyzje": db.query("SELECT date, topic, decision FROM kb_decisions WHERE people LIKE ? OR topic LIKE ? "
                                "ORDER BY date DESC LIMIT 8", (like, like))}


def graph() -> dict:
    return {"nodes": db.query("SELECT id, name, type FROM kb_entities ORDER BY name"),
            "edges": db.query("SELECT a, rel, b FROM kb_relations")}


# ------------------------------------------------------------------ embeddingi (lokalnie przez Ollamę)
async def _embed(texts: list[str]) -> list[list[float]] | None:
    try:
        async with httpx.AsyncClient(timeout=120) as c:
            r = await c.post(f"{config.OLLAMA_URL}/api/embed", json={"model": EMBED_MODEL, "input": texts})
            if r.status_code == 404:
                STATE["error"] = f"Brak modelu {EMBED_MODEL} – pobierz: ollama pull {EMBED_MODEL}"
                return None
            r.raise_for_status()
            return r.json().get("embeddings")
    except httpx.HTTPError as e:
        STATE["error"] = f"Ollama niedostępna ({type(e).__name__}) – działa wyszukiwanie pełnotekstowe"
        return None


def _pack(v: list[float]) -> bytes:
    return struct.pack(f"{len(v)}f", *v)


def _unpack(b: bytes):
    import numpy as np
    return np.frombuffer(b, dtype=np.float32)


def _chunks(text: str) -> list[str]:
    text = text.strip()
    if len(text) <= CHUNK:
        return [text] if text else []
    out, buf = [], ""
    for para in text.split("\n"):
        if len(buf) + len(para) > CHUNK and buf:
            out.append(buf.strip())
            buf = buf[-150:]  # zakładka dla ciągłości
        buf += para + "\n"
    if buf.strip():
        out.append(buf.strip())
    return out


def _sources() -> list[tuple[str, str, str]]:
    """(source, title, text) ze wszystkiego, co agent ma lokalnie."""
    out = []
    for d in db.query("SELECT id, title, content FROM documents"):
        out.append((f"doc:{d['id']}", d["title"], d["content"] or ""))
    for i in db.query("SELECT id, title, content, tags FROM ideas"):
        out.append((f"idea:{i['id']}", i["title"], f"{i['title']}\n{i['content'] or ''}\n{i['tags'] or ''}"))
    for p in db.query("SELECT id, name, client, notes, status FROM projects"):
        out.append((f"project:{p['id']}", p["name"], f"Projekt {p['name']} dla {p['client'] or '-'} ({p['status']}). {p['notes'] or ''}"))
    facts = "\n".join(f["fact"] for f in db.query("SELECT fact FROM memory"))
    if facts:
        out.append(("memory", "Pamięć – fakty", facts))
    s = db.one("SELECT text FROM summaries ORDER BY id DESC LIMIT 1") if db.one(
        "SELECT name FROM sqlite_master WHERE name='summaries'") else None
    if s:
        out.append(("summary", "Notatnik rozmów", s["text"]))
    for name, path in (("Profil", config.PROFILE_PATH), ("Marka Stratfanat", config.BASE_DIR / "brand" / "stratfanat.md")):
        if Path(path).exists():
            out.append((f"file:{path}", name, Path(path).read_text(encoding="utf-8", errors="replace")))
    # pliki tekstowe z Twoich folderów
    rows = db.query("SELECT path, name, size FROM files WHERE ext IN ('txt','md','pdf','docx','srt','csv') ORDER BY mtime DESC LIMIT 400")
    for r in rows:
        if (r["size"] or 0) > MAX_FILE_MB * 1e6:
            continue
        try:
            import extra_tools
            txt = extra_tools.read_document(r["path"]).get("text", "")
        except Exception:  # noqa: BLE001
            continue
        if txt.strip():
            out.append((f"file:{r['path']}", r["name"], txt[:60000]))
    return out


async def reindex() -> dict:
    if STATE["running"]:
        return {"running": True}
    STATE.update(running=True, error=None)
    try:
        sources = await asyncio.to_thread(_sources)
        seen_sources = set()
        todo: list[tuple[int, str]] = []
        for source, title, text in sources:
            seen_sources.add(source)
            h = hashlib.sha1(text.encode("utf-8", "replace")).hexdigest()
            old = db.one("SELECT hash FROM kb_chunks WHERE source = ? LIMIT 1", (source,))
            if old and old["hash"] == h:
                continue
            db.execute("DELETE FROM kb_chunks WHERE source = ?", (source,))
            for ch in _chunks(text):
                cid = db.insert("kb_chunks", {"source": source, "title": title, "text": ch, "hash": h, "updated": db.now_str()})
                todo.append((cid, f"{title}\n{ch}"))
        for src in {r["source"] for r in db.query("SELECT DISTINCT source FROM kb_chunks")} - seen_sources:
            db.execute("DELETE FROM kb_chunks WHERE source = ?", (src,))
        # wektory dla fragmentów bez wektora
        missing = db.query("SELECT id, title, text FROM kb_chunks WHERE vec IS NULL LIMIT 5000")
        STATE["mode"] = "fts"
        for i in range(0, len(missing), 32):
            batch = missing[i:i + 32]
            vecs = await _embed([f"search_document: {m['title']}\n{m['text']}" for m in batch])
            if vecs is None:
                break
            STATE["mode"] = "semantic"
            for m, v in zip(batch, vecs):
                db.execute("UPDATE kb_chunks SET vec = ? WHERE id = ?", (_pack(v), m["id"]))
        total = db.one("SELECT COUNT(*) n, SUM(vec IS NOT NULL) e FROM kb_chunks")
        STATE.update(chunks=total["n"], embedded=total["e"] or 0)
        if STATE["embedded"]:
            STATE["mode"] = "semantic"
        db.kv_set("kb_last_index", db.now_str())
        return {"chunks": total["n"], "embedded": total["e"] or 0, "new": len(todo), "error": STATE["error"]}
    finally:
        STATE["running"] = False


async def search(query: str, limit: int = 8) -> dict:
    results = []
    has_vec = db.one("SELECT 1 FROM kb_chunks WHERE vec IS NOT NULL LIMIT 1")
    if has_vec:
        qv = await _embed([f"search_query: {query}"])
        if qv:
            import numpy as np
            q = np.array(qv[0], dtype=np.float32)
            q /= (np.linalg.norm(q) or 1)
            rows = db.query("SELECT id, source, title, text, vec FROM kb_chunks WHERE vec IS NOT NULL")
            scored = []
            for r in rows:
                v = _unpack(r["vec"])
                scored.append((float(np.dot(v, q) / (np.linalg.norm(v) or 1)), r))
            scored.sort(key=lambda x: x[0], reverse=True)
            results = [{"score": round(s, 3), "zrodlo": r["source"], "tytul": r["title"], "fragment": r["text"][:700]}
                       for s, r in scored[:limit] if s > 0.35]
    if not results:
        words = [w.strip('"*()') for w in query.split() if len(w) > 2]
        if words:
            fq = " OR ".join(f'"{w}"*' for w in words[:8])
            try:
                rows = db.query("SELECT c.source, c.title, snippet(kb_fts, 0, '«', '»', '…', 40) frag FROM kb_fts "
                                "JOIN kb_chunks c ON c.id = kb_fts.rowid WHERE kb_fts MATCH ? ORDER BY bm25(kb_fts) LIMIT ?",
                                (fq, limit))
                results = [{"zrodlo": r["source"], "tytul": r["title"], "fragment": r["frag"]} for r in rows]
            except Exception as e:  # noqa: BLE001
                log.warning("FTS: %s", e)
    return {"tryb": "semantyczny" if has_vec and results and "score" in results[0] else "pełnotekstowy",
            "wyniki": results, "uwaga": STATE.get("error")}


# ------------------------------------------------------------------ narzędzia agenta
_S = {"type": "string"}
TOOLS = [
    {"name": "knowledge_search", "description": "Przeszukuje po znaczeniu całą lokalną wiedzę: dokumenty, pomysły, projekty, "
     "pamięć, notatnik rozmów, profil, opis marki i pliki tekstowe/PDF/DOCX z folderów użytkownika. Działa offline.",
     "input_schema": {"type": "object", "properties": {"query": _S, "limit": {"type": "integer"}}, "required": ["query"]}},
    {"name": "remember_entity", "description": "Zapisuje osobę/firmę/markę/miejsce w grafie pamięci (np. klient, modelka, "
     "dostawca tkanin, drukarnia). Używaj, gdy pojawia się nowa osoba lub firma.",
     "input_schema": {"type": "object", "properties": {"name": _S,
                      "type": {"type": "string", "enum": ["osoba", "firma", "marka", "projekt", "miejsce", "inne"]},
                      "notes": _S, "contact": _S}, "required": ["name"]}},
    {"name": "link_entities", "description": "Łączy dwie encje relacją, np. ('Kasia Nowak', 'pracuje w', 'Agencja X') albo "
     "('Drukarnia Y', 'drukuje dla', 'Stratfanat').",
     "input_schema": {"type": "object", "properties": {"a": _S, "relation": _S, "b": _S, "a_type": _S, "b_type": _S, "notes": _S},
                      "required": ["a", "relation", "b"]}},
    {"name": "entity_info", "description": "Wszystko, co wiadomo o osobie/firmie: notatki, kontakt, relacje, projekty, "
     "wydarzenia i decyzje.", "input_schema": {"type": "object", "properties": {"name": _S}, "required": ["name"]}},
    {"name": "log_decision", "description": "Zapisuje decyzję w dzienniku decyzji (co, dlaczego, z kim).",
     "input_schema": {"type": "object", "properties": {"topic": _S, "decision": _S, "reason": _S, "people": _S,
                      "project_id": {"type": "integer"}}, "required": ["topic", "decision"]}},
    {"name": "list_decisions", "description": "Dziennik decyzji (opcjonalnie filtr tekstowy).",
     "input_schema": {"type": "object", "properties": {"query": _S}}},
]
NAMES = {t["name"] for t in TOOLS}
LABELS = {"knowledge_search": "Szukam w mojej wiedzy", "remember_entity": "Zapamiętuję osobę/firmę",
          "link_entities": "Łączę w pamięci", "entity_info": "Przypominam sobie", "log_decision": "Zapisuję decyzję",
          "list_decisions": "Przeglądam decyzje"}
CHANGES = {"remember_entity": "memory", "link_entities": "memory", "log_decision": "memory"}


async def execute(name: str, a: dict):
    match name:
        case "knowledge_search":
            return await search(a["query"], a.get("limit", 8))
        case "remember_entity":
            return {"ok": True, "id": upsert_entity(a["name"], a.get("type", "osoba"), a.get("notes", ""), a.get("contact", ""))}
        case "link_entities":
            return link(a["a"], a["relation"], a["b"], a.get("a_type", "osoba"), a.get("b_type", "firma"), a.get("notes", ""))
        case "entity_info":
            return entity_info(a["name"])
        case "log_decision":
            return {"ok": True, "id": db.insert("kb_decisions", {"date": db.now().strftime("%Y-%m-%d"), "topic": a["topic"],
                    "decision": a["decision"], "reason": a.get("reason", ""), "people": a.get("people", ""),
                    "project_id": a.get("project_id"), "created": db.now_str()})}
        case "list_decisions":
            q = a.get("query")
            if q:
                return db.query("SELECT * FROM kb_decisions WHERE topic LIKE ? OR decision LIKE ? OR people LIKE ? "
                                "ORDER BY date DESC LIMIT 50", (f"%{q}%",) * 3)
            return db.query("SELECT * FROM kb_decisions ORDER BY date DESC LIMIT 50")
    return {"error": f"Nieznane narzędzie {name}"}
