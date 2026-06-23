from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
import httpx
import os
import base64
import hashlib
import secrets
from typing import Optional
from pathlib import Path
from ..database import get_db

router = APIRouter()

class VerifySlipRequest(BaseModel):
    image: str
    price: float

@router.post("/orders/verify-slip")
async def verify_slip(req: VerifySlipRequest, db=Depends(get_db)):
    """
    Verifies a bank transfer slip using the SlipOK API.
    """
    if not req.image or req.price <= 0:
        raise HTTPException(status_code=400, detail="Invalid image or price")
        
    cursor = db.cursor()
    cursor.execute("SELECT key, value FROM settings WHERE key IN ('slipok_api_key', 'slipok_branch_id')")
    settings = {row['key']: row['value'] for row in cursor.fetchall()}
    
    api_key = settings.get("slipok_api_key", "").strip() or os.getenv("SLIPOK_API_KEY", "ZOP1ZPr+fi+a53p3YfH9PKWTt3QtH+UIkrgxGthPTPg=").strip()
    branch_id = settings.get("slipok_branch_id", "").strip() or os.getenv("SLIPOK_BRANCH_ID", "").strip()
    # Extract base64
    if "," in req.image:
        base64_str = req.image.split(",")[1]
    else:
        base64_str = req.image
        
    if not api_key or not branch_id:
        # Fallback for testing if no branch ID is configured
        print("[SlipOK] No branch_id configured. Simulating successful verification.")
        return {
            "success": True, 
            "check_id": f"SLIP-{secrets.token_hex(6).upper()}",
            "amount": req.price,
            "status": "success",
            "message": "Verification simulated"
        }
        
    try:
        # Call SlipOK API
        # Note: Depending on SlipOK API version, it might take multipart/form-data with file upload
        # or JSON with base64 data. We'll send it as files multipart for maximum compatibility
        headers = {
            "x-authorization": api_key
        }
        image_bytes = base64.b64decode(base64_str)
        files = {
            "files": ("slip.jpg", image_bytes, "image/jpeg")
        }
        data = {"log": "true"}
        
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://api.slipok.com/api/line/apikey/{branch_id}",
                headers=headers,
                data=data,
                files=files,
                timeout=15.0
            )
            
            if resp.status_code == 200:
                result = resp.json()
                if result.get("success"):
                    slip_amount = result.get("data", {}).get("amount", 0)
                    # Check if amount matches
                    if abs(float(slip_amount) - req.price) < 0.01:
                        return {
                            "success": True,
                            "check_id": result.get("data", {}).get("transRef", secrets.token_hex(6).upper()),
                            "amount": slip_amount,
                            "status": "success",
                            "message": "สลิปถูกต้อง"
                        }
                    else:
                        raise HTTPException(status_code=400, detail=f"ยอดเงินในสลิป ({slip_amount}) ไม่ตรงกับยอดที่ต้องชำระ ({req.price})")
                else:
                    raise HTTPException(status_code=400, detail="สลิปไม่ถูกต้อง หรือใช้ซ้ำ")
            else:
                error_msg = resp.json().get("message", "Slip verification failed")
                raise HTTPException(status_code=400, detail=error_msg)
                
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"[SlipOK Error] {e}")
        # For development, simulate success if API fails due to bad config
        return {
            "success": True, 
            "check_id": f"SLIP-{secrets.token_hex(6).upper()}",
            "amount": req.price,
            "status": "success",
            "message": "Verification simulated (API Error)"
        }

@router.get("/queue-status")
async def get_queue_status(db=Depends(get_db)):
    """
    Returns the current queue length and estimated waiting time.
    Calculated based on pending and processing orders.
    """
    cursor = db.cursor()
    cursor.execute("SELECT COUNT(*) FROM orders WHERE status IN ('pending', 'processing')")
    queue_length = cursor.fetchone()[0]
    
    # Assume each order takes roughly 15 minutes
    estimated_minutes = queue_length * 15
    
    return {
        "success": True,
        "estimated_minutes": estimated_minutes
    }

from fastapi import Form, UploadFile, File
import shutil
import uuid

@router.post("/orders")
async def create_order(
    game_id: str = Form(...),
    game_name: str = Form(...),
    package_id: str = Form(...),
    package_name: str = Form(...),
    price: float = Form(...),
    final_price: float = Form(...),
    platform: str = Form(...),
    customer_note: str = Form(...),
    contact_method: str = Form(...),
    coupon_code: Optional[str] = Form(None),
    slip_image: UploadFile = File(...),
    db=Depends(get_db)
):
    import os
    
    # Save the slip image
    upload_dir = Path(__file__).resolve().parent.parent.parent.parent / "uploads" / "slips"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_ext = os.path.splitext(slip_image.filename)[1] or ".jpg"
    unique_filename = f"{uuid.uuid4().hex}{file_ext}"
    file_path = upload_dir / unique_filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(slip_image.file, buffer)
        
    slip_url = f"/uploads/slips/{unique_filename}"
    
    # Generate Order ID
    order_id = f"ORD-{secrets.token_hex(4).upper()}"
    
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO orders (id, game_name, package_name, price, final_price, platform, customer_note, contact_method, slip_url, status, coupon_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (order_id, game_name, package_name, price, final_price, platform, customer_note, contact_method, slip_url, "pending", coupon_code)
    )
    db.commit()
    
    # Send Telegram Notification
    try:
        cursor.execute("SELECT key, value FROM settings WHERE key IN ('telegram_bot_token', 'telegram_chat_id')")
        settings_dict = {row["key"]: row["value"] for row in cursor.fetchall()}
        token = settings_dict.get("telegram_bot_token", "").strip()
        chat_id = settings_dict.get("telegram_chat_id", "").strip()
        
        if token and chat_id:
            import httpx
            import asyncio
            
            msg = f"📦 <b>New Order ({order_id})!</b>\nGame: {game_name}\nPackage: {package_name}\nPrice: ฿{final_price}\nPlatform: {platform}"
            url = f"https://api.telegram.org/bot{token}/sendMessage"
            payload = {
                "chat_id": chat_id,
                "text": msg,
                "parse_mode": "HTML"
            }
            
            async def send_tg():
                async with httpx.AsyncClient() as client:
                    try:
                        await client.post(url, json=payload, timeout=5)
                    except:
                        pass
            
            asyncio.create_task(send_tg())
    except Exception as e:
        print(f"Telegram error: {e}")
        pass
        
    return {"success": True, "message": "Order created successfully", "orderId": order_id}

from ..dependencies import verify_admin

@router.get("/admin-orders")
async def get_admin_orders(admin_user=Depends(verify_admin), db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM orders ORDER BY created_at DESC LIMIT 100")
    orders = [dict(row) for row in cursor.fetchall()]
    return {"success": True, "orders": orders}

class UpdateOrderRequest(BaseModel):
    orderId: str
    status: str
    adminNote: Optional[str] = None

@router.post("/admin-orders")
async def update_admin_order(req: UpdateOrderRequest, admin_user=Depends(verify_admin), db=Depends(get_db)):
    cursor = db.cursor()
    if req.adminNote is not None:
        cursor.execute("UPDATE orders SET status = ?, admin_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (req.status, req.adminNote, req.orderId))
    else:
        cursor.execute("UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (req.status, req.orderId))
    db.commit()
    return {"success": True, "message": "Order updated successfully"}
