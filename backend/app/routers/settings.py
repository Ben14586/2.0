from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from ..database import get_db
from ..dependencies import verify_admin

router = APIRouter()

class SettingsUpdate(BaseModel):
    settings: Dict[str, str]

@router.get("/admin-settings")
async def get_settings(admin_user=Depends(verify_admin), db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT key, value FROM settings")
    settings = {row["key"]: row["value"] for row in cursor.fetchall()}
    return {"success": True, "data": settings}

@router.post("/admin-settings")
async def update_settings(req: SettingsUpdate, admin_user=Depends(verify_admin), db=Depends(get_db)):
    cursor = db.cursor()
    
    for k, v in req.settings.items():
        # Prevent SQL injection by validating keys or just parameterizing safely
        cursor.execute(
            "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=?", 
            (k, v, v)
        )
        
    db.commit()
    return {"success": True}

import httpx
@router.post("/admin-test-telegram")
async def test_telegram(admin_user=Depends(verify_admin), db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT key, value FROM settings WHERE key IN ('telegram_bot_token', 'telegram_chat_id')")
    settings_dict = {row["key"]: row["value"] for row in cursor.fetchall()}
    
    token = settings_dict.get("telegram_bot_token", "").strip()
    chat_id = settings_dict.get("telegram_chat_id", "").strip()
    
    if not token or not chat_id:
        return {"success": False, "error": "Token or Chat ID missing"}
        
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": "✅ <b>ทดสอบระบบ</b>\nการเชื่อมต่อ Telegram Bot สำเร็จแล้ว!",
        "parse_mode": "HTML"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, json=payload, timeout=10)
            if resp.status_code == 200:
                return {"success": True, "telegram": True}
            else:
                return {"success": False, "error": resp.text}
        except Exception as e:
            return {"success": False, "error": str(e)}
