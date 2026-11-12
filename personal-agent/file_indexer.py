"""Indeksuje pliki z folderów WATCH_FOLDERS, żeby agent wiedział, co gdzie leży."""
import logging
import os
import platform
import subprocess
from datetime import datetime
from pathlib import Path

import db
from config import WATCH_FOLDERS

log = logging.getLogger("files")

KINDS = {
    "zdjecie": {"jpg", "jpeg", "png", "heic", "heif", "tif", "tiff", "webp", "bmp", "gif"},
    "raw": {"cr2", "cr3", "nef", "nrw", "arw", "srf", "sr2", "dng", "raf", "orf", "rw2", "pef", "srw", "x3f", "3fr", "iiq"},
    "wideo": {"mp4", "mov", "mxf", "braw", "r3d", "avi", "mkv", "mts", "m2ts", "insv", "lrv", "webm", "m4v", "prores"},
    "audio": {"wav", "mp3", "aac", "flac", "m4a", "aif", "aiff", "ogg"},
    "projekt": {"prproj", "drp", "drt", "aep", "fcpxml", "lrcat", "lrtemplate", "xmp", "psd", "psb", "cube", "blend", "veg"},
    "dokument": {"pdf", "doc", "docx", "txt", "md", "xls", "xlsx", "csv", "ppt", "pptx", "odt", "rtf", "pages", "key"},
}
EXT_TO_KIND = {ext: kind for kind, exts in KINDS.items() for ext in exts}
SKIP_DIRS = {"node_modules", "$recycle.bin", "system volume information", "__pycache__", ".git", "cache", "proxy", "cachedata"}


def kind_of(ext: str) -> str:
    return EXT_TO_KIND.get(ext.lower(), "inne")


def reindex(folders: list[str] | None = None) -> dict:
    """Pełne przeindeksowanie. Uruchamiaj w wątku (to operacja blokująca)."""
    folders = folders or WATCH_FOLDERS
    total = 0
    started = datetime.now()
    for root in folders:
        root_path = Path(root).expanduser()
        if not root_path.exists():
            log.warning("Folder nie istnieje: %s", root_path)
            continue
        db.execute("DELETE FROM files WHERE root = ?", (str(root_path),))
        batch: list[tuple] = []
        for dirpath, dirnames, filenames in os.walk(root_path):
            dirnames[:] = [d for d in dirnames if not d.startswith(".") and d.lower() not in SKIP_DIRS]
            for fn in filenames:
                if fn.startswith("."):
                    continue
                full = os.path.join(dirpath, fn)
                try:
                    st = os.stat(full)
                except OSError:
                    continue
                ext = Path(fn).suffix.lstrip(".").lower()
                batch.append((
                    full, fn, ext, kind_of(ext), st.st_size,
                    datetime.fromtimestamp(st.st_mtime).strftime("%Y-%m-%dT%H:%M:%S"),
                    dirpath, str(root_path),
                ))
                if len(batch) >= 2000:
                    _flush(batch)
                    total += len(batch)
                    batch = []
        if batch:
            _flush(batch)
            total += len(batch)
    db.kv_set("files_last_index", db.now_str())
    secs = (datetime.now() - started).total_seconds()
    log.info("Zaindeksowano %d plików w %.1fs", total, secs)
    return {"indexed": total, "seconds": round(secs, 1), "folders": folders}


def _flush(batch: list[tuple]) -> None:
    db.executemany(
        "INSERT OR REPLACE INTO files(path, name, ext, kind, size, mtime, folder, root) VALUES (?,?,?,?,?,?,?,?)",
        batch,
    )


def search(query: str = "", kind: str = "", ext: str = "", modified_after: str = "",
           modified_before: str = "", folders_only: bool = False, limit: int = 50) -> list[dict]:
    """Wyszukiwanie po nazwie pliku i ścieżce. Każde słowo zapytania musi wystąpić."""
    where, params = [], []
    for word in query.split():
        where.append("(name LIKE ? OR folder LIKE ?)")
        params += [f"%{word}%", f"%{word}%"]
    if kind:
        where.append("kind = ?")
        params.append(kind)
    if ext:
        where.append("ext = ?")
        params.append(ext.lower().lstrip("."))
    if modified_after:
        where.append("mtime >= ?")
        params.append(modified_after)
    if modified_before:
        where.append("mtime <= ?")
        params.append(modified_before)
    clause = ("WHERE " + " AND ".join(where)) if where else ""
    limit = max(1, min(int(limit), 500))
    if folders_only:
        return db.query(
            f"SELECT folder, COUNT(*) AS files, SUM(size) AS size, MAX(mtime) AS last_modified, "
            f"GROUP_CONCAT(DISTINCT kind) AS kinds FROM files {clause} GROUP BY folder "
            f"ORDER BY last_modified DESC LIMIT ?", [*params, limit])
    return db.query(
        f"SELECT path, name, kind, size, mtime, folder FROM files {clause} ORDER BY mtime DESC LIMIT ?",
        [*params, limit])


def stats() -> dict:
    by_kind = db.query("SELECT kind, COUNT(*) AS count, SUM(size) AS size FROM files GROUP BY kind ORDER BY size DESC")
    total = db.one("SELECT COUNT(*) AS count, COALESCE(SUM(size),0) AS size FROM files") or {"count": 0, "size": 0}
    recent = db.query("SELECT folder, MAX(mtime) AS last_modified, COUNT(*) AS files FROM files "
                      "GROUP BY folder ORDER BY last_modified DESC LIMIT 8")
    return {
        "total": total, "by_kind": by_kind, "recent_folders": recent,
        "watch_folders": WATCH_FOLDERS, "last_index": db.kv_get("files_last_index"),
    }


def open_in_os(path: str) -> bool:
    """Otwiera plik/folder w systemie - tylko jeśli jest w indeksie (bezpieczeństwo)."""
    known = db.one("SELECT path FROM files WHERE path = ? OR folder = ? LIMIT 1", (path, path))
    if not known or not os.path.exists(path):
        return False
    system = platform.system()
    if system == "Windows":
        os.startfile(path)  # type: ignore[attr-defined]
    elif system == "Darwin":
        subprocess.Popen(["open", path])
    else:
        subprocess.Popen(["xdg-open", path])
    return True
