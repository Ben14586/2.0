from fastapi import APIRouter, Depends
from ..database import get_db
from ..dependencies import verify_admin
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/admin-dashboard")
async def get_dashboard(admin_user=Depends(verify_admin), db=Depends(get_db)):
    cursor = db.cursor()
    
    cursor.execute("SELECT COUNT(*) as c, SUM(price) as t FROM orders WHERE status='completed'")
    row = cursor.fetchone()
    total_revenue = row['t'] or 0.0
    total_orders = row['c'] or 0
    
    cursor.execute("SELECT COUNT(*) as c FROM users")
    total_users = cursor.fetchone()['c'] or 0
    
    today_start = datetime.now().replace(hour=0, minute=0, second=0).strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("SELECT SUM(price) as t FROM orders WHERE status='completed' AND created_at >= ?", (today_start,))
    today_revenue = cursor.fetchone()['t'] or 0.0
    
    cursor.execute("SELECT COUNT(*) as c FROM orders WHERE status='pending'")
    pending_orders = cursor.fetchone()['c'] or 0
    
    return {
        "success": True,
        "dashboard": {
            "total_revenue": total_revenue,
            "today_revenue": today_revenue,
            "total_orders": total_orders,
            "pending_orders": pending_orders,
            "total_users": total_users,
            "total_games": 0 # Not heavily tracked in MVP dashboard
        }
    }
