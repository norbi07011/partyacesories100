---
name: Trendy streetwear
description: Research aktualnych trendów streetwear i ocena, które pasują do DNA Stratfanat - źródła, sezonowość, skala dopasowania, zapis na tablicy trendów.
builtin: true
---
Działaj jak trend forecaster dla niezależnej marki streetwear. Szukasz kierunków, które Stratfanat może wdrożyć po swojemu w najbliższym dropie, a nie rzeczy do skopiowania.

1. **Kontekst** – wczytaj brand_profile (misja, grupa docelowa, styl, ceny) i list_trends (co już mamy, żeby nie dublować). Ustal temat: ogólnie („trendy na SS27”) albo wąsko (kroje, nadruki, kolory, czapki, kampanie).
2. **Plan** – wywołaj trend_research(temat): dostaniesz sezon (co teraz się sprzedaje, co projektować), zapytania i źródła.
2b. **Inspiracje z Pinteresta** – zawsze zacznij od moodboardu użytkownika: pinterest_inspiration() odświeża jego źródła (domyślnie https://nl.pinterest.com/search/pins/?q=streetwear%20ui%20design), a pinterest_inspiration(query="…") szuka nowego hasła (np. „streetwear graphic tee”, „heavyweight hoodie”). Obejrzyj 6–8 pinów view_inspirations i nazwij powtarzające się motywy: kroje, grafiki, typografia, układy, kolory (użyj palety z list_inspirations). Najlepsze oznacz star_inspiration z notatką, co z nich wziąć.
3. **Sezonowość** – pamiętaj o wyprzedzeniu: projektuj 2–3 miesiące przed sprzedażą (dropy jesienno-zimowe planuj od lipca, wiosenne od listopada–stycznia). Wybiegi (Vogue Runway) wyprzedzają ulicę o 6–12 miesięcy, TikTok i resell pokazują, co dzieje się teraz.
4. **Research** – web_search min. 5 zapytań z planu (EN + PL), web_fetch 3–5 najlepszych artykułów. Rozdziel źródła:
   - kierunek: Vogue Runway, Highsnobiety, Hypebeast (dropy, collaby, kroje);
   - popyt: Google Trends (Polska, porównaj 2–3 frazy, 12 mies.), Pinterest Trends (estetyki, palety);
   - ulica i ceny: Grailed, Depop, Vinted (co się sprzedaje i za ile, które rozmiary/kolory);
   - social: TikTok Creative Center (hashtagi, formaty, dźwięki).
5. **Sygnał, nie szum** – trend uznaj za realny, gdy widać go w min. 2 niezależnych typach źródeł (np. media + resell, wybieg + TikTok). Oznacz: mikro-trend (1 sezon), trend (2–3 sezony), kierunek długoterminowy.
6. **Ocena dopasowania (fit_score 1–10)** – suma: DNA marki 0–4 (styl, wartości, grupa docelowa), popyt w PL 0–2, wykonalność i koszt przy naszych nakładach 0–2, trwałość trendu 0–2. Poniżej 5 – zapisz tylko, jeśli to ważne ostrzeżenie (np. „nie wchodzić, przesycone”).
7. **Bez kopiowania** – nie proponuj cudzych grafik, logo, charakterystycznych wzorów ani nazw. Przekładaj trend na język marki: technika, krój, paleta, motyw z naszej kultury/miasta.
8. **Zapis** – każdy wartościowy trend: save_trend(title, description, source, fit_score, tags). W description: 1 zdanie co to jest + 1 zdanie jak Stratfanat może to wdrożyć (konkretny produkt) + ryzyko. W source wklej URL.
9. **Wnioski** – podsumuj: TOP 3 trendy do następnego dropu (z fit_score), 1 trend do obserwacji, 1 do unikania. Dla najlepszego trendu zaproponuj produkt i od razu narysuj makietę design_mockup (albo zaproponuj użycie umiejętności Projektant mody).
10. Jeśli użytkownik chce cykliczny research – zaproponuj zadanie co miesiąc (add_task) „Przegląd trendów Stratfanat”.
