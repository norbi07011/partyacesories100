"""Krypto: ceny i wykresy 7 dni z publicznego API CoinGecko (bez klucza) + alerty cenowe.

Tu jest miejsce na przyszłe analizy w tle (np. CCXT, wskaźniki, sygnały) - patrz analyze_market().
"""
import logging
import time

import httpx

import config
import db
from notifier import notify

log = logging.getLogger("crypto")
API = "https://api.coingecko.com/api/v3"
_cache: dict[str, tuple[float, object]] = {}


async def _get(path: str, params: dict, ttl: int = 60):
    key = path + repr(sorted(params.items()))
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < ttl:
        return hit[1]
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{API}{path}", params=params)
        r.raise_for_status()
        data = r.json()
    _cache[key] = (time.time(), data)
    return data


async def prices(coins: list[str] | None = None) -> dict:
    coins = [c.lower().strip() for c in (coins or config.CRYPTO_WATCHLIST) if c.strip()]
    return await _get("/simple/price", {"ids": ",".join(sorted(coins)), "vs_currencies": "usd,pln",
                                        "include_24hr_change": "true"})


async def markets(coins: list[str] | None = None) -> list[dict]:
    """Ceny + zmiany 24h/7d + wykres 7 dni (do dashboardu)."""
    coins = [c.lower().strip() for c in (coins or config.CRYPTO_WATCHLIST) if c.strip()]
    if not coins:
        return []
    usd = await _get("/coins/markets", {"vs_currency": "usd", "ids": ",".join(coins), "sparkline": "true",
                                        "price_change_percentage": "24h,7d"}, ttl=120)
    try:
        pln = await prices(coins)
    except Exception:  # noqa: BLE001
        pln = {}
    out = []
    for m in usd:
        spark = (m.get("sparkline_in_7d") or {}).get("price") or []
        step = max(1, len(spark) // 56)
        out.append({
            "id": m["id"], "symbol": m.get("symbol", "").upper(), "name": m.get("name"), "image": m.get("image"),
            "usd": m.get("current_price"), "pln": pln.get(m["id"], {}).get("pln"),
            "change_24h": m.get("price_change_percentage_24h_in_currency"),
            "change_7d": m.get("price_change_percentage_7d_in_currency"),
            "market_cap": m.get("market_cap"), "spark": spark[::step],
        })
    return out


async def check_alerts() -> None:
    alerts = db.query("SELECT * FROM alerts WHERE active = 1")
    if not alerts:
        return
    try:
        data = await prices(list({a["coin"] for a in alerts}))
    except Exception as e:  # noqa: BLE001
        log.warning("Brak cen krypto: %s", e)
        return
    for a in alerts:
        price = data.get(a["coin"], {}).get(a["currency"])
        if price is None:
            continue
        hit = price >= a["price"] if a["direction"] == "above" else price <= a["price"]
        if hit:
            db.update("alerts", a["id"], {"active": 0})
            word = "powyżej" if a["direction"] == "above" else "poniżej"
            await notify(
                f"🚨 {a['coin'].upper()} {word} {a['price']:,} {a['currency'].upper()}",
                f"Aktualna cena: {price:,} {a['currency'].upper()}",
                level="crypto",
            )


async def analyze_market() -> None:
    """Miejsce na analizę w tle. Teraz: powiadamia o dużych ruchach (>8% w 24h) na obserwowanych monetach,
    najwyżej raz na 12 h na monetę."""
    try:
        data = await markets()
    except Exception as e:  # noqa: BLE001
        log.debug("Analiza krypto pominięta: %s", e)
        return
    for m in data:
        ch = m.get("change_24h")
        if ch is None or abs(ch) < 8:
            continue
        key = f"crypto_move_{m['id']}"
        last = db.kv_get(key)
        if last and time.time() - float(last) < 12 * 3600:
            continue
        db.kv_set(key, str(time.time()))
        arrow = "📈" if ch > 0 else "📉"
        await notify(f"{arrow} {m['name']} {ch:+.1f}% w 24h", f"Cena: {m['usd']:,} USD", level="crypto")
