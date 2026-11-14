"""Konto DEMO (paper trading) – wirtualne USDT, NIGDY prawdziwe zlecenia.

Model: kontrakty USDT z dźwignią 1–20 (izolowany depozyt).
  * margin = wartość pozycji / dźwignia  – blokowane z salda przy otwarciu,
  * opłata 0.06% od wartości przy otwarciu i zamknięciu,
  * equity = saldo + Σ(margin + niezrealizowany PnL).
Zasady ryzyka (risk_manager z MESSUAI): ryzyko na transakcję domyślnie 1%, twardy limit 2%,
limit otwartych pozycji, dzienny limit straty (blokuje nowe pozycje do północy).
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta

import db
from notifier import notify

from . import indicators as ind
from . import market

log = logging.getLogger("trading.paper")
FEE = 0.0006
MAX_LEVERAGE = 20
_last_equity_snap: str | None = None


class TradeError(Exception):
    pass


def _r(x, nd=2):
    return None if x is None else round(x, nd)


def _rp(x):
    if x is None:
        return None
    a = abs(x)
    return round(x, 2 if a >= 100 else 4 if a >= 1 else 6)


def account_row() -> dict:
    row = db.one("SELECT * FROM tr_account WHERE id = 1")
    if not row:
        from . import init
        init()
        row = db.one("SELECT * FROM tr_account WHERE id = 1")
    return row


def open_positions(symbol: str | None = None, bot_id: int | None = None) -> list[dict]:
    sql, p = "SELECT * FROM tr_positions WHERE status = 'open'", []
    if symbol:
        sql += " AND symbol = ?"
        p.append(symbol)
    if bot_id is not None:
        sql += " AND bot_id = ?"
        p.append(bot_id)
    return db.query(sql + " ORDER BY id", p)


def upnl(pos: dict, price: float) -> float:
    sgn = 1 if pos["side"] == "long" else -1
    return sgn * (price - pos["entry"]) * pos["qty"]


def _liq_price(side: str, entry: float, lev: float) -> float | None:
    if lev <= 1:
        return None if side == "long" else entry * 2  # bez dźwigni long nie ma likwidacji
    mm = 0.005  # depozyt podtrzymujący 0.5%
    return entry * (1 - 1 / lev + mm) if side == "long" else entry * (1 + 1 / lev - mm)


def today_pnl() -> float:
    day = db.now_str()[:10]
    row = db.one("SELECT COALESCE(SUM(pnl), 0) AS s FROM tr_positions WHERE status = 'closed' AND closed >= ?", (day,))
    return row["s"] or 0.0


async def _prices_for(symbols: set[str], allow_synthetic: bool = False) -> dict[str, dict]:
    if not symbols:
        return {}
    return await market.get_prices(sorted(symbols), allow_synthetic=allow_synthetic)


async def equity(prices: dict[str, dict] | None = None) -> dict:
    acc = account_row()
    pos = open_positions()
    if prices is None:
        try:
            prices = await _prices_for({p["symbol"] for p in pos}, allow_synthetic=False)
        except market.MarketDataError:
            prices = {}
    locked = sum(p["margin"] for p in pos)
    unreal = sum(upnl(p, prices[p["symbol"]]["price"]) for p in pos if p["symbol"] in prices)
    return {"balance": acc["balance"], "locked": locked, "upnl": unreal, "equity": acc["balance"] + locked + unreal}


async def _auto_sl(symbol: str, side: str, price: float) -> float:
    """SL = 2×ATR(14) z interwału 1h, gdy użytkownik podał ryzyko %, a nie podał SL."""
    data = await market.get_candles(symbol, "60", 100, allow_synthetic=False)
    c = data["candles"]
    a = ind.last(ind.atr([k["h"] for k in c], [k["l"] for k in c], [k["c"] for k in c]))
    if not a:
        raise TradeError("Nie da się wyliczyć ATR do automatycznego SL – podaj SL ręcznie.")
    return price - 2 * a if side == "long" else price + 2 * a


async def open_position(side: str, symbol: str, usdt_amount: float | None = None, risk_pct: float | None = None,
                        leverage: float = 1, sl: float | None = None, tp: float | None = None, bot_id: int | None = None,
                        note: str = "", price: float | None = None, source: str | None = None) -> dict:
    """Otwiera pozycję po cenie rynkowej (DEMO).

    usdt_amount = depozyt (margin) w USDT; wartość pozycji = depozyt × dźwignia.
    risk_pct = alternatywnie: ile % kapitału ryzykujesz do SL (wielkość liczona z odległości SL; SL auto = 2×ATR 1h).
    """
    side = {"buy": "long", "sell": "short"}.get(str(side).lower(), str(side).lower())
    if side not in ("long", "short"):
        raise TradeError("Kierunek musi być long/buy albo short/sell.")
    symbol = market.norm_symbol(symbol)
    lev = float(leverage or 1)
    if not 1 <= lev <= MAX_LEVERAGE:
        raise TradeError(f"Dźwignia musi być w zakresie 1–{MAX_LEVERAGE}.")
    acc = account_row()
    if price is None:
        q = await market.get_price(symbol, allow_synthetic=False)
        price, source = q["price"], q["source"]
    source = source or "bybit"
    eq = await equity()
    # --- zasady ryzyka ---
    if len(open_positions()) >= acc["max_positions"]:
        raise TradeError(f"Limit otwartych pozycji ({acc['max_positions']}) – zamknij coś najpierw.")
    day_loss = -today_pnl()
    if day_loss >= eq["equity"] * acc["daily_loss_limit_pct"] / 100:
        raise TradeError(f"Dzienny limit straty ({acc['daily_loss_limit_pct']}%) osiągnięty – przerwa do jutra. "
                         "Chroń kapitał.")
    sgn = 1 if side == "long" else -1
    if risk_pct is not None and sl is None:
        sl = await _auto_sl(symbol, side, price)
        if tp is None:
            tp = price + sgn * 2 * abs(price - sl)  # R:R 1:2
    if sl is not None and (sl - price) * sgn >= 0:
        raise TradeError(f"SL dla {side.upper()} musi być {'poniżej' if side == 'long' else 'powyżej'} ceny ({_rp(price)}).")
    if tp is not None and (tp - price) * sgn <= 0:
        raise TradeError(f"TP dla {side.upper()} musi być {'powyżej' if side == 'long' else 'poniżej'} ceny ({_rp(price)}).")
    if risk_pct is not None:
        risk_pct = float(risk_pct)
        if risk_pct <= 0:
            raise TradeError("Ryzyko % musi być dodatnie.")
        qty = (eq["equity"] * risk_pct / 100) / abs(price - sl)
        margin = qty * price / lev
    elif usdt_amount:
        margin = float(usdt_amount)
        qty = margin * lev / price
    else:
        raise TradeError("Podaj kwotę (usdt_amount) albo ryzyko % (risk_pct).")
    if margin <= 0:
        raise TradeError("Kwota musi być dodatnia.")
    fee_open = qty * price * FEE
    if margin + fee_open > acc["balance"]:
        if risk_pct is not None:  # przytnij do dostępnych środków
            margin = max(0.0, acc["balance"] * 0.98 - fee_open)
            qty = margin * lev / price
            fee_open = qty * price * FEE
        if margin <= 0 or margin + fee_open > acc["balance"]:
            raise TradeError(f"Za mało wolnych środków: {acc['balance']:.2f} USDT (potrzeba {margin + fee_open:.2f}).")
    risk_usdt = qty * abs(price - sl) + 2 * fee_open if sl is not None else None
    liq = _liq_price(side, price, lev)
    if sl is not None and liq is not None and (sl - liq) * sgn <= 0:
        raise TradeError(f"SL ({_rp(sl)}) jest za ceną likwidacji ({_rp(liq)}) – zmniejsz dźwignię.")
    max_risk = eq["equity"] * acc["max_risk_pct"] / 100
    if risk_usdt is not None and risk_usdt > max_risk * 1.02:
        raise TradeError(f"Ryzyko {risk_usdt:.2f} USDT ({risk_usdt / eq['equity'] * 100:.2f}%) przekracza limit "
                         f"{acc['max_risk_pct']}% kapitału. Zmniejsz kwotę albo przybliż SL.")
    pid = db.insert("tr_positions", {
        "symbol": symbol, "side": side, "qty": qty, "entry": price, "leverage": lev, "margin": margin, "sl": sl, "tp": tp,
        "liq": liq, "risk_usdt": risk_usdt, "fees": fee_open, "status": "open", "opened": db.now_str(),
        "reason": "bot" if bot_id else "manual", "bot_id": bot_id, "source": source, "note": note or "",
    })
    db.execute("UPDATE tr_account SET balance = balance - ? WHERE id = 1", (margin + fee_open,))
    warn = None if sl is not None else "Brak SL – ryzyko ograniczone tylko depozytem (likwidacja). Rozważ ustawienie SL."
    return {"ok": True, "demo": True, "position": position_view(db.one("SELECT * FROM tr_positions WHERE id = ?", (pid,)), price),
            "warning": warn}


async def close_position(pid: int, fraction: float = 1.0, price: float | None = None, reason: str = "manual",
                         source_ok: bool = False) -> dict:
    pos = db.one("SELECT * FROM tr_positions WHERE id = ?", (pid,))
    if not pos or pos["status"] != "open":
        raise TradeError(f"Brak otwartej pozycji #{pid}.")
    fraction = max(0.0, min(1.0, float(fraction or 1)))
    if fraction <= 0:
        raise TradeError("Ułamek zamknięcia musi być > 0.")
    if price is None:
        price = (await market.get_price(pos["symbol"], allow_synthetic=source_ok))["price"]
    qty = pos["qty"] * fraction
    margin = pos["margin"] * fraction
    gross = upnl({**pos, "qty": qty}, price)
    if reason == "liq":
        gross = -margin
    fee_close = qty * price * FEE
    fee_open_part = pos["fees"] * fraction
    pnl = gross - fee_close - fee_open_part
    risk_part = (pos["risk_usdt"] or 0) * fraction
    r_mult = round(pnl / risk_part, 2) if risk_part else None
    now = db.now_str()
    db.execute("UPDATE tr_account SET balance = balance + ? WHERE id = 1", (max(0.0, margin + gross) - fee_close,))
    if fraction >= 0.999:
        db.update("tr_positions", pid, {"status": "closed", "closed": now, "exit": price, "pnl": pnl, "r_multiple": r_mult,
                                        "fees": pos["fees"] + fee_close, "reason": reason})
        closed_id = pid
    else:
        closed_id = db.insert("tr_positions", {
            **{k: pos[k] for k in ("symbol", "side", "entry", "leverage", "sl", "tp", "liq", "opened", "bot_id", "source", "note")},
            "qty": qty, "margin": margin, "risk_usdt": risk_part, "fees": fee_open_part + fee_close, "status": "closed",
            "closed": now, "exit": price, "pnl": pnl, "r_multiple": r_mult, "reason": f"partial:{reason}"})
        db.update("tr_positions", pid, {"qty": pos["qty"] - qty, "margin": pos["margin"] - margin,
                                        "fees": pos["fees"] - fee_open_part,
                                        "risk_usdt": (pos["risk_usdt"] or 0) - risk_part or None})
    return {"ok": True, "demo": True, "closed_id": closed_id, "symbol": pos["symbol"], "side": pos["side"],
            "exit": _rp(price), "pnl": _r(pnl), "r_multiple": r_mult, "fraction": fraction, "reason": reason}


def update_position(pid: int, sl: float | None = None, tp: float | None = None) -> dict:
    pos = db.one("SELECT * FROM tr_positions WHERE id = ? AND status = 'open'", (pid,))
    if not pos:
        raise TradeError(f"Brak otwartej pozycji #{pid}.")
    data = {}
    if sl is not None:
        data["sl"] = float(sl) or None
    if tp is not None:
        data["tp"] = float(tp) or None
    db.update("tr_positions", pid, data)
    return {"ok": True}


def position_view(p: dict, price: float | None) -> dict:
    out = {k: p[k] for k in ("id", "symbol", "side", "leverage", "status", "opened", "closed", "reason", "bot_id", "source", "note")}
    out.update({"qty": _r(p["qty"], 6), "entry": _rp(p["entry"]), "sl": _rp(p["sl"]), "tp": _rp(p["tp"]), "liq": _rp(p["liq"]),
                "margin": _r(p["margin"]), "value": _r(p["qty"] * p["entry"]), "fees": _r(p["fees"], 4),
                "risk_usdt": _r(p["risk_usdt"])})
    if p["status"] == "open" and price is not None:
        u = upnl(p, price)
        out.update({"price": _rp(price), "upnl": _r(u), "upnl_pct": _r(u / p["margin"] * 100) if p["margin"] else None,
                    "r_now": _r(u / p["risk_usdt"]) if p["risk_usdt"] else None})
    else:
        out.update({"exit": _rp(p["exit"]), "pnl": _r(p["pnl"]), "r_multiple": p["r_multiple"]})
    return out


def trade_stats(rows: list[dict]) -> dict:
    pnls = [r["pnl"] or 0 for r in rows]
    wins = [x for x in pnls if x > 0]
    losses = [x for x in pnls if x <= 0]
    rs = [r["r_multiple"] for r in rows if r.get("r_multiple") is not None]
    gl = -sum(losses)
    return {"trades": len(pnls), "wins": len(wins), "losses": len(losses),
            "win_rate": round(len(wins) / len(pnls) * 100, 1) if pnls else None, "pnl": _r(sum(pnls)),
            "profit_factor": round(sum(wins) / gl, 2) if gl > 0 else (None if not wins else 99.0),
            "avg_r": round(sum(rs) / len(rs), 2) if rs else None,
            "best": _r(max(pnls)) if pnls else None, "worst": _r(min(pnls)) if pnls else None}


async def status() -> dict:
    acc = account_row()
    pos = open_positions()
    prices, src_err = {}, None
    try:
        prices = await _prices_for({p["symbol"] for p in pos}, allow_synthetic=market.demo_mode())
    except market.MarketDataError as e:
        src_err = str(e)
    eq = await equity(prices)
    closed = db.query("SELECT pnl, r_multiple FROM tr_positions WHERE status = 'closed'")
    return {
        "demo": True, "label": "DEMO – wirtualne pieniądze",
        "balance": _r(eq["balance"]), "equity": _r(eq["equity"]), "locked": _r(eq["locked"]), "upnl": _r(eq["upnl"]),
        "start_balance": acc["start_balance"], "total_return_pct": _r((eq["equity"] / acc["start_balance"] - 1) * 100),
        "today_pnl": _r(today_pnl()),
        "settings": {k: acc[k] for k in ("risk_pct", "max_risk_pct", "max_positions", "daily_loss_limit_pct")},
        "fee_pct": FEE * 100, "max_leverage": MAX_LEVERAGE,
        "positions": [position_view(p, prices.get(p["symbol"], {}).get("price")) for p in pos],
        "stats": trade_stats(closed), "price_error": src_err,
        "sources": sorted({v.get("source", "bybit") for v in prices.values()}),
    }


def trades(limit: int = 100, bot_id: int | None = None) -> list[dict]:
    sql, p = "SELECT * FROM tr_positions WHERE status = 'closed'", []
    if bot_id is not None:
        sql += " AND bot_id = ?"
        p.append(bot_id)
    return [position_view(r, None) for r in db.query(sql + " ORDER BY closed DESC, id DESC LIMIT ?", [*p, int(limit)])]


def equity_history(days: int = 30) -> list[dict]:
    since = (datetime.fromisoformat(db.now_str()) - timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%S")
    rows = db.query("SELECT ts, balance, equity FROM tr_equity WHERE ts >= ? ORDER BY ts", (since,))
    step = max(1, len(rows) // 300)
    return rows[::step] + ([rows[-1]] if rows and (len(rows) - 1) % step else [])


def update_settings(data: dict) -> dict:
    allowed = {"risk_pct": (0.1, 5), "max_risk_pct": (0.1, 5), "max_positions": (1, 30), "daily_loss_limit_pct": (0.5, 50)}
    upd = {}
    for k, (lo, hi) in allowed.items():
        if data.get(k) is not None:
            v = float(data[k])
            if not lo <= v <= hi:
                raise TradeError(f"{k} poza zakresem {lo}–{hi}.")
            upd[k] = int(v) if k == "max_positions" else v
    if upd:
        db.update("tr_account", 1, upd)
    return {k: account_row()[k] for k in allowed}


def reset(balance: float | None = None) -> dict:
    from . import DEFAULT_BALANCE
    bal = float(balance or DEFAULT_BALANCE)
    if not 100 <= bal <= 10_000_000:
        raise TradeError("Saldo startowe 100 – 10 000 000 USDT.")
    db.execute("DELETE FROM tr_positions")
    db.execute("DELETE FROM tr_equity")
    db.execute("UPDATE tr_bots SET last_candle = NULL, state = '{}'")
    db.update("tr_account", 1, {"balance": bal, "start_balance": bal, "reset_at": db.now_str()})
    return {"ok": True, "demo": True, "balance": bal}


async def snapshot_equity(force: bool = False) -> None:
    """Zapis equity do historii (co 5 min)."""
    global _last_equity_snap
    now = db.now_str()
    key = now[:15] + ("0" if now[15] < "5" else "5")
    if not force and key == _last_equity_snap:
        return
    _last_equity_snap = key
    try:
        eq = await equity()
    except market.MarketDataError:
        return
    db.insert("tr_equity", {"ts": now, "balance": eq["balance"], "equity": eq["equity"]})


async def check_positions() -> list[dict]:
    """Zamyka pozycje, które dotknęły SL / TP / likwidacji (scheduler co minutę).

    Używa świec 1m od chwili otwarcia (high/low), więc nie przegapi knota między wywołaniami.
    Gdy w jednej świecy padł i SL, i TP – zakładamy SL (konserwatywnie).
    """
    results = []
    pos = open_positions()
    by_sym: dict[str, list[dict]] = {}
    for p in pos:
        by_sym.setdefault(p["symbol"], []).append(p)
    for sym, plist in by_sym.items():
        try:
            data = await market.get_candles(sym, "1", 5, allow_synthetic=False)
        except market.MarketDataError as e:
            log.warning("check_positions: brak danych %s: %s", sym, e)
            continue
        candles = data["candles"]
        for p in plist:
            opened_ms = int(datetime.fromisoformat(p["opened"]).replace(tzinfo=_tz()).timestamp() * 1000)
            relevant = [k for k in candles if k["t"] + 60_000 > opened_ms] or candles[-1:]
            hi, lo = max(k["h"] for k in relevant), min(k["l"] for k in relevant)
            long = p["side"] == "long"
            hit = None
            if p["liq"] and (lo <= p["liq"] if long else hi >= p["liq"]) and not (p["sl"] and (lo <= p["sl"] if long else hi >= p["sl"])):
                hit = ("liq", p["liq"])
            elif p["sl"] and (lo <= p["sl"] if long else hi >= p["sl"]):
                hit = ("sl", p["sl"])
            elif p["tp"] and (hi >= p["tp"] if long else lo <= p["tp"]):
                hit = ("tp", p["tp"])
            if not hit:
                continue
            res = await close_position(p["id"], 1.0, price=hit[1], reason=hit[0])
            results.append(res)
            label = {"sl": "🛑 Stop loss", "tp": "🎯 Take profit", "liq": "💥 Likwidacja"}[hit[0]]
            await notify(f"{label} (DEMO): {p['side'].upper()} {sym}",
                         f"Wyjście {res['exit']} · wynik {res['pnl']:+.2f} USDT"
                         + (f" ({res['r_multiple']:+.2f}R)" if res["r_multiple"] is not None else "")
                         + ("\nBot #" + str(p["bot_id"]) if p["bot_id"] else "") + "\nKonto demo – wirtualne pieniądze.",
                         level="crypto")
    await snapshot_equity()
    return results


def _tz():
    import config
    return config.TZ
