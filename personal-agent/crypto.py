"""Ceny krypto z publicznego API CoinGecko (bez klucza) + alerty cenowe."""
import logging
import time

import httpx

import db
from config import CRYPTO_WATCHLIST
from notifier import notify

log = logging.getLogger("crypto")
API = "https://api.coingecko.com/api/v3"
_cache: dict[str, tuple[float, dict]] = {}


async def prices(coins: list[str] | None = None) -> dict:
    coins = [c.lower().strip() for c in (coins or CRYPTO_WATCHLIST) if c.strip()]
    key = ",".join(sorted(coins))
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < 60:
        return hit[1]
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{API}/simple/price", params={
            "ids": key, "vs_currencies": "usd,pln", "include_24hr_change": "true",
        })
        r.raise_for_status()
        data = r.json()
    _cache[key] = (time.time(), data)
    return data


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
