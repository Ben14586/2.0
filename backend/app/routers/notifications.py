from fastapi import APIRouter, Depends
from ..database import get_db

router = APIRouter()

@router.get("/notifications")
async def get_notifications(tel: str, db=Depends(get_db)):
    """
    Returns notifications for the user.
    """
    cursor = db.cursor()
    # Get user id
    cursor.execute("SELECT id FROM users WHERE tel = ?", (tel,))
    user = cursor.fetchone()
    if not user:
        return {"success": False, "error": "User not found"}
        
    user_id = user["id"]
    cursor.execute("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20", (user_id,))
    notifications = [dict(r) for r in cursor.fetchall()]
    
    # Mark as read
    cursor.execute("UPDATE notifications SET is_read = 1 WHERE user_id = ?", (user_id,))
    db.commit()
    
    return {"success": True, "notifications": notifications}
