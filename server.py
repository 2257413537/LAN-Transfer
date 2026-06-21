import asyncio
import json
import uuid
import mimetypes
import socket
import io
import qrcode
from pathlib import Path
from datetime import datetime
from aiohttp import web

# 鈹€鈹€鈹€ Configuration 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
HOST = "0.0.0.0"
PORT = 8080

# --- LAN IP detection ---
def _detect_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

LAN_IP = _detect_lan_ip()

UPLOAD_DIR = Path(__file__).parent / "uploads"
STATIC_DIR = Path(__file__).parent / "public"
DATA_DIR = Path(__file__).parent / "data"
MESSAGES_FILE = DATA_DIR / "messages.json"
DEVICES_FILE = DATA_DIR / "devices.json"
MAX_FILE_SIZE = 500 * 1024 * 1024

UPLOAD_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)

# 鈹€鈹€鈹€ Persistence 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
def load_json(path, default):
    try:
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return default

def save_json(path, data):
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[WARN] Failed to save {path}: {e}")

history: list[dict] = load_json(MESSAGES_FILE, [])
device_registry: dict[str, dict] = load_json(DEVICES_FILE, {})
ws_connections: dict[str, web.WebSocketResponse] = {}

def persist_messages():
    save_json(MESSAGES_FILE, history)

def persist_devices():
    save_json(DEVICES_FILE, device_registry)

# 鈹€鈹€鈹€ Device helpers 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
def detect_device_type(ua: str) -> str:
    ua = ua.lower()
    if "ipad" in ua:
        return "ipad"
    if any(k in ua for k in ("iphone", "ipod")):
        return "ios"
    if "android" in ua:
        return "android"
    if any(k in ua for k in ("macintosh", "mac os")):
        return "mac"
    if "windows" in ua:
        return "windows"
    if "linux" in ua:
        return "linux"
    return "unknown"

def auto_device_name(dtype: str) -> str:
    return {
        "windows": "Windows PC", "mac": "Mac", "linux": "Linux PC",
        "ios": "iPhone", "android": "Android", "unknown": "Device",
    }.get(dtype, "Device")

def device_icon(dtype: str) -> str:
    return {
        "windows": "laptop", "mac": "laptop", "linux": "laptop",
        "android": "phone_android", "ios": "phone_iphone", "ipad": "tablet_mac", "unknown": "devices",
    }.get(dtype, "devices")

def unique_name(base: str) -> str:
    existing = [d["name"] for d in device_registry.values()]
    if base not in existing:
        return base
    i = 2
    while f"{base} ({i})" in existing:
        i += 1
    return f"{base} ({i})"

def build_device_list() -> list[dict]:
    return [{**d, "online": t in ws_connections} for t, d in device_registry.items()]

# 鈹€鈹€鈹€ Broadcast 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
async def broadcast(msg: dict, exclude: str | None = None):
    payload = json.dumps(msg)
    stale = []
    for tok, ws in ws_connections.items():
        if tok == exclude:
            continue
        try:
            await ws.send_str(payload)
        except Exception:
            stale.append(tok)
    for tok in stale:
        ws_connections.pop(tok, None)

# 鈹€鈹€鈹€ WebSocket handler 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
async def ws_handler(request: web.Request):
    ws = web.WebSocketResponse(max_msg_size=MAX_FILE_SIZE + 1024 * 1024)
    await ws.prepare(request)
    token: str | None = None
    try:
        async for msg in ws:
            if msg.type == web.WSMsgType.TEXT:
                data = json.loads(msg.data)
                action = data.get("action")
                if action == "register":
                    client_token = data.get("token", "")
                    if client_token and client_token in device_registry:
                        token = client_token
                    else:
                        token = uuid.uuid4().hex[:12]
                        ua = data.get("ua", request.headers.get("User-Agent", ""))
                        dtype = detect_device_type(ua)
                        name = unique_name(auto_device_name(dtype))
                        device_registry[token] = {
                            "id": token, "name": name,
                            "type": dtype, "icon": device_icon(dtype),
                        }
                        persist_devices()
                    old = ws_connections.get(token)
                    if old and old is not ws:
                        try:
                            await old.send_str(json.dumps({"action": "kicked", "reason": "connected elsewhere"}))
                            await old.close()
                        except Exception:
                            pass
                    ws_connections[token] = ws
                    await ws.send_str(json.dumps({
                        "action": "registered", "token": token,
                        "device_id": token,
                        "devices": build_device_list(),
                        "history": history[-1000:],
                    }))
                    await broadcast({
                        "action": "device_update",
                        "device": {**device_registry[token], "online": True},
                    }, exclude=token)
                elif action == "send_message" and token:
                    entry = {
                        "id": uuid.uuid4().hex[:12],
                        "from_id": token,
                        "to_id": data.get("to", "all"),
                        "type": "text",
                        "content": data.get("content", ""),
                        "from_name": device_registry.get(token, {}).get("name", "Device"),
                        "filename": None, "size": None,
                        "timestamp": datetime.now().isoformat(),
                    }
                    history.append(entry)
                    persist_messages()
                    await broadcast({"action": "new_message", "message": entry})
                elif action == "ping":
                    pass
                elif action == "delete_device" and token:
                    did = data.get("device_id", "")
                    if did and did != token and did in device_registry:
                        if did in ws_connections:
                            try:
                                await ws_connections[did].close()
                            except Exception:
                                pass
                            ws_connections.pop(did, None)
                        del device_registry[did]
                        persist_devices()
                        await broadcast({"action": "device_deleted", "device_id": did})

                    await ws.send_str(json.dumps({"action": "pong"}))
                elif action == "delete_messages" and token:
                    ids = data.get("ids", [])
                    if ids:
                        id_set = set(ids)
                        history[:] = [m for m in history if m["id"] not in id_set]
                        persist_messages()
                        await broadcast({"action": "messages_deleted", "ids": list(id_set)})
            elif msg.type == web.WSMsgType.ERROR:
                break
    finally:
        if token:
            if ws_connections.get(token) is ws:
                ws_connections.pop(token, None)
            if token in device_registry:
                await broadcast({
                    "action": "device_update",
                    "device": {**device_registry[token], "online": False},
                })
    return ws

# 鈹€鈹€鈹€ HTTP: file upload 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
async def upload_handler(request: web.Request):
    reader = await request.multipart()
    token = request.query.get("token", "unknown")
    target = request.query.get("to", "all")
    field = await reader.next()
    if field is None:
        return web.json_response({"error": "no file"}, status=400)
    filename = field.filename or "unnamed"
    file_id = uuid.uuid4().hex[:12]
    safe_name = f"{file_id}_{filename}"
    dest = UPLOAD_DIR / safe_name
    size = 0
    with open(dest, "wb") as f:
        while True:
            chunk = await field.read_chunk(65536)
            if not chunk:
                break
            size += len(chunk)
            if size > MAX_FILE_SIZE:
                f.close()
                dest.unlink(missing_ok=True)
                return web.json_response({"error": "file too large"}, status=413)
            f.write(chunk)
    entry = {
        "id": file_id, "from_id": token, "to_id": target,
        "type": "file", "content": safe_name,
        "from_name": device_registry.get(token, {}).get("name", "Device"),
        "filename": filename, "size": size,
        "timestamp": datetime.now().isoformat(),
    }
    history.append(entry)
    persist_messages()
    await broadcast({"action": "new_message", "message": entry})
    return web.json_response({"ok": True, "message": entry})

# 鈹€鈹€鈹€ HTTP: file download 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
async def download_handler(request: web.Request):
    fname = request.match_info["filename"]
    fpath = UPLOAD_DIR / fname
    if not fpath.exists():
        return web.Response(status=404, text="Not found")
    display = fname.split("_", 1)[1] if "_" in fname else fname
    return web.FileResponse(fpath, headers={"Content-Disposition": f'attachment; filename="{display}"'})

# --- HTTP: file inline (for image preview) ---
async def file_inline_handler(request: web.Request):
    fname = request.match_info["filename"]
    fpath = UPLOAD_DIR / fname
    if not fpath.exists():
        return web.Response(status=404, text="Not found")
    return web.FileResponse(fpath)

# 鈹€鈹€鈹€ HTTP: index 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
async def index_handler(request: web.Request):
    resp = web.FileResponse(STATIC_DIR / "index.html")
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    return resp

# --- QR code endpoint ---
async def qrcode_handler(request: web.Request):
    url = request.query.get("url", "")
    if not url:
        return web.Response(status=400, text="missing url param")
    img = qrcode.make(url)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return web.Response(body=buf.read(), content_type="image/png")

# --- LAN info endpoint ---
async def lan_info_handler(request: web.Request):
    return web.json_response({"ip": LAN_IP, "port": PORT, "url": f"http://{LAN_IP}:{PORT}"})

# 鈹€鈹€鈹€ Middleware 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
@web.middleware
async def no_cache_mw(request, handler):
    resp = await handler(request)
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    return resp

# 鈹€鈹€鈹€ App factory 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
def create_app() -> web.Application:
    app = web.Application(client_max_size=MAX_FILE_SIZE, middlewares=[no_cache_mw])
    app.router.add_get("/ws", ws_handler)
    app.router.add_post("/api/upload", upload_handler)
    app.router.add_get("/api/download/{filename}", download_handler)
    app.router.add_get("/api/file/{filename}", file_inline_handler)
    app.router.add_get("/api/qrcode", qrcode_handler)
    app.router.add_get("/api/lan-info", lan_info_handler)
    app.router.add_get("/", index_handler)
    app.router.add_static("/static", STATIC_DIR)
    return app

if __name__ == "__main__":
    app = create_app()
    print(f"Starting server on http://{HOST}:{PORT}")
    print(f"  Local:   http://localhost:{PORT}")
    print(f"  LAN:     http://{LAN_IP}:{PORT}")
    print(f"  Messages loaded: {len(history)}")
    print(f"  Devices loaded:  {len(device_registry)}")
    web.run_app(app, host=HOST, port=PORT, print=None)

