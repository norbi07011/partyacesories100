"""Umiejętności (skills): pliki Markdown z instrukcjami w folderze skills/.

Każdy plik zaczyna się nagłówkiem:
---
name: Shot-lista
description: Kiedy użyć i co daje (jedno zdanie)
---
Treść: instrukcje dla agenta krok po kroku.

Agent widzi listę włączonych umiejętności (nazwa + opis) i wczytuje pełną treść narzędziem load_skill,
gdy zadanie do niej pasuje. Własne umiejętności dodajesz w dashboardzie (zakładka Umiejętności) albo
wrzucając plik .md do folderu skills/.
"""
import json
import re
from pathlib import Path

import config
import db

SLUG = re.compile(r"[^a-z0-9-]+")


def _slug(name: str) -> str:
    table = str.maketrans("ąćęłńóśźż", "acelnoszz")
    return SLUG.sub("-", name.lower().translate(table)).strip("-")[:60] or "umiejetnosc"


def _parse(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    meta, body = {}, text
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n?(.*)$", text, flags=re.S)
    if m:
        for line in m.group(1).splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                meta[k.strip().lower()] = v.strip()
        body = m.group(2)
    return {"id": path.stem, "name": meta.get("name") or path.stem, "description": meta.get("description", ""),
            "body": body.strip(), "builtin": meta.get("builtin", "") == "true"}


def _disabled() -> set[str]:
    try:
        return set(json.loads(db.kv_get("skills_disabled") or "[]"))
    except ValueError:
        return set()


def all_skills() -> list[dict]:
    off = _disabled()
    out = []
    for p in sorted(config.SKILLS_DIR.glob("*.md")):
        try:
            s = _parse(p)
        except OSError:
            continue
        s["enabled"] = s["id"] not in off
        out.append(s)
    return out


def enabled() -> list[dict]:
    return [s for s in all_skills() if s["enabled"]]


def get(skill_id_or_name: str) -> dict | None:
    key = skill_id_or_name.strip().lower()
    for s in all_skills():
        if s["id"] == key or s["name"].lower() == key or _slug(s["name"]) == _slug(key):
            return s
    return None


def save(name: str, description: str, body: str, skill_id: str | None = None) -> str:
    sid = skill_id or _slug(name)
    path = config.SKILLS_DIR / f"{sid}.md"
    if not path.resolve().parent == config.SKILLS_DIR.resolve():
        raise ValueError("Nieprawidłowa nazwa")
    builtin = "true" if (path.exists() and _parse(path)["builtin"]) else "false"
    desc = description.replace("\n", " ").strip()
    path.write_text(f"---\nname: {name.strip()}\ndescription: {desc}\nbuiltin: {builtin}\n---\n{body.strip()}\n",
                    encoding="utf-8")
    return sid


def delete(skill_id: str) -> bool:
    path = config.SKILLS_DIR / f"{_slug(skill_id)}.md"
    if path.exists():
        path.unlink()
        return True
    return False


def set_enabled(skill_id: str, on: bool) -> None:
    off = _disabled()
    (off.discard if on else off.add)(skill_id)
    db.kv_set("skills_disabled", json.dumps(sorted(off)))


def catalog_text() -> str:
    items = enabled()
    if not items:
        return ""
    lines = "\n".join(f"- {s['name']} (id: {s['id']}): {s['description']}" for s in items)
    return ("Umiejętności (instrukcje eksperckie). Gdy zadanie pasuje do którejś, NAJPIERW wczytaj ją narzędziem "
            f"load_skill i postępuj według niej:\n{lines}")
