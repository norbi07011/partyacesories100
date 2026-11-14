"""Bot Telegram: rozmowa z agentem z telefonu + kanał powiadomień."""
import asyncio
import base64
import logging

from telegram import Update
from telegram.constants import ChatAction
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

import agent
import db
import file_indexer
import notifier
import voice
import config

log = logging.getLogger("telegram")
_app: Application | None = None
_sender_registered = False
STATE = {"running": False, "error": None, "username": None}

HELP = (
    "Cześć! Jestem Twoim agentem. Po prostu pisz do mnie normalnie, np.:\n"
    "• jutro 10:00 sesja z Kasią w Łazienkach\n"
    "• pomysł: teledysk nagrany w jednym ujęciu w pustym basenie\n"
    "• gdzie są zdjęcia ze ślubu Nowaków?\n"
    "• znajdź w sieci najlepsze lampy LED do 2000 zł\n"
    "• wyślij zdjęcie z podpisem „co poprawić?” – ocenię kadr\n"
    "• nagraj głosówkę – odpowiem tekstem i głosem\n\n"
    "Skróty:\n"
    "/dzis – plan na dziś\n/zadania – otwarte zadania\n/pomysl <tekst> – szybki zapis pomysłu\n"
    "/szukaj <fraza> – szukaj plików\n/nowy – wyczyść kontekst rozmowy"
)


def _allowed(update: Update) -> bool:
    return update.effective_chat is not None and update.effective_chat.id in config.TELEGRAM_ALLOWED_CHAT_IDS


async def _guard(update: Update) -> bool:
    if _allowed(update):
        return True
    chat = update.effective_chat
    chat_id = chat.id if chat else "?"
    who = (chat.full_name or chat.title or "") if chat else ""
    db.kv_set("tg_pending_chat", f"{chat_id}|{who}")
    await update.effective_message.reply_text(
        f"🔒 Ten bot jest prywatny.\nTwoje chat_id: {chat_id}\n"
        f"Otwórz dashboard → Ustawienia → Telegram i kliknij „Dodaj ten czat”."
    )
    return False


async def _send_long(update: Update, text: str) -> None:
    for i in range(0, len(text), 4000):
        await update.effective_message.reply_text(text[i:i + 4000], disable_web_page_preview=True)


async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if await _guard(update):
        await update.effective_message.reply_text(HELP)


async def cmd_today(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not await _guard(update):
        return
    today = db.now_str()[:10]
    events = db.query("SELECT title, start, location FROM events WHERE substr(start,1,10) = ? ORDER BY start", (today,))
    tasks = db.query("SELECT title, due, priority FROM tasks WHERE status != 'done' AND "
                     "(due IS NULL OR substr(due,1,10) <= ?) ORDER BY due IS NULL, due LIMIT 15", (today,))
    lines = ["📅 Dziś:"]
    lines += [f"  {e['start'][11:16]} {e['title']}" + (f" ({e['location']})" if e['location'] else "") for e in events] or ["  brak wydarzeń"]
    lines.append("\n✅ Zadania:")
    lines += [f"  {'❗' if t['priority'] == 'high' else '•'} {t['title']}" + (f" [{t['due'][:16].replace('T', ' ')}]" if t['due'] else "") for t in tasks] or ["  brak"]
    await update.effective_message.reply_text("\n".join(lines))


async def cmd_tasks(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not await _guard(update):
        return
    tasks = db.query("SELECT id, title, due, status FROM tasks WHERE status != 'done' ORDER BY due IS NULL, due LIMIT 30")
    text = "\n".join(f"#{t['id']} {'🔄' if t['status'] == 'doing' else '▫️'} {t['title']}"
                     + (f" — {t['due'][:16].replace('T', ' ')}" if t['due'] else "") for t in tasks)
    await update.effective_message.reply_text(text or "Brak otwartych zadań 🎉")


async def cmd_idea(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not await _guard(update):
        return
    text = " ".join(ctx.args)
    if not text:
        await update.effective_message.reply_text("Użycie: /pomysl treść pomysłu")
        return
    iid = db.insert("ideas", {"title": text[:80], "content": text, "status": "nowy", "created": db.now_str()})
    await update.effective_message.reply_text(f"💡 Zapisane jako pomysł #{iid}")


async def cmd_search(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not await _guard(update):
        return
    rows = file_indexer.search(" ".join(ctx.args), folders_only=True, limit=10)
    text = "\n".join(f"📁 {r['folder']} ({r['files']} plików)" for r in rows)
    await _send_long(update, text or "Nic nie znalazłem.")


async def cmd_new(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not await _guard(update):
        return
    db.execute("DELETE FROM chat WHERE session = ?", (f"tg:{update.effective_chat.id}",))
    await update.effective_message.reply_text("🧹 Zaczynamy nową rozmowę.")


async def on_message(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not await _guard(update):
        return
    await ctx.bot.send_chat_action(update.effective_chat.id, ChatAction.TYPING)
    reply = await agent.run(update.effective_message.text, session=f"tg:{update.effective_chat.id}")
    await _send_long(update, reply)


async def on_photo(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not await _guard(update):
        return
    msg = update.effective_message
    await ctx.bot.send_chat_action(update.effective_chat.id, ChatAction.TYPING)
    if msg.photo:
        file = await msg.photo[-1].get_file()
        media_type = "image/jpeg"
    elif msg.document and (msg.document.mime_type or "").startswith("image/"):
        if msg.document.file_size and msg.document.file_size > 4_500_000:
            await msg.reply_text("Ten plik jest za duży (max ok. 4,5 MB) – wyślij go jako zwykłe zdjęcie.")
            return
        file = await msg.document.get_file()
        media_type = msg.document.mime_type
    else:
        return
    data = bytes(await file.download_as_bytearray())
    reply = await agent.run(msg.caption or "", session=f"tg:{update.effective_chat.id}",
                            images=[{"media_type": media_type, "data": base64.b64encode(data).decode()}])
    await _send_long(update, reply)


async def on_voice(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """Głosówka → Whisper (lokalnie) → agent → odpowiedź tekstem i głosem."""
    if not await _guard(update):
        return
    msg = update.effective_message
    media = msg.voice or msg.audio
    if not media:
        return
    await ctx.bot.send_chat_action(update.effective_chat.id, ChatAction.TYPING)
    data = bytes(await (await media.get_file()).download_as_bytearray())
    try:
        text = await voice.transcribe(data, ".ogg")
    except Exception as e:  # noqa: BLE001
        await msg.reply_text("🎙 Nie mogę odsłuchać głosówki: rozpoznawanie mowy (Whisper) nie działa.\n"
                             f"Szczegóły: {str(e)[:200]}\nZainstaluj: pip install faster-whisper")
        return
    if not text:
        await msg.reply_text("🎙 Nic nie usłyszałem – spróbuj jeszcze raz.")
        return
    await msg.reply_text(f"🎙 „{text}”")
    reply = await agent.run(text, session=f"tg:{update.effective_chat.id}", voice=True)
    await _send_long(update, reply)
    if config.TELEGRAM_VOICE_REPLY:
        try:
            mp3 = await voice.tts(reply)
            ogg = await asyncio.to_thread(voice.mp3_to_ogg_opus, mp3) if mp3 else None
            if ogg:
                await msg.reply_voice(ogg)
            elif mp3:
                await msg.reply_audio(mp3, title="Odpowiedź agenta")
        except Exception as e:  # noqa: BLE001 - tekst już wysłany
            log.warning("Głos odpowiedzi nieudany: %s", e)


async def _broadcast(text: str) -> None:
    if not _app:
        return
    if not _app or not STATE["running"]:
        return
    for chat_id in config.TELEGRAM_ALLOWED_CHAT_IDS:
        for i in range(0, len(text), 4000):
            await _app.bot.send_message(chat_id, text[i:i + 4000], disable_web_page_preview=True)


async def start() -> bool:
    global _app, _sender_registered
    STATE.update(running=False, error=None, username=None)
    if not config.TELEGRAM_BOT_TOKEN:
        log.info("Telegram wyłączony (brak TELEGRAM_BOT_TOKEN)")
        return False
    try:
        _app = Application.builder().token(config.TELEGRAM_BOT_TOKEN).build()
        _app.add_handler(CommandHandler(["start", "help", "pomoc"], cmd_start))
        _app.add_handler(CommandHandler("dzis", cmd_today))
        _app.add_handler(CommandHandler("zadania", cmd_tasks))
        _app.add_handler(CommandHandler("pomysl", cmd_idea))
        _app.add_handler(CommandHandler("szukaj", cmd_search))
        _app.add_handler(CommandHandler("nowy", cmd_new))
        _app.add_handler(MessageHandler(filters.PHOTO | filters.Document.IMAGE, on_photo))
        _app.add_handler(MessageHandler(filters.VOICE | filters.AUDIO, on_voice))
        _app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_message))
        await _app.initialize()
        await _app.start()
        await _app.updater.start_polling(drop_pending_updates=True)
        STATE["username"] = _app.bot.username
    except Exception as e:  # noqa: BLE001
        STATE["error"] = str(e)
        log.error("Telegram nie wystartował: %s", e)
        _app = None
        return False
    STATE["running"] = True
    if not _sender_registered:
        notifier.register_sender(_broadcast)
        _sender_registered = True
    log.info("Telegram bot @%s działa", STATE["username"])
    return True


async def stop() -> None:
    global _app
    if _app:
        try:
            await _app.updater.stop()
            await _app.stop()
            await _app.shutdown()
        except Exception as e:  # noqa: BLE001
            log.warning("Zatrzymanie Telegrama: %s", e)
    _app = None
    STATE["running"] = False


async def restart() -> bool:
    await stop()
    return await start()
