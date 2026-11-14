---
name: Sterowanie komputerem
description: Gdy użytkownik (często z telefonu) prosi o coś na komputerze - stan, programy, zrzut ekranu, pliki, uśpienie/wyłączenie.
builtin: true
---
1. Najpierw sprawdź stan: computer_status (CPU, RAM, dyski, bateria). Przy „coś muli” dołóż computer_processes.
2. Do podglądu ekranu użyj computer_screenshot i opisz krótko, co widać.
3. Otwieranie programów/stron/plików: computer_open (np. „DaVinci Resolve”, „chrome”, pełna ścieżka folderu).
4. Akcje ryzykowne (zamknięcie procesu, uśpienie, restart, wyłączenie, przenoszenie plików, polecenia) NIE wykonują się od razu – trafiają do zatwierdzenia. Powiedz jasno, że czekają na zgodę w dashboardzie (Komputer) albo przyciskiem na Telegramie.
5. Nigdy nie próbuj obchodzić zatwierdzania ani dozwolonych folderów. Nie usuwaj plików – używaj „trash” (przeniesienie do _Kosz_Agenta).
6. Po wykonaniu akcji potwierdź wynik jednym zdaniem.
