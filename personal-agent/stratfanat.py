"""Stratfanat – marka odzieżowa: produkty i magazyn (stany per rozmiar), sprzedaż i dostawy (z księgowaniem w finansach),
kolekcje / dropy, projekty (makiety SVG + obrazy AI z lokalnego ComfyUI), trendy i DNA marki.

Integracja (main.py / agent.py / scheduler.py):
    import stratfanat
    stratfanat.init()                       # w lifespan, po finance.init()
    app.include_router(stratfanat.router)   # /api/stratfanat/...
    narzędzia: stratfanat.TOOLS / LABELS / CHANGES / NAMES / execute(name, args)
    monitoring: stratfanat.alerts() -> list[dict]
"""
import asyncio
import base64
import json
import math
import os
import random
import re
import uuid
from datetime import date, timedelta
from pathlib import Path
from xml.sax.saxutils import escape as _xml

import httpx
from fastapi import APIRouter, Body, HTTPException
from fastapi.responses import FileResponse, Response

import config
import db

AREA = "Stratfanat"
DESIGN_DIR = config.DATA_DIR / "designs"
BRAND_DIR = config.BASE_DIR / "brand"
BRAND_PATH = BRAND_DIR / "stratfanat.md"

CATEGORIES = ["koszulka", "bluza", "hoodie", "spodnie", "czapka", "kurtka", "akcesoria"]
CHANNELS = ["sklep", "instagram", "vinted", "event", "inny"]
COLLECTION_STATUS = ["pomysł", "projektowanie", "produkcja", "premiera", "zakończona"]
DESIGN_STATUS = ["szkic", "do akceptacji", "zaakceptowany", "w produkcji", "odrzucony"]
SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"]
ONE_SIZE = "ONE"

SCHEMA = """
CREATE TABLE IF NOT EXISTS sf_collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    season TEXT DEFAULT '',
    concept TEXT DEFAULT '',
    drop_date TEXT,                          -- YYYY-MM-DD
    status TEXT DEFAULT 'pomysł',            -- pomysł | projektowanie | produkcja | premiera | zakończona
    budget REAL,
    event_id INTEGER,
    checklist TEXT DEFAULT '',               -- JSON lista kroków
    notes TEXT DEFAULT '',
    created TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sf_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT,
    name TEXT NOT NULL,
    collection_id INTEGER,
    category TEXT DEFAULT 'koszulka',
    color TEXT DEFAULT '',
    price REAL DEFAULT 0,
    unit_cost REAL DEFAULT 0,
    stock TEXT DEFAULT '{}',                 -- JSON {"S":3,"M":5}
    low_stock_threshold INTEGER DEFAULT 2,
    status TEXT DEFAULT 'aktywny',           -- aktywny | archiwum
    image TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created TEXT NOT NULL,
    updated TEXT
);
CREATE INDEX IF NOT EXISTS idx_sf_products_sku ON sf_products(sku);
CREATE TABLE IF NOT EXISTS sf_sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    sku TEXT DEFAULT '',
    name TEXT DEFAULT '',
    size TEXT DEFAULT '',
    qty INTEGER NOT NULL,
    price REAL NOT NULL,                     -- cena za sztukę
    total REAL NOT NULL,
    unit_cost REAL DEFAULT 0,                -- koszt sztuki w chwili sprzedaży (marża)
    channel TEXT DEFAULT 'inny',
    date TEXT NOT NULL,                      -- YYYY-MM-DD
    transaction_id INTEGER,
    notes TEXT DEFAULT '',
    created TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sf_sales_date ON sf_sales(date);
CREATE TABLE IF NOT EXISTS sf_restocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    size TEXT DEFAULT '',
    qty INTEGER NOT NULL,
    unit_cost REAL DEFAULT 0,
    total REAL DEFAULT 0,
    date TEXT NOT NULL,
    transaction_id INTEGER,
    notes TEXT DEFAULT '',
    created TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sf_designs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    product_type TEXT DEFAULT 'tshirt',
    concept TEXT DEFAULT '',
    colors TEXT DEFAULT '{}',                -- JSON {"base":"#111111","print":"#ffffff","trim":"#222222"}
    print_text TEXT DEFAULT '',
    placement TEXT DEFAULT 'front_center',
    graphic_style TEXT DEFAULT 'bold',
    mockup_svg TEXT DEFAULT '',
    mockup_png TEXT DEFAULT '',
    ai_image TEXT DEFAULT '',                -- JSON lista ścieżek
    prompt TEXT DEFAULT '',
    collection_id INTEGER,
    status TEXT DEFAULT 'szkic',
    notes TEXT DEFAULT '',
    created TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sf_trends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    source TEXT DEFAULT '',
    fit_score INTEGER DEFAULT 5,
    tags TEXT DEFAULT '',
    status TEXT DEFAULT 'nowy',              -- nowy | testujemy | wdrożony | odrzucony
    created TEXT NOT NULL
);
"""


def init() -> None:
    with db._lock:
        db._conn.executescript(SCHEMA)
        db._conn.commit()
    DESIGN_DIR.mkdir(parents=True, exist_ok=True)
    BRAND_DIR.mkdir(parents=True, exist_ok=True)


# ================================================================ pomocnicze
def _today() -> str:
    return db.now().strftime("%Y-%m-%d")


def _env(key: str, default: str) -> str:
    v = os.environ.get(key)
    if v:
        return v
    try:
        from dotenv import dotenv_values
        v = dotenv_values(config.ENV_PATH).get(key) if config.ENV_PATH.exists() else None
    except Exception:  # noqa: BLE001
        v = None
    return v or default


def _stock(p: dict) -> dict[str, int]:
    try:
        s = json.loads(p.get("stock") or "{}")
        return {str(k): int(v or 0) for k, v in s.items()} if isinstance(s, dict) else {}
    except (ValueError, TypeError):
        return {}


def _norm_size(size) -> str:
    s = str(size or "").strip().upper()
    return {"ONE SIZE": ONE_SIZE, "OS": ONE_SIZE, "UNI": ONE_SIZE, "UNIWERSALNY": ONE_SIZE, "2XL": "XXL", "3XL": "XXXL"}.get(s, s)


def _size_sort(sizes) -> list[str]:
    order = {s: i for i, s in enumerate(SIZES)}
    return sorted(sizes, key=lambda s: (order.get(s, 99), s))


def _default_stock(category: str) -> dict:
    return {ONE_SIZE: 0} if category in ("czapka", "akcesoria") else {s: 0 for s in ["S", "M", "L", "XL"]}


def _parse_stock(value) -> dict[str, int]:
    if value is None or value == "":
        return {}
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except ValueError:
            # format "S:3, M:5"
            out = {}
            for part in re.split(r"[,;]\s*", value):
                if ":" in part:
                    k, v = part.split(":", 1)
                    out[_norm_size(k)] = int(float(v.strip() or 0))
            return out
    if not isinstance(value, dict):
        raise ValueError("Stan magazynu podaj jako obiekt {\"S\": 3, \"M\": 5}")
    return {_norm_size(k): max(0, int(float(v or 0))) for k, v in value.items() if str(k).strip()}


def _product_out(p: dict) -> dict:
    st = _stock(p)
    out = {**p, "stock": {k: st[k] for k in _size_sort(st)}}
    out["units"] = sum(st.values())
    out["stock_value_cost"] = round(out["units"] * (p.get("unit_cost") or 0), 2)
    thr = p.get("low_stock_threshold") if p.get("low_stock_threshold") is not None else 2
    out["low_sizes"] = [k for k in _size_sort(st) if st[k] <= thr]
    if p.get("collection_id"):
        c = db.one("SELECT name FROM sf_collections WHERE id = ?", (p["collection_id"],))
        out["collection"] = c["name"] if c else ""
    return out


def find_product(ref) -> dict:
    """Szuka produktu po id, SKU albo nazwie. Rzuca ValueError z podpowiedzią, gdy niejednoznaczne."""
    if ref is None or str(ref).strip() == "":
        raise ValueError("Podaj produkt (SKU, nazwę albo id)")
    r = str(ref).strip()
    if r.isdigit():
        p = db.one("SELECT * FROM sf_products WHERE id = ?", (int(r),))
        if p:
            return p
    p = db.one("SELECT * FROM sf_products WHERE lower(sku) = lower(?)", (r,))
    if p:
        return p
    rows = db.query("SELECT * FROM sf_products WHERE lower(name) = lower(?)", (r,))
    if len(rows) == 1:
        return rows[0]
    rows = db.query("SELECT * FROM sf_products WHERE (name LIKE ? OR sku LIKE ?) ORDER BY status = 'aktywny' DESC, id DESC",
                    (f"%{r}%", f"%{r}%"))
    active = [x for x in rows if x["status"] == "aktywny"]
    if len(active) == 1:
        return active[0]
    if len(rows) == 1:
        return rows[0]
    if not rows:
        raise ValueError(f"Nie znam produktu „{r}”. Dodaj go narzędziem add_product albo podaj SKU.")
    raise ValueError("Pasuje kilka produktów – podaj SKU: " + ", ".join(f"{x['sku'] or x['id']} ({x['name']})" for x in rows[:8]))


def _find_collection(ref) -> dict | None:
    if ref in (None, ""):
        return None
    r = str(ref).strip()
    if r.isdigit():
        c = db.one("SELECT * FROM sf_collections WHERE id = ?", (int(r),))
        if c:
            return c
    return db.one("SELECT * FROM sf_collections WHERE lower(name) = lower(?) OR name LIKE ? ORDER BY id DESC",
                  (r, f"%{r}%"))


def _auto_sku(name: str, category: str, color: str) -> str:
    table = str.maketrans("ąćęłńóśźżĄĆĘŁŃÓŚŹŻ", "acelnoszzACELNOSZZ")
    def part(s, n):
        return re.sub(r"[^A-Z0-9]", "", (s or "").translate(table).upper())[:n]
    base = "SF-" + "-".join(x for x in [part(category, 3), part(name, 6), part(color, 3)] if x)
    sku, i = base, 2
    while db.one("SELECT id FROM sf_products WHERE sku = ?", (sku,)):
        sku = f"{base}-{i}"; i += 1
    return sku


# ================================================================ produkty i magazyn
def add_product(a: dict) -> dict:
    name = (a.get("name") or "").strip()
    if not name:
        raise ValueError("Podaj nazwę produktu")
    category = a.get("category") or "koszulka"
    stock = _parse_stock(a.get("stock")) or _default_stock(category)
    coll = _find_collection(a.get("collection") or a.get("collection_id"))
    sku = (a.get("sku") or "").strip() or _auto_sku(name, category, a.get("color", ""))
    if db.one("SELECT id FROM sf_products WHERE lower(sku) = lower(?)", (sku,)):
        raise ValueError(f"SKU {sku} już istnieje – użyj update_product")
    data = {
        "sku": sku, "name": name, "category": category, "color": a.get("color", ""),
        "price": float(a.get("price") or 0), "unit_cost": float(a.get("unit_cost") or 0),
        "stock": json.dumps(stock, ensure_ascii=False),
        "low_stock_threshold": int(a["low_stock_threshold"]) if a.get("low_stock_threshold") not in (None, "") else 2,
        "status": a.get("status") or "aktywny", "image": a.get("image", ""), "notes": a.get("notes", ""),
        "collection_id": coll["id"] if coll else None, "created": db.now_str(),
    }
    pid = db.insert("sf_products", data)
    return {"ok": True, "id": pid, "product": _product_out(db.one("SELECT * FROM sf_products WHERE id = ?", (pid,)))}


def update_product(a: dict) -> dict:
    p = find_product(a.get("product") or a.get("id") or a.get("sku"))
    data = {}
    for k in ("name", "category", "color", "status", "image", "notes"):
        if a.get(k) is not None:
            data[k] = a[k]
    if a.get("new_sku"):
        data["sku"] = a["new_sku"]
    for k in ("price", "unit_cost"):
        if a.get(k) not in (None, ""):
            data[k] = float(a[k])
    if a.get("low_stock_threshold") not in (None, ""):
        data["low_stock_threshold"] = int(a["low_stock_threshold"])
    if "collection" in a or "collection_id" in a:
        coll = _find_collection(a.get("collection") or a.get("collection_id"))
        data["collection_id"] = coll["id"] if coll else None
    if a.get("stock") not in (None, ""):
        new = _parse_stock(a["stock"])
        st = new if a.get("replace_stock") else {**_stock(p), **new}
        data["stock"] = json.dumps(st, ensure_ascii=False)
    if not data:
        return {"ok": False, "error": "Nic do zmiany"}
    data["updated"] = db.now_str()
    db.update("sf_products", p["id"], data)
    return {"ok": True, "product": _product_out(db.one("SELECT * FROM sf_products WHERE id = ?", (p["id"],)))}


def list_products(query: str = "", status: str = "aktywny", collection=None) -> list[dict]:
    where, params = ["1=1"], []
    if status and status != "all":
        where.append("status = ?"); params.append(status)
    if query:
        where.append("(name LIKE ? OR sku LIKE ? OR color LIKE ? OR category LIKE ?)"); params += [f"%{query}%"] * 4
    if collection:
        c = _find_collection(collection)
        where.append("collection_id = ?"); params.append(c["id"] if c else -1)
    rows = db.query(f"SELECT * FROM sf_products WHERE {' AND '.join(where)} ORDER BY status, category, name", params)
    sold = {r["product_id"]: r["q"] for r in db.query(
        "SELECT product_id, SUM(qty) AS q FROM sf_sales WHERE date >= ? GROUP BY product_id",
        ((db.now() - timedelta(days=30)).strftime("%Y-%m-%d"),))}
    out = []
    for p in rows:
        o = _product_out(p)
        o["sold_30d"] = sold.get(p["id"], 0)
        out.append(o)
    return out


def _resolve_size(p: dict, size) -> str:
    st = _stock(p)
    s = _norm_size(size)
    if not s:
        if len(st) == 1:
            return next(iter(st))
        raise ValueError(f"Podaj rozmiar. Dostępne: {', '.join(_size_sort(st)) or 'brak'}")
    return s


def record_sale(a: dict) -> dict:
    p = find_product(a.get("product"))
    size = _resolve_size(p, a.get("size"))
    qty = int(a.get("qty") or 1)
    if qty <= 0:
        raise ValueError("Ilość musi być większa od zera")
    st = _stock(p)
    have = st.get(size, 0)
    if have < qty and not a.get("force"):
        return {"ok": False, "error": f"Na stanie {p['name']} {size}: {have} szt. (chcesz sprzedać {qty}). "
                                      "Najpierw uzupełnij magazyn (restock) albo potwierdź sprzedaż z force=true.",
                "stock": st}
    price = float(a["price"]) if a.get("price") not in (None, "") else float(p["price"] or 0)
    total = round(price * qty, 2)
    channel = a.get("channel") if a.get("channel") in CHANNELS else "inny"
    day = a.get("date") or _today()
    st[size] = max(0, have - qty)
    db.update("sf_products", p["id"], {"stock": json.dumps(st, ensure_ascii=False), "updated": db.now_str()})
    tid = None
    if total > 0:
        tid = db.insert("transactions", {
            "date": day, "type": "przychod", "amount": total, "currency": "PLN", "category": "sprzedaż ubrań",
            "area": AREA, "description": f"{p['name']} ({size}) ×{qty} – {channel}" + (f" · {a['notes']}" if a.get("notes") else ""),
            "created": db.now_str(),
        })
    sid = db.insert("sf_sales", {
        "product_id": p["id"], "sku": p["sku"] or "", "name": p["name"], "size": size, "qty": qty, "price": price,
        "total": total, "unit_cost": float(p["unit_cost"] or 0), "channel": channel, "date": day,
        "transaction_id": tid, "notes": a.get("notes", ""), "created": db.now_str(),
    })
    thr = p["low_stock_threshold"] if p["low_stock_threshold"] is not None else 2
    res = {"ok": True, "sale_id": sid, "transaction_id": tid, "produkt": p["name"], "rozmiar": size, "ilosc": qty,
           "kwota": total, "kanal": channel, "zostalo": st[size], "stan": st}
    if st[size] <= thr:
        res["uwaga"] = f"Niski stan: {p['name']} {size} – zostało {st[size]} szt."
    return res


def delete_sale(sale_id: int) -> dict:
    """Cofa sprzedaż: przywraca stan i usuwa transakcję przychodu."""
    s = db.one("SELECT * FROM sf_sales WHERE id = ?", (sale_id,))
    if not s:
        raise ValueError("Nie ma takiej sprzedaży")
    p = db.one("SELECT * FROM sf_products WHERE id = ?", (s["product_id"],))
    if p:
        st = _stock(p)
        st[s["size"]] = st.get(s["size"], 0) + s["qty"]
        db.update("sf_products", p["id"], {"stock": json.dumps(st, ensure_ascii=False), "updated": db.now_str()})
    if s["transaction_id"]:
        db.execute("DELETE FROM transactions WHERE id = ?", (s["transaction_id"],))
    db.execute("DELETE FROM sf_sales WHERE id = ?", (sale_id,))
    return {"ok": True}


def restock(a: dict) -> dict:
    p = find_product(a.get("product"))
    qty = int(a.get("qty") or 0)
    if qty <= 0:
        raise ValueError("Podaj liczbę sztuk")
    size = _norm_size(a.get("size"))
    if not size:
        st0 = _stock(p)
        if len(st0) == 1:
            size = next(iter(st0))
        else:
            raise ValueError(f"Podaj rozmiar. Dostępne: {', '.join(_size_sort(st0))}")
    unit_cost = float(a["unit_cost"]) if a.get("unit_cost") not in (None, "") else float(p["unit_cost"] or 0)
    total = round(unit_cost * qty, 2)
    day = a.get("date") or _today()
    st = _stock(p)
    st[size] = st.get(size, 0) + qty
    upd = {"stock": json.dumps(st, ensure_ascii=False), "updated": db.now_str()}
    if a.get("unit_cost") not in (None, ""):
        upd["unit_cost"] = unit_cost
    db.update("sf_products", p["id"], upd)
    tid = None
    if total > 0 and a.get("record_cost", True):
        tid = db.insert("transactions", {
            "date": day, "type": "koszt", "amount": total, "currency": "PLN", "category": "materiały/produkcja",
            "area": AREA, "description": f"Produkcja/dostawa: {p['name']} ({size}) ×{qty} po {unit_cost:g} zł"
                                         + (f" · {a['notes']}" if a.get("notes") else ""),
            "created": db.now_str(),
        })
    rid = db.insert("sf_restocks", {"product_id": p["id"], "size": size, "qty": qty, "unit_cost": unit_cost, "total": total,
                                    "date": day, "transaction_id": tid, "notes": a.get("notes", ""), "created": db.now_str()})
    return {"ok": True, "restock_id": rid, "transaction_id": tid, "produkt": p["name"], "rozmiar": size, "dodano": qty,
            "koszt": total, "stan": st}


def inventory_status() -> dict:
    prods = list_products(status="aktywny")
    since = (db.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    low = []
    for p in prods:
        for s in p["low_sizes"]:
            low.append({"sku": p["sku"], "produkt": p["name"], "rozmiar": s, "stan": p["stock"].get(s, 0),
                        "sprzedano_30d": p["sold_30d"]})
    top = db.query("SELECT name, sku, SUM(qty) AS sztuk, ROUND(SUM(total),2) AS przychod FROM sf_sales WHERE date >= ? "
                   "GROUP BY product_id ORDER BY sztuk DESC LIMIT 10", (since,))
    by_size = db.query("SELECT size, SUM(qty) AS sztuk FROM sf_sales WHERE date >= ? GROUP BY size ORDER BY sztuk DESC", (since,))
    units = sum(p["units"] for p in prods)
    return {
        "produkty": [{"sku": p["sku"], "nazwa": p["name"], "kategoria": p["category"], "kolor": p["color"], "cena": p["price"],
                      "koszt_szt": p["unit_cost"], "stan": p["stock"], "razem": p["units"], "sprzedano_30d": p["sold_30d"]}
                     for p in prods],
        "sztuk_na_stanie": units,
        "wartosc_magazynu_po_koszcie": round(sum(p["stock_value_cost"] for p in prods), 2),
        "wartosc_magazynu_po_cenie": round(sum(p["units"] * (p["price"] or 0) for p in prods), 2),
        "niski_stan": low,
        "bestsellery_30d": top,
        "rozmiary_30d": by_size,
        "sugestia": ("Uzupełnij rozmiary z listy niski_stan, zaczynając od tych, które się sprzedają (sprzedano_30d > 0)."
                     if low else "Stany wyglądają dobrze."),
    }


def overview() -> dict:
    now = db.now()
    month = now.strftime("%Y-%m")
    first = now.replace(day=1)
    prev = (first - timedelta(days=1)).strftime("%Y-%m")
    since30 = (now - timedelta(days=29)).strftime("%Y-%m-%d")

    def month_tot(m):
        r = db.one("SELECT COALESCE(SUM(total),0) AS rev, COALESCE(SUM(qty),0) AS units, COUNT(*) AS n, "
                   "COALESCE(SUM(total - unit_cost*qty),0) AS gm FROM sf_sales WHERE substr(date,1,7) = ?", (m,))
        return {k: round(v or 0, 2) for k, v in r.items()}

    cur, prv = month_tot(month), month_tot(prev)
    prods = list_products(status="aktywny")
    low = [{"id": p["id"], "sku": p["sku"], "name": p["name"], "size": s, "stock": p["stock"].get(s, 0)}
           for p in prods for s in p["low_sizes"]]
    best = db.query("SELECT product_id, name, SUM(qty) AS units, ROUND(SUM(total),2) AS revenue FROM sf_sales "
                    "WHERE date >= ? GROUP BY product_id ORDER BY units DESC, revenue DESC LIMIT 8", (since30,))
    chan_m = db.query("SELECT channel, SUM(qty) AS units, ROUND(SUM(total),2) AS revenue FROM sf_sales "
                      "WHERE substr(date,1,7) = ? GROUP BY channel ORDER BY revenue DESC", (month,))
    chan_30 = db.query("SELECT channel, SUM(qty) AS units, ROUND(SUM(total),2) AS revenue FROM sf_sales "
                       "WHERE date >= ? GROUP BY channel ORDER BY revenue DESC", (since30,))
    daily = {r["date"]: r for r in db.query("SELECT date, ROUND(SUM(total),2) AS revenue, SUM(qty) AS units FROM sf_sales "
                                             "WHERE date >= ? GROUP BY date", (since30,))}
    days = [(now - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(29, -1, -1)]
    # 6 miesięcy
    months, m = [], first
    for _ in range(6):
        months.append(m.strftime("%Y-%m"))
        m = (m - timedelta(days=1)).replace(day=1)
    months.reverse()
    mrows = {r["m"]: r for r in db.query("SELECT substr(date,1,7) AS m, ROUND(SUM(total),2) AS revenue, SUM(qty) AS units "
                                          "FROM sf_sales WHERE substr(date,1,7) >= ? GROUP BY m", (months[0],))}
    chan_months = db.query("SELECT substr(date,1,7) AS m, channel, ROUND(SUM(total),2) AS revenue FROM sf_sales "
                           "WHERE substr(date,1,7) >= ? GROUP BY m, channel", (months[0],))
    recent = db.query("SELECT * FROM sf_sales ORDER BY date DESC, id DESC LIMIT 15")

    def delta(k):
        return round((cur[k] - prv[k]) / prv[k] * 100, 1) if prv.get(k) else None

    charts = []
    if any(daily.values()):
        charts.append({"type": "line", "title": "Sprzedaż – ostatnie 30 dni", "labels": [d[8:] + "." + d[5:7] for d in days],
                       "series": [{"name": "Przychód", "data": [daily.get(d, {}).get("revenue") or 0 for d in days]}]})
    if chan_30:
        charts.append({"type": "hbar", "title": "Kanały sprzedaży (30 dni)", "labels": [c["channel"] for c in chan_30],
                       "series": [{"name": "Przychód", "data": [c["revenue"] for c in chan_30]}]})
    if best:
        charts.append({"type": "hbar", "title": "Bestsellery (30 dni, sztuki)", "labels": [b["name"] for b in best],
                       "series": [{"name": "Sztuki", "data": [b["units"] for b in best]}], "unit": "szt."})
    if mrows:
        top_ch = [c["channel"] for c in chan_30][:3] or CHANNELS[:3]
        series = [{"name": ch, "data": [next((r["revenue"] for r in chan_months if r["m"] == mm and r["channel"] == ch), 0)
                                        for mm in months]} for ch in top_ch]
        charts.append({"type": "bar", "title": "Przychód wg kanału (6 mies.)", "labels": [mm[2:] for mm in months],
                       "series": series})
    nxt = db.one("SELECT * FROM sf_collections WHERE drop_date >= ? AND status != 'zakończona' ORDER BY drop_date LIMIT 1",
                 (_today(),))
    return {
        "month": month,
        "kpi": {
            "sales_month": cur["rev"], "units_month": cur["units"], "orders_month": cur["n"], "gross_margin_month": cur["gm"],
            "sales_prev_month": prv["rev"], "sales_delta_pct": delta("rev"), "units_delta_pct": delta("units"),
            "stock_units": sum(p["units"] for p in prods),
            "stock_value_cost": round(sum(p["stock_value_cost"] for p in prods), 2),
            "stock_value_retail": round(sum(p["units"] * (p["price"] or 0) for p in prods), 2),
            "low_stock_count": len(low), "products_active": len(prods),
        },
        "low_stock": low, "best_sellers": best, "by_channel_month": chan_m, "by_channel_30d": chan_30,
        "monthly": [{"month": mm, **(mrows.get(mm) or {"revenue": 0, "units": 0})} for mm in months],
        "recent_sales": recent, "next_drop": nxt, "charts": charts, "alerts": alerts(),
    }


# ================================================================ kolekcje / dropy
def _drop_checklist(drop: date) -> list[dict]:
    steps = [
        (-56, "Research i moodboard: trendy (trend_research), referencje, DNA marki (brand_profile)"),
        (-49, "Koncepcja kolekcji + lista modeli, kolorystyki i nadruków; makiety design_mockup"),
        (-42, "Tech packi: kroje, gramatury, techniki nadruku, tabela rozmiarów; zapytania ofertowe do szwalni/drukarni"),
        (-35, "Próbki (sample) – przymiarki, poprawki, zatwierdzenie kolorów (pantone/hex)"),
        (-28, "Zamówienie produkcji (ilości per rozmiar wg sprzedaży) + wpłata zaliczki – zapisz koszt"),
        (-21, "Sesja lookbook / kampania wideo (shot-lista, lokacja, modele) – plan dnia zdjęciowego"),
        (-14, "Start teaserów: detale, behind the scenes, zapisy na listę / powiadomienia o dropie"),
        (-7, "Countdown: rolki, stories z odliczaniem, ambasadorzy dostają produkty, opisy i zdjęcia w sklepie"),
        (-2, "Odbiór produkcji, kontrola jakości, wprowadzenie stanów do magazynu (restock), pakowanie"),
        (-1, "Test sklepu (płatności, wysyłki, kody), przypięte posty, gotowe odpowiedzi na DM"),
        (0, "DROP 18:00 – posty na wszystkich kanałach, live/stories, obsługa zamówień"),
        (3, "Po dropie: UGC i repost klientów, przypomnienie o ostatnich sztukach"),
        (7, "Podsumowanie: sprzedaż per model/rozmiar, marża, wnioski do następnego dropu (finance_report)"),
    ]
    return [{"date": (drop + timedelta(days=d)).isoformat(), "T": f"T{d:+d}" if d else "T0", "krok": t, "done": False}
            for d, t in steps]


def plan_drop(a: dict) -> dict:
    name = (a.get("name") or "").strip()
    if not name:
        raise ValueError("Podaj nazwę kolekcji / dropu")
    try:
        drop = date.fromisoformat((a.get("drop_date") or "")[:10])
    except ValueError:
        drop = (db.now() + timedelta(days=56)).date()
    checklist = _drop_checklist(drop)
    cid = db.insert("sf_collections", {
        "name": name, "season": a.get("season", ""), "concept": a.get("concept", ""), "drop_date": drop.isoformat(),
        "status": a.get("status") if a.get("status") in COLLECTION_STATUS else "pomysł",
        "budget": float(a["budget"]) if a.get("budget") not in (None, "") else None,
        "checklist": json.dumps(checklist, ensure_ascii=False), "notes": a.get("notes", ""), "created": db.now_str(),
    })
    eid = db.insert("events", {
        "title": f"Drop: {name}", "start": f"{drop.isoformat()}T18:00", "kind": "inne",
        "notes": f"Premiera kolekcji Stratfanat „{name}”. {a.get('concept', '')}".strip(), "created": db.now_str(),
    })
    db.update("sf_collections", cid, {"event_id": eid})
    tasks = []
    if a.get("create_tasks"):
        today = _today()
        for step in checklist:
            if step["date"] >= today:
                tasks.append(db.insert("tasks", {
                    "title": f"[{name}] {step['krok'][:90]}", "notes": step["krok"], "project": f"Stratfanat: {name}",
                    "priority": "high" if step["T"] in ("T0", "T-1", "T-2") else "normal", "status": "todo",
                    "due": f"{step['date']}T10:00", "created": db.now_str(),
                }))
    days_left = (drop - db.now().date()).days
    res = {"ok": True, "collection_id": cid, "event_id": eid, "drop_date": drop.isoformat(), "dni_do_dropu": days_left,
           "checklista": checklist, "zadania_utworzone": len(tasks)}
    if days_left < 42:
        res["uwaga"] = (f"Do dropu zostało tylko {days_left} dni – standardowy harmonogram to ok. 8 tygodni. "
                        "Skróć kolekcję (1–3 modele), użyj gotowych blanków i DTG/DTF albo przesuń datę.")
    return res


def _collection_out(c: dict) -> dict:
    out = dict(c)
    try:
        out["checklist"] = json.loads(c.get("checklist") or "[]")
    except ValueError:
        out["checklist"] = []
    out["products"] = db.one("SELECT COUNT(*) AS n FROM sf_products WHERE collection_id = ?", (c["id"],))["n"]
    out["designs"] = db.one("SELECT COUNT(*) AS n FROM sf_designs WHERE collection_id = ?", (c["id"],))["n"]
    sales = db.one("SELECT COALESCE(SUM(s.total),0) AS rev, COALESCE(SUM(s.qty),0) AS units FROM sf_sales s "
                   "JOIN sf_products p ON p.id = s.product_id WHERE p.collection_id = ?", (c["id"],))
    out["revenue"], out["units_sold"] = round(sales["rev"], 2), sales["units"]
    if c.get("drop_date"):
        try:
            out["days_left"] = (date.fromisoformat(c["drop_date"][:10]) - db.now().date()).days
        except ValueError:
            out["days_left"] = None
    return out


def list_collections() -> list[dict]:
    return [_collection_out(c) for c in db.query(
        "SELECT * FROM sf_collections ORDER BY status = 'zakończona', drop_date IS NULL, drop_date, id DESC")]


def update_collection(a: dict) -> dict:
    c = _find_collection(a.get("collection") or a.get("id"))
    if not c:
        raise ValueError("Nie ma takiej kolekcji")
    data = {k: a[k] for k in ("name", "season", "concept", "notes") if a.get(k) is not None}
    if a.get("status") in COLLECTION_STATUS:
        data["status"] = a["status"]
    if a.get("budget") not in (None, ""):
        data["budget"] = float(a["budget"])
    if a.get("drop_date"):
        data["drop_date"] = a["drop_date"][:10]
        if c.get("event_id"):
            db.update("events", c["event_id"], {"start": f"{data['drop_date']}T18:00", "reminded": 0})
    if a.get("checklist") is not None:
        data["checklist"] = json.dumps(a["checklist"], ensure_ascii=False) if not isinstance(a["checklist"], str) else a["checklist"]
    if a.get("done_step") is not None:
        cl = json.loads(c.get("checklist") or "[]")
        i = int(a["done_step"])
        if 0 <= i < len(cl):
            cl[i]["done"] = not cl[i].get("done")
        data["checklist"] = json.dumps(cl, ensure_ascii=False)
    if data:
        db.update("sf_collections", c["id"], data)
    return {"ok": True, "collection": _collection_out(db.one("SELECT * FROM sf_collections WHERE id = ?", (c["id"],)))}


# ================================================================ MAKIETY SVG (flat sketch)
PRODUCT_TYPES = {"tshirt": "Koszulka T-shirt", "hoodie": "Bluza z kapturem (hoodie)", "crewneck": "Bluza crewneck",
                 "cap": "Czapka z daszkiem", "tote": "Torba tote", "jacket": "Kurtka bomber"}
PLACEMENTS = {"front_center": "Przód – centrum", "chest_left": "Lewa pierś (logo)", "back_large": "Plecy – duży nadruk",
              "sleeve": "Rękaw"}
STYLES = {"minimal": "Minimal", "bold": "Bold", "grunge": "Grunge", "vintage": "Vintage", "graffiti": "Graffiti"}
PRINT_SIZE_CM = {"front_center": "ok. 28 × 30 cm", "chest_left": "ok. 9 × 9 cm", "back_large": "ok. 35 × 40 cm",
                 "sleeve": "ok. 6 × 30 cm"}


def _hex(c: str, default: str = "#111111") -> str:
    c = (c or "").strip()
    named = {"czarny": "#111111", "black": "#111111", "biały": "#f4f4f2", "bialy": "#f4f4f2", "white": "#f4f4f2",
             "szary": "#8a8a8a", "grey": "#8a8a8a", "gray": "#8a8a8a", "czerwony": "#b3261e", "red": "#b3261e",
             "granatowy": "#1c2541", "navy": "#1c2541", "beżowy": "#d8c8a8", "bezowy": "#d8c8a8", "beige": "#d8c8a8",
             "zielony": "#2f4f3a", "green": "#2f4f3a", "oliwkowy": "#59603a", "olive": "#59603a", "brązowy": "#5b4030",
             "brown": "#5b4030", "niebieski": "#2a5ca8", "blue": "#2a5ca8", "żółty": "#e8c547", "yellow": "#e8c547",
             "pomarańczowy": "#e0702a", "orange": "#e0702a", "fioletowy": "#5b3f8c", "purple": "#5b3f8c",
             "różowy": "#e8a0b4", "pink": "#e8a0b4", "kremowy": "#efe6d2", "cream": "#efe6d2", "ecru": "#efe6d2"}
    if c.lower() in named:
        return named[c.lower()]
    if not c.startswith("#"):
        c = "#" + c
    if re.fullmatch(r"#[0-9a-fA-F]{3}", c):
        c = "#" + "".join(ch * 2 for ch in c[1:])
    return c.lower() if re.fullmatch(r"#[0-9a-fA-F]{6}", c) else default


def _rgb(h: str) -> tuple[int, int, int]:
    return int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)


def _shade(h: str, f: float) -> str:
    """f < 1 przyciemnia, f > 1 rozjaśnia (w stronę bieli)."""
    r, g, b = _rgb(h)
    if f <= 1:
        r, g, b = (int(x * f) for x in (r, g, b))
    else:
        t = min(1.0, f - 1)
        r, g, b = (int(x + (255 - x) * t) for x in (r, g, b))
    return f"#{r:02x}{g:02x}{b:02x}"


def _one_line(text: str) -> str:
    return " / ".join(l.strip() for l in re.split(r"\n|\|", text or "") if l.strip())


def _lum(h: str) -> float:
    r, g, b = (x / 255 for x in _rgb(h))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def _garment(kind: str, view: str) -> dict:
    """Ścieżki sylwetki w układzie 400×480 (x: 0–400, y: -20–460). Zwraca warstwy i obszary nadruku."""
    g: dict = {"under": [], "body": "", "trims": [], "lines": [], "stitches": [], "over": [], "areas": {}, "measure": None,
               "ribs": []}
    if kind == "tshirt":
        g["body"] = ("M158,46 C172,92 228,92 242,46 L300,62 Q332,72 352,100 L386,160 L330,188 L302,152 "
                     "Q300,290 304,410 Q200,420 96,410 Q100,290 98,152 L70,188 L14,160 L48,100 Q68,72 100,62 Z") if view == "front" else \
                    ("M158,46 C178,60 222,60 242,46 L300,62 Q332,72 352,100 L386,160 L330,188 L302,152 "
                     "Q300,290 304,410 Q200,420 96,410 Q100,290 98,152 L70,188 L14,160 L48,100 Q68,72 100,62 Z")
        if view == "front":
            g["under"].append(("M158,46 C172,92 228,92 242,46 C224,38 176,38 158,46 Z", "inside"))
            g["ribs"].append(("M161,49 C175,86 225,86 239,49", 8))
        else:
            g["ribs"].append(("M160,49 C180,62 220,62 240,49", 7))
        g["lines"] += ["M300,62 Q296,110 302,152", "M100,62 Q104,110 98,152"]
        g["stitches"] += ["M379,148 L324,175", "M21,148 L76,175", "M98,398 Q200,408 302,398"]
        g["lines"] += ["M302,152 Q284,170 280,196", "M98,152 Q116,170 120,196"]
        g["areas"] = {"front_center": (200, 210, 150, 160, 0), "chest_left": (255, 138, 48, 48, 0),
                      "back_large": (200, 215, 190, 220, 0), "sleeve": (346, 142, 44, 24, -26)}
        g["measure"] = {"A": (98, 302, 436), "B": (400, 52, 412)}
    elif kind in ("hoodie", "crewneck", "jacket"):
        neck_front = {"hoodie": "C176,92 224,92 244,58", "crewneck": "C176,96 224,96 244,58", "jacket": "C176,90 224,90 244,58"}[kind]
        neck_back = "C178,70 222,70 244,58"
        neck = neck_front if view == "front" else neck_back
        g["body"] = (f"M156,58 {neck} L298,72 Q332,82 344,118 L374,378 L322,384 L304,196 "
                     "L300,404 L300,446 L100,446 L100,404 L96,196 L78,384 L26,378 L56,118 Q68,82 102,72 Z")
        # mankiety i ściągacz
        g["trims"] += ["M322,384 L374,378 L377,420 L326,424 Z", "M78,384 L26,378 L23,420 L74,424 Z",
                       "M100,404 L300,404 L300,446 L100,446 Z"]
        g["ribs_v"] = [(326, 377, 382, 422), (23, 74, 382, 422), (100, 300, 405, 445)]
        g["lines"] += ["M298,72 Q306,140 304,196", "M102,72 Q94,140 96,196"]
        g["lines"] += ["M304,196 Q290,230 292,260", "M96,196 Q110,230 108,260", "M338,200 Q345,260 350,330",
                       "M62,200 Q55,260 50,330"]
        g["areas"] = {"front_center": (200, 225, 150, 130, 0), "chest_left": (252, 150, 46, 46, 0),
                      "back_large": (200, 250, 190, 200, 0), "sleeve": (338, 262, 150, 22, 85)}
        g["measure"] = {"A": (96, 304, 466), "B": (398, 60, 446)}
        if kind == "hoodie":
            g["areas"]["front_center"] = (200, 205, 150, 110, 0)
            if view == "front":
                g["under"].append(("M138,84 C116,20 160,-14 200,-14 C240,-14 284,20 262,84 Z", "base"))
                g["under"].append(("M160,74 C148,26 174,2 200,2 C226,2 252,26 240,74 Q224,98 200,106 Q176,98 160,74 Z", "inside"))
                g["over"].append(("M140,80 Q170,104 212,112 L206,100 Q176,94 160,74 Z", "base"))
                g["over"].append(("M260,80 Q230,104 188,112 L194,100 Q224,94 240,74 Z", "base"))
                g["lines"] += ["M150,92 Q200,118 250,92"]
                # sznurki
                g["cords"] = [("M188,104 Q184,150 186,196", (186, 196)), ("M212,104 Q218,150 214,192", (214, 192))]
                g["eyelets"] = [(188, 102), (212, 102)]
                # kieszeń kangurka
                g["over"].append(("M146,300 L254,300 L280,358 L280,394 L120,394 L120,358 Z", "base"))
                g["lines"] += ["M146,300 L120,358", "M254,300 L280,358"]
                g["stitches"] += ["M150,306 L250,306", "M124,388 L276,388"]
            else:
                g["over"].append(("M138,84 C116,20 160,-14 200,-14 C240,-14 284,20 262,84 Q268,150 200,176 Q132,150 138,84 Z", "base"))
                g["lines"] += ["M200,-14 L200,176"]
                g["stitches"] += ["M146,86 C128,28 164,-6 200,-6 C236,-6 272,28 254,86"]
                g["areas"]["back_large"] = (200, 290, 180, 150, 0)
        elif kind == "crewneck":
            if view == "front":
                g["under"].append(("M156,58 C176,96 224,96 244,58 C226,50 174,50 156,58 Z", "inside"))
                g["ribs"].append(("M160,62 C178,92 222,92 240,62", 11))
            else:
                g["ribs"].append(("M159,62 C180,74 220,74 241,62", 9))
            g["stitches"] += ["M118,404 L118,404"]
        else:  # jacket bomber
            g["areas"]["front_center"] = (200, 215, 120, 120, 0)
            g["areas"]["chest_left"] = (254, 150, 40, 40, 0)
            if view == "front":
                g["under"].append(("M156,58 C176,90 224,90 244,58 C226,50 174,50 156,58 Z", "inside"))
                g["collar"] = ("M150,56 C174,94 226,94 250,56 C228,38 172,38 150,56 Z "
                               "M166,54 C182,80 218,80 234,54 C218,47 182,47 166,54 Z")
                g["lines"] += ["M200,96 L200,446"]
                g["zip"] = (200, 98, 444)
                g["over"].append(("M118,300 L132,250 L142,253 L128,304 Z", "trim"))
                g["over"].append(("M282,300 L268,250 L258,253 L272,304 Z", "trim"))
                # kieszeń na rękawie (MA-1)
                g["over"].append(("M52,150 L84,146 L88,196 L56,200 Z", "base"))
                g["stitches"] += ["M54,158 L85,154", "M66,149 L69,198"]
                g["areas"]["front_center"] = (150, 215, 70, 70, 0)
            else:
                g["trims"].append("M150,54 C176,46 224,46 250,54 L246,68 C224,78 176,78 154,68 Z")
                g["lines"] += ["M106,122 Q200,140 294,122"]
            g["areas"]["back_large"] = (200, 255, 190, 190, 0)
    elif kind == "cap":
        crown = "M72,304 C70,200 128,150 200,150 C272,150 330,200 328,304 Q200,288 72,304 Z"
        g["body"] = crown
        if view == "front":
            g["over"].append(("M44,306 Q200,280 356,306 Q368,360 200,370 Q32,360 44,306 Z", "trim"))
            g["stitches"] += ["M54,312 Q46,350 200,358 Q354,350 346,312", "M64,312 Q58,340 200,347 Q342,340 336,312"]
            g["lines"] += ["M200,150 L200,296", "M200,150 Q140,190 126,300", "M200,150 Q260,190 274,300"]
            g["eyelets"] = [(150, 192), (250, 192)]
            g["areas"] = {"front_center": (200, 240, 140, 60, 0), "chest_left": (252, 262, 40, 26, 0),
                          "back_large": (200, 215, 130, 36, 0), "sleeve": (108, 262, 44, 20, -10)}
        else:
            g["under"].append(("M44,306 Q200,330 356,306 Q200,292 44,306 Z", "trimdark"))
            g["over"].append(("M158,298 L158,272 Q160,232 200,228 Q240,232 242,272 L242,298 Q200,293 158,298 Z", "inside"))
            g["over"].append(("M146,278 L254,278 L254,296 L146,296 Z", "trim"))
            g["lines"] += ["M200,150 L200,228", "M200,150 Q138,190 124,300", "M200,150 Q262,190 276,300"]
            g["snaps"] = [(162, 287), (178, 287), (194, 287), (210, 287), (226, 287)]
            g["eyelets"] = [(150, 192), (250, 192)]
            g["areas"] = {"front_center": (200, 240, 140, 60, 0), "chest_left": (252, 262, 40, 26, 0),
                          "back_large": (200, 200, 120, 34, 0), "sleeve": (292, 262, 44, 20, 10)}
        g["button"] = (200, 150)
        g["stitches"] += ["M80,292 Q200,280 320,292"]
    elif kind == "tote":
        g["under"].append(("handle", "trim"))
        g["body"] = "M66,168 L334,168 L338,456 L62,456 Z"
        g["trims"] = []
        g["lines"] += ["M66,194 L334,194"]
        g["stitches"] += ["M68,186 L332,186", "M66,448 L338,448"]
        g["handles"] = ["M128,172 C126,60 150,18 200,18 C250,18 274,60 272,172"]
        g["areas"] = {"front_center": (200, 320, 200, 190, 0), "chest_left": (282, 236, 50, 40, 0),
                      "back_large": (200, 320, 210, 200, 0), "sleeve": (100, 420, 60, 18, 0)}
        g["measure"] = {"A": (62, 338, 476), "B": (360, 168, 456)}
    return g


def _fit_size(lines: list[str], w: float, h: float, wf: float) -> float:
    longest = max((len(l) for l in lines), default=1) or 1
    return max(6.0, min(h / (len(lines) * 1.12), w / (longest * wf)))


def _print_svg(text: str, color: str, style: str, area: tuple, uid: str, garment_color: str) -> str:
    cx, cy, w, h, rot = area
    tr = f"translate({cx},{cy}) rotate({rot})"
    if not text.strip():
        c = color
        return (f'<g transform="{tr}" opacity=".85"><rect x="{-w/2}" y="{-h/2}" width="{w}" height="{h}" rx="4" fill="{c}" '
                f'fill-opacity=".12" stroke="{c}" stroke-width="1.5" stroke-dasharray="5 4"/>'
                f'<path d="M{-w/2},{-h/2} L{w/2},{h/2} M{w/2},{-h/2} L{-w/2},{h/2}" stroke="{c}" stroke-opacity=".35" stroke-width="1"/>'
                f'<text x="0" y="4" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="{max(7, min(14, w/7)):.1f}" '
                f'fill="{c}" letter-spacing="1.5">GRAFIKA</text></g>')
    raw_lines = [l.strip() for l in re.split(r"\n|\|", text) if l.strip()][:3]
    up = style in ("bold", "grunge", "graffiti", "vintage")
    lines = [l.upper() if up else l for l in raw_lines]
    ff = {"minimal": "'Helvetica Neue',Helvetica,Arial,sans-serif", "bold": "Impact,'Arial Black','Helvetica Neue',sans-serif",
          "grunge": "'Arial Black',Impact,sans-serif", "vintage": "Georgia,'Times New Roman',serif",
          "graffiti": "'Marker Felt','Comic Sans MS','Arial Black',sans-serif"}.get(style, "Arial,sans-serif")
    xe = _xml
    out = [f'<g transform="{tr}">']
    if style == "minimal":
        size = _fit_size(lines, w * 0.9, h * 0.8, 0.72)
        size = min(size, h * 0.28 if len(lines) == 1 and h > 60 else size)
        total = size * 1.25 * len(lines)
        for i, l in enumerate(lines):
            y = -total / 2 + size * (i + 0.85) * 1.25
            out.append(f'<text x="0" y="{y:.1f}" text-anchor="middle" font-family="{ff}" font-weight="300" font-size="{size:.1f}" '
                       f'letter-spacing="{size*0.18:.1f}" fill="{color}">{xe(l)}</text>')
        if h > 40:
            ly = total / 2 + size * 0.5
            out.append(f'<line x1="{-w*0.18:.1f}" y1="{ly:.1f}" x2="{w*0.18:.1f}" y2="{ly:.1f}" stroke="{color}" stroke-width="1"/>')
    elif style == "bold":
        size = _fit_size(lines, w, h, 0.56)
        total = size * 0.98 * len(lines)
        for i, l in enumerate(lines):
            y = -total / 2 + size * 0.98 * (i + 0.86)
            tl = f' textLength="{w:.0f}" lengthAdjust="spacingAndGlyphs"' if len(l) * size * 0.56 > w * 0.85 else ""
            out.append(f'<text x="0" y="{y:.1f}" text-anchor="middle" font-family="{ff}" font-weight="900" font-size="{size:.1f}"'
                       f'{tl} fill="{color}">{xe(l)}</text>')
    elif style == "grunge":
        size = _fit_size(lines, w, h, 0.66)
        total = size * 1.02 * len(lines)
        out.insert(0, f'<defs><filter id="gr{uid}" x="-10%" y="-10%" width="120%" height="120%">'
                      f'<feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="3" seed="{random.randint(1, 99)}" result="n"/>'
                      '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -4.5 0 0 0 2.95" result="holes"/>'
                      '<feTurbulence type="turbulence" baseFrequency="0.04" numOctaves="2" seed="4" result="w"/>'
                      '<feDisplacementMap in="SourceGraphic" in2="w" scale="3.5" result="d"/>'
                      '<feComposite in="d" in2="holes" operator="in"/></filter></defs>')
        out.append(f'<g filter="url(#gr{uid})">')
        for i, l in enumerate(lines):
            y = -total / 2 + size * 1.02 * (i + 0.86)
            out.append(f'<text x="0" y="{y:.1f}" text-anchor="middle" font-family="{ff}" font-weight="900" font-size="{size:.1f}" '
                       f'fill="{color}" transform="rotate({random.choice([-2, -1, 1, 2])})">{xe(l)}</text>')
        out.append(f'<rect x="{-w/2:.1f}" y="{total/2 + size*0.15:.1f}" width="{w:.1f}" height="{max(2, size*0.12):.1f}" fill="{color}"/>')
        out.append('</g>')
    elif style == "vintage":
        main = lines[0]
        rest = lines[1:] or ["STRATFANAT"]
        size = max(8.0, min(h * 0.32, (w * 1.15) / (len(main) * 0.68 + 1)))
        arc_y = h * 0.12
        out.append(f'<defs><path id="arc{uid}" d="M{-w/2:.1f},{arc_y:.1f} Q0,{-h*0.62:.1f} {w/2:.1f},{arc_y:.1f}"/></defs>')
        out.append(f'<text font-family="{ff}" font-weight="700" font-size="{size:.1f}" fill="{color}" letter-spacing="{size*0.06:.1f}">'
                   f'<textPath href="#arc{uid}" startOffset="50%" text-anchor="middle">{xe(main)}</textPath></text>')
        sub = max(6.0, min(size * 0.42, (w * 0.8) / (max(len(r) for r in rest) * 0.62)))
        y = arc_y + sub * 1.6
        for r in rest:
            out.append(f'<text x="0" y="{y:.1f}" text-anchor="middle" font-family="{ff}" font-size="{sub:.1f}" font-style="italic" '
                       f'letter-spacing="{sub*0.25:.1f}" fill="{color}">{xe(r)}</text>')
            y += sub * 1.3
        sy = arc_y + sub * 0.35
        star = _star(0, sy, sub * 0.45)
        out.append(f'<path d="{star}" fill="{color}"/>')
        out.append(f'<line x1="{-w*0.38:.1f}" y1="{sy:.1f}" x2="{-sub*0.9:.1f}" y2="{sy:.1f}" stroke="{color}" stroke-width="1.2"/>'
                   f'<line x1="{sub*0.9:.1f}" y1="{sy:.1f}" x2="{w*0.38:.1f}" y2="{sy:.1f}" stroke="{color}" stroke-width="1.2"/>')
    else:  # graffiti
        size = _fit_size(lines, w * 0.95, h * 0.85, 0.62)
        total = size * 1.0 * len(lines)
        outline = _shade(color, 0.45) if _lum(color) > 0.5 else _shade(color, 1.7)
        out.insert(0, f'<defs><filter id="sp{uid}" x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation="{max(1.5, size*0.12):.1f}"/></filter></defs>')
        out.append('<g transform="skewX(-10) rotate(-6)">')
        base_y = -total / 2 + size * (len(lines) - 1 + 0.85)
        half = min(w * 0.95, len(lines[-1]) * size * 0.62) / 2 * 0.85
        rnd = random.Random(len(text))
        for _ in range(min(7, 2 + len(text) // 3)):
            x = rnd.uniform(-half, half)
            ln = rnd.uniform(size * 0.25, size * 0.75)
            dw = max(1.6, size * 0.055)
            out.append(f'<path d="M{x-dw:.1f},{base_y-size*0.3:.1f} L{x-dw*0.6:.1f},{base_y+ln:.1f} '
                       f'A{dw:.1f},{dw:.1f} 0 0 0 {x+dw*0.6:.1f},{base_y+ln:.1f} L{x+dw:.1f},{base_y-size*0.3:.1f} Z" fill="{color}"/>')
        for i, l in enumerate(lines):
            y = -total / 2 + size * (i + 0.85)
            tl = f' textLength="{w*0.95:.0f}" lengthAdjust="spacingAndGlyphs"' if len(l) * size * 0.62 > w * 0.9 else ""
            out.append(f'<text x="0" y="{y:.1f}" text-anchor="middle" font-family="{ff}" font-weight="900" font-size="{size:.1f}"{tl} '
                       f'fill="{color}" opacity=".35" filter="url(#sp{uid})">{xe(l)}</text>')
            out.append(f'<text x="0" y="{y:.1f}" text-anchor="middle" font-family="{ff}" font-weight="900" font-size="{size:.1f}"{tl} '
                       f'fill="{color}" stroke="{outline}" stroke-width="{max(1, size*0.06):.1f}" paint-order="stroke" '
                       f'stroke-linejoin="round">{xe(l)}</text>')
        out.append('</g>')
    out.append('</g>')
    return "".join(out)


def _star(cx: float, cy: float, r: float) -> str:
    pts = []
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * 0.45
        pts.append(f"{cx + rr*math.cos(ang):.1f},{cy + rr*math.sin(ang):.1f}")
    return "M" + " L".join(pts) + " Z"


def _view_svg(kind: str, view: str, base: str, trim: str, print_color: str, text: str, placement: str, style: str,
              uid: str) -> str:
    g = _garment(kind, view)
    dark = _lum(base) < 0.35
    outline = "#0d0d0d" if not dark else "#000000"
    seam = _shade(base, 1.45) if dark else _shade(base, 0.62)
    stitch = _shade(base, 1.6) if dark else _shade(base, 0.55)
    inside = _shade(base, 0.62) if not dark else _shade(base, 1.18)
    trim_dark = _shade(trim, 0.75)
    fills = {"base": base, "inside": inside, "trim": trim, "trimdark": trim_dark}
    o = []
    sw = 2.2

    def shape(d, fill, extra=""):
        o.append(f'<path d="{d}" fill="{fill}" stroke="{outline}" stroke-width="{sw}" stroke-linejoin="round"{extra}/>')

    for d, f in g["under"]:
        if d == "handle":
            for hd in g.get("handles", []):
                o.append(f'<path d="{hd}" fill="none" stroke="{outline}" stroke-width="22" stroke-linecap="butt"/>')
                o.append(f'<path d="{hd}" fill="none" stroke="{trim}" stroke-width="17.6" stroke-linecap="butt"/>')
                o.append(f'<path d="{hd}" fill="none" stroke="{_shade(trim, 0.6) if _lum(trim) > .3 else _shade(trim, 1.6)}" '
                         f'stroke-width="1" stroke-dasharray="3 3" transform="translate(0,0)"/>')
            continue
        shape(d, fills[f])
    shape(g["body"], base)
    # cieniowanie objętości
    o.append(f'<path d="{g["body"]}" fill="url(#vol{uid})" stroke="none"/>')
    for d in g["trims"]:
        shape(d, trim)
    if g.get("collar"):
        shape(g["collar"], trim, ' fill-rule="evenodd"')
    for x1, x2, y1, y2 in g.get("ribs_v", []):
        step = 4.5
        n = int((x2 - x1) / step)
        rib_c = _shade(trim, 0.7) if _lum(trim) > 0.3 else _shade(trim, 1.5)
        o.append("".join(f'<line x1="{x1 + i*step:.1f}" y1="{y1+2}" x2="{x1 + i*step + (0.4 if x1 < 100 else 0):.1f}" y2="{y2-2}" '
                         f'stroke="{rib_c}" stroke-width=".7" opacity=".7"/>' for i in range(1, n)))
    for d, width in g["ribs"]:
        o.append(f'<path d="{d}" fill="none" stroke="{outline}" stroke-width="{width + 2.4}" stroke-linecap="butt"/>')
        o.append(f'<path d="{d}" fill="none" stroke="{trim}" stroke-width="{width}" stroke-linecap="butt"/>')
        o.append(f'<path d="{d}" fill="none" stroke="{_shade(trim, 0.7) if _lum(trim) > .3 else _shade(trim, 1.5)}" '
                 f'stroke-width="{width - 2}" stroke-dasharray="0.8 3" opacity=".8"/>')
    for d in g["lines"]:
        o.append(f'<path d="{d}" fill="none" stroke="{seam}" stroke-width="1.3" opacity=".9"/>')
    for d, f in g["over"]:
        shape(d, fills[f])
    if g.get("zip"):
        x, y1, y2 = g["zip"]
        o.append(f'<line x1="{x}" y1="{y1}" x2="{x}" y2="{y2}" stroke="{outline}" stroke-width="3"/>'
                 f'<line x1="{x}" y1="{y1}" x2="{x}" y2="{y2}" stroke="#b9b9b9" stroke-width="1.6" stroke-dasharray="1.2 1.6"/>'
                 f'<rect x="{x-4}" y="{y1+2}" width="8" height="16" rx="2" fill="#c9c9c9" stroke="{outline}" stroke-width="1"/>'
                 f'<rect x="{x-2.2}" y="{y1+17}" width="4.4" height="14" rx="1.6" fill="#a8a8a8" stroke="{outline}" stroke-width=".8"/>')
    for d in g["stitches"]:
        o.append(f'<path d="{d}" fill="none" stroke="{stitch}" stroke-width="1.1" stroke-dasharray="4 3" opacity=".95"/>')
    for d, end in g.get("cords", []):
        o.append(f'<path d="{d}" fill="none" stroke="{outline}" stroke-width="5.4" stroke-linecap="round"/>'
                 f'<path d="{d}" fill="none" stroke="{trim}" stroke-width="3.2" stroke-linecap="round"/>'
                 f'<rect x="{end[0]-2.6}" y="{end[1]-2}" width="5.2" height="12" rx="1.5" fill="#8f8f8f" stroke="{outline}" stroke-width=".8"/>')
    for x, y in g.get("eyelets", []):
        o.append(f'<circle cx="{x}" cy="{y}" r="3.6" fill="{inside}" stroke="{seam}" stroke-width="1.4"/>')
    for x, y in g.get("snaps", []):
        o.append(f'<circle cx="{x}" cy="{y}" r="3.4" fill="{_shade(trim, 1.4)}" stroke="{outline}" stroke-width=".8"/>')
    if g.get("button"):
        x, y = g["button"]
        o.append(f'<ellipse cx="{x}" cy="{y + 1}" rx="12" ry="5.5" fill="{base}" stroke="{outline}" stroke-width="1.6"/>')
    # nadruk
    want_view = "back" if placement == "back_large" else "front"
    if view == want_view and placement in g["areas"]:
        area = g["areas"][placement]
        cx, cy, w, h, rot = area
        o.append(f'<g transform="translate({cx},{cy}) rotate({rot})"><rect x="{-w/2 - 6}" y="{-h/2 - 6}" width="{w + 12}" '
                 f'height="{h + 12}" fill="none" stroke="{seam}" stroke-width=".9" stroke-dasharray="2 4" opacity=".75"/></g>')
        o.append(_print_svg(text, print_color, style, area, uid + view, base))
    elif view == "back" and placement != "back_large" and kind not in ("tote",):
        # mała metka marki na karku / tyle
        if kind in ("tshirt", "crewneck", "jacket"):
            o.append(f'<rect x="188" y="{62 if kind == "tshirt" else 74}" width="24" height="9" rx="1.5" fill="{print_color}" opacity=".85"/>')
    if kind == "tote" and view == "back" and placement != "back_large":
        pass
    return "".join(o)


def _measure_svg(m: dict | None, color: str) -> str:
    if not m:
        return ""
    out = []
    if "A" in m:
        x1, x2, y = m["A"]
        out.append(f'<g stroke="{color}" stroke-width="1" fill="{color}"><line x1="{x1+6}" y1="{y}" x2="{x2-6}" y2="{y}" stroke-dasharray="6 3"/>'
                   f'<path d="M{x1+6},{y} l7,-4 v8 Z M{x2-6},{y} l-7,-4 v8 Z" stroke="none"/></g>'
                   f'<text x="{(x1+x2)/2}" y="{y - 6}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="11" '
                   f'font-weight="700" fill="{color}">A</text>')
    if "B" in m:
        x, y1, y2 = m["B"]
        out.append(f'<g stroke="{color}" stroke-width="1" fill="{color}"><line x1="{x}" y1="{y1}" x2="{x}" y2="{y2}" stroke-dasharray="6 3"/>'
                   f'<line x1="{x-6}" y1="{y1}" x2="{x+6}" y2="{y1}"/><line x1="{x-6}" y1="{y2}" x2="{x+6}" y2="{y2}"/></g>'
                   f'<text x="{x + 8}" y="{(y1+y2)/2}" font-family="Helvetica,Arial,sans-serif" font-size="11" font-weight="700" '
                   f'fill="{color}">B</text>')
    return "".join(out)


def render_mockup_svg(product_type: str, base_color: str, print_text: str = "", print_color: str = "#ffffff",
                      placement: str = "front_center", graphic_style: str = "bold", title: str = "", notes: str = "",
                      trim_color: str = "", design_id: int | None = None) -> str:
    kind = product_type if product_type in PRODUCT_TYPES else "tshirt"
    placement = placement if placement in PLACEMENTS else "front_center"
    style = graphic_style if graphic_style in STYLES else "bold"
    base = _hex(base_color, "#111111")
    pc = _hex(print_color, "#f4f4f2" if _lum(base) < 0.5 else "#111111")
    trim = _hex(trim_color, _shade(base, 0.86) if _lum(base) > 0.12 else _shade(base, 1.18)) if trim_color else \
        (_shade(base, 0.86) if _lum(base) > 0.12 else _shade(base, 1.22))
    uid = uuid.uuid4().hex[:6]
    W, H = 1200, 860
    ink, muted, paper, line = "#151515", "#7a766e", "#f5f3ee", "#d9d4c9"
    title = title or f"{PRODUCT_TYPES[kind]}" + (f" „{_one_line(print_text)[:30]}”" if print_text.strip() else "")
    measure_on = kind not in ("cap",)
    m = _garment(kind, "front").get("measure") if measure_on else None
    view_y = 92 if kind != "hoodie" else 104
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
        f'font-family="Helvetica Neue,Helvetica,Arial,sans-serif">',
        f'<title>STRATFANAT — {_xml(title)}</title>',
        '<defs>'
        f'<linearGradient id="vol{uid}" x1="0" y1="0" x2="1" y2="0">'
        '<stop offset="0" stop-color="#000" stop-opacity=".16"/><stop offset=".18" stop-color="#000" stop-opacity="0"/>'
        '<stop offset=".5" stop-color="#fff" stop-opacity=".06"/><stop offset=".82" stop-color="#000" stop-opacity="0"/>'
        '<stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient>'
        f'<pattern id="grid{uid}" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20,0 L0,0 0,20" fill="none" '
        f'stroke="{line}" stroke-width=".5" opacity=".55"/></pattern>'
        '</defs>',
        f'<rect width="{W}" height="{H}" fill="{paper}"/>',
        f'<rect x="20" y="20" width="{W-40}" height="{H-40}" fill="url(#grid{uid})" stroke="{ink}" stroke-width="1.5"/>',
        f'<text x="40" y="52" font-size="12" letter-spacing="3" fill="{muted}">KARTA TECHNICZNA · FLAT SKETCH</text>',
        f'<text x="{W-40}" y="52" font-size="12" letter-spacing="2" fill="{muted}" text-anchor="end">'
        f'{_xml(STYLES[style].upper())} · {_xml(PLACEMENTS[placement].upper())}</text>',
        f'<line x1="600" y1="70" x2="600" y2="660" stroke="{line}" stroke-width="1" stroke-dasharray="3 5"/>',
    ]
    for i, view in enumerate(("front", "back")):
        ox = 100 + i * 600
        parts.append(f'<text x="{ox + 200}" y="{view_y - 18 if kind != "hoodie" else 70}" text-anchor="middle" font-size="13" '
                     f'font-weight="700" letter-spacing="4" fill="{ink}">{"PRZÓD" if view == "front" else "TYŁ"}</text>')
        parts.append(f'<g transform="translate({ox - 36},{view_y}) scale(1.18)">')
        parts.append(_view_svg(kind, view, base, trim, pc, print_text or "", placement, style, uid))
        if view == "front" and m:
            parts.append(_measure_svg(m, "#9a958b"))
        parts.append('</g>')
    # blok tytułowy
    ty = 680
    parts.append(f'<line x1="20" y1="{ty}" x2="{W-20}" y2="{ty}" stroke="{ink}" stroke-width="1.5"/>')
    parts.append(f'<rect x="20" y="{ty}" width="{W-40}" height="{H-20-ty}" fill="{paper}"/>')
    parts.append(f'<text x="40" y="{ty+44}" font-size="30" font-weight="900" letter-spacing="2" fill="{ink}">STRATFANAT</text>'
                 f'<text x="40" y="{ty+74}" font-size="17" fill="{ink}">— {_xml(title[:60])}</text>')
    if notes:
        parts.append(f'<text x="40" y="{ty+100}" font-size="11.5" fill="{muted}">{_xml(notes[:110])}</text>')
    parts.append(f'<line x1="430" y1="{ty}" x2="430" y2="{H-20}" stroke="{ink}" stroke-width="1"/>')
    info = [("MODEL", PRODUCT_TYPES[kind]), ("UMIESZCZENIE", PLACEMENTS[placement]),
            ("NADRUK", _one_line(print_text) or "— grafika do wstawienia —"), ("POLE NADRUKU", PRINT_SIZE_CM[placement]),
            ("STYL GRAFIKI", STYLES[style]), ("DATA · PROJEKT", f"{_today()} · #{design_id}" if design_id else _today())]
    for i, (k, v) in enumerate(info):
        x = 450 + (i % 2) * 210
        y = ty + 30 + (i // 2) * 46
        parts.append(f'<text x="{x}" y="{y}" font-size="9.5" letter-spacing="1.5" fill="{muted}">{k}</text>'
                     f'<text x="{x}" y="{y+17}" font-size="13" fill="{ink}">{_xml(v[:28])}</text>')
    parts.append(f'<line x1="880" y1="{ty}" x2="880" y2="{H-20}" stroke="{ink}" stroke-width="1"/>')
    parts.append(f'<text x="900" y="{ty+28}" font-size="9.5" letter-spacing="1.5" fill="{muted}">COLORWAY</text>')
    for i, (lbl, col) in enumerate([("Baza", base), ("Nadruk", pc), ("Wykończenia", trim)]):
        y = ty + 42 + i * 40
        parts.append(f'<rect x="900" y="{y}" width="40" height="30" rx="4" fill="{col}" stroke="{ink}" stroke-width="1"/>'
                     f'<text x="952" y="{y+13}" font-size="12" fill="{ink}">{lbl}</text>'
                     f'<text x="952" y="{y+27}" font-size="11" fill="{muted}" font-family="Menlo,Consolas,monospace">{col.upper()}</text>')
    if m:
        parts.append(f'<text x="1060" y="{ty+60}" font-size="10.5" fill="{muted}">A – szer. {"" if kind == "tote" else "klatki"}</text>'
                     f'<text x="1060" y="{ty+76}" font-size="10.5" fill="{muted}">B – {"wysokość" if kind == "tote" else "długość"}</text>'
                     f'<text x="1060" y="{ty+92}" font-size="10.5" fill="{muted}">wymiary: tabela</text>'
                     f'<text x="1060" y="{ty+106}" font-size="10.5" fill="{muted}">rozmiarów</text>')
    parts.append("</svg>")
    return "".join(parts)


def _try_png(svg: str, path: Path) -> str:
    try:
        import cairosvg  # type: ignore  # opcjonalne – nie jest wymagane
    except Exception:  # noqa: BLE001
        return ""
    try:
        cairosvg.svg2png(bytestring=svg.encode("utf-8"), write_to=str(path), output_width=1200)
        return str(path)
    except Exception:  # noqa: BLE001
        return ""


def design_mockup(a: dict) -> dict:
    DESIGN_DIR.mkdir(parents=True, exist_ok=True)
    kind = a.get("product_type") if a.get("product_type") in PRODUCT_TYPES else "tshirt"
    placement = a.get("placement") if a.get("placement") in PLACEMENTS else "front_center"
    style = a.get("graphic_style") if a.get("graphic_style") in STYLES else "bold"
    base = _hex(a.get("base_color") or "#111111")
    pc = _hex(a.get("print_color") or ("#f4f4f2" if _lum(base) < 0.5 else "#111111"))
    trim = _hex(a["trim_color"]) if a.get("trim_color") else ""
    text = (a.get("print_text") or "").strip()
    title = (a.get("title") or "").strip() or (f"{PRODUCT_TYPES[kind]}" + (f" „{_one_line(text)[:30]}”" if text else ""))
    coll = _find_collection(a.get("collection"))
    did = a.get("design_id")
    row = {
        "title": title, "product_type": kind, "concept": a.get("concept") or a.get("notes", ""),
        "colors": json.dumps({"base": base, "print": pc, "trim": trim or None}),
        "print_text": text, "placement": placement, "graphic_style": style,
        "collection_id": coll["id"] if coll else None, "notes": a.get("notes", ""),
    }
    if did and db.one("SELECT id FROM sf_designs WHERE id = ?", (int(did),)):
        did = int(did)
        db.update("sf_designs", did, row)
    else:
        did = db.insert("sf_designs", {**row, "status": "szkic", "created": db.now_str()})
    svg = render_mockup_svg(kind, base, text, pc, placement, style, title, a.get("notes", ""), trim, did)
    path = DESIGN_DIR / f"{did}.svg"
    path.write_text(svg, encoding="utf-8")
    png = _try_png(svg, DESIGN_DIR / f"{did}.png")
    db.update("sf_designs", did, {"mockup_svg": str(path), "mockup_png": png})
    res = {"ok": True, "design_id": did, "title": title, "svg_path": str(path),
           "svg_url": f"/api/stratfanat/designs/{did}/svg", "png_path": png or None,
           "pokaz": f"Makieta gotowa – zobaczysz ją w zakładce Stratfanat → Projekty (link: /api/stratfanat/designs/{did}/svg).",
           "kolory": {"baza": base, "nadruk": pc, "wykonczenia": trim or "auto"}}
    if png:
        try:
            data = base64.b64encode(Path(png).read_bytes()).decode()
            return [{"type": "text", "text": json.dumps(res, ensure_ascii=False)},
                    {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": data}}]
        except OSError:
            pass
    return res


# ================================================================ obrazy AI – lokalny ComfyUI
DEFAULT_NEGATIVE = ("lowres, blurry, deformed, extra limbs, bad anatomy, watermark, signature, jpeg artifacts, "
                    "misspelled text, garbled letters, cropped, out of frame, plastic skin, oversaturated")


def _comfy_url() -> str:
    return _env("COMFYUI_URL", "http://127.0.0.1:8188").rstrip("/")


def _comfy_workflow(prompt: str, negative: str, width: int, height: int, seed: int, steps: int, cfg: float) -> dict:
    ckpt = _env("COMFYUI_CHECKPOINT", "sd_xl_base_1.0.safetensors")
    return {
        "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": ckpt}},
        "5": {"class_type": "EmptyLatentImage", "inputs": {"width": width, "height": height, "batch_size": 1}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["4", 1]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": negative, "clip": ["4", 1]}},
        "3": {"class_type": "KSampler", "inputs": {
            "seed": seed, "steps": steps, "cfg": cfg, "sampler_name": "dpmpp_2m", "scheduler": "karras", "denoise": 1.0,
            "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["5", 0]}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
        "9": {"class_type": "SaveImage", "inputs": {"filename_prefix": "stratfanat", "images": ["8", 0]}},
    }


COMFY_HELP = (
    "Lokalny ComfyUI nie odpowiada pod {url}. Jak go uruchomić (raz):\n"
    "1. Pobierz ComfyUI: wersja portable dla Windows (z NVIDIA) z github.com/comfyanonymous/ComfyUI → Releases "
    "(plik ComfyUI_windows_portable_nvidia.7z), rozpakuj; albo ComfyUI Desktop z comfy.org.\n"
    "2. Pobierz model SDXL (np. sd_xl_base_1.0.safetensors z huggingface.co/stabilityai/stable-diffusion-xl-base-1.0) "
    "i wrzuć do ComfyUI/models/checkpoints.\n"
    "3. Uruchom run_nvidia_gpu.bat – ComfyUI działa pod http://127.0.0.1:8188.\n"
    "4. Inny adres lub model? Dopisz w pliku .env: COMFYUI_URL=... i COMFYUI_CHECKPOINT=nazwa_pliku.safetensors.\n"
    "Wymaga karty graficznej z min. 8 GB VRAM (SDXL). Do tego czasu używaj makiety wektorowej design_mockup."
)


async def generate_design_image(a: dict) -> dict | list:
    DESIGN_DIR.mkdir(parents=True, exist_ok=True)
    prompt = (a.get("prompt") or "").strip()
    if not prompt:
        raise ValueError("Podaj prompt (opis obrazu po angielsku)")
    negative = (a.get("negative") or "").strip() or DEFAULT_NEGATIVE
    width = max(512, min(1536, int(a.get("width") or 1024) // 64 * 64))
    height = max(512, min(1536, int(a.get("height") or 1024) // 64 * 64))
    steps = max(10, min(60, int(a.get("steps") or 30)))
    cfg = float(a.get("cfg") or 6.5)
    seed = int(a["seed"]) if a.get("seed") not in (None, "") else random.randint(1, 2**31 - 1)
    url = _comfy_url()
    did = int(a["design_id"]) if a.get("design_id") not in (None, "") else None
    design = db.one("SELECT * FROM sf_designs WHERE id = ?", (did,)) if did else None
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            await c.get(f"{url}/system_stats")
    except Exception:  # noqa: BLE001 - ComfyUI wyłączony
        res = {"ok": False, "comfyui": "niedostępny", "instrukcja": COMFY_HELP.format(url=url),
               "fallback": "Użyj design_mockup, żeby zobaczyć projekt jako makietę techniczną (SVG)."}
        if design and design.get("mockup_svg"):
            res["makieta"] = f"/api/stratfanat/designs/{design['id']}/svg"
        return res
    wf = _comfy_workflow(prompt, negative, width, height, seed, steps, cfg)
    client_id = uuid.uuid4().hex
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post(f"{url}/prompt", json={"prompt": wf, "client_id": client_id})
        if r.status_code != 200:
            detail = r.text[:600]
            hint = ""
            if "ckpt_name" in detail or "not in list" in detail:
                hint = (" Sprawdź nazwę modelu: ustaw COMFYUI_CHECKPOINT w .env na plik, który masz w "
                        "ComfyUI/models/checkpoints.")
            return {"ok": False, "error": f"ComfyUI odrzucił zadanie ({r.status_code}).{hint}", "szczegoly": detail}
        pid = r.json().get("prompt_id")
        images = []
        deadline = asyncio.get_event_loop().time() + float(_env("COMFYUI_TIMEOUT", "300"))
        while asyncio.get_event_loop().time() < deadline:
            await asyncio.sleep(1.5)
            h = await c.get(f"{url}/history/{pid}")
            data = h.json() if h.status_code == 200 else {}
            entry = data.get(pid) if isinstance(data, dict) else None
            if entry:
                status = entry.get("status", {})
                if status.get("status_str") == "error":
                    return {"ok": False, "error": "ComfyUI zgłosił błąd generowania", "szczegoly": str(status)[:600]}
                for node in (entry.get("outputs") or {}).values():
                    images += node.get("images", [])
                if images or status.get("completed"):
                    break
        if not images:
            return {"ok": False, "error": "Przekroczono czas oczekiwania na obraz z ComfyUI (zwiększ COMFYUI_TIMEOUT)."}
        if not design:
            title = (a.get("title") or prompt[:60]).strip()
            did = db.insert("sf_designs", {"title": title, "product_type": a.get("product_type") or "ai", "concept": "",
                                           "colors": "{}", "print_text": "", "placement": "", "graphic_style": "",
                                           "prompt": prompt, "status": "szkic", "notes": a.get("notes", ""),
                                           "created": db.now_str()})
            design = db.one("SELECT * FROM sf_designs WHERE id = ?", (did,))
        saved = []
        for i, im in enumerate(images[:4]):
            v = await c.get(f"{url}/view", params={"filename": im["filename"], "subfolder": im.get("subfolder", ""),
                                                   "type": im.get("type", "output")})
            if v.status_code != 200:
                continue
            ext = Path(im["filename"]).suffix or ".png"
            p = DESIGN_DIR / f"ai_{did}_{seed}_{i}{ext}"
            p.write_bytes(v.content)
            saved.append(str(p))
    try:
        prev = json.loads(design.get("ai_image") or "[]")
        prev = prev if isinstance(prev, list) else [prev]
    except ValueError:
        prev = [design["ai_image"]] if design.get("ai_image") else []
    db.update("sf_designs", did, {"ai_image": json.dumps(prev + saved), "prompt": prompt})
    res = {"ok": True, "design_id": did, "seed": seed, "obrazy": saved,
           "urls": [f"/api/stratfanat/designs/{did}/image/{len(prev) + i}" for i in range(len(saved))]}
    blocks = [{"type": "text", "text": json.dumps(res, ensure_ascii=False)}]
    for p in saved[:1]:
        raw = Path(p).read_bytes()
        if len(raw) < 3_500_000:
            mt = "image/png" if p.endswith(".png") else "image/jpeg"
            blocks.append({"type": "image", "source": {"type": "base64", "media_type": mt, "data": base64.b64encode(raw).decode()}})
    return blocks if len(blocks) > 1 else res


# ================================================================ trendy i marka
TREND_SOURCES = [
    {"nazwa": "Hypebeast", "url": "https://hypebeast.com/fashion", "po_co": "dropy, collaby, sylwetki, co się wyprzedaje"},
    {"nazwa": "Highsnobiety", "url": "https://www.highsnobiety.com/", "po_co": "kultura streetwear, raporty trendów, marki niszowe"},
    {"nazwa": "Vogue Runway", "url": "https://www.vogue.com/fashion-shows", "po_co": "kierunki z wybiegów (sezon wcześniej niż ulica)"},
    {"nazwa": "Pinterest – źródła użytkownika", "url": "https://nl.pinterest.com/search/pins/?q=streetwear%20ui%20design",
     "po_co": "moodboard użytkownika (pinterest_inspiration / view_inspirations) – jego gust i kierunek wizualny"},
    {"nazwa": "Pinterest Trends", "url": "https://trends.pinterest.com/", "po_co": "rosnące frazy estetyki, palety, moodboardy (PL/EU)"},
    {"nazwa": "TikTok Creative Center", "url": "https://ads.tiktok.com/business/creativecenter/inspiration/popular/hashtag/pc/en",
     "po_co": "rosnące hashtagi, dźwięki, formaty wideo do promocji dropu"},
    {"nazwa": "Google Trends", "url": "https://trends.google.com/trends/explore?geo=PL", "po_co": "popyt w Polsce: porównaj frazy, sezonowość"},
    {"nazwa": "Grailed", "url": "https://www.grailed.com/", "po_co": "ceny resellu, które kroje/marki trzymają wartość"},
    {"nazwa": "Depop", "url": "https://www.depop.com/", "po_co": "co kupuje Gen Z, vintage i Y2K, ceny"},
    {"nazwa": "Vinted", "url": "https://www.vinted.pl/", "po_co": "polski rynek z drugiej ręki: popularne marki, ceny, rozmiary"},
]


def _season_hint() -> str:
    n = db.now()
    y = n.year
    if n.month in (9, 10, 11, 12):
        return f"teraz sprzedajesz FW{str(y)[2:]} (zima), projektujesz SS{str(y+1)[2:]} (wiosna/lato {y+1})"
    if n.month in (1, 2):
        return f"teraz sprzedajesz FW{str(y-1)[2:]}/zimę, projektujesz SS{str(y)[2:]} i myślisz o FW{str(y)[2:]}"
    if n.month in (3, 4, 5, 6):
        return f"teraz sprzedajesz SS{str(y)[2:]}, projektujesz FW{str(y)[2:]} (jesień/zima {y})"
    return f"teraz sprzedajesz lato {y}, kończysz projekty FW{str(y)[2:]}, zbierasz inspiracje na SS{str(y+1)[2:]}"


def brand_text() -> str:
    try:
        return BRAND_PATH.read_text(encoding="utf-8")
    except OSError:
        return ""


def trend_research(topic: str) -> dict:
    t = (topic or "streetwear").strip()
    y = db.now().year
    queries = [
        f"{t} streetwear trends {y}", f"{t} trend {y + (db.now().month >= 9)} SS fashion forecast",
        f"site:hypebeast.com {t}", f"site:highsnobiety.com {t}", f"{t} graphic tee trend {y}",
        f"streetwear colors {y + (db.now().month >= 9)} palette", f"{t} trend Polska moda uliczna {y}",
        f"polskie marki streetwear {y} drop", f"{t} grailed sold prices", f"{t} tiktok trend outfit",
    ]
    existing = [r["title"] for r in db.query("SELECT title FROM sf_trends ORDER BY id DESC LIMIT 30")]
    brand = brand_text()
    return {
        "temat": t, "sezon": _season_hint(),
        "plan": [
            "1. Przeczytaj DNA marki (fragment niżej / brand_profile) – trend musi pasować do misji, grupy docelowej i stylu.",
            "1b. Inspiracje użytkownika: pinterest_inspiration() (odświeża jego źródła, m.in. Pinterest „streetwear ui design”), "
            "potem view_inspirations – opisz, co się powtarza (kroje, grafiki, typografia, układy, kolory) i zestaw z paletą moodboardu.",
            "2. Wyszukaj web_search każde zapytanie z listy (min. 5), otwórz 3–5 najlepszych źródeł web_fetch.",
            "3. Oddziel sygnał od szumu: trend potwierdzony w min. 2 niezależnych źródłach (wybieg/media + ulica/resell/social).",
            "4. Dla każdego trendu oceń: dopasowanie do DNA (0–4), popyt w PL – Google Trends/Vinted (0–2), "
            "wykonalność produkcyjna i cena (0–2), czas życia – mikro-trend vs. kierunek na 2+ sezony (0–2). Suma = fit_score 1–10.",
            "5. Odrzuć to, co wymagałoby kopiowania cudzych grafik/logo – zapisz tylko kierunek (krój, technika, paleta, motyw).",
            "6. Zapisz każdy wartościowy trend: save_trend(title, description z przykładem wdrożenia w Stratfanat, source URL, "
            "fit_score, tags).",
            "7. Podsumuj: TOP 3 trendy do następnego dropu + po jednym pomyśle na produkt (możesz od razu zrobić design_mockup).",
        ],
        "zapytania": queries,
        "zrodla": TREND_SOURCES,
        "na_co_patrzec": ["sylwetki i kroje (oversize, boxy, cropped, wide-leg)", "gramatury i materiały (heavyweight 300+ gsm, "
                          "acid/garment wash)", "techniki zdobienia (puff, haft 3D, DTF, rhinestones, distressing)",
                          "palety kolorów sezonu", "motywy graficzne i typografia", "formaty dropów i kampanii",
                          "ceny w segmencie (Grailed/Vinted/sklepy marek PL)"],
        "zapisane_juz_trendy": existing,
        "dna_marki": brand[:2500] if brand else "(brak – uzupełnij brand/stratfanat.md w zakładce Stratfanat → DNA marki)",
    }


def save_trend(a: dict) -> dict:
    title = (a.get("title") or "").strip()
    if not title:
        raise ValueError("Podaj tytuł trendu")
    tags = a.get("tags") or ""
    if isinstance(tags, list):
        tags = ", ".join(tags)
    score = max(1, min(10, int(a.get("fit_score") or 5)))
    dup = db.one("SELECT id FROM sf_trends WHERE lower(title) = lower(?)", (title,))
    data = {"title": title, "description": a.get("description", ""), "source": a.get("source", ""), "fit_score": score,
            "tags": tags}
    if dup:
        db.update("sf_trends", dup["id"], data)
        return {"ok": True, "id": dup["id"], "zaktualizowano": True}
    return {"ok": True, "id": db.insert("sf_trends", {**data, "status": a.get("status") or "nowy", "created": db.now_str()})}


def list_trends(min_score: int = 0, tag: str = "") -> list[dict]:
    where, p = ["fit_score >= ?"], [int(min_score or 0)]
    if tag:
        where.append("tags LIKE ?"); p.append(f"%{tag}%")
    return db.query(f"SELECT * FROM sf_trends WHERE {' AND '.join(where)} ORDER BY fit_score DESC, id DESC LIMIT 100", p)


def _design_out(d: dict) -> dict:
    out = dict(d)
    try:
        out["colors"] = json.loads(d.get("colors") or "{}")
    except ValueError:
        out["colors"] = {}
    try:
        imgs = json.loads(d.get("ai_image") or "[]")
        imgs = imgs if isinstance(imgs, list) else [imgs]
    except ValueError:
        imgs = [d["ai_image"]] if d.get("ai_image") else []
    out["ai_images"] = [f"/api/stratfanat/designs/{d['id']}/image/{i}" for i in range(len(imgs))]
    out["svg_url"] = f"/api/stratfanat/designs/{d['id']}/svg" if d.get("mockup_svg") else None
    return out


def list_designs(limit: int = 60) -> list[dict]:
    return [_design_out(d) for d in db.query("SELECT * FROM sf_designs ORDER BY id DESC LIMIT ?", (limit,))]


# ================================================================ monitoring
def alerts() -> list[dict]:
    out = []
    today = db.now().date()
    try:
        prods = db.query("SELECT * FROM sf_products WHERE status = 'aktywny'")
    except Exception:  # noqa: BLE001 - tabele jeszcze nie istnieją
        return []
    since30 = (today - timedelta(days=30)).isoformat()
    sold = {(r["product_id"], r["size"]): r["q"] for r in db.query(
        "SELECT product_id, size, SUM(qty) AS q FROM sf_sales WHERE date >= ? GROUP BY product_id, size", (since30,))}
    for p in prods:
        st = _stock(p)
        thr = p["low_stock_threshold"] if p["low_stock_threshold"] is not None else 2
        for size in _size_sort(st):
            q = st[size]
            if q <= thr:
                s30 = sold.get((p["id"], size), 0)
                out.append({
                    "key": f"sf_low_stock_{p['id']}_{size}", "severity": "warn" if (q == 0 or s30) else "info",
                    "title": f"Niski stan: {p['name']} {size}" + (" – wyprzedane" if q == 0 else f" – zostało {q} szt."),
                    "body": f"SKU {p['sku'] or '—'} · sprzedano w 30 dni: {s30} szt.",
                    "suggestion": (f"Zamów dodruk rozmiaru {size} (restock), sprzedaje się ~{s30} szt./mies."
                                   if s30 else f"Rozważ dodruk {size} albo zostaw jako limitowaną ilość."),
                })
    for c in db.query("SELECT * FROM sf_collections WHERE drop_date IS NOT NULL AND status IN ('pomysł','projektowanie','produkcja')"):
        try:
            d = date.fromisoformat(c["drop_date"][:10])
        except ValueError:
            continue
        left = (d - today).days
        if 0 <= left <= 7:
            out.append({
                "key": f"sf_drop_{c['id']}", "severity": "warn",
                "title": f"Drop „{c['name']}” za {left} dni, a kolekcja ma status: {c['status']}",
                "body": f"Data premiery: {c['drop_date']}.",
                "suggestion": "Sprawdź checklistę dropu: produkcja odebrana? lookbook gotowy? teasery wystartowały? "
                              "Jeśli nie zdążysz – przesuń datę i ogłoś to wcześniej.",
            })
        elif left < 0 and left >= -3:
            out.append({"key": f"sf_drop_status_{c['id']}", "severity": "info",
                        "title": f"Drop „{c['name']}” już był – zaktualizuj status kolekcji",
                        "body": f"Data premiery: {c['drop_date']}, status: {c['status']}.",
                        "suggestion": "Ustaw status 'premiera' albo 'zakończona' i zrób podsumowanie sprzedaży."})
    in_stock = [p for p in prods if sum(_stock(p).values()) > 0]
    if in_stock:
        last = db.one("SELECT MAX(date) AS d FROM sf_sales")
        last_d = last["d"] if last else None
        oldest = min((p["created"] or "")[:10] for p in in_stock)
        ref = last_d or oldest
        try:
            idle = (today - date.fromisoformat(ref[:10])).days
        except ValueError:
            idle = 0
        if idle >= 14:
            out.append({
                "key": "sf_no_sales", "severity": "warn",
                "title": f"Brak sprzedaży Stratfanat od {idle} dni" if last_d else "Brak zapisanej sprzedaży Stratfanat od 14+ dni",
                "body": f"Na stanie: {sum(sum(_stock(p).values()) for p in in_stock)} szt. w {len(in_stock)} produktach.",
                "suggestion": "Zrób akcję: restock/last-chance post, rolka z produktem w użyciu, kod -10% dla obserwujących, "
                              "wystaw nierotujące rozmiary na Vinted. Jeśli sprzedajesz – zapisuj to (record_sale).",
            })
    return out


# ================================================================ narzędzia agenta
_S = {"type": "string"}
_N = {"type": "number"}
_I = {"type": "integer"}
_STOCK = {"type": "object", "description": "stan per rozmiar, np. {\"S\":3,\"M\":5,\"L\":4}; jednorozmiarowe: {\"ONE\":10}",
          "additionalProperties": {"type": "integer"}}

TOOLS: list[dict] = [
    {"name": "add_product",
     "description": "Dodaje produkt Stratfanat do magazynu (SKU, nazwa, kategoria, kolor, cena, koszt sztuki, stan per rozmiar). "
                    "SKU nadaje się automatycznie, jeśli go nie podasz.",
     "input_schema": {"type": "object", "properties": {
         "name": _S, "sku": _S, "category": {"type": "string", "enum": CATEGORIES}, "color": _S,
         "price": {"type": "number", "description": "cena sprzedaży brutto zł"}, "unit_cost": {"type": "number", "description": "koszt produkcji 1 szt. zł"},
         "stock": _STOCK, "low_stock_threshold": _I, "collection": {"type": "string", "description": "nazwa lub id kolekcji"},
         "notes": _S}, "required": ["name"]}},
    {"name": "update_product",
     "description": "Zmienia produkt Stratfanat (cena, koszt, nazwa, status aktywny/archiwum, kolekcja, próg niskiego stanu) "
                    "albo ustawia stany rozmiarów (stock scala się z obecnym; replace_stock=true zastępuje całość). "
                    "Do zwykłej sprzedaży i dostaw używaj record_sale / restock.",
     "input_schema": {"type": "object", "properties": {
         "product": {"type": "string", "description": "SKU, nazwa albo id"}, "name": _S, "new_sku": _S,
         "category": {"type": "string", "enum": CATEGORIES}, "color": _S, "price": _N, "unit_cost": _N, "stock": _STOCK,
         "replace_stock": {"type": "boolean"}, "low_stock_threshold": _I,
         "status": {"type": "string", "enum": ["aktywny", "archiwum"]}, "collection": _S, "notes": _S},
         "required": ["product"]}},
    {"name": "list_products",
     "description": "Lista produktów Stratfanat ze stanami per rozmiar i sprzedażą z 30 dni.",
     "input_schema": {"type": "object", "properties": {"query": _S, "status": {"type": "string", "enum": ["aktywny", "archiwum", "all"]},
                                                       "collection": _S}}},
    {"name": "record_sale",
     "description": "Zapisuje sprzedaż ubrań Stratfanat: zdejmuje sztuki z magazynu i AUTOMATYCZNIE dodaje przychód w finansach "
                    "(nie dodawaj go drugi raz add_transaction). Cena domyślnie z karty produktu. Wiele rozmiarów = osobne wywołania.",
     "input_schema": {"type": "object", "properties": {
         "product": {"type": "string", "description": "SKU, nazwa albo id"}, "size": {"type": "string", "description": "S/M/L/XL… lub ONE"},
         "qty": _I, "price": {"type": "number", "description": "cena za sztukę, jeśli inna niż katalogowa"},
         "channel": {"type": "string", "enum": CHANNELS}, "date": {"type": "string", "description": "YYYY-MM-DD"},
         "notes": _S, "force": {"type": "boolean", "description": "zapisz mimo braku na stanie"}},
         "required": ["product", "qty"]}},
    {"name": "restock",
     "description": "Przyjęcie dostawy / dodruku: zwiększa stan rozmiaru i zapisuje koszt produkcji w finansach "
                    "(kategoria materiały/produkcja).",
     "input_schema": {"type": "object", "properties": {
         "product": _S, "size": _S, "qty": _I, "unit_cost": {"type": "number", "description": "koszt 1 szt. zł"},
         "date": _S, "notes": _S, "record_cost": {"type": "boolean", "description": "false = nie zapisuj kosztu (np. już zapisany)"}},
         "required": ["product", "qty"]}},
    {"name": "inventory_status",
     "description": "Stan magazynu Stratfanat: niskie stany, wartość magazynu po koszcie i po cenie, bestsellery i rozmiary z 30 dni.",
     "input_schema": {"type": "object", "properties": {}}},
    {"name": "plan_drop",
     "description": "Planuje nową kolekcję / drop Stratfanat: zakłada kolekcję, wpisuje premierę do kalendarza (18:00) i zwraca "
                    "checklistę z datami (T-56 … T+7). create_tasks=true tworzy też zadania z terminami.",
     "input_schema": {"type": "object", "properties": {
         "name": _S, "season": {"type": "string", "description": "np. SS27, FW26, capsule"}, "concept": _S,
         "drop_date": {"type": "string", "description": "YYYY-MM-DD"}, "budget": _N,
         "status": {"type": "string", "enum": COLLECTION_STATUS}, "create_tasks": {"type": "boolean"}, "notes": _S},
         "required": ["name", "drop_date"]}},
    {"name": "list_collections",
     "description": "Kolekcje/dropy Stratfanat: status, data premiery, dni do dropu, checklista, liczba produktów, sprzedaż.",
     "input_schema": {"type": "object", "properties": {}}},
    {"name": "update_collection",
     "description": "Zmienia kolekcję: status (pomysł/projektowanie/produkcja/premiera/zakończona), datę dropu (przesuwa też "
                    "wydarzenie w kalendarzu), budżet, koncepcję; done_step = indeks kroku checklisty do odhaczenia.",
     "input_schema": {"type": "object", "properties": {
         "collection": {"type": "string", "description": "nazwa lub id"}, "name": _S, "season": _S, "concept": _S,
         "status": {"type": "string", "enum": COLLECTION_STATUS}, "drop_date": _S, "budget": _N, "done_step": _I, "notes": _S},
         "required": ["collection"]}},
    {"name": "design_mockup",
     "description": "Rysuje techniczną makietę (flat sketch) projektu Stratfanat jako SVG: przód i tył ubrania, nadruk w wybranym "
                    "miejscu i stylu, colorway i blok tytułowy. Zapisuje projekt (sf_designs) i zwraca link do podglądu. "
                    "print_text może mieć do 3 linii (oddziel | ). Podaj design_id, aby nadpisać istniejący projekt.",
     "input_schema": {"type": "object", "properties": {
         "product_type": {"type": "string", "enum": list(PRODUCT_TYPES)},
         "base_color": {"type": "string", "description": "hex np. #111111 albo nazwa koloru"},
         "print_text": _S, "print_color": {"type": "string", "description": "hex"},
         "trim_color": {"type": "string", "description": "hex ściągaczy/wykończeń (opcjonalnie)"},
         "placement": {"type": "string", "enum": list(PLACEMENTS)},
         "graphic_style": {"type": "string", "enum": list(STYLES)},
         "title": _S, "notes": _S, "concept": _S, "collection": _S, "design_id": _I},
         "required": ["product_type", "base_color"]}},
    {"name": "generate_design_image",
     "description": "Generuje obraz AI (np. wizualizacja produktu, packshot, grafika do nadruku, moodboard) w lokalnym ComfyUI "
                    "(SDXL). Prompt po angielsku, konkretny: produkt, materiał, kolor, nadruk, ujęcie, światło, tło. "
                    "Jeśli ComfyUI nie działa – zwraca instrukcję instalacji (wtedy pokaż makietę design_mockup).",
     "input_schema": {"type": "object", "properties": {
         "prompt": _S, "negative": _S, "width": _I, "height": _I, "design_id": {"type": "integer", "description": "dołącz do projektu"},
         "title": _S, "seed": _I, "steps": _I}, "required": ["prompt"]}},
    {"name": "list_designs",
     "description": "Lista projektów Stratfanat (makiety SVG i obrazy AI) z linkami.",
     "input_schema": {"type": "object", "properties": {"limit": _I}}},
    {"name": "trend_research",
     "description": "Plan researchu trendów streetwear dla Stratfanat: zapytania do web_search, źródła (Hypebeast, Highsnobiety, "
                    "Vogue Runway, Pinterest (moodboard użytkownika), Pinterest Trends, TikTok Creative Center, Google Trends, Grailed, Depop, Vinted), "
                    "skala oceny dopasowania do DNA marki. Po researchu zapisz wyniki save_trend.",
     "input_schema": {"type": "object", "properties": {"topic": _S}, "required": ["topic"]}},
    {"name": "save_trend",
     "description": "Zapisuje trend na tablicy trendów Stratfanat (z oceną dopasowania do marki 1-10).",
     "input_schema": {"type": "object", "properties": {
         "title": _S, "description": _S, "source": {"type": "string", "description": "URL lub nazwa źródła"},
         "fit_score": {"type": "integer", "minimum": 1, "maximum": 10}, "tags": {"type": "array", "items": _S}},
         "required": ["title", "fit_score"]}},
    {"name": "list_trends",
     "description": "Tablica trendów Stratfanat posortowana wg dopasowania do marki.",
     "input_schema": {"type": "object", "properties": {"min_score": _I, "tag": _S}}},
    {"name": "brand_profile",
     "description": "Zwraca DNA marki Stratfanat (misja, grupa docelowa, styl, kolory, typografia, ceny, kanały, ton, czego unikamy). "
                    "Czytaj przed projektowaniem, researchem trendów i pisaniem treści marki.",
     "input_schema": {"type": "object", "properties": {}}},
]

NAMES = {t["name"] for t in TOOLS}

LABELS = {
    "add_product": "Dodaję produkt Stratfanat", "update_product": "Aktualizuję produkt", "list_products": "Sprawdzam produkty",
    "record_sale": "Zapisuję sprzedaż", "restock": "Przyjmuję dostawę", "inventory_status": "Sprawdzam magazyn",
    "plan_drop": "Planuję drop", "list_collections": "Przeglądam kolekcje", "update_collection": "Aktualizuję kolekcję",
    "design_mockup": "Rysuję makietę", "generate_design_image": "Generuję obraz w ComfyUI", "list_designs": "Przeglądam projekty",
    "trend_research": "Planuję research trendów", "save_trend": "Zapisuję trend", "list_trends": "Przeglądam trendy",
    "brand_profile": "Czytam DNA marki",
}

CHANGES = {k: "stratfanat" for k in ("add_product", "update_product", "record_sale", "restock", "plan_drop",
                                     "update_collection", "design_mockup", "generate_design_image", "save_trend")}


async def execute(name: str, args: dict):
    a = args or {}
    try:
        match name:
            case "add_product":
                return add_product(a)
            case "update_product":
                return update_product(a)
            case "list_products":
                return list_products(a.get("query", ""), a.get("status") or "aktywny", a.get("collection"))
            case "record_sale":
                return record_sale(a)
            case "restock":
                return restock(a)
            case "inventory_status":
                return inventory_status()
            case "plan_drop":
                return plan_drop(a)
            case "list_collections":
                return list_collections()
            case "update_collection":
                return update_collection(a)
            case "design_mockup":
                return await asyncio.to_thread(design_mockup, a)
            case "generate_design_image":
                return await generate_design_image(a)
            case "list_designs":
                return list_designs(int(a.get("limit") or 30))
            case "trend_research":
                return trend_research(a.get("topic", ""))
            case "save_trend":
                return save_trend(a)
            case "list_trends":
                return list_trends(a.get("min_score", 0), a.get("tag", ""))
            case "brand_profile":
                txt = brand_text()
                return {"dna_marki": txt or "(brak pliku brand/stratfanat.md)", "plik": str(BRAND_PATH)}
    except ValueError as e:
        return {"ok": False, "error": str(e)}
    return {"error": f"Nieznane narzędzie {name}"}


# ================================================================ API dashboardu
router = APIRouter(prefix="/api/stratfanat")


def _bad(e: Exception):
    raise HTTPException(400, str(e))


@router.get("/overview")
def api_overview():
    return overview()


@router.get("/meta")
def api_meta():
    return {"categories": CATEGORIES, "channels": CHANNELS, "collection_status": COLLECTION_STATUS, "sizes": SIZES,
            "product_types": PRODUCT_TYPES, "placements": PLACEMENTS, "styles": STYLES, "design_status": DESIGN_STATUS}


@router.get("/alerts")
def api_alerts():
    return alerts()


@router.get("/products")
def api_products(status: str = "aktywny", q: str = "", collection: str = ""):
    return list_products(q, status, collection or None)


@router.post("/products")
def api_product_add(payload: dict = Body(...)):
    try:
        return add_product(payload)
    except ValueError as e:
        _bad(e)


@router.get("/products/{pid}")
def api_product(pid: int):
    p = db.one("SELECT * FROM sf_products WHERE id = ?", (pid,))
    if not p:
        raise HTTPException(404)
    out = _product_out(p)
    out["sales"] = db.query("SELECT * FROM sf_sales WHERE product_id = ? ORDER BY date DESC, id DESC LIMIT 30", (pid,))
    out["restocks"] = db.query("SELECT * FROM sf_restocks WHERE product_id = ? ORDER BY date DESC, id DESC LIMIT 20", (pid,))
    return out


@router.patch("/products/{pid}")
def api_product_patch(pid: int, payload: dict = Body(...)):
    try:
        return update_product({**payload, "product": str(pid), "replace_stock": payload.get("replace_stock", "stock" in payload)})
    except ValueError as e:
        _bad(e)


@router.delete("/products/{pid}")
def api_product_delete(pid: int):
    if db.one("SELECT id FROM sf_sales WHERE product_id = ? LIMIT 1", (pid,)):
        db.update("sf_products", pid, {"status": "archiwum", "updated": db.now_str()})
        return {"ok": True, "archived": True, "info": "Produkt ma historię sprzedaży – przeniesiono do archiwum."}
    db.execute("DELETE FROM sf_restocks WHERE product_id = ?", (pid,))
    db.execute("DELETE FROM sf_products WHERE id = ?", (pid,))
    return {"ok": True, "deleted": True}


@router.post("/sale")
def api_sale(payload: dict = Body(...)):
    try:
        r = record_sale(payload)
    except ValueError as e:
        _bad(e)
    if not r.get("ok"):
        raise HTTPException(400, r.get("error"))
    return r


@router.get("/sales")
def api_sales(limit: int = 50):
    return db.query("SELECT * FROM sf_sales ORDER BY date DESC, id DESC LIMIT ?", (limit,))


@router.delete("/sales/{sid}")
def api_sale_delete(sid: int):
    try:
        return delete_sale(sid)
    except ValueError as e:
        _bad(e)


@router.post("/restock")
def api_restock(payload: dict = Body(...)):
    try:
        return restock(payload)
    except ValueError as e:
        _bad(e)


@router.get("/collections")
def api_collections():
    return list_collections()


@router.post("/collections")
def api_collection_add(payload: dict = Body(...)):
    try:
        return plan_drop(payload)
    except ValueError as e:
        _bad(e)


@router.patch("/collections/{cid}")
def api_collection_patch(cid: int, payload: dict = Body(...)):
    try:
        return update_collection({**payload, "collection": str(cid)})
    except ValueError as e:
        _bad(e)


@router.delete("/collections/{cid}")
def api_collection_delete(cid: int, delete_event: bool = True):
    c = db.one("SELECT * FROM sf_collections WHERE id = ?", (cid,))
    if not c:
        raise HTTPException(404)
    if delete_event and c.get("event_id"):
        db.execute("DELETE FROM events WHERE id = ?", (c["event_id"],))
    db.execute("UPDATE sf_products SET collection_id = NULL WHERE collection_id = ?", (cid,))
    db.execute("UPDATE sf_designs SET collection_id = NULL WHERE collection_id = ?", (cid,))
    db.execute("DELETE FROM sf_collections WHERE id = ?", (cid,))
    return {"ok": True}


@router.get("/designs")
def api_designs(limit: int = 60):
    return list_designs(limit)


@router.get("/designs/{did}/svg")
def api_design_svg(did: int):
    d = db.one("SELECT mockup_svg FROM sf_designs WHERE id = ?", (did,))
    if not d or not d["mockup_svg"] or not Path(d["mockup_svg"]).exists():
        raise HTTPException(404, "Brak makiety")
    return Response(Path(d["mockup_svg"]).read_text(encoding="utf-8"), media_type="image/svg+xml",
                    headers={"Cache-Control": "no-cache"})


@router.get("/designs/{did}/image/{idx}")
def api_design_image(did: int, idx: int = 0):
    d = db.one("SELECT ai_image FROM sf_designs WHERE id = ?", (did,))
    if not d:
        raise HTTPException(404)
    try:
        imgs = json.loads(d["ai_image"] or "[]")
        imgs = imgs if isinstance(imgs, list) else [imgs]
    except ValueError:
        imgs = [d["ai_image"]] if d["ai_image"] else []
    if idx >= len(imgs):
        raise HTTPException(404)
    p = Path(imgs[idx])
    if not p.exists() or p.resolve().parent != DESIGN_DIR.resolve():
        raise HTTPException(404)
    return FileResponse(p)


@router.patch("/designs/{did}")
def api_design_patch(did: int, payload: dict = Body(...)):
    data = {k: payload[k] for k in ("title", "status", "notes", "concept") if k in payload}
    if "collection" in payload:
        c = _find_collection(payload["collection"])
        data["collection_id"] = c["id"] if c else None
    db.update("sf_designs", did, data)
    return {"ok": True}


@router.delete("/designs/{did}")
def api_design_delete(did: int):
    d = db.one("SELECT * FROM sf_designs WHERE id = ?", (did,))
    if not d:
        raise HTTPException(404)
    files = [d.get("mockup_svg"), d.get("mockup_png")]
    try:
        imgs = json.loads(d.get("ai_image") or "[]")
        files += imgs if isinstance(imgs, list) else [imgs]
    except ValueError:
        pass
    for f in files:
        if f:
            p = Path(f)
            if p.exists() and p.resolve().parent == DESIGN_DIR.resolve():
                p.unlink(missing_ok=True)
    db.execute("DELETE FROM sf_designs WHERE id = ?", (did,))
    return {"ok": True}


@router.post("/designs/mockup")
async def api_design_mockup(payload: dict = Body(...)):
    r = await asyncio.to_thread(design_mockup, payload)
    if isinstance(r, list):
        r = json.loads(r[0]["text"])
    return r


@router.post("/designs/ai")
async def api_design_ai(payload: dict = Body(...)):
    try:
        r = await generate_design_image(payload)
    except ValueError as e:
        _bad(e)
    if isinstance(r, list):
        r = json.loads(r[0]["text"])
    return r


@router.get("/trends")
def api_trends(min_score: int = 0, tag: str = ""):
    return list_trends(min_score, tag)


@router.post("/trends")
def api_trend_add(payload: dict = Body(...)):
    try:
        return save_trend(payload)
    except ValueError as e:
        _bad(e)


@router.patch("/trends/{tid}")
def api_trend_patch(tid: int, payload: dict = Body(...)):
    data = {k: payload[k] for k in ("title", "description", "source", "tags", "status") if k in payload}
    if payload.get("fit_score") is not None:
        data["fit_score"] = max(1, min(10, int(payload["fit_score"])))
    db.update("sf_trends", tid, data)
    return {"ok": True}


@router.delete("/trends/{tid}")
def api_trend_delete(tid: int):
    db.execute("DELETE FROM sf_trends WHERE id = ?", (tid,))
    return {"ok": True}


@router.get("/brand")
def api_brand():
    return {"text": brand_text(), "path": str(BRAND_PATH)}


@router.post("/brand")
def api_brand_save(payload: dict = Body(...)):
    text = str(payload.get("text") or "")
    if not text.strip():
        raise HTTPException(400, "Pusty tekst")
    BRAND_DIR.mkdir(parents=True, exist_ok=True)
    if BRAND_PATH.exists():
        (BRAND_DIR / "stratfanat.bak.md").write_text(BRAND_PATH.read_text(encoding="utf-8"), encoding="utf-8")
    BRAND_PATH.write_text(text.replace("\r\n", "\n"), encoding="utf-8")
    return {"ok": True}
