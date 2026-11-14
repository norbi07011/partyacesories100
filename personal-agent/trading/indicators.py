"""Wskaźniki techniczne – czysty Python (bez numpy).

Serie są wyrównane do wejścia: ta sama długość, None tam, gdzie wskaźnik jeszcze się nie „rozgrzał”.
"""
from __future__ import annotations

import math

Series = list  # list[float | None]


def sma(values: list[float], n: int) -> Series:
    out: Series = [None] * len(values)
    s = 0.0
    for i, v in enumerate(values):
        s += v
        if i >= n:
            s -= values[i - n]
        if i >= n - 1:
            out[i] = s / n
    return out


def ema(values: list[float], n: int) -> Series:
    """EMA zainicjowana SMA z pierwszych n wartości (jak TradingView / Murphy)."""
    out: Series = [None] * len(values)
    if len(values) < n:
        return out
    k = 2 / (n + 1)
    e = sum(values[:n]) / n
    out[n - 1] = e
    for i in range(n, len(values)):
        e = values[i] * k + e * (1 - k)
        out[i] = e
    return out


def _ema_opt(values: Series, n: int) -> Series:
    """EMA serii z None na początku."""
    start = next((i for i, v in enumerate(values) if v is not None), None)
    out: Series = [None] * len(values)
    if start is None:
        return out
    part = ema([v for v in values[start:]], n)
    out[start:] = part
    return out


def rsi(closes: list[float], n: int = 14) -> Series:
    """RSI Wildera (0–100)."""
    out: Series = [None] * len(closes)
    if len(closes) <= n:
        return out
    gains = losses = 0.0
    for i in range(1, n + 1):
        d = closes[i] - closes[i - 1]
        gains += max(d, 0)
        losses += max(-d, 0)
    ag, al = gains / n, losses / n

    def val(g, l):
        if l == 0:
            return 100.0 if g > 0 else 50.0
        return 100 - 100 / (1 + g / l)

    out[n] = val(ag, al)
    for i in range(n + 1, len(closes)):
        d = closes[i] - closes[i - 1]
        ag = (ag * (n - 1) + max(d, 0)) / n
        al = (al * (n - 1) + max(-d, 0)) / n
        out[i] = val(ag, al)
    return out


def macd(closes: list[float], fast: int = 12, slow: int = 26, signal: int = 9) -> tuple[Series, Series, Series]:
    ef, es = ema(closes, fast), ema(closes, slow)
    line = [a - b if a is not None and b is not None else None for a, b in zip(ef, es)]
    sig = _ema_opt(line, signal)
    hist = [a - b if a is not None and b is not None else None for a, b in zip(line, sig)]
    return line, sig, hist


def bollinger(closes: list[float], n: int = 20, k: float = 2.0) -> tuple[Series, Series, Series]:
    mid = sma(closes, n)
    up: Series = [None] * len(closes)
    lo: Series = [None] * len(closes)
    for i in range(n - 1, len(closes)):
        w = closes[i - n + 1:i + 1]
        m = mid[i]
        sd = math.sqrt(sum((x - m) ** 2 for x in w) / n)
        up[i], lo[i] = m + k * sd, m - k * sd
    return up, mid, lo


def true_range(h: list[float], l: list[float], c: list[float]) -> list[float]:
    return [h[0] - l[0]] + [max(h[i] - l[i], abs(h[i] - c[i - 1]), abs(l[i] - c[i - 1])) for i in range(1, len(c))]


def atr(h: list[float], l: list[float], c: list[float], n: int = 14) -> Series:
    """ATR Wildera."""
    tr = true_range(h, l, c)
    out: Series = [None] * len(c)
    if len(c) < n:
        return out
    a = sum(tr[:n]) / n
    out[n - 1] = a
    for i in range(n, len(c)):
        a = (a * (n - 1) + tr[i]) / n
        out[i] = a
    return out


def adx(h: list[float], l: list[float], c: list[float], n: int = 14) -> Series:
    """ADX Wildera – siła trendu (>25 trend, <20 konsolidacja)."""
    size = len(c)
    out: Series = [None] * size
    if size < 2 * n + 1:
        return out
    tr = true_range(h, l, c)
    pdm = [0.0] + [max(h[i] - h[i - 1], 0) if h[i] - h[i - 1] > l[i - 1] - l[i] else 0.0 for i in range(1, size)]
    ndm = [0.0] + [max(l[i - 1] - l[i], 0) if l[i - 1] - l[i] > h[i] - h[i - 1] else 0.0 for i in range(1, size)]
    str_, sp, sn = sum(tr[1:n + 1]), sum(pdm[1:n + 1]), sum(ndm[1:n + 1])
    dx = []
    for i in range(n + 1, size + 1):
        if i > n + 1:
            str_ = str_ - str_ / n + tr[i - 1]
            sp = sp - sp / n + pdm[i - 1]
            sn = sn - sn / n + ndm[i - 1]
        pdi = 100 * sp / str_ if str_ else 0
        ndi = 100 * sn / str_ if str_ else 0
        dx.append(100 * abs(pdi - ndi) / (pdi + ndi) if pdi + ndi else 0)
    a = sum(dx[:n]) / n
    out[2 * n - 1] = a
    for j in range(n, len(dx)):
        a = (a * (n - 1) + dx[j]) / n
        out[n + j] = a
    return out


def vwap(candles: list[dict], session_ms: int = 86_400_000) -> Series:
    """VWAP sesyjny (reset o 00:00 UTC)."""
    out: Series = []
    pv = vv = 0.0
    day = None
    for k in candles:
        d = k["t"] // session_ms
        if d != day:
            day, pv, vv = d, 0.0, 0.0
        tp = (k["h"] + k["l"] + k["c"]) / 3
        pv += tp * k["v"]
        vv += k["v"]
        out.append(pv / vv if vv else tp)
    return out


def stoch_rsi(closes: list[float], n: int = 14, k: int = 3, d: int = 3) -> tuple[Series, Series]:
    r = rsi(closes, n)
    raw: Series = [None] * len(closes)
    for i in range(len(closes)):
        w = [x for x in r[max(0, i - n + 1):i + 1] if x is not None]
        if len(w) == n:
            lo, hi = min(w), max(w)
            raw[i] = 100 * (r[i] - lo) / (hi - lo) if hi > lo else 50.0
    clamp = lambda xs: [None if x is None else max(0.0, min(100.0, x)) for x in xs]  # noqa: E731
    kk = clamp(_sma_opt(raw, k))
    return kk, clamp(_sma_opt(kk, d))


def _sma_opt(values: Series, n: int) -> Series:
    start = next((i for i, v in enumerate(values) if v is not None), None)
    out: Series = [None] * len(values)
    if start is None:
        return out
    out[start:] = sma(values[start:], n)
    return out


# ---------------------------------------------------------------------------
# Struktura rynku, swingi, wsparcia/opory
# ---------------------------------------------------------------------------
def swings(h: list[float], l: list[float], left: int = 3, right: int = 3) -> list[dict]:
    """Lokalne szczyty/dołki (fraktale). "confirmed" = indeks świecy, na której swing jest już znany."""
    out = []
    for i in range(left, len(h) - right):
        wh = h[i - left:i + right + 1]
        wl = l[i - left:i + right + 1]
        if h[i] == max(wh) and wh.count(h[i]) == 1:
            out.append({"i": i, "price": h[i], "type": "high", "confirmed": i + right})
        if l[i] == min(wl) and wl.count(l[i]) == 1:
            out.append({"i": i, "price": l[i], "type": "low", "confirmed": i + right})
    return out


def market_structure(sw: list[dict], upto: int | None = None) -> dict:
    """HH_HL (wzrostowa) / LH_LL (spadkowa) / RANGING na podstawie dwóch ostatnich szczytów i dołków."""
    if upto is not None:
        sw = [s for s in sw if s["confirmed"] <= upto]
    highs = [s["price"] for s in sw if s["type"] == "high"][-2:]
    lows = [s["price"] for s in sw if s["type"] == "low"][-2:]
    if len(highs) < 2 or len(lows) < 2:
        return {"structure": "RANGING", "label": "za mało danych"}
    hh, hl = highs[1] > highs[0], lows[1] > lows[0]
    if hh and hl:
        return {"structure": "HH_HL", "label": "wyższe szczyty i wyższe dołki"}
    if not hh and not hl:
        return {"structure": "LH_LL", "label": "niższe szczyty i niższe dołki"}
    return {"structure": "RANGING", "label": "struktura mieszana (konsolidacja)"}


def support_resistance(candles: list[dict], sw: list[dict] | None = None, atr_value: float | None = None,
                       max_levels: int = 6) -> list[dict]:
    """Poziomy S/R z klastrowania swingów. Tolerancja = 0.6×ATR (min. 0.25% ceny).

    Zwraca listę {price, type: support|resistance, touches, strength 1–5, distance_pct} posortowaną wg bliskości.
    """
    if not candles:
        return []
    h = [k["h"] for k in candles]
    l = [k["l"] for k in candles]
    price = candles[-1]["c"]
    sw = sw if sw is not None else swings(h, l, 3, 3)
    tol = max((atr_value or 0) * 0.6, price * 0.0025)
    clusters: list[dict] = []
    for s in sorted(sw, key=lambda s: s["price"]):
        if clusters and s["price"] - clusters[-1]["hi"] <= tol:
            c = clusters[-1]
            c["prices"].append(s["price"])
            c["hi"] = s["price"]
            c["last"] = max(c["last"], s["i"])
        else:
            clusters.append({"prices": [s["price"]], "hi": s["price"], "last": s["i"]})
    n = len(candles)
    levels = []
    for c in clusters:
        p = sum(c["prices"]) / len(c["prices"])
        touches = len(c["prices"])
        recency = 1 - (n - c["last"]) / max(n, 1)
        strength = max(1, min(5, round(touches * 0.9 + recency * 1.5)))
        levels.append({"price": p, "type": "support" if p < price else "resistance", "touches": touches,
                       "strength": strength, "distance_pct": round((p / price - 1) * 100, 2)})
    sup = sorted([x for x in levels if x["type"] == "support"], key=lambda x: -x["price"])[:max_levels // 2]
    res = sorted([x for x in levels if x["type"] == "resistance"], key=lambda x: x["price"])[:max_levels // 2]
    return sorted(sup + res, key=lambda x: abs(x["distance_pct"]))


def compute_all(candles: list[dict]) -> dict:
    """Komplet serii używanych przez analizę, boty i backtest."""
    o = [k["o"] for k in candles]
    h = [k["h"] for k in candles]
    l = [k["l"] for k in candles]
    c = [k["c"] for k in candles]
    v = [k["v"] for k in candles]
    m, s, hist = macd(c)
    bu, bm, bl = bollinger(c)
    a = atr(h, l, c)
    return {"o": o, "h": h, "l": l, "c": c, "v": v, "t": [k["t"] for k in candles],
            "ema9": ema(c, 9), "ema20": ema(c, 20), "ema21": ema(c, 21), "ema50": ema(c, 50), "ema200": ema(c, 200),
            "rsi": rsi(c), "macd": m, "signal": s, "hist": hist, "bb_up": bu, "bb_mid": bm, "bb_low": bl,
            "atr": a, "adx": adx(h, l, c), "vol_sma": sma(v, 20), "vwap": vwap(candles),
            "swings": swings(h, l, 3, 3)}


def last(series: Series, i: int | None = None):
    """Ostatnia (lub na indeksie i) nie-None wartość serii."""
    rng = range(len(series) - 1 if i is None else i, -1, -1)
    for j in rng:
        if series[j] is not None:
            return series[j]
    return None
