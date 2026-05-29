"""
Azure Functions ASGI wrapper for the FieldOps FastAPI backend.

Uses a proper lifespan-aware error handler so that even when the main app
fails to import, Azure Functions can start and return a diagnostic JSON.
"""
import sys
import os
import json
import traceback

# backend/ is bundled as a subfolder of this function app for Azure deployment
_here = os.path.dirname(os.path.abspath(__file__))
_backend = os.path.join(_here, "backend")
if _backend not in sys.path:
    sys.path.insert(0, _backend)

import azure.functions as func


def _lifespan_asgi(inner_app):
    """
    Wrap an ASGI callable so it handles the lifespan protocol.
    Without this, AsgiFunctionApp raises 'ASGI middleware startup failed'
    if the inner app doesn't respond to lifespan.startup.
    """
    async def wrapped(scope, receive, send):
        if scope["type"] == "lifespan":
            while True:
                event = await receive()
                if event["type"] == "lifespan.startup":
                    await send({"type": "lifespan.startup.complete"})
                elif event["type"] == "lifespan.shutdown":
                    await send({"type": "lifespan.shutdown.complete"})
                    break
        else:
            await inner_app(scope, receive, send)
    return wrapped


try:
    from app.main import app as fastapi_app
    app = func.AsgiFunctionApp(app=fastapi_app, http_auth_level=func.AuthLevel.ANONYMOUS)

except Exception as _startup_error:
    _diag = {
        "startup_error": str(_startup_error),
        "error_type": type(_startup_error).__name__,
        "traceback": traceback.format_exc()[-3000:],
        "python_version": sys.version,
        "backend_exists": os.path.isdir(_backend),
        "sys_path": sys.path[:4],
    }
    _body = json.dumps(_diag, indent=2, default=str).encode("utf-8")

    async def _error_http(scope, receive, send):
        await send({
            "type": "http.response.start",
            "status": 500,
            "headers": [
                [b"content-type", b"application/json"],
                [b"content-length", str(len(_body)).encode()],
            ],
        })
        await send({"type": "http.response.body", "body": _body, "more_body": False})

    app = func.AsgiFunctionApp(
        app=_lifespan_asgi(_error_http),
        http_auth_level=func.AuthLevel.ANONYMOUS,
    )
