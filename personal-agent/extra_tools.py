"""Dodatkowe umiejętności agenta: pogoda i złota godzina, oglądanie zdjęć z dysku, czytanie dokumentów,
informacje o plikach wideo, dokumenty (shot-listy, wyceny, briefy), kursy walut NBP, analiza krypto,
pamięć (recall) i wczytywanie umiejętności (load_skill)."""
import base64
import json
import math
import os
import shutil
import statistics
import subprocess
from datetime import date, datetime, timedelta
from pathlib import Path

import httpx

import config
import db
import file_indexer
import finance
import memory
import skills

_S = {"type": "string"}

TOOLS: list[dict] = [
    {
        "name": "weather_forecast",
        "description": "Prognoza pogody (do 16 dni) dla miejsca i dnia + wschód/zachód słońca, złota i niebieska godzina "
                       "liczone z pozycji słońca. Używaj przy planowaniu plenerów i dni zdjęciowych.",
        "input_schema": {"type": "object", "properties": {
            "place": {"type": "string", "description": "miasto lub miejsce, np. 'Kazimierz Dolny'; domyślnie miasto użytkownika"},
            "date": {"type": "string", "description": "YYYY-MM-DD (domyślnie dziś)"},
            "days": {"type": "integer", "description": "ile kolejnych dni (1-7)"},
        }},
    },
    {
        "name": "view_photos",
        "description": "Ogląda zdjęcia z dysku użytkownika (z zaindeksowanych folderów), żeby je ocenić, porównać lub wybrać "
                       "najlepsze. Podaj ścieżki plików albo folder (wtedy weźmie równomierną próbkę). Maks. 8 zdjęć na raz.",
        "input_schema": {"type": "object", "properties": {
            "paths": {"type": "array", "items": _S}, "folder": _S,
            "count": {"type": "integer", "description": "ile zdjęć z folderu (1-8)"},
            "offset": {"type": "integer", "description": "pomiń tyle pierwszych zdjęć z folderu (do przeglądania partiami)"},
        }},
    },
    {
        "name": "read_document",
        "description": "Czyta treść dokumentu z dysku (txt, md, csv, srt, json, pdf, docx) z zaindeksowanych folderów – "
                       "np. scenariusz, brief, umowa, tekst piosenki.",
        "input_schema": {"type": "object", "properties": {"path": _S, "offset": {"type": "integer"}}, "required": ["path"]},
    },
    {
        "name": "media_info",
        "description": "Szczegóły pliku wideo/audio z dysku: długość, rozdzielczość, fps, kodek, bitrate, dźwięk (ffprobe).",
        "input_schema": {"type": "object", "properties": {"path": _S}, "required": ["path"]},
    },
    {
        "name": "save_document",
        "description": "Zapisuje dokument w bibliotece Dokumenty (shot-lista, wycena, brief, call sheet, scenariusz, notatka). "
                       "Treść w markdown. Podaj id, aby zaktualizować istniejący dokument.",
        "input_schema": {"type": "object", "properties": {
            "title": _S, "content": _S, "id": {"type": "integer"},
            "kind": {"type": "string", "enum": ["shotlista", "wycena", "brief", "callsheet", "scenariusz", "umowa", "notatka", "inne"]},
            "project_id": {"type": "integer"},
        }, "required": ["title", "content"]},
    },
    {
        "name": "list_documents",
        "description": "Lista dokumentów z biblioteki (opcjonalnie wyszukiwanie po tytule/treści, rodzaju, projekcie).",
        "input_schema": {"type": "object", "properties": {"query": _S, "kind": _S, "project_id": {"type": "integer"}}},
    },
    {
        "name": "get_document",
        "description": "Pełna treść dokumentu z biblioteki.",
        "input_schema": {"type": "object", "properties": {"id": {"type": "integer"}}, "required": ["id"]},
    },
    {
        "name": "exchange_rate",
        "description": "Średni kurs waluty z NBP (tabela A) w PLN, np. EUR, USD, GBP, CHF.",
        "input_schema": {"type": "object", "properties": {"currency": _S}, "required": ["currency"]},
    },
    {
        "name": "crypto_analysis",
        "description": "Analiza techniczna monety (CoinGecko): SMA20/50, RSI14, zmiany 7/30/90 dni, zmienność, "
                       "maksymalne obsunięcie, min/max. coin = ID z CoinGecko (np. bitcoin).",
        "input_schema": {"type": "object", "properties": {"coin": _S, "days": {"type": "integer"}}, "required": ["coin"]},
    },
    {
        "name": "recall",
        "description": "Przeszukuje CAŁĄ pamięć: wszystkie wcześniejsze rozmowy (czat, Telegram, rozmowy głosowe), notatnik "
                       "pamięci, pomysły, projekty i dokumenty. Używaj, gdy użytkownik nawiązuje do czegoś wcześniejszego.",
        "input_schema": {"type": "object", "properties": {"query": _S}, "required": ["query"]},
    },
    {
        "name": "load_skill",
        "description": "Wczytuje pełne instrukcje umiejętności (z listy umiejętności w kontekście) przed wykonaniem zadania.",
        "input_schema": {"type": "object", "properties": {"name": _S}, "required": ["name"]},
    },
]
TOOLS += [
    {
        "name": "add_transaction",
        "description": "Zapisuje transakcję w finansach: przychód, koszt, stratę albo inwestycję. Używaj ZAWSZE, gdy użytkownik "
                       "wspomina, że coś zarobił, kupił, zapłacił, stracił albo zainwestował. Kwota dodatnia w PLN "
                       "(inne waluty przelicz exchange_rate i zapisz w opisie oryginał).",
        "input_schema": {"type": "object", "properties": {
            "type": {"type": "string", "enum": finance.TYPES},
            "amount": {"type": "number"},
            "date": {"type": "string", "description": "YYYY-MM-DD (domyślnie dziś)"},
            "area": {"type": "string", "enum": finance.AREAS},
            "category": {"type": "string", "description": "np. sprzedaż ubrań, zlecenie, sprzęt, reklama, hosting/domeny, krypto"},
            "description": _S,
            "project_id": {"type": "integer"},
        }, "required": ["type", "amount", "area"]},
    },
    {
        "name": "list_transactions",
        "description": "Lista transakcji (filtr: miesiąc YYYY-MM, typ, obszar, tekst).",
        "input_schema": {"type": "object", "properties": {"month": _S, "type": _S, "area": _S, "query": _S}},
    },
    {
        "name": "delete_transaction",
        "description": "Usuwa błędnie zapisaną transakcję (id z list_transactions).",
        "input_schema": {"type": "object", "properties": {"id": {"type": "integer"}}, "required": ["id"]},
    },
    {
        "name": "finance_report",
        "description": "Statystyki finansowe za miesiąc (YYYY-MM) albo rok (YYYY): przychody, koszty, straty, inwestycje, zysk, "
                       "marża, zmiana do poprzedniego okresu, podział na obszary i kategorie, trend 12 miesięcy oraz gotowe "
                       "wykresy (pole 'wykresy') do wklejenia jako bloki ```chart.",
        "input_schema": {"type": "object", "properties": {"month": _S, "year": _S}},
    },
    {
        "name": "add_holding",
        "description": "Dodaje lub aktualizuje pozycję w portfelu inwestycji (krypto, akcje/ETF, sprzęt, inne). Dla krypto "
                       "podaj coin_id z CoinGecko (np. bitcoin), żeby wycena była automatyczna. cost = ile łącznie zapłacono (PLN).",
        "input_schema": {"type": "object", "properties": {
            "id": {"type": "integer", "description": "podaj, aby zaktualizować"}, "name": _S,
            "kind": {"type": "string", "enum": ["krypto", "akcje/ETF", "sprzęt", "inne"]},
            "coin_id": _S, "quantity": {"type": "number"}, "cost": {"type": "number"},
            "current_value": {"type": "number", "description": "bieżąca wartość PLN (dla pozycji bez automatycznej wyceny)"},
            "notes": _S,
        }, "required": ["name"]},
    },
    {
        "name": "portfolio_status",
        "description": "Stan portfela inwestycji: wartość bieżąca (krypto z CoinGecko w PLN), zainwestowano, zysk/strata.",
        "input_schema": {"type": "object", "properties": {}},
    },
]

# Wyszukiwanie w sieci dla modelu lokalnego (Claude ma własne narzędzia serwerowe)
LOCAL_WEB_TOOLS = [
    {"name": "web_search", "description": "Wyszukuje w internecie (DuckDuckGo) i zwraca tytuły, linki i fragmenty.",
     "input_schema": {"type": "object", "properties": {"query": _S, "max_results": {"type": "integer"}}, "required": ["query"]}},
    {"name": "web_fetch", "description": "Pobiera stronę internetową i zwraca jej tekst (do przeczytania szczegółów).",
     "input_schema": {"type": "object", "properties": {"url": _S}, "required": ["url"]}},
]

NAMES = {t["name"] for t in TOOLS} | {t["name"] for t in LOCAL_WEB_TOOLS}

LABELS = {
    "weather_forecast": "Sprawdzam pogodę i światło", "view_photos": "Oglądam zdjęcia", "read_document": "Czytam dokument",
    "media_info": "Sprawdzam plik wideo", "save_document": "Zapisuję dokument", "list_documents": "Przeglądam dokumenty",
    "get_document": "Otwieram dokument", "exchange_rate": "Sprawdzam kurs NBP", "crypto_analysis": "Analizuję wykres",
    "recall": "Przypominam sobie", "load_skill": "Wczytuję umiejętność",
    "add_transaction": "Zapisuję w finansach", "list_transactions": "Przeglądam finanse",
    "delete_transaction": "Usuwam transakcję", "finance_report": "Liczę statystyki",
    "add_holding": "Aktualizuję portfel", "portfolio_status": "Wyceniam portfel",
}
CHANGES = {"save_document": "documents", "add_transaction": "finance", "delete_transaction": "finance", "add_holding": "finance"}

# Podstawowe współrzędne (działa bez internetu dla najpopularniejszych miejsc)
PLACES = {
    "warszawa": (52.2297, 21.0122), "kraków": (50.0647, 19.945), "krakow": (50.0647, 19.945), "gdańsk": (54.352, 18.6466),
    "wrocław": (51.1079, 17.0385), "poznań": (52.4064, 16.9252), "łódź": (51.7592, 19.456), "lublin": (51.2465, 22.5684),
    "katowice": (50.2649, 19.0238), "szczecin": (53.4285, 14.5528), "zakopane": (49.2992, 19.9496),
    "kazimierz dolny": (51.3236, 21.9480), "sopot": (54.4416, 18.5601), "toruń": (53.0138, 18.5984),
}
WMO = {0: "bezchmurnie", 1: "przeważnie słonecznie", 2: "częściowe zachmurzenie", 3: "pochmurno", 45: "mgła", 48: "szadź/mgła",
       51: "lekka mżawka", 53: "mżawka", 55: "gęsta mżawka", 61: "słaby deszcz", 63: "deszcz", 65: "ulewa",
       66: "marznący deszcz", 67: "marznący deszcz", 71: "słaby śnieg", 73: "śnieg", 75: "intensywny śnieg", 77: "ziarna śniegu",
       80: "przelotny deszcz", 81: "przelotne opady", 82: "gwałtowne opady", 85: "przelotny śnieg", 86: "śnieżyce",
       95: "burza", 96: "burza z gradem", 99: "silna burza z gradem"}


# ------------------------------------------------------------------ słońce (algorytm NOAA)
def _sun_elevation(lat: float, lon: float, when_utc: datetime) -> float:
    jd = when_utc.timestamp() / 86400.0 + 2440587.5
    t = (jd - 2451545.0) / 36525.0
    l0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360
    m = 357.52911 + t * (35999.05029 - 0.0001537 * t)
    e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t)
    mr = math.radians(m)
    c = (math.sin(mr) * (1.914602 - t * (0.004817 + 0.000014 * t)) + math.sin(2 * mr) * (0.019993 - 0.000101 * t)
         + math.sin(3 * mr) * 0.000289)
    true_long = l0 + c
    omega = 125.04 - 1934.136 * t
    app_long = true_long - 0.00569 - 0.00478 * math.sin(math.radians(omega))
    eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60
    eps = eps0 + 0.00256 * math.cos(math.radians(omega))
    decl = math.asin(math.sin(math.radians(eps)) * math.sin(math.radians(app_long)))
    y = math.tan(math.radians(eps / 2)) ** 2
    l0r = math.radians(l0)
    eq_time = 4 * math.degrees(y * math.sin(2 * l0r) - 2 * e * math.sin(mr) + 4 * e * y * math.sin(mr) * math.cos(2 * l0r)
                               - 0.5 * y * y * math.sin(4 * l0r) - 1.25 * e * e * math.sin(2 * mr))
    minutes = when_utc.hour * 60 + when_utc.minute + when_utc.second / 60
    tst = (minutes + eq_time + 4 * lon) % 1440
    ha = math.radians(tst / 4 - 180)
    lat_r = math.radians(lat)
    cos_zen = math.sin(lat_r) * math.sin(decl) + math.cos(lat_r) * math.cos(decl) * math.cos(ha)
    return 90 - math.degrees(math.acos(max(-1.0, min(1.0, cos_zen))))


def sun_times(lat: float, lon: float, day: date) -> dict:
    """Wschód/zachód, złota godzina (słońce -4°…+6°) i niebieska godzina (-6°…-4°), czas lokalny."""
    from zoneinfo import ZoneInfo
    tz = config.TZ
    start = datetime(day.year, day.month, day.day, tzinfo=tz)
    prev = None
    events: dict[str, list[str]] = {}
    for minute in range(0, 24 * 60 + 1, 2):
        local = start + timedelta(minutes=minute)
        el = _sun_elevation(lat, lon, local.astimezone(ZoneInfo("UTC")))
        if prev is not None:
            for name, thr in (("-6", -6), ("-4", -4), ("horizon", -0.833), ("+6", 6)):
                if (prev < thr) != (el < thr):
                    events.setdefault(name, []).append(local.strftime("%H:%M"))
        prev = el
    def pick(name, i):
        lst = events.get(name, [])
        return lst[i] if len(lst) > i else None
    sunrise, sunset = pick("horizon", 0), pick("horizon", 1)
    return {
        "wschod": sunrise, "zachod": sunset,
        "niebieska_godzina_rano": f"{pick('-6', 0)}–{pick('-4', 0)}" if pick("-6", 0) else None,
        "zlota_godzina_rano": f"{pick('-4', 0)}–{pick('+6', 0)}" if pick("+6", 0) else None,
        "zlota_godzina_wieczor": f"{pick('+6', 1)}–{pick('-4', 1)}" if pick("+6", 1) else None,
        "niebieska_godzina_wieczor": f"{pick('-4', 1)}–{pick('-6', 1)}" if pick("-6", 1) else None,
    }


async def _geocode(place: str) -> dict:
    key = place.strip().lower()
    if key in PLACES:
        lat, lon = PLACES[key]
        return {"name": place.strip().title(), "lat": lat, "lon": lon}
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get("https://geocoding-api.open-meteo.com/v1/search",
                             params={"name": place, "count": 1, "language": "pl", "format": "json"})
        r.raise_for_status()
        res = (r.json().get("results") or [])
    if not res:
        raise ValueError(f"Nie znam miejsca: {place}")
    g = res[0]
    return {"name": ", ".join(x for x in [g.get("name"), g.get("admin1"), g.get("country")] if x),
            "lat": g["latitude"], "lon": g["longitude"]}


async def weather(place: str | None, day: str | None, days: int = 1) -> dict:
    loc = await _geocode(place or config.LOCATION)
    d0 = date.fromisoformat(day) if day else db.now().date()
    days = max(1, min(int(days or 1), 7))
    out = {"miejsce": loc["name"], "dni": []}
    forecast = {}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get("https://api.open-meteo.com/v1/forecast", params={
                "latitude": loc["lat"], "longitude": loc["lon"], "timezone": config.TIMEZONE,
                "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,"
                         "precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,cloud_cover_mean,uv_index_max",
                "hourly": "cloud_cover,precipitation_probability,temperature_2m",
                "start_date": d0.isoformat(), "end_date": (d0 + timedelta(days=days - 1)).isoformat(),
            })
            r.raise_for_status()
            forecast = r.json()
    except Exception as e:  # noqa: BLE001 - słońce liczymy lokalnie nawet bez prognozy
        out["uwaga"] = f"Prognoza niedostępna ({type(e).__name__}); godziny słońca policzone lokalnie."
    daily = forecast.get("daily", {})
    hourly = forecast.get("hourly", {})
    for i in range(days):
        d = d0 + timedelta(days=i)
        entry = {"data": d.isoformat(), **sun_times(loc["lat"], loc["lon"], d)}
        if daily.get("time") and i < len(daily["time"]):
            g = lambda k: (daily.get(k) or [None] * (i + 1))[i]  # noqa: E731
            entry.update({
                "pogoda": WMO.get(g("weather_code"), g("weather_code")),
                "temp_max": g("temperature_2m_max"), "temp_min": g("temperature_2m_min"),
                "szansa_opadow_%": g("precipitation_probability_max"), "opady_mm": g("precipitation_sum"),
                "wiatr_max_kmh": g("wind_speed_10m_max"), "porywy_kmh": g("wind_gusts_10m_max"),
                "zachmurzenie_%": g("cloud_cover_mean"), "uv": g("uv_index_max"),
            })
            hours = {}
            for t, cc, pp, tt in zip(hourly.get("time", []), hourly.get("cloud_cover", []),
                                     hourly.get("precipitation_probability", []), hourly.get("temperature_2m", [])):
                if t.startswith(d.isoformat()) and t[11:13] in ("06", "09", "12", "15", "18", "21"):
                    hours[t[11:16]] = {"chmury_%": cc, "opady_%": pp, "temp": tt}
            entry["godzinowo"] = hours
        out["dni"].append(entry)
    return out


# ------------------------------------------------------------------ pliki
def _indexed(path: str) -> bool:
    return file_indexer.is_indexed(path) and os.path.exists(path)


def view_photos(paths: list[str] | None, folder: str | None, count: int = 6, offset: int = 0) -> list[dict]:
    count = max(1, min(int(count or 6), 8))
    chosen: list[str] = []
    if paths:
        chosen = [p for p in paths if _indexed(p)][:8]
    elif folder:
        rows = db.query("SELECT path FROM files WHERE folder = ? AND kind IN ('zdjecie','raw') ORDER BY name", (folder,))
        if not rows:
            rows = db.query("SELECT path FROM files WHERE folder LIKE ? AND kind IN ('zdjecie','raw') ORDER BY path",
                            (f"%{folder}%",))
        # przy RAW+JPG bierz JPG (szybciej, ta sama klatka)
        seen, uniq = set(), []
        for r in rows:
            stem = os.path.splitext(os.path.basename(r["path"]))[0]
            if stem not in seen:
                seen.add(stem)
                uniq.append(r["path"])
        uniq = uniq[int(offset or 0):]
        step = max(1, len(uniq) // count)
        chosen = uniq[::step][:count]
    if not chosen:
        return [{"type": "text", "text": "Nie znalazłem zdjęć (sprawdź ścieżkę/folder przez search_files)."}]
    content: list[dict] = []
    for i, p in enumerate(chosen, 1):
        data = file_indexer.thumbnail(p, 1024)
        exif = db.one("SELECT camera, lens, focal, aperture, shutter, iso, taken FROM files WHERE path = ?", (p,)) or {}
        meta = ", ".join(str(v) for v in exif.values() if v)
        content.append({"type": "text", "text": f"Zdjęcie {i}: {p}" + (f" ({meta})" if meta else "")})
        if data:
            content.append({"type": "image", "source": {"type": "base64", "media_type": "image/jpeg",
                                                          "data": base64.b64encode(data).decode()}})
        else:
            content.append({"type": "text", "text": "(brak podglądu tego pliku)"})
    return content


def read_document(path: str, offset: int = 0) -> dict:
    if not _indexed(path):
        return {"error": "Plik nie jest w zaindeksowanych folderach."}
    ext = Path(path).suffix.lower()
    if ext == ".pdf":
        from pypdf import PdfReader
        reader = PdfReader(path)
        text = "\n\n".join(f"[strona {i + 1}]\n{p.extract_text() or ''}" for i, p in enumerate(reader.pages[:200]))
    elif ext == ".docx":
        import docx
        d = docx.Document(path)
        text = "\n".join(p.text for p in d.paragraphs)
        for t in d.tables:
            text += "\n" + "\n".join(" | ".join(c.text for c in row.cells) for row in t.rows)
    elif ext in {".txt", ".md", ".csv", ".srt", ".json", ".xml", ".html", ".htm", ".log", ".vtt", ".fcpxml", ".xmp"}:
        text = Path(path).read_text(encoding="utf-8", errors="replace")
    else:
        return {"error": f"Nie umiem czytać plików {ext}. Obsługuję: pdf, docx, txt, md, csv, srt, json."}
    offset = max(0, int(offset or 0))
    chunk = text[offset:offset + 40000]
    return {"path": path, "length": len(text), "offset": offset, "text": chunk,
            "next_offset": offset + 40000 if offset + 40000 < len(text) else None}


def media_info(path: str) -> dict:
    if not _indexed(path):
        return {"error": "Plik nie jest w zaindeksowanych folderach."}
    if not shutil.which("ffprobe"):
        return {"error": "Brak ffprobe – zainstaluj FFmpeg."}
    out = subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", path],
                         capture_output=True, text=True, timeout=30)
    data = json.loads(out.stdout or "{}")
    fmt = data.get("format", {})
    res = {"plik": path, "dlugosc_s": round(float(fmt.get("duration", 0) or 0), 2),
           "rozmiar_MB": round(int(fmt.get("size", 0) or 0) / 1e6, 1),
           "bitrate_Mbps": round(int(fmt.get("bit_rate", 0) or 0) / 1e6, 1), "kontener": fmt.get("format_long_name")}
    for s in data.get("streams", []):
        if s.get("codec_type") == "video" and "wideo" not in res:
            num, _, den = (s.get("avg_frame_rate") or "0/1").partition("/")
            fps = round(float(num) / float(den), 3) if den and float(den) else None
            res["wideo"] = {"kodek": s.get("codec_name"), "profil": s.get("profile"), "rozdzielczosc": f"{s.get('width')}x{s.get('height')}",
                            "fps": fps, "piksele": s.get("pix_fmt"), "kolor": s.get("color_transfer") or s.get("color_space")}
        elif s.get("codec_type") == "audio" and "audio" not in res:
            res["audio"] = {"kodek": s.get("codec_name"), "kanaly": s.get("channels"), "probkowanie_Hz": s.get("sample_rate")}
    return res


# ------------------------------------------------------------------ waluty i krypto
async def exchange_rate(currency: str) -> dict:
    code = currency.strip().lower()[:3]
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"https://api.nbp.pl/api/exchangerates/rates/a/{code}/", params={"format": "json"})
        r.raise_for_status()
        j = r.json()
    rate = j["rates"][0]
    return {"waluta": j.get("code"), "nazwa": j.get("currency"), "kurs_PLN": rate["mid"], "data": rate["effectiveDate"],
            "tabela": rate.get("no")}


def _rsi(prices: list[float], period: int = 14) -> float | None:
    if len(prices) <= period:
        return None
    gains, losses = [], []
    for a, b in zip(prices[-period - 1:-1], prices[-period:]):
        diff = b - a
        gains.append(max(diff, 0))
        losses.append(max(-diff, 0))
    avg_gain, avg_loss = sum(gains) / period, sum(losses) / period
    if avg_loss == 0:
        return 100.0
    return round(100 - 100 / (1 + avg_gain / avg_loss), 1)


def analyze_prices(prices: list[float]) -> dict:
    def sma(n):
        return round(sum(prices[-n:]) / n, 4) if len(prices) >= n else None
    def change(n):
        return round((prices[-1] / prices[-n - 1] - 1) * 100, 2) if len(prices) > n else None
    rets = [b / a - 1 for a, b in zip(prices, prices[1:]) if a]
    peak, mdd = prices[0], 0.0
    for p in prices:
        peak = max(peak, p)
        mdd = min(mdd, p / peak - 1)
    last = prices[-1]
    s20, s50 = sma(20), sma(50)
    trend = None
    if s20 and s50:
        trend = "wzrostowy" if last > s20 > s50 else "spadkowy" if last < s20 < s50 else "boczny/mieszany"
    return {"cena": last, "sma20": s20, "sma50": s50, "trend": trend, "rsi14": _rsi(prices),
            "zmiana_7d_%": change(7), "zmiana_30d_%": change(30), "zmiana_90d_%": change(90),
            "zmiennosc_roczna_%": round(statistics.pstdev(rets) * math.sqrt(365) * 100, 1) if len(rets) > 2 else None,
            "max_obsuniecie_%": round(mdd * 100, 1), "min": min(prices), "max": max(prices)}


async def crypto_analysis(coin: str, days: int = 120) -> dict:
    days = max(30, min(int(days or 120), 365))
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(f"https://api.coingecko.com/api/v3/coins/{coin.lower().strip()}/market_chart",
                             params={"vs_currency": "usd", "days": days, "interval": "daily"})
        r.raise_for_status()
        prices = [p[1] for p in r.json().get("prices", [])]
    if len(prices) < 15:
        return {"error": "Za mało danych"}
    return {"coin": coin, "waluta": "USD", "okres_dni": days, **analyze_prices(prices),
            "uwaga": "Dane i wskaźniki techniczne, nie porada inwestycyjna."}


# ------------------------------------------------------------------ dokumenty
def save_document(a: dict) -> dict:
    data = {k: a[k] for k in ("title", "content", "kind", "project_id") if a.get(k) is not None}
    data["updated"] = db.now_str()
    if a.get("id"):
        db.update("documents", int(a["id"]), data)
        return {"ok": True, "id": a["id"]}
    return {"ok": True, "id": db.insert("documents", {"kind": "notatka", **data, "created": db.now_str()})}


def list_documents(a: dict) -> list[dict]:
    where, p = ["1=1"], []
    if a.get("query"):
        where.append("(title LIKE ? OR content LIKE ?)")
        p += [f"%{a['query']}%"] * 2
    if a.get("kind"):
        where.append("kind = ?")
        p.append(a["kind"])
    if a.get("project_id"):
        where.append("project_id = ?")
        p.append(a["project_id"])
    return db.query(f"SELECT id, title, kind, project_id, created, updated, length(content) AS chars FROM documents "
                    f"WHERE {' AND '.join(where)} ORDER BY COALESCE(updated, created) DESC LIMIT 50", p)


# ------------------------------------------------------------------ sieć (model lokalny)
async def web_search(query: str, max_results: int = 6) -> list[dict]:
    import asyncio
    try:
        from ddgs import DDGS
    except ImportError:
        return [{"error": "Brak biblioteki ddgs (pip install ddgs)"}]
    def run():
        return list(DDGS().text(query, region="pl-pl", max_results=max(1, min(int(max_results or 6), 10))))
    rows = await asyncio.to_thread(run)
    return [{"title": r.get("title"), "url": r.get("href"), "snippet": r.get("body")} for r in rows]


async def web_fetch(url: str) -> dict:
    import html as htmlmod
    import re
    if not url.startswith(("http://", "https://")):
        return {"error": "Podaj pełny adres http(s)://"}
    async with httpx.AsyncClient(timeout=20, follow_redirects=True,
                                 headers={"User-Agent": "Mozilla/5.0 (StudioAgent)"}) as client:
        r = await client.get(url)
    text = re.sub(r"(?is)<(script|style|noscript|svg).*?</\1>", " ", r.text)
    text = re.sub(r"(?s)<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", htmlmod.unescape(text)).strip()
    return {"url": str(r.url), "status": r.status_code, "text": text[:20000]}


# ------------------------------------------------------------------ wykonanie
async def execute(name: str, a: dict):
    import asyncio
    match name:
        case "weather_forecast":
            return await weather(a.get("place"), a.get("date"), a.get("days", 1))
        case "view_photos":
            return await asyncio.to_thread(view_photos, a.get("paths"), a.get("folder"), a.get("count", 6), a.get("offset", 0))
        case "read_document":
            return await asyncio.to_thread(read_document, a["path"], a.get("offset", 0))
        case "media_info":
            return await asyncio.to_thread(media_info, a["path"])
        case "save_document":
            return save_document(a)
        case "list_documents":
            return list_documents(a)
        case "get_document":
            return db.one("SELECT * FROM documents WHERE id = ?", (a["id"],)) or {"error": "Nie ma takiego dokumentu"}
        case "exchange_rate":
            return await exchange_rate(a["currency"])
        case "crypto_analysis":
            return await crypto_analysis(a["coin"], a.get("days", 120))
        case "recall":
            return memory.recall(a["query"])
        case "add_transaction":
            data = {k: a[k] for k in ("type", "amount", "area", "category", "description", "project_id") if a.get(k) is not None}
            data["amount"] = abs(float(data["amount"]))
            data["date"] = a.get("date") or db.now().strftime("%Y-%m-%d")
            tid = db.insert("transactions", {"currency": "PLN", **data, "created": db.now_str()})
            return {"ok": True, "id": tid, "zapisano": data}
        case "list_transactions":
            where, p = ["1=1"], []
            if a.get("month"):
                where.append("substr(date,1,7) = ?"); p.append(a["month"])
            for k in ("type", "area"):
                if a.get(k):
                    where.append(f"{k} = ?"); p.append(a[k])
            if a.get("query"):
                where.append("(description LIKE ? OR category LIKE ?)"); p += [f"%{a['query']}%"] * 2
            return db.query(f"SELECT * FROM transactions WHERE {' AND '.join(where)} ORDER BY date DESC, id DESC LIMIT 100", p)
        case "delete_transaction":
            db.execute("DELETE FROM transactions WHERE id = ?", (a["id"],))
            return {"ok": True}
        case "finance_report":
            return finance.report(a.get("month"), a.get("year"))
        case "add_holding":
            data = {k: a[k] for k in ("name", "kind", "coin_id", "quantity", "cost", "current_value", "notes") if a.get(k) is not None}
            if a.get("id"):
                db.update("holdings", int(a["id"]), data)
                return {"ok": True, "id": a["id"]}
            return {"ok": True, "id": db.insert("holdings", {"kind": "inne", **data, "created": db.now_str()})}
        case "portfolio_status":
            return await finance.portfolio()
        case "web_search":
            return await web_search(a["query"], a.get("max_results", 6))
        case "web_fetch":
            return await web_fetch(a["url"])
        case "load_skill":
            s = skills.get(a["name"])
            if not s:
                return {"error": "Nie ma takiej umiejętności", "dostepne": [x["id"] for x in skills.enabled()]}
            return {"name": s["name"], "instrukcje": s["body"]}
    return {"error": f"Nieznane narzędzie {name}"}
