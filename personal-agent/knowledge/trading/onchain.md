# On-chain – przepływy na giełdy, wieloryby, MVRV, SOPR

_Źródło: MESSUAI knowledge/onchain.ts (wyciąg tekstowy)._

ON-CHAIN METRICS - MVRV, NVT, SOPR, Exchange Flows
Dane z blockchain które pokazują aktywność "smart money":
- MVRV - Market Value to Realized Value (overvalued/undervalued)
- NVT - Network Value to Transactions (PE ratio dla crypto)
- SOPR - Spent Output Profit Ratio (profit taking)
- Exchange Flows - wpływy/wypływy z giełd
- Whale Activity - aktywność dużych graczy

## Types

## Mvrv Analysis

MVRV = Market Cap / Realized Cap
Realized Cap = suma wartości wszystkich UTXO po cenie ostatniego ruchu
MVRV pokazuje czy średni holder jest w zysku czy stracie
Historyczne ekstrema BTC:
- TOP: MVRV > 3.7 (2017, 2021)
- BOTTOM: MVRV < 0.8 (2015, 2018, 2022)

## Nvt Analysis

NVT = Market Cap / Daily Transaction Volume (USD)
NVT to "PE Ratio" dla crypto - pokazuje czy network jest przewartościowany
względem aktywności transakcyjnej
NVT > 90-100 = Overbought (za mało transakcji względem wyceny)
NVT < 40-50 = Oversold (dużo transakcji, dobra wartość)

## Sopr Analysis

SOPR = Realized Value / Value at Creation
SOPR pokazuje czy sprzedający są w zysku czy stracie:
- SOPR > 1 = sprzedający są w zysku (profit taking)
- SOPR = 1 = break-even (ważny poziom psychologiczny)
- SOPR < 1 = sprzedający są w stracie (kapitulacja)
W bull market: SOPR = 1 jest support (ludzie nie chcą sprzedać ze stratą)
W bear market: SOPR = 1 jest resistance (ludzie sprzedają gdy wychodzą na zero)

## Exchange Flow Analysis

Exchange Flow - wpływy i wypływy z giełd
Net Inflow (+ wpływy) = ludzie wysyłają na giełdy = chcą sprzedać = BEARISH
Net Outflow (- wypływy) = ludzie wypłacają z giełd = HODL = BULLISH

_Próg to ~10,000 BTC dla BTC, dostosuj dla innych_
- Whales/instytucje wypłacają = HODL mode
- Duże depozyty na giełdy = presja sprzedażowa
_Sprawdź pojedyncze duże transakcje_
- ⚠️ Duży depozyt na …: …
- ✅ Duża wypłata z …: …

## Whale Activity

Analizuje aktywność wielorybów
Transakcje > $1M USD traktujemy jako whale

_Net exchange flow od whale'i_
_Znajdź największą transakcję_

## Full On-Chain Analysis

_MVRV (najważniejszy dla macro)_
_NVT_
_SOPR_
- SOPR kapitulacja - potencjalne dno
- SOPR wysoki profit taking
_Exchange Flow_
- Exchange outflow - akumulacja
- Exchange inflow - dystrybucja
_Whale Activity_
_Determine cycle position_
_Recommendation_

## Api Sources

## ONCHAIN API SOURCES

### GLASSNODE
- **Url**: https://api.glassnode.com
- **Description**: Premium on-chain data (paid)

### CRYPTOQUANT
- **Url**: https://api.cryptoquant.com
- **Description**: Exchange and miner flows (paid)

### SANTIMENT
- **Url**: https://api.santiment.net
- **Description**: On-chain + social metrics (paid)

### BLOCKCHAIN COM
- **Url**: https://api.blockchain.info
- **Description**: Basic BTC metrics (free)

### WHALE ALERT
- **Url**: https://api.whale-alert.io
- **Description**: Whale transaction alerts

## ONCHAIN RULES

### MVRV
- MVRV > 3.7 = Macro TOP, realizuj większość zysków
- MVRV 2.4-3.7 = Rynek drogi, częściowa realizacja
- MVRV 1-2.4 = Fair value, normalne tradowanie
- MVRV < 1 = Undervalued, akumuluj
- MVRV < 0.8 = Macro BOTTOM, maksymalna akumulacja

### NVT
- NVT > 100 = Network przewartościowany
- NVT 50-90 = Fair value
- NVT < 40 = Network undervalued, wysoka aktywność

### SOPR
- SOPR > 1.05 = Profit taking, możliwa korekta
- SOPR = 1 w bull = Support (nikt nie chce sprzedać ze stratą)
- SOPR = 1 w bear = Resistance (ludzie wychodzą na zero)
- SOPR < 0.95 = Kapitulacja, szukaj dna

### EXCHANGE FLOW
- Net inflow = Presja sprzedażowa (bearish)
- Net outflow = Akumulacja/HODL (bullish)
- Duży jednorazowy depozyt = możliwy dump
- Duża wypłata = whale accumulation

### WHALE ACTIVITY
- Whale deposits na giełdy = incoming sell pressure
- Whale withdrawals = long-term accumulation
- Wysoka whale aktywność = zwiększona zmienność
