from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []


def check(condition: bool, message: str) -> None:
    if condition:
        print(f"PASS: {message}")
    else:
        print(f"FAIL: {message}")
        errors.append(message)


def tracked_files() -> set[str]:
    result = subprocess.run(
        ["git", "ls-files"], cwd=ROOT, text=True, capture_output=True, check=True
    )
    return {line.strip().replace("\\", "/") for line in result.stdout.splitlines() if line.strip()}


def main() -> int:
    tracked = tracked_files()
    required = {
        "Dockerfile",
        "render.yaml",
        "backend-node/package.json",
        "backend-node/package-lock.json",
        "backend-node/src/server.js",
        "backend-node/src/db/init.js",
        "config/catalog-seed.json",
        "dist/index.html",
        "dist/admin.html",
    }
    check(required <= tracked, "all deploy-critical files are tracked by Git")

    unsafe = [
        name for name in tracked
        if name == ".env"
        or "node_modules/" in name
        or "uploads/slips/" in name
        or Path(name).suffix.lower() in {".db", ".sqlite", ".sqlite3"}
    ]
    check(not unsafe, "no secrets, databases, dependencies, or slips are tracked")

    seed = json.loads((ROOT / "config/catalog-seed.json").read_text(encoding="utf-8"))
    check(sum(int(game.get("is_active", 1)) == 1 for game in seed.get("games", [])) == 97, "catalog seed contains 97 active games")
    check(len(seed.get("packages", [])) > 0, "catalog seed contains packages")

    dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")
    for marker in ("COPY backend-node/", "COPY config/catalog-seed.json", "COPY dist/", "COPY uploads/"):
        check(marker in dockerfile, f"Dockerfile includes {marker}")

    render = (ROOT / "render.yaml").read_text(encoding="utf-8")
    check("healthCheckPath: /health" in render, "Render uses the database-backed health endpoint")
    check("/app/data/database.db" in render, "Render database points to persistent disk")
    check("ADMIN_BOOTSTRAP_PASSWORD" in render, "Render requests the admin bootstrap secret")

    missing_assets: list[str] = []
    untracked_assets: list[str] = []
    for html_name in ("dist/index.html", "dist/admin.html"):
        html = (ROOT / html_name).read_text(encoding="utf-8")
        for asset in re.findall(r'(?:src|href)="\./([^"?#]+)', html):
            relative = f"dist/{asset}"
            if not (ROOT / relative).is_file():
                missing_assets.append(relative)
            elif relative not in tracked and asset != "runtime-config.js":
                untracked_assets.append(relative)
    check(not missing_assets, "every generated HTML asset exists")
    check(not untracked_assets, "every generated HTML asset is tracked by Git")

    check('type="module" src="./runtime-config.js"' in (ROOT / "index.html").read_text(encoding="utf-8"), "runtime config is bundled without Vite warnings")

    if errors:
        print(f"\nPredeploy check failed: {len(errors)} issue(s)")
        return 1
    print("\nPredeploy check passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
