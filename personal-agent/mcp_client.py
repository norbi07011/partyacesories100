"""Serwery MCP (Model Context Protocol) – podłączanie gotowych umiejętności z ekosystemu MCP.

Konfiguracja w pliku mcp_servers.json (edytowalna w dashboardzie, zakładka Umiejętności):
{
  "servers": {
    "pliki": {"command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "D:/Zdjecia"], "enabled": true},
    "zdalny": {"url": "https://example.com/mcp", "headers": {"Authorization": "Bearer ..."}, "enabled": false}
  }
}
Narzędzia każdego serwera trafiają do agenta jako mcp_<serwer>_<narzędzie>.
"""
import asyncio

import anyio
import json
import logging
import os
import re
from contextlib import AsyncExitStack

import config

log = logging.getLogger("mcp")

try:
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client
    try:
        from mcp.client.streamable_http import create_mcp_http_client, streamable_http_client
    except ImportError:  # starsze wersje SDK
        create_mcp_http_client = streamable_http_client = None
    AVAILABLE = True
except ImportError:
    AVAILABLE = False

NAME_RE = re.compile(r"[^a-zA-Z0-9_-]")


def _attr(obj, *names):
    """Zgodność SDK MCP 1.x (camelCase) i 2.x (snake_case)."""
    for n in names:
        v = getattr(obj, n, None)
        if v is not None:
            return v
    return None


def _tool_name(server: str, tool: str) -> str:
    return NAME_RE.sub("_", f"mcp_{server}_{tool}")[:64]


def load_config() -> dict:
    if not config.MCP_CONFIG.exists():
        return {"servers": {}}
    try:
        data = json.loads(config.MCP_CONFIG.read_text(encoding="utf-8"))
        return data if isinstance(data.get("servers"), dict) else {"servers": {}}
    except (ValueError, OSError) as e:
        log.warning("Błędny mcp_servers.json: %s", e)
        return {"servers": {}, "error": str(e)}


def save_config(text: str) -> None:
    data = json.loads(text)  # walidacja – rzuca ValueError przy błędzie
    if not isinstance(data.get("servers"), dict):
        raise ValueError('Plik musi mieć postać {"servers": {...}}')
    config.MCP_CONFIG.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


class Manager:
    def __init__(self) -> None:
        self.servers: dict[str, dict] = {}
        self.tool_map: dict[str, tuple[str, str]] = {}
        self._stops: dict[str, asyncio.Event] = {}
        self._tasks: dict[str, asyncio.Task] = {}

    # ---------------------------------------------------------------- start / stop
    async def start(self) -> None:
        if not AVAILABLE:
            return
        for name, cfg in load_config()["servers"].items():
            if cfg.get("enabled", True):
                self._launch(name, cfg)
            else:
                self.servers[name] = {"status": "wyłączony", "tools": [], "error": None}

    def _launch(self, name: str, cfg: dict) -> None:
        self.servers[name] = {"status": "łączenie", "tools": [], "error": None, "session": None}
        self._stops[name] = asyncio.Event()
        self._tasks[name] = asyncio.create_task(self._run(name, cfg))

    async def _run(self, name: str, cfg: dict) -> None:
        state = self.servers[name]
        try:
            async with AsyncExitStack() as stack:
                if cfg.get("url"):
                    if streamable_http_client is None:
                        raise RuntimeError("Ta wersja biblioteki mcp nie obsługuje serwerów HTTP")
                    http = create_mcp_http_client(headers=cfg.get("headers") or None)
                    await stack.enter_async_context(http)
                    streams = await stack.enter_async_context(streamable_http_client(cfg["url"], http_client=http))
                    read, write = streams[0], streams[1]
                else:
                    params = StdioServerParameters(command=cfg["command"], args=cfg.get("args", []),
                                                   env={**os.environ, **(cfg.get("env") or {})}, cwd=cfg.get("cwd"))
                    read, write = await stack.enter_async_context(stdio_client(params))
                session = await stack.enter_async_context(ClientSession(read, write))
                with anyio.fail_after(60):  # (asyncio.wait_for psuje zakresy anyio w SDK MCP)
                    await session.initialize()
                listed = await session.list_tools()
                tools = []
                for t in listed.tools:
                    full = _tool_name(name, t.name)
                    self.tool_map[full] = (name, t.name)
                    tools.append({"name": full, "tool": t.name, "description": (t.description or "")[:1000],
                                  "input_schema": _attr(t, "input_schema", "inputSchema") or {"type": "object", "properties": {}}})
                state.update(status="działa", tools=tools, session=session)
                log.info("MCP %s: %d narzędzi", name, len(tools))
                await self._stops[name].wait()
        except Exception as e:  # noqa: BLE001
            while isinstance(e, BaseExceptionGroup) and e.exceptions:
                e = e.exceptions[0]
            log.warning("MCP %s nie działa: %s", name, e)
            state.update(status="błąd", error=f"{type(e).__name__}: {e}"[:400])
        finally:
            state["session"] = None
            if state["status"] == "działa":
                state["status"] = "zatrzymany"
            for full in [k for k, v in self.tool_map.items() if v[0] == name]:
                self.tool_map.pop(full, None)

    async def stop(self) -> None:
        for ev in self._stops.values():
            ev.set()
        for t in self._tasks.values():
            try:
                await asyncio.wait_for(t, timeout=5)
            except (asyncio.TimeoutError, Exception):  # noqa: BLE001
                t.cancel()
        self._stops.clear()
        self._tasks.clear()
        self.servers.clear()
        self.tool_map.clear()

    async def reload(self) -> None:
        await self.stop()
        await self.start()

    # ---------------------------------------------------------------- narzędzia
    def owns(self, name: str) -> bool:
        return name in self.tool_map

    def tool_defs(self) -> list[dict]:
        out = []
        for name, s in self.servers.items():
            if s.get("status") != "działa":
                continue
            for t in s["tools"]:
                out.append({"name": t["name"], "description": f"[MCP: {name}] {t['description']}",
                            "input_schema": t["input_schema"]})
        return out

    async def call(self, full: str, args: dict):
        server, tool = self.tool_map[full]
        session = self.servers.get(server, {}).get("session")
        if session is None:
            return json.dumps({"error": f"Serwer MCP {server} nie działa"}, ensure_ascii=False)
        from datetime import timedelta
        try:
            result = await session.call_tool(tool, args, read_timeout_seconds=timedelta(seconds=120))
        except TypeError:
            result = await session.call_tool(tool, args)
        blocks: list[dict] = []
        for c in getattr(result, "content", None) or []:
            ctype = getattr(c, "type", "")
            if ctype == "text":
                blocks.append({"type": "text", "text": c.text[:50000]})
            elif ctype == "image" and _attr(c, "mime_type", "mimeType") in ("image/jpeg", "image/png", "image/gif", "image/webp"):
                blocks.append({"type": "image", "source": {"type": "base64", "media_type": _attr(c, "mime_type", "mimeType"),
                                                             "data": c.data}})
            else:
                blocks.append({"type": "text", "text": json.dumps(c.model_dump(mode="json"), ensure_ascii=False)[:20000]})
        if _attr(result, "is_error", "isError"):
            blocks.insert(0, {"type": "text", "text": "Błąd narzędzia MCP:"})
        return blocks or "OK (brak treści)"

    def status(self) -> list[dict]:
        return [{"name": n, "status": s.get("status"), "error": s.get("error"),
                 "tools": [{"name": t["tool"], "description": t["description"][:200]} for t in s.get("tools", [])]}
                for n, s in self.servers.items()]


manager = Manager()
