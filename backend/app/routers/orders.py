from datetime import datetime
import hashlib
import os
from pathlib import Path
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from ..database import get_db
from ..dependencies import verify_admin

router = APIRouter()

MAX_SLIP_BYTES = int(os.getenv("MAX_SLIP_BYTES", str(5 * 1024 * 1024)))
ALLOWED_SLIP_TYPES = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
}
VALID_ORDER_STATUSES = {"pending", "processing", "completed", "cancelled"}


def now_text() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def table_columns(db, table: str) -> set[str]:
    return {row["name"] for row in db.execute(f"PRAGMA table_info({table})").fetchall()}


def get_setting(db, key: str, default: str = "") -> str:
    try:
        row = db.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
        return (row["value"] if row else default) or default
    except Exception:
        return default


def detect_image_type(content: bytes) -> str:
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if content.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "webp"
    return ""


def normalize_order(row) -> dict:
    data = dict(row)
    slip = data.get("slip_url") or data.get("slip_image") or ""
    created = data.get("created_at") or data.get("order_date")
    return {
        "id": data.get("id"),
        "gameId": data.get("game_id"),
        "packageId": data.get("package_id"),
        "gameName": data.get("game_name") or "Unknown Game",
        "game_name": data.get("game_name") or "Unknown Game",
        "packageName": data.get("package_name") or "Unknown Package",
        "package_name": data.get("package_name") or "Unknown Package",
        "username": data.get("game_username") or data.get("contact_method") or "",
        "password": data.get("game_password") or "",
        "loginMethod": data.get("login_method") or data.get("platform") or "",
        "login_method": data.get("login_method") or data.get("platform") or "",
        "price": data.get("final_price") or data.get("price") or 0,
        "status": data.get("status") or "pending",
        "slipImage": slip,
        "slip_url": slip,
        "slipVerified": bool(data.get("slip_verified")),
        "createdAt": created,
        "created_at": created,
        "customerNote": data.get("customer_note") or "",
    }


def build_insert(table: str, payload: dict) -> tuple[str, list]:
    keys = list(payload.keys())
    placeholders = ", ".join("?" for _ in keys)
    sql = f"INSERT INTO {table} ({', '.join(keys)}) VALUES ({placeholders})"
    return sql, [payload[k] for k in keys]


def record_slip_check(db, order_id: str, content: bytes, amount: float, file_ext: str, slip_url: str, status: str, note: str) -> None:
    if not table_columns(db, "slip_checks"):
        return
    cols = table_columns(db, "slip_checks")
    payload = {
        "id": order_id,
        "file_hash": hashlib.sha256(content).hexdigest(),
        "expected_amount": amount,
        "file_ext": file_ext,
        "status": status,
        "note": note,
        "slip_url": slip_url,
        "created_at": now_text(),
    }
    payload = {k: v for k, v in payload.items() if k in cols}
    sql, values = build_insert("slip_checks", payload)
    db.execute(sql, values)


def slip_verification_status(db) -> tuple[str, str, bool]:
    api_key = os.getenv("SLIPOK_API_KEY", "").strip() or get_setting(db, "slipok_api_key").strip()
    branch_id = os.getenv("SLIPOK_BRANCH_ID", "").strip() or get_setting(db, "slipok_branch_id").strip()
    if api_key and branch_id:
        return "pending", "SlipOK token is configured. Slip is recorded for admin verification queue.", False
    return "pending", "Slip is recorded for manual verification. Add SlipOK API key and Branch ID in admin settings for auto-check.", False


@router.post("/payment/qr")
async def generate_qr(amount: float, db=Depends(get_db)):
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid payment amount")

    pp_id = (
        os.getenv("PROMPTPAY_ID", "").strip()
        or get_setting(db, "promptpay_id").strip()
        or get_setting(db, "promptpay_phone").strip()
    )
    if not pp_id:
        return {
            "success": True,
            "mode": "manual_transfer",
            "amount": round(amount, 2),
            "payload": "",
            "message": "PromptPay is not configured. Customer can transfer the exact amount and upload the slip.",
        }

    from ..utils.promptpay import generate_payload

    payload = generate_payload(pp_id, amount)
    return {"success": True, "mode": "promptpay", "amount": round(amount, 2), "payload": payload}


@router.post("/orders")
async def create_order(
    gameId: str = Form(...),
    packageId: str = Form(...),
    gameUsername: str = Form(...),
    gamePassword: str = Form(...),
    loginMethod: str = Form(...),
    price: float = Form(...),
    slipImage: UploadFile = File(...),
    db=Depends(get_db),
):
    game = db.execute("SELECT id, name FROM games WHERE id = ? AND COALESCE(is_active, 1) = 1", (gameId,)).fetchone()
    package = db.execute(
        "SELECT id, game_id, name, price FROM packages WHERE id = ? AND game_id = ? AND COALESCE(is_active, 1) = 1",
        (packageId, gameId),
    ).fetchone()
    if not game or not package:
        raise HTTPException(status_code=400, detail="Game or package is unavailable")
    if price <= 0:
        raise HTTPException(status_code=400, detail="Invalid order price")

    content = await slipImage.read()
    if not content:
        raise HTTPException(status_code=400, detail="Slip image is required")
    if len(content) > MAX_SLIP_BYTES:
        raise HTTPException(status_code=413, detail="Slip image is too large")
    detected = detect_image_type(content)
    if detected not in {"png", "jpg", "webp"}:
        raise HTTPException(status_code=400, detail="Invalid slip image")
    if slipImage.content_type and slipImage.content_type not in ALLOWED_SLIP_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported slip image type")

    uploads_dir = Path.cwd() / "uploads" / "slips"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    order_id = "ORD-" + datetime.utcnow().strftime("%Y%m%d-%H%M%S") + "-" + uuid.uuid4().hex[:4].upper()
    filename = f"slip-{order_id}.{detected}"
    filepath = uploads_dir / filename
    filepath.write_bytes(content)
    slip_url = f"/uploads/slips/{filename}"

    slip_status, slip_note, slip_verified = slip_verification_status(db)
    cols = table_columns(db, "orders")
    order_payload = {
        "id": order_id,
        "game_id": gameId,
        "package_id": packageId,
        "game_username": gameUsername.strip(),
        "game_password": gamePassword,
        "login_method": loginMethod.strip(),
        "price": round(price, 2),
        "discount_amount": 0,
        "final_price": round(price, 2),
        "platform": loginMethod.strip(),
        "customer_note": slip_note,
        "contact_method": gameUsername.strip(),
        "slip_url": slip_url,
        "slip_image": slip_url,
        "slip_verified": 1 if slip_verified else 0,
        "status": slip_status,
        "coupon_code": "",
        "game_name": game["name"],
        "package_name": package["name"],
        "created_at": now_text(),
        "updated_at": now_text(),
    }
    order_payload = {k: v for k, v in order_payload.items() if k in cols}

    try:
        sql, values = build_insert("orders", order_payload)
        db.execute(sql, values)
        record_slip_check(db, order_id, content, round(price, 2), detected, slip_url, slip_status, slip_note)
        db.commit()
    except Exception as exc:
        db.rollback()
        if filepath.exists():
            filepath.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Order could not be created: {exc}") from exc

    try:
        from ..utils.notify import send_telegram_notify

        send_telegram_notify(
            f"<b>New order</b>\nOrder: {order_id}\nGame: {game['name']}\nPackage: {package['name']}\nAmount: {round(price, 2)} THB\nStatus: {slip_status}"
        )
    except Exception:
        pass

    return {
        "success": True,
        "orderId": order_id,
        "message": "Order created successfully",
        "slip": {"status": slip_status, "verified": slip_verified, "message": slip_note, "url": slip_url},
        "data": {"id": order_id, "gameName": game["name"], "packageName": package["name"], "price": round(price, 2)},
    }


@router.get("/orders")
async def get_orders(db=Depends(get_db), admin_user=Depends(verify_admin)):
    rows = db.execute(
        "SELECT * FROM orders ORDER BY COALESCE(created_at, updated_at, id) DESC LIMIT 500"
    ).fetchall()
    return {"success": True, "data": [normalize_order(row) for row in rows]}


@router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str = Form(...), db=Depends(get_db), admin_user=Depends(verify_admin)):
    status = status.lower().strip()
    if status not in VALID_ORDER_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid order status")

    row = db.execute("SELECT id FROM orders WHERE id = ?", (order_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Order not found")

    cols = table_columns(db, "orders")
    if "updated_at" in cols:
        db.execute("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?", (status, now_text(), order_id))
    else:
        db.execute("UPDATE orders SET status = ? WHERE id = ?", (status, order_id))
    db.commit()
    return {"success": True, "message": f"Order status updated to {status}"}
