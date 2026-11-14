"""Foto/wideo: import z karty pamięci, kopie zapasowe, archiwizacja, napisy do filmów (lokalnie, Whisper).

Import: wykrywa karty (folder DCIM na dysku wymiennym), kopiuje do
  <MEDIA_LIBRARY>/<rok>/<rrrr-mm-dd>_<projekt>/{RAW,JPG,WIDEO,AUDIO,INNE}
weryfikuje rozmiar każdego pliku, opcjonalnie robi drugą kopię na MEDIA_BACKUP. Karty NIE formatuje i nic z niej nie kasuje.
"""
import asyncio
import logging
import os
import shutil
import subprocess
import time
from datetime import datetime
from pathlib import Path

import config
import db
import file_indexer
from notifier import notify

log = logging.getLogger("media")
IMPORT = {"running": False, "copied": 0, "total": 0, "bytes": 0, "errors": [], "dest": None, "started": None, "finished": None}
SUBFOLDER = {"raw": "RAW", "zdjecie": "JPG", "wideo": "WIDEO", "audio": "AUDIO"}


def detect_cards() -> list[dict]:
    """Dyski wymienne / karty z folderem DCIM (albo PRIVATE/M4ROOT – Sony wideo, CLIP – Canon/Blackmagic)."""
    out = []
    try:
        import psutil
        parts = psutil.disk_partitions(all=False)
    except Exception:  # noqa: BLE001
        parts = []
    for p in parts:
        root = Path(p.mountpoint)
        markers = [m for m in ("DCIM", "PRIVATE/M4ROOT", "CLIP", "PRIVATE/AVCHD") if (root / m).exists()]
        if not markers:
            continue
        try:
            u = shutil.disk_usage(root)
        except OSError:
            continue
        count, size = 0, 0
        for m in markers:
            for dp, _, fns in os.walk(root / m):
                for fn in fns:
                    try:
                        size += os.path.getsize(os.path.join(dp, fn))
                        count += 1
                    except OSError:
                        pass
        out.append({"mount": str(root), "device": p.device, "markers": markers, "files": count,
                    "size_gb": round(size / 1e9, 2), "free_gb": round(u.free / 1e9, 1)})
    return out


def _library() -> Path | None:
    lib = os.getenv("MEDIA_LIBRARY") or db.kv_get("media_library") or (config.WATCH_FOLDERS[0] if config.WATCH_FOLDERS else "")
    return Path(lib).expanduser() if lib else None


def _import_sync(source: str, project: str, backup: str | None, date_from_files: bool) -> dict:
    lib = _library()
    if not lib:
        raise RuntimeError("Ustaw folder biblioteki (Media → Folder biblioteki) albo WATCH_FOLDERS.")
    src = Path(source)
    files = [Path(dp) / fn for dp, _, fns in os.walk(src) for fn in fns if not fn.startswith(".")]
    IMPORT.update(running=True, copied=0, total=len(files), bytes=0, errors=[], started=db.now_str(), finished=None)
    safe_project = "".join(c if c.isalnum() or c in " -_" else "_" for c in project).strip().replace(" ", "_") or "import"
    dests = set()
    for f in files:
        try:
            st = f.stat()
            day = datetime.fromtimestamp(st.st_mtime) if date_from_files else datetime.now()
            folder = lib / f"{day:%Y}" / f"{day:%Y-%m-%d}_{safe_project}" / SUBFOLDER.get(
                file_indexer.kind_of(f.suffix.lstrip(".")), "INNE")
            folder.mkdir(parents=True, exist_ok=True)
            target = folder / f.name
            if target.exists() and target.stat().st_size == st.st_size:
                IMPORT["copied"] += 1
                continue
            if target.exists():
                target = folder / f"{f.stem}_{int(st.st_mtime)}{f.suffix}"
            shutil.copy2(f, target)
            if target.stat().st_size != st.st_size:
                raise OSError("rozmiar kopii się nie zgadza")
            dests.add(str(folder.parent))
            if backup:
                bfolder = Path(backup) / folder.relative_to(lib)
                bfolder.mkdir(parents=True, exist_ok=True)
                shutil.copy2(target, bfolder / target.name)
            IMPORT["copied"] += 1
            IMPORT["bytes"] += st.st_size
        except Exception as e:  # noqa: BLE001
            IMPORT["errors"].append(f"{f.name}: {e}")
    IMPORT.update(running=False, finished=db.now_str(), dest=sorted(dests))
    return {"skopiowano": IMPORT["copied"], "z": IMPORT["total"], "GB": round(IMPORT["bytes"] / 1e9, 2),
            "foldery": sorted(dests), "bledy": IMPORT["errors"][:20], "kopia_zapasowa": backup or None}


async def import_card(source: str, project: str, backup: str | None = None, date_from_files: bool = True) -> dict:
    if IMPORT["running"]:
        return {"error": "Import już trwa"}
    res = await asyncio.to_thread(_import_sync, source, project, backup, date_from_files)
    await notify(f"📥 Import z karty: {res['skopiowano']}/{res['z']} plików",
                 f"{res['GB']} GB → {', '.join(res['foldery'][:3])}" + (f"\nBłędy: {len(res['bledy'])}" if res["bledy"] else ""),
                 level="info")
    if config.WATCH_FOLDERS:
        asyncio.create_task(asyncio.to_thread(file_indexer.reindex))
    return res


def archive_candidates(months: int = 6, min_gb: float = 2) -> list[dict]:
    """Duże foldery projektów nieużywane od X miesięcy – kandydaci do przeniesienia na dysk archiwum."""
    cutoff = time.time() - months * 30 * 86400
    rows = db.query("SELECT folder, SUM(size) s, MAX(mtime) m, COUNT(*) n FROM files GROUP BY folder")
    by_parent: dict[str, dict] = {}
    for r in rows:
        parent = str(Path(r["folder"]).parent) if Path(r["folder"]).name in SUBFOLDER.values() else r["folder"]
        d = by_parent.setdefault(parent, {"folder": parent, "size": 0, "mtime": "", "files": 0})
        d["size"] += r["s"] or 0
        d["files"] += r["n"]
        d["mtime"] = max(d["mtime"], r["m"] or "")
    out = []
    for d in by_parent.values():
        try:
            ts = datetime.fromisoformat(d["mtime"]).timestamp()
        except ValueError:
            continue
        if ts < cutoff and d["size"] >= min_gb * 1e9:
            out.append({**d, "size_gb": round(d["size"] / 1e9, 1)})
    return sorted(out, key=lambda x: x["size"], reverse=True)[:30]


def _srt_time(t: float) -> str:
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int((s % 1) * 1000):03d}"


def subtitles_sync(path: str, language: str = "pl") -> dict:
    import voice
    if not file_indexer.is_indexed(path):
        return {"error": "Plik spoza zaindeksowanych folderów"}
    if voice.WhisperModel is None:
        return {"error": "Brak faster-whisper (pip install -r requirements-voice.txt)"}
    model = voice._get_model()
    wav = Path(path).with_suffix(".tmp_audio.wav")
    if shutil.which("ffmpeg"):
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", path, "-vn", "-ac", "1", "-ar", "16000", str(wav)],
                       check=True, timeout=1800)
        src = str(wav)
    else:
        src = path
    try:
        segments, info = model.transcribe(src, language=language or None, vad_filter=True)
        lines, text = [], []
        for i, s in enumerate(segments, 1):
            lines.append(f"{i}\n{_srt_time(s.start)} --> {_srt_time(s.end)}\n{s.text.strip()}\n")
            text.append(s.text.strip())
    finally:
        wav.unlink(missing_ok=True)
    srt = Path(path).with_suffix(".srt")
    srt.write_text("\n".join(lines), encoding="utf-8")
    return {"srt": str(srt), "segmentow": len(lines), "tekst": " ".join(text)[:4000]}


# ------------------------------------------------------------------ narzędzia agenta
_S = {"type": "string"}
TOOLS = [
    {"name": "media_cards", "description": "Wykrywa podłączone karty pamięci / dyski z aparatu (DCIM, M4ROOT, CLIP): liczba "
     "plików, rozmiar.", "input_schema": {"type": "object", "properties": {}}},
    {"name": "media_import", "description": "Importuje zdjęcia/wideo z karty do biblioteki: <rok>/<data>_<projekt>/RAW|JPG|WIDEO, "
     "weryfikuje kopie, opcjonalnie druga kopia na dysk zapasowy. Nic nie kasuje z karty.",
     "input_schema": {"type": "object", "properties": {"source": {"type": "string", "description": "ścieżka karty z media_cards"},
                      "project": _S, "backup": {"type": "string", "description": "folder kopii zapasowej (opcjonalnie)"}},
                      "required": ["source", "project"]}},
    {"name": "media_archive_candidates", "description": "Duże, dawno nieużywane foldery projektów do zarchiwizowania na dysk zewnętrzny.",
     "input_schema": {"type": "object", "properties": {"months": {"type": "integer"}, "min_gb": {"type": "number"}}}},
    {"name": "media_subtitles", "description": "Tworzy napisy .srt do filmu (lokalnie, Whisper) i zwraca transkrypcję.",
     "input_schema": {"type": "object", "properties": {"path": _S, "language": _S}, "required": ["path"]}},
]
NAMES = {t["name"] for t in TOOLS}
LABELS = {"media_cards": "Szukam kart pamięci", "media_import": "Importuję z karty", "media_archive_candidates": "Szukam folderów do archiwum",
          "media_subtitles": "Tworzę napisy"}
CHANGES = {"media_import": "files", "media_subtitles": "files"}


async def execute(name: str, a: dict):
    match name:
        case "media_cards":
            return await asyncio.to_thread(detect_cards)
        case "media_import":
            return await import_card(a["source"], a["project"], a.get("backup"))
        case "media_archive_candidates":
            return await asyncio.to_thread(archive_candidates, a.get("months", 6), a.get("min_gb", 2))
        case "media_subtitles":
            return await asyncio.to_thread(subtitles_sync, a["path"], a.get("language", "pl"))
    return {"error": f"Nieznane narzędzie {name}"}
