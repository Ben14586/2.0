from __future__ import annotations

import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
STATIC_ZIP_NAME = "netlify-deploy-latest.zip"
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import server


def main() -> None:
    conn = server.get_db()
    try:
        cursor = conn.cursor()
        games = server.load_public_games(cursor)
    finally:
        conn.close()

    deploy_dir, zip_path = server.export_netlify_deploy(games)
    print(f"Exported {len(games)} games")
    print(f"Deploy directory: {deploy_dir}")
    print(f"Zip file: {zip_path.name} ({zip_path})")
    print(f"Zip size: {zip_path.stat().st_size if zip_path.exists() else 0} bytes")


if __name__ == "__main__":
    main()
