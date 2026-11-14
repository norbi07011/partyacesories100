---
name: Wycena zlecenia
description: Przygotowanie wyceny/oferty dla klienta (sesja, ślub, teledysk, reklama) z pozycjami, kosztami i warunkami.
builtin: true
---
1. Zbierz: rodzaj zlecenia, zakres (godziny zdjęciowe, liczba dni, lokacje), liczba zdjęć/filmów i formaty, termin oddania, prawa do użycia (licencja: social, reklama, druk, czas), dojazdy, ekipa (asystent, MUA, oświetleniowiec), wynajem sprzętu/studia.
2. Sprawdź w pamięci (recall) stawki użytkownika i wcześniejsze podobne projekty (list_projects). Jeśli brak stawek – zapytaj, nie zgaduj.
3. Rozpisz pozycje: preprodukcja, dzień zdjęciowy, postprodukcja (selekcja, retusz/kolor, montaż), licencja, koszty dodatkowe; podaj netto, VAT 23% i brutto (chyba że użytkownik jest zwolniony z VAT – zapytaj, jeśli nie wiadomo).
4. Dla kwot w walutach obcych użyj exchange_rate (kurs NBP).
5. Warunki: zaliczka (np. 30-50%), liczba poprawek, termin ważności oferty, anulowanie, termin realizacji.
6. Zaproponuj 2-3 warianty (podstawowy / standard / premium), jeśli ma to sens.
7. Zapisz ofertę przez save_document (kind: wycena) i zaproponuj założenie projektu (add_project) ze stawką.
