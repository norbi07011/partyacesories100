# Agenci i strategie – roster MESSUAI, Luna i Nova, strategie botów demo

_Źródło: MESSUAI backend/app/services/agents_config.py, ml_agents_manager.py, POMYSŁ.MD (opracowanie)._

## Filozofia
- Każdy agent = jedna moneta = unikalna strategia; agent gra LONG i SHORT na swojej monecie.
- Najpierw kierunek z wyższych interwałów (HTF: 4H/1D, horyzont 2–4 dni), dopiero potem wejście na niższym (LTF: 15m/5m).
- BULLISH HTF → szukaj LONG, BEARISH HTF → szukaj SHORT, NEUTRAL HTF → WAIT (nie graj).
- Minimalna pewność do wejścia ok. 70%; poniżej – czekaj.

## Zasada LONG vs SHORT (UNIFIED_ANALYSIS_PROMPT)
Punkty LONG i SHORT muszą sumować się do 100.
1. Cena vs EMA200: powyżej = +20 LONG, poniżej = +20 SHORT.
2. Cena vs EMA50: powyżej = +10 LONG, poniżej = +10 SHORT.
3. Struktura: HH+HL = +15 LONG, LH+LL = +15 SHORT.
4. MACD: powyżej 0 = +10 LONG, poniżej 0 = +10 SHORT.
5. RSI: > 50 i rośnie = +10 LONG, < 50 i spada = +10 SHORT.
6. Wolumen: rośnie na zielonej = +5 LONG, rośnie na czerwonej = +5 SHORT.

**Trend filter:** w DOWNTREND (cena < EMA200 i LH+LL) LONG max 30%; w UPTREND SHORT max 30%. „Don't fight the trend”.
Przykłady: silny downtrend LONG 15 / SHORT 85; słaby downtrend 30/70; range 50/50; słaby uptrend 70/30; silny uptrend 85/15.

## Roster agentów monet
- **₿ BTC Scalper** – MACD (12,26,9) + EMA200. LONG: cena > EMA200, MACD poniżej zera i przecina sygnał w górę. SHORT: cena < EMA200, MACD powyżej zera i przecina w dół. WAIT przy cenie blisko EMA200 i płaskim MACD. SL 1% / TP 2%. Interwały 1H/15m/5m.
- **Ξ ETH Swing** – kanały wsparcia/oporu. LONG: odbicie od strefy wsparcia albo wybicie oporu w górę. SHORT: odbicie od oporu albo przebicie wsparcia w dół. WAIT w środku kanału. SL 2% / TP 5% (odbicie 2–3%, wybicie 5%+). Interwały 4H/1H/15m.
- **☀️ SOL Momentum** – S/R + wolumen. LONG: cena przy wsparciu, wolumen > 1,5× średniej, RSI < 40. SHORT: przy oporze, skok wolumenu na spadku, RSI > 65. WAIT przy niskim wolumenie i RSI 40–60. SL 1,5% / TP 4% (wybicie do 6%).
- **🐕 DOGE Meme** – RSI pump/dump: LONG przy RSI < 30, SHORT przy RSI > 70; szybkie wejścia. SL 2% / TP 5%.
- **💎 XRP News** – Smart Money Concepts: BOS/CHoCH, order blocki, wypełnione FVG. SL 1,5% / TP 4%; po serii SL – wyższy próg pewności.
- **⚡ LTC Reversion** – Bollinger (20, 2): LONG gdy cena wraca nad dolną bandę, SHORT gdy wraca pod górną. Squeeze = zapowiedź wybicia. SL 1,5% / TP 3%.
- Zespoły kierunkowe: 🟢 LONG Major / 🟢 LONG Alts, 🔴 SHORT Major / 🔴 SHORT Alts – grupy MAJOR (BTC, ETH, XRP) i ALTS (SOL, DOGE, LTC) według korelacji.

## Dwie konkurujące agentki (Studio Agent)
Pomysł z ml_agents_manager.py: dwa niezależne „mózgi” oceniają ten sam rynek, a decyzja zapada przy zgodzie.
- **🌙 Luna – trend/swing.** Bias z wyższego interwału (waga 65%), wejście na cofnięciu do wsparcia (lub odbiciu pod opór), SL 2×ATR, TP 4×ATR (min. 2R).
- **✨ Nova – momentum/scalping.** Przecięcia MACD, przyspieszenie RSI, EMA9/21, VWAP, skoki wolumenu, wybicia z Bollingera, ADX > 25 wzmacnia sygnał. Nie gra przeciw trendowi HTF. SL 1,5×ATR, TP 3×ATR.
- **Konsensus:** obie w tym samym kierunku → sygnał; LONG vs SHORT → CZEKAJ; jedna czeka → sygnał tylko przy przewadze ≥ 60.

## Strategie botów demo
- **ema_cross** – przecięcie EMA szybkiej i wolnej (domyślnie 9/21) z filtrem EMA200; SL 2×ATR, TP 4×ATR; wyjście na przeciwnym przecięciu.
- **rsi_reversion** – RSI wychodzi z wyprzedania (< 30) → LONG, z wykupienia (> 70) → SHORT; wyjście przy RSI 50 albo SL/TP.
- **breakout_range** (POMYSŁ.MD, René Balke) – zakres high/low z godzin 03:00–06:00, wejście na wybiciu (jedno na dzień – logika OCO), SL = wielkość zakresu × sl_factor, TP = zakres × tp_factor (0 = bez TP), zamknięcie o 18:00 (EOD). Opcjonalnie pomijanie weekendów. Rentowność opiera się na rzadkich, bardzo silnych dniach („Incredible Days”) – trzeba być obecnym w każdej sesji.
- **agent_consensus** – wejście, gdy wspólna ocena Luny i Novy ≥ min_score (domyślnie 65), wyjście, gdy przewaga spadnie poniżej exit_score.
