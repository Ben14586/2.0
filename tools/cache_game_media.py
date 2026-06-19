from __future__ import annotations

import mimetypes
import re
import sys
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import server


CONTENT_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", (value or "").strip().lower())
    return slug.strip("-") or "game"


def extension_for(url: str, content_type: str | None) -> str:
    content_type = (content_type or "").split(";", 1)[0].strip().lower()
    if content_type in CONTENT_EXTENSIONS:
        return CONTENT_EXTENSIONS[content_type]
    guessed = mimetypes.guess_extension(content_type or "")
    if guessed in {".jpg", ".jpeg", ".png", ".webp"}:
        return ".jpg" if guessed == ".jpeg" else guessed
    path_ext = Path(urlparse(url).path).suffix.lower()
    if path_ext in {".jpg", ".jpeg", ".png", ".webp"}:
        return ".jpg" if path_ext == ".jpeg" else path_ext
    return ".jpg"


def download_image(url: str) -> tuple[bytes, str]:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
    )
    with urllib.request.urlopen(request, timeout=25) as response:
        data = response.read()
        content_type = response.headers.get("Content-Type", "")
    if len(data) < 256:
        raise ValueError("downloaded image is too small")
    return data, extension_for(url, content_type)


def main() -> int:
    media_dir = server.UPLOADS_DIR / "game-images"
    media_dir.mkdir(parents=True, exist_ok=True)

    conn = server.get_db()
    failures: list[str] = []
    cached = 0
    skipped = 0
    try:
        cursor = conn.cursor()
        rows = cursor.execute(
            """
            SELECT id, name, slug, play_image
            FROM games
            WHERE is_active = 1
              AND play_image IS NOT NULL
              AND TRIM(play_image) != ''
            ORDER BY name
            """
        ).fetchall()

        for row in rows:
            current_url = str(row["play_image"] or "").strip()
            if current_url.startswith("/uploads/game-images/"):
                skipped += 1
                continue
            if not current_url.startswith(("http://", "https://")):
                skipped += 1
                continue

            try:
                data, ext = download_image(current_url)
                filename = f"{slugify(row['slug'] or row['name'])}{ext}"
                file_path = media_dir / filename
                file_path.write_bytes(data)
                public_url = f"/uploads/game-images/{filename}"
                cursor.execute("UPDATE games SET play_image = ? WHERE id = ?", (public_url, row["id"]))
                cached += 1
            except Exception as exc:
                failures.append(f"{row['name']}: {exc}")

        conn.commit()
    finally:
        conn.close()

    print(f"Cached images: {cached}")
    print(f"Skipped images: {skipped}")
    if failures:
        print("Failures:")
        for failure in failures:
            print(f"- {failure}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
