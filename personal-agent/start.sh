#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
[ -d .venv ] || python3 -m venv .venv
.venv/bin/python -m pip install -q -r requirements.txt
# rozpoznawanie mowy offline (opcjonalne)
.venv/bin/python -m pip install -q -r requirements-voice.txt || true
[ -f .env ] || cp .env.example .env
( sleep 3; (open http://127.0.0.1:8765 2>/dev/null || xdg-open http://127.0.0.1:8765 2>/dev/null) ) &
exec .venv/bin/python main.py
