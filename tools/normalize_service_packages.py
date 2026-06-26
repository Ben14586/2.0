from __future__ import annotations

import json
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "database.db"

BASE_HIGHLIGHTS = [
    "ทรัพยากรหลัก",
    "เริ่มต้นคุ้ม เล่นต่อได้ไว",
    "เหมาะกับการฟาร์มและอัปเกรดต่อเนื่อง",
    "ตรวจรายการก่อนดำเนินการ",
    "รับประกัน 7 วัน",
]


def target_price(game_name: str, old_price: float | None) -> int:
    text = game_name.lower()
    if any(token in text for token in ("premium", "arena", "legend", "dragon", "rpg")):
        base = 150
    elif any(token in text for token in ("td", "tower", "defense", "idle")):
        base = 100
    else:
        base = 120

    if old_price and 60 <= old_price <= 200:
        if old_price <= 89:
            return 89
        if old_price <= 120:
            return 100
        if old_price <= 170:
            return 150
        return 180
    return base


def normalize() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        cursor = conn.cursor()
        games = cursor.execute("SELECT id, name, category_name FROM games WHERE is_active = 1 ORDER BY name").fetchall()
        for game in games:
            packages = cursor.execute(
                "SELECT * FROM packages WHERE game_id = ? ORDER BY is_recommended DESC, price ASC, id ASC",
                (game["id"],),
            ).fetchall()
            if not packages:
                continue

            primary = packages[0]
            chosen_price = target_price(game["name"], primary["price"])
            package_name = "Reference Feature Pack"
            subtitle = (
                "แพ็กทรัพยากรหลัก พร้อมเซ็ตเริ่มต้นคุ้มค่า เหมาะกับเกมที่ต้องการฟาร์มไว "
                "และเล่นต่อได้ลื่น"
            )
            description = (
                f"บริการสำหรับ {game['name']} เน้นทรัพยากรหลักและรายการที่ส่งมอบได้จริง "
                "ลูกค้าเลือกกดแพ็กซ้ำเพิ่มได้ในหน้า Checkout ครั้งละ 5 บาท"
            )
            cursor.execute(
                """
                UPDATE packages
                SET name = ?,
                    price = ?,
                    subtitle = ?,
                    description = ?,
                    badge = ?,
                    is_recommended = 1,
                    highlights = ?,
                    delivery = ?,
                    support = ?,
                    guarantee = ?,
                    audience = ?,
                    admin_notes = ?,
                    is_active = 1
                WHERE id = ?
                """,
                (
                    package_name,
                    chosen_price,
                    subtitle,
                    description,
                    "แนะนำ",
                    json.dumps(BASE_HIGHLIGHTS, ensure_ascii=False),
                    "ดำเนินการหลังตรวจสลิปและข้อมูลล็อกอินครบ",
                    "รองรับ Google/Gmail, Username/Password, iOS/Android ตามเกมที่ซิงก์ข้อมูลได้",
                    "รับประกัน 7 วันตามเงื่อนไขร้าน",
                    "ลูกค้าที่ต้องการทรัพยากรหลักและบริการหลังการขายชัดเจน",
                    "Normalized to single deliverable package. Repeat add-on is handled in checkout.",
                    primary["id"],
                ),
            )

            for duplicate in packages[1:]:
                cursor.execute(
                    "UPDATE packages SET is_active = 0, is_recommended = 0, admin_notes = ? WHERE id = ?",
                    ("Disabled by package normalization: unsafe/duplicate full-option package.", duplicate["id"]),
                )

        cursor.execute(
            "UPDATE packages SET is_active = 0 WHERE game_id IN (SELECT id FROM games WHERE COALESCE(is_active, 0) != 1)"
        )
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    normalize()
    print("Normalized active games to one safe service package each.")
