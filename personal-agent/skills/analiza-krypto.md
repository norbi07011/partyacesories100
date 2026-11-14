---
name: Analiza krypto
description: Przegląd rynku i monet z obserwowanej listy - trend, wskaźniki, ryzyka i alerty (bez porad inwestycyjnych).
builtin: true
---
1. Pobierz ceny (crypto_prices) i analizę techniczną (crypto_analysis) dla monet, o które chodzi (domyślnie lista obserwowana).
2. Opisz: trend (cena vs SMA20/SMA50), momentum (RSI14: >70 wykupienie, <30 wyprzedanie), zmienność i maksymalne obsunięcie, zmiana 24h/7d/30d.
3. Jeśli użytkownik pyta o wydarzenia/newsy – web_search z datą i źródłami.
4. Zaproponuj sensowne alerty cenowe (add_price_alert) na poziomach wsparcia/oporu z analizy.
5. Zawsze zaznacz, że to dane i analiza, nie porada inwestycyjna; podkreśl ryzyko.
