"""Analiza wielu interwałów (multi-timeframe) + dwie agentki-analityczki: Luna i Nova.

Zasady punktacji pochodzą z UNIFIED_ANALYSIS_PROMPT (MESSUAI agents_config):
  LONG + SHORT = 100, trend filter: przeciw trendowi maksymalnie 30.
Liczby liczy kod (deterministycznie). Model językowy (opcjonalnie, ai=True) tylko je OBJAŚNIA – nie zmienia.
"""
from __future__ import annotations

import json
import logging

from . import indicators as ind
from . import market

log = logging.getLogger("trading.analysis")

# Dwie konkurujące agentki (pomysł z ml_agents_manager.py: dwa niezależne modele, wspólna decyzja).
PERSONAS = {
    "luna": {"name": "Luna", "emoji": "🌙", "style": "trend / swing",
             "desc": "Patrzy z góry: kierunek z wyższego interwału (HTF), wejścia na cofnięciach do wsparć/oporów.",
             "sl_atr": 2.0, "tp_atr": 4.0, "weight": 0.5},
    "nova": {"name": "Nova", "emoji": "✨", "style": "momentum / scalping",
             "desc": "Łapie impet na niższym interwale (LTF): MACD, RSI, wolumen, VWAP – ale nie gra przeciw trendowi HTF.",
             "sl_atr": 1.5, "tp_atr": 3.0, "weight": 0.5},
}
MIN_CONFIDENCE = 60       # poniżej – WAIT
TREND_CAP = 30            # max. punktów przeciw trendowi
HTF = {"1": "15", "3": "15", "5": "60", "15": "60", "30": "240", "60": "240", "120": "D", "240": "D", "D": "W", "W": "W"}

UNIFIED_PROMPT_PL = """Jesteś analityczką rynku krypto w aplikacji DEMO (wirtualne pieniądze, to nie porada inwestycyjna).
Zasady oceny (LONG + SHORT = 100):
1. Cena vs EMA200: powyżej +20 LONG, poniżej +20 SHORT. 2. Cena vs EMA50: ±10.
3. Struktura: HH+HL +15 LONG, LH+LL +15 SHORT. 4. MACD >0 +10 LONG, <0 +10 SHORT.
5. RSI >50 i rośnie +10 LONG, <50 i spada +10 SHORT. 6. Wolumen rośnie na zielonej +5 LONG, na czerwonej +5 SHORT.
Trend filter: w spadkach LONG max 30, we wzrostach SHORT max 30 – nie walcz z trendem.
Poniżej masz WYNIKI policzone przez system (Luna – trend/swing HTF, Nova – momentum LTF, konsensus).
NIE zmieniaj żadnych liczb ani poziomów. Po polsku, zwięźle (maks. 6 zdań): wyjaśnij obraz rynku, dlaczego agentki
się zgadzają lub nie, co unieważnia scenariusz i na co uważać (ryzyko, zmienność). Bez obietnic zysku."""


def _r(x, nd=None):
    if x is None:
        return None
    if nd is None:
        a = abs(x)
        nd = 2 if a >= 100 else 4 if a >= 1 else 6
    return round(x, nd)


# ---------------------------------------------------------------------------
# Migawka wskaźników na indeksie i
# ---------------------------------------------------------------------------
def snapshot(S: dict, i: int | None = None) -> dict:
    n = len(S["c"])
    i = n - 1 if i is None else i
    L = lambda k, j=i: ind.last(S[k], j)  # noqa: E731
    price = S["c"][i]
    ema200 = L("ema200")
    ema50 = L("ema50")
    ema20 = L("ema20")
    st = ind.market_structure(S["swings"], upto=i)
    vol_avg = ind.last(S["vol_sma"], i - 1) if i > 0 else None
    snap = {
        "price": price, "ema9": L("ema9"), "ema20": ema20, "ema21": L("ema21"), "ema50": ema50, "ema200": ema200,
        "rsi": L("rsi"), "rsi_prev": ind.last(S["rsi"], max(0, i - 3)),
        "macd": L("macd"), "signal": L("signal"), "hist": L("hist"), "hist_prev": ind.last(S["hist"], max(0, i - 1)),
        "bb_up": L("bb_up"), "bb_mid": L("bb_mid"), "bb_low": L("bb_low"),
        "atr": L("atr"), "adx": L("adx"), "vwap": S["vwap"][i],
        "vol_ratio": (S["v"][i] / vol_avg) if vol_avg else 1.0, "green": S["c"][i] >= S["o"][i],
        "structure": st["structure"], "structure_label": st["label"],
    }
    snap["atr_pct"] = (snap["atr"] / price * 100) if snap["atr"] else None
    ref = ema200 if ema200 is not None else ema50
    above = ref is not None and price > ref
    below = ref is not None and price < ref
    if above and st["structure"] == "HH_HL":
        trend, strength = "UPTREND", "STRONG" if ema20 and ema50 and ema20 > ema50 > (ema200 or 0) else "MODERATE"
    elif below and st["structure"] == "LH_LL":
        trend, strength = "DOWNTREND", "STRONG" if ema20 and ema50 and ema200 and ema20 < ema50 < ema200 else "MODERATE"
    elif above and ema50 and price > ema50:
        trend, strength = "UPTREND", "WEAK"
    elif below and ema50 and price < ema50:
        trend, strength = "DOWNTREND", "WEAK"
    else:
        trend, strength = "NEUTRAL", "WEAK"
    snap["trend"], snap["trend_strength"] = trend, strength
    return snap


def _cap(long_score: float, trend: str, strength: str) -> float:
    """Trend filter: przeciw silnemu/umiarkowanemu trendowi max 30 pkt."""
    if strength == "WEAK":
        return long_score
    if trend == "DOWNTREND":
        return min(long_score, TREND_CAP)
    if trend == "UPTREND":
        return max(long_score, 100 - TREND_CAP)
    return long_score


def unified(s: dict) -> dict:
    """Punktacja z UNIFIED_ANALYSIS_PROMPT. Zwraca long/short (suma 100) i powody."""
    rl, rs = [], []
    pl = ps = 0

    def add(cond_l, cond_s, pts, why_l, why_s):
        nonlocal pl, ps
        if cond_l:
            pl += pts
            rl.append(why_l)
        elif cond_s:
            ps += pts
            rs.append(why_s)

    p = s["price"]
    if s["ema200"] is not None:
        add(p > s["ema200"], p < s["ema200"], 20, "cena nad EMA200", "cena pod EMA200")
    if s["ema50"] is not None:
        add(p > s["ema50"], p < s["ema50"], 10, "cena nad EMA50", "cena pod EMA50")
    add(s["structure"] == "HH_HL", s["structure"] == "LH_LL", 15, "struktura HH+HL", "struktura LH+LL")
    if s["macd"] is not None:
        add(s["macd"] > 0, s["macd"] < 0, 10, "MACD powyżej zera", "MACD poniżej zera")
    if s["rsi"] is not None and s["rsi_prev"] is not None:
        add(s["rsi"] > 50 and s["rsi"] >= s["rsi_prev"], s["rsi"] < 50 and s["rsi"] <= s["rsi_prev"], 10,
            f"RSI {s['rsi']:.0f} > 50 i rośnie", f"RSI {s['rsi']:.0f} < 50 i spada")
    add(s["vol_ratio"] > 1.2 and s["green"], s["vol_ratio"] > 1.2 and not s["green"], 5,
        "wolumen rośnie na zielonej świecy", "wolumen rośnie na czerwonej świecy")
    long_score = 50 + (pl - ps) / 70 * 45
    long_score = _cap(long_score, s["trend"], s["trend_strength"])
    long_score = int(round(max(3, min(97, long_score))))
    return {"long": long_score, "short": 100 - long_score, "long_reasons": rl, "short_reasons": rs}


# ---------------------------------------------------------------------------
# Agentki
# ---------------------------------------------------------------------------
def _levels_plan(direction: str, price: float, atr_v: float, sl_atr: float, tp_atr: float,
                 levels: list[dict] | None) -> dict:
    """Wejście/SL/TP na bazie ATR (risk_manager: SL 2×ATR, TP 4×ATR, R:R min 1:2) z buforem za poziomem S/R."""
    if not atr_v or direction not in ("LONG", "SHORT"):
        return {"entry": None, "sl": None, "tp": None, "rr": None}
    sgn = 1 if direction == "LONG" else -1
    sl = price - sgn * sl_atr * atr_v
    lv = levels or []
    if direction == "LONG":
        sup = [x["price"] for x in lv if x["type"] == "support" and price - x["price"] <= 3 * atr_v]
        if sup:
            sl = min(sl, max(sup) * (1 - 0.0015))
    else:
        res = [x["price"] for x in lv if x["type"] == "resistance" and x["price"] - price <= 3 * atr_v]
        if res:
            sl = max(sl, min(res) * (1 + 0.0015))
    risk = abs(price - sl)
    tp = price + sgn * max(tp_atr * atr_v, 2 * risk)
    return {"entry": _r(price), "sl": _r(sl), "tp": _r(tp), "rr": round(abs(tp - price) / risk, 2) if risk else None}


def _direction(long_s: int) -> str:
    return "LONG" if long_s >= MIN_CONFIDENCE else "SHORT" if 100 - long_s >= MIN_CONFIDENCE else "WAIT"


def luna(ltf: dict, htf: dict, levels: list[dict] | None = None) -> dict:
    cfg = PERSONAS["luna"]
    uh, ul = unified(htf), unified(ltf)
    score = 0.65 * uh["long"] + 0.35 * ul["long"]
    rl = [f"HTF: {r}" for r in uh["long_reasons"]] + ul["long_reasons"][:2]
    rs = [f"HTF: {r}" for r in uh["short_reasons"]] + ul["short_reasons"][:2]
    price, a = ltf["price"], ltf["atr"] or 0
    bull, bear = uh["long"] >= 55, uh["short"] >= 55
    for lv in levels or []:
        near = a and abs(lv["price"] - price) <= 1.0 * a
        if not near:
            continue
        if lv["type"] == "support" and bull:
            score += 8
            rl.append(f"cofnięcie do wsparcia {_r(lv['price'])}")
        elif lv["type"] == "resistance" and bull:
            score -= 6
            rs.append(f"cena tuż pod oporem {_r(lv['price'])}")
        elif lv["type"] == "resistance" and bear:
            score -= 8
            rs.append(f"odbicie pod opór {_r(lv['price'])}")
        elif lv["type"] == "support" and bear:
            score += 6
            rl.append(f"cena tuż nad wsparciem {_r(lv['price'])}")
        break
    if htf["rsi"] is not None and htf["rsi"] > 75:
        score -= 5
        rs.append(f"HTF RSI {htf['rsi']:.0f} – wykupienie")
    elif htf["rsi"] is not None and htf["rsi"] < 25:
        score += 5
        rl.append(f"HTF RSI {htf['rsi']:.0f} – wyprzedanie")
    score = int(round(max(3, min(97, _cap(score, htf["trend"], htf["trend_strength"])))))
    d = _direction(score)
    plan = _levels_plan(d, price, a, cfg["sl_atr"], cfg["tp_atr"], levels)
    trend_pl = {"UPTREND": "trend wzrostowy", "DOWNTREND": "trend spadkowy", "NEUTRAL": "brak wyraźnego trendu"}
    thesis = (f"Na wyższym interwale widzę {trend_pl[htf['trend']]} ({htf['structure_label']}). "
              + ("Gram z trendem: szukam " + ("kupna na cofnięciu." if d == "LONG" else "sprzedaży na odbiciu.")
                 if d != "WAIT" else "Sygnały są mieszane – czekam na wyraźniejszy kierunek lub test poziomu."))
    return {"id": "luna", **{k: cfg[k] for k in ("name", "emoji", "style", "desc")}, "long_score": score,
            "short_score": 100 - score, "direction": d, "confidence": max(score, 100 - score),
            "long_reasons": rl[:6], "short_reasons": rs[:6], "thesis": thesis, **plan}


def nova(ltf: dict, htf: dict, levels: list[dict] | None = None) -> dict:
    cfg = PERSONAS["nova"]
    net, rl, rs = 0.0, [], []

    def pt(cond_l, cond_s, w, why_l, why_s):
        nonlocal net
        if cond_l:
            net += w
            rl.append(why_l)
        elif cond_s:
            net -= w
            rs.append(why_s)

    s = ltf
    h, hp = s["hist"], s["hist_prev"]
    if h is not None and hp is not None:
        pt(h > 0 >= hp, h < 0 <= hp, 12, "MACD przecina sygnał w górę", "MACD przecina sygnał w dół")
        pt(h > 0 and h > hp, h < 0 and h < hp, 6, "histogram MACD rośnie", "histogram MACD słabnie w dół")
    if s["rsi"] is not None and s["rsi_prev"] is not None:
        pt(50 < s["rsi"] < 72 and s["rsi"] > s["rsi_prev"], 28 < s["rsi"] < 50 and s["rsi"] < s["rsi_prev"], 8,
           f"RSI {s['rsi']:.0f} przyspiesza w górę", f"RSI {s['rsi']:.0f} przyspiesza w dół")
        pt(s["rsi"] < 25, s["rsi"] > 78, 5, f"RSI {s['rsi']:.0f} skrajnie wyprzedane", f"RSI {s['rsi']:.0f} skrajnie wykupione")
    if s["ema9"] is not None and s["ema21"] is not None:
        pt(s["ema9"] > s["ema21"], s["ema9"] < s["ema21"], 8, "EMA9 nad EMA21", "EMA9 pod EMA21")
    if s["ema20"] is not None:
        pt(s["price"] > s["ema20"], s["price"] < s["ema20"], 6, "cena nad EMA20", "cena pod EMA20")
    pt(s["price"] > s["vwap"], s["price"] < s["vwap"], 6, "cena nad VWAP", "cena pod VWAP")
    pt(s["vol_ratio"] > 1.5 and s["green"], s["vol_ratio"] > 1.5 and not s["green"], 8,
       f"skok wolumenu ×{s['vol_ratio']:.1f} na wzroście", f"skok wolumenu ×{s['vol_ratio']:.1f} na spadku")
    if s["bb_up"] is not None:
        pt(s["price"] > s["bb_up"] and s["vol_ratio"] > 1.2, s["price"] < s["bb_low"] and s["vol_ratio"] > 1.2, 6,
           "wybicie nad górne Bollingera", "wybicie pod dolne Bollingera")
    score = 50 + net / 65 * 45
    if s["adx"] is not None and s["adx"] > 25:
        score = 50 + (score - 50) * 1.2
        (rl if net > 0 else rs).append(f"ADX {s['adx']:.0f} – rynek w trendzie")
    score = int(round(max(3, min(97, _cap(score, htf["trend"], htf["trend_strength"])))))
    d = _direction(score)
    plan = _levels_plan(d, s["price"], s["atr"] or 0, cfg["sl_atr"], cfg["tp_atr"], levels)
    thesis = ("Impet jest po stronie " + ("kupujących" if score >= 50 else "sprzedających")
              + (f" – wchodzę szybko, ciasny SL ({cfg['sl_atr']}×ATR)." if d != "WAIT"
                 else ", ale za słaby, żeby grać. Czekam na przecięcie MACD albo skok wolumenu.")
              + (" Trend HTF ogranicza grę pod prąd." if htf["trend"] != "NEUTRAL" and htf["trend_strength"] != "WEAK" else ""))
    return {"id": "nova", **{k: cfg[k] for k in ("name", "emoji", "style", "desc")}, "long_score": score,
            "short_score": 100 - score, "direction": d, "confidence": max(score, 100 - score),
            "long_reasons": rl[:6], "short_reasons": rs[:6], "thesis": thesis, **plan}


def consensus(agents: list[dict]) -> dict:
    tw = sum(PERSONAS[a["id"]]["weight"] for a in agents) or 1
    long_s = int(round(sum(a["long_score"] * PERSONAS[a["id"]]["weight"] for a in agents) / tw))
    dirs = {a["direction"] for a in agents}
    if len(dirs) == 1 and "WAIT" not in dirs:
        d, note = dirs.pop(), "Agentki są zgodne."
    elif {"LONG", "SHORT"} <= dirs:
        d, note = "WAIT", "Agentki się nie zgadzają (LONG vs SHORT) – lepiej poczekać."
    else:
        d = _direction(long_s)
        note = "Jedna agentka czeka, druga widzi okazję – " + ("sygnał umiarkowany." if d != "WAIT" else "brak przewagi.")
    lead = max((a for a in agents if a["direction"] == d), key=lambda a: a["confidence"], default=None)
    return {"long_score": long_s, "short_score": 100 - long_s, "direction": d, "agreement": len({a["direction"] for a in agents}) == 1,
            "note": note, "entry": lead and lead["entry"], "sl": lead and lead["sl"], "tp": lead and lead["tp"],
            "rr": lead and lead["rr"], "lead": lead and lead["id"]}


def quick_scores(S: dict, i: int) -> dict:
    """Szybka ocena na jednym interwale (boty i backtest): HTF przybliżony tym samym interwałem."""
    s = snapshot(S, i)
    l_, n_ = luna(s, s), nova(s, s)
    c = consensus([l_, n_])
    return {"luna": l_["long_score"], "nova": n_["long_score"], "long": c["long_score"], "direction": c["direction"],
            "atr": s["atr"]}


# ---------------------------------------------------------------------------
# Główna analiza
# ---------------------------------------------------------------------------
def _snap_public(s: dict) -> dict:
    keys = ["price", "ema20", "ema50", "ema200", "rsi", "macd", "signal", "hist", "bb_up", "bb_mid", "bb_low", "atr",
            "atr_pct", "adx", "vwap", "vol_ratio", "structure", "structure_label", "trend", "trend_strength"]
    return {k: (_r(s[k]) if isinstance(s[k], float) and k not in ("rsi", "adx", "vol_ratio", "atr_pct") else
                round(s[k], 2) if isinstance(s[k], float) else s[k]) for k in keys}


async def analyze(symbol: str, interval: str = "60", ai: bool = False, allow_synthetic: bool = True) -> dict:
    symbol, interval = market.norm_symbol(symbol), market.norm_interval(interval)
    htf_iv = HTF[interval]
    ltf_data = await market.get_candles(symbol, interval, 300, allow_synthetic=allow_synthetic)
    htf_data = await market.get_candles(symbol, htf_iv, 300, allow_synthetic=allow_synthetic)
    S, H = ind.compute_all(ltf_data["candles"]), ind.compute_all(htf_data["candles"])
    ltf, htf = snapshot(S), snapshot(H)
    levels = ind.support_resistance(ltf_data["candles"], S["swings"], ltf["atr"])
    htf_levels = ind.support_resistance(htf_data["candles"], H["swings"], htf["atr"])
    all_levels = sorted(levels + [{**x, "htf": True} for x in htf_levels], key=lambda x: abs(x["distance_pct"]))
    agents = [luna(ltf, htf, all_levels), nova(ltf, htf, levels)]
    cons = consensus(agents)
    u = unified(ltf)
    source = "synthetic" if "synthetic" in (ltf_data["source"], htf_data["source"]) else "bybit"
    out = {
        "symbol": symbol, "interval": interval, "htf_interval": htf_iv, "source": source, "demo": True,
        "price": _r(ltf["price"]),
        "trend": ltf["trend"], "trend_strength": ltf["trend_strength"], "structure": ltf["structure"],
        "htf_trend": htf["trend"], "htf_structure": htf["structure"],
        "long_score": u["long"], "short_score": u["short"], "long_reasons": u["long_reasons"], "short_reasons": u["short_reasons"],
        "indicators": _snap_public(ltf), "htf_indicators": _snap_public(htf),
        "levels": [{**x, "price": _r(x["price"])} for x in all_levels[:8]],
        "agents": agents, "consensus": cons,
        "disclaimer": "Analiza edukacyjna na koncie DEMO – to nie jest porada inwestycyjna.",
    }
    if ai:
        out["ai_comment"] = await ai_comment(out)
    return out


async def ai_comment(a: dict) -> str:
    import agent  # import leniwy – działa z Ollamą i z Claude
    data = {k: a[k] for k in ("symbol", "interval", "htf_interval", "price", "trend", "htf_trend", "structure",
                              "long_score", "short_score", "levels")}
    data["indicators"] = {k: a["indicators"][k] for k in ("rsi", "macd", "hist", "ema50", "ema200", "atr_pct", "adx", "vol_ratio")}
    data["agents"] = [{k: x[k] for k in ("name", "long_score", "short_score", "direction", "entry", "sl", "tp",
                                         "long_reasons", "short_reasons")} for x in a["agents"]]
    data["consensus"] = a["consensus"]
    if a.get("source") == "synthetic":
        data["uwaga"] = "DANE SYNTETYCZNE (demo) – nie odzwierciedlają realnego rynku."
    prompt = UNIFIED_PROMPT_PL + "\n\nDANE:\n" + json.dumps(data, ensure_ascii=False, default=str)
    try:
        text = await agent.complete(prompt, 700)
        return (text or "").strip() or "(model nie zwrócił komentarza)"
    except Exception as e:  # noqa: BLE001
        log.warning("Komentarz AI nieudany: %s", e)
        return f"(komentarz AI niedostępny: {type(e).__name__})"
