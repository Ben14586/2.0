from fastapi import Request, HTTPException, Depends
from .database import get_db
import os
import hmac

ADMIN_KEY = os.getenv("ADMIN_KEY", "admin_secret_key_123")

def verify_admin(request: Request, db=Depends(get_db)):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized: No token provided")
    
    token = auth_header.split(" ")[1]
    
    # 1. Check if it matches the master ADMIN_KEY
    if hmac.compare_digest(token, ADMIN_KEY):
        return True
        
    # 2. Check if it exists in the admins table (for legacy sessions)
    cursor = db.cursor()
    cursor.execute("SELECT id FROM admins WHERE token = ?", (token,))
    if cursor.fetchone():
        return True
        
    raise HTTPException(status_code=403, detail="Forbidden: Invalid or expired token")
