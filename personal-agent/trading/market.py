"""Dane rynkowe: publiczne API Bybit v5 (bez klucza) + deterministyczny generator danych syntetycznych.

Dane syntetyczne są używane TYLKO gdy:
  * zmienna środowiskowa TRADING_DEMO_DATA=1 (tryb demo/offline), albo
  * pobranie z Bybit się nie udało I wywołujący jawnie przekazał allow_synthetic=True.
Każda odpowiedź ma pole "source": "bybit" | "synthetic" – UI musi to pokazać.

Świeca: {"t": start_ms, "o": open, "h": high, "l": low, "c": close, "v": volume}, rosnąco w czasie;
ostatnia świeca to zwykle świeca bieżąca (jeszcze niezamknięta).
"""
import logging
import math
import os
import re
import time

import httpx

log = logging.getLogger("trading.market")

BYBIT = "https://api.bybit.com"
CATEGORY = os.environ.get("TRADING_CATEGORY", "linear")  # linear = kontrakty USDT (long/short); spot jako zapas
DEFAULT_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "DOGEUSDT", "XRPUSDT", "LTCUSDT"]
INTERVAL_MIN = {"1": 1, "3": 3, "5": 5, "15": 15, "30": 30, "60": 60, "120": 120, "240": 240, "D": 1440, "W": 10080}
ALIASES = {"1m": "1", "3m": "3", "5m": "5", "15m": "15", "30m": "30", "1h": "60", "2h": "120", "4h": "240",
           "1d": "D", "d": "D", "1w": "W", "w": "W"}
INTERVAL_LABEL = {"1": "1m", "3": "3m", "5": "5m", "15": "15m", "30": "30m", "60": "1h", "120": "2h", "240": "4h",
                  "D": "1D", "W": "1W"}
_SYM = re.compile(r"^[A-Z0-9]{2,20}(USDT|USDC|USD)$")
_cache: dict[tuple, tuple[float, dict]] = {}
_client: httpx.AsyncClient | None = None


class MarketDataError(Exception):
    pass


def demo_mode() -> bool:
    return os.environ.get("TRADING_DEMO_DATA", "").strip().lower() in ("1", "true", "yes", "tak")


def norm_symbol(symbol: str | None) -> str:
    s = (symbol or "BTCUSDT").upper().replace("/", "").replace("-", "").replace(" ", "")
    if not s.endswith(("USDT", "USDC", "USD")):
        s += "USDT"
    if not _SYM.match(s):
        raise ValueError(f"Nieprawidłowy symbol: {symbol}")
    return s


def norm_interval(interval: str | int | None) -> str:
    iv = str(interval or "60").strip()
    iv = ALIASES.get(iv.lower(), iv)
    iv = "D" if iv.upper() == "D" else "W" if iv.upper() == "W" else iv
    if iv not in INTERVAL_MIN:
        raise ValueError(f"Nieobsługiwany interwał: {interval} (dostępne: 1, 5, 15, 60, 240, D)")
    return iv


def _http() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(base_url=BYBIT, timeout=10, headers={"User-Agent": "studio-agent/1.0"})
    return _client


# ---------------------------------------------------------------------------
# Bybit
# ---------------------------------------------------------------------------
async def _bybit_kline(symbol: str, interval: str, limit: int, end: int | None = None) -> list[dict]:
    last_err = None
    for cat in dict.fromkeys([CATEGORY, "spot"]):
        params = {"category": cat, "symbol": symbol, "interval": interval, "limit": min(1000, max(1, limit))}
        if end:
            params["end"] = end
        try:
            r = await _http().get("/v5/market/kline", params=params)
            r.raise_for_status()
            j = r.json()
            rows = (j.get("result") or {}).get("list") or []
            if j.get("retCode") != 0 or not rows:
                last_err = j.get("retMsg") or "brak danych"
                continue
            return [{"t": int(x[0]), "o": float(x[1]), "h": float(x[2]), "l": float(x[3]), "c": float(x[4]),
                     "v": float(x[5])} for x in reversed(rows)]
        except (httpx.HTTPError, ValueError, KeyError, IndexError) as e:
            last_err = f"{type(e).__name__}: {e}"
    raise MarketDataError(f"Bybit: {last_err}")


async def _bybit_tickers(symbols: list[str]) -> dict[str, dict]:
    r = await _http().get("/v5/market/tickers", params={"category": CATEGORY})
    r.raise_for_status()
    j = r.json()
    out = {}
    for t in (j.get("result") or {}).get("list") or []:
        if t.get("symbol") in symbols:
            last = float(t["lastPrice"])
            out[t["symbol"]] = {"symbol": t["symbol"], "price": last,
                                "change24h": round(float(t.get("price24hPcnt") or 0) * 100, 2),
                                "high24h": float(t.get("highPrice24h") or last), "low24h": float(t.get("lowPrice24h") or last),
                                "volume24h": float(t.get("turnover24h") or 0), "source": "bybit"}
    if not out:
        raise MarketDataError("Bybit: brak tickerów")
    return out


# ---------------------------------------------------------------------------
# Dane syntetyczne (deterministyczne: ten sam symbol + czas = ta sama cena)
# ---------------------------------------------------------------------------
_M = (1 << 64) - 1
BASE_PRICE = {"BTCUSDT": 95000.0, "ETHUSDT": 3400.0, "SOLUSDT": 180.0, "DOGEUSDT": 0.18, "XRPUSDT": 2.3,
              "LTCUSDT": 95.0, "BNBUSDT": 650.0, "ADAUSDT": 0.75}
DAILY_VOL = {"BTCUSDT": 0.025, "ETHUSDT": 0.032, "SOLUSDT": 0.045, "DOGEUSDT": 0.055, "XRPUSDT": 0.045, "LTCUSDT": 0.04}


def _h(x: int) -> float:
    x &= _M
    x = ((x ^ (x >> 33)) * 0xFF51AFD7ED558CCD) & _M
    x = ((x ^ (x >> 33)) * 0xC4CEB9FE1A85EC53) & _M
    x ^= x >> 33
    return x / 2.0 ** 64


def _seed(symbol: str) -> int:
    s = 1469598103934665603
    for ch in symbol.encode():
        s = ((s ^ ch) * 1099511628211) & _M
    return s


def _noise(seed: int, u: float) -> float:
    """Gładki szum wartości w [-1, 1]."""
    k = math.floor(u)
    f = u - k
    f = f * f * (3 - 2 * f)
    a = _h(seed ^ ((k * 0x9E3779B97F4A7C15) & _M)) * 2 - 1
    b = _h(seed ^ (((k + 1) * 0x9E3779B97F4A7C15) & _M)) * 2 - 1
    return a + (b - a) * f


# skale w minutach: od szumu minutowego po trendy kilkutygodniowe
_OCTAVES = [(3, 1.0), (20, 1.0), (120, 1.1), (720, 1.2), (2880, 1.3), (10080, 1.5), (43200, 1.6)]


def synthetic_price(symbol: str, t_min: float) -> float:
    seed = _seed(symbol)
    base = BASE_PRICE.get(symbol) or (1 + _h(seed) * 99)
    vol = DAILY_VOL.get(symbol, 0.04)
    x = 0.0
    for i, (scale, w) in enumerate(_OCTAVES):
        amp = vol * math.sqrt(scale / 1440) * w * 0.9
        x += amp * _noise(seed + i * 7919, t_min / scale)
    return base * math.exp(x)


def synthetic_candles(symbol: str, interval: str, limit: int = 200, end_ms: int | None = None) -> list[dict]:
    mins = INTERVAL_MIN[interval]
    now_min = (end_ms or time.time() * 1000) / 60000
    cur_start = math.floor(now_min / mins) * mins
    seed = _seed(symbol)
    vol = DAILY_VOL.get(symbol, 0.04)
    base = BASE_PRICE.get(symbol) or (1 + _h(seed) * 99)
    out = []
    for n in range(limit - 1, -1, -1):
        t0 = cur_start - n * mins
        t1 = min(t0 + mins, now_min) if n == 0 else t0 + mins
        steps = 8
        pts = [synthetic_price(symbol, t0 + (t1 - t0) * j / steps) for j in range(steps + 1)]
        k = int(t0)
        wick = vol * math.sqrt(mins / 1440) * 0.25
        o, c = pts[0], pts[-1]
        hi = max(pts) * (1 + _h(seed ^ k ^ 0xA5) * wick)
        lo = min(pts) * (1 - _h(seed ^ k ^ 0x5A) * wick)
        ret = abs(c / o - 1)
        v = (1e6 / base) * mins * (0.4 + _h(seed ^ k ^ 0x77)) * (1 + 60 * ret)
        out.append({"t": int(t0 * 60000), "o": o, "h": hi, "l": lo, "c": c, "v": v})
    return out


# ---------------------------------------------------------------------------
# API modułu
# ---------------------------------------------------------------------------
def _ttl(interval: str) -> float:
    return 8 if INTERVAL_MIN[interval] <= 5 else 20 if INTERVAL_MIN[interval] <= 60 else 60


async def get_candles(symbol: str, interval: str = "60", limit: int = 200, allow_synthetic: bool = False) -> dict:
    """Zwraca {"symbol","interval","source","candles":[...]} (rosnąco). Rzuca MarketDataError, gdy brak danych."""
    symbol, interval = norm_symbol(symbol), norm_interval(interval)
    limit = max(10, min(int(limit or 200), 5000))
    if demo_mode():
        return {"symbol": symbol, "interval": interval, "source": "synthetic",
                "candles": synthetic_candles(symbol, interval, limit)}
    key = (symbol, interval, limit)
    hit = _cache.get(key)
    if hit and hit[0] > time.time():
        return hit[1]
    try:
        candles: list[dict] = []
        end = None
        while len(candles) < limit:
            chunk = await _bybit_kline(symbol, interval, min(1000, limit - len(candles)), end)
            candles = chunk + candles
            if len(chunk) < min(1000, limit - len(candles) + len(chunk)):
                break
            end = chunk[0]["t"] - 1
        data = {"symbol": symbol, "interval": interval, "source": "bybit", "candles": candles[-limit:]}
        _cache[key] = (time.time() + _ttl(interval), data)
        return data
    except MarketDataError as e:
        if hit:  # lepsze nieco starsze prawdziwe dane niż nic
            return hit[1]
        if allow_synthetic:
            log.warning("Bybit niedostępny (%s) – dane syntetyczne dla %s", e, symbol)
            return {"symbol": symbol, "interval": interval, "source": "synthetic", "error": str(e),
                    "candles": synthetic_candles(symbol, interval, limit)}
        raise


async def get_prices(symbols: list[str] | None = None, allow_synthetic: bool = False) -> dict[str, dict]:
    """Ostatnie ceny: {symbol: {"price","change24h","source",...}}."""
    syms = [norm_symbol(s) for s in (symbols or DEFAULT_SYMBOLS)]
    if not demo_mode():
        key = ("tickers", tuple(sorted(syms)))
        hit = _cache.get(key)
        if hit and hit[0] > time.time():
            return hit[1]
        try:
            data = await _bybit_tickers(syms)
            _cache[key] = (time.time() + 5, data)
            missing = [s for s in syms if s not in data]
            if not missing:
                return data
        except (httpx.HTTPError, MarketDataError, ValueError, KeyError) as e:
            if not allow_synthetic:
                raise MarketDataError(f"Nie udało się pobrać cen z Bybit: {e}") from e
            data = {}
        if not allow_synthetic and missing:
            raise MarketDataError(f"Brak cen dla: {', '.join(missing)}")
    else:
        data = {}
    now_min = time.time() / 60
    for s in syms:
        if s not in data:
            p = synthetic_price(s, now_min)
            p24 = synthetic_price(s, now_min - 1440)
            data[s] = {"symbol": s, "price": p, "change24h": round((p / p24 - 1) * 100, 2), "source": "synthetic"}
    return data


async def get_price(symbol: str, allow_synthetic: bool = False) -> dict:
    s = norm_symbol(symbol)
    return (await get_prices([s], allow_synthetic=allow_synthetic))[s]
