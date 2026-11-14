"""Finanse: przychody, koszty, straty i inwestycje w podziale na obszary działalności + portfel inwestycji.

Typy transakcji: przychod | koszt | strata | inwestycja
Zysk = przychody - koszty - straty (inwestycje liczone osobno, bo to majątek, nie wydatek bieżący).
"""
from datetime import date

import db

TYPES = ["przychod", "koszt", "strata", "inwestycja"]
AREAS = ["Stratfanat", "Strony WWW", "Teledyski", "Fotografia", "Krypto", "Prywatne", "Inne"]
CATEGORIES = {
    "przychod": ["sprzedaż ubrań", "zlecenie", "abonament/utrzymanie", "licencja", "sprzedaż sprzętu", "zwrot", "inne"],
    "koszt": ["materiały/produkcja", "towar", "sprzęt", "oprogramowanie", "hosting/domeny", "reklama", "transport/paliwo",
              "wynajem", "podwykonawcy", "podatki/ZUS", "opłaty/prowizje", "jedzenie", "inne"],
    "strata": ["zwrot/reklamacja", "kradzież/uszkodzenie", "krypto", "inne"],
    "inwestycja": ["krypto", "sprzęt", "akcje/ETF", "marka/rozwój", "edukacja", "inne"],
}

SCHEMA = """
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'PLN',
    category TEXT DEFAULT '',
    area TEXT DEFAULT 'Inne',
    description TEXT DEFAULT '',
    project_id INTEGER,
    created TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);
CREATE TABLE IF NOT EXISTS holdings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    kind TEXT DEFAULT 'krypto',
    coin_id TEXT DEFAULT '',
    quantity REAL DEFAULT 0,
    cost REAL DEFAULT 0,
    current_value REAL,
    notes TEXT DEFAULT '',
    created TEXT NOT NULL
);
"""


def init() -> None:
    with db._lock:
        db._conn.executescript(SCHEMA)
        db._conn.commit()


def _month_bounds(month: str) -> tuple[str, str]:
    y, m = int(month[:4]), int(month[5:7])
    nxt = date(y + (m == 12), m % 12 + 1, 1)
    return f"{month}-01", nxt.isoformat()


def _prev_month(month: str) -> str:
    y, m = int(month[:4]), int(month[5:7])
    return f"{y - (m == 1)}-{(m - 2) % 12 + 1:02d}"


def _totals(start: str, end: str) -> dict:
    rows = db.query("SELECT type, SUM(amount) AS s, COUNT(*) AS n FROM transactions WHERE date >= ? AND date < ? GROUP BY type",
                    (start, end))
    t = {k: 0.0 for k in TYPES}
    count = 0
    for r in rows:
        t[r["type"]] = round(r["s"] or 0, 2)
        count += r["n"]
    profit = round(t["przychod"] - t["koszt"] - t["strata"], 2)
    margin = round(profit / t["przychod"] * 100, 1) if t["przychod"] else None
    return {**t, "zysk": profit, "marza_%": margin, "transakcji": count}


def monthly_series(end_month: str, months: int = 12) -> list[dict]:
    out, m = [], end_month
    for _ in range(months):
        s, e = _month_bounds(m)
        out.append({"miesiac": m, **_totals(s, e)})
        m = _prev_month(m)
    return list(reversed(out))


def report(month: str | None = None, year: str | None = None) -> dict:
    """Pełne statystyki za miesiąc (YYYY-MM) albo rok (YYYY) + gotowe specyfikacje wykresów."""
    if year:
        start, end, label = f"{year}-01-01", f"{int(year) + 1}-01-01", f"rok {year}"
        end_month = f"{year}-12" if int(year) < db.now().year else db.now().strftime("%Y-%m")
        prev = _totals(f"{int(year) - 1}-01-01", f"{year}-01-01")
    else:
        month = month or db.now().strftime("%Y-%m")
        start, end = _month_bounds(month)
        label, end_month = month, month
        prev = _totals(*_month_bounds(_prev_month(month)))
    cur = _totals(start, end)
    by_area = db.query("SELECT area, type, SUM(amount) AS s FROM transactions WHERE date >= ? AND date < ? "
                       "GROUP BY area, type ORDER BY s DESC", (start, end))
    areas: dict[str, dict] = {}
    for r in by_area:
        a = areas.setdefault(r["area"] or "Inne", {k: 0.0 for k in TYPES})
        a[r["type"]] = round(r["s"], 2)
    for a in areas.values():
        a["zysk"] = round(a["przychod"] - a["koszt"] - a["strata"], 2)
    cost_cats = db.query("SELECT category, SUM(amount) AS s FROM transactions WHERE type = 'koszt' AND date >= ? AND date < ? "
                         "GROUP BY category ORDER BY s DESC", (start, end))
    top = db.query("SELECT date, type, amount, area, category, description FROM transactions WHERE date >= ? AND date < ? "
                   "ORDER BY amount DESC LIMIT 8", (start, end))
    series = monthly_series(end_month, 12)

    def delta(k):
        return round((cur[k] - prev[k]) / prev[k] * 100, 1) if prev.get(k) else None

    charts = [
        {"type": "bar", "title": "Przychody i koszty (12 mies.)", "labels": [s["miesiac"][2:] for s in series],
         "series": [{"name": "Przychody", "data": [s["przychod"] for s in series]},
                    {"name": "Koszty", "data": [round(s["koszt"] + s["strata"], 2) for s in series]}]},
        {"type": "bar", "title": "Zysk miesięczny", "labels": [s["miesiac"][2:] for s in series],
         "series": [{"name": "Zysk", "data": [s["zysk"] for s in series]}]},
    ]
    if areas:
        ordered = sorted(areas.items(), key=lambda kv: kv[1]["przychod"], reverse=True)
        charts.append({"type": "hbar", "title": f"Przychody wg obszaru ({label})", "labels": [k for k, _ in ordered],
                       "series": [{"name": "Przychody", "data": [v["przychod"] for _, v in ordered]}]})
    if cost_cats:
        charts.append({"type": "hbar", "title": f"Koszty wg kategorii ({label})",
                       "labels": [c["category"] or "inne" for c in cost_cats],
                       "series": [{"name": "Koszty", "data": [round(c["s"], 2) for c in cost_cats]}]})
    return {
        "okres": label, "podsumowanie": cur, "poprzedni_okres": prev,
        "zmiana_%": {"przychod": delta("przychod"), "koszt": delta("koszt"), "zysk": delta("zysk")},
        "obszary": areas, "koszty_wg_kategorii": cost_cats, "najwieksze_transakcje": top, "trend_12m": series,
        "wykresy": charts,
        "jak_pokazac_wykres": "Wklej specyfikację z 'wykresy' do odpowiedzi jako blok ```chart z JSON-em – dashboard go narysuje.",
    }


async def portfolio() -> dict:
    """Wartość portfela: krypto wyceniane z CoinGecko (PLN), reszta wg wartości wpisanej ręcznie."""
    import crypto
    rows = db.query("SELECT * FROM holdings ORDER BY kind, name")
    coins = [r["coin_id"] for r in rows if r["coin_id"]]
    prices = {}
    if coins:
        try:
            prices = await crypto.prices(coins)
        except Exception:  # noqa: BLE001 - offline: pokaż wartości ręczne
            prices = {}
    total_cost = total_value = 0.0
    items = []
    for r in rows:
        price = prices.get(r["coin_id"], {}).get("pln") if r["coin_id"] else None
        value = round(price * r["quantity"], 2) if price is not None else r["current_value"]
        cost = r["cost"] or 0
        pl = round(value - cost, 2) if value is not None else None
        items.append({**r, "price_pln": price, "value": value,
                      "pl": pl, "pl_%": round(pl / cost * 100, 1) if (pl is not None and cost) else None})
        total_cost += cost
        total_value += value if value is not None else cost
    return {"pozycje": items, "zainwestowano": round(total_cost, 2), "wartosc": round(total_value, 2),
            "wynik": round(total_value - total_cost, 2),
            "wynik_%": round((total_value - total_cost) / total_cost * 100, 1) if total_cost else None}
