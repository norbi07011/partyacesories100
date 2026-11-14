"""Pamięć agenta: wyszukiwanie w całej historii rozmów (FTS5) i automatyczne streszczenia starszych rozmów.

- Ostatnie wiadomości agent widzi bezpośrednio (agent.HISTORY_TURNS).
- Starsze są streszczane do „notatnika rozmów” dołączanego do kontekstu.
- Narzędzie recall przeszukuje wszystko: rozmowy (czat, Telegram, rozmowy głosowe), pomysły, projekty, dokumenty.
"""
import logging

import config
import db

log = logging.getLogger("memory")

FTS_SCHEMA = """
CREATE VIRTUAL TABLE IF NOT EXISTS chat_fts USING fts5(content, content='chat', content_rowid='id', tokenize='unicode61 remove_diacritics 2');
CREATE TRIGGER IF NOT EXISTS chat_ai AFTER INSERT ON chat BEGIN
  INSERT INTO chat_fts(rowid, content) VALUES (new.id, new.content);
END;
CREATE TRIGGER IF NOT EXISTS chat_ad AFTER DELETE ON chat BEGIN
  INSERT INTO chat_fts(chat_fts, rowid, content) VALUES('delete', old.id, old.content);
END;
CREATE TABLE IF NOT EXISTS summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    upto_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    created TEXT NOT NULL
);
"""
SUMMARY_EVERY = 24          # streszczaj, gdy uzbiera się tyle nowych wiadomości poza oknem rozmowy
KEEP_RECENT = 20            # ostatnie wiadomości (wszystkie kanały) zostają poza streszczeniem


def init() -> None:
    with db._lock:
        db._conn.executescript(FTS_SCHEMA)
        # jednorazowe uzupełnienie indeksu dla starszych wiadomości
        n_fts = db._conn.execute("SELECT COUNT(*) FROM chat_fts").fetchone()[0]
        n_chat = db._conn.execute("SELECT COUNT(*) FROM chat").fetchone()[0]
        if n_chat and not n_fts:
            db._conn.execute("INSERT INTO chat_fts(chat_fts) VALUES('rebuild')")
        db._conn.commit()


def _fts_query(q: str) -> str:
    words = [w.strip('"*()') for w in q.split() if len(w.strip('"*()')) > 1]
    return " OR ".join(f'"{w}"*' for w in words[:8])


def recall(query: str, limit: int = 12) -> dict:
    fq = _fts_query(query)
    chats = []
    if fq:
        try:
            chats = db.query(
                "SELECT c.session, c.role, c.created, snippet(chat_fts, 0, '«', '»', '…', 24) AS fragment "
                "FROM chat_fts JOIN chat c ON c.id = chat_fts.rowid WHERE chat_fts MATCH ? "
                "ORDER BY bm25(chat_fts) LIMIT ?", (fq, limit))
        except Exception as e:  # noqa: BLE001
            log.warning("FTS: %s", e)
    like = f"%{query}%"
    return {
        "rozmowy": chats,
        "streszczenia": db.query("SELECT created, text FROM summaries ORDER BY id DESC LIMIT 1"),
        "pomysly": db.query("SELECT id, title, content FROM ideas WHERE title LIKE ? OR content LIKE ? LIMIT 5", (like, like)),
        "projekty": db.query("SELECT id, name, client, status FROM projects WHERE name LIKE ? OR client LIKE ? OR notes LIKE ? LIMIT 5",
                             (like, like, like)),
        "dokumenty": db.query("SELECT id, title, created FROM documents WHERE title LIKE ? OR content LIKE ? LIMIT 5", (like, like)),
    }


def current_summary() -> str:
    row = db.one("SELECT text FROM summaries ORDER BY id DESC LIMIT 1")
    return row["text"] if row else ""


async def maybe_summarize(complete) -> None:
    """Gdy poza oknem rozmowy uzbiera się dużo wiadomości – dopisz je do streszczenia (w tle)."""
    last = db.one("SELECT MAX(upto_id) AS u FROM summaries")
    upto = (last or {}).get("u") or 0
    newest = db.query("SELECT id FROM chat WHERE session NOT LIKE 'system:%' ORDER BY id DESC LIMIT 1 OFFSET ?",
                      (KEEP_RECENT,))
    if not newest:
        return
    cutoff = newest[0]["id"]
    rows = db.query("SELECT id, session, role, content, created FROM chat WHERE id > ? AND id <= ? "
                    "AND session NOT LIKE 'system:%' ORDER BY id", (upto, cutoff))
    if len(rows) < SUMMARY_EVERY:
        return
    convo = "\n".join(f"[{r['created'][:16]} {'tg' if r['session'].startswith('tg:') else 'app'}] "
                      f"{'Użytkownik' if r['role'] == 'user' else 'Agent'}: {r['content'][:1500]}" for r in rows)
    prev = current_summary()
    prompt = (
        "Aktualizujesz notatnik pamięci osobistego agenta. Połącz dotychczasowy notatnik z nowymi rozmowami w jeden "
        "zwięzły notatnik (maks. ok. 400 słów, po polsku, punktami). Zachowaj: ustalenia, decyzje, obietnice agenta, "
        "plany, preferencje, ważne osoby i fakty, otwarte sprawy (z datami). Pomiń small talk i to, co nieaktualne.\n\n"
        f"DOTYCHCZASOWY NOTATNIK:\n{prev or '(pusto)'}\n\nNOWE ROZMOWY:\n{convo}"
    )
    try:
        text = await complete(prompt)
    except Exception as e:  # noqa: BLE001
        log.warning("Streszczenie nieudane: %s", e)
        return
    if text:
        db.insert("summaries", {"upto_id": cutoff, "text": text, "created": db.now_str()})
        log.info("Zaktualizowano notatnik pamięci (%d wiadomości)", len(rows))
