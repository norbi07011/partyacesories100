---
name: Plan dnia zdjęciowego
description: Plan pleneru lub dnia zdjęciowego - pogoda, złota/niebieska godzina, harmonogram godzinowy, lista sprzętu i call sheet.
builtin: true
---
1. Ustal datę, lokację (miasto/miejsce), godziny dostępności ludzi, rodzaj zdjęć.
2. Sprawdź weather_forecast dla lokacji i dnia: zachmurzenie, opady, wiatr, temperatura, wschód/zachód słońca, złota i niebieska godzina. Oceń ryzyko i zaproponuj plan B (inna data, miejsce zadaszone).
3. Ułóż harmonogram godzinowy (call sheet): zbiórka, dojazd, rozstawienie, make-up, bloki zdjęciowe (najważniejsze ujęcia w złotej godzinie), przerwy, zwijanie. Uwzględnij kierunek światła.
4. Lista sprzętu (body, obiektywy, baterie ×2, karty, lampy/blendy, statyw, gimbal, dron + przepisy), rekwizyty, kontakty ekipy, adres i parking.
5. Wpisz dzień do kalendarza (add_event) z miejscem i notatkami, dodaj zadania przygotowawcze dzień wcześniej (ładowanie baterii, formatowanie kart) przez add_task / schedule_reminder.
6. Zapisz call sheet przez save_document (kind: callsheet).
