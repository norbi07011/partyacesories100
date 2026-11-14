@echo off
chcp 65001 >nul
cd /d %~dp0
echo === Studio Agent ===
if not exist .venv (
  echo Tworze srodowisko Python - pierwsze uruchomienie moze potrwac kilka minut...
  python -m venv .venv
)
.venv\Scripts\python -m pip install -q -r requirements.txt
rem Rozpoznawanie mowy offline (opcjonalne - jesli sie nie zainstaluje, dziala glos z przegladarki)
.venv\Scripts\python -m pip install -q -r requirements-voice.txt 2>nul
if not exist .env copy .env.example .env >nul

rem ---- Darmowy lokalny model AI (Ollama) ----
set "OLLAMA_EXE=ollama"
where ollama >nul 2>nul
if errorlevel 1 (
  if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" (
    set "OLLAMA_EXE=%LOCALAPPDATA%\Programs\Ollama\ollama.exe"
  ) else (
    echo Instaluje Ollame - darmowy lokalny model AI...
    winget install -e --id Ollama.Ollama --accept-source-agreements --accept-package-agreements
    if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" (
      set "OLLAMA_EXE=%LOCALAPPDATA%\Programs\Ollama\ollama.exe"
    ) else (
      echo Nie udalo sie zainstalowac automatycznie. Pobierz recznie: https://ollama.com/download
      set "OLLAMA_EXE="
    )
  )
)
set "OLLAMA_MODEL=qwen3:8b"
for /f "tokens=2 delims==" %%a in ('findstr /b "OLLAMA_MODEL=" .env 2^>nul') do set "OLLAMA_MODEL=%%a"
if defined OLLAMA_EXE (
  "%OLLAMA_EXE%" list | findstr /i "%OLLAMA_MODEL%" >nul
  if errorlevel 1 (
    echo Pobieram model %OLLAMA_MODEL% - jednorazowo kilka GB, prosze czekac...
    "%OLLAMA_EXE%" pull %OLLAMA_MODEL%
  )
)

start "" http://127.0.0.1:8765/
.venv\Scripts\python main.py
pause
