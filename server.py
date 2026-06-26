from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse
from http import cookies
import json
import os
from pathlib import Path
from threading import Lock
import shutil
import time
import sqlite3
import hashlib
import hmac
import secrets
import base64
import html
import struct
from dotenv import load_dotenv
from datetime import datetime, timedelta
import urllib.parse
import urllib.request
import zipfile
import io
import subprocess
import shutil as _shutil_for_which

load_dotenv()

try:
    import requests
except ImportError:
    requests = None

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    psycopg2 = None

try:
    import cloudinary
    import cloudinary.uploader
except ImportError:
    cloudinary = None

ROOT = Path(__file__).resolve().parent

def load_env_file(path):
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value

load_env_file(ROOT / ".env")

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "3000"))
ADMIN_KEY = os.getenv("ADMIN_KEY", "").strip()
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin").strip() or "admin"
ADMIN_BOOTSTRAP_PASSWORD = os.getenv("ADMIN_BOOTSTRAP_PASSWORD", "").strip()
SESSION_COOKIE = "gs_admin_session"
SESSION_HOURS = int(os.getenv("ADMIN_SESSION_HOURS", "8"))
MAX_JSON_BODY_BYTES = int(os.getenv("MAX_JSON_BODY_BYTES", str(5 * 1024 * 1024)))
MAX_SLIP_BYTES = int(os.getenv("MAX_SLIP_BYTES", str(3 * 1024 * 1024)))
MAX_GAME_IMAGE_BYTES = int(os.getenv("MAX_GAME_IMAGE_BYTES", str(4 * 1024 * 1024)))
EVENT_LOCK = Lock()
EVENT_CLIENTS = []
LOGIN_LOCK = Lock()
LOGIN_ATTEMPTS = {}
ORDER_LOCK = Lock()
ORDER_ATTEMPTS = {}
UPLOAD_LOCK = Lock()
UPLOAD_ATTEMPTS = {}

database_path_setting = os.getenv("DATABASE_FILE", "database.db")
DATABASE_FILE = Path(database_path_setting)
if not DATABASE_FILE.is_absolute():
    DATABASE_FILE = ROOT / DATABASE_FILE
DATABASE_FILE = DATABASE_FILE.resolve()
DATABASE_FILE.parent.mkdir(parents=True, exist_ok=True)

uploads_path_setting = os.getenv("UPLOADS_DIR", "uploads")
UPLOADS_DIR = Path(uploads_path_setting)
if not UPLOADS_DIR.is_absolute():
    UPLOADS_DIR = ROOT / UPLOADS_DIR
UPLOADS_DIR = UPLOADS_DIR.resolve()
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
CLOUDINARY_URL = os.getenv("CLOUDINARY_URL", "").strip()
if CLOUDINARY_URL and cloudinary:
    cloudinary.config() # Auto-configures from CLOUDINARY_URL env var

telegram_bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
telegram_chat_id = os.getenv("TELEGRAM_CHAT_ID", "").strip()
line_notify_token = os.getenv("LINE_NOTIFY_TOKEN", "").strip()
PUBLIC_API_BASE_URL = os.getenv("PUBLIC_API_BASE_URL", "").strip().rstrip("/")
PUBLIC_SITE_URL = os.getenv("PUBLIC_SITE_URL", "").strip().rstrip("/")
ADMIN_SITE_URL = os.getenv("ADMIN_SITE_URL", "").strip().rstrip("/")
ADMIN_ENTRY_URL = (ADMIN_SITE_URL or PUBLIC_SITE_URL).strip().rstrip("/")

ALLOWED_ORIGINS = {
    f"http://localhost:{PORT}",
    f"http://127.0.0.1:{PORT}",
}
for configured_origin in (PUBLIC_SITE_URL, ADMIN_SITE_URL):
    if configured_origin:
        ALLOWED_ORIGINS.add(configured_origin)
for configured_origin in os.getenv("ALLOWED_ORIGINS", "").split(","):
    configured_origin = configured_origin.strip().rstrip("/")
    if configured_origin:
        ALLOWED_ORIGINS.add(configured_origin)
if os.getenv("ALLOW_FILE_ORIGIN", "0") == "1":
    ALLOWED_ORIGINS.add("null")

BOOTSTRAP_PASSWORD_NOTICE = ""

# --- Database helpers ---

class PostgresCursorWrapper:
    def __init__(self, cursor):
        self._cursor = cursor

    def _convert_sql(self, sql):
        sql = sql.replace('%', '%%').replace('?', '%s')
        sql = sql.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
        if "PRAGMA table_info(" in sql:
            table = sql.split("PRAGMA table_info(")[1].split(")")[0]
            return f"SELECT column_name as name FROM information_schema.columns WHERE table_name = '{table}'"
        return sql

    def execute(self, sql, params=()):
        self._cursor.execute(self._convert_sql(sql), params)
        return self

    def executemany(self, sql, params_list):
        self._cursor.executemany(self._convert_sql(sql), params_list)
        return self

    def fetchone(self):
        return self._cursor.fetchone()

    def fetchall(self):
        return self._cursor.fetchall()

    @property
    def description(self):
        return self._cursor.description

class PostgresDBWrapper:
    def __init__(self, conn):
        self.conn = conn

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            self.commit()
        else:
            self.conn.rollback()
        self.close()

    def cursor(self):
        return PostgresCursorWrapper(self.conn.cursor(cursor_factory=psycopg2.extras.DictCursor))

    def commit(self):
        self.conn.commit()

    def close(self):
        self.conn.close()

def get_db():
    if DATABASE_URL and psycopg2:
        conn = psycopg2.connect(DATABASE_URL)
        return PostgresDBWrapper(conn)
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def utc_now():
    return datetime.utcnow()

def iso_now():
    return utc_now().isoformat(timespec="seconds")

def parse_iso(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        return None

def hash_password(password, salt=None, iterations=260000):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
    return f"pbkdf2_sha256${iterations}${salt}${digest.hex()}"

def verify_password(password, stored_hash):
    stored_hash = str(stored_hash or "")
    if stored_hash.startswith("pbkdf2_sha256$"):
        try:
            _, iterations, salt, expected = stored_hash.split("$", 3)
            actual = hash_password(password, salt=salt, iterations=int(iterations)).split("$", 3)[3]
            return hmac.compare_digest(actual, expected)
        except Exception:
            return False

    legacy_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()
    return hmac.compare_digest(legacy_hash, stored_hash)

def hash_admin_session_token(token):
    return "session_sha256$" + hashlib.sha256(str(token or "").encode("utf-8")).hexdigest()

def verify_admin_session_token(supplied, stored_token):
    stored_token = str(stored_token or "")
    if stored_token.startswith("session_sha256$"):
        return hmac.compare_digest(hash_admin_session_token(supplied), stored_token)
    return hmac.compare_digest(str(supplied or ""), stored_token)

def migrate_legacy_admin_session_tokens(cursor):
    rows = cursor.execute(
        "SELECT id, token FROM admins WHERE token IS NOT NULL AND token != '' AND token NOT LIKE 'session_sha256$%'"
    ).fetchall()
    for row in rows:
        cursor.execute(
            "UPDATE admins SET token = ? WHERE id = ?",
            (hash_admin_session_token(row["token"]), row["id"]),
        )

def ensure_columns(cursor, table, columns):
    existing = {row["name"] for row in cursor.execute(f"PRAGMA table_info({table})").fetchall()}
    for name, definition in columns.items():
        if name not in existing:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {name} {definition}")

CURATED_GAME_CATALOG = [
    ("game-idle-hero-td", "Idle Hero TD", "Tower Defense", "tower-defense", ["Free Purchase"]),
    ("game-stickman-defense-td", "STICKMAN DEFENSE TD", "Tower Defense", "tower-defense", ["Free Purchase"]),
    ("game-slime-castle-td", "SLIME CASTLE TD", "Tower Defense", "tower-defense", ["Free Purchase"]),
    ("game-dragon-fever-td", "DRAGON FEVER TD", "Tower Defense", "tower-defense", ["Free Purchase"]),
    ("game-tiny-warriors-rush-td", "TINY WARRIORS RUSH TD", "Tower Defense", "tower-defense", ["Free Purchase"]),
    ("game-punko-io-td", "PUNKO.IO TD", "Tower Defense", "tower-defense", ["Free Purchase"]),
    ("game-survival-arena-td", "SURVIVAL ARENA TD", "Tower Defense", "tower-defense", ["Free Purchase"]),
    ("game-raid-rush-tower-defense-td", "RAID RUSH : Tower Defense TD", "Tower Defense", "tower-defense", ["Reference from game list"]),
    ("game-samkok-heroes-td", "Samkok Heroes TD", "Tower Defense", "tower-defense", ["Free Purchase Gold"]),
    ("game-lighting-princess-idle-rpg", "Lighting Princess: Idle RPG", "Idle RPG", "idle-rpg", ["Free Shop"]),
    ("game-shadow-knight-idle-rpg", "Shadow Knight : Idle RPG", "Idle RPG", "idle-rpg", ["Add Shadow Piece", "Change dungeon reward", "Get All Aura after rebirth", "Shadow Tree No cost", "Token Shop No cost", "Auto complete Main Quest", "Artifact No cost"]),
    ("game-idle-hunter-eternal-soul-rpg", "Idle Hunter: Eternal Soul RPG", "Idle RPG", "idle-rpg", ["Add Currency", "Change Summon Count"]),
    ("game-legend-of-slime-idle-rpg", "Legend of Slime : Idle RPG", "Idle RPG", "idle-rpg", ["Free Purchase"]),
    ("game-legend-of-witch-idle-rpg", "Legend of Witch : Idle RPG", "Idle RPG", "idle-rpg", ["Free Purchase"]),
    ("game-bullet-heroes-rpg", "Bullet Heroes RPG", "RPG", "rpg", ["Free Purchase", "Free Resources"]),
    ("game-claw-master-roguelike", "Claw Master - RogueLike", "RogueLike", "roguelike", ["Free Purchase"]),
]

CURATED_GAME_MEDIA = {
    "game-idle-hero-td": {
        "catalog_type": "TD",
        "reference_title": "Idle Hero TD Free Purchase",
        "play_image": "/uploads/game-images/idle-hero-td.png",
        "play_store": "https://play.google.com/store/apps/details?id=com.SwellGamesLLC.IdleHeroTD",
    },
    "game-stickman-defense-td": {
        "catalog_type": "TD",
        "reference_title": "STICKMAN DEFENSE Free Purchase & etc",
        "play_image": "/uploads/game-images/stickman-defense-td.jpg",
        "play_store": "https://play.google.com/store/apps/details?id=com.thp020.stickman.casual.war.game",
    },
    "game-slime-castle-td": {
        "catalog_type": "TD",
        "reference_title": "SLIME CASTLE Resources, Features & etc",
        "play_image": "/uploads/game-images/slime-castle-td.jpg",
        "play_store": "https://play.google.com/store/apps/details?id=com.redtailworks.slimetd",
    },
    "game-dragon-fever-td": {
        "catalog_type": "TD",
        "reference_title": "DRAGON FEVER TD Resources",
        "play_image": "/uploads/game-images/dragon-fever-td.jpg",
        "play_store": "https://play.google.com/store/apps/details?id=com.traverse.zhfx.en.gp",
    },
    "game-tiny-warriors-rush-td": {
        "catalog_type": "TD",
        "reference_title": "TINY WARRIORS RUSH Free Purchase & etc",
        "play_image": "/uploads/game-images/tiny-warriors-rush-td.png",
        "play_store": "https://play.google.com/store/apps/details?id=com.nlabsoft.defense.tinywarriors",
    },
    "game-punko-io-td": {
        "catalog_type": "TD",
        "reference_title": "PUNKO.IO Free Purchase & Open UI",
        "play_image": "/uploads/game-images/punko-io-td.png",
        "play_store": "https://play.google.com/store/apps/details?id=com.Agonalea.Punko.io",
    },
    "game-survival-arena-td": {
        "catalog_type": "TD",
        "reference_title": "SURVIVAL ARENA DevTool",
        "play_image": "/uploads/game-images/survival-arena-td.png",
        "play_store": "https://play.google.com/store/apps/details?id=tower.defense.survival.arena",
    },
    "game-raid-rush-tower-defense-td": {
        "catalog_type": "TD",
        "reference_title": "RAID RUSH : Tower Defense TD Free Resources",
        "play_image": "/uploads/game-images/raid-rush-tower-defense-td.png",
        "play_store": "https://play.google.com/store/apps/details?id=com.wireless.defenseland",
    },
    "game-samkok-heroes-td": {
        "catalog_type": "TD",
        "reference_title": "Free Purchase Gold",
        "play_image": "/uploads/game-images/samkok-heroes-td.png",
        "play_store": "https://play.google.com/store/apps/details?id=co.imba.threekingdoms.towerdefense",
    },
    "game-lighting-princess-idle-rpg": {
        "catalog_type": "RPG",
        "reference_title": "Free Shop",
        "play_image": "/uploads/game-images/lighting-princess-idle-rpg.jpg",
        "play_store": "https://play.google.com/store/apps/details?id=com.superplanet.lightning",
    },
    "game-shadow-knight-idle-rpg": {
        "catalog_type": "RPG",
        "reference_title": "Idle RPG feature service",
        "play_image": "/uploads/game-images/shadow-knight-idle-rpg.jpg",
        "play_store": "https://play.google.com/store/apps/details?id=com.fansipan.stickman.fight.shadow.knights",
    },
    "game-idle-hunter-eternal-soul-rpg": {
        "catalog_type": "RPG",
        "reference_title": "Add Currency / Change Summon Count",
        "play_image": "/uploads/game-images/idle-hunter-eternal-soul-rpg.png",
        "play_store": "https://play.google.com/store/apps/details?id=com.afk.idle.hunter.eternal.soul",
    },
    "game-legend-of-slime-idle-rpg": {
        "catalog_type": "RPG",
        "reference_title": "LEGEND OF SLIME : Idle RPG Free Purchase / Free Shopping",
        "play_image": "/uploads/game-images/legend-of-slime-idle-rpg.png",
        "play_store": "https://play.google.com/store/apps/details?id=com.loadcomplete.slimeidle",
    },
    "game-legend-of-witch-idle-rpg": {
        "catalog_type": "RPG",
        "reference_title": "Free Purchase",
        "play_image": "/uploads/game-images/legend-of-witch-idle-rpg.png",
        "play_store": "https://play.google.com/store/apps/details?id=com.dreamplay.legendofwitch.google",
    },
    "game-bullet-heroes-rpg": {
        "catalog_type": "RPG",
        "reference_title": "BULLET HEROES Free Purchase & Free Resources",
        "play_image": "/uploads/game-images/bullet-heroes-rpg.png",
        "play_store": "https://play.google.com/store/apps/details?id=com.goosebump.bulletheroes",
    },
    "game-claw-master-roguelike": {
        "catalog_type": "RPG",
        "reference_title": "Free Purchase",
        "play_image": "/uploads/game-images/claw-master-roguelike.png",
        "play_store": "https://play.google.com/store/apps/details?id=hero.claw.master",
    },
}

def seed_curated_catalog(cursor):
    categories = [
        ("cat-td", "Tower Defense", "tower-defense", 4, 1),
        ("cat-idle-rpg", "Idle RPG", "idle-rpg", 5, 1),
        ("cat-roguelike", "RogueLike", "roguelike", 6, 1),
    ]
    cursor.executemany("""
    INSERT INTO categories (id, name, slug, sort_order, is_active)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, slug=excluded.slug, sort_order=excluded.sort_order, is_active=excluded.is_active
    """, categories)

    for index, (game_id, name, category_name, category_slug, features) in enumerate(CURATED_GAME_CATALOG, start=1):
        description = (
            f"ข้อมูลอ้างอิงจากไฟล์รายการเกมของทีม: {name}. "
            f"แนว {category_name} พร้อม notes: {', '.join(features)}."
        )
        cursor.execute("""
        INSERT INTO games (id, name, slug, description, category_name, category_slug, supported_android, supported_ios, warranty_days, warranty_note, is_featured, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO NOTHING
        """, (
            game_id,
            name,
            game_id.replace("game-", ""),
            description,
            category_name,
            category_slug,
            1,
            1,
            7,
            "รับประกันตามเงื่อนไขร้าน 7 วัน",
            1 if index <= 6 else 0,
            1,
        ))

        media = CURATED_GAME_MEDIA.get(game_id, {})
        if media:
            cursor.execute("""
            UPDATE games
            SET
                catalog_type = COALESCE(NULLIF(catalog_type, ''), ?),
                reference_title = COALESCE(NULLIF(reference_title, ''), ?),
                play_image = COALESCE(NULLIF(play_image, ''), ?),
                play_store = COALESCE(NULLIF(play_store, ''), ?)
            WHERE id = ?
            """, (
                media.get("catalog_type", ""),
                media.get("reference_title", ""),
                media.get("play_image", ""),
                media.get("play_store", ""),
                game_id,
            ))

        package_id = f"pkg-{game_id.replace('game-', '')}-reference"
        cursor.execute("""
        INSERT INTO packages (id, name, price, subtitle, description, badge, is_recommended, highlights, delivery, support, guarantee, audience, admin_notes, is_active, game_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO NOTHING
        """, (
            package_id,
            "Reference Feature Pack",
            150.0,
            f"แพ็คข้อมูลจากไฟล์ต้นทาง: {', '.join(features[:3])}",
            f"การ์ดนี้เพิ่มจากข้อมูลที่ผู้ใช้ให้ไว้ใน 1.txt/2.txt สำหรับจัดหมวดและแสดงบนหน้าเว็บ",
            "อ้างอิง",
            1,
            json.dumps(features, ensure_ascii=False),
            "ตรวจข้อมูลก่อนดำเนินการ",
            "ติดต่อทีมผ่าน Telegram/Facebook",
            "รับประกันตามเงื่อนไขร้าน",
            "เหมาะสำหรับลูกค้าที่ต้องการดูรายการเกมที่รองรับก่อนสั่ง",
            "Source: C:/Users/brnbe/Documents/1.txt และ 2.txt",
            1,
            game_id,
        ))

PACKAGE_SALES_COPY = {
    "pkg-idle-hero-td-reference": {
        "subtitle": "Free Purchase พร้อมเซ็ตเริ่มต้นคุ้มค่า เหมาะกับสาย TD ที่อยากเริ่มไวและเล่นต่อได้ลื่น",
        "description": "แพ็กสำหรับ Idle Hero TD เน้นความคุ้มและความสะดวกในการเริ่มเล่น ช่วยให้ลูกค้าเห็นรายการที่รองรับชัดเจนก่อนสั่ง พร้อมดูแลหลังงานตามเงื่อนไขร้าน",
        "highlights": ["Free Purchase", "เริ่มต้นคุ้ม เล่นต่อได้ไว", "เหมาะกับสายวางแผนป้อม", "ตรวจรายการก่อนดำเนินการ", "รับประกัน 7 วัน"],
        "delivery": "ตรวจข้อมูลและดำเนินการตามคิวงาน",
        "support": "แจ้งสถานะผ่านช่องทางติดต่อ พร้อมเลขออเดอร์",
        "guarantee": "รับประกันตามเงื่อนไขร้าน 7 วัน",
        "audience": "เหมาะกับผู้เล่น Idle Hero TD ที่ต้องการแพ็กเริ่มต้นดูแลง่าย",
    },
    "pkg-stickman-defense-td-reference": {
        "subtitle": "Free Purchase สำหรับสายป้องกันฐาน เน้นเริ่มไว เล่นง่าย และมีรายการรองรับชัดเจน",
        "description": "แพ็กสำหรับ STICKMAN DEFENSE TD เหมาะกับคนที่อยากเสริมความพร้อมในการเล่นแนวป้องกันฐาน มีรายละเอียดก่อนสั่งและช่องทางติดตามงานครบ",
        "highlights": ["Free Purchase", "เหมาะกับสายป้องกันฐาน", "ช่วยให้เล่นช่วงต้นง่ายขึ้น", "เช็กความพร้อมก่อนรับงาน", "รับประกัน 7 วัน"],
        "delivery": "ดำเนินการหลังตรวจข้อมูลครบ",
        "support": "ติดตามงานผ่านหน้าออเดอร์และแชท",
        "guarantee": "รับประกันตามเงื่อนไขร้าน 7 วัน",
        "audience": "เหมาะกับผู้เล่นที่อยากเริ่ม STICKMAN DEFENSE TD แบบสะดวก",
    },
    "pkg-slime-castle-td-reference": {
        "subtitle": "Free Purchase สำหรับเกมป้อมปราสาทสไลม์ เล่นสนุกขึ้นด้วยแพ็กเริ่มต้นที่ชัดเจน",
        "description": "แพ็กสำหรับ SLIME CASTLE TD เน้นความคุ้มสำหรับสายป้องกันปราสาท ใช้งานง่าย เห็นรายการที่รองรับก่อนสั่ง และมีระบบติดตามออเดอร์หลังชำระ",
        "highlights": ["Free Purchase", "เหมาะกับสายป้องกันปราสาท", "ช่วยให้เริ่มเล่นสบายขึ้น", "รายละเอียดแพ็กชัดเจน", "รับประกัน 7 วัน"],
        "delivery": "จัดคิวหลังยืนยันข้อมูลและยอดชำระ",
        "support": "มีช่องทางติดต่อหลังสั่งซื้อ",
        "guarantee": "รับประกันตามเงื่อนไขร้าน 7 วัน",
        "audience": "เหมาะกับผู้เล่น SLIME CASTLE TD ที่ต้องการแพ็กเริ่มต้นคุ้มค่า",
    },
    "pkg-dragon-fever-td-reference": {
        "subtitle": "Free Resources สำหรับสายมังกร TD เสริมความพร้อมและประหยัดเวลาเล่น",
        "description": "แพ็กสำหรับ DRAGON FEVER TD เหมาะกับผู้เล่นที่อยากเสริมทรัพยากรและเล่นต่อได้สะดวกขึ้น พร้อมรายละเอียดงานก่อนสั่งและดูแลหลังการขาย",
        "highlights": ["Free Resources", "เสริมทรัพยากรสำหรับสาย TD", "ประหยัดเวลาเล่นช่วงต้น", "ตรวจรายการก่อนดำเนินการ", "รับประกัน 7 วัน"],
        "delivery": "เริ่มดำเนินการหลังข้อมูลครบ",
        "support": "ติดตามสถานะได้จากเลขออเดอร์",
        "guarantee": "รับประกันตามเงื่อนไขร้าน 7 วัน",
        "audience": "เหมาะกับผู้เล่น DRAGON FEVER TD ที่ต้องการความพร้อมก่อนลุยด่าน",
    },
    "pkg-tiny-warriors-rush-td-reference": {
        "subtitle": "Free Purchase สำหรับทีมจิ๋วสายบุกไว เสริมความพร้อมให้เล่นต่อเนื่องกว่าเดิม",
        "description": "แพ็กสำหรับ TINY WARRIORS RUSH TD เน้นความคล่องตัวและความคุ้มค่า เหมาะกับคนที่ชอบวางทีมและเล่นแบบต่อเนื่อง",
        "highlights": ["Free Purchase", "เหมาะกับสายจัดทีมบุกไว", "ช่วยให้เริ่มเล่นต่อเนื่อง", "รายการแพ็กเข้าใจง่าย", "รับประกัน 7 วัน"],
        "delivery": "ดำเนินการตามคิวหลังยืนยันรายการ",
        "support": "แอดมินแจ้งสถานะและดูแลหลังงาน",
        "guarantee": "รับประกันตามเงื่อนไขร้าน 7 วัน",
        "audience": "เหมาะกับผู้เล่น Tiny Warriors Rush TD ที่อยากได้แพ็กคุ้มและไม่ยุ่งยาก",
    },
    "pkg-punko-io-td-reference": {
        "subtitle": "Free Purchase สำหรับ Punko.io TD เล่นง่ายขึ้น เหมาะกับสายด่านไวและอัปต่อเนื่อง",
        "description": "แพ็กสำหรับ PUNKO.IO TD เหมาะกับผู้เล่นที่ต้องการความพร้อมในเกมแนวป้องกันผสมแอ็กชัน รายละเอียดชัดก่อนสั่งและมีระบบติดตามงาน",
        "highlights": ["Free Purchase", "เหมาะกับสายผ่านด่านไว", "ช่วยให้การเล่นลื่นขึ้น", "ตรวจข้อมูลก่อนรับงาน", "รับประกัน 7 วัน"],
        "delivery": "ดำเนินการหลังข้อมูลครบถ้วน",
        "support": "ติดตามงานผ่านเลขออเดอร์และช่องทางติดต่อ",
        "guarantee": "รับประกันตามเงื่อนไขร้าน 7 วัน",
        "audience": "เหมาะกับผู้เล่น PUNKO.IO TD ที่อยากเสริมความพร้อมแบบคุ้ม",
    },
    "pkg-survival-arena-td-reference": {
        "subtitle": "Free Purchase สำหรับสายเอาตัวรอดใน Arena ช่วยให้พร้อมลุยและเล่นได้สนุกขึ้น",
        "description": "แพ็กสำหรับ SURVIVAL ARENA TD เหมาะกับผู้เล่นที่ชอบเกมเอาตัวรอดและวางแผนป้องกัน มีรายการแพ็กชัดเจนและระบบดูแลหลังสั่งซื้อ",
        "highlights": ["Free Purchase", "เหมาะกับสาย Survival TD", "ช่วยให้พร้อมลุย Arena", "มีเลขออเดอร์ติดตามงาน", "รับประกัน 7 วัน"],
        "delivery": "ตรวจรายการและดำเนินการตามลำดับคิว",
        "support": "แอดมินดูแลผ่านช่องทางติดต่อ",
        "guarantee": "รับประกันตามเงื่อนไขร้าน 7 วัน",
        "audience": "เหมาะกับผู้เล่น Survival Arena TD ที่อยากได้แพ็กพร้อมใช้งาน",
    },
    "pkg-raid-rush-tower-defense-td-reference": {
        "subtitle": "Free Purchase สำหรับสาย Raid Rush วางแผนป้อมได้สนุกขึ้นและเริ่มได้มั่นใจกว่าเดิม",
        "description": "แพ็กสำหรับ RAID RUSH : Tower Defense TD เน้นความพร้อมสำหรับเกมวางแผนป้องกันด่าน เหมาะกับลูกค้าที่อยากดูรายการชัด ๆ ก่อนสั่ง",
        "highlights": ["Free Purchase", "เหมาะกับสายวางแผนด่าน", "เสริมความพร้อมก่อนเล่นจริง", "รายละเอียดแพ็กอ่านง่าย", "รับประกัน 7 วัน"],
        "delivery": "เริ่มงานหลังยืนยันข้อมูลครบ",
        "support": "ติดตามสถานะผ่านหน้าออเดอร์",
        "guarantee": "รับประกันตามเงื่อนไขร้าน 7 วัน",
        "audience": "เหมาะกับผู้เล่น Raid Rush ที่ต้องการแพ็ก TD พร้อมดูแล",
    },
    "pkg-samkok-heroes-td-reference": {
        "subtitle": "AMH008 แพ็กสามก๊กยอดคุ้ม ทอง 99M+ พร้อม VIP และแพ็กสนับสนุนยาว",
        "description": "แพ็ก Samkok Heroes TD จากข้อมูล AMH008 เหมาะกับผู้เล่นที่อยากเริ่มแบบจัดเต็ม มีทอง 99M+ แพ็กสนับสนุนและ VIP ระยะยาว พร้อมรับประกันตามเงื่อนไขร้าน",
        "highlights": ["AMH008", "ทองคำ 99M+", "แพ็กสนับสนุน 9999 DAY", "แพ็ก VIP 9999 DAY", "รองรับ Android", "รับประกัน 7 วัน"],
        "delivery": "ตรวจข้อมูลและดำเนินการตามคิวงาน",
        "support": "แจ้งสถานะผ่านเลขออเดอร์และช่องทางติดต่อ",
        "guarantee": "รับประกันตามเงื่อนไขร้าน 7 วัน",
        "audience": "เหมาะกับผู้เล่น Samkok Heroes TD ที่ต้องการแพ็กเริ่มต้นแบบจัดเต็ม",
    },
    "pkg-lighting-princess-idle-rpg-reference": {
        "subtitle": "Free Shop / Free Resources สำหรับสาย Idle RPG เน้นสะสมไวและเล่นต่อได้ยาว",
        "description": "แพ็กสำหรับ Lighting Princess: Idle RPG เหมาะกับผู้เล่นที่ชอบสะสมตัวละครและทรัพยากร ช่วยให้เริ่มเล่นได้ลื่นขึ้นพร้อมดูแลหลังสั่งซื้อ",
        "highlights": ["Free Shop", "Free Resources", "เหมาะกับสายสะสม RPG", "ช่วยให้เล่นต่อได้ยาว", "รับประกัน 7 วัน"],
        "delivery": "ดำเนินการหลังตรวจข้อมูลครบ",
        "support": "แอดมินแจ้งสถานะผ่านช่องทางติดต่อ",
        "guarantee": "รับประกันตามเงื่อนไขร้าน 7 วัน",
        "audience": "เหมาะกับผู้เล่น Idle RPG ที่ต้องการความคุ้มและความสะดวก",
    },
    "pkg-shadow-knight-idle-rpg-reference": {
        "subtitle": "แพ็กฟีเจอร์ Shadow Knight ครบหลายรายการ เหมาะกับสายฟาร์มและสายปลดระบบ",
        "description": "แพ็กสำหรับ Shadow Knight : Idle RPG รวมรายการเด่นหลายส่วน เช่น Shadow Piece, Dungeon Reward, Aura, Token Shop และ Main Quest เหมาะกับผู้เล่นที่ต้องการความครบ",
        "highlights": ["Add Shadow Piece", "Change dungeon reward", "Get All Aura after rebirth", "Shadow Tree No cost", "Token Shop No cost", "Auto complete Main Quest", "Artifact No cost"],
        "delivery": "ตรวจรายการที่ต้องการก่อนเริ่มงาน",
        "support": "แอดมินช่วยไล่รายการและแจ้งสถานะ",
        "guarantee": "รับประกันตามเงื่อนไขร้าน 7 วัน",
        "audience": "เหมาะกับผู้เล่น Shadow Knight ที่อยากได้แพ็กฟีเจอร์ครบ",
    },
    "pkg-idle-hunter-eternal-soul-rpg-reference": {
        "subtitle": "Add Currency / Change Summon Count สำหรับสายสุ่มและอัปทีมไว",
        "description": "แพ็กสำหรับ Idle Hunter: Eternal Soul RPG เหมาะกับสายจัดทีมและสุ่มตัวละคร ช่วยให้รายการที่ต้องการชัดขึ้นก่อนสั่งและดูแลงานเป็นขั้นตอน",
        "highlights": ["Add Currency", "Change Summon Count", "เหมาะกับสายสุ่มตัวละคร", "ช่วยจัดทีมได้ไวขึ้น", "รับประกัน 7 วัน"],
        "delivery": "ดำเนินการหลังตรวจรายการครบ",
        "support": "ติดตามงานผ่านเลขออเดอร์",
        "guarantee": "รับประกันตามเงื่อนไขร้าน 7 วัน",
        "audience": "เหมาะกับผู้เล่น Idle Hunter ที่ต้องการเสริมทรัพยากรและการสุ่ม",
    },
    "pkg-legend-of-slime-idle-rpg-reference": {
        "subtitle": "Free Purchase / Free Shopping สำหรับ Legend of Slime สายฟาร์มสบาย เล่นต่อเนื่อง",
        "description": "แพ็กสำหรับ Legend of Slime : Idle RPG เหมาะกับผู้เล่นที่ต้องการความคุ้มในเกมฟาร์มสไลม์ มีรายการรองรับชัดเจนและรับประกันหลังงาน",
        "highlights": ["Free Purchase", "Free Shopping", "เหมาะกับสายฟาร์ม Idle RPG", "เริ่มเล่นสบายขึ้น", "รับประกัน 7 วัน"],
        "delivery": "เริ่มงานหลังยืนยันข้อมูลครบ",
        "support": "แจ้งสถานะผ่านช่องทางติดต่อ",
        "guarantee": "รับประกันตามเงื่อนไขร้าน 7 วัน",
        "audience": "เหมาะกับผู้เล่น Legend of Slime ที่อยากเล่นลื่นและคุ้มขึ้น",
    },
    "pkg-legend-of-witch-idle-rpg-reference": {
        "subtitle": "Free Purchase สำหรับ Legend of Witch เหมาะกับสาย RPG ที่อยากเริ่มแบบคล่องตัว",
        "description": "แพ็กสำหรับ Legend of Witch : Idle RPG เน้นความง่ายในการสั่งซื้อและความชัดเจนของรายการ เหมาะกับลูกค้าที่ต้องการแพ็กเริ่มต้นดูแลง่าย",
        "highlights": ["Free Purchase", "เหมาะกับสาย Idle RPG", "ช่วยให้เริ่มเล่นคล่องตัว", "ตรวจรายการก่อนดำเนินการ", "รับประกัน 7 วัน"],
        "delivery": "ดำเนินการตามคิวหลังข้อมูลครบ",
        "support": "ติดตามสถานะผ่านเลขออเดอร์",
        "guarantee": "รับประกันตามเงื่อนไขร้าน 7 วัน",
        "audience": "เหมาะกับผู้เล่น Legend of Witch ที่ต้องการแพ็กเริ่มต้นแบบสบายใจ",
    },
    "pkg-bullet-heroes-rpg-reference": {
        "subtitle": "Free Purchase + Free Resources สำหรับสายยิง RPG เสริมของพร้อมลุยด่าน",
        "description": "แพ็กสำหรับ Bullet Heroes RPG เหมาะกับผู้เล่นที่ชอบเกมยิงผสม RPG มีทั้งรายการ Free Purchase และ Free Resources เพื่อเพิ่มความพร้อมก่อนเล่นจริง",
        "highlights": ["Free Purchase", "Free Resources", "เหมาะกับสายยิง RPG", "ช่วยให้ลุยด่านได้พร้อมขึ้น", "รับประกัน 7 วัน"],
        "delivery": "ตรวจข้อมูลก่อนเริ่มดำเนินการ",
        "support": "แอดมินดูแลผ่านช่องทางติดต่อ",
        "guarantee": "รับประกันตามเงื่อนไขร้าน 7 วัน",
        "audience": "เหมาะกับผู้เล่น Bullet Heroes ที่ต้องการแพ็กทรัพยากรพร้อมลุย",
    },
    "pkg-claw-master-roguelike-reference": {
        "subtitle": "Free Purchase สำหรับ Claw Master สาย Roguelike เล่นไว ลองบิลด์ได้สนุกขึ้น",
        "description": "แพ็กสำหรับ Claw Master - RogueLike เหมาะกับผู้เล่นที่ชอบทดลองบิลด์และผ่านด่านแบบรวดเร็ว มีข้อมูลแพ็กชัดเจนก่อนสั่งและดูแลหลังงาน",
        "highlights": ["Free Purchase", "เหมาะกับสาย Roguelike", "ช่วยให้ทดลองบิลด์ได้สนุกขึ้น", "ติดตามงานด้วยเลขออเดอร์", "รับประกัน 7 วัน"],
        "delivery": "ดำเนินการหลังยืนยันข้อมูลครบ",
        "support": "ติดตามสถานะและติดต่อแอดมินได้",
        "guarantee": "รับประกันตามเงื่อนไขร้าน 7 วัน",
        "audience": "เหมาะกับผู้เล่น Claw Master ที่ต้องการแพ็กเล่นง่ายและคุ้ม",
    },
}


def apply_package_sales_copy(cursor):
    for package_id, copy in PACKAGE_SALES_COPY.items():
        cursor.execute("""
        UPDATE packages
        SET subtitle = ?, description = ?, highlights = ?, delivery = ?, support = ?, guarantee = ?, audience = ?
        WHERE id = ?
        """, (
            copy["subtitle"],
            copy["description"],
            json.dumps(copy["highlights"], ensure_ascii=False),
            copy["delivery"],
            copy["support"],
            copy["guarantee"],
            copy["audience"],
            package_id,
        ))

def sync_catalog_from_bundled_database(cursor):
    """Promote bundled catalog rows into a persistent SQLite DB without touching orders/users."""
    if DATABASE_URL:
        return

    bundled_db = (ROOT / "database.db").resolve()
    seed_path = ROOT / "config" / "catalog-seed.json"
    source_rows_by_table = {}
    source_count = 0
    candidates = []

    if bundled_db.exists() and bundled_db != DATABASE_FILE:
        bundled_conn = None
        try:
            bundled_conn = sqlite3.connect(bundled_db)
            bundled_conn.row_factory = sqlite3.Row
            bundled_cursor = bundled_conn.cursor()
            bundled_count = bundled_cursor.execute(
                "SELECT COUNT(*) FROM games WHERE is_active = 1"
            ).fetchone()[0]
            bundled_rows = {}
            for table_name in ("categories", "games", "packages"):
                rows = bundled_cursor.execute(f"SELECT * FROM {table_name}").fetchall()
                bundled_rows[table_name] = [dict(row) for row in rows]
            candidates.append((bundled_count, bundled_rows))
        finally:
            if bundled_conn:
                bundled_conn.close()

    if seed_path.exists():
        try:
            seed = json.loads(seed_path.read_text(encoding="utf-8"))
            seed_rows = {
                "categories": seed.get("categories", []),
                "games": seed.get("games", []),
                "packages": seed.get("packages", []),
            }
            seed_count = sum(
                1 for row in seed_rows["games"] if int(row.get("is_active") or 0) == 1
            )
            candidates.append((seed_count, seed_rows))
        except Exception as exc:
            print(f"Catalog seed skipped: {exc}")

    if candidates:
        source_count, source_rows_by_table = max(candidates, key=lambda item: item[0])
    else:
        return

    try:
        target_count = cursor.execute(
            "SELECT COUNT(*) FROM games WHERE is_active = 1"
        ).fetchone()[0]
        if source_count < target_count:
            return

        for table_name in ("categories", "games", "packages"):
            rows = source_rows_by_table.get(table_name, [])
            if not rows:
                continue
            source_columns = list(rows[0].keys())
            target_columns = {
                row["name"]
                for row in cursor.execute(f"PRAGMA table_info({table_name})").fetchall()
            }
            common_columns = [column for column in source_columns if column in target_columns]
            if "id" not in common_columns:
                continue

            placeholders = ", ".join(["?"] * len(common_columns))
            assignments = ", ".join(
                f"{column}=excluded.{column}" for column in common_columns if column != "id"
            )
            sql = (
                f"INSERT INTO {table_name} ({', '.join(common_columns)}) "
                f"VALUES ({placeholders}) "
                f"ON CONFLICT(id) DO UPDATE SET {assignments}"
            )
            cursor.executemany(sql, [tuple(row.get(column) for column in common_columns) for row in rows])

        print(f"Synced bundled catalog into production database: {source_count} active games available")
    except Exception as exc:
        print(f"Catalog sync skipped: {exc}")

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Create tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password_hash TEXT,
        token TEXT,
        token_expires_at TEXT,
        last_login_at TEXT,
        created_at TEXT
    )
    """)
    ensure_columns(cursor, "admins", {
        "token_expires_at": "TEXT",
        "last_login_at": "TEXT"
    })
    migrate_legacy_admin_session_tokens(cursor)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT,
        slug TEXT,
        sort_order INTEGER,
        is_active INTEGER
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        name TEXT,
        slug TEXT,
        description TEXT,
        category_name TEXT,
        category_slug TEXT,
        supported_android INTEGER,
        supported_ios INTEGER,
        warranty_days INTEGER,
        warranty_note TEXT,
        is_featured INTEGER,
        is_active INTEGER
    )
    """)

    existing_game_columns = {row["name"] for row in cursor.execute("PRAGMA table_info(games)").fetchall()}
    game_column_migrations = {
        "reference_title": "TEXT",
        "play_image": "TEXT",
        "play_store": "TEXT",
        "catalog_type": "TEXT"
    }
    for column_name, column_type in game_column_migrations.items():
        if column_name not in existing_game_columns:
            cursor.execute(f"ALTER TABLE games ADD COLUMN {column_name} {column_type}")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS packages (
        id TEXT PRIMARY KEY,
        name TEXT,
        price REAL,
        subtitle TEXT,
        description TEXT,
        badge TEXT,
        is_recommended INTEGER,
        highlights TEXT, -- JSON Array String
        delivery TEXT,
        support TEXT,
        guarantee TEXT,
        audience TEXT,
        admin_notes TEXT,
        is_active INTEGER,
        game_id TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        game_name TEXT,
        package_name TEXT,
        price REAL,
        discount_amount REAL DEFAULT 0,
        final_price REAL,
        platform TEXT,
        customer_note TEXT,
        contact_method TEXT,
        slip_url TEXT,
        slip_verified INTEGER DEFAULT 0,
        status TEXT, -- pending, processing, completed, cancelled
        coupon_code TEXT,
        created_at TEXT,
        updated_at TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS coupons (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE,
        discount_type TEXT, -- fixed, percentage
        discount_value REAL,
        min_spend REAL DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS slip_checks (
        id TEXT PRIMARY KEY,
        file_hash TEXT UNIQUE,
        expected_amount REAL,
        file_ext TEXT,
        width INTEGER,
        height INTEGER,
        status TEXT,
        note TEXT,
        slip_url TEXT,
        created_at TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        title TEXT,
        content TEXT,
        type TEXT,
        is_active INTEGER,
        created_at TEXT,
        updated_at TEXT
    )
    """)

    # Seed Default Data
    cursor.execute("SELECT COUNT(*) FROM admins")
    if cursor.fetchone()[0] == 0:
        if ADMIN_BOOTSTRAP_PASSWORD:
            cursor.execute("""
            INSERT INTO admins (username, password_hash, token, token_expires_at, last_login_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (ADMIN_USERNAME, hash_password(ADMIN_BOOTSTRAP_PASSWORD), None, None, None, iso_now()))
        else:
            print("No admin created: set ADMIN_BOOTSTRAP_PASSWORD before first deploy.")

        # Seed categories
        cursor.executemany("""
        INSERT INTO categories (id, name, slug, sort_order, is_active)
        VALUES (?, ?, ?, ?, ?)
        """, [
            ("cat-1", "Idle Game", "idle-game", 1, 1),
            ("cat-2", "RPG", "rpg", 2, 1),
            ("cat-3", "Featured", "featured", 3, 1)
        ])

        # Seed games
        cursor.executemany("""
        INSERT INTO games (
            id, name, slug, description, category_name, category_slug,
            supported_android, supported_ios, warranty_days, warranty_note,
            is_featured, is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [
            ("game-1", "Primitive Brothers : Idle Game", "primitive-brothers-idle-game", "แพ็คเพชร เงิน VIP ออโต้ บัฟ และปิดโฆษณา", "Idle / Mobile", "idle-mobile", 1, 1, 7, "รับประกันตามเงื่อนไขร้าน 7 วัน", 1, 1),
            ("game-2", "Idle RPG Service", "idle-rpg-service", "ตัวอย่างการ์ดเกมสำหรับเพิ่มเกมใหม่ในอนาคต", "RPG / Mobile", "rpg-mobile", 1, 1, 7, "รับประกันตามเงื่อนไขร้าน 7 วัน", 0, 1),
            ("game-3", "AFK Mobile Pack", "afk-mobile-pack", "ตัวอย่างเกม Featured สำหรับหน้า Home รวมเกม", "Idle / Featured", "idle-featured", 1, 0, 7, "รับประกันตามเงื่อนไขร้าน 7 วัน", 1, 1),
        ])

        # Seed packages
        cursor.executemany("""
        INSERT INTO packages (
            id, name, price, subtitle, description, badge, is_recommended,
            highlights, delivery, support, guarantee, audience, admin_notes,
            is_active, game_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [
            ("pkg-1", "Starter Boost", 150.0, "แพ็คเริ่มต้นสำหรับคนที่อยากเห็นรายละเอียดชัดและครบ", "แพ็คเริ่มต้นสำหรับลูกค้าที่ต้องการข้อมูลชัดเจนบนหน้าเว็บ", "ขายดี", 1, json.dumps(["จัดชุดของแถมครบ", "เห็นรายการหน้าบ้านชัด", "เหมาะกับลูกค้าเริ่มต้น"]), "ภายใน 5-15 นาที", "ตอบแชททุกวัน 09:00-23:00", "รับประกันตามเงื่อนไขร้าน 7 วัน", "เหมาะกับผู้เล่นใหม่และคนที่ต้องการความคุ้มค่า", "ชุดงานหลักเน้นความเร็วในการจัดส่ง", 1, "game-1"),
            ("pkg-2", "Auto Pack", 150.0, "แพ็คสบาย ๆ สำหรับสายเล่นต่อเนื่อง", "แพ็คสำหรับสายออโต้และใช้งานต่อเนื่อง", "Auto", 0, json.dumps(["โทนใช้งานง่าย", "เหมาะกับสายออโต้", "ข้อความสั้นแต่ครบ"]), "ภายใน 10-20 นาที", "ตอบกลับเร็วในช่วงเวลาทำการ", "มีการดูแลหลังส่ง", "เหมาะกับผู้เล่นที่ต้องการความสะดวก", "งานชุดนี้ให้โฟกัสความต่อเนื่องของลูกค้า", 1, "game-1"),
            ("pkg-3", "Ads Remove Pack", 150.0, "ลดสิ่งรบกวน เพิ่มประสบการณ์ที่นุ่มนวล", "แพ็คสำหรับปิดโฆษณาและลดสิ่งรบกวน", "No Ads", 0, json.dumps(["ลุคโปร่ง สบายตา", "ใช้งานต่อเนื่องไม่สะดุด", "โชว์ความคุ้มค่าชัดเจน"]), "ภายใน 10-25 นาที", "มีทีมดูแลหลังการสั่งซื้อ", "รับประกันการทำงานตามเงื่อนไข", "เหมาะกับคนที่ต้องการประสบการณ์สะอาดตา", "สำหรับลูกค้าที่ต้องการบรีฟเนียน ๆ", 1, "game-1"),
        ])

        # Seed coupons
        cursor.executemany("""
        INSERT INTO coupons (id, code, discount_type, discount_value, min_spend, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, [
            ("coupon-1", "DISCOUNT50", "fixed", 50.0, 100.0, 1, datetime.now().isoformat()),
            ("coupon-2", "10PERCENT", "percentage", 10.0, 0.0, 1, datetime.now().isoformat()),
        ])

    # Seed routines removed to prevent overwriting user data
    sync_catalog_from_bundled_database(cursor)
    # seed_curated_catalog(cursor)
    # apply_package_sales_copy(cursor)

    conn.commit()
    conn.close()

# Initialize DB on Startup
init_db()

# --- Helper Views ---

def public_package_view(package):
    try:
        highlights = json.loads(package["highlights"]) if package["highlights"] else []
    except Exception:
        highlights = []
    return {
        "id": package["id"],
        "name": package["name"],
        "price": package["price"],
        "gameId": package["game_id"],
        "subtitle": package["subtitle"],
        "description": package["description"],
        "badge": package["badge"],
        "isRecommended": bool(package["is_recommended"]),
        "items": highlights,
        "highlights": highlights,
        "delivery": package["delivery"],
        "support": package["support"],
        "guarantee": package["guarantee"],
        "audience": package["audience"]
    }

def admin_package_view(package):
    payload = public_package_view(package)
    payload["adminNotes"] = package["admin_notes"]
    payload["isActive"] = bool(package["is_active"])
    return payload

def db_game_view(game_row, packages_list):
    return {
        "id": game_row["id"],
        "name": game_row["name"],
        "slug": game_row["slug"],
        "description": game_row["description"],
        "supportedAndroid": bool(game_row["supported_android"]),
        "supportedIos": bool(game_row["supported_ios"]),
        "warrantyDays": game_row["warranty_days"],
        "warrantyNote": game_row["warranty_note"],
        "isFeatured": bool(game_row["is_featured"]),
        "isActive": bool(game_row["is_active"]),
        "referenceTitle": game_row["reference_title"] if "reference_title" in game_row.keys() else "",
        "playImage": game_row["play_image"] if "play_image" in game_row.keys() else "",
        "playStore": game_row["play_store"] if "play_store" in game_row.keys() else "",
        "catalogType": game_row["catalog_type"] if "catalog_type" in game_row.keys() else "",
        "category": {"name": game_row["category_name"], "slug": game_row["category_slug"]},
        "packages": packages_list
    }

def load_public_games(cursor):
    cursor.execute("SELECT * FROM games WHERE is_active = 1")
    game_rows = cursor.fetchall()
    games_data = []
    for game_row in game_rows:
        cursor.execute("SELECT * FROM packages WHERE game_id = ? AND is_active = 1", (game_row["id"],))
        package_rows = cursor.fetchall()
        packages_list = [public_package_view(package_row) for package_row in package_rows]
        games_data.append(db_game_view(game_row, packages_list))
    return games_data

def excel_column_name(index):
    name = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        name = chr(65 + remainder) + name
    return name

def excel_cell(value, row_index, column_index, style_index=0):
    ref = f"{excel_column_name(column_index)}{row_index}"
    style = f' s="{style_index}"' if style_index else ""
    if value is None:
        return f'<c r="{ref}"{style}/>'
    if isinstance(value, bool):
        return f'<c r="{ref}" t="b"{style}><v>{1 if value else 0}</v></c>'
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return f'<c r="{ref}"{style}><v>{value}</v></c>'
    text = html.escape(str(value), quote=False)
    return f'<c r="{ref}" t="inlineStr"{style}><is><t>{text}</t></is></c>'

def excel_sheet_xml(title, headers, rows, widths=None):
    widths = widths or []
    column_count = max(len(headers), max((len(row) for row in rows), default=0), 1)
    width_xml = ""
    if widths:
        col_nodes = []
        for idx in range(1, column_count + 1):
            width = widths[idx - 1] if idx <= len(widths) else 16
            col_nodes.append(f'<col min="{idx}" max="{idx}" width="{width}" customWidth="1"/>')
        width_xml = f"<cols>{''.join(col_nodes)}</cols>"

    sheet_rows = []
    sheet_rows.append(
        '<row r="1" ht="24" customHeight="1">'
        + "".join(excel_cell(value, 1, idx, 1) for idx, value in enumerate(headers, start=1))
        + "</row>"
    )
    for row_number, row in enumerate(rows, start=2):
        normalized = list(row)[:column_count] + [None] * max(0, column_count - len(row))
        sheet_rows.append(
            f'<row r="{row_number}">'
            + "".join(excel_cell(value, row_number, idx, 0) for idx, value in enumerate(normalized, start=1))
            + "</row>"
        )

    dimension = f"A1:{excel_column_name(column_count)}{max(len(rows) + 1, 1)}"
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        f'<dimension ref="{dimension}"/>'
        f"{width_xml}"
        '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
        '<sheetFormatPr defaultRowHeight="18"/>'
        f"<sheetData>{''.join(sheet_rows)}</sheetData>"
        '<autoFilter ref="' + dimension + '"/>'
        "</worksheet>"
    )

def build_excel_workbook(sheets):
    content_types = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
        '<Default Extension="xml" ContentType="application/xml"/>',
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>',
        '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>',
    ]
    for index in range(1, len(sheets) + 1):
        content_types.append(f'<Override PartName="/xl/worksheets/sheet{index}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>')
    content_types.append("</Types>")

    workbook_sheets = []
    workbook_rels = []
    for index, sheet in enumerate(sheets, start=1):
        safe_title = html.escape(sheet["title"][:31], quote=True)
        workbook_sheets.append(f'<sheet name="{safe_title}" sheetId="{index}" r:id="rId{index}"/>')
        workbook_rels.append(
            f'<Relationship Id="rId{index}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{index}.xml"/>'
        )
    workbook_rels.append(
        f'<Relationship Id="rId{len(sheets) + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
    )

    workbook_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        "<sheets>" + "".join(workbook_sheets) + "</sheets>"
        "</workbook>"
    )
    rels_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
        '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'
        "</Relationships>"
    )
    workbook_rels_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + "".join(workbook_rels)
        + "</Relationships>"
    )
    styles_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts>'
        '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF4B2E42"/><bgColor indexed="64"/></patternFill></fill></fills>'
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
        '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>'
        '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
        "</styleSheet>"
    )
    created = iso_now() + "Z"
    core_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
        'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" '
        'xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
        "<dc:creator>Game Services Admin</dc:creator>"
        "<dc:title>Game Services Operations Export</dc:title>"
        f'<dcterms:created xsi:type="dcterms:W3CDTF">{created}</dcterms:created>'
        f'<dcterms:modified xsi:type="dcterms:W3CDTF">{created}</dcterms:modified>'
        "</cp:coreProperties>"
    )
    app_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" '
        'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">'
        "<Application>Game Services</Application>"
        "</Properties>"
    )

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", "".join(content_types))
        archive.writestr("_rels/.rels", rels_xml)
        archive.writestr("xl/workbook.xml", workbook_xml)
        archive.writestr("xl/_rels/workbook.xml.rels", workbook_rels_xml)
        archive.writestr("xl/styles.xml", styles_xml)
        archive.writestr("docProps/core.xml", core_xml)
        archive.writestr("docProps/app.xml", app_xml)
        for index, sheet in enumerate(sheets, start=1):
            archive.writestr(
                f"xl/worksheets/sheet{index}.xml",
                excel_sheet_xml(sheet["title"], sheet["headers"], sheet["rows"], sheet.get("widths")),
            )
    return buffer.getvalue()

def export_operations_excel(cursor):
    cursor.execute("SELECT COUNT(*) FROM games")
    total_games = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM games WHERE is_active = 1")
    active_games = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM packages")
    total_packages = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM packages WHERE is_active = 1")
    active_packages = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM orders")
    total_orders = cursor.fetchone()[0]
    cursor.execute("SELECT COALESCE(SUM(final_price), 0) FROM orders WHERE status != 'cancelled'")
    gross_revenue = round(float(cursor.fetchone()[0] or 0), 2)
    cursor.execute("SELECT COUNT(*) FROM slip_checks")
    slip_checks = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM slip_checks WHERE status = 'verified'")
    verified_slips = cursor.fetchone()[0]

    summary_rows = [
        ["Export time", iso_now()],
        ["Database", str(DATABASE_FILE)],
        ["Total games", total_games],
        ["Active games", active_games],
        ["Total packages", total_packages],
        ["Active packages", active_packages],
        ["Total orders", total_orders],
        ["Non-cancelled revenue", gross_revenue],
        ["Slip checks", slip_checks],
        ["Verified slips", verified_slips],
    ]

    cursor.execute("SELECT * FROM orders ORDER BY created_at DESC")
    order_rows = cursor.fetchall()
    orders_rows = [
        [
            row["id"],
            row["created_at"],
            row["updated_at"],
            row["game_name"],
            row["package_name"],
            row["platform"],
            row["price"],
            row["discount_amount"],
            row["final_price"],
            row["coupon_code"],
            row["status"],
            "yes" if row["slip_verified"] else "no",
            row["slip_url"],
            row["contact_method"],
            row["customer_note"],
        ]
        for row in order_rows
    ]

    cursor.execute("SELECT * FROM games ORDER BY is_active DESC, name")
    game_rows = cursor.fetchall()
    games_rows = [
        [
            row["id"],
            row["name"],
            row["slug"],
            row["category_name"],
            row["category_slug"],
            "yes" if row["supported_android"] else "no",
            "yes" if row["supported_ios"] else "no",
            row["warranty_days"],
            "yes" if row["is_featured"] else "no",
            "yes" if row["is_active"] else "no",
            row["catalog_type"] if "catalog_type" in row.keys() else "",
            row["play_store"] if "play_store" in row.keys() else "",
            row["play_image"] if "play_image" in row.keys() else "",
            row["description"],
        ]
        for row in game_rows
    ]

    cursor.execute("""
        SELECT p.*, g.name AS game_name
        FROM packages p
        LEFT JOIN games g ON g.id = p.game_id
        ORDER BY p.is_active DESC, g.name, p.name
    """)
    package_rows = cursor.fetchall()
    packages_rows = [
        [
            row["id"],
            row["game_name"],
            row["game_id"],
            row["name"],
            row["price"],
            row["badge"],
            "yes" if row["is_recommended"] else "no",
            "yes" if row["is_active"] else "no",
            row["highlights"],
            row["delivery"],
            row["support"],
            row["guarantee"],
            row["audience"],
            row["admin_notes"],
            row["description"],
        ]
        for row in package_rows
    ]

    cursor.execute("SELECT * FROM slip_checks ORDER BY created_at DESC")
    slip_rows = cursor.fetchall()
    slips_rows = [
        [
            row["id"],
            row["created_at"],
            row["status"],
            row["expected_amount"],
            row["file_ext"],
            row["width"],
            row["height"],
            row["file_hash"],
            row["slip_url"],
            row["note"],
        ]
        for row in slip_rows
    ]

    cursor.execute("SELECT * FROM coupons ORDER BY created_at DESC")
    coupon_rows = cursor.fetchall()
    coupons_rows = [
        [
            row["id"],
            row["code"],
            row["discount_type"],
            row["discount_value"],
            row["min_spend"],
            "yes" if row["is_active"] else "no",
            row["created_at"],
        ]
        for row in coupon_rows
    ]

    sheets = [
        {
            "title": "Summary",
            "headers": ["Metric", "Value"],
            "rows": summary_rows,
            "widths": [28, 72],
        },
        {
            "title": "Orders",
            "headers": ["Order ID", "Created", "Updated", "Game", "Package", "Platform", "Price", "Discount", "Final", "Coupon", "Status", "Slip OK", "Slip URL", "Contact", "Customer Note"],
            "rows": orders_rows,
            "widths": [24, 22, 22, 28, 24, 14, 12, 12, 12, 16, 16, 10, 40, 24, 44],
        },
        {
            "title": "Games",
            "headers": ["Game ID", "Name", "Slug", "Category", "Category Slug", "Android", "iOS", "Warranty", "Featured", "Active", "Catalog Type", "Play Store", "Image", "Description"],
            "rows": games_rows,
            "widths": [28, 32, 32, 22, 22, 10, 10, 12, 12, 10, 16, 48, 48, 60],
        },
        {
            "title": "Packages",
            "headers": ["Package ID", "Game", "Game ID", "Name", "Price", "Badge", "Recommended", "Active", "Highlights", "Delivery", "Support", "Guarantee", "Audience", "Admin Notes", "Description"],
            "rows": packages_rows,
            "widths": [34, 30, 28, 24, 12, 16, 14, 10, 50, 28, 28, 28, 36, 42, 54],
        },
        {
            "title": "Slip Checks",
            "headers": ["ID", "Created", "Status", "Expected Amount", "File Ext", "Width", "Height", "File Hash", "Slip URL", "Note"],
            "rows": slips_rows,
            "widths": [28, 22, 16, 18, 12, 10, 10, 64, 42, 50],
        },
        {
            "title": "Coupons",
            "headers": ["ID", "Code", "Type", "Value", "Min Spend", "Active", "Created"],
            "rows": coupons_rows,
            "widths": [24, 20, 16, 14, 14, 10, 22],
        },
    ]
    return build_excel_workbook(sheets)

def export_netlify_deploy(games_data):
    deploy_dir = ROOT / "netlify-deploy"
    build_dir = ROOT / "dist"
    if (ROOT / "package.json").exists():
        npm_cmd = _shutil_for_which.which("npm.cmd") or _shutil_for_which.which("npm")
        if not npm_cmd:
            raise RuntimeError("npm is required to build the React/Tailwind frontend")
        build_env = os.environ.copy()
        node_cmd = _shutil_for_which.which("node")
        if node_cmd:
            build_env["PATH"] = str(Path(node_cmd).parent) + os.pathsep + build_env.get("PATH", "")
        subprocess.run([npm_cmd, "run", "build"], cwd=ROOT, check=True, env=build_env)

    if build_dir.exists():
        for stale_name in ("assets", "frontend"):
            stale_path = deploy_dir / stale_name
            if stale_path.exists():
                shutil.rmtree(stale_path)
        for item in build_dir.iterdir():
            target = deploy_dir / item.name
            if item.is_dir():
                if target.exists():
                    shutil.rmtree(target)
                shutil.copytree(item, target)
            else:
                shutil.copy2(item, target)
    else:
        (deploy_dir / "frontend" / "styles").mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / "frontend" / "styles" / "theme.css", deploy_dir / "frontend" / "styles" / "theme.css")
    (deploy_dir / "runtime-config.js").write_text(build_runtime_config_js(), encoding="utf-8")
    game_uploads_dir = UPLOADS_DIR / "game-images"
    if game_uploads_dir.exists():
        shutil.copytree(game_uploads_dir, deploy_dir / "uploads" / "game-images", dirs_exist_ok=True)
    if (ROOT / "netlify.toml").exists():
        shutil.copy2(ROOT / "netlify.toml", deploy_dir / "netlify.toml")

    index_source = build_dir / "index.html" if (build_dir / "index.html").exists() else ROOT / "index.html"
    index_html = index_source.read_text(encoding="utf-8")
    static_json = json.dumps(games_data, ensure_ascii=False, separators=(",", ":"))
    static_script = f'<script id="static-games-data">window.STATIC_GAMES = {static_json};</script>'
    marker = '<script id="static-games-data">window.STATIC_GAMES = window.STATIC_GAMES || null;</script>'
    if marker in index_html:
        index_html = index_html.replace(marker, static_script, 1)
    else:
        index_html = index_html.replace("</head>", f"    {static_script}\n  </head>", 1)

    (deploy_dir / "index.html").write_text(index_html, encoding="utf-8")
    manifest = {
        "exportedAt": iso_now(),
        "gameCount": len(games_data),
        "games": [
            {
                "id": game.get("id"),
                "name": game.get("name"),
                "slug": game.get("slug"),
                "isActive": bool(game.get("isActive")),
            }
            for game in games_data
        ],
    }
    (deploy_dir / "deploy-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    zip_path = ROOT / "netlify-deploy-latest.zip"
    if zip_path.exists():
        zip_path.unlink()
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
        for file_path in deploy_dir.rglob("*"):
            if file_path.is_file():
                archive.write(file_path, file_path.relative_to(deploy_dir))

    return deploy_dir, zip_path

def build_runtime_config_js():
    default_api_base_url = "https://game-services-hwcy.onrender.com"
    config = {
        "apiBaseUrl": PUBLIC_API_BASE_URL or default_api_base_url,
    }
    config_json = json.dumps(config, ensure_ascii=False, separators=(",", ":"))
    return (
        "(function(){"
        f"window.APP_CONFIG=Object.assign({{}},{config_json},window.APP_CONFIG||{{}});"
        "if(!window.API_BASE_URL&&window.APP_CONFIG.apiBaseUrl){"
        "window.API_BASE_URL=window.APP_CONFIG.apiBaseUrl;"
        "}"
        "})();\n"
    )

def order_view(order_row):
    payload = dict(order_row)
    payload["gameName"] = payload.get("game_name")
    payload["packageName"] = payload.get("package_name")
    payload["finalPrice"] = payload.get("final_price")
    payload["discountAmount"] = payload.get("discount_amount")
    payload["slipUrl"] = payload.get("slip_url")
    payload["slipVerified"] = bool(payload.get("slip_verified"))
    payload["createdAt"] = payload.get("created_at")
    return payload

def risk_level(game_row):
    platform_count = int(bool(game_row["supported_android"])) + int(bool(game_row["supported_ios"]))
    if game_row["warranty_days"] >= 7 and game_row["is_featured"] and platform_count == 2:
        return "low"
    if game_row["warranty_days"] >= 5 and platform_count >= 1:
        return "medium"
    return "high"

def player_profile(game_row):
    category = str(game_row["category_name"] or "").lower()
    name = str(game_row["name"] or "").lower()
    if "rpg" in category or "rpg" in name:
        return "สายฟาร์ม / สายปั้นตัวละคร"
    if "idle" in category or "idle" in name or "afk" in name:
        return "สาย AFK / เล่นสั้นแต่ต่อเนื่อง"
    return "ผู้เล่นทั่วไป / ทดลองเกมใหม่"

# --- Broadcast Events ---

def broadcast_event(event_type, payload):
    message = f"event: {event_type}\ndata: {json.dumps({'type': event_type, 'payload': payload, 'timestamp': datetime.now().isoformat()}, ensure_ascii=False)}\n\n".encode("utf-8")
    with EVENT_LOCK:
        dead_clients = []
        for handler in list(EVENT_CLIENTS):
            try:
                handler.wfile.write(message)
                handler.wfile.flush()
            except (BrokenPipeError, ConnectionResetError, ValueError):
                dead_clients.append(handler)
        for handler in dead_clients:
            if handler in EVENT_CLIENTS:
                EVENT_CLIENTS.remove(handler)

# --- Notification Channels ---

def send_telegram_message(message):
    if not telegram_bot_token or not telegram_chat_id:
        return False
    try:
        url = f"https://api.telegram.org/bot{telegram_bot_token}/sendMessage"
        payload = {
            "chat_id": telegram_chat_id,
            "text": message,
            "parse_mode": "HTML",
            "disable_web_page_preview": True
        }
        if requests:
            response = requests.post(url, json=payload, timeout=10)
            return response.status_code == 200
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=10) as response:
            return response.status == 200
    except Exception as e:
        print(f"Telegram notify error: {e}")
        return False

def send_line_notify(message):
    if not line_notify_token:
        return False
    try:
        url = "https://notify-api.line.me/api/notify"
        headers = {
            "Authorization": f"Bearer {line_notify_token}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        payload = {"message": message}
        if requests:
            response = requests.post(url, data=payload, headers=headers, timeout=10)
            return response.status_code == 200
        data = urllib.parse.urlencode(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=10) as response:
            return response.status == 200
    except Exception as e:
        print(f"LINE Notify error: {e}")
        return False

def backend_absolute_url(path):
    value = str(path or "").strip()
    if not value:
        return ""
    if value.startswith(("http://", "https://")):
        return value
    if PUBLIC_API_BASE_URL:
        return PUBLIC_API_BASE_URL + "/" + value.lstrip("/")
    return value

def admin_order_url(order_id=""):
    if not ADMIN_ENTRY_URL:
        return ""
    query = f"?order={urllib.parse.quote(str(order_id))}" if order_id else ""
    return f"{ADMIN_ENTRY_URL}/admin.html{query}"

def notify_operations(title, lines, action_url=""):
    safe_lines = [escape_notify(line) for line in lines if str(line or "").strip()]
    message = f"<b>{escape_notify(title)}</b>"
    if safe_lines:
        message += "\n" + "\n".join(safe_lines)
    if action_url:
        message += f'\n<a href="{html.escape(action_url, quote=True)}">Open admin</a>'
    telegram_ok = send_telegram_message(message)
    line_ok = send_line_notify(f"{title}\n" + "\n".join(str(line) for line in lines if str(line or "").strip()))
    return {"telegram": telegram_ok, "line": line_ok}

def notify_order_created(order_id, game_name, package_name, price, discount, final_price, platform, coupon_code, slip_url, contact_method):
    slip_text = "Slip attached, waiting for admin review" if slip_url else "No slip attached yet"
    return notify_operations(
        f"New order: {order_id}",
        [
            f"Game: {game_name}",
            f"Package: {package_name}",
            f"Regular price: {price} THB",
            f"Discount: {discount} THB",
            f"Final price: {final_price} THB",
            f"Platform: {platform}",
            f"Coupon: {coupon_code or '-'}",
            f"Slip: {slip_text}",
            f"Slip file: {backend_absolute_url(slip_url) or '-'}",
            f"Contact: {contact_method}",
            f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        ],
        admin_order_url(order_id),
    )

def notify_slip_uploaded(check_id, amount_expected, slip_url, image_info):
    return notify_operations(
        f"Slip uploaded: {check_id}",
        [
            f"Expected amount: {amount_expected} THB",
            f"Image: {image_info.get('width')}x{image_info.get('height')}",
            f"Slip file: {backend_absolute_url(slip_url)}",
            "Status: needs admin amount check",
        ],
        admin_order_url(),
    )

def notify_order_status_changed(order_row, status):
    return notify_operations(
        f"Order status updated: {order_row['id']}",
        [
            f"Status: {status}",
            f"Game: {order_row['game_name']}",
            f"Package: {order_row['package_name']}",
            f"Final price: {order_row['final_price']} THB",
            f"Platform: {order_row['platform']}",
        ],
        admin_order_url(order_row["id"]),
    )

# --- Admin Auth Verification ---

def get_client_ip(handler):
    forwarded = handler.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",", 1)[0].strip()
    return handler.client_address[0] if handler.client_address else "unknown"

def is_login_limited(ip):
    now = time.time()
    with LOGIN_LOCK:
        attempts = [stamp for stamp in LOGIN_ATTEMPTS.get(ip, []) if now - stamp < 900]
        LOGIN_ATTEMPTS[ip] = attempts
        return len(attempts) >= 8

def record_failed_login(ip):
    now = time.time()
    with LOGIN_LOCK:
        attempts = [stamp for stamp in LOGIN_ATTEMPTS.get(ip, []) if now - stamp < 900]
        attempts.append(now)
        LOGIN_ATTEMPTS[ip] = attempts

def clear_login_attempts(ip):
    with LOGIN_LOCK:
        LOGIN_ATTEMPTS.pop(ip, None)

def is_order_limited(ip):
    now = time.time()
    with ORDER_LOCK:
        attempts = [stamp for stamp in ORDER_ATTEMPTS.get(ip, []) if now - stamp < 600]
        if len(attempts) >= 5:
            return True
        attempts.append(now)
        ORDER_ATTEMPTS[ip] = attempts
        return False

def is_upload_limited(ip):
    now = time.time()
    with UPLOAD_LOCK:
        # Limit to 10 uploads per 15 minutes
        attempts = [stamp for stamp in UPLOAD_ATTEMPTS.get(ip, []) if now - stamp < 900]
        if len(attempts) >= 10:
            return True
        attempts.append(now)
        UPLOAD_ATTEMPTS[ip] = attempts
        return False

def get_cookie_value(handler, name):
    raw_cookie = handler.headers.get("Cookie", "")
    if not raw_cookie:
        return ""
    jar = cookies.SimpleCookie()
    try:
        jar.load(raw_cookie)
    except cookies.CookieError:
        return ""
    morsel = jar.get(name)
    return morsel.value if morsel else ""

def build_session_cookie(token, max_age=None):
    max_age = max_age if max_age is not None else SESSION_HOURS * 60 * 60
    cookie = cookies.SimpleCookie()
    cookie[SESSION_COOKIE] = token
    cookie[SESSION_COOKIE]["path"] = "/"
    cookie[SESSION_COOKIE]["httponly"] = True
    cookie[SESSION_COOKIE]["samesite"] = os.getenv("COOKIE_SAMESITE", "Strict")
    cookie[SESSION_COOKIE]["max-age"] = str(max_age)
    if os.getenv("COOKIE_SECURE", "0") == "1":
        cookie[SESSION_COOKIE]["secure"] = True
    return cookie.output(header="").strip()

def get_admin_token(handler, body=None, query=None):
    authorization = handler.headers.get("Authorization", "")
    if authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    if handler.headers.get("x-admin-key"):
        return handler.headers.get("x-admin-key", "").strip()
    if query and query.get("token"):
        return str(query.get("token", [""])[0]).strip()
    cookie_token = get_cookie_value(handler, SESSION_COOKIE)
    if cookie_token:
        return cookie_token.strip()
    if body:
        return str(body.get("adminKey", "")).strip()
    return ""

def require_admin(handler, query=None, body=None):
    supplied = get_admin_token(handler, body=body, query=query)
    if ADMIN_KEY and hmac.compare_digest(supplied, ADMIN_KEY):
        return True

    if not supplied:
        return False

    conn = get_db()
    cursor = conn.cursor()
    supplied_hash = hash_admin_session_token(supplied)
    cursor.execute("SELECT id, token, token_expires_at FROM admins WHERE token IN (?, ?)", (supplied, supplied_hash))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return False

    expires_at = parse_iso(row["token_expires_at"])
    if not expires_at or expires_at <= utc_now():
        cursor.execute("UPDATE admins SET token = NULL, token_expires_at = NULL WHERE id = ?", (row["id"],))
        conn.commit()
        conn.close()
        return False

    ok = verify_admin_session_token(supplied, row["token"])
    conn.close()
    return ok

def revoke_admin_session_token(token):
    if not token:
        return
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE admins SET token = NULL, token_expires_at = NULL WHERE token IN (?, ?)",
        (token, hash_admin_session_token(token)),
    )
    conn.commit()
    conn.close()

def normalize_items(value):
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        return [item.strip() for item in value.replace(",", "\n").splitlines() if item.strip()]
    return []

def to_float(value, default=0.0):
    try:
        number = float(value)
        return number if number >= 0 else default
    except (TypeError, ValueError):
        return default

def clamp_text(value, max_length):
    return str(value or "").strip()[:max_length]

def calculate_coupon(cursor, code, price):
    code = str(code or "").strip().upper()
    if not code:
        return None, 0.0, price

    cursor.execute("SELECT * FROM coupons WHERE code = ? AND is_active = 1", (code,))
    row = cursor.fetchone()
    if not row:
        return None, 0.0, price

    coupon = dict(row)
    if price < float(coupon["min_spend"] or 0):
        return None, 0.0, price

    discount = 0.0
    if coupon["discount_type"] == "fixed":
        discount = float(coupon["discount_value"] or 0)
    elif coupon["discount_type"] == "percentage":
        discount = price * (float(coupon["discount_value"] or 0) / 100.0)

    discount = min(max(discount, 0.0), price)
    return coupon, discount, price - discount

def create_order_id():
    return f"ORD-{utc_now().strftime('%Y%m%d-%H%M%S')}-{secrets.token_hex(2).upper()}"

def escape_notify(value):
    return html.escape(str(value or ""), quote=False)

def parse_data_url_image(image_data, validate_shape=True):
    if not isinstance(image_data, str) or "," not in image_data:
        raise ValueError("invalid-data-url")

    header, encoded = image_data.split(",", 1)
    header = header.lower()
    allowed = {
        "image/png": ("png", b"\x89PNG\r\n\x1a\n"),
        "image/jpeg": ("jpg", b"\xff\xd8\xff"),
        "image/webp": ("webp", b"RIFF"),
    }
    matched = next(((mime, ext, magic) for mime, (ext, magic) in allowed.items() if mime in header), None)
    if not matched:
        raise ValueError("unsupported-image-type")

    _mime, file_ext, magic = matched
    img_bytes = base64.b64decode(encoded, validate=True)
    if len(img_bytes) > MAX_SLIP_BYTES:
        raise ValueError("image-too-large")
    if len(img_bytes) < 8 * 1024:
        raise ValueError("image-too-small")
    if not img_bytes.startswith(magic):
        raise ValueError("image-signature-mismatch")
    width, height = get_image_size(file_ext, img_bytes)
    if validate_shape:
        validate_slip_image_shape(width, height)
    return file_ext, img_bytes, {"width": width, "height": height}

def get_image_size(file_ext, img_bytes):
    if file_ext == "png":
        if len(img_bytes) < 24 or img_bytes[12:16] != b"IHDR":
            raise ValueError("invalid-png")
        return struct.unpack(">II", img_bytes[16:24])

    if file_ext == "jpg":
        return get_jpeg_size(img_bytes)

    if file_ext == "webp":
        return get_webp_size(img_bytes)

    raise ValueError("unsupported-image-type")

def get_jpeg_size(img_bytes):
    i = 2
    size = len(img_bytes)
    while i + 9 < size:
        if img_bytes[i] != 0xFF:
            i += 1
            continue
        marker = img_bytes[i + 1]
        i += 2
        if marker in (0xD8, 0xD9):
            continue
        if i + 2 > size:
            break
        segment_length = struct.unpack(">H", img_bytes[i:i + 2])[0]
        if segment_length < 2 or i + segment_length > size:
            break
        if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
            height = struct.unpack(">H", img_bytes[i + 3:i + 5])[0]
            width = struct.unpack(">H", img_bytes[i + 5:i + 7])[0]
            return width, height
        i += segment_length
    raise ValueError("invalid-jpeg")

def get_webp_size(img_bytes):
    if len(img_bytes) < 30 or img_bytes[:4] != b"RIFF" or img_bytes[8:12] != b"WEBP":
        raise ValueError("invalid-webp")
    chunk = img_bytes[12:16]
    if chunk == b"VP8X" and len(img_bytes) >= 30:
        width = 1 + int.from_bytes(img_bytes[24:27], "little")
        height = 1 + int.from_bytes(img_bytes[27:30], "little")
        return width, height
    if chunk == b"VP8 " and len(img_bytes) >= 30:
        width = struct.unpack("<H", img_bytes[26:28])[0] & 0x3FFF
        height = struct.unpack("<H", img_bytes[28:30])[0] & 0x3FFF
        return width, height
    if chunk == b"VP8L" and len(img_bytes) >= 25:
        bits = int.from_bytes(img_bytes[21:25], "little")
        width = (bits & 0x3FFF) + 1
        height = ((bits >> 14) & 0x3FFF) + 1
        return width, height
    raise ValueError("invalid-webp")

def validate_slip_image_shape(width, height):
    if width < 300 or height < 300:
        raise ValueError("image-resolution-too-small")
    if width > 6000 or height > 6000:
        raise ValueError("image-resolution-too-large")
    ratio = max(width, height) / max(1, min(width, height))
    if ratio > 4.2:
        raise ValueError("image-aspect-ratio-invalid")

def parse_game_image_data_url(image_data):
    file_ext, img_bytes, metadata = parse_data_url_image(image_data, validate_shape=False)
    if len(img_bytes) > MAX_GAME_IMAGE_BYTES:
        raise ValueError("image-too-large")
    width = metadata["width"]
    height = metadata["height"]
    if width < 240 or height < 160:
        raise ValueError("image-resolution-too-small")
    if width > 6000 or height > 6000:
        raise ValueError("image-resolution-too-large")
    return file_ext, img_bytes, metadata

# --- Handler ---

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        dist_path = ROOT / "dist"
        serve_dir = str(dist_path) if dist_path.exists() else str(ROOT)
        super().__init__(*args, directory=serve_dir, **kwargs)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "same-origin")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        super().end_headers()

    def _set_cors_headers(self):
        origin = self.headers.get("Origin", "")
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Credentials", "true")
            self.send_header("Vary", "Origin")

    def _send_json(self, status, payload, extra_headers=None):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self._set_cors_headers()
        self.send_header("Access-Control-Allow-Methods", "GET,HEAD,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, x-admin-key, Authorization")
        self.send_header("Cache-Control", "no-store")
        if extra_headers:
            for key, value in extra_headers.items():
                self.send_header(key, value)
        self.end_headers()
        self.wfile.write(data)

    def end_headers(self):
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self._set_cors_headers()
        self.send_header("Access-Control-Allow-Methods", "GET,HEAD,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, x-admin-key, Authorization")
        self.end_headers()

    def _file_content_type(self, file_path):
        suffix = file_path.suffix.lower()
        if suffix in {".html", ".css", ".js", ".mjs", ".json", ".svg"}:
            return {
                ".html": "text/html; charset=utf-8",
                ".css": "text/css; charset=utf-8",
                ".js": "application/javascript; charset=utf-8",
                ".mjs": "application/javascript; charset=utf-8",
                ".json": "application/json; charset=utf-8",
                ".svg": "image/svg+xml",
            }[suffix]
        if suffix in {".png", ".jpg", ".jpeg", ".webp"}:
            return {
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".webp": "image/webp",
            }[suffix]
        return "application/octet-stream"

    def _serve_file(self, file_path):
        suffix = file_path.suffix.lower()
        data = file_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", self._file_content_type(file_path))
        self.send_header("Content-Length", str(len(data)))
        if suffix in {".html"}:
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        else:
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        self._set_cors_headers()
        self.end_headers()
        self.wfile.write(data)

    def _serve_file_head(self, file_path):
        suffix = file_path.suffix.lower()
        self.send_response(200)
        self.send_header("Content-Type", self._file_content_type(file_path))
        self.send_header("Content-Length", str(file_path.stat().st_size))
        if suffix in {".html"}:
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        else:
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        self._set_cors_headers()
        self.end_headers()

    def do_HEAD(self):
        path = urlparse(self.path).path

        if path == "/runtime-config.js":
            data = build_runtime_config_js().encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/javascript; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self._set_cors_headers()
            self.end_headers()
            return

        if path == "/health":
            payload = {
                "success": True,
                "data": {
                    "service": "game-services-backend",
                    "time": iso_now(),
                    "database": DATABASE_FILE.exists(),
                    "publicApiBaseUrl": PUBLIC_API_BASE_URL,
                    "allowedOrigins": sorted(ALLOWED_ORIGINS),
                }
            }
            data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self._set_cors_headers()
            self.end_headers()
            return

        if path.startswith("/uploads/"):
            relative = urllib.parse.unquote(path.removeprefix("/uploads/")).replace("\\", "/")
            if not relative or relative.startswith("/") or ".." in relative.split("/"):
                self.send_response(400)
                self.end_headers()
                return
            file_path = (UPLOADS_DIR / relative).resolve()
            try:
                file_path.relative_to(UPLOADS_DIR)
            except ValueError:
                self.send_response(400)
                self.end_headers()
                return
            if file_path.is_file():
                return self._serve_file_head(file_path)
            self.send_response(404)
            self.end_headers()
            return

        if (ROOT / "dist").exists():
            dist_path = (ROOT / "dist" / path.lstrip("/")).resolve()
            if path in {"/", "/index.html"} and (ROOT / "dist" / "index.html").exists():
                return self._serve_file_head(ROOT / "dist" / "index.html")
            if path in {"/admin", "/admin/", "/admin.html"} and (ROOT / "dist" / "admin.html").exists():
                return self._serve_file_head(ROOT / "dist" / "admin.html")
            try:
                dist_path.relative_to((ROOT / "dist").resolve())
                if dist_path.is_file():
                    return self._serve_file_head(dist_path)
            except ValueError:
                pass

        return super().do_HEAD()

    def do_GET(self):
        path = urlparse(self.path).path
        query = parse_qs(urlparse(self.path).query)

        if path.startswith("/uploads/"):
            relative = urllib.parse.unquote(path.removeprefix("/uploads/")).replace("\\", "/")
            if not relative or relative.startswith("/") or ".." in relative.split("/"):
                return self._send_json(400, {"success": False, "error": "Invalid upload path"})
            file_path = (UPLOADS_DIR / relative).resolve()
            try:
                file_path.relative_to(UPLOADS_DIR)
            except ValueError:
                return self._send_json(400, {"success": False, "error": "Invalid upload path"})
            if not file_path.is_file():
                return self._send_json(404, {"success": False, "error": "File not found"})
            return self._serve_file(file_path)

        if path == "/runtime-config.js":
            data = build_runtime_config_js().encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/javascript; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(data)
            return
        if path == "/robots.txt":
            robot_txt = "User-agent: *\nAllow: /\nSitemap: https://game-services.web.app/sitemap.xml\n"
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Cache-Control", "public, max-age=86400")
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(robot_txt.encode("utf-8"))
            return

        if path == "/sitemap.xml":
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM games WHERE is_active = 1")
            active_games = cursor.fetchall()
            conn.close()

            sitemap_xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
            sitemap_xml.append('  <url>\n    <loc>https://game-services.web.app/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>')

            for g in active_games:
                sitemap_xml.append(f'  <url>\n    <loc>https://game-services.web.app/#{g["id"]}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>')

            sitemap_xml.append('</urlset>')

            self.send_response(200)
            self.send_header("Content-Type", "application/xml; charset=utf-8")
            self.send_header("Cache-Control", "public, max-age=86400")
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write("\n".join(sitemap_xml).encode("utf-8"))
            return


        conn = get_db()

        # 1. API: Get Public Packages
        if path == "/api/public-packages":
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM packages WHERE is_active = 1")
            rows = cursor.fetchall()
            public_packages = [public_package_view(row) for row in rows]
            conn.close()
            return self._send_json(200, {"success": True, "data": public_packages})

        # 2. API: Get Public Games & Packages
        if path == "/api/games":
            cursor = conn.cursor()
            games_data = load_public_games(cursor)
            conn.close()
            return self._send_json(200, {"success": True, "data": games_data})

        # 3. API: Get Posts
        if path == "/api/posts":
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM posts WHERE is_active = 1 ORDER BY created_at DESC")
            rows = cursor.fetchall()
            posts_data = [dict(row) for row in rows]
            conn.close()
            return self._send_json(200, {"success": True, "data": posts_data})

        # 4. API: Validate Coupon Code
        if path == "/api/coupons/validate":
            code = query.get("code", [""])[0].strip().upper()
            price_val = to_float(query.get("price", [0])[0])

            cursor = conn.cursor()
            coupon, discount, final_price = calculate_coupon(cursor, code, price_val)
            conn.close()

            if not coupon:
                return self._send_json(400, {"success": False, "error": "ไม่พบรหัสคูปองนี้ หรือคูปองหมดอายุแล้ว"})

            return self._send_json(200, {
                "success": True,
                "data": {
                    "code": coupon["code"],
                    "discountType": coupon["discount_type"],
                    "discountValue": coupon["discount_value"],
                    "discountAmount": discount,
                    "finalPrice": final_price
                }
            })

        # 5. API: Track Order Status
        if path == "/api/orders/track":
            order_id = query.get("orderId", [""])[0].strip()
            cursor = conn.cursor()
            cursor.execute("SELECT id, game_name, package_name, price, final_price, status, created_at FROM orders WHERE id = ?", (order_id,))
            row = cursor.fetchone()
            conn.close()
            if not row:
                return self._send_json(404, {"success": False, "error": "ไม่พบเลขออเดอร์นี้ในระบบ"})
            return self._send_json(200, {"success": True, "data": order_view(row)})

        # 6. Admin API: Get Configs / Lists
        if path == "/api/admin-packages":
            if not require_admin(self, query=query):
                conn.close()
                return self._send_json(403, {"success": False, "error": "Forbidden"})
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM packages")
            rows = cursor.fetchall()
            admin_packages = [admin_package_view(row) for row in rows]
            conn.close()
            return self._send_json(200, {"success": True, "data": admin_packages})

        if path == "/api/admin-posts":
            if not require_admin(self, query=query):
                conn.close()
                return self._send_json(403, {"success": False, "error": "Forbidden"})
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM posts ORDER BY created_at DESC")
            rows = cursor.fetchall()
            posts_data = [dict(row) for row in rows]
            conn.close()
            return self._send_json(200, {"success": True, "data": posts_data})

        if path == "/api/admin-orders":
            if not require_admin(self, query=query):
                conn.close()
                return self._send_json(403, {"success": False, "error": "Forbidden"})
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM orders ORDER BY created_at DESC")
            rows = cursor.fetchall()
            orders_data = [order_view(row) for row in rows]
            conn.close()
            return self._send_json(200, {"success": True, "data": orders_data})

        if path == "/api/admin-coupons":
            if not require_admin(self, query=query):
                conn.close()
                return self._send_json(403, {"success": False, "error": "Forbidden"})
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM coupons ORDER BY created_at DESC")
            rows = cursor.fetchall()
            coupons_data = [dict(row) for row in rows]
            conn.close()
            return self._send_json(200, {"success": True, "data": coupons_data})

        if path == "/api/admin-dashboard":
            if not require_admin(self, query=query):
                conn.close()
                return self._send_json(403, {"success": False, "error": "Forbidden"})

            cursor = conn.cursor()
            cursor.execute("SELECT * FROM games")
            game_rows = cursor.fetchall()

            top_games = []
            for g in game_rows:
                cursor.execute("SELECT COUNT(*) FROM orders WHERE game_name = ?", (g["name"],))
                lead_count = cursor.fetchone()[0]

                cursor.execute("SELECT * FROM packages WHERE game_id = ?", (g["id"],))
                pkg_rows = cursor.fetchall()

                top_games.append({
                    "id": g["id"],
                    "name": g["name"],
                    "category": g["category_name"],
                    "leadCount": lead_count,
                    "packageCount": len(pkg_rows),
                    "players": player_profile(g),
                    "risk": risk_level(g),
                    "status": "active" if g["is_active"] else "inactive",
                    "isFeatured": bool(g["is_featured"]),
                    "platformCount": int(bool(g["supported_android"])) + int(bool(g["supported_ios"])),
                    "warrantyDays": g["warranty_days"]
                })

            top_games = sorted(top_games, key=lambda item: (item["risk"] != "low", item["name"]))

            cursor.execute("SELECT COUNT(*) FROM games")
            total_games = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM packages")
            total_pkgs = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM packages WHERE is_active=1")
            active_pkgs = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM orders")
            total_orders = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM orders WHERE status='pending'")
            new_orders = cursor.fetchone()[0]

            cursor.execute("SELECT * FROM orders ORDER BY created_at DESC LIMIT 10")
            recent_orders = [order_view(r) for r in cursor.fetchall()]

            cursor.execute("SELECT * FROM categories")
            categories_list = [dict(r) for r in cursor.fetchall()]

            games_view_list = []
            for g in game_rows:
                cursor.execute("SELECT * FROM packages WHERE game_id = ?", (g["id"],))
                packages_list = [admin_package_view(p) for p in cursor.fetchall()]
                games_view_list.append(db_game_view(g, packages_list))

            conn.close()

            return self._send_json(200, {
                "success": True,
                "data": {
                    "summary": {
                        "totalGames": total_games,
                        "activeGames": total_games,
                        "totalPackages": total_pkgs,
                        "activePackages": active_pkgs,
                        "totalLeads": total_orders,
                        "newLeads": new_orders,
                        "totalCategories": len(categories_list),
                    },
                    "topGames": top_games[:6],
                    "riskSummary": top_games[:8],
                    "channelCounts": {"telegram": total_orders},
                    "recentLeads": recent_orders,
                    "categories": categories_list,
                    "games": games_view_list,
                }
            })

        if path == "/api/admin-events":
            if not require_admin(self, query=query):
                conn.close()
                self.send_response(403)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write("Forbidden".encode("utf-8"))
                return
            conn.close()

            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self._set_cors_headers()
            self.end_headers()

            with EVENT_LOCK:
                EVENT_CLIENTS.append(self)

            try:
                ready_event = json.dumps({"type": "ready", "timestamp": "now"}, ensure_ascii=False).encode("utf-8")
                self.wfile.write(b"event: ready\n")
                self.wfile.write(b"data: " + ready_event + b"\n\n")
                self.wfile.flush()
                while True:
                    time.sleep(25)
                    self.wfile.write(b": heartbeat\n\n")
                    self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError, ValueError):
                pass
            finally:
                with EVENT_LOCK:
                    if self in EVENT_CLIENTS:
                        EVENT_CLIENTS.remove(self)
            return

        if path == "/api/admin-backup":
            if not require_admin(self, query=query):
                conn.close()
                return self._send_json(403, {"success": False, "error": "Forbidden"})

            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM games")
            game_count = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM packages")
            package_count = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM orders")
            order_count = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM slip_checks")
            slip_count = cursor.fetchone()[0]

            backup_time = iso_now()
            manifest = {
                "createdAt": backup_time,
                "databaseFile": str(DATABASE_FILE),
                "counts": {
                    "games": game_count,
                    "packages": package_count,
                    "orders": order_count,
                    "slipChecks": slip_count,
                },
            }
            sql_dump = "\n".join(conn.iterdump())
            conn.close()

            buffer = io.BytesIO()
            with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
                archive.writestr("backup-manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2))
                archive.writestr("database.sql", sql_dump)
            data = buffer.getvalue()
            filename = f"game-services-backup-{utc_now().strftime('%Y%m%d-%H%M%S')}.zip"
            self.send_response(200)
            self.send_header("Content-Type", "application/zip")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(data)
            return

        if path == "/api/admin-export-excel":
            if not require_admin(self, query=query):
                conn.close()
                return self._send_json(403, {"success": False, "error": "Forbidden"})

            cursor = conn.cursor()
            data = export_operations_excel(cursor)
            conn.close()
            filename = f"game-services-operations-{utc_now().strftime('%Y%m%d-%H%M%S')}.xlsx"
            self.send_response(200)
            self.send_header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
            self.send_header("Cache-Control", "no-store")
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(data)
            return

        if path == "/health":
            conn.close()
            return self._send_json(200, {
                "success": True,
                "data": {
                    "service": "game-services-backend",
                    "time": iso_now(),
                    "database": DATABASE_FILE.exists(),
                    "publicApiBaseUrl": PUBLIC_API_BASE_URL,
                    "allowedOrigins": sorted(ALLOWED_ORIGINS),
                }
            })

        dist_path = (ROOT / "dist" / path.lstrip("/")).resolve()
        if (ROOT / "dist").exists():
            if path in {"/", "/index.html"} and (ROOT / "dist" / "index.html").exists():
                conn.close()
                return self._serve_file(ROOT / "dist" / "index.html")
            if path in {"/admin", "/admin/", "/admin.html"} and (ROOT / "dist" / "admin.html").exists():
                conn.close()
                return self._serve_file(ROOT / "dist" / "admin.html")
            try:
                dist_path.relative_to((ROOT / "dist").resolve())
                if dist_path.is_file():
                    conn.close()
                    return self._serve_file(dist_path)
            except ValueError:
                pass

        if path == "/":
            self.path = "/index.html"
        elif path in {"/admin", "/admin/"}:
            self.path = "/admin.html"

        conn.close()
        return super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return self._send_json(400, {"success": False, "error": "Invalid Content-Length"})
        if content_length > MAX_JSON_BODY_BYTES:
            return self._send_json(413, {"success": False, "error": "ข้อมูลที่ส่งมีขนาดใหญ่เกินกำหนด"})
        try:
            raw_body = self.rfile.read(content_length).decode("utf-8") or "{}"
        except UnicodeDecodeError:
            return self._send_json(400, {"success": False, "error": "Request body must be UTF-8"})

        try:
            body = json.loads(raw_body)
        except json.JSONDecodeError:
            return self._send_json(400, {"success": False, "error": "Invalid JSON"})

        # Public API: Order Placement (Does not require login)
        if path == "/api/orders":
            client_ip = get_client_ip(self)
            if is_order_limited(client_ip):
                return self._send_json(429, {"success": False, "error": "ส่งคำสั่งซื้อถี่เกินไป กรุณารอสักครู่ (ป้องกันสแปม)"})

            game_id = clamp_text(body.get("gameId"), 80)
            package_id = clamp_text(body.get("packageId"), 80)
            game_name = clamp_text(body.get("gameName"), 160)
            package_name = clamp_text(body.get("packageName"), 160)
            price = to_float(body.get("price", 0))
            platform = clamp_text(body.get("platform"), 20)
            customer_note = clamp_text(body.get("customerNote"), 250)
            contact_method = clamp_text(body.get("contactMethod", "telegram"), 40) or "telegram"
            coupon_code = clamp_text(body.get("couponCode"), 80).upper()
            slip_url = clamp_text(body.get("slipUrl"), 240)
            slip_verified = 1 if body.get("slipVerified") in (1, "1", True, "true") else 0

            if not package_id and (not game_name or not package_name):
                return self._send_json(400, {"success": False, "error": "จำเป็นต้องระบุข้อมูลเกมและแพ็คเกจ"})
            if platform not in {"Android", "iOS"}:
                return self._send_json(400, {"success": False, "error": "กรุณาเลือกระบบ Android หรือ iOS"})

            conn = get_db()
            cursor = conn.cursor()

            if package_id:
                cursor.execute("""
                SELECT p.*, g.name AS game_name
                FROM packages p
                LEFT JOIN games g ON g.id = p.game_id
                WHERE p.id = ? AND p.is_active = 1
                """, (package_id,))
                package_row = cursor.fetchone()
                if not package_row:
                    conn.close()
                    return self._send_json(400, {"success": False, "error": "ไม่พบแพ็คเกจที่เลือก หรือแพ็คเกจถูกปิดใช้งาน"})
                game_name = package_row["game_name"] or game_name
                package_name = package_row["name"]
                price = float(package_row["price"] or price)
            elif price <= 0:
                conn.close()
                return self._send_json(400, {"success": False, "error": "ราคาไม่ถูกต้อง"})

            coupon, discount, final_price = calculate_coupon(cursor, coupon_code, price)
            if coupon_code and not coupon:
                conn.close()
                return self._send_json(400, {"success": False, "error": "คูปองไม่ถูกต้องหรือไม่เข้าเงื่อนไข"})

            new_id = create_order_id()
            for _attempt in range(3):
                try:
                    now = iso_now()
                    cursor.execute("""
                    INSERT INTO orders (id, game_name, package_name, price, discount_amount, final_price, platform, customer_note, contact_method, slip_url, slip_verified, status, coupon_code, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (new_id, game_name, package_name, price, discount, final_price, platform, customer_note, contact_method, slip_url, slip_verified, "pending", coupon_code, now, now))
                    conn.commit()
                    break
                except sqlite3.IntegrityError:
                    new_id = create_order_id()
            else:
                conn.close()
                return self._send_json(500, {"success": False, "error": "ไม่สามารถสร้างเลขออเดอร์ใหม่ได้"})

            conn.close()

            # Trigger Notifications
            telegram_message = f"""
🆕 <b>ออเดอร์ใหม่! [{new_id}]</b>
🎮 เกม: {escape_notify(game_name)}
📦 แพ็คเกจ: {escape_notify(package_name)}
💰 ราคาปกติ: {price} บาท
🎁 ส่วนลด: {discount} บาท
💵 ยอดสุทธิ: {final_price} บาท
📱 ระบบ: {escape_notify(platform)}
📝 คูปอง: {escape_notify(coupon_code or '-')}
🕵️ ตรวจสอบสลิป: {'แนบสลิปแล้ว รอแอดมินตรวจ ✅' if slip_url else 'ยังไม่มีสลิป ⏳'}
📎 ไฟล์สลิป: {escape_notify(slip_url or '-')}
📞 ช่องทางติดต่อ: {escape_notify(contact_method)}
⏰ เวลา: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            """.strip()

            notify_order_created(
                new_id,
                game_name,
                package_name,
                price,
                discount,
                final_price,
                platform,
                coupon_code,
                slip_url,
                contact_method,
            )

            broadcast_event("order.created", {"id": new_id, "gameName": game_name})
            return self._send_json(200, {"success": True, "data": {"orderId": new_id}})

        # Public API: Validate & Verify Payment Slip with actual Base64 Image Saving (Feature 2)
        if path == "/api/orders/verify-slip":
            client_ip = get_client_ip(self)
            if is_upload_limited(client_ip):
                return self._send_json(429, {"success": False, "error": "อัปโหลดสลิปถี่เกินไป กรุณารอสักครู่ (ป้องกันสแปม)"})

            image_data = body.get("image", "")
            amount_expected = to_float(body.get("price", 0))

            if not image_data:
                return self._send_json(400, {"success": False, "error": "ไม่พบข้อมูลรูปภาพสลิป"})
            if amount_expected <= 0:
                return self._send_json(400, {"success": False, "error": "ยอดชำระไม่ถูกต้อง กรุณาเลือกแพ็คเกจก่อนอัปโหลดสลิป"})

            slip_file_url = ""
            try:
                file_ext, img_bytes, image_info = parse_data_url_image(image_data)
                file_hash = hashlib.sha256(img_bytes).hexdigest()
                now = iso_now()

                with get_db() as conn:
                    cursor = conn.cursor()
                    cursor.execute("SELECT id, created_at FROM slip_checks WHERE file_hash = ?", (file_hash,))
                    if cursor.fetchone():
                        return self._send_json(409, {"success": False, "error": "สลิปนี้เคยถูกอัปโหลดแล้ว กรุณาใช้สลิปใหม่"})

                uploads_dir = UPLOADS_DIR
                uploads_dir.mkdir(exist_ok=True)

                file_name = f"slip-{secrets.token_hex(8)}.{file_ext}"
                file_path = uploads_dir / file_name

                if CLOUDINARY_URL and cloudinary:
                    try:
                        res = cloudinary.uploader.upload(img_bytes, public_id=file_name.split('.')[0], resource_type="image", folder="game_slips")
                        slip_file_url = res.get("secure_url")
                    except Exception as e:
                        return self._send_json(500, {"success": False, "error": f"อัปโหลดรูปล้มเหลว: {e}"})
                else:
                    with open(file_path, "wb") as f:
                        f.write(img_bytes)
                    slip_file_url = f"/uploads/{file_name}"
                check_id = f"SLIP-{secrets.token_hex(6).upper()}"
                with get_db() as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                    INSERT INTO slip_checks (id, file_hash, expected_amount, file_ext, width, height, status, note, slip_url, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        check_id,
                        file_hash,
                        amount_expected,
                        file_ext,
                        image_info["width"],
                        image_info["height"],
                        "needs_admin_amount_check",
                        "รูปผ่านการตรวจชนิดไฟล์ ขนาด มิติภาพ และ hash กันซ้ำแล้ว รอแอดมินยืนยันยอดจากสลิป",
                        slip_file_url,
                        now
                    ))
                    conn.commit()
            except ValueError as e:
                print(f"Invalid slip image: {e}")
                error_map = {
                    "unsupported-image-type": "รองรับเฉพาะ PNG, JPG หรือ WebP",
                    "image-too-large": "ไฟล์ใหญ่เกินกำหนด 3MB",
                    "image-too-small": "ไฟล์เล็กผิดปกติ กรุณาอัปโหลดสลิปตัวจริง",
                    "image-signature-mismatch": "ชนิดไฟล์ไม่ตรงกับข้อมูลรูปจริง",
                    "image-resolution-too-small": "รูปเล็กเกินไป อ่านรายละเอียดสลิปไม่ได้",
                    "image-resolution-too-large": "รูปใหญ่ผิดปกติ กรุณาอัปโหลดรูปสลิปใหม่",
                    "image-aspect-ratio-invalid": "สัดส่วนรูปผิดปกติ กรุณาอัปโหลดสลิปเต็มภาพ",
                }
                return self._send_json(400, {"success": False, "error": error_map.get(str(e), "ไฟล์สลิปไม่ถูกต้อง")})
            except Exception as e:
                print(f"Error saving slip image: {e}")
                return self._send_json(400, {"success": False, "error": "ตรวจสอบสลิปไม่สำเร็จ กรุณาอัปโหลดรูปใหม่"})
            notify_slip_uploaded(check_id, amount_expected, slip_file_url, image_info)

            return self._send_json(200, {
                "success": True,
                "data": {
                    "transactionId": check_id,
                    "sender": "ผ่านด่านตรวจรูป รอแอดมินยืนยันยอด",
                    "amount": amount_expected,
                    "accepted": True,
                    "verified": False,
                    "slipUrl": slip_file_url,
                    "imageWidth": image_info["width"],
                    "imageHeight": image_info["height"],
                    "amountStatus": "needs_admin_check",
                    "note": "รูปผ่านการตรวจไฟล์จริง/มิติภาพ/hash กันซ้ำแล้ว แต่ยังไม่ยืนยันยอดอัตโนมัติจนกว่าจะต่อ OCR หรือผู้ให้บริการตรวจสลิป"
                }
            })

        # Public API: Admin Login
        if path == "/api/admin/login":
            username = clamp_text(body.get("username"), 80)
            password = str(body.get("password", "")).strip()
            client_ip = get_client_ip(self)

            if is_login_limited(client_ip):
                return self._send_json(429, {"success": False, "error": "พยายามเข้าสู่ระบบถี่เกินไป กรุณารอสักครู่"})
            if not username or not password:
                record_failed_login(client_ip)
                return self._send_json(400, {"success": False, "error": "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน"})

            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM admins WHERE username = ?", (username,))
            admin_row = cursor.fetchone()

            if not admin_row or not verify_password(password, admin_row["password_hash"]):
                conn.close()
                record_failed_login(client_ip)
                return self._send_json(401, {"success": False, "error": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"})

            token = f"token-{secrets.token_urlsafe(32)}"
            stored_token = hash_admin_session_token(token)
            token_expires_at = (utc_now() + timedelta(hours=SESSION_HOURS)).isoformat(timespec="seconds")
            next_password_hash = admin_row["password_hash"]
            if not str(next_password_hash or "").startswith("pbkdf2_sha256$"):
                next_password_hash = hash_password(password)
            cursor.execute("""
            UPDATE admins
            SET token = ?, token_expires_at = ?, last_login_at = ?, password_hash = ?
            WHERE id = ?
            """, (stored_token, token_expires_at, iso_now(), next_password_hash, admin_row["id"]))
            conn.commit()
            conn.close()
            clear_login_attempts(client_ip)

            return self._send_json(
                200,
                {"success": True, "data": {"token": token, "username": username, "expiresAt": token_expires_at}},
                {"Set-Cookie": build_session_cookie(token)}
            )

        if path == "/api/admin/logout":
            revoke_admin_session_token(get_admin_token(self, body=body))
            return self._send_json(
                200,
                {"success": True},
                {"Set-Cookie": build_session_cookie("", max_age=0)}
            )

        # Ensure Admin Authentication for all subsequent APIs
        if not require_admin(self, body=body):
            return self._send_json(403, {"success": False, "error": "Forbidden"})

        conn = get_db()
        cursor = conn.cursor()

        # Admin API: Test Telegram notification channel
        if path == "/api/admin-test-telegram":
            conn.close()
            result = notify_operations(
                "Telegram test from Game Services",
                [
                    "Backend notification channel is connected.",
                    f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                ],
                admin_order_url(),
            )
            if result["telegram"]:
                return self._send_json(200, {"success": True, "data": result})
            return self._send_json(400, {
                "success": False,
                "error": "Telegram is not configured or Telegram API rejected the message",
                "data": result,
            })

        # Admin API: Upload a game preview image from the local admin form
        if path == "/api/admin-upload-image":
            image_data = body.get("image", "")
            original_name = clamp_text(body.get("fileName"), 140) or "game-image"
            try:
                file_ext, img_bytes, metadata = parse_game_image_data_url(image_data)
            except ValueError as exc:
                conn.close()
                return self._send_json(400, {"success": False, "error": str(exc)})

            uploads_dir = UPLOADS_DIR / "game-images"
            uploads_dir.mkdir(parents=True, exist_ok=True)
            safe_stem = "".join(ch if ch.isalnum() else "-" for ch in Path(original_name).stem.lower()).strip("-")[:48] or "game-image"
            file_hash = hashlib.sha256(img_bytes).hexdigest()[:16]
            file_name = f"{safe_stem}-{file_hash}.{file_ext}"
            file_path = uploads_dir / file_name

            if CLOUDINARY_URL and cloudinary:
                try:
                    res = cloudinary.uploader.upload(img_bytes, public_id=file_name.split('.')[0], resource_type="image", folder="game_images")
                    image_url = res.get("secure_url")
                except Exception as e:
                    conn.close()
                    return self._send_json(500, {"success": False, "error": f"อัปโหลดรูปล้มเหลว: {e}"})
            else:
                if not file_path.exists():
                    file_path.write_bytes(img_bytes)
                image_url = f"/uploads/game-images/{file_name}"

            conn.close()
            return self._send_json(200, {
                "success": True,
                "data": {
                    "url": image_url,
                    "width": metadata["width"],
                    "height": metadata["height"],
                    "size": len(img_bytes)
                }
            })

        # Admin API: Save Admin Games
        if path == "/api/admin-games":
            name = str(body.get("name", "")).strip()
            if not name:
                conn.close()
                return self._send_json(400, {"success": False, "error": "name is required"})

            game_id = str(body.get("gameId", "")).strip()
            slug = str(body.get("slug", "")).strip() or name.lower().replace(" ", "-")
            description = str(body.get("description", "")).strip() or None
            category_name = str(body.get("categoryName", "")).strip() or "Mobile"
            category_slug = category_name.lower().replace(" ", "-")
            supported_android = 1 if body.get("supportedAndroid", True) else 0
            supported_ios = 1 if body.get("supportedIos", True) else 0
            warranty_days = max(0, int(to_float(body.get("warrantyDays", 7), 7)))
            warranty_note = str(body.get("warrantyNote", "")).strip() or None
            is_featured = 1 if body.get("isFeatured", False) else 0
            is_active = 1 if body.get("isActive", True) else 0
            reference_title = clamp_text(body.get("referenceTitle"), 260)
            play_image = clamp_text(body.get("playImage"), 600)
            play_store = clamp_text(body.get("playStore"), 600)
            catalog_type = clamp_text(body.get("catalogType"), 20).upper()
            if catalog_type not in ("TD", "RPG"):
                catalog_type = "TD" if "tower" in category_slug or category_slug == "td" else ("RPG" if "rpg" in category_slug or "roguelike" in category_slug else "")

            # Check if game exists
            cursor.execute("SELECT id FROM games WHERE id = ? OR slug = ?", (game_id, slug))
            existing = cursor.fetchone()

            try:
                if not existing:
                    new_db_id = f"game-{secrets.token_hex(4)}"
                    cursor.execute("""
                    INSERT INTO games (id, name, slug, description, category_name, category_slug, supported_android, supported_ios, warranty_days, warranty_note, is_featured, is_active, reference_title, play_image, play_store, catalog_type)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (new_db_id, name, slug, description, category_name, category_slug, supported_android, supported_ios, warranty_days, warranty_note, is_featured, is_active, reference_title, play_image, play_store, catalog_type))
                    game_id = new_db_id
                else:
                    game_id = existing["id"]
                    cursor.execute("""
                    UPDATE games SET name=?, slug=?, description=?, category_name=?, category_slug=?, supported_android=?, supported_ios=?, warranty_days=?, warranty_note=?, is_featured=?, is_active=?, reference_title=?, play_image=?, play_store=?, catalog_type=?
                    WHERE id = ?
                    """, (name, slug, description, category_name, category_slug, supported_android, supported_ios, warranty_days, warranty_note, is_featured, is_active, reference_title, play_image, play_store, catalog_type, game_id))
                conn.commit()
            except sqlite3.IntegrityError:
                conn.close()
                return self._send_json(400, {"success": False, "error": "ข้อมูลซ้ำกันในระบบ หรือ Slug ซ้ำกับเกมอื่น"})

            conn.close()
            broadcast_event("game.updated", {"id": game_id, "name": name})
            return self._send_json(200, {"success": True, "data": {"id": game_id, "name": name}})

        # Admin API: Save Admin Posts
        if path == "/api/admin-posts":
            title = str(body.get("title", "")).strip()
            content = str(body.get("content", "")).strip()
            post_type = str(body.get("type", "announcement")).strip()
            post_id = str(body.get("postId", "")).strip()
            is_active = 1 if body.get("isActive", True) else 0

            if not title or not content:
                conn.close()
                return self._send_json(400, {"success": False, "error": "title and content are required"})

            cursor.execute("SELECT id FROM posts WHERE id = ?", (post_id,))
            existing = cursor.fetchone()

            if existing:
                cursor.execute("""
                UPDATE posts SET title=?, content=?, type=?, is_active=?, updated_at=? WHERE id=?
                """, (title, content, post_type, is_active, datetime.now().isoformat(), post_id))
            else:
                post_id = f"post-{secrets.token_hex(4)}"
                cursor.execute("""
                INSERT INTO posts (id, title, content, type, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (post_id, title, content, post_type, is_active, datetime.now().isoformat(), datetime.now().isoformat()))

            conn.commit()
            conn.close()
            broadcast_event("post.updated", {"id": post_id, "title": title})
            return self._send_json(200, {"success": True, "data": {"id": post_id, "title": title}})

        # Admin API: Edit/Manage Coupons with Integrity Verification (Feature 6)
        if path == "/api/admin-coupons":
            code = str(body.get("code", "")).strip().upper()
            discount_type = str(body.get("discountType", "fixed")).strip()
            discount_value = to_float(body.get("discountValue", 0))
            min_spend = to_float(body.get("minSpend", 0))
            is_active = 1 if body.get("isActive", True) else 0
            coupon_id = str(body.get("couponId", "")).strip()

            if discount_type not in {"fixed", "percentage"}:
                conn.close()
                return self._send_json(400, {"success": False, "error": "ชนิดคูปองไม่ถูกต้อง"})
            if discount_type == "percentage" and discount_value > 100:
                conn.close()
                return self._send_json(400, {"success": False, "error": "คูปองแบบเปอร์เซ็นต์ต้องไม่เกิน 100%"})
            if not code or discount_value <= 0:
                conn.close()
                return self._send_json(400, {"success": False, "error": "รหัสคูปองและมูลค่าส่วนลดต้องถูกต้อง"})

            cursor.execute("SELECT id FROM coupons WHERE id = ?", (coupon_id,))
            existing = cursor.fetchone()

            try:
                if existing:
                    cursor.execute("""
                    UPDATE coupons SET code=?, discount_type=?, discount_value=?, min_spend=?, is_active=? WHERE id=?
                    """, (code, discount_type, discount_value, min_spend, is_active, coupon_id))
                else:
                    coupon_id = f"coupon-{secrets.token_hex(4)}"
                    cursor.execute("""
                    INSERT INTO coupons (id, code, discount_type, discount_value, min_spend, is_active, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (coupon_id, code, discount_type, discount_value, min_spend, is_active, datetime.now().isoformat()))
                conn.commit()
            except sqlite3.IntegrityError:
                conn.close()
                return self._send_json(400, {"success": False, "error": "รหัสคูปองส่วนลดนี้ซ้ำกับคูปองอื่นในฐานข้อมูล"})

            conn.close()
            return self._send_json(200, {"success": True, "data": {"id": coupon_id, "code": code}})

        # Admin API: Save / Edit Packages
        if path == "/api/admin-packages":
            name = str(body.get("name", "")).strip()
            price = to_float(body.get("price", 0))
            items = normalize_items(body.get("items"))
            subtitle = str(body.get("subtitle", "")).strip() or None
            description = str(body.get("description", "")).strip() or None
            admin_notes = str(body.get("adminNotes", "")).strip() or None
            highlights = normalize_items(body.get("highlights")) or items
            delivery = str(body.get("delivery", "")).strip() or None
            support = str(body.get("support", "")).strip() or None
            guarantee = str(body.get("guarantee", "")).strip() or None
            audience = str(body.get("audience", "")).strip() or None
            is_active = 1 if body.get("isActive", True) else 0
            is_recommended = 1 if body.get("isRecommended", False) else 0
            badge = str(body.get("badge", "Public")).strip()
            game_id = str(body.get("gameId", "")).strip()
            package_id = str(body.get("packageId", "")).strip()

            if not name or price <= 0:
                conn.close()
                return self._send_json(400, {"success": False, "error": "จำเป็นต้องใส่ชื่อแพ็คเกจและราคาที่ถูกต้อง"})
            cursor.execute("SELECT id FROM games WHERE id = ?", (game_id,))
            if not cursor.fetchone():
                conn.close()
                return self._send_json(400, {"success": False, "error": "ไม่พบเกมสำหรับแพ็คเกจนี้"})

            cursor.execute("SELECT id FROM packages WHERE id = ?", (package_id,))
            existing = cursor.fetchone()

            if existing:
                cursor.execute("""
                UPDATE packages SET name=?, price=?, subtitle=?, description=?, badge=?, is_recommended=?, highlights=?, delivery=?, support=?, guarantee=?, audience=?, admin_notes=?, is_active=?, game_id=?
                WHERE id = ?
                """, (name, price, subtitle, description, badge, is_recommended, json.dumps(highlights), delivery, support, guarantee, audience, admin_notes, is_active, game_id, package_id))
            else:
                package_id = f"pkg-{secrets.token_hex(4)}"
                cursor.execute("""
                INSERT INTO packages (id, name, price, subtitle, description, badge, is_recommended, highlights, delivery, support, guarantee, audience, admin_notes, is_active, game_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (package_id, name, price, subtitle, description, badge, is_recommended, json.dumps(highlights), delivery, support, guarantee, audience, admin_notes, is_active, game_id))

            conn.commit()
            conn.close()
            broadcast_event("package.updated", {"id": package_id, "name": name, "gameId": game_id})
            return self._send_json(200, {"success": True, "data": {"id": package_id, "name": name}})

        # Admin API: Export current public data into a static Netlify deploy bundle
        if path == "/api/admin-export-static":
            cursor = conn.cursor()
            games_data = load_public_games(cursor)
            deploy_dir, zip_path = export_netlify_deploy(games_data)
            conn.close()
            broadcast_event("static.exported", {"games": len(games_data)})
            return self._send_json(200, {
                "success": True,
                "data": {
                    "games": len(games_data),
                    "deployDir": str(deploy_dir),
                    "zipPath": str(zip_path),
                    "zipSize": zip_path.stat().st_size if zip_path.exists() else 0
                }
            })

        # Admin API: Update Order Status
        if path == "/api/admin-orders":
            order_id = str(body.get("orderId", "")).strip()
            status = str(body.get("status", "")).strip()
            if status not in {"pending", "processing", "completed", "cancelled"}:
                conn.close()
                return self._send_json(400, {"success": False, "error": "สถานะออเดอร์ไม่ถูกต้อง"})

            cursor.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
            existing = cursor.fetchone()

            if existing:
                cursor.execute("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?", (status, datetime.now().isoformat(), order_id))
                conn.commit()
                conn.close()

                # Send update notice to SSE
                notify_order_status_changed(existing, status)
                broadcast_event("order.updated", {"id": order_id, "status": status})
                return self._send_json(200, {"success": True, "data": {"orderId": order_id, "status": status}})

            conn.close()
            return self._send_json(404, {"success": False, "error": "Order not found"})

        conn.close()
        return self._send_json(404, {"success": False, "error": "Endpoint not found"})

    def handle_one_request(self):
        try:
            super().handle_one_request()
        except Exception as e:
            print(f"Exception handling request: {e}")

if __name__ == "__main__":
    import uvicorn
    print("Starting Game Services API Server on port 3000...")
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=3000, reload=False)
