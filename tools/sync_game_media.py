from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import server


REFERENCE_PATTERN = re.compile(
    r'\{\s*type:\s*"(?P<type>[^"]+)",\s*name:\s*"(?P<name>[^"]+)",.*?'
    r'playImage:\s*"(?P<image>[^"]*)",\s*playStore:\s*"(?P<store>[^"]*)"',
    re.DOTALL,
)


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip().lower()


def load_reference_media() -> dict[str, dict[str, str]]:
    index_html = (ROOT / "index.html").read_text(encoding="utf-8")
    media: dict[str, dict[str, str]] = {}
    for match in REFERENCE_PATTERN.finditer(index_html):
        media[normalize(match.group("name"))] = {
            "catalog_type": match.group("type").strip(),
            "play_image": match.group("image").strip(),
            "play_store": match.group("store").strip(),
        }
    return media


def main() -> int:
    media = load_reference_media()
    if not media:
        print("No media references found in index.html")
        return 1

    conn = server.get_db()
    try:
        cursor = conn.cursor()
        rows = cursor.execute("SELECT id, name, play_image, play_store, catalog_type FROM games").fetchall()
        updated = 0
        missing: list[str] = []
        for row in rows:
            item = media.get(normalize(row["name"]))
            if not item:
                missing.append(row["name"])
                continue
            play_image = row["play_image"] or item["play_image"]
            play_store = row["play_store"] or item["play_store"]
            catalog_type = row["catalog_type"] or item["catalog_type"]
            cursor.execute(
                "UPDATE games SET play_image = ?, play_store = ?, catalog_type = ? WHERE id = ?",
                (play_image, play_store, catalog_type, row["id"]),
            )
            updated += 1
        conn.commit()
    finally:
        conn.close()

    print(f"Updated media rows: {updated}")
    if missing:
        print("No reference media for: " + ", ".join(missing))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
