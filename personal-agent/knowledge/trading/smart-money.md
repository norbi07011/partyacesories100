# Smart Money Concepts – order blocks, FVG, płynność, BOS/ChoCH

_Źródło: MESSUAI knowledge/smart-money.ts (wyciąg tekstowy)._

SMART MONEY CONCEPTS - Order Blocks, FVG, Liquidity
Implementacja koncepcji Smart Money:
- Order Blocks (OB) - strefy instytucjonalnych zleceń
- Fair Value Gaps (FVG) - imbalance zones
- Liquidity Zones - płynność do zebrania
- Break of Structure (BOS) - złamanie struktury
- Change of Character (ChoCH) - zmiana charakteru

## Types

_Dla analizy_
_Dla analizy_

## Order Blocks Detection

Wykrywa Order Blocks (strefy instytucjonalnych zleceń)
Bullish OB: ostatnia niedźwiedzia świeca przed impulsem w górę
Bearish OB: ostatnia bycza świeca przed impulsem w dół

_Sprawdź Bullish Order Block_
_Warunek: niedźwiedzia świeca, po której następuje silny impuls w górę_
_Sprawdź czy OB został "mitigated" (cena wróciła do niego)_
_Sprawdź Bearish Order Block_
_Warunek: bycza świeca, po której następuje silny impuls w dół_
_Oblicz odległość od aktualnej ceny_
_Bullish OB jest mitigated gdy cena wraca do jego strefy_
_Bearish OB jest mitigated gdy cena wraca do jego strefy_
_Siła OB zależy od wielkości impulsu_

## Fair Value Gaps (Fvg) Detection

Wykrywa Fair Value Gaps (imbalance zones)
Bullish FVG: luka między high świecy 1 a low świecy 3 (przy ruchu w górę)
Bearish FVG: luka między low świecy 1 a high świecy 3 (przy ruchu w dół)

_Bullish FVG: candle1.high < candle3.low_
_Sprawdź czy FVG został wypełniony_
_Bearish FVG: candle1.low > candle3.high_
_Bullish FVG jest wypełniany gdy cena wraca w dół_
_Bearish FVG jest wypełniany gdy cena wraca w górę_

## Liquidity Zones

Wykrywa strefy płynności (swing highs/lows, equal levels)

_Znajdź swing highs (sell-side liquidity - powyżej)_
_Znajdź swing lows (buy-side liquidity - poniżej)_
_Grupuj equal highs_
_Grupuj equal lows_
_Sprawdź czy płynność została zebrana_

## Market Structure Analysis

Analizuje strukturę rynku - BOS (Break of Structure) i ChoCH (Change of Character)

_Znajdź wszystkie swing points_
_Klasyfikuj swing points_
_Określ trend na podstawie struktury_
_Znajdź ostatni BOS i ChoCH_
_BOS = kontynuacja trendu (HH w uptrend, LL w downtrend)_
_ChoCH = zmiana trendu_
_Check swing high_
_Check swing low_

## Smart Money Confluence

Oblicza confluence score ze wszystkich sygnałów Smart Money

_Analiza Order Blocks_
- … bullish OB w pobliżu
- … bearish OB w pobliżu
_Analiza FVG_
- … bullish FVG do wypełnienia
- … bearish FVG do wypełnienia
_Analiza Liquidity_
- Więcej płynności poniżej - potencjalny sweep w dół
- Więcej płynności powyżej - potencjalny sweep w górę
_Struktura rynku_
- Struktura: BULLISH (HH + HL)
- Struktura: BEARISH (LH + LL)
_Normalizuj score_
_Określ rekomendację_

## Pełna Analiza Smart Money

## Helpers

## SMART MONEY RULES

### ORDER BLOCKS
- **Description**: Order Blocks to strefy gdzie instytucje składają zlecenia
- **Rules**
  - Bullish OB: ostatnia niedźwiedzia świeca przed impulsem w górę
  - Bearish OB: ostatnia bycza świeca przed impulsem w dół
  - OB staje się nieważny po "mitigation" (cena wróciła do strefy)
  - Silniejsze OB mają większy volume i większy impuls
  - Wchodzić przy powrocie ceny do OB (retest)

### FAIR VALUE GAPS
- **Description**: FVG to luki cenowe które rynek "chce" wypełnić
- **Rules**
  - Bullish FVG: luka między high świecy 1 a low świecy 3
  - Bearish FVG: luka między low świecy 1 a high świecy 3
  - FVG często działają jako strefy wsparcia/oporu
  - 50% wypełnienia FVG to dobra strefa wejścia
  - Niewypełnione FVG = magnes na cenę

### LIQUIDITY
- **Description**: Płynność to zlecenia stop-loss innych traderów
- **Rules**
  - Buy-side liquidity: powyżej equal highs (stop-lossy shortów)
  - Sell-side liquidity: poniżej equal lows (stop-lossy longów)
  - Smart Money zbiera płynność przed prawdziwym ruchem
  - Po sweep liquidity szukaj reversal
  - Więcej dotknięć poziomu = silniejsza strefa płynności
