"""Zadania w tle: przypomnienia, poranny brief, alerty i analiza krypto, skan plików, kopia zapasowa.

Tu dopisuj kolejne zadania w tle - dodaj funkcję, wpis w JOBS i w _plan().
"""
import asyncio
import logging
import shutil
from datetime import timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler

import agent
import config
import crypto
import db
import file_indexer
from notifier import notify

log = logging.getLogger("scheduler")
scheduler = AsyncIOScheduler(timezone=config.TZ)


async def check_reminders() -> None:
    now = db.now()
    horizon = (now + timedelta(minutes=config.REMINDER_MINUTES)).strftime("%Y-%m-%dT%H:%M")
    now_s = now.strftime("%Y-%m-%dT%H:%M")

    for e in db.query("SELECT * FROM events WHERE reminded = 0 AND start <= ? AND start >= ?",
                      (horizon, (now - timedelta(minutes=5)).strftime("%Y-%m-%dT%H:%M"))):
        db.update("events", e["id"], {"reminded": 1})
        details = "\n".join(x for x in [
            f"🕐 {e['start'][11:16]}" + (f"–{e['end'][11:16]}" if e.get("end") else ""),
            f"📍 {e['location']}" if e["location"] else "",
            f"👤 {e['client']}" if e["client"] else "",
            e["notes"] or "",
        ] if x)
        await notify(f"📅 Za chwilę: {e['title']}", details, level="reminder")

    for t in db.query("SELECT * FROM tasks WHERE reminded = 0 AND status != 'done' AND due IS NOT NULL AND due <= ?",
                      (now_s,)):
        db.update("tasks", t["id"], {"reminded": 1})
        await notify(f"⏰ {t['title']}", t["notes"] or "Termin zadania właśnie mija.", level="reminder")

    # projekty z terminem oddania jutro - raz dziennie
    tomorrow = (now + timedelta(days=1)).strftime("%Y-%m-%d")
    if db.kv_get("project_deadline_check") != now.strftime("%Y-%m-%d") and now.hour >= 9:
        db.kv_set("project_deadline_check", now.strftime("%Y-%m-%d"))
        for p in db.query("SELECT * FROM projects WHERE deadline = ? AND status NOT IN ('oddany','oplacony','anulowany')",
                          (tomorrow,)):
            await notify(f"📦 Jutro termin oddania: {p['name']}", f"Klient: {p['client'] or '—'}", level="reminder")


async def morning_brief() -> None:
    text = await agent.run(
        "Przygotuj mój poranny brief: plan dnia z kalendarza (list_events na dziś i jutro), najważniejsze otwarte "
        "zadania i zaległe terminy, projekty z bliskim terminem oddania (list_projects), jeden pomysł z listy "
        "pomysłów wart rozwinięcia oraz krótką poradę, na czym się dziś skupić. Krótko, maksymalnie 15 linijek.",
        session="system:brief", save=False,
    )
    await notify("☀️ Dzień dobry — Twój plan na dziś", text, level="brief")


async def monthly_finance_report() -> None:
    """1. dnia miesiąca: raport finansowy za poprzedni miesiąc → Dokumenty + powiadomienie."""
    prev = (db.now().replace(day=1) - timedelta(days=1)).strftime("%Y-%m")
    text = await agent.run(
        f"Przygotuj mój raport finansowy za {prev} (umiejętność Raport finansowy): liczby, wykresy, obszary, portfel, "
        "wnioski. Zapisz go w dokumentach. Na końcu podaj 3 najważniejsze wnioski w 3 krótkich punktach.",
        session="system:finance", save=False,
    )
    await notify(f"📊 Raport finansowy za {prev}", text[-1500:], level="brief")


async def reindex_files() -> None:
    if config.WATCH_FOLDERS:
        await asyncio.to_thread(file_indexer.reindex)


async def backup() -> None:
    """Codzienna kopia bazy (ostatnie 7 dni) w data/backups."""
    folder = config.DATA_DIR / "backups"
    folder.mkdir(exist_ok=True)
    target = folder / f"agent-{db.now():%Y-%m-%d}.db"
    await asyncio.to_thread(db.backup_to, target)
    for old in sorted(folder.glob("agent-*.db"))[:-7]:
        old.unlink(missing_ok=True)


JOBS = {
    "reminders": ("Przypomnienia o terminach", check_reminders),
    "brief": ("Poranny brief na Telegram", morning_brief),
    "crypto": ("Alerty cenowe krypto", crypto.check_alerts),
    "crypto_analysis": ("Analiza rynku krypto (duże ruchy)", crypto.analyze_market),
    "finance_report": ("Miesięczny raport finansowy (1. dnia miesiąca)", monthly_finance_report),
    "reindex": ("Nocne skanowanie plików", reindex_files),
    "backup": ("Kopia zapasowa bazy", backup),
}


def _plan() -> None:
    scheduler.remove_all_jobs()
    tz = config.TZ
    scheduler.add_job(check_reminders, "interval", minutes=1, id="reminders", max_instances=1)
    if config.MORNING_BRIEF_ENABLED:
        scheduler.add_job(morning_brief, "cron", hour=config.MORNING_BRIEF_HOUR,
                          minute=config.MORNING_BRIEF_MINUTE, id="brief", timezone=tz)
    scheduler.add_job(crypto.check_alerts, "interval", minutes=config.CRYPTO_CHECK_MINUTES, id="crypto", max_instances=1)
    scheduler.add_job(crypto.analyze_market, "interval", minutes=30, id="crypto_analysis", max_instances=1)
    scheduler.add_job(reindex_files, "cron", hour=3, minute=30, id="reindex", max_instances=1, timezone=tz)
    scheduler.add_job(monthly_finance_report, "cron", day=1, hour=9, minute=7, id="finance_report", timezone=tz)
    scheduler.add_job(backup, "cron", hour=3, minute=10, id="backup", timezone=tz)


def start() -> None:
    _plan()
    scheduler.start()
    log.info("Harmonogram uruchomiony")


def reschedule() -> None:
    """Po zmianie ustawień - zaplanuj zadania od nowa."""
    _plan()


async def run_now(job_id: str) -> bool:
    job = JOBS.get(job_id)
    if not job:
        return False
    asyncio.create_task(job[1]())
    return True


def jobs() -> list[dict]:
    out = []
    for jid, (label, _) in JOBS.items():
        j = scheduler.get_job(jid)
        out.append({"id": jid, "label": label, "enabled": j is not None,
                    "next_run": j.next_run_time.strftime("%Y-%m-%d %H:%M") if j and j.next_run_time else None})
    return out


def disk_free() -> dict | None:
    try:
        u = shutil.disk_usage(config.DATA_DIR)
        return {"total": u.total, "free": u.free}
    except OSError:
        return None
