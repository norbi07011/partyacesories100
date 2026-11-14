"""Sterowanie komputerem: stan systemu, procesy, programy, zrzuty ekranu, zasilanie, pliki, polecenia.

Bezpieczeństwo:
- akcje ryzykowne (zamykanie procesów, zasilanie, przenoszenie plików, polecenia powłoki) NIE wykonują się od razu:
  trafiają do kolejki „Do zatwierdzenia” (dashboard / przyciski na Telegramie);
- polecenia powłoki są domyślnie wyłączone (Ustawienia → COMPUTER_SHELL=1);
- operacje na plikach tylko w folderach z WATCH_FOLDERS (i podfolderach);
- każda akcja trafia do dziennika (computer_log).
"""
import base64
import io
import json
import logging
import os
import platform
import shutil
import subprocess
import time
from pathlib import Path

import config
import db
from notifier import notify

log = logging.getLogger("computer")
SYSTEM = platform.system()

try:
    import psutil
except ImportError:
    psutil = None

SCHEMA = """
CREATE TABLE IF NOT EXISTS computer_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool TEXT NOT NULL,
    args TEXT NOT NULL,
    summary TEXT NOT NULL,
    status TEXT DEFAULT 'pending',     -- pending | approved | rejected | done | failed
    result TEXT DEFAULT '',
    source TEXT DEFAULT '',
    created TEXT NOT NULL,
    decided TEXT
);
CREATE TABLE IF NOT EXISTS computer_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool TEXT NOT NULL,
    args TEXT,
    result TEXT,
    created TEXT NOT NULL
);
"""
_approval_senders = []   # telegram_bot rejestruje tu funkcję wysyłającą przyciski


def init() -> None:
    with db._lock:
        db._conn.executescript(SCHEMA)
        db._conn.commit()


def register_approval_sender(fn) -> None:
    _approval_senders.append(fn)


def _log(tool: str, args: dict, result) -> None:
    db.insert("computer_log", {"tool": tool, "args": json.dumps(args, ensure_ascii=False)[:2000],
                               "result": json.dumps(result, ensure_ascii=False, default=str)[:2000], "created": db.now_str()})


# ------------------------------------------------------------------ odczyt
def status() -> dict:
    if psutil is None:
        return {"error": "Brak biblioteki psutil (pip install psutil)"}
    vm = psutil.virtual_memory()
    disks = []
    for p in psutil.disk_partitions(all=False):
        if p.fstype in ("", "squashfs", "tmpfs", "overlay") or "loop" in p.device:
            continue
        try:
            u = psutil.disk_usage(p.mountpoint)
        except (PermissionError, OSError):
            continue
        disks.append({"mount": p.mountpoint, "device": p.device, "fs": p.fstype, "total_gb": round(u.total / 1e9, 1),
                      "free_gb": round(u.free / 1e9, 1), "used_pct": u.percent,
                      "removable": "removable" in (p.opts or "") or (SYSTEM == "Darwin" and p.mountpoint.startswith("/Volumes/"))})
    bat = psutil.sensors_battery() if hasattr(psutil, "sensors_battery") else None
    temps = {}
    try:
        for k, v in (psutil.sensors_temperatures() or {}).items():
            if v:
                temps[k] = round(max(t.current for t in v), 1)
    except (AttributeError, OSError):
        pass
    return {
        "host": platform.node(), "system": f"{SYSTEM} {platform.release()}",
        "cpu_pct": psutil.cpu_percent(interval=0.3), "cpu_cores": psutil.cpu_count(),
        "ram_total_gb": round(vm.total / 1e9, 1), "ram_used_pct": vm.percent,
        "uptime_h": round((time.time() - psutil.boot_time()) / 3600, 1),
        "battery": {"pct": bat.percent, "plugged": bat.power_plugged} if bat else None,
        "temperatures": temps, "disks": disks,
    }


def processes(sort: str = "cpu", limit: int = 15) -> list[dict]:
    if psutil is None:
        return []
    procs = []
    for p in psutil.process_iter(["pid", "name", "memory_info", "username"]):
        try:
            procs.append({"pid": p.pid, "name": p.info["name"], "cpu": p.cpu_percent(None),
                          "ram_mb": round((p.info["memory_info"].rss if p.info["memory_info"] else 0) / 1e6)})
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    time.sleep(0.4)
    for item in procs:
        try:
            item["cpu"] = psutil.Process(item["pid"]).cpu_percent(None)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            item["cpu"] = 0
    key = "ram_mb" if sort == "ram" else "cpu"
    return sorted(procs, key=lambda x: x[key], reverse=True)[:max(1, min(limit, 60))]


def screenshot(max_side: int = 1600) -> dict:
    try:
        import mss
        from PIL import Image
    except ImportError:
        return {"error": "Brak bibliotek mss/Pillow"}
    try:
        with mss.mss() as s:
            mon = s.monitors[1] if len(s.monitors) > 1 else s.monitors[0]
            shot = s.grab(mon)
            img = Image.frombytes("RGB", shot.size, shot.rgb)
    except Exception as e:  # noqa: BLE001 - np. brak ekranu (serwer bez monitora)
        return {"error": f"Nie mogę zrobić zrzutu ekranu: {e}"}
    img.thumbnail((max_side, max_side))
    folder = config.DATA_DIR / "screens"
    folder.mkdir(exist_ok=True)
    path = folder / f"screen-{db.now():%Y%m%d-%H%M%S}.jpg"
    img.save(path, "JPEG", quality=80)
    for old in sorted(folder.glob("screen-*.jpg"))[:-20]:
        old.unlink(missing_ok=True)
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=75)
    return {"path": str(path), "width": img.width, "height": img.height, "jpeg_b64": base64.b64encode(buf.getvalue()).decode()}


def _allowed_path(p: str) -> bool:
    try:
        rp = Path(p).expanduser().resolve()
    except OSError:
        return False
    for root in config.WATCH_FOLDERS:
        try:
            rp.relative_to(Path(root).expanduser().resolve())
            return True
        except ValueError:
            continue
    return False


def list_dir(path: str) -> dict:
    if not _allowed_path(path):
        return {"error": "Ten folder jest poza dozwolonymi (WATCH_FOLDERS)."}
    items = []
    for e in sorted(Path(path).iterdir(), key=lambda x: (not x.is_dir(), x.name.lower()))[:300]:
        try:
            st = e.stat()
        except OSError:
            continue
        items.append({"name": e.name, "dir": e.is_dir(), "size": st.st_size, "mtime": time.strftime("%Y-%m-%d %H:%M", time.localtime(st.st_mtime))})
    return {"path": path, "items": items}


# ------------------------------------------------------------------ akcje (wykonanie)
def _open(target: str) -> None:
    if SYSTEM == "Windows":
        os.startfile(target)  # type: ignore[attr-defined]
    elif SYSTEM == "Darwin":
        subprocess.Popen(["open", "-a", target] if not ("/" in target or target.startswith("http")) else ["open", target])
    else:
        subprocess.Popen(["xdg-open", target] if ("/" in target or target.startswith("http")) else [target],
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


POWER_CMDS = {
    "Windows": {"lock": ["rundll32.exe", "user32.dll,LockWorkStation"],
                "sleep": ["rundll32.exe", "powrprof.dll,SetSuspendState", "0,1,0"],
                "restart": ["shutdown", "/r", "/t", "60"], "shutdown": ["shutdown", "/s", "/t", "60"],
                "cancel": ["shutdown", "/a"]},
    "Darwin": {"lock": ["pmset", "displaysleepnow"], "sleep": ["pmset", "sleepnow"],
               "restart": ["osascript", "-e", 'tell app "System Events" to restart'],
               "shutdown": ["osascript", "-e", 'tell app "System Events" to shut down'], "cancel": ["true"]},
    "Linux": {"lock": ["loginctl", "lock-session"], "sleep": ["systemctl", "suspend"],
              "restart": ["systemctl", "reboot"], "shutdown": ["systemctl", "poweroff"], "cancel": ["shutdown", "-c"]},
}


def _do(tool: str, a: dict):
    """Faktyczne wykonanie akcji (po zatwierdzeniu, jeśli wymagane)."""
    if tool == "kill_process":
        killed = []
        for p in psutil.process_iter(["pid", "name"]):
            if (a.get("pid") and p.pid == int(a["pid"])) or (a.get("name") and (p.info["name"] or "").lower() == a["name"].lower()):
                try:
                    p.terminate()
                    killed.append({"pid": p.pid, "name": p.info["name"]})
                except (psutil.NoSuchProcess, psutil.AccessDenied) as e:
                    killed.append({"pid": p.pid, "error": str(e)})
        return {"zamkniete": killed} if killed else {"error": "Nie znaleziono procesu"}
    if tool == "power":
        cmd = POWER_CMDS.get(SYSTEM, POWER_CMDS["Linux"]).get(a["action"])
        if not cmd:
            return {"error": "Nieznana akcja"}
        subprocess.Popen(cmd)
        extra = " (za 60 s — możesz anulować akcją 'cancel')" if a["action"] in ("restart", "shutdown") and SYSTEM == "Windows" else ""
        return {"ok": True, "info": f"Wykonano: {a['action']}{extra}"}
    if tool == "file_operation":
        op, src, dst = a["operation"], a.get("source", ""), a.get("destination", "")
        if not _allowed_path(src) or (dst and not _allowed_path(dst)):
            return {"error": "Ścieżki muszą być w dozwolonych folderach (WATCH_FOLDERS)."}
        if op == "copy":
            (shutil.copytree if Path(src).is_dir() else shutil.copy2)(src, dst)
        elif op == "move":
            shutil.move(src, dst)
        elif op == "mkdir":
            Path(src).mkdir(parents=True, exist_ok=True)
        elif op == "trash":
            trash = Path(config.WATCH_FOLDERS[0]).expanduser() / "_Kosz_Agenta"
            trash.mkdir(exist_ok=True)
            shutil.move(src, trash / Path(src).name)
        else:
            return {"error": "Nieznana operacja"}
        return {"ok": True, "operacja": op, "z": src, "do": dst}
    if tool == "run_command":
        if not config.COMPUTER_SHELL:
            return {"error": "Polecenia powłoki są wyłączone (Komputer → ustawienia)."}
        out = subprocess.run(a["command"], shell=True, capture_output=True, text=True, timeout=120,
                             cwd=a.get("cwd") or None)
        return {"code": out.returncode, "stdout": out.stdout[-6000:], "stderr": out.stderr[-3000:]}
    return {"error": f"Nieznana akcja {tool}"}


RISKY = {"kill_process", "power", "file_operation", "run_command"}


def _summary(tool: str, a: dict) -> str:
    return {
        "kill_process": f"Zamknij proces {a.get('name') or a.get('pid')}",
        "power": {"lock": "Zablokuj ekran", "sleep": "Uśpij komputer", "restart": "Uruchom ponownie komputer",
                  "shutdown": "Wyłącz komputer", "cancel": "Anuluj wyłączanie"}.get(a.get("action"), "Zasilanie"),
        "file_operation": f"{a.get('operation')}: {a.get('source')} → {a.get('destination', '')}",
        "run_command": f"Polecenie: {a.get('command')}",
    }.get(tool, tool)


async def request_action(tool: str, a: dict, source: str = "agent") -> dict:
    """Akcje ryzykowne → kolejka zatwierdzeń (dashboard + przyciski na Telegramie)."""
    if tool == "power" and a.get("action") in ("lock", "cancel"):
        res = _do(tool, a)       # blokada ekranu i anulowanie wyłączenia są bezpieczne
        _log(tool, a, res)
        return res
    summary = _summary(tool, a)
    aid = db.insert("computer_actions", {"tool": tool, "args": json.dumps(a, ensure_ascii=False), "summary": summary,
                                         "status": "pending", "source": source, "created": db.now_str()})
    sent = False
    for send in _approval_senders:
        try:
            await send(aid, summary)
            sent = True
        except Exception as e:  # noqa: BLE001
            log.warning("Prośba o zatwierdzenie nie wysłana: %s", e)
    if not sent:
        await notify(f"🛡 Do zatwierdzenia: {summary}", "Otwórz dashboard → Komputer, aby zatwierdzić albo odrzucić.",
                     level="alert", push=False)
    return {"status": "czeka_na_zatwierdzenie", "id": aid, "akcja": summary,
            "info": "Akcja czeka na zatwierdzenie przez użytkownika (dashboard → Komputer albo przyciski na Telegramie)."}


async def decide(action_id: int, approve: bool) -> dict:
    row = db.one("SELECT * FROM computer_actions WHERE id = ?", (action_id,))
    if not row or row["status"] != "pending":
        return {"error": "Akcja nie czeka na decyzję"}
    if not approve:
        db.update("computer_actions", action_id, {"status": "rejected", "decided": db.now_str()})
        return {"ok": True, "status": "rejected"}
    db.update("computer_actions", action_id, {"status": "approved", "decided": db.now_str()})
    args = json.loads(row["args"])
    try:
        res = _do(row["tool"], args)
        st = "failed" if isinstance(res, dict) and res.get("error") else "done"
    except Exception as e:  # noqa: BLE001
        res, st = {"error": str(e)}, "failed"
    db.update("computer_actions", action_id, {"status": st, "result": json.dumps(res, ensure_ascii=False)[:4000]})
    _log(row["tool"], args, res)
    await notify(("✅ " if st == "done" else "⚠️ ") + row["summary"], json.dumps(res, ensure_ascii=False)[:500],
                 level="info", push=False)
    return {"ok": st == "done", "status": st, "result": res}


# ------------------------------------------------------------------ narzędzia agenta
_S = {"type": "string"}
TOOLS = [
    {"name": "computer_status", "description": "Stan komputera użytkownika: CPU, RAM, dyski (wolne miejsce), bateria, "
     "temperatury, czas pracy.", "input_schema": {"type": "object", "properties": {}}},
    {"name": "computer_processes", "description": "Lista najbardziej obciążających procesów (sort: cpu albo ram).",
     "input_schema": {"type": "object", "properties": {"sort": {"type": "string", "enum": ["cpu", "ram"]}, "limit": {"type": "integer"}}}},
    {"name": "computer_open", "description": "Otwiera program (np. 'chrome', 'notepad', 'DaVinci Resolve'), stronę WWW "
     "albo plik/folder na komputerze użytkownika.", "input_schema": {"type": "object", "properties": {"target": _S}, "required": ["target"]}},
    {"name": "computer_screenshot", "description": "Robi zrzut ekranu komputera i pokazuje go (do sprawdzenia, co jest na ekranie).",
     "input_schema": {"type": "object", "properties": {}}},
    {"name": "computer_list_dir", "description": "Zawartość folderu (tylko foldery dozwolone w ustawieniach).",
     "input_schema": {"type": "object", "properties": {"path": _S}, "required": ["path"]}},
    {"name": "computer_kill_process", "description": "Zamyka proces (wymaga zatwierdzenia przez użytkownika).",
     "input_schema": {"type": "object", "properties": {"pid": {"type": "integer"}, "name": _S}}},
    {"name": "computer_power", "description": "Zasilanie: lock (blokada ekranu, od razu), sleep, restart, shutdown (te trzy "
     "wymagają zatwierdzenia), cancel (anuluj wyłączanie).",
     "input_schema": {"type": "object", "properties": {"action": {"type": "string", "enum": ["lock", "sleep", "restart", "shutdown", "cancel"]}},
                      "required": ["action"]}},
    {"name": "computer_file_operation", "description": "Operacja na plikach w dozwolonych folderach: copy, move, mkdir, "
     "trash (przeniesienie do _Kosz_Agenta). Wymaga zatwierdzenia (poza mkdir).",
     "input_schema": {"type": "object", "properties": {"operation": {"type": "string", "enum": ["copy", "move", "mkdir", "trash"]},
                      "source": _S, "destination": _S}, "required": ["operation", "source"]}},
    {"name": "computer_run_command", "description": "Uruchamia polecenie powłoki (tylko gdy użytkownik włączył tę opcję; "
     "zawsze wymaga zatwierdzenia).", "input_schema": {"type": "object", "properties": {"command": _S, "cwd": _S}, "required": ["command"]}},
]
NAMES = {t["name"] for t in TOOLS}
LABELS = {"computer_status": "Sprawdzam komputer", "computer_processes": "Sprawdzam procesy", "computer_open": "Otwieram",
          "computer_screenshot": "Robię zrzut ekranu", "computer_list_dir": "Przeglądam folder",
          "computer_kill_process": "Proszę o zgodę: zamknięcie procesu", "computer_power": "Zasilanie",
          "computer_file_operation": "Proszę o zgodę: pliki", "computer_run_command": "Proszę o zgodę: polecenie"}
CHANGES = {n: "computer" for n in ("computer_kill_process", "computer_power", "computer_file_operation", "computer_run_command")}


async def execute(name: str, a: dict):
    import asyncio
    match name:
        case "computer_status":
            return await asyncio.to_thread(status)
        case "computer_processes":
            return await asyncio.to_thread(processes, a.get("sort", "cpu"), a.get("limit", 15))
        case "computer_open":
            await asyncio.to_thread(_open, a["target"])
            _log(name, a, "ok")
            return {"ok": True, "otwarto": a["target"]}
        case "computer_screenshot":
            shot = await asyncio.to_thread(screenshot)
            if shot.get("error"):
                return shot
            _log(name, {}, shot["path"])
            return [{"type": "text", "text": f"Zrzut ekranu ({shot['width']}×{shot['height']}), zapisany: {shot['path']}"},
                    {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": shot["jpeg_b64"]}}]
        case "computer_list_dir":
            return await asyncio.to_thread(list_dir, a["path"])
        case "computer_kill_process":
            return await request_action("kill_process", a)
        case "computer_power":
            return await request_action("power", a)
        case "computer_file_operation":
            if a.get("operation") == "mkdir":
                res = _do("file_operation", a)
                _log(name, a, res)
                return res
            return await request_action("file_operation", a)
        case "computer_run_command":
            return await request_action("run_command", a)
    return {"error": f"Nieznane narzędzie {name}"}
