"""Lokalny, darmowy model AI przez Ollamę (https://ollama.com) – działa na Twoim komputerze, bez opłat.

Polecane modele (Ollama → ollama pull <nazwa>):
- qwen3:8b       – domyślny: dobry polski, obsługuje narzędzia (ok. 5 GB, 16 GB RAM albo GPU 8 GB)
- qwen3:4b       – słabszy komputer (ok. 2.6 GB)
- qwen3:14b      – mocniejszy komputer (ok. 9 GB, GPU 12 GB+)
- qwen2.5vl:7b   – do oceniania zdjęć (vision)
"""
import json
import logging
import re

import httpx

import config

log = logging.getLogger("local_llm")
THINK_RE = re.compile(r"<think>.*?</think>\s*", re.S)
RECOMMENDED = [
    {"name": "qwen3:8b", "label": "Qwen3 8B – zalecany (ok. 5 GB)"},
    {"name": "qwen3:4b", "label": "Qwen3 4B – słabszy komputer (ok. 2.6 GB)"},
    {"name": "qwen3:14b", "label": "Qwen3 14B – mocny komputer (ok. 9 GB)"},
    {"name": "qwen2.5vl:7b", "label": "Qwen2.5-VL 7B – oceny zdjęć (ok. 6 GB)"},
    {"name": "llama3.1:8b", "label": "Llama 3.1 8B – alternatywa (ok. 4.9 GB)"},
]
PULL = {"model": None, "status": None, "completed": 0, "total": 0, "error": None, "running": False}


def to_ollama_tools(tools: list[dict]) -> list[dict]:
    """Narzędzia w formacie Claude → format funkcji Ollamy (bez narzędzi serwerowych Anthropic)."""
    out = []
    for t in tools:
        if "input_schema" not in t:
            continue
        out.append({"type": "function", "function": {
            "name": t["name"], "description": t.get("description", "")[:1024], "parameters": t["input_schema"]}})
    return out


async def status() -> dict:
    try:
        async with httpx.AsyncClient(timeout=4) as c:
            ver = (await c.get(f"{config.OLLAMA_URL}/api/version")).json().get("version")
            tags = (await c.get(f"{config.OLLAMA_URL}/api/tags")).json().get("models", [])
        names = [m["name"] for m in tags]
        return {"running": True, "version": ver, "models": [{"name": m["name"], "size": m.get("size")} for m in tags],
                "model_ready": any(n == config.OLLAMA_MODEL or n.split(":")[0] == config.OLLAMA_MODEL for n in names),
                "vision_ready": config.OLLAMA_VISION_MODEL in names, "recommended": RECOMMENDED, "pull": PULL}
    except Exception as e:  # noqa: BLE001
        return {"running": False, "error": type(e).__name__, "models": [], "model_ready": False, "vision_ready": False,
                "recommended": RECOMMENDED, "pull": PULL}


async def pull(model: str) -> None:
    """Pobiera model do Ollamy (w tle, postęp w PULL)."""
    PULL.update(model=model, status="start", completed=0, total=0, error=None, running=True)
    try:
        async with httpx.AsyncClient(timeout=None) as c:
            async with c.stream("POST", f"{config.OLLAMA_URL}/api/pull", json={"model": model, "stream": True}) as r:
                async for line in r.aiter_lines():
                    if not line.strip():
                        continue
                    ev = json.loads(line)
                    if ev.get("error"):
                        raise RuntimeError(ev["error"])
                    PULL.update(status=ev.get("status"), completed=ev.get("completed", PULL["completed"]),
                                total=ev.get("total", PULL["total"]))
    except Exception as e:  # noqa: BLE001
        PULL["error"] = str(e)[:300]
    finally:
        PULL["running"] = False


async def complete(prompt: str, max_tokens: int = 2000) -> str:
    async with httpx.AsyncClient(timeout=300) as c:
        r = await c.post(f"{config.OLLAMA_URL}/api/chat", json={
            "model": config.OLLAMA_MODEL, "stream": False, "think": False,
            "messages": [{"role": "user", "content": prompt}],
            "options": {"num_ctx": config.OLLAMA_CTX, "num_predict": max_tokens}})
        r.raise_for_status()
        return THINK_RE.sub("", r.json().get("message", {}).get("content", "")).strip()


def _tool_content(result) -> tuple[str, list[str]]:
    """Wynik narzędzia → tekst + obrazy (base64) dla Ollamy."""
    if isinstance(result, str):
        return result, []
    texts, images = [], []
    for b in result:
        if b.get("type") == "text":
            texts.append(b["text"])
        elif b.get("type") == "image":
            images.append(b["source"]["data"])
    return "\n".join(texts), images


async def run_loop(system: str, history: list[dict], user_text: str, images: list[dict] | None,
                   tools: list[dict], execute, emit, max_steps: int = 12) -> tuple[list[str], set[str], str | None]:
    """Pętla agenta na modelu lokalnym. Zwraca (fragmenty odpowiedzi, zmienione widoki, błąd)."""
    from agent import TOOL_CHANGES, TOOL_LABELS  # unikamy importu cyklicznego
    msgs = [{"role": "system", "content": system}]
    for m in history:
        msgs.append({"role": m["role"], "content": m["content"] if isinstance(m["content"], str) else str(m["content"])})
    user_msg = {"role": "user", "content": user_text}
    model = config.OLLAMA_MODEL
    o_tools = to_ollama_tools(tools)
    if images:
        user_msg["images"] = [im["data"] for im in images]
        model = config.OLLAMA_VISION_MODEL  # model ze wzrokiem; większość nie obsługuje narzędzi
        o_tools = []
    msgs.append(user_msg)
    parts: list[str] = []
    changed: set[str] = set()
    async with httpx.AsyncClient(timeout=httpx.Timeout(600, connect=5)) as client:
        for _ in range(max_steps):
            body = {"model": model, "messages": msgs, "stream": True, "think": False,
                    "options": {"num_ctx": config.OLLAMA_CTX}, "keep_alive": "30m"}
            if o_tools:
                body["tools"] = o_tools
            content, calls = "", []
            try:
                async with client.stream("POST", f"{config.OLLAMA_URL}/api/chat", json=body) as r:
                    if r.status_code == 404:
                        return parts, changed, (f"Model {model} nie jest pobrany. W Ustawieniach kliknij „Pobierz model” "
                                                f"albo uruchom: ollama pull {model}")
                    if r.status_code >= 400:
                        err = (await r.aread()).decode(errors="replace")[:300]
                        if "does not support tools" in err and o_tools:
                            o_tools = []  # model bez narzędzi – rozmawiaj bez nich
                            continue
                        return parts, changed, f"Błąd Ollamy ({r.status_code}): {err}"
                    in_think = False
                    async for line in r.aiter_lines():
                        if not line.strip():
                            continue
                        ev = json.loads(line)
                        msg = ev.get("message") or {}
                        piece = msg.get("content") or ""
                        if piece:
                            # niektóre modele i tak wypisują <think>…</think> – nie pokazuj tego
                            if "<think>" in piece:
                                in_think = True
                            if not in_think:
                                content += piece
                                await emit({"type": "text", "text": piece})
                            if "</think>" in piece:
                                in_think = False
                                tail = piece.split("</think>", 1)[1]
                                if tail.strip():
                                    content += tail
                                    await emit({"type": "text", "text": tail})
                        for tc in msg.get("tool_calls") or []:
                            calls.append(tc)
                        if ev.get("done"):
                            break
            except httpx.ConnectError:
                return parts, changed, ("Ollama nie działa. Zainstaluj ją ze strony ollama.com (albo uruchom start.bat), "
                                        "a potem pobierz model w Ustawieniach.")
            content = THINK_RE.sub("", content).strip()
            if content:
                parts.append(content)
            if not calls:
                break
            msgs.append({"role": "assistant", "content": content, "tool_calls": calls})
            step_changed = set()
            for tc in calls:
                fn = tc.get("function", {})
                name = fn.get("name", "")
                args = fn.get("arguments") or {}
                if isinstance(args, str):
                    try:
                        args = json.loads(args)
                    except ValueError:
                        args = {}
                await emit({"type": "tool", "name": name, "label": TOOL_LABELS.get(name, name)})
                result = await execute(name, args)
                text, imgs = _tool_content(result)
                tool_msg = {"role": "tool", "content": text[:30000], "tool_name": name}
                if imgs:
                    tool_msg["images"] = imgs[:4]
                msgs.append(tool_msg)
                if name in TOOL_CHANGES:
                    step_changed.add(TOOL_CHANGES[name])
            if step_changed:
                changed |= step_changed
                await emit({"type": "changed", "what": sorted(step_changed)})
            await emit({"type": "text", "text": "\n\n"})
        else:
            parts.append("_Zadanie wymagało zbyt wielu kroków — doprecyzuj proszę polecenie._")
    return parts, changed, None
