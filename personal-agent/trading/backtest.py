"""Backtest strategii botów na historycznych świecach (ta sama logika decyzji co boty DEMO).

Założenia: sygnał na zamknięciu świecy → wejście po cenie zamknięcia; SL/TP sprawdzane na high/low kolejnych
świec (gdy w jednej świecy padł i SL, i TP – liczymy SL); opłata 0.06% przy wejściu i wyjściu;
wielkość pozycji z ryzyka % kapitału do SL (ograniczona dźwignią).
"""
from __future__ import annotations

from datetime import datetime, timezone

from . import bots, market
from .paper import FEE


def _rp(x):
    if x is None:
        return None
    a = abs(x)
    return round(x, 2 if a >= 100 else 4 if a >= 1 else 6)


async def run_backtest(strategy: str, symbol: str = "BTCUSDT", interval: str = "60", days: int = 30,
                       params: dict | None = None, risk_pct: float = 1.0, leverage: float = 3,
                       start_balance: float = 10_000, allow_synthetic: bool = True) -> dict:
    symbol, interval = market.norm_symbol(symbol), market.norm_interval(interval)
    p = bots.merge_params(strategy, params)
    bots._validate(strategy, interval, p)
    risk_pct = max(0.1, min(5.0, float(risk_pct or 1)))
    leverage = max(1.0, min(20.0, float(leverage or 1)))
    days = max(1, min(int(days or 30), 365))
    warm = 210
    n_needed = int(days * 1440 / market.INTERVAL_MIN[interval]) + warm
    n_needed = max(120, min(n_needed, 5000))
    data = await market.get_candles(symbol, interval, n_needed, allow_synthetic=allow_synthetic)
    candles = data["candles"][:-1]  # bez bieżącej świecy
    if len(candles) < 80:
        raise ValueError("Za mało świec do backtestu.")
    S = bots.prepare(strategy, candles, p)
    start = min(warm, len(candles) // 3)
    bal = float(start_balance)
    pos = None
    state: dict = {}
    trades, curve = [], []
    peak, max_dd = bal, 0.0

    def close(i, price, reason):
        nonlocal bal, pos
        sg = 1 if pos["side"] == "long" else -1
        gross = sg * (price - pos["entry"]) * pos["qty"]
        fee = pos["qty"] * price * FEE
        pnl = gross - fee - pos["fee_open"]
        bal += gross - fee
        trades.append({"side": pos["side"], "entry_t": pos["t"], "exit_t": candles[i]["t"], "entry": _rp(pos["entry"]),
                       "exit": _rp(price), "pnl": round(pnl, 2), "r": round(pnl / pos["risk"], 2) if pos["risk"] else None,
                       "reason": reason, "why": pos["why"]})
        pos = None

    for i in range(start, len(candles)):
        k = candles[i]
        if pos and i > pos["i"]:
            long = pos["side"] == "long"
            if pos["sl"] is not None and (k["l"] <= pos["sl"] if long else k["h"] >= pos["sl"]):
                close(i, pos["sl"], "sl")
            elif pos["tp"] is not None and (k["h"] >= pos["tp"] if long else k["l"] <= pos["tp"]):
                close(i, pos["tp"], "tp")
        d = bots.decide(strategy, S, i, p, {"side": pos["side"], "day": pos.get("day")} if pos else None, state)
        if d and d["action"] == "close" and pos:
            close(i, k["c"], d["reason"])
        elif d and d["action"] == "open" and not pos and d.get("sl"):
            entry = k["c"]
            dist = abs(entry - d["sl"])
            if dist <= 0:
                continue
            qty = bal * risk_pct / 100 / dist
            qty = min(qty, bal * leverage / entry)
            fee_open = qty * entry * FEE
            bal -= fee_open
            pos = {"side": d["side"], "entry": entry, "qty": qty, "sl": d["sl"], "tp": d.get("tp"), "i": i, "t": k["t"],
                   "fee_open": fee_open, "risk": qty * dist + 2 * fee_open, "why": d["reason"], "day": d.get("day")}
        eq = bal + ((1 if pos["side"] == "long" else -1) * (k["c"] - pos["entry"]) * pos["qty"] if pos else 0)
        peak = max(peak, eq)
        max_dd = max(max_dd, (peak - eq) / peak * 100 if peak else 0)
        curve.append((k["t"], eq))
    if pos:
        close(len(candles) - 1, candles[-1]["c"], "koniec testu")
        curve[-1] = (candles[-1]["t"], bal)

    pnls = [t["pnl"] for t in trades]
    wins = [x for x in pnls if x > 0]
    gl = -sum(x for x in pnls if x <= 0)
    rs = [t["r"] for t in trades if t["r"] is not None]
    step = max(1, -(-len(curve) // 160))
    pts = curve[::step]
    if pts[-1] != curve[-1]:
        pts.append(curve[-1])
    span_days = (curve[-1][0] - curve[0][0]) / 86_400_000
    fmt = "%H:%M" if span_days <= 2 else "%d.%m" if span_days <= 300 else "%m.%y"
    first_c, last_c = candles[start]["c"], candles[-1]["c"]
    return {
        "demo": True, "source": data["source"], "strategy": strategy, "strategy_label": bots.STRATEGIES[strategy]["label"],
        "symbol": symbol, "interval": interval, "params": p, "risk_pct": risk_pct, "leverage": leverage,
        "period": {"from": datetime.fromtimestamp(candles[start]["t"] / 1000, tz=timezone.utc).strftime("%Y-%m-%d %H:%M"),
                   "to": datetime.fromtimestamp(candles[-1]["t"] / 1000, tz=timezone.utc).strftime("%Y-%m-%d %H:%M"),
                   "candles": len(candles) - start},
        "metrics": {
            "start_balance": start_balance, "final_balance": round(bal, 2),
            "return_pct": round((bal / start_balance - 1) * 100, 2),
            "buy_hold_pct": round((last_c / first_c - 1) * 100, 2),
            "trades": len(trades), "win_rate": round(len(wins) / len(trades) * 100, 1) if trades else None,
            "profit_factor": round(sum(wins) / gl, 2) if gl > 0 else (None if not wins else 99.0),
            "max_drawdown_pct": round(max_dd, 2), "avg_r": round(sum(rs) / len(rs), 2) if rs else None,
            "best": max(pnls) if pnls else None, "worst": min(pnls) if pnls else None,
        },
        "equity_curve": {"labels": [datetime.fromtimestamp(t / 1000, tz=timezone.utc).strftime(fmt) for t, _ in pts],
                         "values": [round(v, 2) for _, v in pts]},
        "trades": trades[-200:],
        "note": "Wyniki historyczne nie gwarantują przyszłych. Backtest bez poślizgu i finansowania (funding).",
    }
