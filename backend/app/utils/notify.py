import os
import requests
import sqlite3

def send_telegram_notify(message: str, image_url: str = None):
    # Try to get from SQLite settings first
    token = None
    chat_id = None
    
    try:
        from ..database import DATABASE_FILE
        conn = sqlite3.connect(DATABASE_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT key, value FROM settings WHERE key IN ('telegram_bot_token', 'telegram_chat_id')")
        settings = dict(cursor.fetchall())
        token = settings.get('telegram_bot_token')
        chat_id = settings.get('telegram_chat_id')
        conn.close()
    except Exception:
        pass
        
    # Fallback to env vars
    if not token:
        token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not chat_id:
        chat_id = os.getenv("TELEGRAM_CHAT_ID")
        
    if not token or not chat_id:
        print("Warning: Telegram configuration is missing.")
        return False
        
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "HTML"
    }
    
    try:
        response = requests.post(url, data=data)
        return response.status_code == 200
    except Exception as e:
        print(f"Failed to send telegram notify: {e}")
        return False
