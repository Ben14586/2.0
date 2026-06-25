import os
from fastapi import FastAPI, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import httpx
from pathlib import Path
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
import sqlite3
import datetime

ROOT = Path(__file__).resolve().parent.parent.parent

limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
app = FastAPI(title="Game Services API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

def cleanup_old_data():
    try:
        from .database import DATABASE_FILE
        conn = sqlite3.connect(DATABASE_FILE)
        cursor = conn.cursor()
        # Delete notifications older than 30 days
        cursor.execute("DELETE FROM notifications WHERE created_at <= datetime('now', '-30 days')")
        conn.commit()
        conn.close()
    except Exception as e:
        print("Error in cleanup task:", e)

scheduler = BackgroundScheduler()
scheduler.add_job(cleanup_old_data, 'cron', hour=0, minute=0) # Run every midnight

@app.on_event("startup")
def startup_event():
    scheduler.start()

@app.on_event("shutdown")
def shutdown_event():
    scheduler.shutdown()

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

# --- Additional Security Middleware ---
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    # Prevent extremely long paths or malicious URI lengths
    if len(str(request.url)) > 2000:
        return JSONResponse(status_code=400, content={"success": False, "error": "URI Too Long"})

    response = await call_next(request)
    
    # Add Security Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

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
    default_api_base_url = "https://game-services-hwcy.onrender.com"
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
