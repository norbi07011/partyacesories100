"""Baza wiedzy tradingowej: pliki knowledge/trading/*.md (przeniesione z MESSUAI knowledge/*.ts)."""
from __future__ import annotations

import re
from pathlib import Path

DIR = Path(__file__).resolve().parent.parent / "knowledge" / "trading"
MAX_CHARS = 30_000


def _title(path: Path) -> str:
    try:
        with path.open(encoding="utf-8") as f:
            for line in f:
                if line.startswith("# "):
                    return line[2:].strip()
    except OSError:
        pass
    return path.stem.replace("-", " ").capitalize()


def list_topics() -> list[dict]:
    if not DIR.is_dir():
        return []
    return [{"id": p.stem, "title": _title(p), "size": p.stat().st_size} for p in sorted(DIR.glob("*.md"))]


def get(topic: str, query: str | None = None) -> dict:
    """Treść tematu (przycięta do ~30k znaków). Z query – tylko akapity zawierające frazę."""
    slug = re.sub(r"[^a-z0-9-]", "", (topic or "").lower().replace("_", "-").replace(" ", "-"))
    path = DIR / f"{slug}.md"
    if not slug or not path.is_file():
        topics = list_topics()
        match = next((t for t in topics if slug and (slug in t["id"] or slug in t["title"].lower())), None)
        if not match:
            return {"error": f"Nieznany temat: {topic}", "topics": topics}
        path = DIR / f"{match['id']}.md"
    text = path.read_text(encoding="utf-8")
    if query:
        q = query.lower()
        blocks = re.split(r"\n(?=#{2,3} )", text)
        hits = [b for b in blocks if q in b.lower()]
        text = "\n\n".join(hits) if hits else f"(brak fragmentów z frazą „{query}” – pełny tekst poniżej)\n\n" + text
    truncated = len(text) > MAX_CHARS
    return {"id": path.stem, "title": _title(path), "text": text[:MAX_CHARS] + ("\n\n…(przycięto)" if truncated else ""),
            "truncated": truncated}
