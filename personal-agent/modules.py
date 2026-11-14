"""Rejestr modułów z narzędziami agenta. Każdy moduł ma: TOOLS, NAMES, LABELS, CHANGES, async execute(name, args).
Moduł, którego brakuje albo ma błąd, jest pomijany (reszta działa)."""
import importlib
import logging

log = logging.getLogger("modules")
MODULE_NAMES = ["extra_tools", "computer", "advisor", "knowledge_base", "media", "stratfanat", "websites", "trading.tools"]
_loaded = None


def loaded() -> list:
    global _loaded
    if _loaded is None:
        _loaded = []
        for name in MODULE_NAMES:
            try:
                m = importlib.import_module(name)
                if hasattr(m, "TOOLS") and hasattr(m, "execute"):
                    _loaded.append(m)
            except Exception as e:  # noqa: BLE001
                log.warning("Moduł %s niedostępny: %s", name, e)
    return _loaded


def tools() -> list[dict]:
    return [t for m in loaded() for t in m.TOOLS]


def labels() -> dict:
    out = {}
    for m in loaded():
        out.update(getattr(m, "LABELS", {}))
    return out


def changes() -> dict:
    out = {}
    for m in loaded():
        out.update(getattr(m, "CHANGES", {}))
    return out


def owner(name: str):
    for m in loaded():
        names = getattr(m, "NAMES", None) or {t["name"] for t in m.TOOLS}
        if name in names:
            return m
    return None
