# Zaawansowane strategie – reżimy rynku, trend, mean reversion, breakout, scalping, swing

_Źródło: MESSUAI knowledge/advanced-strategies.ts (wyciąg tekstowy)._

🚀 ADVANCED TRADING STRATEGIES - OPTYMALIZACJA
Na podstawie badań:
- Investopedia Algorithmic Trading
- TradingView Best Practices
- Profesjonalne strategie institutionalne
KLUCZOWE ZMIANY:
1. Większe Stop-Lossy (2-4% zamiast 0.1%)
2. Wykrywanie reżimu rynku (trending vs ranging)
3. Mean Reversion dla rangu
4. Multi-timeframe confirmation
5. Volume confirmation required

_REGIME DETECTION - KLUCZOWE!_

## REGIME DETECTION

- **Name**: Market Regime Detection
- **Description**: Określ CZY rynek trenduje czy range'uje PRZED wyborem strategii

### Methods
- **Adx**
  - **Trending**: ADX > 25 = używaj TREND FOLLOWING
  - **Ranging**: ADX < 20 = używaj MEAN REVERSION
  - **Transition**: ADX 20-25 = bądź ostrożny, mniejsze pozycje
- **Volatility**
  - **Atr expansion**: ATR rośnie = trend się rozwija
  - **Atr contraction**: ATR maleje = konsolidacja, czekaj na breakout
- **Bollinger**
  - **Squeeze**: BB się zwężają = nadchodzi duży ruch
  - **Expansion**: BB się rozszerzają = trend w toku

### For Agent
- **Step1**: ZAWSZE oblicz ADX przed decyzją
- **Step2**: ADX > 25 → strategy = TREND_FOLLOWING
- **Step3**: ADX < 20 → strategy = MEAN_REVERSION
- **Step4**: ADX 20-25 → strategy = WAIT lub małe pozycje

## Strategy 1: Improved Trend Following

## TREND FOLLOWING V2

- **Name**: Enhanced Trend Following Strategy
- **Description**: Ulepszona strategia podążania za trendem z lepszymi filtrami

### Requirements
- **Adx min**: 25
- **Volume confirmation**: true
- **Multi timeframe**: true

### Entry Conditions
- **LONG**
  - **Condition1**: Cena > EMA 50 > EMA 200 (struktura bullish)
  - **Condition2**: ADX > 25 (silny trend)
  - **Condition3**: RSI 40-70 (nie wykupiony, ale momentum)
  - **Condition4**: Volume > 1.5x average (potwierdzenie)
  - **Condition5**: Higher TF (1D) potwierdza trend UP
- **SHORT**
  - **Condition1**: Cena < EMA 50 < EMA 200 (struktura bearish)
  - **Condition2**: ADX > 25 (silny trend)
  - **Condition3**: RSI 30-60 (nie wyprzedany, ale słabość)
  - **Condition4**: Volume > 1.5x average
  - **Condition5**: Higher TF (1D) potwierdza trend DOWN

### Exit Conditions
- **Stop Loss**
  - **Method**: ATR-based
  - **Formula**: Entry - (2 * ATR14) dla LONG
  - **Typical**: 2-4% od entry
  - **Reasoning**: Większy SL = mniej fałszywych wyrzuceń
- **Take Profit**
  - **Method**: Risk:Reward based
  - **Minimum rr**: 2.5
  - **Formula**: Entry + (2.5 * distance_to_SL)
  - **Trailing**: Użyj trailing stop po osiągnięciu 1.5R
- **Time Stop**
  - **Max Hold Time**: Jeśli po 48h brak ruchu, zamknij

### Position Sizing
- **Risk per trade**: 1% kapitału
- **Formula**: Position = (Capital * 0.01) / (Entry - StopLoss)
- **Example**: Capital 10000, Entry 3000, SL 2940 → Position = 100/60 = 1.67 ETH

### Confluence
- **Minimum score**: 4
- **Factors**
- **Scoring**: Każdy spełniony warunek = +weight. Wejście gdy sum >= 4
_STRATEGY 2: MEAN REVERSION (dla RANGING markets)_

## MEAN REVERSION STRATEGY

- **Name**: Mean Reversion Strategy
- **Description**: Strategia powrotu do średniej - dla rynków w konsolidacji

### Requirements
- **Adx max**: 25
- **Market type**: RANGING
- **Clear range**: Zdefiniowane wsparcie i opór

### Entry Conditions
- **LONG**
  - **Condition1**: ADX < 25 (rynek w range)
  - **Condition2**: RSI < 30 (wyprzedanie)
  - **Condition3**: Cena przy dolnym Bollinger Band
  - **Condition4**: Cena przy wsparciu (S/R level)
  - **Condition5**: Bullish candlestick pattern (hammer, engulfing)
- **SHORT**
  - **Condition1**: ADX < 25 (rynek w range)
  - **Condition2**: RSI > 70 (wykupienie)
  - **Condition3**: Cena przy górnym Bollinger Band
  - **Condition4**: Cena przy oporze (S/R level)
  - **Condition5**: Bearish candlestick pattern (shooting star, engulfing)

### Exit Conditions
- **Take Profit**
  - **Target**: Środek range'u (EMA 20 lub middle BB)
  - **Reasoning**: W range nie celujemy w drugą stronę, tylko w środek
- **Stop Loss**
  - **Method**: Below/Above range
  - **Formula**: Support - 1% dla LONG, Resistance + 1% dla SHORT
  - **Reasoning**: Przebicie range = strategia nieważna

### Risk Management
- **Position size**: 0.5% risk (mniejsze niż trend following)
- **Reason**: Mean reversion ma wyższy win rate ale częstsze małe straty
- **Max trades**: Max 2 pozycje mean reversion jednocześnie

### Indicators

## Strategy 3: Breakout Strategy

## BREAKOUT STRATEGY

- **Name**: Volume-Confirmed Breakout Strategy
- **Description**: Handel na przebiciach z potwierdzeniem volume

### Setup
- **Pattern**: Konsolidacja (triangle, flag, range)
- **Duration**: Minimum 5-10 świec konsolidacji
- **Volume during consolidation**: Malejący (accumulation)

### Entry Conditions
- **LONG BREAKOUT**
  - **Condition1**: Przebicie oporu o >1%
  - **Condition2**: Volume > 2x average
  - **Condition3**: Świeca zamyka SIĘ powyżej oporu
  - **Condition4**: Brak negatywnych dywergencji na RSI/MACD
- **SHORT BREAKOUT**
  - **Condition1**: Przebicie wsparcia o >1%
  - **Condition2**: Volume > 2x average
  - **Condition3**: Świeca zamyka SIĘ poniżej wsparcia
  - **Condition4**: Brak pozytywnych dywergencji

### False Breakout Protection
- **Rule1**: CZEKAJ na zamknięcie świecy (nie handluj w trakcie)
- **Rule2**: Volume MUSI być > 2x average
- **Rule3**: Retest przebitego poziomu = lepsze entry
- **Rule4**: Avoid fakeouts: jeśli cena wraca < 50% breakout move = fałszywy

### Stop Loss
- **Method**: Below/Above przebity poziom
- **Buffer**: 1% buffer poniżej/powyżej poziomu
- **Reasoning**: Jeśli poziom się nie utrzymuje = fałszywy breakout

### Take Profit
- **Method**: Measured move
- **Formula**: Wysokość konsolidacji odmierzona od punktu przebicia
- **Example**: Range 100-120 przebity w górę → TP = 140 (120 + 20)
_STRATEGY 4: SCALPING (dla bardzo aktywnych)_

## SCALPING STRATEGY V2

- **Name**: Improved Scalping Strategy
- **Description**: Szybkie wejścia i wyjścia z małym ryzykiem

### Requirements
- **Timeframe**: 5m lub 15m
- **Volatility**: Średnia-wysoka (ATR > średnia)
- **Spread**: Niski spread (< 0.1%)
- **Liquidity**: Wysoki volume

### Entry Conditions
- **Setup**: Confluence of quick indicators
- **Indicators**
  - **Ema cross**: EMA 9 crosses EMA 21
  - **Rsi**: RSI 14 w kierunku trade'u (>50 dla long, <50 dla short)
  - **Vwap**: Cena powyżej VWAP dla long, poniżej dla short
- **Confirmation**: 2 z 3 wskaźników zgodnych

### Exit Conditions
- **Target**: 0.5-1% profit
- **Stop Loss**: 0.3-0.5%
- **Time Stop**: Max 30 min w pozycji
- **Trailing**: Po +0.3% → trailing stop 0.15%

### Risk Management
- **Max trades per day**: 10
- **Max loss per day**: 2% kapitału
- **Position size**: 0.5% risk per trade

### Warnings
- Scalping wymaga szybkich reakcji - AI musi być responsywne
- Wysokie koszty transakcyjne przy wielu trade'ach
- Stres psychologiczny wysoki
- NIE dla początkujących
_STRATEGY 5: SWING TRADING (najlepsza dla AI)_

## SWING TRADING STRATEGY

- **Name**: AI-Optimized Swing Trading
- **Description**: Optymalna strategia dla automatycznego tradingu

### Why Best For AI
- Więcej czasu na analizę = lepsza jakość decyzji
- Mniej transakcji = niższe koszty
- Większe ruchy = większe zyski per trade
- Mniejszy wpływ szumu rynkowego

### Timeframes
- **Analysis**: 1D (główny trend)
- **Entry**: 4H (timing)
- **Precision**: 1H (dokładne entry)

### Entry Conditions
- **LONG**
  - **Step1**: 1D: Trend UP (EMA 50 > EMA 200)
  - **Step2**: 1D: Cena w pullback do EMA 50 lub key support
  - **Step3**: 4H: Bullish reversal pattern (engulfing, morning star)
  - **Step4**: 4H: RSI < 40 (oversold in uptrend)
  - **Step5**: 4H: Volume spike na reversal candle
- **SHORT**
  - **Step1**: 1D: Trend DOWN (EMA 50 < EMA 200)
  - **Step2**: 1D: Cena w rallye do EMA 50 lub key resistance
  - **Step3**: 4H: Bearish reversal pattern
  - **Step4**: 4H: RSI > 60 (overbought in downtrend)
  - **Step5**: 4H: Volume spike na reversal candle

### Exit Conditions
- **Stop Loss**
  - **Method**: Structure-based
  - **LONG**: Poniżej ostatniego swing low - 1%
  - **SHORT**: Powyżej ostatniego swing high + 1%
  - **Typical**: 3-5% od entry
- **Take Profit**
  - **Method**: Multiple targets
  - **TP1**: 1.5R (zamknij 50% pozycji)
  - **TP2**: 2.5R (zamknij kolejne 30%)
  - **TP3**: Trailing stop na resztę (20%)

### Hold Time
- **Typical**: 3-10 dni
- **Max**: 14 dni
- **Min**: 24h

### Risk Management
- **Risk per trade**: 1-2% kapitału
- **Max positions**: 3
- **Max correlation**: Nie więcej niż 2 pozycje w tym samym kierunku na skorelowanych aktywach

## Risk Management Rules (Uniwersalne)

## UNIVERSAL RISK RULES

- **Name**: Universal Risk Management
- **Description**: Zasady obowiązujące WSZYSTKIE strategie

### Position Sizing
- **Formula**: Position Size = (Account * Risk%) / (Entry - StopLoss)
- **Max risk per trade**: 1% for beginners, 2% max for experienced
- **Example**
  - **Account**: 10000
  - **Risk percent**: 0.01
  - **Entry**: 3000
  - **Stop loss**: 2940
  - **Calculation**: 100 / 60 = 1.67 ETH
  - **Position value**: 5000

### Stop Loss Rules
- **MINIMUM SL**: 1.5% od entry (NIGDY mniej)
- **TYPICAL SL**: 2-4% od entry
- **STRUCTURE BASED**: Zawsze poniżej/powyżej ostatniego swing point
- **NEVER MOVE**: NIGDY nie przesuwaj SL dalej (tylko bliżej - trailing)

### Take Profit Rules
- **Minimum RR**: 2.0
- **Ideal RR**: 2.5
- **Partial exits**
  - **Rule**: Zamykaj pozycję w częściach
  - **TP1**: 50% @ 1.5R
  - **TP2**: 30% @ 2.5R
  - **Remainder**: 20% trailing stop

### Drawdown Limits
- **Daily**: Max 3% - po tym STOP na dzień
- **Weekly**: Max 7% - review strategii
- **Monthly**: Max 15% - pauza i analiza

### Correlation Limits
- **Rule**: Nie otwieraj skorelowanych pozycji
- **Examples**
  - BTC + ETH = skorelowane (max 1 pozycja)
  - ETH + SOL = średnio skorelowane
  - BTC + Gold = nieskorelowane (można obie)

## Confluence Scoring System

## CONFLUENCE SCORING

- **Name**: Confluence Entry System
- **Description**: System punktowy do oceny jakości entry

### Factors

### Scoring
- **Minimum for entry**: 5
- **Ideal score**: 7
- **Maximum**: 10

### Position Size By Score
- **5-6 points**: 50% normal size
- **7-8 points**: 100% normal size
- **9-10 points**: 125% normal size (max)

## Export All Strategies

## ADVANCED STRATEGIES
