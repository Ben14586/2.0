from fastapi import APIRouter, Depends, HTTPException, Request, Form, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional, Any
from ..database import get_db
from ..models import Order, Game, Package
from ..dependencies import verify_admin
import uuid
import os
from datetime import datetime

router = APIRouter()
MAX_SLIP_BYTES = int(os.getenv("MAX_SLIP_BYTES", str(5 * 1024 * 1024)))
ALLOWED_SLIP_TYPES = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
}

def detect_image_type(content: bytes) -> str:
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if content.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "webp"
    return ""

class OrderRequest(BaseModel):
    gameId: str
    packageId: str
    gameUsername: str
    gamePassword: str
    loginMethod: str
    price: float

@router.post("/payment/qr")
async def generate_qr(amount: float):
    from ..utils.promptpay import generate_payload
    pp_id = os.getenv("PROMPTPAY_ID", "").strip()
    if not pp_id:
        raise HTTPException(status_code=503, detail="PromptPay is not configured")
    payload = generate_payload(pp_id, amount)
    return {"success": True, "payload": payload}

@router.post("/orders")
async def create_order(
    gameId: str = Form(...),
    packageId: str = Form(...),
    gameUsername: str = Form(...),
    gamePassword: str = Form(...),
    loginMethod: str = Form(...),
    price: float = Form(...),
    slipImage: UploadFile = File(...),
    db = Depends(get_db)
):
    try:
        # Check if game and package exist
        game = db.query(Game).filter(Game.id == gameId).first()
        package = db.query(Package).filter(Package.id == packageId).first()

        if not game or not package:
            raise HTTPException(status_code=400, detail="Game or Package not found")

        # Save slip image
        uploads_dir = os.path.join(os.getcwd(), "uploads", "slips")
        os.makedirs(uploads_dir, exist_ok=True)
        content = await slipImage.read()
        if not content:
            raise HTTPException(status_code=400, detail="Slip image is required")
        if len(content) > MAX_SLIP_BYTES:
            raise HTTPException(status_code=413, detail="Slip image is too large")
        if slipImage.content_type not in ALLOWED_SLIP_TYPES:
            raise HTTPException(status_code=400, detail="Unsupported slip image type")
        detected = detect_image_type(content)
        if detected not in {"png", "jpeg", "webp"}:
            raise HTTPException(status_code=400, detail="Invalid slip image")
        file_ext = ALLOWED_SLIP_TYPES[slipImage.content_type]
        filename = f"slip-{uuid.uuid4().hex}.{file_ext}"
        filepath = os.path.join(uploads_dir, filename)

        with open(filepath, "wb") as f:
            f.write(content)

        slip_url = f"/uploads/slips/{filename}"

        new_order = Order(
            id=str(uuid.uuid4()),
            game_id=gameId,
            package_id=packageId,
            game_username=gameUsername,
            game_password=gamePassword,
            login_method=loginMethod,
            price=price,
            slip_image=slip_url,
            status="pending"
        )

        db.add(new_order)
        db.commit()
        db.refresh(new_order)

        # Send Telegram Notify
        from ..utils.notify import send_telegram_notify
        notify_msg = f"📦 <b>ออเดอร์ใหม่เข้า!</b>\nเกม: {game.name}\nแพ็กเกจ: {package.name}\nราคา: {price} บาท\nสถานะ: รอดำเนินการ"
        # Can't easily send local file URL to notify, so just send text for now
        send_telegram_notify(notify_msg)

        return {"success": True, "orderId": new_order.id, "message": "Order created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/orders")
async def get_orders(db = Depends(get_db), admin_user=Depends(verify_admin)):
    orders = db.query(Order).order_by(Order.created_at.desc()).all()

    result = []
    for o in orders:
        game = db.query(Game).filter(Game.id == o.game_id).first()
        package = db.query(Package).filter(Package.id == o.package_id).first()
        result.append({
            "id": o.id,
            "gameName": game.name if game else "Unknown Game",
            "packageName": package.name if package else "Unknown Package",
            "username": o.game_username,
            "loginMethod": o.login_method,
            "price": o.price,
            "status": o.status,
            "slipImage": o.slip_image,
            "createdAt": o.created_at.isoformat() if o.created_at else None
        })
    return {"success": True, "data": result}

@router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str = Form(...), db = Depends(get_db), admin_user=Depends(verify_admin)):
    if status not in {"pending", "processing", "completed", "cancelled"}:
        raise HTTPException(status_code=400, detail="Invalid order status")
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = status
    db.commit()

    return {"success": True, "message": f"Order status updated to {status}"}
