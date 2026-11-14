# Mózg agenta – reżimy rynku, Wyckoff, świece, wolumen, proces decyzyjny

_Źródło: MESSUAI knowledge/agent-brain.ts (wyciąg tekstowy)._

🧠 AGENT BRAIN - System Decyzyjny
Ten moduł implementuje "mózg" agenta tradingowego.
Agent myśli i podejmuje decyzje WYŁĄCZNIE na podstawie Trading Bible.
Agent SAM określa jakich danych potrzebuje z zewnątrz.

## Types

_Price Data_
_Historical Data_
_Calculated Indicators_
_Moving Averages_
_Oscillators_
_Volatility_
_Trend Strength_
_Key Levels_
_Pattern Recognition_
_If action is BUY or SELL_
_Risk Assessment_
_Data Requests_
_Warnings_

## Market Analysis Module

Określ reżim rynkowy (Murphy + Chan)

_1. Price vs EMAs (Murphy)_
- Price above 200 EMA - long-term bullish (Murphy)
- Price below 200 EMA - long-term bearish (Murphy)
- Price above 50 EMA - medium-term bullish
- Price below 50 EMA - medium-term bearish
_2. EMA alignment_
- EMAs in bullish alignment (20 > 50 > 200)
- EMAs in bearish alignment (20 < 50 < 200)
_3. ADX for trend strength (Chan)_
- ADX … > 25 - trending market
_Amplify the score based on trend_
- ADX … < 20 - ranging/weak trend
_4. MACD confirmation_
- MACD bullish (histogram positive, line above signal)
- MACD bearish (histogram negative, line below signal)
_Determine regime_
Identyfikuj fazę Wyckoffa (Coulling)

_Need at least 50 candles for Wyckoff analysis_
_Calculate price range_
_Calculate volume trend_
_Determine phase_
_Check for ranging (accumulation or distribution)_
- Price in tight range (…%) - potential accumulation/distribution
_Check if after downtrend or uptrend (need more historical context)_
- Volume decreasing in range - selling exhaustion (Coulling)
- Volume increasing in range - potential distribution
_Trending_
- Clear uptrend with volume confirmation - Markup phase
- Clear downtrend with volume confirmation - Markdown phase
Wykryj wzorce świecowe (Nison)

_DOJI (Nison)_
_HAMMER (Nison) - after downtrend_
_Check if after downtrend_
_SHOOTING STAR (Nison) - after uptrend_
_ENGULFING (Nison)_
_MORNING STAR (Nison) - 3 candle pattern_
_EVENING STAR_
Analiza Volume-Price (Coulling)

_High volume confirmation (Coulling)_
- High volume (…% of avg) on bullish candle - CONFIRMED UP MOVE (Coulling)
- High volume (…% of avg) on bearish candle - CONFIRMED DOWN MOVE
_Low volume warning (Coulling - No Demand / No Supply)_
- Low volume on up candle - NO DEMAND warning (Coulling)
- Low volume on down candle - NO SUPPLY, potential bottom (Coulling)
_Effort vs Result (Coulling)_
- High volume but small body (…%) - ABSORPTION detected, potential reversal (Coulling)
_Climax detection_
- EXTREME volume (…% of avg) - potential CLIMAX, end of move (Coulling)
Znajdź kluczowe poziomy S/R (Murphy)

_1. Moving Averages as dynamic S/R (Murphy)_
- 200 EMA at … acting as support (Murphy)
- 200 EMA at … acting as resistance (Murphy)
_2. Recent swing highs/lows (Murphy)_
_Find local highs and lows_
_Swing high_
_Swing low_
_3. Bollinger Bands as dynamic levels_
_Sort and deduplicate_

## Decision Engine

Główna funkcja decyzyjna
Agent podejmuje decyzję bazując WYŁĄCZNIE na Trading Bible

_KROK 1: Market Regime (Chan + Murphy)_
- MARKET REGIME: … (confidence: …%)
_Per Bible: "TYLKO handluj w kierunku PRIMARY trend"_
_KROK 2: Wyckoff Phase (Coulling)_
- WYCKOFF PHASE: … (confidence: …%)
_KROK 3: Volume Analysis (Coulling)_
_Per Bible: "Breakout bez volume = fałszywy breakout"_
- Volume not confirming - be cautious (Coulling)
_KROK 4: Key Levels (Murphy)_
_KROK 5: Candle Patterns (Nison)_
- BULLISH PATTERNS detected: ${bullishPatterns.map(p => p.name).join(
- BEARISH PATTERNS detected: ${bearishPatterns.map(p => p.name).join(
_KROK 6: RSI Check (Murphy)_
- RSI … < 30 - OVERSOLD (Murphy)
- RSI … > 70 - OVERBOUGHT (Murphy)
- RSI overbought - potential pullback
_DECYZJA (Douglas - Think in Probabilities)_
_Count confluences_
_Trend alignment_
_Key level_
_Volume confirmation_
_Candle patterns_
_Wyckoff_
_Calculate confidence_
- CONFLUENCE: … bullish factors, … bearish factors
_Decision (Bible: "MINIMUM 3 z 5 powyższych zgodnych")_
- DECISION: BUY - Multiple bullish confluences at support
- DECISION: SELL - Multiple bearish confluences at resistance
- DECISION: HOLD - Bullish bias but waiting for better entry
- DECISION: WAIT - No clear edge, preserve capital (Douglas)
_RISK MANAGEMENT (Douglas + Chan)_
_Stop Loss (behind structure - Murphy)_
_Take Profit (1:2 minimum - Douglas)_
_Position Size (Douglas: max 1% risk)_
- RISK MANAGEMENT: SL at …, TP at …, Position: …%
_DATA REQUESTS (Agent asks for what it needs)_
_If uncertain, request more data_
- Fear & Greed Index current value
- Extreme readings provide contrarian signals (Douglas)
- Sentiment analysis for $… from top crypto accounts
- Extreme sentiment = contrarian opportunity (Integrated Framework)
- Exchange inflows/outflows for 
- Exchange flows show smart money movement (Coulling - volume precedes price)
_If potential reversal_
- Whale wallet movements (>100 BTC)
- Wyckoff phases are driven by smart money - need confirmation
- Check for extreme bullish/bearish sentiment
- Distribution happens at euphoria, accumulation at despair
_FINAL WARNINGS (Douglas - Emotional Checks)_
_Add Douglas warnings_
Agent określa jakie dane z Twittera potrzebuje
Bazując na aktualnej sytuacji rynkowej

_Based on market regime_
_Always follow these (per Framework)_
- Exchange announcements move markets
- Large transactions tracking
_If trending up - monitor for distribution signals_
- In uptrend - monitoring for extreme bullish sentiment as distribution warning (Framework)
_If trending down - monitor for capitulation_
- In downtrend - monitoring for capitulation signals as accumulation opportunity (Framework)
- On-chain analyst - smart money tracking
_If ranging/uncertain - need more data_
- Market uncertain - increasing monitoring frequency to catch breakout signals
_Symbol specific_

## Twitter Requirements Type

## Export
