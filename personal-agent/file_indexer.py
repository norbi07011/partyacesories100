"""Indeks plików z folderów WATCH_FOLDERS: nazwy, typy, daty, EXIF zdjęć, miniatury.

Skan jest przyrostowy - przy kolejnych uruchomieniach czyta tylko nowe i zmienione pliki.
"""
import hashlib
import io
import logging
import os
import platform
import shutil
import subprocess
import threading
from datetime import datetime
from pathlib import Path

import config
import db

log = logging.getLogger("files")
logging.getLogger("exifread").setLevel(logging.ERROR)

try:
    import exifread
except ImportError:  # biblioteka opcjonalna
    exifread = None
try:
    from PIL import Image, ImageOps
except ImportError:
    Image = None

KINDS = {
    "zdjecie": {"jpg", "jpeg", "png", "heic", "heif", "tif", "tiff", "webp", "bmp", "gif"},
    "raw": {"cr2", "cr3", "nef", "nrw", "arw", "srf", "sr2", "dng", "raf", "orf", "rw2", "pef", "srw", "x3f", "3fr", "iiq"},
    "wideo": {"mp4", "mov", "mxf", "braw", "r3d", "avi", "mkv", "mts", "m2ts", "insv", "lrv", "webm", "m4v"},
    "audio": {"wav", "mp3", "aac", "flac", "m4a", "aif", "aiff", "ogg"},
    "projekt": {"prproj", "drp", "drt", "aep", "fcpxml", "lrcat", "lrtemplate", "xmp", "psd", "psb", "cube", "blend", "veg"},
    "dokument": {"pdf", "doc", "docx", "txt", "md", "xls", "xlsx", "csv", "ppt", "pptx", "odt", "rtf", "pages", "key"},
}
EXT_TO_KIND = {ext: kind for kind, exts in KINDS.items() for ext in exts}
SKIP_DIRS = {"node_modules", "$recycle.bin", "system volume information", "__pycache__", ".git", "cachedata",
             "cacheclip", "optimizedmedia", "proxymedia"}
EXIF_EXT = {"jpg", "jpeg", "tif", "tiff", "heic", "heif", "cr2", "nef", "nrw", "arw", "dng", "orf", "rw2", "pef", "srw", "raf"}
THUMB_EXT_PIL = {"jpg", "jpeg", "png", "tif", "tiff", "webp", "bmp", "gif"}
THUMB_EXT_VIDEO = {"mp4", "mov", "m4v", "mkv", "avi", "webm", "mts", "m2ts"}

_lock = threading.Lock()
STATUS = {"running": False, "scanned": 0, "updated": 0, "started": None, "finished": None, "error": None}


def kind_of(ext: str) -> str:
    return EXT_TO_KIND.get(ext.lower(), "inne")


# ---------------------------------------------------------------- EXIF
def _ratio(v) -> float | None:
    while isinstance(v, (tuple, list)) and v:
        v = v[0]
    try:
        if isinstance(v, (int, float)):
            return float(v)
        if hasattr(v, "num") and hasattr(v, "den"):
            return float(v.num) / float(v.den) if v.den else None
        s = str(v)
        if "/" in s:
            a, b = s.split("/", 1)
            return float(a) / float(b) if float(b) else None
        return float(s)
    except (ValueError, ZeroDivisionError):
        return None


def read_exif(path: str) -> dict:
    if exifread is None:
        return {}
    try:
        with open(path, "rb") as f:
            tags = exifread.process_file(f, details=False, extract_thumbnail=False)
    except Exception:  # noqa: BLE001 - uszkodzony plik nie może zatrzymać skanu
        return {}
    get = lambda k: str(tags[k]).strip() if k in tags else ""  # noqa: E731
    make, model = get("Image Make"), get("Image Model")
    camera = model if make and model.lower().startswith(make.split()[0].lower()) else f"{make} {model}".strip()
    out = {"camera": camera or None, "lens": get("EXIF LensModel") or None}
    iso = get("EXIF ISOSpeedRatings") or get("EXIF PhotographicSensitivity")
    out["iso"] = int(iso.split(",")[0].strip("[] ")) if iso.split(",")[0].strip("[] ").isdigit() else None
    fl = _ratio(tags.get("EXIF FocalLength", "").values[0]) if "EXIF FocalLength" in tags else None
    out["focal"] = f"{fl:.0f} mm" if fl else None
    fn = _ratio(tags.get("EXIF FNumber").values[0]) if "EXIF FNumber" in tags else None
    out["aperture"] = f"f/{fn:.1f}".replace(".0", "") if fn else None
    shutter = get("EXIF ExposureTime")
    out["shutter"] = shutter if shutter and not shutter.startswith("[") else None
    taken = get("EXIF DateTimeOriginal") or get("Image DateTime")
    try:
        out["taken"] = datetime.strptime(taken[:19], "%Y:%m:%d %H:%M:%S").strftime("%Y-%m-%dT%H:%M:%S") if taken else None
    except ValueError:
        out["taken"] = None
    return out


# ---------------------------------------------------------------- skan
def reindex(folders: list[str] | None = None, full: bool = False) -> dict:
    """Skanuje foldery. Operacja blokująca - uruchamiaj w wątku."""
    if not _lock.acquire(blocking=False):
        return {"running": True, "info": "Skan już trwa"}
    try:
        return _reindex(folders or config.WATCH_FOLDERS, full)
    except Exception as e:  # noqa: BLE001
        STATUS["error"] = str(e)
        log.exception("Błąd skanu")
        return {"error": str(e)}
    finally:
        STATUS["running"] = False
        STATUS["finished"] = db.now_str()
        _lock.release()


def _reindex(folders: list[str], full: bool) -> dict:
    STATUS.update(running=True, scanned=0, updated=0, started=db.now_str(), finished=None, error=None)
    started = datetime.now()
    use_exif = config.INDEX_EXIF and exifread is not None
    missing = []
    for root in folders:
        root_path = Path(root).expanduser()
        if not root_path.exists():
            missing.append(str(root_path))
            continue
        root_s = str(root_path)
        known = {} if full else {r["path"]: r["mtime"] for r in db.query("SELECT path, mtime FROM files WHERE root = ?", (root_s,))}
        seen: set[str] = set()
        batch: list[tuple] = []
        for dirpath, dirnames, filenames in os.walk(root_path):
            dirnames[:] = [d for d in dirnames if not d.startswith(".") and d.lower() not in SKIP_DIRS]
            for fn in filenames:
                if fn.startswith("."):
                    continue
                full_path = os.path.join(dirpath, fn)
                try:
                    st = os.stat(full_path)
                except OSError:
                    continue
                STATUS["scanned"] += 1
                seen.add(full_path)
                mtime = datetime.fromtimestamp(st.st_mtime).strftime("%Y-%m-%dT%H:%M:%S")
                if known.get(full_path) == mtime:
                    continue
                ext = Path(fn).suffix.lstrip(".").lower()
                ex = read_exif(full_path) if use_exif and ext in EXIF_EXT else {}
                batch.append((full_path, fn, ext, kind_of(ext), st.st_size, mtime, dirpath, root_s,
                              ex.get("camera"), ex.get("lens"), ex.get("iso"), ex.get("focal"),
                              ex.get("aperture"), ex.get("shutter"), ex.get("taken")))
                if len(batch) >= 500:
                    _flush(batch)
                    STATUS["updated"] += len(batch)
                    batch = []
        if batch:
            _flush(batch)
            STATUS["updated"] += len(batch)
        gone = [p for p in known if p not in seen]
        if gone:
            db.executemany("DELETE FROM files WHERE path = ?", [(p,) for p in gone])
    # pliki z folderów, które usunięto z ustawień
    if folders:
        marks = ",".join("?" for _ in folders)
        db.execute(f"DELETE FROM files WHERE root NOT IN ({marks})", [str(Path(f).expanduser()) for f in folders])
    db.kv_set("files_last_index", db.now_str())
    secs = round((datetime.now() - started).total_seconds(), 1)
    log.info("Skan: %d plików, %d nowych/zmienionych, %.1fs", STATUS["scanned"], STATUS["updated"], secs)
    return {"scanned": STATUS["scanned"], "indexed": STATUS["updated"], "seconds": secs,
            "folders": folders, "missing": missing}


def _flush(batch: list[tuple]) -> None:
    db.executemany(
        "INSERT OR REPLACE INTO files(path, name, ext, kind, size, mtime, folder, root, camera, lens, iso, focal, "
        "aperture, shutter, taken) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", batch)


# ---------------------------------------------------------------- wyszukiwanie
FILE_COLS = "path, name, ext, kind, size, mtime, folder, camera, lens, iso, focal, aperture, shutter, taken"


def search(query: str = "", kind: str = "", ext: str = "", modified_after: str = "", modified_before: str = "",
           camera: str = "", lens: str = "", folders_only: bool = False, limit: int = 50) -> list[dict]:
    """Każde słowo zapytania musi wystąpić w nazwie, ścieżce, aparacie lub obiektywie."""
    where, params = [], []
    for word in query.split():
        where.append("(name LIKE ? OR folder LIKE ? OR camera LIKE ? OR lens LIKE ?)")
        params += [f"%{word}%"] * 4
    if kind:
        where.append("kind = ?")
        params.append(kind)
    if ext:
        where.append("ext = ?")
        params.append(ext.lower().lstrip("."))
    if camera:
        where.append("camera LIKE ?")
        params.append(f"%{camera}%")
    if lens:
        where.append("lens LIKE ?")
        params.append(f"%{lens}%")
    if modified_after:
        where.append("COALESCE(taken, mtime) >= ?")
        params.append(modified_after)
    if modified_before:
        where.append("COALESCE(taken, mtime) <= ?")
        params.append(modified_before + ("T23:59:59" if len(modified_before) == 10 else ""))
    clause = ("WHERE " + " AND ".join(where)) if where else ""
    limit = max(1, min(int(limit or 50), 500))
    if folders_only:
        return db.query(
            f"SELECT folder, COUNT(*) AS files, SUM(size) AS size, MAX(mtime) AS last_modified, "
            f"GROUP_CONCAT(DISTINCT kind) AS kinds FROM files {clause} GROUP BY folder "
            f"ORDER BY last_modified DESC LIMIT ?", [*params, limit])
    return db.query(f"SELECT {FILE_COLS} FROM files {clause} ORDER BY COALESCE(taken, mtime) DESC LIMIT ?",
                    [*params, limit])


def stats() -> dict:
    by_kind = db.query("SELECT kind, COUNT(*) AS count, SUM(size) AS size FROM files GROUP BY kind ORDER BY size DESC")
    total = db.one("SELECT COUNT(*) AS count, COALESCE(SUM(size),0) AS size FROM files") or {"count": 0, "size": 0}
    recent = db.query("SELECT folder, MAX(mtime) AS last_modified, COUNT(*) AS files, SUM(size) AS size FROM files "
                      "GROUP BY folder ORDER BY last_modified DESC LIMIT 8")
    cameras = db.query("SELECT camera, COUNT(*) AS count FROM files WHERE camera IS NOT NULL AND camera != '' "
                       "GROUP BY camera ORDER BY count DESC LIMIT 10")
    lenses = db.query("SELECT lens, COUNT(*) AS count FROM files WHERE lens IS NOT NULL AND lens != '' "
                      "GROUP BY lens ORDER BY count DESC LIMIT 10")
    return {
        "total": total, "by_kind": by_kind, "recent_folders": recent, "cameras": cameras, "lenses": lenses,
        "watch_folders": config.WATCH_FOLDERS, "last_index": db.kv_get("files_last_index"), "status": STATUS,
        "exif": exifread is not None and config.INDEX_EXIF,
    }


# ---------------------------------------------------------------- miniatury i otwieranie
def is_indexed(path: str) -> bool:
    return bool(db.one("SELECT 1 FROM files WHERE path = ? LIMIT 1", (path,)))


def thumbnail(path: str, size: int = 480) -> bytes | None:
    """Miniatura JPEG dla zdjęcia, RAW (wbudowany podgląd) lub wideo (ffmpeg). Cache w data/thumbs."""
    if not is_indexed(path) or not os.path.exists(path):
        return None
    st = os.stat(path)
    key = hashlib.sha1(f"{path}|{st.st_mtime}|{size}".encode()).hexdigest()
    cached = config.THUMB_DIR / f"{key}.jpg"
    if cached.exists():
        return cached.read_bytes()
    ext = Path(path).suffix.lstrip(".").lower()
    data: bytes | None = None
    try:
        if Image is not None and ext in THUMB_EXT_PIL:
            data = _pil_thumb(Image.open(path), size)
        elif ext in KINDS["raw"]:
            data = _raw_thumb(path, size)
        elif ext in THUMB_EXT_VIDEO and shutil.which("ffmpeg"):
            out = subprocess.run(
                ["ffmpeg", "-loglevel", "error", "-ss", "1", "-i", path, "-frames:v", "1",
                 "-vf", f"scale={size}:-2", "-f", "image2", "-c:v", "mjpeg", "pipe:1"],
                capture_output=True, timeout=20)
            data = out.stdout or None
    except Exception as e:  # noqa: BLE001
        log.debug("Miniatura nieudana %s: %s", path, e)
        data = None
    if data:
        cached.write_bytes(data)
    return data


def _pil_thumb(img, size: int) -> bytes:
    img = ImageOps.exif_transpose(img)
    img.thumbnail((size, size))
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=82)
    return buf.getvalue()


def _raw_thumb(path: str, size: int) -> bytes | None:
    # 1) obok leży JPG o tej samej nazwie (typowe przy RAW+JPG)
    stem = os.path.splitext(path)[0]
    parent_stem = os.path.join(os.path.dirname(os.path.dirname(path)), os.path.basename(stem))
    for base in (stem, parent_stem):  # obok albo piętro wyżej (folder RAW/ obok JPG-ów)
        for e in ("JPG", "jpg", "jpeg", "JPEG"):
            if os.path.exists(f"{base}.{e}") and Image is not None:
                return _pil_thumb(Image.open(f"{base}.{e}"), size)
    # 2) wbudowany podgląd JPEG w pliku RAW
    if exifread is not None:
        try:
            with open(path, "rb") as f:
                tags = exifread.process_file(f, details=True, extract_thumbnail=True)
        except Exception:  # noqa: BLE001
            return None
        thumb = tags.get("JPEGThumbnail")
        if thumb and Image is not None:
            return _pil_thumb(Image.open(io.BytesIO(thumb)), size)
        return thumb
    return None


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
        subprocess.Popen(["xdg-open", path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return True
