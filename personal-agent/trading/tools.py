"""Narzędzia agenta dla modułu TRADING. Wszystko na koncie DEMO – wirtualne pieniądze, zero prawdziwych zleceń."""
from __future__ import annotations

from . import analysis, backtest, bots, knowledge, market, paper

_SYM = {"type": "string", "description": "Para, np. BTCUSDT, ETHUSDT, SOLUSDT (samo BTC też zadziała)."}
_IV = {"type": "string", "enum": ["1", "5", "15", "60", "240", "D"], "description": "Interwał świec: minuty (1/5/15/60/240) albo D (dzień)."}
_STRATS = list(bots.STRATEGIES)

TOOLS: list[dict] = [
    {
        "name": "market_analysis",
        "description": "Analiza techniczna pary krypto (Bybit) na wielu interwałach: trend, struktura (HH/HL vs LH/LL), "
                       "wskaźniki (EMA20/50/200, RSI, MACD, Bollinger, ATR, ADX, VWAP), wsparcia/opory, punkty LONG vs SHORT "
                       "(suma 100, filtr trendu) oraz opinie dwóch agentek: Luna (trend/swing) i Nova (momentum) z wejściem/SL/TP "
                       "i konsensusem. Liczby są wyliczone przez system – nie zmieniaj ich. To edukacja, nie porada inwestycyjna. "
                       "Jeśli source = synthetic, uprzedź, że dane są syntetyczne (demo).",
        "input_schema": {"type": "object", "properties": {"symbol": _SYM, "interval": _IV}, "required": ["symbol"]},
    },
    {
        "name": "get_candles",
        "description": "Podsumowanie świec dla pary i interwału: ostatnia cena, zmiana %, max/min, średni wolumen, ostatnie świece OHLC.",
        "input_schema": {"type": "object", "properties": {
            "symbol": _SYM, "interval": _IV,
            "limit": {"type": "integer", "description": "Ile świec przeanalizować (10–500, domyślnie 100)."},
        }, "required": ["symbol"]},
    },
    {
        "name": "paper_order",
        "description": "Otwiera pozycję na koncie DEMO (paper trading, WIRTUALNE pieniądze – nigdy prawdziwa giełda). "
                       "side: long/buy albo short/sell. Wielkość: usdt_amount (depozyt; wartość = depozyt × dźwignia) ALBO risk_pct "
                       "(% kapitału ryzykowany do SL; bez SL system ustawi SL = 2×ATR i TP = 2R). Dźwignia 1–20. "
                       "Obowiązują limity ryzyka (max 2% na transakcję, limit pozycji, dzienny limit straty). "
                       "Zanim złożysz zlecenie, potwierdź parametry z użytkownikiem, jeśli sam ich nie podał.",
        "input_schema": {"type": "object", "properties": {
            "side": {"type": "string", "enum": ["long", "short", "buy", "sell"]},
            "symbol": _SYM,
            "usdt_amount": {"type": "number", "description": "Depozyt (margin) w USDT."},
            "risk_pct": {"type": "number", "description": "Ryzyko w % kapitału (np. 1)."},
            "leverage": {"type": "number", "description": "Dźwignia 1–20 (domyślnie 1)."},
            "sl": {"type": "number", "description": "Cena stop loss."},
            "tp": {"type": "number", "description": "Cena take profit."},
            "note": {"type": "string", "description": "Notatka do dziennika (np. powód wejścia)."},
        }, "required": ["side", "symbol"]},
    },
    {
        "name": "paper_close",
        "description": "Zamyka (całą lub część) pozycję na koncie DEMO po bieżącej cenie. Wirtualne pieniądze.",
        "input_schema": {"type": "object", "properties": {
            "position_id": {"type": "integer"},
            "fraction": {"type": "number", "description": "Jaka część pozycji (0–1, domyślnie 1 = całość)."},
        }, "required": ["position_id"]},
    },
    {
        "name": "paper_status",
        "description": "Stan konta DEMO (wirtualne USDT): saldo, equity, otwarte pozycje z PnL, statystyki (win rate, profit factor, "
                       "średnie R), wynik dnia, ostatnie zamknięte transakcje z dziennika.",
        "input_schema": {"type": "object", "properties": {
            "trades": {"type": "integer", "description": "Ile ostatnich transakcji dołączyć (domyślnie 10)."},
        }},
    },
    {
        "name": "bot_create",
        "description": "Tworzy bota DEMO, który sam handluje na koncie paper (wirtualne pieniądze, nigdy prawdziwe zlecenia). "
                       "Strategie: ema_cross (przecięcie EMA, parametry fast/slow/trend_filter/sl_atr/tp_atr), "
                       "rsi_reversion (period/low/high/exit/sl_atr/tp_atr), breakout_range (wybicie zakresu 03:00–06:00, "
                       "start_hour/end_hour/close_hour/sl_factor/tp_factor; interwał ≤ 1h), agent_consensus (Luna+Nova, min_score/exit_score). "
                       "Bot działa na zamkniętych świecach co minutę.",
        "input_schema": {"type": "object", "properties": {
            "strategy": {"type": "string", "enum": _STRATS},
            "symbol": _SYM, "interval": _IV,
            "params": {"type": "object", "description": "Parametry strategii (opcjonalnie)."},
            "risk_pct": {"type": "number", "description": "Ryzyko na transakcję 0.1–2% (domyślnie 1)."},
            "leverage": {"type": "number", "description": "Dźwignia 1–20 (domyślnie 3)."},
            "name": {"type": "string"},
            "start": {"type": "boolean", "description": "Uruchomić od razu (domyślnie tak)."},
        }, "required": ["strategy", "symbol"]},
    },
    {
        "name": "bot_list",
        "description": "Lista botów DEMO ze statusem, statystykami (transakcje, win rate, PnL) i otwartą pozycją.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "bot_toggle",
        "description": "Uruchamia/wstrzymuje bota DEMO albo go usuwa (action: start | pause | toggle | delete).",
        "input_schema": {"type": "object", "properties": {
            "bot_id": {"type": "integer"},
            "action": {"type": "string", "enum": ["start", "pause", "toggle", "delete"]},
        }, "required": ["bot_id"]},
    },
    {
        "name": "backtest_run",
        "description": "Backtest strategii na historycznych świecach: zwrot %, win rate, profit factor, max drawdown, liczba transakcji, "
                       "średnie R, porównanie z kup-i-trzymaj oraz krzywa kapitału (pokaż ją blokiem ```chart typu line). "
                       "Symulacja na wirtualnym kapitale – wyniki historyczne nie gwarantują przyszłych.",
        "input_schema": {"type": "object", "properties": {
            "strategy": {"type": "string", "enum": _STRATS},
            "symbol": _SYM, "interval": _IV,
            "days": {"type": "integer", "description": "Okres w dniach (1–365, domyślnie 30; max 5000 świec)."},
            "params": {"type": "object"},
            "risk_pct": {"type": "number"}, "leverage": {"type": "number"},
        }, "required": ["strategy", "symbol"]},
    },
    {
        "name": "trading_knowledge",
        "description": "Baza wiedzy tradingowej użytkownika (z projektu MESSUAI): biblia tradingu (Murphy, Nison, Douglas, Chan, Coulling), "
                       "strategie, wskaźniki, smart money, sesje, derywaty, makro, on-chain, sentyment, zarządzanie ryzykiem, agenci. "
                       "Bez tematu – lista tematów. Z query – tylko pasujące fragmenty.",
        "input_schema": {"type": "object", "properties": {
            "topic": {"type": "string"}, "query": {"type": "string", "description": "Fraza do wyszukania w temacie."},
        }},
    },
]

NAMES = {t["name"] for t in TOOLS}
LABELS = {
    "market_analysis": "Analizuję rynek (Luna i Nova)", "get_candles": "Pobieram świece",
    "paper_order": "Składam zlecenie DEMO", "paper_close": "Zamykam pozycję DEMO", "paper_status": "Sprawdzam konto demo",
    "bot_create": "Tworzę bota demo", "bot_list": "Sprawdzam boty", "bot_toggle": "Przełączam bota",
    "backtest_run": "Robię backtest", "trading_knowledge": "Zaglądam do wiedzy tradingowej",
}
CHANGES = {"paper_order": "trading", "paper_close": "trading", "bot_create": "trading", "bot_toggle": "trading"}


def _compact_analysis(a: dict) -> dict:
    out = {k: a[k] for k in ("symbol", "interval", "htf_interval", "source", "price", "trend", "trend_strength", "structure",
                             "htf_trend", "long_score", "short_score", "long_reasons", "short_reasons", "levels", "consensus",
                             "disclaimer")}
    out["indicators"] = a["indicators"]
    out["agents"] = [{k: x[k] for k in ("name", "style", "long_score", "short_score", "direction", "thesis", "entry", "sl", "tp", "rr",
                                        "long_reasons", "short_reasons")} for x in a["agents"]]
    if a["source"] == "synthetic":
        out["uwaga"] = "DANE SYNTETYCZNE (tryb demo/offline) – nie są to prawdziwe ceny rynkowe."
    return out


async def execute(name: str, args: dict):
    a = args or {}
    try:
        match name:
            case "market_analysis":
                res = await analysis.analyze(a.get("symbol"), a.get("interval") or "60", ai=False,
                                             allow_synthetic=market.demo_mode())
                return _compact_analysis(res)
            case "get_candles":
                lim = max(10, min(int(a.get("limit") or 100), 500))
                d = await market.get_candles(a.get("symbol"), a.get("interval") or "60", lim, allow_synthetic=market.demo_mode())
                c = d["candles"]
                first, lastc = c[0], c[-1]
                return {"symbol": d["symbol"], "interval": d["interval"], "source": d["source"], "candles": len(c),
                        "price": lastc["c"], "change_pct": round((lastc["c"] / first["o"] - 1) * 100, 2),
                        "high": max(k["h"] for k in c), "low": min(k["l"] for k in c),
                        "avg_volume": round(sum(k["v"] for k in c) / len(c), 2),
                        "last": [[k["t"], k["o"], k["h"], k["l"], k["c"], round(k["v"], 2)] for k in c[-12:]],
                        "format": "[czas_ms, open, high, low, close, volume]"}
            case "paper_order":
                return await paper.open_position(a.get("side"), a.get("symbol"), usdt_amount=a.get("usdt_amount"),
                                                 risk_pct=a.get("risk_pct"), leverage=a.get("leverage") or 1,
                                                 sl=a.get("sl"), tp=a.get("tp"), note=a.get("note") or "agent")
            case "paper_close":
                return await paper.close_position(int(a["position_id"]), a.get("fraction") or 1.0,
                                                  source_ok=market.demo_mode())
            case "paper_status":
                st = await paper.status()
                st["recent_trades"] = paper.trades(int(a.get("trades") or 10))
                return st
            case "bot_create":
                return bots.create_bot(a)
            case "bot_list":
                return await bots.list_bots()
            case "bot_toggle":
                act = a.get("action") or "toggle"
                if act == "delete":
                    return await bots.delete_bot(int(a["bot_id"]))
                return bots.toggle_bot(int(a["bot_id"]), {"start": "running", "pause": "paused"}.get(act))
            case "backtest_run":
                res = await backtest.run_backtest(a.get("strategy") or "ema_cross", a.get("symbol") or "BTCUSDT",
                                                  a.get("interval") or "60", a.get("days") or 30, a.get("params"),
                                                  a.get("risk_pct") or 1, a.get("leverage") or 3,
                                                  allow_synthetic=market.demo_mode())
                start = res["metrics"]["start_balance"]
                res["chart"] = {"type": "line", "title": f"Wynik od startu – {res['strategy_label']} {res['symbol']} (USDT)",
                                "labels": res["equity_curve"]["labels"], "unit": "USDT",
                                "series": [{"name": "Zysk/strata", "data": [round(v - start, 2) for v in res["equity_curve"]["values"]]}]}
                res.pop("equity_curve")
                res["trades"] = res["trades"][-10:]
                return res
            case "trading_knowledge":
                if not a.get("topic"):
                    return {"topics": knowledge.list_topics()}
                return knowledge.get(a["topic"], a.get("query"))
    except (paper.TradeError, ValueError, market.MarketDataError) as e:
        return {"error": str(e), "demo": True}
    return {"error": f"Nieznane narzędzie: {name}"}
