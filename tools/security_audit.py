from __future__ import annotations

import argparse
import json
import re
import sys
import zipfile
from pathlib import Path
from urllib import request


ROOT = Path(__file__).resolve().parents[1]

SECRET_PATTERNS = {
    "telegram bot token": re.compile(r"\b\d{8,12}:[A-Za-z0-9_-]{30,}\b"),
    "hard-coded admin key": re.compile(r"admin_secret_key_123|GameServices@2026!|admin007x"),
}

SCAN_FILES = [
    ".env.example",
    "production.env.example",
    "render.yaml",
    "server.py",
    "backend/app/dependencies.py",
    "backend/app/database.py",
    "backend/app/main.py",
    "backend/app/routers/orders.py",
    "backend/app/routers/upload.py",
]


def record(rows: list[tuple[str, bool, str]], name: str, ok: bool, detail: str = "") -> None:
    rows.append((name, ok, detail))


def read_text(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8", errors="ignore")


def check_static(rows: list[tuple[str, bool, str]]) -> None:
    combined = "\n".join(read_text(path) for path in SCAN_FILES if (ROOT / path).exists())
    for label, pattern in SECRET_PATTERNS.items():
        record(rows, f"no exposed {label}", not pattern.search(combined))
    cloudinary_scrubbed = combined.replace("cloudinary://API_KEY:API_SECRET@CLOUD_NAME", "")
    postgres_scrubbed = combined.replace("postgresql://user:password@host:port/dbname", "")
    record(rows, "no real Cloudinary URL", "cloudinary://" not in cloudinary_scrubbed)
    record(rows, "no real Postgres URL", not re.search(r"postgres(?:ql)?://", postgres_scrubbed, re.I))

    env_example = read_text(".env.example")
    prod_example = read_text("production.env.example")
    record(rows, "file origin disabled by default", "ALLOW_FILE_ORIGIN=0" in env_example)
    record(rows, "local origins disabled by default", "ALLOW_LOCAL_ORIGINS=0" in env_example)
    record(rows, "production admin password is placeholder", "REPLACE_WITH_STRONG_PRIVATE_PASSWORD" in prod_example)

    dependencies = read_text("backend/app/dependencies.py")
    record(rows, "no default FastAPI ADMIN_KEY", 'os.getenv("ADMIN_KEY", "").strip()' in dependencies)
    record(rows, "blank ADMIN_KEY cannot authenticate", "if ADMIN_KEY and hmac.compare_digest" in dependencies)

    database = read_text("backend/app/database.py")
    record(rows, "no default FastAPI admin password", "GameServices@2026!" not in database and "ADMIN_BOOTSTRAP_PASSWORD" in database)

    main = read_text("backend/app/main.py")
    record(rows, "FastAPI CORS uses environment", "def configured_origins()" in main and "allow_origins=configured_origins()" in main)
    record(rows, "FastAPI supports HEAD monitor", "@app.head" in main)

    orders = read_text("backend/app/routers/orders.py")
    record(rows, "order admin list requires auth", "@router.get(\"/orders\")" in orders and "admin_user=Depends(verify_admin)" in orders)
    record(rows, "order status update requires auth", "@router.put(\"/orders/{order_id}/status\")" in orders and "admin_user=Depends(verify_admin)" in orders)
    record(rows, "slip upload validates type and size", "MAX_SLIP_BYTES" in orders and "ALLOWED_SLIP_TYPES" in orders and "detect_image_type" in orders)

    upload = read_text("backend/app/routers/upload.py")
    record(rows, "game image upload validates type and size", "MAX_GAME_IMAGE_BYTES" in upload and "ALLOWED_IMAGE_TYPES" in upload and "detect_image_type" in upload)

    gitignore = read_text(".gitignore")
    for token in ("backend-node/", "python_portable/", "database.db.bak", "config/mcporter.json", "uploads/slips/"):
        record(rows, f"ignored local debris {token}", token in gitignore)


def check_zip(rows: list[tuple[str, bool, str]]) -> None:
    zip_path = ROOT / "backend-deploy-latest.zip"
    record(rows, "backend zip exists", zip_path.exists(), str(zip_path))
    if not zip_path.exists():
        return
    with zipfile.ZipFile(zip_path) as archive:
        names = set(archive.namelist())
    record(rows, "backend zip excludes database", "database.db" not in names)
    record(rows, "backend zip excludes slips", not any(name.startswith("uploads/slips/") for name in names))
    record(rows, "backend zip includes catalog seed", "config/catalog-seed.json" in names)


def fetch_json(url: str, timeout: int = 20) -> dict:
    with request.urlopen(url, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def check_live(rows: list[tuple[str, bool, str]], base_url: str | None) -> None:
    if not base_url:
        return
    base_url = base_url.rstrip("/")
    try:
        req = request.Request(base_url + "/", method="HEAD")
        with request.urlopen(req, timeout=20) as response:
            record(rows, "live HEAD / returns 200", response.status == 200, str(response.status))
    except Exception as exc:
        record(rows, "live HEAD / returns 200", False, str(exc))

    try:
        data = fetch_json(base_url + "/api/games")
        games = data.get("data") or []
        record(rows, "live has 97 games", len(games) == 97, str(len(games)))
        record(rows, "live excludes HEAVENFALL ARENA", not any("HEAVENFALL" in str(game.get("name", "")).upper() for game in games))
    except Exception as exc:
        record(rows, "live games endpoint works", False, str(exc))

    try:
        with request.urlopen(base_url + "/api/orders", timeout=20) as response:
            record(rows, "live orders list requires auth", False, f"unexpected {response.status}")
    except Exception as exc:
        status = getattr(getattr(exc, "fp", None), "status", None) or getattr(exc, "code", None)
        record(rows, "live orders list requires auth", status in {401, 403}, str(status or exc))


def main() -> int:
    parser = argparse.ArgumentParser(description="Security and production readiness audit.")
    parser.add_argument("--live-url", default="", help="Optional live base URL to verify.")
    args = parser.parse_args()

    rows: list[tuple[str, bool, str]] = []
    check_static(rows)
    check_zip(rows)
    check_live(rows, args.live_url)

    failed = False
    for name, ok, detail in rows:
        status = "PASS" if ok else "FAIL"
        suffix = f" - {detail}" if detail else ""
        print(f"[{status}] {name}{suffix}")
        failed = failed or not ok
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
