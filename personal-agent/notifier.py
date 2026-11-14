"""Powiadomienia: zapis w bazie (dashboard) + wysyłka na Telegram."""
import logging
from typing import Awaitable, Callable

import db

log = logging.getLogger("notifier")
_senders: list[Callable[[str], Awaitable[None]]] = []


def register_sender(fn: Callable[[str], Awaitable[None]]) -> None:
    _senders.append(fn)


def has_telegram() -> bool:
    return bool(_senders)


async def notify(title: str, body: str = "", level: str = "info", push: bool = True) -> int:
    nid = db.insert("notifications", {
        "title": title, "body": body, "level": level, "read": 0, "created": db.now_str(),
    })
    if push:
        text = f"{title}\n\n{body}".strip()
        for send in _senders:
            try:
                await send(text)
            except Exception as e:  # noqa: BLE001 - powiadomienie nie może wywrócić agenta
                log.warning("Nie udało się wysłać powiadomienia: %s", e)
    return nid
