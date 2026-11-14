---
name: Raport finansowy
description: Miesięczne/roczne statystyki finansów - przychody, koszty, zysk, obszary (Stratfanat, WWW, teledyski, foto, krypto), portfel, wykresy i wnioski.
builtin: true
---
1. Ustal okres (domyślnie poprzedni pełny miesiąc; „ten miesiąc” = bieżący; „rok” = finance_report z year).
2. Wywołaj finance_report dla okresu oraz portfolio_status.
3. Przedstaw raport w tej kolejności:
   - **Najważniejsze liczby** (krótka lista): przychody, koszty, straty, zysk, marża, inwestycje oraz zmiana % do poprzedniego okresu.
   - **Wykresy**: wklej specyfikacje z pola `wykresy` jako osobne bloki kodu z językiem `chart`, np.
     ```chart
     {"type":"bar","title":"Przychody i koszty (12 mies.)","labels":["25-12","26-01"],"series":[{"name":"Przychody","data":[1200,3400]},{"name":"Koszty","data":[800,1500]}]}
     ```
     Nie zmieniaj liczb. Dostępne typy: bar (pionowe słupki), hbar (poziome), line (trend).
   - **Obszary działalności**: który zarabia najwięcej, który kosztuje najwięcej (Stratfanat, Strony WWW, Teledyski, Fotografia, Krypto).
   - **Portfel**: wartość, wynik, największe pozycje.
   - **Wnioski i rekomendacje**: 3-5 konkretnych punktów (co ciąć, co rozwijać, ryzyka, np. brak przychodów w danym obszarze).
4. Jeśli danych jest mało, powiedz o tym wprost i zaproponuj, jakie transakcje dopisać (np. stałe koszty: hosting, abonamenty).
5. Zapisz raport przez save_document (kind: inne, tytuł „Raport finansowy <okres>”) razem z blokami chart.
