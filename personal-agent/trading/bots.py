"""Boty DEMO: automatyczny paper trading na zamkniętych świecach. NIGDY prawdziwe zlecenia, zero kluczy API.

Strategie (wspólne z backtestem – ta sama funkcja decyzyjna):
  ema_cross        – przecięcie szybkiej i wolnej EMA (opcjonalny filtr EMA200),
  rsi_reversion    – powrót do średniej: kupno przy RSI < 30, sprzedaż przy RSI > 70, wyjście przy RSI 50,
  breakout_range   – wybicie z porannego zakresu 03:00–06:00, zamknięcie na koniec dnia (POMYSŁ.MD),
  agent_consensus  – wejście, gdy konsensus Luny i Novy ≥ próg.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime

import db
from notifier import notify

from . import analysis
from . import indicators as ind
from . import market, paper

log = logging.getLogger("trading.bots")

STRATEGIES = {
    "ema_cross": {
        "label": "Przecięcie EMA", "desc": "LONG gdy szybka EMA przetnie wolną w górę, SHORT w dół. Filtr EMA200 – tylko z trendem.",
        "params": {"fast": 9, "slow": 21, "trend_filter": 1, "sl_atr": 2.0, "tp_atr": 4.0},
    },
    "rsi_reversion": {
        "label": "RSI – powrót do średniej", "desc": "LONG gdy RSI wraca powyżej progu wyprzedania, SHORT gdy spada poniżej progu wykupienia; wyjście przy RSI 50.",
        "params": {"period": 14, "low": 30, "high": 70, "exit": 50, "sl_atr": 1.5, "tp_atr": 3.0},
    },
    "breakout_range": {
        "label": "Wybicie zakresu porannego", "desc": "Zakres high/low z godzin start–koniec (domyślnie 03:00–06:00), wejście na wybiciu, "
                                                       "SL/TP jako wielokrotność wielkości zakresu, zamknięcie o godzinie close_hour. Interwał ≤ 1h.",
        "params": {"start_hour": 3, "end_hour": 6, "close_hour": 18, "sl_factor": 1.0, "tp_factor": 1.5, "skip_weekends": 0},
    },
    "agent_consensus": {
        "label": "Konsensus agentek (Luna + Nova)", "desc": "Wejście, gdy wspólna ocena LONG/SHORT ≥ próg; wyjście, gdy przewaga spadnie poniżej exit_score.",
        "params": {"min_score": 65, "exit_score": 50, "sl_atr": 2.0, "tp_atr": 4.0},
    },
}
INTERVALS = ["1", "5", "15", "60", "240", "D"]


def merge_params(strategy: str, params: dict | None) -> dict:
    if strategy not in STRATEGIES:
        raise ValueError(f"Nieznana strategia: {strategy}. Dostępne: {', '.join(STRATEGIES)}")
    base = dict(STRATEGIES[strategy]["params"])
    for k, v in (params or {}).items():
        if k in base and v not in (None, ""):
            base[k] = type(base[k])(float(v)) if isinstance(base[k], int) else float(v)
    return base


# ---------------------------------------------------------------------------
# Silnik strategii (bot + backtest)
# ---------------------------------------------------------------------------
def prepare(strategy: str, candles: list[dict], params: dict) -> dict:
    S = ind.compute_all(candles)
    c = S["c"]
    if strategy == "ema_cross":
        S["fast"], S["slow"] = ind.ema(c, int(params["fast"])), ind.ema(c, int(params["slow"]))
    elif strategy == "rsi_reversion":
        S["rsi_p"] = ind.rsi(c, int(params["period"]))
    elif strategy == "breakout_range":
        import config
        loc = [datetime.fromtimestamp(t / 1000, tz=config.TZ) for t in S["t"]]
        S["local"] = loc
        ranges: dict = {}
        a, b = int(params["start_hour"]), int(params["end_hour"])
        for k, d in enumerate(loc):
            if a <= d.hour < b:
                r = ranges.setdefault(d.date(), [S["h"][k], S["l"][k], 0])
                r[0], r[1], r[2] = max(r[0], S["h"][k]), min(r[1], S["l"][k]), r[2] + 1
        S["ranges"] = ranges
    return S


def decide(strategy: str, S: dict, i: int, params: dict, pos: dict | None, state: dict) -> dict | None:
    """Decyzja na zamkniętej świecy i. pos = {"side": "long"/"short"} albo None."""
    c = S["c"][i]
    a = ind.last(S["atr"], i)

    def plan(side, why, sl_atr=None, tp_atr=None, sl=None, tp=None):
        sg = 1 if side == "long" else -1
        if sl is None and a:
            sl = c - sg * sl_atr * a
            tp = c + sg * tp_atr * a if tp_atr else None
        return {"action": "open", "side": side, "sl": sl, "tp": tp, "reason": why}

    if strategy == "ema_cross":
        f, s, fp, sp = S["fast"][i], S["slow"][i], S["fast"][i - 1], S["slow"][i - 1]
        if None in (f, s, fp, sp):
            return None
        up, down = fp <= sp and f > s, fp >= sp and f < s
        e200 = S["ema200"][i]
        tf = int(params.get("trend_filter", 1))
        if pos and ((pos["side"] == "long" and down) or (pos["side"] == "short" and up)):
            return {"action": "close", "reason": "przecięcie w przeciwną stronę"}
        if not pos and up and (not tf or e200 is None or c > e200):
            return plan("long", f"EMA{int(params['fast'])} przecina EMA{int(params['slow'])} w górę", params["sl_atr"], params["tp_atr"])
        if not pos and down and (not tf or e200 is None or c < e200):
            return plan("short", f"EMA{int(params['fast'])} przecina EMA{int(params['slow'])} w dół", params["sl_atr"], params["tp_atr"])
        return None

    if strategy == "rsi_reversion":
        r, rp = S["rsi_p"][i], S["rsi_p"][i - 1]
        if r is None or rp is None:
            return None
        if pos and ((pos["side"] == "long" and r >= params["exit"]) or (pos["side"] == "short" and r <= params["exit"])):
            return {"action": "close", "reason": f"RSI wrócił do {params['exit']:.0f}"}
        if not pos and rp < params["low"] <= r:
            return plan("long", f"RSI wychodzi z wyprzedania ({r:.0f})", params["sl_atr"], params["tp_atr"])
        if not pos and rp > params["high"] >= r:
            return plan("short", f"RSI wychodzi z wykupienia ({r:.0f})", params["sl_atr"], params["tp_atr"])
        return None

    if strategy == "breakout_range":
        d = S["local"][i]
        day = d.date()
        if pos:
            if d.hour >= int(params["close_hour"]) or str(day) != pos.get("day", str(day)):
                return {"action": "close", "reason": "koniec dnia (EOD)"}
            return None
        if int(params.get("skip_weekends", 0)) and d.weekday() >= 5:
            return None
        rng = S["ranges"].get(day)
        if not rng or not (int(params["end_hour"]) <= d.hour < int(params["close_hour"])) or state.get("day") == str(day):
            return None
        hi, lo, _ = rng
        size = hi - lo
        if size <= 0:
            return None
        tpf = params["tp_factor"]
        if c > hi:
            state["day"] = str(day)
            return {**plan("long", f"wybicie nad zakres {lo:.4g}–{hi:.4g}", sl=c - size * params["sl_factor"],
                           tp=c + size * tpf if tpf else None), "day": str(day)}
        if c < lo:
            state["day"] = str(day)
            return {**plan("short", f"wybicie pod zakres {lo:.4g}–{hi:.4g}", sl=c + size * params["sl_factor"],
                           tp=c - size * tpf if tpf else None), "day": str(day)}
        return None

    if strategy == "agent_consensus":
        if i < 60:
            return None
        q = analysis.quick_scores(S, i)
        long_s = q["long"]
        if pos:
            if (pos["side"] == "long" and long_s < params["exit_score"]) or (pos["side"] == "short" and 100 - long_s < params["exit_score"]):
                return {"action": "close", "reason": f"konsensus osłabł (LONG {long_s} / SHORT {100 - long_s})"}
            return None
        if long_s >= params["min_score"]:
            return plan("long", f"konsensus LONG {long_s} (Luna {q['luna']}, Nova {q['nova']})", params["sl_atr"], params["tp_atr"])
        if 100 - long_s >= params["min_score"]:
            return plan("short", f"konsensus SHORT {100 - long_s} (Luna {100 - q['luna']}, Nova {100 - q['nova']})",
                        params["sl_atr"], params["tp_atr"])
        return None
    return None


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------
def _log(bot_id: int, msg: str) -> None:
    db.insert("tr_bot_log", {"bot_id": bot_id, "ts": db.now_str(), "msg": msg})


def _validate(strategy: str, interval: str, params: dict) -> None:
    if strategy == "breakout_range":
        if market.INTERVAL_MIN[interval] > 60:
            raise ValueError("Strategia breakout_range wymaga interwału ≤ 1h (1, 5, 15 lub 60).")
        if not 0 <= params["start_hour"] < params["end_hour"] <= params["close_hour"] <= 24:
            raise ValueError("Godziny muszą spełniać: start < koniec zakresu ≤ zamknięcie (0–24).")


def create_bot(data: dict) -> dict:
    strategy = data.get("strategy") or "ema_cross"
    symbol = market.norm_symbol(data.get("symbol"))
    interval = market.norm_interval(data.get("interval") or "15")
    params = merge_params(strategy, data.get("params"))
    _validate(strategy, interval, params)
    risk = float(data.get("risk_pct") or 1.0)
    lev = float(data.get("leverage") or 3)
    if not 0.1 <= risk <= 2.0:
        raise ValueError("Ryzyko bota: 0.1–2% kapitału na transakcję.")
    if not 1 <= lev <= paper.MAX_LEVERAGE:
        raise ValueError(f"Dźwignia 1–{paper.MAX_LEVERAGE}.")
    name = (data.get("name") or "").strip() or f"{STRATEGIES[strategy]['label']} · {symbol.replace('USDT', '')} {market.INTERVAL_LABEL[interval]}"
    bid = db.insert("tr_bots", {"name": name[:80], "symbol": symbol, "interval": interval, "strategy": strategy,
                                "params": json.dumps(params), "risk_pct": risk, "leverage": lev,
                                "status": "running" if data.get("start", True) else "paused", "state": "{}",
                                "created": db.now_str()})
    _log(bid, f"Utworzono bota ({strategy}, {symbol} {market.INTERVAL_LABEL[interval]}).")
    return get_bot(bid)


def get_bot(bid: int) -> dict:
    b = db.one("SELECT * FROM tr_bots WHERE id = ?", (bid,))
    if not b:
        raise ValueError(f"Brak bota #{bid}.")
    return _view(b)


def _view(b: dict, prices: dict | None = None) -> dict:
    closed = db.query("SELECT pnl, r_multiple FROM tr_positions WHERE status = 'closed' AND bot_id = ?", (b["id"],))
    op = paper.open_positions(bot_id=b["id"])
    price = (prices or {}).get(b["symbol"], {}).get("price")
    return {**{k: b[k] for k in ("id", "name", "symbol", "interval", "strategy", "risk_pct", "leverage", "status", "created")},
            "params": json.loads(b["params"] or "{}"), "strategy_label": STRATEGIES.get(b["strategy"], {}).get("label", b["strategy"]),
            "interval_label": market.INTERVAL_LABEL.get(b["interval"], b["interval"]),
            "last_candle": b["last_candle"], "stats": paper.trade_stats(closed),
            "open_position": paper.position_view(op[0], price) if op else None,
            "log": db.query("SELECT ts, msg FROM tr_bot_log WHERE bot_id = ? ORDER BY id DESC LIMIT 8", (b["id"],))}


async def list_bots() -> list[dict]:
    bots = db.query("SELECT * FROM tr_bots ORDER BY id DESC")
    prices = {}
    syms = {p["symbol"] for p in paper.open_positions() if p["bot_id"]}
    if syms:
        try:
            prices = await market.get_prices(sorted(syms), allow_synthetic=market.demo_mode())
        except market.MarketDataError:
            prices = {}
    return [_view(b, prices) for b in bots]


def update_bot(bid: int, data: dict) -> dict:
    b = db.one("SELECT * FROM tr_bots WHERE id = ?", (bid,))
    if not b:
        raise ValueError(f"Brak bota #{bid}.")
    upd = {}
    if data.get("status") in ("running", "paused"):
        upd["status"] = data["status"]
    if data.get("name"):
        upd["name"] = str(data["name"])[:80]
    if data.get("risk_pct") is not None:
        r = float(data["risk_pct"])
        if not 0.1 <= r <= 2.0:
            raise ValueError("Ryzyko bota: 0.1–2%.")
        upd["risk_pct"] = r
    if data.get("leverage") is not None:
        upd["leverage"] = max(1.0, min(float(paper.MAX_LEVERAGE), float(data["leverage"])))
    if data.get("params") is not None:
        p = merge_params(b["strategy"], {**json.loads(b["params"] or "{}"), **data["params"]})
        _validate(b["strategy"], b["interval"], p)
        upd["params"] = json.dumps(p)
    db.update("tr_bots", bid, upd)
    if "status" in upd:
        _log(bid, "Bot uruchomiony." if upd["status"] == "running" else "Bot wstrzymany.")
    return get_bot(bid)


def toggle_bot(bid: int, status: str | None = None) -> dict:
    b = db.one("SELECT status FROM tr_bots WHERE id = ?", (bid,))
    if not b:
        raise ValueError(f"Brak bota #{bid}.")
    new = status if status in ("running", "paused") else ("paused" if b["status"] == "running" else "running")
    return update_bot(bid, {"status": new})


async def delete_bot(bid: int) -> dict:
    closed = []
    for p in paper.open_positions(bot_id=bid):
        try:
            closed.append(await paper.close_position(p["id"], reason="bot_deleted", source_ok=market.demo_mode()))
        except (paper.TradeError, market.MarketDataError) as e:
            log.warning("Nie zamknięto pozycji bota %s: %s", bid, e)
    db.execute("DELETE FROM tr_bots WHERE id = ?", (bid,))
    db.execute("DELETE FROM tr_bot_log WHERE bot_id = ?", (bid,))
    db.execute("UPDATE tr_positions SET note = note || ' (bot usunięty)' WHERE bot_id = ? AND status = 'closed'", (bid,))
    return {"ok": True, "closed_positions": closed}


# ---------------------------------------------------------------------------
# Pętla botów (scheduler co minutę) – idempotentna per zamknięta świeca
# ---------------------------------------------------------------------------
async def run_bot(b: dict) -> dict | None:
    data = await market.get_candles(b["symbol"], b["interval"], 300, allow_synthetic=False)
    candles = data["candles"]
    if len(candles) < 60:
        return None
    closed = candles[:-1]  # ostatnia świeca jest jeszcze w trakcie
    last_t = closed[-1]["t"]
    if b["last_candle"] == last_t:
        return None
    params = json.loads(b["params"] or "{}")
    state = json.loads(b["state"] or "{}")
    S = prepare(b["strategy"], closed, params)
    op = paper.open_positions(bot_id=b["id"])
    pos = {"side": op[0]["side"], "day": state.get("pos_day")} if op else None
    d = decide(b["strategy"], S, len(closed) - 1, params, pos, state)
    result = None
    price, source = candles[-1]["c"], data["source"]
    if d and d["action"] == "close" and op:
        res = await paper.close_position(op[0]["id"], price=price, reason="bot")
        _log(b["id"], f"Zamknięto {op[0]['side'].upper()} @ {res['exit']} ({res['pnl']:+.2f} USDT) – {d['reason']}.")
        await notify(f"🤖 {b['name']}: zamknięcie (DEMO)", f"{op[0]['side'].upper()} {b['symbol']} @ {res['exit']}\n"
                     f"Wynik {res['pnl']:+.2f} USDT – {d['reason']}", level="crypto")
        result = {"bot": b["id"], "closed": res}
    elif d and d["action"] == "open" and not op:
        try:
            res = await paper.open_position(d["side"], b["symbol"], risk_pct=b["risk_pct"], leverage=b["leverage"],
                                            sl=d["sl"], tp=d["tp"], bot_id=b["id"], note=d["reason"], price=price, source=source)
            p = res["position"]
            state["pos_day"] = d.get("day")
            _log(b["id"], f"Otwarto {d['side'].upper()} @ {p['entry']} (SL {p['sl']}, TP {p['tp']}) – {d['reason']}.")
            await notify(f"🤖 {b['name']}: {d['side'].upper()} (DEMO)",
                         f"{b['symbol']} @ {p['entry']} · SL {p['sl']} · TP {p['tp']}\n{d['reason']}\nKonto demo – wirtualne pieniądze.",
                         level="crypto")
            result = {"bot": b["id"], "opened": p}
        except (paper.TradeError, market.MarketDataError) as e:
            _log(b["id"], f"Sygnał {d['side'].upper()} odrzucony: {e}")
            result = {"bot": b["id"], "rejected": str(e)}
    db.update("tr_bots", b["id"], {"last_candle": last_t, "state": json.dumps(state)})
    return result


async def run_bots() -> list[dict]:
    """Wywoływane przez scheduler co minutę. Ocenia działające boty tylko na nowych zamkniętych świecach."""
    out = []
    for b in db.query("SELECT * FROM tr_bots WHERE status = 'running'"):
        try:
            r = await run_bot(b)
            if r:
                out.append(r)
        except market.MarketDataError as e:
            log.warning("Bot %s: brak danych (%s)", b["id"], e)
        except Exception as e:  # noqa: BLE001 - jeden bot nie może zatrzymać pozostałych
            log.exception("Bot %s: błąd", b["id"])
            _log(b["id"], f"Błąd: {type(e).__name__}: {e}")
    return out
