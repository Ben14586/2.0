import sqlite3
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent

database_path_setting = os.getenv("DATABASE_FILE", "database.db")
DATABASE_FILE = Path(database_path_setting)
if not DATABASE_FILE.is_absolute():
    DATABASE_FILE = ROOT / DATABASE_FILE
DATABASE_FILE = DATABASE_FILE.resolve()
DATABASE_FILE.parent.mkdir(parents=True, exist_ok=True)

def get_db():
    conn = sqlite3.connect(DATABASE_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

engine = create_engine(f"sqlite:///{DATABASE_FILE}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_new_tables():
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    # Create users table for Username Login and VIP Membership
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password_hash TEXT,
        tel TEXT,
        display_name TEXT,
        points INTEGER DEFAULT 0,
        total_spent REAL DEFAULT 0.0,
        vip_level TEXT DEFAULT 'Bronze',
        is_banned INTEGER DEFAULT 0,
        ban_reason TEXT,
        is_hidden INTEGER DEFAULT 0,
        referrer_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)
    # Migration: Add new columns if they don't exist
    for col, col_type in [
        ("is_banned", "INTEGER DEFAULT 0"), 
        ("ban_reason", "TEXT"), 
        ("is_hidden", "INTEGER DEFAULT 0"), 
        ("referrer_id", "INTEGER"),
        ("created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP")
    ]:
        try:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col} {col_type}")
        except sqlite3.OperationalError:
            pass # Column already exists
            
    # Create settings table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )
    """)
        
    # Create notifications table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        message TEXT,
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)
    # Create SQLAlchemy models if they don't exist
    from .models import Base
    Base.metadata.create_all(bind=engine)

    # Insert default admin if no admin exists
    cursor.execute("SELECT COUNT(*) FROM admins")
    if cursor.fetchone()[0] == 0:
        import os
        import hashlib
        default_admin_pass = os.getenv("ADMIN_PASSWORD", "GameServices@2026!")
        hashed_pass = hashlib.sha256(default_admin_pass.encode()).hexdigest()
        cursor.execute("INSERT INTO admins (username, password_hash) VALUES (?, ?)", ("admin", hashed_pass))
        
    conn.commit()
    conn.close()
init_new_tables()
