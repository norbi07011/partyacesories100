"""REST API modułu TRADING dla dashboardu: /api/trading/... (konto DEMO – wirtualne pieniądze)."""
from __future__ import annotations

from fastapi import APIRouter, Body, HTTPException

from . import analysis, backtest, bots, knowledge, market, paper
from . import indicators as ind

router = APIRouter(prefix="/api/trading", tags=["trading"])


def _err(e: Exception):
    raise HTTPException(400, str(e))


def _round_series(xs, nd):
    return [None if x is None else round(x, nd) for x in xs]


def _nd(price: float) -> int:
    a = abs(price)
    return 2 if a >= 100 else 4 if a >= 1 else 6


@router.get("/symbols")
async def symbols():
    return {"symbols": market.DEFAULT_SYMBOLS, "intervals": [{"id": k, "label": market.INTERVAL_LABEL[k]} for k in bots.INTERVALS],
            "demo_data": market.demo_mode(), "personas": analysis.PERSONAS,
            "strategies": {k: {"label": v["label"], "desc": v["desc"], "params": v["params"]} for k, v in bots.STRATEGIES.items()}}


@router.get("/prices")
async def prices(symbols: str = ""):
    syms = [s for s in symbols.split(",") if s.strip()] or market.DEFAULT_SYMBOLS
    try:
        data = await market.get_prices(syms, allow_synthetic=True)
    except (ValueError, market.MarketDataError) as e:
        _err(e)
    return {"prices": data, "source": "synthetic" if any(v["source"] == "synthetic" for v in data.values()) else "bybit"}


@router.get("/candles")
async def candles(symbol: str = "BTCUSDT", interval: str = "60", limit: int = 300):
    """Świece + serie wskaźników do wykresu."""
    try:
        d = await market.get_candles(symbol, interval, max(50, min(limit, 1000)), allow_synthetic=True)
    except (ValueError, market.MarketDataError) as e:
        _err(e)
    c = d["candles"]
    S = ind.compute_all(c)
    nd = _nd(c[-1]["c"])
    levels = ind.support_resistance(c, S["swings"], ind.last(S["atr"]))
    st = ind.market_structure(S["swings"])
    prev = c[-2]["c"] if len(c) > 1 else c[-1]["o"]
    return {
        "symbol": d["symbol"], "interval": d["interval"], "source": d["source"], "demo_data": market.demo_mode(),
        "candles": [[k["t"], round(k["o"], nd), round(k["h"], nd), round(k["l"], nd), round(k["c"], nd), round(k["v"], 3)] for k in c],
        "ema20": _round_series(S["ema20"], nd), "ema50": _round_series(S["ema50"], nd), "ema200": _round_series(S["ema200"], nd),
        "bb": {"up": _round_series(S["bb_up"], nd), "mid": _round_series(S["bb_mid"], nd), "low": _round_series(S["bb_low"], nd)},
        "rsi": _round_series(S["rsi"], 2),
        "macd": {"macd": _round_series(S["macd"], nd + 2), "signal": _round_series(S["signal"], nd + 2),
                 "hist": _round_series(S["hist"], nd + 2)},
        "levels": [{**x, "price": round(x["price"], nd)} for x in levels],
        "swings": [{"i": s["i"], "type": s["type"], "price": round(s["price"], nd)} for s in S["swings"][-30:]],
        "structure": st,
        "last": {"price": c[-1]["c"], "change_pct": round((c[-1]["c"] / prev - 1) * 100, 2), "t": c[-1]["t"]},
    }


@router.get("/analysis")
async def get_analysis(symbol: str = "BTCUSDT", interval: str = "60", ai: int = 0):
    try:
        return await analysis.analyze(symbol, interval, ai=bool(ai), allow_synthetic=True)
    except (ValueError, market.MarketDataError) as e:
        _err(e)


@router.get("/account")
async def account():
    st = await paper.status()
    st["equity_history"] = paper.equity_history(30)
    return st


@router.patch("/account/settings")
async def account_settings(data: dict = Body(...)):
    try:
        return paper.update_settings(data)
    except (ValueError, paper.TradeError) as e:
        _err(e)


@router.post("/order")
async def order(data: dict = Body(...)):
    """{side, symbol, usdt_amount | risk_pct, leverage, sl, tp, note}"""
    num = lambda k: float(data[k]) if data.get(k) not in (None, "") else None  # noqa: E731
    try:
        return await paper.open_position(data.get("side"), data.get("symbol"), usdt_amount=num("usdt_amount"),
                                         risk_pct=num("risk_pct"), leverage=num("leverage") or 1, sl=num("sl"), tp=num("tp"),
                                         note=data.get("note") or "")
    except (ValueError, paper.TradeError, market.MarketDataError) as e:
        _err(e)


@router.post("/close/{pid}")
async def close(pid: int, data: dict | None = Body(None)):
    try:
        return await paper.close_position(pid, float((data or {}).get("fraction") or 1), source_ok=market.demo_mode())
    except (ValueError, paper.TradeError, market.MarketDataError) as e:
        _err(e)


@router.patch("/positions/{pid}")
async def edit_position(pid: int, data: dict = Body(...)):
    try:
        return paper.update_position(pid, data.get("sl"), data.get("tp"))
    except (ValueError, paper.TradeError) as e:
        _err(e)


@router.post("/reset")
async def reset(data: dict | None = Body(None)):
    try:
        return paper.reset((data or {}).get("balance"))
    except (ValueError, paper.TradeError) as e:
        _err(e)


@router.get("/trades")
async def trades(limit: int = 100, bot_id: int | None = None):
    rows = paper.trades(limit, bot_id)
    return {"trades": rows, "stats": paper.trade_stats(rows)}


@router.get("/bots")
async def list_bots():
    return await bots.list_bots()


@router.post("/bots")
async def create_bot(data: dict = Body(...)):
    try:
        return bots.create_bot(data)
    except ValueError as e:
        _err(e)


@router.patch("/bots/{bid}")
async def update_bot(bid: int, data: dict = Body(...)):
    try:
        return bots.update_bot(bid, data)
    except ValueError as e:
        _err(e)


@router.post("/bots/{bid}/toggle")
async def toggle_bot(bid: int):
    try:
        return bots.toggle_bot(bid)
    except ValueError as e:
        _err(e)


@router.delete("/bots/{bid}")
async def delete_bot(bid: int):
    return await bots.delete_bot(bid)


@router.post("/bots/run")
async def run_bots_now():
    """Ręczne wywołanie pętli botów (to samo, co scheduler co minutę)."""
    return {"results": await bots.run_bots(), "checked": await paper.check_positions()}


@router.post("/backtest")
async def run_backtest(data: dict = Body(...)):
    try:
        return await backtest.run_backtest(data.get("strategy") or "ema_cross", data.get("symbol") or "BTCUSDT",
                                           data.get("interval") or "60", data.get("days") or 30, data.get("params"),
                                           data.get("risk_pct") or 1, data.get("leverage") or 3,
                                           float(data.get("start_balance") or 10_000), allow_synthetic=True)
    except (ValueError, market.MarketDataError) as e:
        _err(e)


@router.get("/knowledge")
async def knowledge_list():
    return knowledge.list_topics()


@router.get("/knowledge/{topic}")
async def knowledge_get(topic: str, q: str | None = None):
    res = knowledge.get(topic, q)
    if "error" in res:
        raise HTTPException(404, res["error"])
    return res
