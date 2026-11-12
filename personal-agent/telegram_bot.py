"""Bot Telegram: rozmowa z agentem z telefonu + kanał powiadomień."""
import logging

from telegram import Update
from telegram.constants import ChatAction
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

import agent
import db
import file_indexer
import notifier
from config import TELEGRAM_ALLOWED_CHAT_IDS, TELEGRAM_BOT_TOKEN

log = logging.getLogger("telegram")
_app: Application | None = None

HELP = (
    "Cześć! Jestem Twoim agentem. Po prostu pisz do mnie normalnie, np.:\n"
    "• jutro 10:00 sesja z Kasią w Łazienkach\n"
    "• pomysł: teledysk nagrany w jednym ujęciu w pustym basenie\n"
    "• gdzie są zdjęcia ze ślubu Nowaków?\n"
    "• znajdź w sieci najlepsze lampy LED do 2000 zł\n\n"
    "Skróty:\n"
    "/dzis – plan na dziś\n/zadania – otwarte zadania\n/pomysl <tekst> – szybki zapis pomysłu\n"
    "/szukaj <fraza> – szukaj plików\n/nowy – wyczyść kontekst rozmowy"
)


def _allowed(update: Update) -> bool:
    return update.effective_chat is not None and update.effective_chat.id in TELEGRAM_ALLOWED_CHAT_IDS


async def _guard(update: Update) -> bool:
    if _allowed(update):
        return True
    chat_id = update.effective_chat.id if update.effective_chat else "?"
    await update.effective_message.reply_text(
        f"🔒 Ten bot jest prywatny.\nTwoje chat_id: {chat_id}\n"
        f"Wpisz je w .env jako TELEGRAM_ALLOWED_CHAT_IDS i uruchom agenta ponownie."
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


async def _broadcast(text: str) -> None:
    if not _app:
        return
    for chat_id in TELEGRAM_ALLOWED_CHAT_IDS:
        for i in range(0, len(text), 4000):
            await _app.bot.send_message(chat_id, text[i:i + 4000], disable_web_page_preview=True)


async def start() -> bool:
    global _app
    if not TELEGRAM_BOT_TOKEN:
        log.info("Telegram wyłączony (brak TELEGRAM_BOT_TOKEN)")
        return False
    _app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    _app.add_handler(CommandHandler(["start", "help", "pomoc"], cmd_start))
    _app.add_handler(CommandHandler("dzis", cmd_today))
    _app.add_handler(CommandHandler("zadania", cmd_tasks))
    _app.add_handler(CommandHandler("pomysl", cmd_idea))
    _app.add_handler(CommandHandler("szukaj", cmd_search))
    _app.add_handler(CommandHandler("nowy", cmd_new))
    _app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_message))
    await _app.initialize()
    await _app.start()
    await _app.updater.start_polling(drop_pending_updates=True)
    if TELEGRAM_ALLOWED_CHAT_IDS:
        notifier.register_sender(_broadcast)
    log.info("Telegram bot działa")
    return True


async def stop() -> None:
    if _app:
        await _app.updater.stop()
        await _app.stop()
        await _app.shutdown()
