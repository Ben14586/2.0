from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel
import hashlib
import os
import secrets
from typing import Optional
from ..database import get_db

router = APIRouter()

class RegisterRequest(BaseModel):
    username: str
    password: str
    display_name: str
    tel: Optional[str] = None
    referral_code: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

@router.post("/auth/register")
async def register(req: RegisterRequest, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT id FROM users WHERE username = ?", (req.username,))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="Username already exists")
        
    hashed_pw = hash_password(req.password)
    
    # Check referral
    referrer_id = None
    initial_points = 0
    if req.referral_code:
        # Assuming referral code is the username for simplicity
        cursor.execute("SELECT id FROM users WHERE username = ?", (req.referral_code,))
        referrer = cursor.fetchone()
        if referrer:
            referrer_id = referrer["id"]
            initial_points = 10 # New user gets 10 points
            # Add points to referrer (20 points)
            cursor.execute("UPDATE users SET points = points + 20 WHERE id = ?", (referrer_id,))
            # Add notification for referrer
            cursor.execute("INSERT INTO notifications (user_id, message) VALUES (?, ?)", 
                           (referrer_id, f"คุณได้รับ 20 Points จากการที่เพื่อน ({req.username}) สมัครสมาชิก!"))
    
    cursor.execute(
        "INSERT INTO users (username, password_hash, tel, display_name, points, total_spent, vip_level, referrer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (req.username, hashed_pw, req.tel, req.display_name, initial_points, 0.0, "Bronze", referrer_id)
    )
    db.commit()
    user_id = cursor.lastrowid
    
    return {
        "success": True,
        "user": {
            "id": user_id,
            "username": req.username,
            "tel": req.tel,
            "display_name": req.display_name,
            "points": initial_points,
            "total_spent": 0.0,
            "vip_level": "Bronze"
        }
    }

@router.post("/auth/login")
async def login(req: LoginRequest, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (req.username,))
    user = cursor.fetchone()
    
    if not user or user["password_hash"] != hash_password(req.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    if user.get("is_banned"):
        reason = user.get("ban_reason") or "ละเมิดกฎการใช้งาน"
        raise HTTPException(status_code=403, detail=f"บัญชีของคุณถูกระงับการใช้งาน: {reason}")
        
    user_data = dict(user)
    user_data.pop("password_hash", None)
    
    token = "session_" + secrets.token_hex(32)
    return {"success": True, "token": token, "user": user_data}

@router.post("/admin/login")
async def admin_login(req: LoginRequest, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM admins WHERE username = ?", (req.username,))
    admin_row = cursor.fetchone()
    
    if not admin_row or admin_row["password_hash"] != hash_password(req.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    token = "session_" + secrets.token_hex(32)
    # Update token in database
    cursor.execute("UPDATE admins SET token = ? WHERE id = ?", (token, admin_row["id"]))
    db.commit()
    
    return {"success": True, "token": token}

@router.get("/auth/me")
async def get_current_user(username: str, db=Depends(get_db)):
    """
    Gets the current user by Username. In a real app this uses JWT.
    """
    cursor = db.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_data = dict(user)
    user_data.pop("password_hash", None)
    return {"success": True, "user": user_data}

@router.get("/auth/leaderboard")
async def get_leaderboard(db=Depends(get_db)):
    """
    Returns the top 10 users by points (for gamification).
    """
    cursor = db.cursor()
    cursor.execute("""
        SELECT username, display_name, points, vip_level 
        FROM users 
        WHERE is_banned = 0 AND is_hidden = 0
        ORDER BY points DESC 
        LIMIT 10
    """)
    top_users = [dict(r) for r in cursor.fetchall()]
    return {"success": True, "leaderboard": top_users}

# --- ADMIN USER MANAGEMENT ENDPOINTS ---
from ..dependencies import verify_admin

@router.get("/admin/users")
async def admin_get_users(db=Depends(get_db), is_admin=Depends(verify_admin)):
    cursor = db.cursor()
    cursor.execute("SELECT id, username, tel, display_name, points, total_spent, vip_level, is_banned, ban_reason, is_hidden, created_at FROM users ORDER BY id DESC")
    users = [dict(r) for r in cursor.fetchall()]
    return {"success": True, "data": users}

class AdminUpdateUserRequest(BaseModel):
    user_id: int
    display_name: str
    tel: Optional[str] = None
    points: int
    total_spent: float
    vip_level: str

@router.post("/admin/users/update")
async def admin_update_user(req: AdminUpdateUserRequest, db=Depends(get_db), is_admin=Depends(verify_admin)):
    cursor = db.cursor()
    cursor.execute("""
        UPDATE users 
        SET display_name = ?, tel = ?, points = ?, total_spent = ?, vip_level = ?
        WHERE id = ?
    """, (req.display_name, req.tel, req.points, req.total_spent, req.vip_level, req.user_id))
    db.commit()
    return {"success": True, "message": "User updated successfully"}

class AdminUserStatusRequest(BaseModel):
    user_id: int
    is_banned: bool
    ban_reason: Optional[str] = None

@router.post("/admin/users/status")
async def admin_update_user_status(req: AdminUserStatusRequest, db=Depends(get_db), is_admin=Depends(verify_admin)):
    cursor = db.cursor()
    cursor.execute("""
        UPDATE users 
        SET is_banned = ?, ban_reason = ?
        WHERE id = ?
    """, (1 if req.is_banned else 0, req.ban_reason, req.user_id))
    db.commit()
    return {"success": True, "message": "User status updated successfully"}

class AdminResetPasswordRequest(BaseModel):
    user_id: int
    new_password: str

@router.post("/admin/users/reset-password")
async def admin_reset_password(req: AdminResetPasswordRequest, db=Depends(get_db), is_admin=Depends(verify_admin)):
    hashed_pw = hash_password(req.new_password)
    cursor = db.cursor()
    cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hashed_pw, req.user_id))
    db.commit()
    return {"success": True, "message": "Password reset successfully"}

class AdminUserHideRequest(BaseModel):
    user_id: int
    is_hidden: bool

@router.post("/admin/users/hide")
async def admin_update_user_hide(req: AdminUserHideRequest, db=Depends(get_db), is_admin=Depends(verify_admin)):
    cursor = db.cursor()
    cursor.execute("UPDATE users SET is_hidden = ? WHERE id = ?", (1 if req.is_hidden else 0, req.user_id))
    db.commit()
    return {"success": True, "message": "User visibility updated successfully"}

class AdminUserDeleteRequest(BaseModel):
    user_id: int

@router.post("/admin/users/delete")
async def admin_delete_user(req: AdminUserDeleteRequest, db=Depends(get_db), is_admin=Depends(verify_admin)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM users WHERE id = ?", (req.user_id,))
    # Optionally delete notifications or other related data
    cursor.execute("DELETE FROM notifications WHERE user_id = ?", (req.user_id,))
    db.commit()
    return {"success": True, "message": "User deleted successfully"}
