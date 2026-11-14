# Zarządzanie ryzykiem – zasady z risk_manager i paper trading

_Źródło: MESSUAI backend/app/services/risk_manager.py, paper_trading.py, advanced-strategies.ts (opracowanie)._

## Wielkość pozycji
- **Zasada 1%:** ryzykuj maksymalnie 1% kapitału na transakcję; twardy limit bezpieczeństwa 2%.
- Wielkość pozycji = (kapitał × ryzyko %) / odległość do SL. Dźwignia nie zmienia ryzyka – zmienia tylko depozyt.
- Zbyt duża pozycja przy ciasnym SL? Ogranicz ją do wolnych środków i limitu dźwigni.

## Stop loss i take profit
- SL = 2 × ATR(14) – standard profesjonalny; TP = 4 × ATR (R:R 1:2).
- Minimalny R:R 1:2, idealny 1:3.
- Bufor SL/TP: nie ustawiaj SL i TP dokładnie na poziomie – rynek często zawraca tuż przed nim. Scalp: TP −0,15%, SL +0,10%; swing: 0,25% / 0,15%; pozycja: 0,40% / 0,25%.
- SL zawsze przed ceną likwidacji. Przy dźwigni 10× likwidacja jest ok. 9,5% od wejścia, przy 20× ok. 4,5%.

## Prowadzenie pozycji
- Break-even po 0,5R zysku; trailing stop od 1R, krok 0,25%.
- Pozycje długoterminowe: częściowe TP – 30% przy 1,5R, 40% przy 2,5R, 30% przy 4R.
- Dynamiczny SL: po przełamaniu oporu i 3 świecach potwierdzenia przesuń SL 0,3% pod nowe wsparcie (tylko przy ≥ 1R zysku).

## Limity konta
- Maksymalna liczba otwartych pozycji (domyślnie 5; agenci MESSUAI: 2 na monetę – 1 LONG + 1 SHORT).
- Dzienny limit straty (domyślnie 5% kapitału) – po jego przekroczeniu przerwa do jutra.
- Opłaty: 0,06% wartości przy wejściu i wyjściu (taker); przy częstym handlu zjadają przewagę.

## Psychologia (Mark Douglas)
- Każda transakcja to tylko jedna z serii – liczy się przewaga statystyczna, nie pojedynczy wynik.
- Nie przesuwaj SL dalej, nie „odgrywaj się” po stracie, nie zwiększaj pozycji po serii zysków.
- Prowadź dziennik: powód wejścia, plan wyjścia, wynik w R, wnioski.

## Konto demo w Studio Agent
Wszystkie zlecenia i boty działają na wirtualnych USDT (domyślnie 10 000). Nic nie trafia na prawdziwą giełdę i nie są używane żadne klucze API.
