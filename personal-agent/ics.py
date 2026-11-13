"""Import i eksport kalendarza w formacie .ics (Google Calendar, Apple, Outlook)."""
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

import config
import db


def _esc(s: str) -> str:
    return (s or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def _unesc(s: str) -> str:
    return s.replace("\\n", "\n").replace("\\N", "\n").replace("\\,", ",").replace("\\;", ";").replace("\\\\", "\\")


def _fold(line: str) -> str:
    out, b = [], line.encode()
    while len(b) > 74:
        cut = 74
        while cut > 0 and (b[cut] & 0xC0) == 0x80:  # nie tnij w środku znaku UTF-8
            cut -= 1
        out.append(b[:cut].decode())
        b = b" " + b[cut:]
    out.append(b.decode())
    return "\r\n".join(out)


def _dt(local: str) -> str:
    return datetime.fromisoformat(local[:16]).strftime("%Y%m%dT%H%M00")


def export() -> str:
    tz = config.TIMEZONE
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Studio Agent//PL", "CALSCALE:GREGORIAN",
             f"X-WR-CALNAME:Studio Agent", f"X-WR-TIMEZONE:{tz}"]
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    for e in db.query("SELECT * FROM events ORDER BY start"):
        lines += ["BEGIN:VEVENT", f"UID:studio-agent-{e['id']}@local", f"DTSTAMP:{stamp}",
                  f"DTSTART;TZID={tz}:{_dt(e['start'])}"]
        if e.get("end"):
            lines.append(f"DTEND;TZID={tz}:{_dt(e['end'])}")
        lines.append(f"SUMMARY:{_esc(e['title'])}")
        if e.get("location"):
            lines.append(f"LOCATION:{_esc(e['location'])}")
        desc = "\n".join(x for x in [f"Klient: {e['client']}" if e.get("client") else "", e.get("notes") or ""] if x)
        if desc:
            lines.append(f"DESCRIPTION:{_esc(desc)}")
        lines += [f"CATEGORIES:{_esc(e.get('kind') or 'inne')}", "END:VEVENT"]
    lines.append("END:VCALENDAR")
    return "\r\n".join(_fold(l) for l in lines) + "\r\n"


def _parse_dt(value: str, params: dict) -> str | None:
    value = value.strip()
    try:
        if len(value) == 8:  # cały dzień
            return datetime.strptime(value, "%Y%m%d").strftime("%Y-%m-%dT00:00")
        if value.endswith("Z"):
            dt = datetime.strptime(value, "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc)
            return dt.astimezone(config.TZ).strftime("%Y-%m-%dT%H:%M")
        dt = datetime.strptime(value[:15], "%Y%m%dT%H%M%S")
        if "TZID" in params:
            try:
                dt = dt.replace(tzinfo=ZoneInfo(params["TZID"])).astimezone(config.TZ).replace(tzinfo=None)
            except Exception:  # noqa: BLE001 - nieznana strefa: zostaw czas lokalny
                pass
        return dt.strftime("%Y-%m-%dT%H:%M")
    except ValueError:
        return None


def import_ics(text: str) -> dict:
    # rozwinięcie zawiniętych linii
    raw = text.replace("\r\n", "\n").replace("\n ", "").replace("\n\t", "")
    added = skipped = 0
    ev: dict | None = None
    for line in raw.split("\n"):
        if line == "BEGIN:VEVENT":
            ev = {}
            continue
        if line == "END:VEVENT" and ev is not None:
            if ev.get("title") and ev.get("start"):
                dup = db.one("SELECT id FROM events WHERE title = ? AND start = ?", (ev["title"], ev["start"]))
                if dup:
                    skipped += 1
                else:
                    db.insert("events", {**ev, "kind": ev.get("kind", "inne"), "created": db.now_str()})
                    added += 1
            ev = None
            continue
        if ev is None or ":" not in line:
            continue
        head, value = line.split(":", 1)
        name, *pp = head.split(";")
        params = dict(p.split("=", 1) for p in pp if "=" in p)
        name = name.upper()
        if name == "SUMMARY":
            ev["title"] = _unesc(value)[:200]
        elif name == "DTSTART":
            ev["start"] = _parse_dt(value, params)
        elif name == "DTEND":
            ev["end"] = _parse_dt(value, params)
        elif name == "LOCATION":
            ev["location"] = _unesc(value)[:200]
        elif name == "DESCRIPTION":
            ev["notes"] = _unesc(value)[:2000]
    return {"added": added, "skipped": skipped}
