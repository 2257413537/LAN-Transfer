"""LAN Transfer - Desktop Application (pywebview)"""

import sys
import os
import asyncio
import threading
import socket
from pathlib import Path

# ---------------------------------------------------------------------------
# Path resolution
# ---------------------------------------------------------------------------
if getattr(sys, "frozen", False):
    _BUNDLE_DIR = Path(sys._MEIPASS)
    _APP_DIR = Path(os.path.dirname(sys.executable))
else:
    _BUNDLE_DIR = Path(os.path.dirname(os.path.abspath(__file__)))
    _APP_DIR = _BUNDLE_DIR


# ---------------------------------------------------------------------------
# Free-port helper
# ---------------------------------------------------------------------------
def _find_port(preferred: int = 8080) -> int:
    for port in (preferred, 0):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("", port))
                return s.getsockname()[1]
            except OSError:
                continue
    return preferred


# ---------------------------------------------------------------------------
# Configure & import server
# ---------------------------------------------------------------------------
import server  # noqa: E402
from aiohttp import web  # noqa: E402

_port = _find_port()

server.STATIC_DIR = _BUNDLE_DIR / "public"
server.UPLOAD_DIR = _APP_DIR / "uploads"
server.DATA_DIR = _APP_DIR / "data"
server.MESSAGES_FILE = server.DATA_DIR / "messages.json"
server.DEVICES_FILE = server.DATA_DIR / "devices.json"
server.PORT = _port

server.UPLOAD_DIR.mkdir(exist_ok=True)
server.DATA_DIR.mkdir(exist_ok=True)

server.history = server.load_json(server.MESSAGES_FILE, [])
server.device_registry = server.load_json(server.DEVICES_FILE, {})

# ---------------------------------------------------------------------------
# Background aiohttp server
# ---------------------------------------------------------------------------
_runner = None
_loop = None
_ready = threading.Event()


def _serve():
    global _runner, _loop
    _loop = asyncio.new_event_loop()
    asyncio.set_event_loop(_loop)
    app = server.create_app()
    _runner = web.AppRunner(app)
    _loop.run_until_complete(_runner.setup())
    site = web.TCPSite(_runner, "0.0.0.0", _port)
    _loop.run_until_complete(site.start())
    _ready.set()
    _loop.run_forever()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    threading.Thread(target=_serve, daemon=True).start()
    if not _ready.wait(timeout=15):
        print("[desktop] ERROR: server failed to start")
        return

    import webview  # noqa: E402

    icon_path = _BUNDLE_DIR / "public" / "app.ico"
    window = webview.create_window(
        "LAN Transfer",
        url=f"http://localhost:{_port}",
        width=1200,
        height=800,
        min_size=(800, 600),
        text_select=True,
    )

    def _on_closed(*_a):
        if _loop and _loop.is_running():
            _loop.call_soon_threadsafe(_loop.stop)

    window.events.closed += _on_closed
    webview.start(
        debug=not getattr(sys, "frozen", False),
        icon=str(icon_path) if icon_path.exists() else None,
    )


if __name__ == "__main__":
    main()
