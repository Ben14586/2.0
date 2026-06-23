import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "database.db")

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("Creating settings table...")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )
    """)
    
    # Insert default settings if they don't exist
    defaults = {
        "slipok_api_key": "",
        "slipok_branch_id": "",
        "telegram_bot_token": "",
        "telegram_chat_id": ""
    }
    
    for k, v in defaults.items():
        cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (k, v))
        
    conn.commit()
    conn.close()
    print("Migration successful.")

if __name__ == "__main__":
    migrate()
