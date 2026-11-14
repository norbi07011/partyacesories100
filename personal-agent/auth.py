"""Logowanie do dashboardu przy dostępie spoza komputera (telefon, Tailscale, Cloudflare Tunnel).

- Z samego komputera (localhost, bez proxy) dashboard działa bez logowania.
- Każde żądanie z sieci albo przez tunel/proxy wymaga hasła (+ opcjonalnie kodu 2FA z aplikacji
  Google Authenticator / Aegis / 1Password).
- Sesja: ciasteczko HttpOnly ważne 30 dni; można wylogować wszystkie urządzenia.
"""
import base64
import hashlib
import hmac
import io
import os
import secrets
import struct
import time
from datetime import datetime, timedelta

import db

COOKIE = "sa_session"
SESSION_DAYS = 30
FORWARD_HEADERS = ("x-forwarded-for", "x-real-ip", "forwarded", "cf-connecting-ip", "tailscale-user-login",
                   "tailscale-user-name", "x-forwarded-host")
PUBLIC_PATHS = {"/login", "/api/auth/login", "/api/auth/status", "/manifest.webmanifest", "/sw.js", "/api/health"}
PUBLIC_PREFIXES = ("/static/login", "/static/icons/")
_failed: dict[str, list[float]] = {}

SCHEMA = """
CREATE TABLE IF NOT EXISTS auth_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash TEXT UNIQUE NOT NULL,
    device TEXT DEFAULT '',
    ip TEXT DEFAULT '',
    created TEXT NOT NULL,
    last_seen TEXT,
    expires TEXT NOT NULL
);
"""


def init() -> None:
    with db._lock:
        db._conn.executescript(SCHEMA)
        db._conn.commit()


# ------------------------------------------------------------------ hasło
def _hash_password(pw: str, salt: bytes | None = None, iterations: int = 310_000) -> str:
    salt = salt or os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, iterations)
    return f"pbkdf2_sha256${iterations}${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"


def _check_password(pw: str, stored: str) -> bool:
    try:
        _, it, salt, h = stored.split("$")
        dk = hashlib.pbkdf2_hmac("sha256", pw.encode(), base64.b64decode(salt), int(it))
        return hmac.compare_digest(base64.b64encode(dk).decode(), h)
    except (ValueError, TypeError):
        return False


def password_set() -> bool:
    return bool(db.kv_get("auth_password"))


def set_password(new: str) -> None:
    if len(new) < 8:
        raise ValueError("Hasło musi mieć co najmniej 8 znaków")
    db.kv_set("auth_password", _hash_password(new))
    logout_all()


# ------------------------------------------------------------------ 2FA (TOTP, RFC 6238)
def _totp(secret_b32: str, t: int) -> str:
    key = base64.b32decode(secret_b32 + "=" * (-len(secret_b32) % 8), casefold=True)
    h = hmac.new(key, struct.pack(">Q", t), hashlib.sha1).digest()
    o = h[-1] & 0x0F
    code = (struct.unpack(">I", h[o:o + 4])[0] & 0x7FFFFFFF) % 1_000_000
    return f"{code:06d}"


def totp_verify(secret: str, code: str) -> bool:
    code = (code or "").strip().replace(" ", "")
    if not code.isdigit():
        return False
    now = int(time.time() // 30)
    return any(hmac.compare_digest(_totp(secret, now + d), code) for d in (-1, 0, 1))


def totp_enabled() -> bool:
    return db.kv_get("auth_totp_enabled") == "1" and bool(db.kv_get("auth_totp_secret"))


def totp_setup() -> dict:
    secret = base64.b32encode(os.urandom(20)).decode().rstrip("=")
    db.kv_set("auth_totp_pending", secret)
    uri = f"otpauth://totp/Studio%20Agent?secret={secret}&issuer=Studio%20Agent&digits=6&period=30"
    svg = ""
    try:
        import qrcode
        import qrcode.image.svg
        img = qrcode.make(uri, image_factory=qrcode.image.svg.SvgPathImage, box_size=8)
        buf = io.BytesIO()
        img.save(buf)
        svg = buf.getvalue().decode()
    except Exception:  # noqa: BLE001 - kod QR opcjonalny, sekret wystarczy
        svg = ""
    return {"secret": secret, "uri": uri, "qr_svg": svg}


def totp_enable(code: str) -> bool:
    pending = db.kv_get("auth_totp_pending")
    if not pending or not totp_verify(pending, code):
        return False
    db.kv_set("auth_totp_secret", pending)
    db.kv_set("auth_totp_enabled", "1")
    db.execute("DELETE FROM kv WHERE key = 'auth_totp_pending'")
    return True


def totp_disable() -> None:
    db.kv_set("auth_totp_enabled", "0")


# ------------------------------------------------------------------ sesje
def _th(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def login(password: str, code: str | None, ip: str, device: str) -> str:
    """Zwraca token sesji albo rzuca ValueError z komunikatem po polsku."""
    window = [t for t in _failed.get(ip, []) if time.time() - t < 600]
    _failed[ip] = window
    if len(window) >= 5:
        raise ValueError("Za dużo nieudanych prób — spróbuj za 10 minut")
    stored = db.kv_get("auth_password")
    if not stored:
        raise ValueError("Hasło nie jest ustawione. Ustaw je na komputerze: Ustawienia → Dostęp z telefonu.")
    ok = _check_password(password or "", stored)
    if ok and totp_enabled():
        ok = totp_verify(db.kv_get("auth_totp_secret"), code or "")
        if not ok:
            _failed[ip].append(time.time())
            raise ValueError("Nieprawidłowy kod 2FA")
    if not ok:
        _failed[ip].append(time.time())
        raise ValueError("Nieprawidłowe hasło")
    token = secrets.token_urlsafe(32)
    now = db.now()
    db.insert("auth_sessions", {"token_hash": _th(token), "device": device[:200], "ip": ip, "created": db.now_str(),
                                "last_seen": db.now_str(),
                                "expires": (now + timedelta(days=SESSION_DAYS)).strftime("%Y-%m-%dT%H:%M:%S")})
    return token


def session_valid(token: str | None) -> bool:
    if not token:
        return False
    row = db.one("SELECT id, expires, last_seen FROM auth_sessions WHERE token_hash = ?", (_th(token),))
    if not row or row["expires"] < db.now_str():
        return False
    if not row["last_seen"] or row["last_seen"][:15] != db.now_str()[:15]:  # aktualizuj co ~10 min
        db.update("auth_sessions", row["id"], {"last_seen": db.now_str()})
    return True


def logout(token: str | None) -> None:
    if token:
        db.execute("DELETE FROM auth_sessions WHERE token_hash = ?", (_th(token),))


def logout_all() -> None:
    db.execute("DELETE FROM auth_sessions")


def sessions() -> list[dict]:
    return db.query("SELECT id, device, ip, created, last_seen, expires FROM auth_sessions ORDER BY last_seen DESC")


# ------------------------------------------------------------------ rozpoznanie dostępu zdalnego
def is_remote(request) -> bool:
    host = (request.client.host if request.client else "") or ""
    if host not in ("127.0.0.1", "::1", "localhost"):
        return True
    return any(h in request.headers for h in FORWARD_HEADERS)


def client_ip(request) -> str:
    for h in ("cf-connecting-ip", "x-forwarded-for", "x-real-ip"):
        if request.headers.get(h):
            return request.headers[h].split(",")[0].strip()
    return request.client.host if request.client else "?"


def is_public(path: str) -> bool:
    return path in PUBLIC_PATHS or path.startswith(PUBLIC_PREFIXES)


def status(request) -> dict:
    return {"password_set": password_set(), "totp_enabled": totp_enabled(), "remote": is_remote(request),
            "authenticated": (not is_remote(request)) or session_valid(request.cookies.get(COOKIE)),
            "sessions": len(sessions())}


_ = datetime  # (import zostawiony dla czytelności typów)
