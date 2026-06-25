from __future__ import annotations

import json
import sqlite3
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "backend-deploy-latest.zip"
INCLUDE_FILES = [
    "server.py",
    "requirements.txt",
    "Dockerfile",
    ".dockerignore",
    "Procfile",
    "render.yaml",
    "railway.json",
    ".env.example",
    "README.md",
    "config/catalog-seed.json",
    "index.html",
    "admin.html",
    "runtime-config.js",
    "netlify.toml",
    "package.json",
    "package-lock.json",
    "vite.config.ts",
    "tailwind.config.js",
    "postcss.config.js",
    "tsconfig.json",
]
INCLUDE_DIRS = [
    "components",
    "docs",
    "dist",
    "frontend",
    "lib",
    "tools",
    "uploads/game-images",
]


def should_include(path: Path) -> bool:
    parts = set(path.parts)
    if "__pycache__" in parts:
        return False
    if path.suffix.lower() in {".pyc", ".db", ".zip"}:
        return False
    return True

def export_catalog_seed() -> None:
    db_path = ROOT / "database.db"
    output_path = ROOT / "config" / "catalog-seed.json"
    if not db_path.exists():
        return

    output_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        seed = {}
        for table_name in ("categories", "games", "packages"):
            seed[table_name] = [
                dict(row)
                for row in conn.execute(f"SELECT * FROM {table_name}").fetchall()
            ]
    finally:
        conn.close()

    output_path.write_text(json.dumps(seed, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    export_catalog_seed()

    if OUTPUT.exists():
        OUTPUT.unlink()

    with zipfile.ZipFile(OUTPUT, "w", zipfile.ZIP_DEFLATED) as archive:
        for file_name in INCLUDE_FILES:
            path = ROOT / file_name
            if path.is_file():
                archive.write(path, path.relative_to(ROOT))
        for dir_name in INCLUDE_DIRS:
            base = ROOT / dir_name
            if not base.exists():
                continue
            for path in base.rglob("*"):
                if path.is_file() and should_include(path.relative_to(ROOT)):
                    archive.write(path, path.relative_to(ROOT))

    print(f"Backend deploy package: {OUTPUT}")
    print(f"Size: {OUTPUT.stat().st_size} bytes")


if __name__ == "__main__":
    main()
