"""Strony klientów: monitoring dostępności (co 10 min), certyfikaty SSL, wygasanie domen (RDAP), odnowienia hostingu
oraz prosty audyt SEO/wydajności bez zewnętrznych usług.

Integracja (main.py / agent.py / scheduler.py):
    import websites
    websites.init()                          # w lifespan
    app.include_router(websites.router)      # /api/websites/...
    scheduler.add_job(websites.check_all, "interval", minutes=10, id="websites", max_instances=1)
    narzędzia: websites.TOOLS / LABELS / CHANGES / NAMES / execute(name, args)
    monitoring: websites.alerts() -> list[dict]
"""
import asyncio
import json
import re
import socket
import ssl
import time
from datetime import date, datetime, timedelta, timezone
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

import httpx
from fastapi import APIRouter, Body, HTTPException

import db
from notifier import notify

UA = "Mozilla/5.0 (compatible; StudioAgent-Monitor/1.0)"
TIMEOUT = 15
SSL_WARN_DAYS = 14
DOMAIN_WARN_DAYS = 30
HOSTING_WARN_DAYS = 14

SCHEMA = """
CREATE TABLE IF NOT EXISTS web_sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    name TEXT DEFAULT '',
    client TEXT DEFAULT '',
    project_id INTEGER,
    monthly_fee REAL DEFAULT 0,              -- abonament / utrzymanie zł/mies.
    hosting_renewal TEXT,                    -- YYYY-MM-DD
    domain_expiry TEXT,                      -- YYYY-MM-DD (RDAP lub ręcznie)
    ssl_expiry TEXT,                         -- YYYY-MM-DD
    ssl_error TEXT DEFAULT '',
    ssl_checked TEXT,
    domain_checked TEXT,
    last_status INTEGER,
    last_ms INTEGER,
    last_check TEXT,
    last_error TEXT DEFAULT '',
    consecutive_failures INTEGER DEFAULT 0,
    down_since TEXT,
    checks_total INTEGER DEFAULT 0,
    checks_ok INTEGER DEFAULT 0,
    last_audit_score INTEGER,
    last_audit TEXT,
    notes TEXT DEFAULT '',
    active INTEGER DEFAULT 1,
    created TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS web_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL,
    ts TEXT NOT NULL,
    status INTEGER,
    ms INTEGER,
    ok INTEGER NOT NULL,
    error TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_web_checks_site_ts ON web_checks(site_id, ts);
CREATE TABLE IF NOT EXISTS web_audits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER,
    url TEXT NOT NULL,
    score INTEGER,
    result TEXT,
    created TEXT NOT NULL
);
"""

FIELDS = {"url", "name", "client", "project_id", "monthly_fee", "hosting_renewal", "domain_expiry", "ssl_expiry", "notes", "active"}


def init() -> None:
    with db._lock:
        db._conn.executescript(SCHEMA)
        db._conn.commit()


# ================================================================ pomocnicze
def normalize_url(url: str) -> str:
    u = (url or "").strip()
    if not u:
        raise ValueError("Podaj adres strony")
    if not re.match(r"^https?://", u, re.I):
        u = "https://" + u
    p = urlparse(u)
    if not p.hostname:
        raise ValueError("Nieprawidłowy adres strony")
    return u.rstrip("/") if p.path in ("", "/") and not p.query else u


def _host(url: str) -> str:
    return (urlparse(url).hostname or "").lower()


SECOND_LEVEL = {"com.pl", "net.pl", "org.pl", "info.pl", "biz.pl", "waw.pl", "edu.pl", "gov.pl", "co.uk", "org.uk", "com.au",
                "co.jp", "com.br", "co.nz", "com.ua", "co.za", "krakow.pl", "wroclaw.pl", "poznan.pl", "gda.pl", "lodz.pl",
                "katowice.pl", "szczecin.pl", "lublin.pl"}


def registrable_domain(host: str) -> str:
    host = host.lower().strip(".")
    if re.fullmatch(r"[\d.]+", host) or host in ("localhost",) or "." not in host:
        return ""
    parts = host.split(".")
    if len(parts) >= 3 and ".".join(parts[-2:]) in SECOND_LEVEL:
        return ".".join(parts[-3:])
    return ".".join(parts[-2:])


def _days_left(d: str | None) -> int | None:
    if not d:
        return None
    try:
        return (date.fromisoformat(d[:10]) - db.now().date()).days
    except ValueError:
        return None


def _uptime(site_id: int, days: int) -> float | None:
    since = (db.now() - timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%S")
    r = db.one("SELECT COUNT(*) AS n, SUM(ok) AS ok FROM web_checks WHERE site_id = ? AND ts >= ?", (site_id, since))
    if not r or not r["n"]:
        return None
    return round(100.0 * (r["ok"] or 0) / r["n"], 2)


def _site_out(s: dict) -> dict:
    out = dict(s)
    out["uptime_7d"] = _uptime(s["id"], 7)
    out["uptime_30d"] = _uptime(s["id"], 30)
    out["ssl_days"] = _days_left(s.get("ssl_expiry"))
    out["domain_days"] = _days_left(s.get("domain_expiry"))
    out["hosting_days"] = _days_left(s.get("hosting_renewal"))
    out["up"] = None if s.get("last_check") is None else (s.get("consecutive_failures") or 0) == 0
    avg = db.one("SELECT AVG(ms) AS a FROM web_checks WHERE site_id = ? AND ok = 1 AND ts >= ?",
                 (s["id"], (db.now() - timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%S")))
    out["avg_ms_7d"] = int(avg["a"]) if avg and avg["a"] else None
    if s.get("project_id"):
        p = db.one("SELECT name FROM projects WHERE id = ?", (s["project_id"],))
        out["project"] = p["name"] if p else ""
    return out


def find_site(ref) -> dict:
    r = str(ref or "").strip()
    if not r:
        raise ValueError("Podaj stronę (adres, nazwę albo id)")
    if r.isdigit():
        s = db.one("SELECT * FROM web_sites WHERE id = ?", (int(r),))
        if s:
            return s
    netloc = urlparse(r if "://" in r else "https://" + r).netloc.lower() if ("." in r or ":" in r) else ""
    if netloc:
        rows = db.query("SELECT * FROM web_sites WHERE lower(url) LIKE ?", (f"%://{netloc}%",))
        if not rows and netloc.startswith("www."):
            rows = db.query("SELECT * FROM web_sites WHERE lower(url) LIKE ?", (f"%://{netloc[4:]}%",))
        elif not rows:
            rows = db.query("SELECT * FROM web_sites WHERE lower(url) LIKE ?", (f"%://www.{netloc}%",))
    else:
        rows = db.query("SELECT * FROM web_sites WHERE lower(name) = lower(?) OR lower(client) = lower(?)", (r, r))
    if len(rows) == 1:
        return rows[0]
    if not rows:
        raise ValueError(f"Nie ma strony „{r}” na liście – dodaj ją add_site.")
    raise ValueError("Pasuje kilka stron: " + ", ".join(f"{x['id']}: {x['url']}" for x in rows))


# ================================================================ sprawdzanie dostępności
async def probe(url: str, client: httpx.AsyncClient | None = None) -> dict:
    own = client is None
    client = client or httpx.AsyncClient(follow_redirects=True, timeout=TIMEOUT, headers={"User-Agent": UA})
    t0 = time.perf_counter()
    try:
        r = await client.get(url)
        ms = int((time.perf_counter() - t0) * 1000)
        ok = 200 <= r.status_code < 400
        return {"ok": ok, "status": r.status_code, "ms": ms, "final_url": str(r.url),
                "error": "" if ok else f"HTTP {r.status_code}"}
    except httpx.TimeoutException:
        return {"ok": False, "status": None, "ms": int((time.perf_counter() - t0) * 1000), "error": "Przekroczono czas (15 s)"}
    except httpx.HTTPError as e:
        msg = str(e) or type(e).__name__
        if "certificate" in msg.lower() or "ssl" in msg.lower():
            msg = "Błąd certyfikatu SSL: " + msg
        return {"ok": False, "status": None, "ms": int((time.perf_counter() - t0) * 1000), "error": msg[:300]}
    finally:
        if own:
            await client.aclose()


async def _check_site(site: dict, client: httpx.AsyncClient, notify_changes: bool = True) -> dict:
    res = await probe(site["url"], client)
    now = db.now_str()
    db.insert("web_checks", {"site_id": site["id"], "ts": now, "status": res["status"], "ms": res["ms"],
                             "ok": 1 if res["ok"] else 0, "error": res["error"]})
    fails = 0 if res["ok"] else (site.get("consecutive_failures") or 0) + 1
    upd = {"last_status": res["status"], "last_ms": res["ms"], "last_check": now, "last_error": res["error"],
           "consecutive_failures": fails, "checks_total": (site.get("checks_total") or 0) + 1,
           "checks_ok": (site.get("checks_ok") or 0) + (1 if res["ok"] else 0)}
    name = site.get("name") or _host(site["url"])
    if not res["ok"] and fails == 1:
        upd["down_since"] = now
    if notify_changes and not res["ok"] and fails == 2:
        await notify(f"🔴 Strona nie działa: {name}",
                     f"{site['url']}\n{res['error'] or 'brak odpowiedzi'} (2 kolejne próby, od {(site.get('down_since') or now)[11:16]})"
                     + (f"\nKlient: {site['client']}" if site.get("client") else ""), level="alert")
    if res["ok"] and (site.get("consecutive_failures") or 0) >= 2:
        since = site.get("down_since")
        took = ""
        if since:
            mins = int((db.now() - datetime.fromisoformat(since)).total_seconds() // 60)
            took = f" po ok. {mins // 60} h {mins % 60} min" if mins >= 60 else f" po ok. {mins} min"
        if notify_changes:
            await notify(f"🟢 Strona wróciła: {name}", f"{site['url']} działa ponownie{took} (HTTP {res['status']}, {res['ms']} ms).",
                         level="alert")
    if res["ok"]:
        upd["down_since"] = None
    db.update("web_sites", site["id"], upd)
    return {"id": site["id"], "url": site["url"], "name": name, **res, "consecutive_failures": fails}


async def check_all(force_daily: bool = False) -> list[dict]:
    """Wywoływane co 10 min przez harmonogram: dostępność wszystkich aktywnych stron + raz dziennie SSL/domeny/hosting."""
    sites = db.query("SELECT * FROM web_sites WHERE active = 1")
    results = []
    if sites:
        sem = asyncio.Semaphore(8)
        async with httpx.AsyncClient(follow_redirects=True, timeout=TIMEOUT, headers={"User-Agent": UA}) as client:
            async def one(s):
                async with sem:
                    return await _check_site(s, client)
            results = await asyncio.gather(*(one(s) for s in sites))
    cutoff = (db.now() - timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%S")
    db.execute("DELETE FROM web_checks WHERE ts < ?", (cutoff,))
    today = db.now().strftime("%Y-%m-%d")
    if force_daily or db.kv_get("web_daily_check") != today:
        db.kv_set("web_daily_check", today)
        await daily_check()
    return list(results)


# ---------------------------------------------------------------- SSL i domeny
def ssl_expiry(host: str, port: int = 443) -> dict:
    ctx = ssl.create_default_context()
    try:
        with socket.create_connection((host, port), timeout=10) as sock:
            with ctx.wrap_socket(sock, server_hostname=host) as ss:
                cert = ss.getpeercert()
        ts = ssl.cert_time_to_seconds(cert["notAfter"])
        exp = datetime.fromtimestamp(ts, timezone.utc).date()
        issuer = dict(x[0] for x in cert.get("issuer", ()))
        return {"ok": True, "expiry": exp.isoformat(), "days": (exp - date.today()).days,
                "issuer": issuer.get("organizationName") or issuer.get("commonName", "")}
    except ssl.SSLCertVerificationError as e:
        return {"ok": False, "error": f"Certyfikat nieprawidłowy: {e.verify_message or e}"}
    except (OSError, ssl.SSLError, KeyError, ValueError) as e:
        return {"ok": False, "error": f"{type(e).__name__}: {e}"[:200]}


def _registrar(data: dict) -> str:
    try:
        for e in data.get("entities") or []:
            if "registrar" in (e.get("roles") or []):
                for item in (e.get("vcardArray") or [None, []])[1]:
                    if item and item[0] == "fn":
                        return str(item[3])
    except (IndexError, TypeError, AttributeError):
        pass
    return ""


def robots_blocks_all(txt: str) -> bool:
    """True, gdy grupa User-agent: * zawiera 'Disallow: /'."""
    agents, in_star, rules_started = [], False, False
    for raw in (txt or "").splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line or ":" not in line:
            continue
        k, v = (x.strip() for x in line.split(":", 1))
        k = k.lower()
        if k == "user-agent":
            if rules_started:
                agents, rules_started = [], False
            agents.append(v)
            in_star = "*" in agents
        elif k in ("disallow", "allow"):
            rules_started = True
            if in_star and k == "disallow" and v == "/":
                return True
    return False


async def domain_expiry(domain: str) -> dict:
    if not domain:
        return {"ok": False, "error": "Brak domeny"}
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=20, headers={"User-Agent": UA,
                                                                                  "Accept": "application/rdap+json"}) as c:
            r = await c.get(f"https://rdap.org/domain/{domain}")
        if r.status_code != 200:
            return {"ok": False, "error": f"RDAP HTTP {r.status_code}"}
        data = r.json()
        for ev in data.get("events", []):
            if ev.get("eventAction") in ("expiration", "registration expiration") and ev.get("eventDate"):
                d = ev["eventDate"][:10]
                return {"ok": True, "expiry": d, "days": _days_left(d), "registrar": _registrar(data)}
        return {"ok": False, "error": "Rejestr nie podaje daty wygaśnięcia (np. .pl) – wpisz ją ręcznie"}
    except (httpx.HTTPError, ValueError, IndexError, TypeError) as e:
        return {"ok": False, "error": f"{type(e).__name__}: {e}"[:200]}


async def refresh_expiry(site: dict) -> dict:
    host = _host(site["url"])
    out = {}
    if site["url"].lower().startswith("https://") and host:
        s = await asyncio.to_thread(ssl_expiry, host, urlparse(site["url"]).port or 443)
        upd = {"ssl_checked": db.now_str()}
        if s["ok"]:
            upd.update({"ssl_expiry": s["expiry"], "ssl_error": ""})
        else:
            upd["ssl_error"] = s["error"]
        db.update("web_sites", site["id"], upd)
        out["ssl"] = s
    dom = registrable_domain(host)
    if dom:
        d = await domain_expiry(dom)
        upd = {"domain_checked": db.now_str()}
        if d["ok"]:
            upd["domain_expiry"] = d["expiry"]
        db.update("web_sites", site["id"], upd)
        out["domain"] = {**d, "domain": dom}
    return out


async def _notify_once(key: str, title: str, body: str) -> None:
    today = db.now().strftime("%Y-%m-%d")
    k = f"web_notif_{key}"
    if db.kv_get(k) == today:
        return
    db.kv_set(k, today)
    await notify(title, body, level="alert")


async def daily_check() -> None:
    sites = db.query("SELECT * FROM web_sites WHERE active = 1")
    for s in sites:
        try:
            await refresh_expiry(s)
        except Exception:  # noqa: BLE001 - jedna strona nie może zatrzymać reszty
            continue
    for a in alerts():
        if a["key"].startswith(("web_ssl", "web_domain", "web_hosting")) and a["severity"] in ("warn", "critical"):
            await _notify_once(a["key"], a["title"], f"{a['body']}\n💡 {a['suggestion']}")


# ================================================================ audyt SEO / wydajność
class _Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title, self._in_title = "", False
        self.meta: dict[str, str] = {}
        self.og: dict[str, str] = {}
        self.h1 = 0
        self.h1_texts: list[str] = []
        self._in_h1 = False
        self.imgs = 0
        self.imgs_no_alt = 0
        self.imgs_no_dims = 0
        self.lazy = 0
        self.canonical = ""
        self.lang = ""
        self.scripts = 0
        self.scripts_blocking = 0
        self.styles = 0
        self.resources: list[str] = []
        self.links: list[str] = []
        self.icon = False

    def handle_starttag(self, tag, attrs):
        a = {k.lower(): (v or "") for k, v in attrs}
        if tag == "html":
            self.lang = a.get("lang", "")
        elif tag == "title":
            self._in_title = True
        elif tag == "meta":
            n = (a.get("name") or "").lower()
            p = (a.get("property") or "").lower()
            if n:
                self.meta[n] = a.get("content", "")
            if p.startswith("og:"):
                self.og[p] = a.get("content", "")
            if n.startswith("twitter:"):
                self.og[n] = a.get("content", "")
        elif tag == "h1":
            self.h1 += 1
            self._in_h1 = True
            self.h1_texts.append("")
        elif tag == "img":
            self.imgs += 1
            if "alt" not in a:
                self.imgs_no_alt += 1
            if not (a.get("width") and a.get("height")):
                self.imgs_no_dims += 1
            if a.get("loading") == "lazy":
                self.lazy += 1
            if a.get("src"):
                self.resources.append(a["src"])
        elif tag == "link":
            rel = a.get("rel", "").lower()
            if "canonical" in rel:
                self.canonical = a.get("href", "")
            if "stylesheet" in rel:
                self.styles += 1
                self.resources.append(a.get("href", ""))
            if "icon" in rel:
                self.icon = True
        elif tag == "script":
            if a.get("src"):
                self.scripts += 1
                self.resources.append(a["src"])
                if "async" not in a and "defer" not in a and a.get("type", "") != "module":
                    self.scripts_blocking += 1
        elif tag in ("iframe", "video", "audio", "source"):
            if a.get("src"):
                self.resources.append(a["src"])
        elif tag == "a" and a.get("href"):
            self.links.append(a["href"])

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False
        elif tag == "h1":
            self._in_h1 = False

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        if self._in_h1 and self.h1_texts:
            self.h1_texts[-1] += data


def _issue(issues: list, penalty: int, sev: str, problem: str, fix: str) -> None:
    issues.append({"waga": sev, "punkty": -penalty, "problem": problem, "jak_naprawic": fix})


async def audit(url: str) -> dict:
    url = normalize_url(url)
    issues: list[dict] = []
    checks: dict = {}
    async with httpx.AsyncClient(follow_redirects=True, timeout=TIMEOUT, headers={"User-Agent": UA}) as c:
        t0 = time.perf_counter()
        try:
            async with c.stream("GET", url) as r:
                ttfb = int((time.perf_counter() - t0) * 1000)
                body = await r.aread()
            total = int((time.perf_counter() - t0) * 1000)
        except httpx.HTTPError as e:
            return {"url": url, "ok": False, "score": 0, "error": f"Strona nie odpowiada: {type(e).__name__}: {e}"[:300],
                    "problemy": [{"waga": "krytyczne", "punkty": -100, "problem": "Strona nie odpowiada",
                                  "jak_naprawic": "Sprawdź hosting, DNS i certyfikat; zobacz logi serwera."}]}
        final = str(r.url)
        headers = {k.lower(): v for k, v in r.headers.items()}
        ctype = headers.get("content-type", "")
        charset = r.encoding or "utf-8"
        try:
            html = body.decode(charset, errors="replace")
        except LookupError:
            html = body.decode("utf-8", errors="replace")
        checks.update({"status": r.status_code, "final_url": final, "redirects": len(r.history), "ttfb_ms": ttfb,
                       "load_ms": total, "html_kb": round(len(body) / 1024, 1),
                       "compression": headers.get("content-encoding", ""), "server": headers.get("server", ""),
                       "content_type": ctype})
        # http -> https
        https_final = final.lower().startswith("https://")
        http_redirect = None
        host = _host(final)
        if host and not re.fullmatch(r"[\d.]+|localhost", host):
            try:
                hr = await c.get("http://" + host + "/", timeout=8)
                http_redirect = str(hr.url).lower().startswith("https://")
            except httpx.HTTPError:
                http_redirect = None
        checks["https"] = https_final
        checks["http_to_https"] = http_redirect
        origin = f"{urlparse(final).scheme}://{urlparse(final).netloc}"

        async def exists(path: str) -> tuple[bool, str]:
            try:
                rr = await c.get(origin + path, timeout=8)
                good = rr.status_code == 200 and "text/html" not in rr.headers.get("content-type", "").lower() \
                    if path != "/robots.txt" else rr.status_code == 200 and "<html" not in rr.text[:400].lower()
                return good, rr.text[:4000] if good else ""
            except httpx.HTTPError:
                return False, ""

        (robots_ok, robots_txt), (sitemap_ok, _) = await asyncio.gather(exists("/robots.txt"), exists("/sitemap.xml"))
        if not sitemap_ok and robots_txt:
            m = re.search(r"(?im)^\s*sitemap:\s*(\S+)", robots_txt)
            if m:
                try:
                    sm = await c.get(m.group(1), timeout=8)
                    sitemap_ok = sm.status_code == 200
                except httpx.HTTPError:
                    pass
        checks["robots_txt"] = robots_ok
        checks["sitemap_xml"] = sitemap_ok
        checks["robots_blocks_all"] = robots_blocks_all(robots_txt)

    p = _Parser()
    try:
        p.feed(html)
    except Exception:  # noqa: BLE001 - zepsuty HTML
        pass
    title = re.sub(r"\s+", " ", p.title).strip()
    desc = p.meta.get("description", "").strip()
    mixed = sorted({x for x in p.resources if x.lower().startswith("http://")}) if https_final else []
    checks.update({
        "title": title, "title_len": len(title), "meta_description": desc, "description_len": len(desc),
        "h1_count": p.h1, "h1": [re.sub(r"\s+", " ", t).strip()[:100] for t in p.h1_texts][:3],
        "images": p.imgs, "images_without_alt": p.imgs_no_alt, "images_without_size": p.imgs_no_dims, "lazy_images": p.lazy,
        "viewport": bool(p.meta.get("viewport")), "canonical": p.canonical, "lang": p.lang,
        "og_tags": sorted(k for k in p.og if k.startswith("og:")), "twitter_card": bool(p.og.get("twitter:card")),
        "scripts": p.scripts, "render_blocking_scripts": p.scripts_blocking, "stylesheets": p.styles,
        "mixed_content": mixed[:20], "favicon": p.icon, "noindex": "noindex" in p.meta.get("robots", "").lower(),
        "hsts": "strict-transport-security" in headers, "cache_control": headers.get("cache-control", ""),
    })

    # ---- ocena
    if r.status_code >= 400:
        _issue(issues, 40, "krytyczne", f"Strona zwraca błąd HTTP {r.status_code}", "Napraw błąd serwera/ścieżki – strona musi zwracać 200.")
    if not https_final:
        _issue(issues, 15, "krytyczne", "Strona nie działa po HTTPS", "Włącz certyfikat SSL (np. Let's Encrypt w panelu hostingu) i przekierowanie 301 na https.")
    elif http_redirect is False:
        _issue(issues, 6, "ważne", "Wersja http:// nie przekierowuje na https://", "Dodaj przekierowanie 301 z http na https (.htaccess / ustawienia hostingu / Cloudflare).")
    if not checks["hsts"] and https_final:
        _issue(issues, 2, "drobne", "Brak nagłówka HSTS", "Dodaj Strict-Transport-Security: max-age=31536000 (po upewnieniu się, że cała strona działa na https).")
    if mixed:
        _issue(issues, 6, "ważne", f"Mieszana treść: {len(mixed)} zasobów ładowanych przez http://", "Zmień adresy obrazków/skryptów na https:// lub względne.")
    if ttfb > 1500:
        _issue(issues, 10, "ważne", f"Wolna odpowiedź serwera (TTFB ok. {ttfb} ms)", "Włącz cache strony (np. LiteSpeed Cache/WP Rocket), sprawdź hosting/PHP 8.x, użyj CDN.")
    elif ttfb > 800:
        _issue(issues, 5, "średnie", f"Odpowiedź serwera mogłaby być szybsza (TTFB ok. {ttfb} ms)", "Cache po stronie serwera, nowszy PHP, CDN (Cloudflare).")
    kb = len(body) / 1024
    if kb > 500:
        _issue(issues, 6, "średnie", f"Duży dokument HTML ({kb:.0f} KB)", "Ogranicz inline CSS/JS i wbudowane dane, usuń zbędne sekcje/wtyczki page-buildera.")
    elif kb > 200:
        _issue(issues, 3, "drobne", f"Spory dokument HTML ({kb:.0f} KB)", "Sprawdź, czy page builder nie generuje nadmiarowego kodu.")
    if not checks["compression"] and kb > 20:
        _issue(issues, 4, "średnie", "Brak kompresji (gzip/brotli)", "Włącz kompresję na serwerze/hostingu lub w Cloudflare.")
    if not title:
        _issue(issues, 10, "krytyczne", "Brak tytułu strony (<title>)", "Dodaj unikalny tytuł 30–60 znaków z główną frazą i nazwą marki.")
    elif len(title) < 25 or len(title) > 65:
        _issue(issues, 4, "średnie", f"Tytuł ma {len(title)} znaków (zalecane 30–60)", "Przeredaguj tytuł: fraza kluczowa + wyróżnik + marka, maks. ~60 znaków.")
    if not desc:
        _issue(issues, 8, "ważne", "Brak meta description", "Dodaj opis 120–160 znaków zachęcający do kliknięcia (np. w Yoast/Rank Math).")
    elif len(desc) < 70 or len(desc) > 170:
        _issue(issues, 3, "drobne", f"Meta description ma {len(desc)} znaków (zalecane 120–160)", "Skróć/wydłuż opis do ok. 150 znaków z wezwaniem do działania.")
    if p.h1 == 0:
        _issue(issues, 8, "ważne", "Brak nagłówka H1", "Dodaj jeden H1 opisujący główny temat strony.")
    elif p.h1 > 1:
        _issue(issues, 3, "drobne", f"Kilka nagłówków H1 ({p.h1})", "Zostaw jeden H1, pozostałe zmień na H2/H3.")
    if p.imgs_no_alt:
        _issue(issues, min(8, 2 + p.imgs_no_alt), "średnie", f"{p.imgs_no_alt} z {p.imgs} obrazków bez atrybutu alt",
               "Uzupełnij teksty alternatywne (opis zdjęcia) – dostępność i SEO grafiki.")
    if p.imgs >= 6 and p.lazy == 0 and "loading=\"lazy\"" not in html:
        _issue(issues, 3, "drobne", "Obrazki bez lazy loading", "Dodaj loading=\"lazy\" do obrazków poniżej pierwszego ekranu, użyj WebP/AVIF.")
    if not checks["viewport"]:
        _issue(issues, 10, "krytyczne", "Brak meta viewport – strona nie jest przystosowana do telefonów",
               "Dodaj <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">.")
    if not p.canonical:
        _issue(issues, 3, "drobne", "Brak linku canonical", "Dodaj <link rel=\"canonical\"> wskazujący docelowy adres strony.")
    if not p.lang:
        _issue(issues, 2, "drobne", "Brak atrybutu lang w <html>", "Ustaw <html lang=\"pl\">.")
    og_missing = [k for k in ("og:title", "og:description", "og:image") if k not in p.og]
    if og_missing:
        _issue(issues, 4 if len(og_missing) == 3 else 2, "średnie", f"Brak tagów Open Graph: {', '.join(og_missing)}",
               "Dodaj og:title, og:description i og:image (1200×630) – ładny podgląd linku na FB/IG/Messenger.")
    if not robots_ok:
        _issue(issues, 3, "drobne", "Brak pliku robots.txt", "Dodaj robots.txt z linią Sitemap: https://twojadomena/sitemap.xml.")
    if checks["robots_blocks_all"]:
        _issue(issues, 20, "krytyczne", "robots.txt blokuje całą stronę (Disallow: /)", "Usuń Disallow: / – strona jest niewidoczna dla Google.")
    if checks["noindex"]:
        _issue(issues, 20, "krytyczne", "Strona ma meta robots noindex", "Usuń noindex (w WordPress: Ustawienia → Czytanie → odznacz blokadę wyszukiwarek).")
    if not sitemap_ok:
        _issue(issues, 4, "średnie", "Brak sitemap.xml", "Wygeneruj mapę strony (Yoast/Rank Math/wtyczka) i zgłoś ją w Google Search Console.")
    if p.scripts_blocking > 3:
        _issue(issues, 4, "średnie", f"{p.scripts_blocking} skryptów blokuje renderowanie", "Dodaj defer/async do skryptów, usuń nieużywane wtyczki.")
    if not p.icon:
        _issue(issues, 1, "drobne", "Brak favicony", "Dodaj ikonę strony (favicon 512×512 + apple-touch-icon).")
    score = max(0, min(100, 100 + sum(i["punkty"] for i in issues)))
    order = {"krytyczne": 0, "ważne": 1, "średnie": 2, "drobne": 3}
    issues.sort(key=lambda i: (order.get(i["waga"], 9), i["punkty"]))
    grade = "świetnie" if score >= 90 else "dobrze" if score >= 75 else "do poprawy" if score >= 50 else "słabo"
    result = {"url": url, "ok": True, "score": score, "ocena": grade, "sprawdzono": db.now_str(), "dane": checks,
              "problemy": issues,
              "uwaga": "Audyt podstawowy (HTML + nagłówki). Pełne Core Web Vitals sprawdzisz w PageSpeed Insights."}
    try:
        site = find_site(url)
    except ValueError:
        site = None
    db.insert("web_audits", {"site_id": site["id"] if site else None, "url": url, "score": score,
                             "result": json.dumps(result, ensure_ascii=False), "created": db.now_str()})
    if site:
        db.update("web_sites", site["id"], {"last_audit_score": score, "last_audit": db.now_str()})
    return result


# ================================================================ CRUD
def _clean(payload: dict) -> dict:
    data = {k: v for k, v in payload.items() if k in FIELDS}
    for k in ("hosting_renewal", "domain_expiry", "ssl_expiry"):
        if k in data:
            data[k] = (data[k] or "")[:10] or None
    if "monthly_fee" in data:
        data["monthly_fee"] = float(data["monthly_fee"] or 0)
    if "project_id" in data:
        data["project_id"] = int(data["project_id"]) if str(data["project_id"] or "").strip() else None
    if "active" in data:
        data["active"] = 1 if data["active"] in (True, 1, "1", "true", "on") else 0
    if "url" in data:
        data["url"] = normalize_url(data["url"])
    return data


def add_site(payload: dict) -> dict:
    data = _clean(payload)
    if not data.get("url"):
        raise ValueError("Podaj adres strony")
    dup = db.one("SELECT id FROM web_sites WHERE url = ?", (data["url"],))
    if dup:
        db.update("web_sites", dup["id"], {k: v for k, v in data.items() if v not in (None, "")})
        return {"ok": True, "id": dup["id"], "zaktualizowano": True}
    data.setdefault("name", _host(data["url"]).removeprefix("www."))
    sid = db.insert("web_sites", {"active": 1, **data, "created": db.now_str()})
    return {"ok": True, "id": sid}


def list_sites(include_inactive: bool = False) -> list[dict]:
    q = "SELECT * FROM web_sites" + ("" if include_inactive else " WHERE active = 1") + " ORDER BY active DESC, name"
    return [_site_out(s) for s in db.query(q)]


async def check_site(ref) -> dict:
    try:
        site = find_site(ref)
    except ValueError:
        site = None
    if not site:
        url = normalize_url(str(ref))
        res = await probe(url)
        host = _host(url)
        extra = {}
        if url.startswith("https://"):
            extra["ssl"] = await asyncio.to_thread(ssl_expiry, host, urlparse(url).port or 443)
        return {"url": url, **res, **extra, "info": "Strony nie ma na liście monitorowanych – dodaj ją add_site."}
    async with httpx.AsyncClient(follow_redirects=True, timeout=TIMEOUT, headers={"User-Agent": UA}) as client:
        res = await _check_site(site, client)
    exp = await refresh_expiry(db.one("SELECT * FROM web_sites WHERE id = ?", (site["id"],)))
    return {**res, **exp, "site": _site_out(db.one("SELECT * FROM web_sites WHERE id = ?", (site["id"],)))}


# ================================================================ monitoring (alerty)
def alerts() -> list[dict]:
    out = []
    try:
        sites = db.query("SELECT * FROM web_sites WHERE active = 1")
    except Exception:  # noqa: BLE001
        return []
    for s in sites:
        name = s.get("name") or _host(s["url"])
        if (s.get("consecutive_failures") or 0) >= 2:
            out.append({"key": f"web_down_{s['id']}", "severity": "critical", "title": f"Strona nie działa: {name}",
                        "body": f"{s['url']} – {s.get('last_error') or 'brak odpowiedzi'} (od {(s.get('down_since') or '')[:16].replace('T', ' ')})",
                        "suggestion": "Sprawdź panel hostingu (limity, opłacenie), DNS i certyfikat; daj znać klientowi, jeśli to potrwa."})
        if s.get("ssl_error"):
            out.append({"key": f"web_ssl_err_{s['id']}", "severity": "warn", "title": f"Problem z certyfikatem SSL: {name}",
                        "body": s["ssl_error"], "suggestion": "Odnów/wystaw certyfikat (Let's Encrypt w panelu hostingu) i sprawdź, czy obejmuje www."})
        d = _days_left(s.get("ssl_expiry"))
        if d is not None and d < SSL_WARN_DAYS:
            out.append({"key": f"web_ssl_{s['id']}", "severity": "critical" if d < 3 else "warn",
                        "title": f"Certyfikat SSL {name} " + ("wygasł" if d < 0 else f"wygasa za {d} dni"),
                        "body": f"{s['url']} · ważny do {s['ssl_expiry']}",
                        "suggestion": "Sprawdź automatyczne odnawianie Let's Encrypt w panelu hostingu albo odnów certyfikat ręcznie."})
        d = _days_left(s.get("domain_expiry"))
        if d is not None and d < DOMAIN_WARN_DAYS:
            out.append({"key": f"web_domain_{s['id']}", "severity": "critical" if d < 7 else "warn",
                        "title": f"Domena {registrable_domain(_host(s['url']))} " + ("wygasła" if d < 0 else f"wygasa za {d} dni"),
                        "body": f"Klient: {s.get('client') or '—'} · data: {s['domain_expiry']}",
                        "suggestion": "Odnów domenę u rejestratora (albo przypomnij klientowi i wystaw fakturę za odnowienie)."})
        d = _days_left(s.get("hosting_renewal"))
        if d is not None and d < HOSTING_WARN_DAYS:
            out.append({"key": f"web_hosting_{s['id']}", "severity": "critical" if d < 3 else "warn",
                        "title": f"Hosting {name} " + ("po terminie odnowienia" if d < 0 else f"do odnowienia za {d} dni"),
                        "body": f"Klient: {s.get('client') or '—'} · termin: {s['hosting_renewal']}",
                        "suggestion": "Opłać hosting/wystaw fakturę klientowi i zaktualizuj datę następnego odnowienia."})
    return out


# ================================================================ narzędzia agenta
_S = {"type": "string"}
TOOLS: list[dict] = [
    {"name": "add_site",
     "description": "Dodaje (lub aktualizuje) stronę klienta do monitoringu: adres, nazwa, klient, abonament zł/mies., "
                    "terminy odnowienia hostingu i domeny (YYYY-MM-DD). Strona będzie sprawdzana co 10 minut.",
     "input_schema": {"type": "object", "properties": {
         "url": _S, "name": _S, "client": _S, "project_id": {"type": "integer"}, "monthly_fee": {"type": "number"},
         "hosting_renewal": _S, "domain_expiry": _S, "notes": _S, "active": {"type": "boolean"}}, "required": ["url"]}},
    {"name": "list_sites",
     "description": "Lista monitorowanych stron klientów: status, czas odpowiedzi, uptime 7/30 dni, dni do wygaśnięcia SSL, "
                    "domeny i hostingu, abonament.",
     "input_schema": {"type": "object", "properties": {"include_inactive": {"type": "boolean"}}}},
    {"name": "check_site",
     "description": "Sprawdza stronę teraz: dostępność, kod HTTP, czas odpowiedzi, certyfikat SSL i datę wygaśnięcia domeny.",
     "input_schema": {"type": "object", "properties": {"url": {"type": "string", "description": "adres, nazwa lub id strony"}},
                      "required": ["url"]}},
    {"name": "audit_site",
     "description": "Audyt SEO i wydajności strony (bez zewnętrznych usług): HTTPS i przekierowania, TTFB, rozmiar HTML, kompresja, "
                    "title, meta description, H1, alt obrazków, viewport, canonical, Open Graph, robots.txt, sitemap.xml, "
                    "mieszana treść. Zwraca wynik 0–100 i listę problemów z poprawkami.",
     "input_schema": {"type": "object", "properties": {"url": _S}, "required": ["url"]}},
]
NAMES = {t["name"] for t in TOOLS}
LABELS = {"add_site": "Dodaję stronę do monitoringu", "list_sites": "Sprawdzam strony klientów",
          "check_site": "Sprawdzam stronę", "audit_site": "Robię audyt strony"}
CHANGES = {"add_site": "websites", "check_site": "websites", "audit_site": "websites"}


async def execute(name: str, args: dict):
    a = args or {}
    try:
        match name:
            case "add_site":
                r = add_site(a)
                site = db.one("SELECT * FROM web_sites WHERE id = ?", (r["id"],))
                try:
                    r["pierwsze_sprawdzenie"] = await check_site(site["id"])
                except Exception as e:  # noqa: BLE001
                    r["pierwsze_sprawdzenie"] = {"error": str(e)}
                return r
            case "list_sites":
                sites = list_sites(bool(a.get("include_inactive")))
                return {"strony": sites, "abonamenty_mies": round(sum(s["monthly_fee"] or 0 for s in sites if s["active"]), 2),
                        "alerty": alerts()}
            case "check_site":
                return await check_site(a.get("url"))
            case "audit_site":
                return await audit(a.get("url", ""))
    except ValueError as e:
        return {"ok": False, "error": str(e)}
    return {"error": f"Nieznane narzędzie {name}"}


# ================================================================ API
router = APIRouter(prefix="/api/websites")


@router.get("")
def api_list(all: bool = True):
    sites = list_sites(include_inactive=all)
    active = [s for s in sites if s["active"]]
    return {"sites": sites, "alerts": alerts(),
            "kpi": {"count": len(active), "up": sum(1 for s in active if s["up"]), "down": sum(1 for s in active if s["up"] is False),
                    "monthly_fees": round(sum(s["monthly_fee"] or 0 for s in active), 2),
                    "yearly_fees": round(12 * sum(s["monthly_fee"] or 0 for s in active), 2),
                    "avg_uptime_30d": round(sum(s["uptime_30d"] for s in active if s["uptime_30d"] is not None)
                                            / max(1, sum(1 for s in active if s["uptime_30d"] is not None)), 2)
                    if any(s["uptime_30d"] is not None for s in active) else None,
                    "expiring": sum(1 for s in active if any(x is not None and x < lim for x, lim in
                                                              ((s["ssl_days"], SSL_WARN_DAYS), (s["domain_days"], DOMAIN_WARN_DAYS),
                                                               (s["hosting_days"], HOSTING_WARN_DAYS))))}}


@router.post("")
async def api_add(payload: dict = Body(...)):
    try:
        r = add_site(payload)
    except ValueError as e:
        raise HTTPException(400, str(e))
    try:
        await check_site(r["id"])
    except Exception:  # noqa: BLE001 - zapis ważniejszy niż pierwsze sprawdzenie
        pass
    return r


@router.post("/check")
async def api_check_all():
    res = await check_all()
    return {"ok": True, "checked": len(res), "results": res}


@router.post("/audit")
async def api_audit(payload: dict = Body(...)):
    try:
        return await audit(payload.get("url", ""))
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/audits")
def api_audits(site_id: int | None = None, limit: int = 20):
    if site_id:
        rows = db.query("SELECT id, site_id, url, score, created FROM web_audits WHERE site_id = ? ORDER BY id DESC LIMIT ?",
                        (site_id, limit))
    else:
        rows = db.query("SELECT id, site_id, url, score, created FROM web_audits ORDER BY id DESC LIMIT ?", (limit,))
    return rows


@router.get("/audits/{aid}")
def api_audit_get(aid: int):
    r = db.one("SELECT * FROM web_audits WHERE id = ?", (aid,))
    if not r:
        raise HTTPException(404)
    return json.loads(r["result"] or "{}")


@router.get("/history/{site_id}")
def api_history(site_id: int, days: int = 7):
    days = max(1, min(30, days))
    since = (db.now() - timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%S")
    checks = db.query("SELECT ts, status, ms, ok, error FROM web_checks WHERE site_id = ? AND ts >= ? ORDER BY ts",
                      (site_id, since))
    daily = db.query("SELECT substr(ts,1,10) AS day, COUNT(*) AS n, SUM(ok) AS ok, CAST(AVG(CASE WHEN ok=1 THEN ms END) AS INTEGER) AS ms "
                     "FROM web_checks WHERE site_id = ? AND ts >= ? GROUP BY day ORDER BY day", (site_id, since))
    for d in daily:
        d["uptime"] = round(100.0 * (d["ok"] or 0) / d["n"], 2) if d["n"] else None
    incidents = [c for c in checks if not c["ok"]][-30:]
    chart = {"type": "line", "title": f"Czas odpowiedzi – {days} dni (ms)", "labels": [d["day"][5:] for d in daily],
             "series": [{"name": "śr. ms", "data": [d["ms"] or 0 for d in daily]}], "unit": "ms"} if daily else None
    return {"checks": checks[-500:], "daily": daily, "incidents": incidents, "chart": chart,
            "uptime_7d": _uptime(site_id, 7), "uptime_30d": _uptime(site_id, 30)}


@router.get("/{site_id}")
def api_get(site_id: int):
    s = db.one("SELECT * FROM web_sites WHERE id = ?", (site_id,))
    if not s:
        raise HTTPException(404)
    return _site_out(s)


@router.patch("/{site_id}")
def api_patch(site_id: int, payload: dict = Body(...)):
    try:
        data = _clean(payload)
    except ValueError as e:
        raise HTTPException(400, str(e))
    if not db.one("SELECT id FROM web_sites WHERE id = ?", (site_id,)):
        raise HTTPException(404)
    db.update("web_sites", site_id, data)
    return {"ok": True}


@router.post("/{site_id}/check")
async def api_check_one(site_id: int):
    try:
        return await check_site(site_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.delete("/{site_id}")
def api_delete(site_id: int):
    db.execute("DELETE FROM web_checks WHERE site_id = ?", (site_id,))
    db.execute("DELETE FROM web_audits WHERE site_id = ?", (site_id,))
    db.execute("DELETE FROM web_sites WHERE id = ?", (site_id,))
    return {"ok": True}
