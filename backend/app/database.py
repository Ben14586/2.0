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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    conn.commit()
    conn.close()

init_new_tables()
