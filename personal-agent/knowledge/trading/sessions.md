# Sesje handlowe – Azja, Londyn, Nowy Jork

_Źródło: MESSUAI knowledge/sessions.ts (wyciąg tekstowy)._

TRADING SESSIONS - Asia, Europe, US Market Analysis
Różne sesje mają różne charakterystyki:
- Asia Session: Niższa zmienność, często range-bound
- London Session: Breakout asiańskiego range, wysoka zmienność
- US Session: Kontynuacja lub reversal, najwyższy wolumen
- Session Overlaps: Najwyższa zmienność (London-NY overlap)

## Types

## Session Definitions

## TRADING SESSIONS

### Asia
- **Name**: asia
- **Start UTC**: 0
- **End UTC**: 8
- **Characteristics**
  - Niższa zmienność
  - Często range-bound
  - Mniej fakeoutów
  - Dobre dla range trading
- **Typical Behavior**: Consolidation, budowanie range który często jest przebijany w London

### London
- **Name**: london
- **Start UTC**: 8
- **End UTC**: 12
- **Characteristics**
  - Wysoka zmienność
  - Często breakout z Asia range
  - Smart Money aktywne
  - Dużo fakeoutów na początku
- **Typical Behavior**: Breakout z Asia range, często z fakeout w przeciwnym kierunku najpierw

### London ny overlap
- **Name**: london_ny_overlap
- **Start UTC**: 12
- **End UTC**: 16
- **Characteristics**
  - NAJWYŻSZA zmienność
  - Największy wolumen
  - Często decyduje o kierunku dnia
  - Duże ruchy instytucjonalne
- **Typical Behavior**: Kontynuacja London move lub reversal. Tu zapadają decyzje.

### New york
- **Name**: new_york
- **Start UTC**: 16
- **End UTC**: 21
- **Characteristics**
  - Średnia zmienność
  - Często kontynuacja trendu
  - Equity close wpływa na risk appetite
  - Possible reversal po equity close
- **Typical Behavior**: Kontynuacja do equity close (21:00 UTC), potem możliwy reversal

### Off hours
- **Name**: off_hours
- **Start UTC**: 21
- **End UTC**: 0
- **Characteristics**
  - Bardzo niska zmienność
  - Cienki orderbook
  - Możliwe manipulacje
  - Weekend gaps
- **Typical Behavior**: Spokój przed burzą, unikaj tradowania

## Session Detection

_Oblicz czas w sesji_
_Oblicz czas do następnej sesji_
_Generuj rekomendację_

## Asia Range Analysis

Oblicza Asia Session Range
Breakout z tego range często określa kierunek dnia

_Filtruj świece z Asia session (00:00 - 08:00 UTC)_
Sprawdza czy nastąpił breakout z Asia range

## Judas Swing Detection

Judas Swing - fakeout na początku London session
Pattern: Cena idzie najpierw w przeciwnym kierunku do rzeczywistego ruchu
Typowo: Pierwszy ruch w London przebija Asia high/low, potem reversal

_Sprawdź czy był fakeout w górę_
_Fakeout UP -> Real move DOWN_
_Fakeout DOWN -> Real move UP_

## Daily Session Plan

- Asia Range: … - … (…%)
- Midpoint: …
- ⚠️ Asia breakout … (strength: …%)
- Czekaj na London breakout z Asia range

## Session Rules

## SESSION RULES

### GENERAL
- Najlepsza zmienność: London-NY overlap (12:00-16:00 UTC)
- Unikaj tradowania w off hours (21:00-00:00 UTC)
- Asia range często definiuje levels na cały dzień
- Pierwsze 15-30 min London to często fakeout (Judas Swing)

### ASIA
- Range trading preferowany
- Mniejsze pozycje (niższa zmienność)
- Buduj watchlist na London
- Zaznacz Asia High/Low jako key levels

### LONDON
- UWAGA na Judas Swing w pierwszych 30 min!
- Czekaj na potwierdzenie kierunku przed wejściem
- Breakout z Asia range często określa kierunek dnia
- Smart Money najbardziej aktywne

### OVERLAP
- Najwyższa zmienność i wolumen
- Agresywne pozycje OK
- Trend kontynuacja lub major reversal
- Tu zapadają decyzje dnia

### NEW YORK
- Kontynuuj trend do equity close (21:00 UTC)
- Zmniejsz pozycje przed close
- Możliwe reversale po equity close
- Mniej fakeoutów niż London open
