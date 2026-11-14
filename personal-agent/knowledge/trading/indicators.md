# Wskaźniki techniczne – MA, RSI, MACD, Bollinger, ATR, ADX, wolumen

_Źródło: MESSUAI knowledge/indicators.ts (wyciąg tekstowy)._

📐 TECHNICAL INDICATORS LIBRARY
Implementacja wszystkich wskaźników technicznych z książek:
- Murphy (MA, RSI, MACD, Bollinger, ADX)
- Nison (Candlestick analysis helpers)
- Coulling (Volume analysis)
- Chan (Statistical functions)

## Types

_MOVING AVERAGES (Murphy)_
Simple Moving Average
Murphy: "SMA gives equal weight to all prices in the period"

SMA Series - returns array of SMA values

Exponential Moving Average
Murphy: "EMA gives more weight to recent prices - more responsive"

EMA Series - returns array of EMA values

Weighted Moving Average

_OSCILLATORS (Murphy)_
Relative Strength Index (RSI)
Murphy: "RSI measures the speed and change of price movements"
RSI < 30 = Oversold (potential buy)
RSI > 70 = Overbought (potential sell)
Murphy warning: "In strong trends, RSI can stay overbought/oversold for extended periods"

_Use Wilder's smoothing (EMA-like)_
RSI Series - returns array of RSI values

MACD - Moving Average Convergence Divergence
Murphy: "MACD is one of the most reliable indicators"
Signal: MACD crosses Signal line
Histogram: Shows momentum

_Calculate signal line (EMA of MACD values)_
Stochastic Oscillator
Murphy: "Effective in ranging markets, less so in trends"
%K < 20 = Oversold
%K > 80 = Overbought

_Calculate %D (SMA of %K)_
_VOLATILITY INDICATORS (Murphy)_
Average True Range (ATR)
Murphy: "ATR measures volatility, useful for setting stop losses"

_Wilder's smoothing_
Bollinger Bands
Murphy: "Bands expand in high volatility, contract in low volatility"
Price touching upper band ≠ automatic sell (can ride the band in strong trend)

_Calculate standard deviation_
_TREND STRENGTH (Murphy + Chan)_
Average Directional Index (ADX)
Murphy: "ADX measures trend STRENGTH, not direction"
Chan: "ADX > 25 = trending market (use momentum), ADX < 20 = ranging (use mean reversion)"

_True Range_
_Directional Movement_
_Smooth with Wilder's method_
_Calculate DX_
_VOLUME ANALYSIS (Coulling)_
Volume Moving Average

Volume Ratio (Current vs Average)
Coulling: "> 150% = significant, > 200% = very significant"

On-Balance Volume (OBV)
Coulling: "Volume precedes price - OBV divergence is powerful signal"

_If close === prevClose, OBV unchanged_
OBV Array for divergence detection

Volume Weighted Average Price (VWAP)

_SUPPORT/RESISTANCE (Murphy)_
Pivot Points
Murphy: "Traditional floor trader method for S/R"

Fibonacci Retracements
Murphy: "Key levels: 38.2%, 50%, 61.8%"

_STATISTICAL FUNCTIONS (Chan)_
Standard Deviation

Z-Score
Chan: "Useful for mean reversion strategies"

Calculate returns

Sharpe Ratio
Chan: "< 1 = poor, 1-2 = acceptable, > 2 = good, > 3 = suspicious (overfitting?)"

Maximum Drawdown
Chan: "Critical risk metric - max DD should be < 2x expected monthly return"

Win Rate

Profit Factor
Chan: "< 1 = losing, 1-1.5 = weak, 1.5-2 = good, > 2 = very good"

Expectancy (Average profit per trade)

_POSITION SIZING (Douglas + Chan)_
Kelly Criterion
Chan: "Never use full Kelly - use half or quarter Kelly for safety"

Position Size Calculator
Douglas: "Never risk more than 1-2% of capital per trade"

Risk-Reward Ratio
Douglas: "Minimum 1:2 R:R for any trade"

## Full Indicator Calculation

_Moving Averages_
_Oscillators_
_Volatility_
_Pivot Points (using previous candle for daily pivots)_
_Price Data_
_Moving Averages_
_Golden/Death Cross detection_
_Oscillators_
_Volatility_
_Export all functions_
_Moving Averages_
_Oscillators_
_Volatility_
_Trend_
_Volume_
_Support/Resistance_
_Statistics_
_Position Sizing_
_Full calculation_
