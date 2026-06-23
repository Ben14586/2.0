import os
from fastapi import FastAPI, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import httpx
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent

app = FastAPI(title="Game Services API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173", 
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "https://your-production-domain.com"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

import time
from collections import defaultdict

# --- Anti-DDoS Rate Limiting ---
RATE_LIMIT_CACHE = defaultdict(list)
RATE_LIMIT = 100 # 100 requests per IP
RATE_WINDOW = 60 # per 60 seconds

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    
    # Filter timestamps within the window
    RATE_LIMIT_CACHE[client_ip] = [ts for ts in RATE_LIMIT_CACHE[client_ip] if now - ts < RATE_WINDOW]
    
    if len(RATE_LIMIT_CACHE[client_ip]) >= RATE_LIMIT:
        return JSONResponse(status_code=429, content={"success": False, "error": "Too many requests. Please try again later."})
        
    RATE_LIMIT_CACHE[client_ip].append(now)
    
    # Prevent extremely long paths or malicious URI lengths
    if len(str(request.url)) > 2000:
        return JSONResponse(status_code=400, content={"success": False, "error": "URI Too Long"})

    return await call_next(request)

from .routers import payment, auth, orders, notifications, games, settings, analytics, upload

LEGACY_SERVER_URL = "http://localhost:3001"

# Include native FastAPI routers
app.include_router(payment.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(games.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(upload.router, prefix="/api")



import json

@app.get("/runtime-config.js")
async def get_runtime_config():
    default_api_base_url = "https://two-0-ayb0.onrender.com"
    config = {
        "apiBaseUrl": os.getenv("PUBLIC_API_BASE_URL") or default_api_base_url,
    }
    config_json = json.dumps(config, ensure_ascii=False, separators=(",", ":"))
    js_content = (
        "(function(){"
        f"window.APP_CONFIG=Object.assign({{}},{config_json},window.APP_CONFIG||{{}});"
        "if(!window.API_BASE_URL&&window.APP_CONFIG.apiBaseUrl){"
        "window.API_BASE_URL=window.APP_CONFIG.apiBaseUrl;"
        "}"
        "})();\n"
    )
    return Response(content=js_content, media_type="application/javascript")

dist_path = ROOT / "dist"
uploads_path = ROOT / "uploads"

if uploads_path.exists():
    app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")

if dist_path.exists():
    app.mount("/assets", StaticFiles(directory=dist_path / "assets"), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = dist_path / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(dist_path / "index.html")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": str(exc)},
    )

