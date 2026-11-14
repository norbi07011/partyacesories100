#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
[ -d .venv ] || python3 -m venv .venv
.venv/bin/python -m pip install -q -r requirements.txt
# rozpoznawanie mowy offline (opcjonalne)
.venv/bin/python -m pip install -q -r requirements-voice.txt || true
[ -f .env ] || cp .env.example .env

# darmowy lokalny model AI (Ollama)
MODEL=$(grep -E '^OLLAMA_MODEL=' .env | cut -d= -f2); MODEL=${MODEL:-qwen3:8b}
if command -v ollama >/dev/null 2>&1; then
  ollama list | grep -q "$MODEL" || { echo "Pobieram model $MODEL (jednorazowo kilka GB)..."; ollama pull "$MODEL" || true; }
  ollama list | grep -q "nomic-embed-text" || ollama pull nomic-embed-text || true
else
  echo "Brak Ollamy. Zainstaluj: https://ollama.com/download  (Linux: curl -fsSL https://ollama.com/install.sh | sh)"
fi

( sleep 3; (open http://127.0.0.1:8765 2>/dev/null || xdg-open http://127.0.0.1:8765 2>/dev/null) ) &
exec .venv/bin/python main.py
