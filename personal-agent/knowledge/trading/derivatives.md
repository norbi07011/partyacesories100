# Derywaty – funding, open interest, likwidacje, long/short ratio

_Źródło: MESSUAI knowledge/derivatives.ts (wyciąg tekstowy)._

DERIVATIVES DATA - Funding Rates, Open Interest, Liquidations
Dane z rynku derywatów które pokazują pozycjonowanie traderów:
- Funding Rates - koszt utrzymania pozycji
- Open Interest - całkowita wartość otwartych pozycji
- Liquidation Heatmap - gdzie są stop-lossy
- Long/Short Ratio - proporcja pozycji

## Types

## Funding Rate Analysis

Interpretuje funding rate
Wysoki pozytywny funding = za dużo longów (kontrariańsko: bearish)
Wysoki negatywny funding = za dużo shortów (kontrariańsko: bullish)

## Open Interest Analysis

Analizuje Open Interest w kontekście ceny
Price UP + OI UP = Nowe longi (trend kontynuacja)
Price UP + OI DOWN = Short covering (słaby ruch)
Price DOWN + OI UP = Nowe shorty (trend kontynuacja)
Price DOWN + OI DOWN = Long liquidation (słaby ruch)

## Liquidation Heatmap

Szacuje poziomy likwidacji na podstawie OI i typowych leverage'y
Formuła: Liquidation Price = Entry Price * (1 ± 1/leverage)
Dla long: Entry * (1 - 1/leverage)
Dla short: Entry * (1 + 1/leverage)

_Long liquidation = poniżej current price_
_Short liquidation = powyżej current price_
Analizuje gdzie jest najwięcej płynności do zebrania

- ⚠️ Likwidacje LONG bardzo blisko (…%) - możliwy cascade DOWN
- ⚠️ Likwidacje SHORT bardzo blisko (…%) - możliwy squeeze UP
- 📊 Więcej longów zagrożonych - potencjalny magnes na dół
- 📊 Więcej shortów zagrożonych - potencjalny magnes na górę

## Long/Short Ratio

## Pełna Analiza Derywatów

_Funding Rate (kontrariański)_
- Funding ekstremalnie wysoki - zbyt dużo longów
- Funding ekstremalnie niski - zbyt dużo shortów
_Open Interest_
_Long/Short Ratio (kontrariański)_
_Liquidations_
- Więcej longów zagrożonych
- Więcej shortów zagrożonych
_Określ crowded trade_
_Rekomendacja_

## Api Sources

## DERIVATIVES API SOURCES

### FUNDING RATE
- **Binance**: https://fapi.binance.com/fapi/v1/fundingRate
- **Bybit**: https://api.bybit.com/v5/market/funding/history
- **Description**: Real-time funding rates

### OPEN INTEREST
- **Binance**: https://fapi.binance.com/fapi/v1/openInterest
- **Coinglass**: https://open-api.coinglass.com/public/v2/open_interest
- **Description**: Open Interest data

### LIQUIDATIONS
- **Coinglass**: https://open-api.coinglass.com/public/v2/liquidation_history
- **Hyblock**: https://api.hyblock.co/liquidations
- **Description**: Liquidation heatmap and history

### LONG SHORT RATIO
- **Binance**: https://fapi.binance.com/futures/data/globalLongShortAccountRatio
- **Description**: Long/Short ratio by accounts

## DERIVATIVES RULES

### FUNDING RATE
- Funding > 0.1% = Ekstremalnie bullish sentiment → kontrariańsko BEARISH
- Funding < -0.1% = Ekstremalnie bearish sentiment → kontrariańsko BULLISH
- Funding blisko 0 = Zbalansowany rynek
- Wysoki funding = koszt trzymania pozycji → presja na zamykanie
- Nagła zmiana funding = zmiana sentymentu

### OPEN INTEREST
- OI UP + Price UP = Nowe longi (silny trend)
- OI UP + Price DOWN = Nowe shorty (silny trend)
- OI DOWN + Price UP = Short covering (słaby ruch)
- OI DOWN + Price DOWN = Long liquidation (słaby ruch)
- Rekordowy OI = potencjalne odwrócenie

### LIQUIDATIONS
- Duże likwidacje = volatility i potencjalny reversal
- Cascade likwidacji = wzmocnienie ruchu
- Poziomy dużych likwidacji = magnesy na cenę
- Smart Money celuje w poziomy likwidacji

### LONG SHORT RATIO
- Ratio > 2 = Zbyt wiele longów → short squeeze mało prawdopodobny
- Ratio < 0.5 = Zbyt wiele shortów → long squeeze możliwy
- Kontrariańsko: handluj przeciw tłumowi przy ekstremach
