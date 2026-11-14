"""Moduł TRADING – analiza rynku, konto DEMO (paper trading), boty demo, backtesty, wiedza.

WSZYSTKO TU DZIAŁA NA WIRTUALNYCH PIENIĄDZACH. Moduł nigdy nie składa zleceń na prawdziwej giełdzie
i nie używa kluczy API – dane rynkowe to publiczne świece Bybit (albo dane syntetyczne w trybie demo).

Integracja (robi to main.py / scheduler.py / agent.py):
    import trading; trading.init()                       # tabele tr_*
    from trading.api import router; app.include_router(router)
    scheduler: trading.paper.check_positions (co 1 min), trading.bots.run_bots (co 1 min)
    narzędzia agenta: trading.tools.TOOLS / LABELS / CHANGES / NAMES / execute
"""
import db

SCHEMA = """
CREATE TABLE IF NOT EXISTS tr_account (
    id INTEGER PRIMARY KEY,
    balance REAL NOT NULL,                  -- wolne środki (gotówka) w USDT
    start_balance REAL NOT NULL,
    risk_pct REAL DEFAULT 1.0,              -- domyślne ryzyko na transakcję (% kapitału)
    max_risk_pct REAL DEFAULT 2.0,          -- twardy limit ryzyka na transakcję
    max_positions INTEGER DEFAULT 5,
    daily_loss_limit_pct REAL DEFAULT 5.0,  -- po takiej stracie dnia blokada nowych pozycji
    created TEXT NOT NULL,
    reset_at TEXT
);
CREATE TABLE IF NOT EXISTS tr_positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL,                     -- long | short
    qty REAL NOT NULL,                      -- ilość monety
    entry REAL NOT NULL,
    leverage REAL DEFAULT 1,
    margin REAL NOT NULL,                   -- zablokowany depozyt (USDT)
    sl REAL,
    tp REAL,
    liq REAL,
    risk_usdt REAL,                         -- ryzyko początkowe (do R-multiple)
    fees REAL DEFAULT 0,
    status TEXT DEFAULT 'open',             -- open | closed
    opened TEXT NOT NULL,
    closed TEXT,
    exit REAL,
    pnl REAL,                               -- wynik netto (po opłatach) dla zamkniętych
    r_multiple REAL,
    reason TEXT DEFAULT '',                 -- manual | sl | tp | liq | bot | eod | partial
    bot_id INTEGER,
    source TEXT DEFAULT 'bybit',            -- bybit | synthetic
    note TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_tr_pos_status ON tr_positions(status);
CREATE TABLE IF NOT EXISTS tr_equity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL,
    balance REAL NOT NULL,
    equity REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS tr_bots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    interval TEXT NOT NULL,
    strategy TEXT NOT NULL,                 -- ema_cross | rsi_reversion | breakout_range | agent_consensus
    params TEXT DEFAULT '{}',
    risk_pct REAL DEFAULT 1.0,
    leverage REAL DEFAULT 3,
    status TEXT DEFAULT 'paused',           -- running | paused
    last_candle INTEGER,                    -- ostatnia przetworzona zamknięta świeca (ms) – idempotencja
    state TEXT DEFAULT '{}',
    created TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tr_bot_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bot_id INTEGER NOT NULL,
    ts TEXT NOT NULL,
    msg TEXT NOT NULL
);
"""

DEFAULT_BALANCE = 10_000.0


def init() -> None:
    """Tworzy tabele tr_* i konto demo (10 000 USDT), jeśli go nie ma."""
    with db._lock:
        db._conn.executescript(SCHEMA)
        db._conn.commit()
    if not db.one("SELECT id FROM tr_account WHERE id = 1"):
        db.execute("INSERT INTO tr_account (id, balance, start_balance, created) VALUES (1, ?, ?, ?)",
                   (DEFAULT_BALANCE, DEFAULT_BALANCE, db.now_str()))
