# Instrukcja dodania produktu - Świecące Litery

## Krok 1: Wykonaj SQL w Supabase

1. Zaloguj się do Supabase Dashboard
2. Wybierz projekt Party Accessoires Verhuur
3. Idź do SQL Editor
4. Skopiuj i wykonaj zawartość pliku: `add-letter-lights-product.sql`
5. Kliknij "Run" żeby dodać produkt do bazy

## Krok 2: Zrestartuj aplikację

Aplikacja automatycznie pobierze nowy produkt z bazy danych.

## Jak to działa?

### Dla klienta:
1. Klient widzi produkt "Świecące Litery" w kategorii "Effects"
2. Po kliknięciu "Dodaj do koszyka" otwiera się specjalna klawiatura
3. Może wybrać dowolne litery (A-Z) oraz znaki specjalne (?, !, &, ❤, ★)
4. Cena oblicza się automatycznie: liczba liter × €10
5. Może używać spacji do oddzielania słów (spacje są darmowe)
6. Przykład: "PARTY" = 5 liter = €50

### Funkcje klawiatury:
- **Alfabet A-Z** - wszystkie litery
- **Znaki specjalne** - ?, !, &, ❤, ★
- **SPACJA** - dodaje odstęp (gratis)
- **COFNIJ** - usuwa ostatnią literę
- **WYCZYŚĆ** - usuwa cały tekst
- **Podgląd na żywo** - widzisz co piszesz w dużych literach
- **Licznik** - pokazuje ile liter i jaka cena

### W koszyku:
- Pokazuje wybrany tekst w cudzysłowie: ✨ "LOVE"
- Quantity = liczba liter (każda litera = €10)
- Można dodać wiele różnych tekstów (każdy jako osobna pozycja)

## Opis produktu

**PL:** Stwórz niezapomnianą atmosferę z naszymi vintage świecącymi literami! Idealne na Gender Reveal, wesela, urodziny. Każda litera 80 cm z ciepłymi LED. Ułóż własny tekst - od "MIŁOŚĆ" po "PARTY" lub "CHŁOPIEC CZY DZIEWCZYNKA?". Profesjonalne i idealne na Instagram! Cena za literę (€10).

**NL:** Creëer een onvergetelijke sfeer met onze vintage verlichte letters! Perfect voor Gender Reveal, bruiloften, verjaarfeesten. Elke letter 80 cm met warme LED. Stel je eigen tekst samen - van "LOVE" tot "PARTY" of "JONGEN OF MEISJE?". Professioneel en Instagram-waardig! Prijs per letter (€10).

**EN:** Create unforgettable atmosphere with vintage illuminated letters! Perfect for Gender Reveals, weddings, birthdays. Each letter 80 cm with warm LED. Compose your own text - from "LOVE" to "PARTY" or "BOY OR GIRL?". Professional and Instagram-worthy! Price per letter (€10).

## Zdjęcie produktu

Plik: `/public/images/produkt-litery.jpeg`
Zdjęcie pokazuje "JONGEN OF MEISJE?" z różowymi i niebieskimi balonami - idealne Gender Reveal setup!
