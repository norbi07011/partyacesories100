"""Baza danych SQLite: zadania, kalendarz, pomysły, pamięć, powiadomienia, pliki, alerty."""
import sqlite3
import threading
from datetime import datetime

from config import DB_PATH, TZ

_lock = threading.RLock()
_conn = sqlite3.connect(DB_PATH, check_same_thread=False)
_conn.row_factory = sqlite3.Row
_conn.execute("PRAGMA journal_mode=WAL")

SCHEMA = """
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    notes TEXT DEFAULT '',
    project TEXT DEFAULT '',
    priority TEXT DEFAULT 'normal',          -- low | normal | high
    status TEXT DEFAULT 'todo',              -- todo | doing | done
    due TEXT,                                -- 'YYYY-MM-DDTHH:MM' czas lokalny
    reminded INTEGER DEFAULT 0,
    created TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    start TEXT NOT NULL,
    end TEXT,
    location TEXT DEFAULT '',
    client TEXT DEFAULT '',
    kind TEXT DEFAULT 'inne',                -- sesja | teledysk | spotkanie | montaz | inne
    notes TEXT DEFAULT '',
    reminded INTEGER DEFAULT 0,
    created TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    category TEXT DEFAULT '',
    tags TEXT DEFAULT '',
    status TEXT DEFAULT 'nowy',              -- nowy | rozwijany | zrealizowany | odlozony
    created TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fact TEXT NOT NULL,
    created TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT DEFAULT '',
    level TEXT DEFAULT 'info',               -- info | reminder | alert | crypto | brief
    read INTEGER DEFAULT 0,
    created TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS chat (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS files (
    path TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ext TEXT,
    kind TEXT,
    size INTEGER,
    mtime TEXT,
    folder TEXT,
    root TEXT
);
CREATE INDEX IF NOT EXISTS idx_files_name ON files(name);
CREATE INDEX IF NOT EXISTS idx_files_kind ON files(kind);
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    coin TEXT NOT NULL,
    direction TEXT NOT NULL,                 -- above | below
    price REAL NOT NULL,
    currency TEXT DEFAULT 'usd',
    active INTEGER DEFAULT 1,
    created TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY,
    value TEXT
);
"""


def now() -> datetime:
    return datetime.now(TZ).replace(tzinfo=None)


def now_str() -> str:
    return now().strftime("%Y-%m-%dT%H:%M:%S")


def init() -> None:
    with _lock:
        _conn.executescript(SCHEMA)
        _conn.commit()


def query(sql: str, params: tuple | list = ()) -> list[dict]:
    with _lock:
        cur = _conn.execute(sql, params)
        return [dict(r) for r in cur.fetchall()]


def one(sql: str, params: tuple | list = ()) -> dict | None:
    rows = query(sql, params)
    return rows[0] if rows else None


def execute(sql: str, params: tuple | list = ()) -> int:
    """Wykonuje zapis; zwraca lastrowid."""
    with _lock:
        cur = _conn.execute(sql, params)
        _conn.commit()
        return cur.lastrowid


def executemany(sql: str, rows: list) -> None:
    with _lock:
        _conn.executemany(sql, rows)
        _conn.commit()


def insert(table: str, data: dict) -> int:
    cols = ", ".join(data.keys())
    marks = ", ".join("?" for _ in data)
    return execute(f"INSERT INTO {table} ({cols}) VALUES ({marks})", list(data.values()))


def update(table: str, row_id: int, data: dict) -> None:
    if not data:
        return
    sets = ", ".join(f"{k} = ?" for k in data)
    execute(f"UPDATE {table} SET {sets} WHERE id = ?", [*data.values(), row_id])


def kv_get(key: str, default: str | None = None) -> str | None:
    row = one("SELECT value FROM kv WHERE key = ?", (key,))
    return row["value"] if row else default


def kv_set(key: str, value: str) -> None:
    execute("INSERT INTO kv(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", (key, value))
