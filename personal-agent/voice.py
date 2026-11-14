"""Głos: synteza mowy (edge-tts, naturalne polskie głosy) i rozpoznawanie mowy (faster-whisper, lokalnie).

Obie biblioteki są opcjonalne - gdy ich brak, dashboard używa głosu i rozpoznawania mowy z przeglądarki.
"""
import asyncio
import io
import logging
import os
import re
import shutil
import subprocess
import tempfile
import threading

import config

log = logging.getLogger("voice")

try:
    import edge_tts
except ImportError:
    edge_tts = None
try:
    from faster_whisper import WhisperModel
except ImportError:
    WhisperModel = None

_model = None
_model_name = None
_model_lock = threading.Lock()
STATE = {"whisper_loading": False, "whisper_error": None}

VOICES = [
    {"id": "pl-PL-ZofiaNeural", "label": "Zofia (kobiecy)"},
    {"id": "pl-PL-MarekNeural", "label": "Marek (męski)"},
]


def clean_for_speech(text: str) -> str:
    """Usuwa markdown, linki i emoji, żeby lektor czytał naturalnie."""
    t = re.sub(r"```.*?```", " ", text, flags=re.S)
    t = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", r"\1", t)
    t = re.sub(r"https?://\S+", "link", t)
    t = re.sub(r"[*_`#>|]", "", t)
    t = re.sub(r"^\s*[-•]\s+", "", t, flags=re.M)
    t = re.sub(r"[\U0001F000-\U0001FAFF☀-➿️]", "", t)
    return re.sub(r"\s+", " ", t).strip()


def status() -> dict:
    return {
        "tts_engine": "edge" if (edge_tts and config.VOICE_TTS == "edge") else "browser",
        "edge_tts_installed": edge_tts is not None,
        "whisper_installed": WhisperModel is not None,
        "whisper_model": config.WHISPER_MODEL,
        "whisper_loaded": _model is not None,
        "whisper_loading": STATE["whisper_loading"],
        "whisper_error": STATE["whisper_error"],
        "stt_engine": config.VOICE_STT if WhisperModel else "browser",
        "voice": config.VOICE_NAME,
        "voices": VOICES,
        "ffmpeg": shutil.which("ffmpeg") is not None,
    }


# ------------------------------------------------------------------ TTS
async def tts(text: str, voice: str | None = None) -> bytes:
    """Zwraca MP3. Rzuca wyjątek, gdy edge-tts niedostępny (wtedy dashboard mówi głosem przeglądarki)."""
    if edge_tts is None:
        raise RuntimeError("edge-tts nie jest zainstalowany")
    text = clean_for_speech(text)[:3000]
    if not text:
        return b""
    proxy = os.getenv("HTTPS_PROXY") or os.getenv("https_proxy")
    com = edge_tts.Communicate(text, voice or config.VOICE_NAME, rate="+4%", proxy=proxy)
    buf = io.BytesIO()
    async for chunk in com.stream():
        if chunk.get("type") == "audio":
            buf.write(chunk["data"])
    return buf.getvalue()


def mp3_to_ogg_opus(mp3: bytes) -> bytes | None:
    """Telegram pokazuje „dymek” głosówki tylko dla OGG/Opus."""
    if not shutil.which("ffmpeg"):
        return None
    out = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-c:a", "libopus", "-b:a", "48k",
                          "-f", "ogg", "pipe:1"], input=mp3, capture_output=True, timeout=60)
    return out.stdout or None


# ------------------------------------------------------------------ STT
def _get_model():
    global _model, _model_name
    with _model_lock:
        if _model is None or _model_name != config.WHISPER_MODEL:
            STATE.update(whisper_loading=True, whisper_error=None)
            try:
                # pierwszy raz pobiera model (small ≈ 460 MB) do cache Hugging Face
                _model = WhisperModel(config.WHISPER_MODEL, device="auto", compute_type="int8")
                _model_name = config.WHISPER_MODEL
            except Exception as e:  # noqa: BLE001
                STATE["whisper_error"] = str(e)[:300]
                raise
            finally:
                STATE["whisper_loading"] = False
        return _model


def transcribe_sync(audio: bytes, suffix: str = ".webm") -> str:
    if WhisperModel is None:
        raise RuntimeError("faster-whisper nie jest zainstalowany (pip install faster-whisper)")
    model = _get_model()
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
        f.write(audio)
        path = f.name
    try:
        segments, _info = model.transcribe(path, language="pl", vad_filter=True, beam_size=1)
        return " ".join(s.text.strip() for s in segments).strip()
    finally:
        os.unlink(path)


async def transcribe(audio: bytes, suffix: str = ".webm") -> str:
    return await asyncio.to_thread(transcribe_sync, audio, suffix)


def preload() -> None:
    """Ładowanie modelu w tle przy starcie, gdy wybrano Whisper."""
    if WhisperModel is not None and config.VOICE_STT == "whisper":
        threading.Thread(target=lambda: _safe_load(), daemon=True).start()


def _safe_load():
    try:
        _get_model()
    except Exception as e:  # noqa: BLE001
        log.warning("Whisper nie załadowany: %s", e)
