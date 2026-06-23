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
    cursor.execute(
        "INSERT INTO users (username, password_hash, tel, display_name, points, total_spent, vip_level) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (req.username, hashed_pw, req.tel, req.display_name, 0, 0.0, "Bronze")
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
            "points": 0,
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
        ORDER BY points DESC 
        LIMIT 10
    """)
    top_users = [dict(r) for r in cursor.fetchall()]
    return {"success": True, "leaderboard": top_users}
