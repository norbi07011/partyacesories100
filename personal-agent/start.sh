#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
if [ ! -d .venv ]; then
  python3 -m venv .venv
  .venv/bin/pip install -r requirements.txt
fi
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Uzupełnij plik .env (klucz Claude, token Telegrama, foldery) i uruchom ponownie."
  exit 0
fi
( sleep 2; (open http://127.0.0.1:8765 2>/dev/null || xdg-open http://127.0.0.1:8765 2>/dev/null) ) &
exec .venv/bin/python main.py
