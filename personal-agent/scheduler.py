"""Zadania w tle: przypomnienia, poranny brief, alerty krypto, indeksowanie plików.

Tu dopisuj kolejne zadania w tle (np. analizę rynku krypto, raport tygodniowy...).
"""
import asyncio
import logging
from datetime import timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler

import agent
import crypto
import db
import file_indexer
from config import (CRYPTO_CHECK_MINUTES, MORNING_BRIEF_HOUR, MORNING_BRIEF_MINUTE, REMINDER_MINUTES, TZ,
                    WATCH_FOLDERS)
from notifier import notify

log = logging.getLogger("scheduler")
scheduler = AsyncIOScheduler(timezone=TZ)


async def check_reminders() -> None:
    now = db.now()
    horizon = (now + timedelta(minutes=REMINDER_MINUTES)).strftime("%Y-%m-%dT%H:%M")
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


async def morning_brief() -> None:
    text = await agent.run(
        "Przygotuj mój poranny brief: plan dnia z kalendarza (list_events na dziś i jutro), najważniejsze otwarte "
        "zadania i zaległe terminy, jeden pomysł z listy pomysłów wart rozwinięcia oraz krótką poradę, "
        "na czym się dziś skupić. Krótko, maksymalnie 15 linijek.",
        session="system:brief", save=False,
    )
    await notify("☀️ Dzień dobry - Twój plan na dziś", text, level="brief")


async def reindex_files() -> None:
    if WATCH_FOLDERS:
        await asyncio.to_thread(file_indexer.reindex)


def start() -> None:
    scheduler.add_job(check_reminders, "interval", minutes=1, id="reminders", max_instances=1)
    scheduler.add_job(morning_brief, "cron", hour=MORNING_BRIEF_HOUR, minute=MORNING_BRIEF_MINUTE, id="brief")
    scheduler.add_job(crypto.check_alerts, "interval", minutes=CRYPTO_CHECK_MINUTES, id="crypto", max_instances=1)
    scheduler.add_job(reindex_files, "cron", hour=3, minute=30, id="reindex", max_instances=1)
    scheduler.start()
    log.info("Harmonogram uruchomiony")


def jobs() -> list[dict]:
    return [{"id": j.id, "next_run": j.next_run_time.strftime("%Y-%m-%d %H:%M") if j.next_run_time else None}
            for j in scheduler.get_jobs()]
