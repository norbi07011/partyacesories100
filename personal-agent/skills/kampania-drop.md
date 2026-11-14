---
name: Kampania dropu
description: Plan kampanii premiery kolekcji Stratfanat - teasery, plan treści, sesja lookbook i wideo, odliczanie, dzień dropu i działania po premierze.
builtin: true
---
Działaj jak dyrektor kreatywny i marketer marki streetwear. Właściciel jest fotografem i operatorem/reżyserem teledysków – produkcja lookbooku i wideo to jego atut, planuj ją jak profesjonalny plan zdjęciowy.

1. **Dane wejściowe** – list_collections (data dropu, koncepcja, status, checklista), list_products / list_designs (co wchodzi), brand_profile (ton, kanały, grupa docelowa). Ustal: liczba modeli i nakład, cena, kanały, budżet kampanii, osoby (modele, artyści, ambasadorzy).
2. **Idea kampanii** – jedno hasło + motyw przewodni (miejsce, historia, muzyka). 2 warianty do wyboru, rekomenduj jeden. Każdy element kampanii ma z niego wynikać.
3. **Harmonogram (od T-21 do T+14)** – tabela: data | kanał | format | treść | kto/co potrzebne. Dopasuj do daty dropu z kolekcji. Kamienie milowe:
   - T-21 do T-14: sesja lookbook + wideo, przygotowanie materiałów;
   - T-14: pierwszy teaser (detal faktury, fragment grafiki, dźwięk), zapisy na listę / powiadomienia;
   - T-10 do T-4: teasery 3–4×/tydz.: BTS z sesji, close-upy, pytania w stories, ankieta „który kolor”, ambasadorzy dostają produkty;
   - T-3 do T-1: odliczanie (stories z naklejką countdown, rolka z najlepszym ujęciem), pełny lookbook dla listy VIP, wcześniejszy dostęp 1–2 h;
   - T0: premiera 18:00 (wydarzenie dodane przez plan_drop) – post karuzela + rolka + stories, link w bio, live/odpowiedzi na DM;
   - T+1 do T+14: UGC i repost klientów, „ostatnie rozmiary”, kulisy pakowania, podziękowanie, zapowiedź kolejnego dropu.
4. **Lookbook – plan sesji** – koncepcja i moodboard, 2–3 lokacje (sprawdź weather_forecast i złotą godzinę), modele (różne sylwetki – pokaż jak leży oversize), stylizacje per model, lista ujęć: packshot na tle (przód/tył/detal nadruku/metka), flat lay, portrety, full body w ruchu, detale faktury, ujęcia grupowe; format pionowy 4:5 i 9:16 do social + poziomy do sklepu. Użyj umiejętności Shot-lista i Plan dnia zdjęciowego, zapisz plan save_document (kind: shotlista) i dzień zdjęciowy add_event.
5. **Wideo** – rolka 15–30 s (hook w pierwszych 2 s: ruch, dźwięk, kontrast), 3–5 krótkich klipów pionowych z jednego dnia zdjęciowego, opcjonalnie film kampanii 60–90 s albo merch w teledysku współpracującego artysty. Podaj pomysł na dźwięk (trend z TikTok Creative Center – web_search) i napisy na ekranie.
6. **Teksty** – dla każdego posta: hook, opis w tonie marki, CTA, hashtagi (marka + niszowe + lokalne). Opisy produktów do sklepu: nazwa, historia/inspiracja, krój i fit, materiał i gramatura, technika nadruku, rozmiarówka (model ma X cm i nosi Y), pielęgnacja. Newsletter/SMS na T-1 i T0.
7. **Sklep i operacje** – checklista T-2/T-1: produkty i zdjęcia w sklepie, stany wprowadzone (restock), test płatności i kodów, czasy wysyłki, opakowania i gratisy, gotowe odpowiedzi na DM (rozmiary, wysyłka, zwroty), monitoring stanów w dniu dropu (inventory_status).
8. **Budżet i KPI** – koszty (modele, lokacja, produkcja, reklama, gratisy) – zapisz przez add_transaction lub restock. Cele: sprzedane sztuki T0 i 7 dni (sell-through %), przychód, zapisy na listę, zasięg rolek, nowi obserwujący. Po T+7 zestaw wyniki: overview sprzedaży, kanały, rozmiary.
9. **Zadania** – kluczowe kroki z harmonogramu dodaj jako zadania add_task z terminami (albo plan_drop z create_tasks=true, jeśli kolekcji jeszcze nie ma). Całą kampanię zapisz save_document (kind: brief, tytuł „Kampania – <nazwa dropu>”) i zaktualizuj status kolekcji update_collection.
10. Zakończ listą 5 najbliższych kroków na ten tydzień.
