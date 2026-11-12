@echo off
cd /d %~dp0
if not exist .venv (
  echo Tworze srodowisko Python...
  python -m venv .venv
  .venv\Scripts\pip install -r requirements.txt
)
if not exist .env (
  copy .env.example .env
  echo.
  echo Uzupelnij plik .env - klucz Claude, token Telegrama, foldery - i uruchom ponownie.
  notepad .env
  exit /b
)
start "" http://127.0.0.1:8765
.venv\Scripts\python main.py
