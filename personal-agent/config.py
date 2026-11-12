"""Konfiguracja agenta - wszystko czytane z pliku .env."""
import os
from pathlib import Path
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def _list(name: str, default: str = "") -> list[str]:
    raw = os.getenv(name, default).replace(";", ",")
    return [s.strip() for s in raw.split(",") if s.strip()]


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
MODEL = os.getenv("AGENT_MODEL", "claude-opus-5-5")
EFFORT = os.getenv("AGENT_EFFORT", "medium")
FALLBACKS = os.getenv("AGENT_FALLBACKS", "1") == "1"

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_ALLOWED_CHAT_IDS = [int(x) for x in _list("TELEGRAM_ALLOWED_CHAT_IDS") if x.lstrip("-").isdigit()]

USER_NAME = os.getenv("USER_NAME", "")
USER_PROFILE = os.getenv("USER_PROFILE", "")
TIMEZONE = os.getenv("TIMEZONE", "Europe/Warsaw")
TZ = ZoneInfo(TIMEZONE)

WATCH_FOLDERS = _list("WATCH_FOLDERS")

MORNING_BRIEF_HOUR = _int("MORNING_BRIEF_HOUR", 8)
MORNING_BRIEF_MINUTE = _int("MORNING_BRIEF_MINUTE", 0)
REMINDER_MINUTES = _int("REMINDER_MINUTES", 60)

CRYPTO_WATCHLIST = _list("CRYPTO_WATCHLIST", "bitcoin,ethereum,solana")
CRYPTO_CHECK_MINUTES = _int("CRYPTO_CHECK_MINUTES", 5)

HOST = os.getenv("HOST", "127.0.0.1")
PORT = _int("PORT", 8765)

DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
DB_PATH = DATA_DIR / "agent.db"
