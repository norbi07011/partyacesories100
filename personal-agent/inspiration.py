"""Inspiracje Stratfanat – moodboard z Pinteresta (i innych stron ze zdjęciami).

Źródła to linki (wyszukiwanie Pinteresta, tablica, profil albo dowolna strona). Agent i harmonogram pobierają z nich piny,
miniatury zapisują się lokalnie (data/inspiration), a z obrazów liczona jest paleta kolorów moodboardu.
Agent może obejrzeć piny (view_inspirations) i na ich podstawie zaproponować trendy i projekty.
"""
import asyncio
import base64
import io
import json
import logging
import re
from html import unescape
from urllib.parse import parse_qs, quote, urlencode, urlparse

import httpx
from fastapi import APIRouter, Body, HTTPException
from fastapi.responses import FileResponse

import config
import db

log = logging.getLogger("inspiration")
PIN_DIR = config.DATA_DIR / "inspiration"
DEFAULT_SOURCES = [
    {"name": "Streetwear UI design", "url": "https://nl.pinterest.com/search/pins/?q=streetwear%20ui%20design"},
]
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/126.0 Safari/537.36")

SCHEMA = """
CREATE TABLE IF NOT EXISTS sf_insp_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT DEFAULT '',
    url TEXT NOT NULL UNIQUE,
    active INTEGER DEFAULT 1,
    last_fetch TEXT DEFAULT '',
    last_count INTEGER DEFAULT 0,
    last_error TEXT DEFAULT '',
    created TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sf_pins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pin_key TEXT NOT NULL UNIQUE,
    source_id INTEGER,
    title TEXT DEFAULT '',
    description TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    local_file TEXT DEFAULT '',
    link TEXT DEFAULT '',
    colors TEXT DEFAULT '',
    starred INTEGER DEFAULT 0,
    note TEXT DEFAULT '',
    created TEXT NOT NULL
);
"""


def init() -> None:
    with db._lock:
        db._conn.executescript(SCHEMA)
        db._conn.commit()
    PIN_DIR.mkdir(parents=True, exist_ok=True)
    if not db.one("SELECT id FROM sf_insp_sources LIMIT 1"):
        for s in DEFAULT_SOURCES:
            db.insert("sf_insp_sources", {**s, "created": db.now_str()})


# ================================================================ pobieranie
def _is_pinterest(url: str) -> bool:
    return "pinterest." in (urlparse(url).hostname or "")


def search_url(query: str, host: str = "nl.pinterest.com") -> str:
    return f"https://{host}/search/pins/?q={quote(query)}"


def _best_image(images: dict) -> str:
    if not isinstance(images, dict):
        return ""
    for k in ("736x", "orig", "474x", "564x", "236x"):
        v = images.get(k)
        if isinstance(v, dict) and v.get("url"):
            return v["url"]
    return ""


def _pin_from(d: dict) -> dict | None:
    """Wyciąga pin z dowolnego obiektu JSON Pinteresta (wyszukiwanie, tablica, strona)."""
    img = _best_image(d.get("images"))
    if not img:
        return None
    pid = str(d.get("id") or "")
    title = d.get("grid_title") or d.get("title") or ""
    desc = d.get("description") or d.get("closeup_unified_description") or d.get("auto_alt_text") or ""
    return {"pin_key": f"pin:{pid}" if pid else img, "title": str(title).strip()[:200], "description": str(desc).strip()[:600],
            "image_url": img, "link": f"https://www.pinterest.com/pin/{pid}/" if pid else (d.get("link") or ""),
            "dominant": d.get("dominant_color") or ""}


def _walk(obj, out: dict, depth: int = 0) -> None:
    if depth > 40 or len(out) > 400:
        return
    if isinstance(obj, dict):
        if "images" in obj:
            p = _pin_from(obj)
            if p and p["pin_key"] not in out:
                out[p["pin_key"]] = p
        for v in obj.values():
            _walk(v, out, depth + 1)
    elif isinstance(obj, list):
        for v in obj:
            _walk(v, out, depth + 1)


def parse_html(html: str, base_url: str = "") -> list[dict]:
    """Piny ze strony HTML: JSON osadzony przez Pinterest, potem og:image / <img>, na końcu adresy i.pinimg.com."""
    found: dict = {}
    for m in re.finditer(r'<script[^>]*(?:id="__PWS_(?:INITIAL_PROPS|DATA)__"|type="application/(?:ld\+)?json")[^>]*>(.*?)</script>',
                         html, re.S):
        try:
            _walk(json.loads(m.group(1)), found)
        except (ValueError, RecursionError):
            continue
    if not found:
        for m in re.finditer(r'https://i\.pinimg\.com/(?:236x|474x|564x|736x|originals)/[0-9a-f/]+\.(?:jpg|jpeg|png|webp)', html):
            u = m.group(0).replace("/236x/", "/736x/").replace("/474x/", "/736x/").replace("/564x/", "/736x/")
            found.setdefault(u, {"pin_key": u, "title": "", "description": "", "image_url": u, "link": base_url, "dominant": ""})
    if not found and not _is_pinterest(base_url):
        # zwykła strona (lookbook, sklep, blog): og:image + duże <img>
        for m in re.finditer(r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"', html):
            u = unescape(m.group(1))
            found.setdefault(u, {"pin_key": u, "title": "", "description": "", "image_url": u, "link": base_url, "dominant": ""})
        for m in re.finditer(r'<img[^>]+src="(https?://[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"[^>]*?(?:alt="([^"]*)")?', html, re.I):
            u = unescape(m.group(1))
            if any(x in u.lower() for x in ("logo", "icon", "sprite", "avatar", "pixel")):
                continue
            found.setdefault(u, {"pin_key": u, "title": unescape(m.group(2) or "")[:200], "description": "",
                                 "image_url": u, "link": base_url, "dominant": ""})
    return list(found.values())


def _rss_items(xml: str) -> list[dict]:
    out = []
    for it in re.findall(r"<item>(.*?)</item>", xml, re.S):
        g = lambda tag: unescape(re.sub(r"<!\[CDATA\[|\]\]>", "", (re.search(rf"<{tag}>(.*?)</{tag}>", it, re.S) or [None, ""])[1]))
        desc = g("description")
        img = re.search(r'src="([^"]+)"', desc)
        if not img:
            continue
        u = img.group(1).replace("/236x/", "/736x/")
        out.append({"pin_key": g("guid") or u, "title": g("title")[:200], "description": re.sub(r"<[^>]+>", " ", desc).strip()[:600],
                    "image_url": u, "link": g("link"), "dominant": ""})
    return out


async def _get(client: httpx.AsyncClient, url: str, **kw) -> httpx.Response:
    r = await client.get(url, **kw)
    r.raise_for_status()
    return r


async def fetch_url(url: str, limit: int = 40) -> list[dict]:
    """Pobiera piny z linku: wyszukiwanie Pinteresta, tablica/profil (RSS) albo dowolna strona ze zdjęciami."""
    url = url.strip()
    if not re.match(r"^https?://", url):
        url = search_url(url)
    pu = urlparse(url)
    pins: list[dict] = []
    errors: list[str] = []
    headers = {"User-Agent": UA, "Accept-Language": "pl-PL,pl;q=0.9,en;q=0.8,nl;q=0.7"}
    async with httpx.AsyncClient(timeout=25, follow_redirects=True, headers=headers) as c:
        if _is_pinterest(url):
            q = parse_qs(pu.query).get("q", [""])[0]
            parts = [p for p in pu.path.split("/") if p]
            if q:  # 1) wewnętrzne API wyszukiwania (działa bez logowania)
                data = {"options": {"query": q, "scope": "pins", "page_size": max(25, min(limit, 100)),
                                    "rs": "typed", "redux_normalize_feed": True}, "context": {}}
                api = f"{pu.scheme}://{pu.netloc}/resource/BaseSearchResource/get/?" + urlencode(
                    {"source_url": f"/search/pins/?q={quote(q)}", "data": json.dumps(data, separators=(",", ":"))})
                try:
                    r = await _get(c, api, headers={"Accept": "application/json", "X-Requested-With": "XMLHttpRequest",
                                                    "X-Pinterest-PWS-Handler": "www/search/[scope].js", "Referer": url})
                    found: dict = {}
                    _walk(r.json().get("resource_response", {}).get("data"), found)
                    pins = list(found.values())
                except Exception as e:  # noqa: BLE001
                    errors.append(f"API: {e}")
            elif len(parts) in (1, 2) and parts[0] not in ("pin", "ideas", "search", "today"):
                try:  # 2) tablica / profil – kanał RSS
                    r = await _get(c, f"{pu.scheme}://{pu.netloc}/{'/'.join(parts)}.rss" if len(parts) == 2
                                   else f"{pu.scheme}://{pu.netloc}/{parts[0]}/feed.rss")
                    pins = _rss_items(r.text)
                except Exception as e:  # noqa: BLE001
                    errors.append(f"RSS: {e}")
        if not pins:  # 3) sama strona HTML
            try:
                r = await _get(c, url)
                pins = parse_html(r.text, url)
            except Exception as e:  # noqa: BLE001
                errors.append(f"HTML: {e}")
    if not pins and errors:
        raise RuntimeError("; ".join(errors)[:400])
    return pins[:limit]


def _palette(data: bytes, n: int = 5) -> list[str]:
    try:
        from PIL import Image
        im = Image.open(io.BytesIO(data)).convert("RGB")
        im.thumbnail((120, 120))
        q = im.quantize(colors=n, method=Image.Quantize.MEDIANCUT)
        pal = q.getpalette()[: n * 3]
        counts = sorted(q.getcolors(), reverse=True)
        return ["#%02x%02x%02x" % tuple(pal[i * 3:i * 3 + 3]) for _, i in counts[:n]]
    except Exception:  # noqa: BLE001
        return []


async def _download(c: httpx.AsyncClient, pin: dict) -> tuple[str, list[str]]:
    name = re.sub(r"[^a-zA-Z0-9]+", "_", pin["pin_key"])[-60:] + ".jpg"
    path = PIN_DIR / name
    try:
        if not path.exists():
            r = await c.get(pin["image_url"])
            r.raise_for_status()
            if len(r.content) < 800:
                return "", []
            path.write_bytes(r.content)
        data = path.read_bytes()
        cols = _palette(data)
        if pin.get("dominant") and pin["dominant"] not in cols:
            cols = [pin["dominant"]] + cols[:4]
        return name, cols
    except Exception:  # noqa: BLE001
        return "", []


async def store_pins(pins: list[dict], source_id: int | None) -> list[dict]:
    """Zapisuje nowe piny (pomija znane), pobiera miniatury lokalnie i liczy paletę."""
    new = [p for p in pins if not db.one("SELECT id FROM sf_pins WHERE pin_key = ?", (p["pin_key"],))]
    saved = []
    if not new:
        return saved
    async with httpx.AsyncClient(timeout=25, follow_redirects=True, headers={"User-Agent": UA}) as c:
        sem = asyncio.Semaphore(6)

        async def one(p):
            async with sem:
                return p, await _download(c, p)
        for p, (fname, cols) in await asyncio.gather(*(one(p) for p in new)):
            pid = db.insert("sf_pins", {"pin_key": p["pin_key"], "source_id": source_id, "title": p["title"],
                                        "description": p["description"], "image_url": p["image_url"], "local_file": fname,
                                        "link": p["link"], "colors": ",".join(cols), "created": db.now_str()})
            saved.append(_row(db.one("SELECT * FROM sf_pins WHERE id = ?", (pid,))))
    return saved


async def fetch_source(sid: int, limit: int = 40) -> dict:
    s = db.one("SELECT * FROM sf_insp_sources WHERE id = ?", (sid,))
    if not s:
        raise ValueError("Nie ma takiego źródła")
    try:
        pins = await fetch_url(s["url"], limit)
        saved = await store_pins(pins, sid)
        db.update("sf_insp_sources", sid, {"last_fetch": db.now_str(), "last_count": len(saved), "last_error": ""})
        return {"ok": True, "zrodlo": s["name"] or s["url"], "znalezione": len(pins), "nowe": len(saved), "piny": saved}
    except Exception as e:  # noqa: BLE001
        db.update("sf_insp_sources", sid, {"last_fetch": db.now_str(), "last_error": str(e)[:300]})
        return {"ok": False, "zrodlo": s["name"] or s["url"], "error": f"Nie udało się pobrać: {e}"}


async def fetch_all(limit: int = 40) -> dict:
    out = [await fetch_source(s["id"], limit) for s in db.query("SELECT id FROM sf_insp_sources WHERE active = 1")]
    return {"zrodla": len(out), "nowe": sum(r.get("nowe", 0) for r in out), "bledy": [r for r in out if not r["ok"]]}


async def scheduled_fetch() -> None:
    """Codziennie: nowe piny ze wszystkich aktywnych źródeł, krótka informacja w powiadomieniach."""
    r = await fetch_all(30)
    if r["nowe"]:
        import notifier
        await notifier.notify("Nowe inspiracje Stratfanat", f"{r['nowe']} nowych pinów na moodboardzie (Stratfanat → Inspiracje).",
                              push=False)


# ================================================================ odczyt
def _row(r: dict | None) -> dict:
    if not r:
        return {}
    r = dict(r)
    r["colors"] = [c for c in (r.get("colors") or "").split(",") if c]
    r["thumb"] = f"/api/stratfanat/inspiration/pins/{r['id']}/image" if r.get("local_file") else r.get("image_url", "")
    return r


def list_pins(query: str = "", starred: bool = False, source_id: int | None = None, limit: int = 60) -> list[dict]:
    where, p = ["1=1"], []
    if query:
        where.append("(title LIKE ? OR description LIKE ? OR note LIKE ?)")
        p += [f"%{query}%"] * 3
    if starred:
        where.append("starred = 1")
    if source_id:
        where.append("source_id = ?")
        p.append(source_id)
    rows = db.query(f"SELECT * FROM sf_pins WHERE {' AND '.join(where)} ORDER BY starred DESC, id DESC LIMIT ?",
                    (*p, max(1, min(int(limit or 60), 300))))
    return [_row(r) for r in rows]


def moodboard_palette(starred_only: bool = False, n: int = 8) -> list[dict]:
    """Najczęstsze kolory z pinów (zgrupowane w zbliżone odcienie)."""
    rows = db.query("SELECT colors FROM sf_pins WHERE colors != ''" + (" AND starred = 1" if starred_only else "")
                    + " ORDER BY id DESC LIMIT 200")
    buckets: dict = {}
    for r in rows:
        for i, c in enumerate(r["colors"].split(",")[:4]):
            try:
                rgb = tuple(int(c[k:k + 2], 16) for k in (1, 3, 5))
            except ValueError:
                continue
            key = tuple(v // 40 for v in rgb)
            b = buckets.setdefault(key, {"n": 0, "sum": [0, 0, 0]})
            w = 4 - i
            b["n"] += w
            b["sum"] = [s + v * w for s, v in zip(b["sum"], rgb)]
    top = sorted(buckets.values(), key=lambda b: -b["n"])[:n]
    total = sum(b["n"] for b in top) or 1
    return [{"hex": "#%02x%02x%02x" % tuple(round(s / b["n"]) for s in b["sum"]), "udzial": round(100 * b["n"] / total)}
            for b in top]


def sources() -> list[dict]:
    rows = db.query("SELECT s.*, (SELECT COUNT(*) FROM sf_pins p WHERE p.source_id = s.id) AS pins FROM sf_insp_sources s ORDER BY id")
    return [dict(r) for r in rows]


def add_source(url: str, name: str = "") -> dict:
    url = (url or "").strip()
    if not url:
        raise ValueError("Podaj link albo hasło do wyszukania")
    if not re.match(r"^https?://", url):
        name = name or url
        url = search_url(url)
    ex = db.one("SELECT id FROM sf_insp_sources WHERE url = ?", (url,))
    if ex:
        return {"ok": True, "id": ex["id"], "info": "To źródło już jest"}
    if not name:
        q = parse_qs(urlparse(url).query).get("q", [""])[0]
        name = q or urlparse(url).path.strip("/") or urlparse(url).hostname
    return {"ok": True, "id": db.insert("sf_insp_sources", {"name": name[:80], "url": url, "created": db.now_str()})}


def view_pins(ids: list[int] | None, count: int = 6) -> list[dict]:
    """Obrazy pinów dla modelu z widzeniem (Claude / qwen2.5vl)."""
    if ids:
        rows = [db.one("SELECT * FROM sf_pins WHERE id = ?", (int(i),)) for i in ids[:8]]
    else:
        rows = db.query("SELECT * FROM sf_pins WHERE local_file != '' ORDER BY starred DESC, id DESC LIMIT ?",
                        (max(1, min(int(count or 6), 8)),))
    content: list[dict] = []
    for r in filter(None, rows):
        content.append({"type": "text", "text": f"Pin #{r['id']}: {r['title'] or '(bez tytułu)'} – {r['description'][:200]} "
                                                f"| kolory: {r['colors']} | {r['link']}"})
        f = PIN_DIR / r["local_file"] if r["local_file"] else None
        if f and f.exists():
            try:
                from PIL import Image
                im = Image.open(f).convert("RGB")
                im.thumbnail((768, 768))
                buf = io.BytesIO()
                im.save(buf, "JPEG", quality=82)
                content.append({"type": "image", "source": {"type": "base64", "media_type": "image/jpeg",
                                                              "data": base64.b64encode(buf.getvalue()).decode()}})
            except Exception:  # noqa: BLE001
                pass
    return content or [{"type": "text", "text": "Brak pobranych pinów. Najpierw użyj pinterest_inspiration."}]


# ================================================================ narzędzia agenta
_S = {"type": "string"}
_I = {"type": "integer"}
TOOLS = [
    {"name": "pinterest_inspiration",
     "description": "Pobiera inspiracje z Pinteresta na moodboard Stratfanat (zapisuje lokalnie miniatury i palety kolorów). "
                    "Bez argumentów – odświeża wszystkie źródła użytkownika (domyślnie jego link „streetwear ui design”). "
                    "query = hasło do wyszukania na Pintereście, url = konkretny link (wyszukiwanie, tablica, profil albo "
                    "dowolna strona ze zdjęciami). Potem obejrzyj piny przez view_inspirations.",
     "input_schema": {"type": "object", "properties": {"query": _S, "url": _S, "limit": _I,
                                                       "save_source": {"type": "boolean", "description": "dodaj jako stałe źródło"}}}},
    {"name": "list_inspirations",
     "description": "Moodboard Stratfanat: zapisane piny (tytuł, opis, kolory, link), źródła i wspólna paleta kolorów.",
     "input_schema": {"type": "object", "properties": {"query": _S, "starred": {"type": "boolean"}, "limit": _I}}},
    {"name": "view_inspirations",
     "description": "Ogląda obrazy pinów z moodboardu (do 8), żeby ocenić estetykę, kroje, grafiki, typografię i układy. "
                    "Podaj ids albo count (wtedy najnowsze / oznaczone gwiazdką).",
     "input_schema": {"type": "object", "properties": {"ids": {"type": "array", "items": _I}, "count": _I}}},
    {"name": "star_inspiration",
     "description": "Oznacza pin gwiazdką (ulubione) i/lub dopisuje notatkę, np. co z niego wziąć do projektu.",
     "input_schema": {"type": "object", "properties": {"id": _I, "starred": {"type": "boolean"}, "note": _S}, "required": ["id"]}},
]
NAMES = {t["name"] for t in TOOLS}
LABELS = {"pinterest_inspiration": "Szukam inspiracji na Pintereście", "list_inspirations": "Przeglądam moodboard",
          "view_inspirations": "Oglądam inspiracje", "star_inspiration": "Zapisuję na moodboardzie"}
CHANGES = {"pinterest_inspiration": "stratfanat", "star_inspiration": "stratfanat"}


async def execute(name: str, args: dict):
    a = args or {}
    try:
        match name:
            case "pinterest_inspiration":
                limit = max(5, min(int(a.get("limit") or 30), 100))
                target = (a.get("url") or "").strip() or (search_url(a["query"]) if a.get("query") else "")
                if not target:
                    r = await fetch_all(limit)
                    pins = list_pins(limit=limit)
                    return {**r, "piny": [_brief(p) for p in pins[:limit]], "paleta": moodboard_palette()}
                sid = add_source(target, a.get("query", ""))["id"] if a.get("save_source") else None
                if sid:
                    r = await fetch_source(sid, limit)
                    if not r["ok"]:
                        return r
                    pins = r["piny"] or list_pins(source_id=sid, limit=limit)
                else:
                    pins = await store_pins(await fetch_url(target, limit), None)
                return {"ok": True, "link": target, "nowe": len(pins), "piny": [_brief(p) for p in pins],
                        "paleta": moodboard_palette(), "dalej": "view_inspirations(ids=[...]) żeby obejrzeć obrazy"}
            case "list_inspirations":
                pins = list_pins(a.get("query", ""), bool(a.get("starred")), limit=int(a.get("limit") or 40))
                return {"zrodla": [{k: s[k] for k in ("id", "name", "url", "pins", "last_fetch")} for s in sources()],
                        "paleta": moodboard_palette(), "piny": [_brief(p) for p in pins]}
            case "view_inspirations":
                return await asyncio.to_thread(view_pins, a.get("ids"), a.get("count") or 6)
            case "star_inspiration":
                data = {}
                if "starred" in a:
                    data["starred"] = 1 if a["starred"] else 0
                if a.get("note") is not None:
                    data["note"] = a["note"]
                db.update("sf_pins", int(a["id"]), data or {"starred": 1})
                return {"ok": True}
    except (ValueError, RuntimeError, httpx.HTTPError) as e:
        return {"ok": False, "error": str(e)}
    return {"error": f"Nieznane narzędzie {name}"}


def _brief(p: dict) -> dict:
    return {"id": p["id"], "tytul": p["title"], "opis": p["description"][:200], "kolory": p["colors"], "link": p["link"],
            "gwiazdka": bool(p["starred"])}


# ================================================================ API
router = APIRouter(prefix="/api/stratfanat/inspiration")


@router.get("")
def api_overview(q: str = "", starred: bool = False, source: int | None = None, limit: int = 120):
    return {"sources": sources(), "pins": list_pins(q, starred, source, limit), "palette": moodboard_palette(),
            "total": (db.one("SELECT COUNT(*) AS n FROM sf_pins") or {"n": 0})["n"]}


@router.post("/sources")
def api_source_add(payload: dict = Body(...)):
    try:
        return add_source(payload.get("url", ""), payload.get("name", ""))
    except ValueError as e:
        raise HTTPException(400, str(e)) from e


@router.patch("/sources/{sid}")
def api_source_patch(sid: int, payload: dict = Body(...)):
    data = {k: payload[k] for k in ("name", "url", "active") if k in payload}
    if data:
        db.update("sf_insp_sources", sid, data)
    return {"ok": True}


@router.delete("/sources/{sid}")
def api_source_delete(sid: int):
    db.execute("DELETE FROM sf_insp_sources WHERE id = ?", (sid,))
    return {"ok": True}


@router.post("/fetch")
async def api_fetch(payload: dict = Body(default={})):
    if payload.get("source_id"):
        return await fetch_source(int(payload["source_id"]), int(payload.get("limit") or 40))
    if payload.get("url") or payload.get("query"):
        url = payload.get("url") or search_url(payload["query"])
        try:
            saved = await store_pins(await fetch_url(url, int(payload.get("limit") or 40)), None)
            return {"ok": True, "nowe": len(saved)}
        except Exception as e:  # noqa: BLE001
            return {"ok": False, "error": f"Nie udało się pobrać: {e}"}
    return await fetch_all(int(payload.get("limit") or 40))


@router.patch("/pins/{pid}")
def api_pin_patch(pid: int, payload: dict = Body(...)):
    data = {k: payload[k] for k in ("starred", "note", "title") if k in payload}
    if "starred" in data:
        data["starred"] = 1 if data["starred"] else 0
    if data:
        db.update("sf_pins", pid, data)
    return {"ok": True}


@router.delete("/pins/{pid}")
def api_pin_delete(pid: int):
    r = db.one("SELECT local_file FROM sf_pins WHERE id = ?", (pid,))
    if r and r["local_file"]:
        (PIN_DIR / r["local_file"]).unlink(missing_ok=True)
    db.execute("DELETE FROM sf_pins WHERE id = ?", (pid,))
    return {"ok": True}


@router.get("/pins/{pid}/image")
def api_pin_image(pid: int):
    r = db.one("SELECT local_file FROM sf_pins WHERE id = ?", (pid,))
    f = PIN_DIR / (r["local_file"] if r else "")
    if not r or not r["local_file"] or not f.is_file():
        raise HTTPException(404)
    return FileResponse(f, media_type="image/jpeg", headers={"Cache-Control": "max-age=86400"})
