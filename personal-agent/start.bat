@echo off
cd /d %~dp0
if not exist .venv (
  echo Tworze srodowisko Python - pierwsze uruchomienie moze potrwac kilka minut...
  python -m venv .venv
)
.venv\Scripts\python -m pip install -q -r requirements.txt
if not exist .env copy .env.example .env >nul
start "" http://127.0.0.1:8765/#settings
.venv\Scripts\python main.py
pause
