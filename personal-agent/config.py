"""Konfiguracja agenta - czytana z pliku .env, edytowalna z dashboardu (zakładka Ustawienia).

Inne moduły używają `import config` i `config.NAZWA`, dzięki czemu po zapisaniu ustawień
wartości zmieniają się bez restartu programu.
"""
import os
import re
from pathlib import Path
from zoneinfo import ZoneInfo

from dotenv import dotenv_values

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
DB_PATH = DATA_DIR / "agent.db"
UPLOAD_DIR = DATA_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
THUMB_DIR = DATA_DIR / "thumbs"
THUMB_DIR.mkdir(exist_ok=True)

# Ustawienia edytowalne z dashboardu: klucz -> (opis, domyślna wartość, czy sekret)
SETTINGS: dict[str, tuple[str, str, bool]] = {
    "ANTHROPIC_API_KEY": ("Klucz API Claude (console.anthropic.com)", "", True),
    "AGENT_MODEL": ("Model", "claude-opus-5-5", False),
    "AGENT_EFFORT": ("Poziom myślenia: low / medium / high / xhigh / max", "medium", False),
    "AGENT_FALLBACKS": ("Automatyczny model zapasowy przy odmowie (1/0)", "1", False),
    "TELEGRAM_BOT_TOKEN": ("Token bota od @BotFather", "", True),
    "TELEGRAM_ALLOWED_CHAT_IDS": ("Dozwolone chat_id (po przecinku)", "", False),
    "USER_NAME": ("Twoje imię", "", False),
    "USER_PROFILE": ("Kim jesteś i jak pracujesz (agent bierze to pod uwagę)", "", False),
    "TIMEZONE": ("Strefa czasowa", "Europe/Warsaw", False),
    "WATCH_FOLDERS": ("Foldery z plikami (oddzielone średnikiem)", "", False),
    "INDEX_EXIF": ("Czytaj EXIF zdjęć: aparat, obiektyw, ISO (1/0)", "1", False),
    "MORNING_BRIEF_HOUR": ("Godzina porannego briefu", "8", False),
    "MORNING_BRIEF_MINUTE": ("Minuta porannego briefu", "0", False),
    "MORNING_BRIEF_ENABLED": ("Poranny brief włączony (1/0)", "1", False),
    "REMINDER_MINUTES": ("Ile minut przed wydarzeniem przypominać", "60", False),
    "CRYPTO_WATCHLIST": ("Obserwowane krypto (ID z CoinGecko, po przecinku)", "bitcoin,ethereum,solana", False),
    "CRYPTO_CHECK_MINUTES": ("Co ile minut sprawdzać alerty krypto", "5", False),
    "HOST": ("Adres serwera (zmiana wymaga restartu)", "127.0.0.1", False),
    "PORT": ("Port serwera (zmiana wymaga restartu)", "8765", False),
}


def _split(raw: str) -> list[str]:
    return [s.strip() for s in (raw or "").replace(";", ",").split(",") if s.strip()]


def _folders(raw: str) -> list[str]:
    # Ścieżki Windows mogą zawierać przecinki rzadko, średnik jest głównym separatorem
    sep = ";" if ";" in (raw or "") else ","
    return [s.strip() for s in (raw or "").split(sep) if s.strip()]


def _int(v: str, default: int) -> int:
    try:
        return int(v)
    except (TypeError, ValueError):
        return default


def raw_values() -> dict[str, str]:
    file_vals = dotenv_values(ENV_PATH) if ENV_PATH.exists() else {}
    out = {}
    for key, (_, default, _) in SETTINGS.items():
        out[key] = file_vals.get(key) if file_vals.get(key) is not None else os.getenv(key, default)
    return out


def reload() -> None:
    v = raw_values()
    g = globals()
    g["ANTHROPIC_API_KEY"] = v["ANTHROPIC_API_KEY"] or ""
    g["MODEL"] = v["AGENT_MODEL"] or "claude-opus-5-5"
    g["EFFORT"] = v["AGENT_EFFORT"] or "medium"
    g["FALLBACKS"] = v["AGENT_FALLBACKS"] == "1"
    g["TELEGRAM_BOT_TOKEN"] = v["TELEGRAM_BOT_TOKEN"] or ""
    g["TELEGRAM_ALLOWED_CHAT_IDS"] = [int(x) for x in _split(v["TELEGRAM_ALLOWED_CHAT_IDS"]) if x.lstrip("-").isdigit()]
    g["USER_NAME"] = v["USER_NAME"] or ""
    g["USER_PROFILE"] = v["USER_PROFILE"] or ""
    g["TIMEZONE"] = v["TIMEZONE"] or "Europe/Warsaw"
    try:
        g["TZ"] = ZoneInfo(g["TIMEZONE"])
    except Exception:  # noqa: BLE001
        g["TZ"] = ZoneInfo("Europe/Warsaw")
    g["WATCH_FOLDERS"] = _folders(v["WATCH_FOLDERS"])
    g["INDEX_EXIF"] = v["INDEX_EXIF"] != "0"
    g["MORNING_BRIEF_HOUR"] = _int(v["MORNING_BRIEF_HOUR"], 8)
    g["MORNING_BRIEF_MINUTE"] = _int(v["MORNING_BRIEF_MINUTE"], 0)
    g["MORNING_BRIEF_ENABLED"] = v["MORNING_BRIEF_ENABLED"] != "0"
    g["REMINDER_MINUTES"] = _int(v["REMINDER_MINUTES"], 60)
    g["CRYPTO_WATCHLIST"] = [c.lower() for c in _split(v["CRYPTO_WATCHLIST"])]
    g["CRYPTO_CHECK_MINUTES"] = max(1, _int(v["CRYPTO_CHECK_MINUTES"], 5))
    g["HOST"] = v["HOST"] or "127.0.0.1"
    g["PORT"] = _int(v["PORT"], 8765)


def public_values() -> dict:
    """Wartości do pokazania w dashboardzie - sekrety zamaskowane."""
    v = raw_values()
    out = []
    for key, (label, default, secret) in SETTINGS.items():
        val = v.get(key) or ""
        out.append({
            "key": key, "label": label, "secret": secret, "set": bool(val),
            "value": ("•" * 8 + val[-4:]) if (secret and val) else val,
        })
    return {"settings": out}


def save(updates: dict[str, str]) -> list[str]:
    """Zapisuje zmienione ustawienia do .env (zachowując komentarze). Zwraca listę zmienionych kluczy."""
    lines = ENV_PATH.read_text(encoding="utf-8").splitlines() if ENV_PATH.exists() else []
    changed = []
    for key, value in updates.items():
        if key not in SETTINGS:
            continue
        value = str(value).replace("\n", " ").strip()
        _, _, secret = SETTINGS[key]
        if secret and value.startswith("•"):
            continue  # zamaskowana wartość - bez zmian
        if re.search(r"[\s#'\"\\]", value):
            quoted = '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'
        else:
            quoted = value
        pattern = re.compile(rf"^\s*{re.escape(key)}\s*=")
        for i, line in enumerate(lines):
            if pattern.match(line):
                lines[i] = f"{key}={quoted}"
                break
        else:
            lines.append(f"{key}={quoted}")
        changed.append(key)
    ENV_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    reload()
    return changed


reload()
