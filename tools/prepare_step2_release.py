from __future__ import annotations

import hashlib
import json
import shutil
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND_ZIP = ROOT / "backend-deploy-latest.zip"
NETLIFY_ZIP = ROOT / "netlify-deploy-latest.zip"
RELEASE_DIR = ROOT / "step2-backend-release"


REQUIRED_BACKEND_FILES = {
    "server.py",
    "requirements.txt",
    "render.yaml",
    "railway.json",
    "Dockerfile",
    "Procfile",
}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_zip(path: Path, required: set[str]) -> dict:
    if not path.exists():
        raise FileNotFoundError(path)
    with zipfile.ZipFile(path) as archive:
        names = set(archive.namelist())
        missing = sorted(required - names)
        if missing:
            raise RuntimeError(f"{path.name} missing required files: {missing}")
        image_count = len([name for name in names if name.startswith("uploads/game-images/")])
        return {
            "name": path.name,
            "bytes": path.stat().st_size,
            "sha256": sha256_file(path),
            "file_count": len(names),
            "game_image_count": image_count,
        }


def write_text(path: Path, text: str) -> None:
    path.write_text(text.strip() + "\n", encoding="utf-8")


def main() -> int:
    backend_manifest = validate_zip(BACKEND_ZIP, REQUIRED_BACKEND_FILES)
    netlify_manifest = validate_zip(NETLIFY_ZIP, {"index.html", "runtime-config.js", "deploy-manifest.json", "netlify.toml"})

    if RELEASE_DIR.exists():
        shutil.rmtree(RELEASE_DIR)
    RELEASE_DIR.mkdir(parents=True)

    with zipfile.ZipFile(BACKEND_ZIP) as archive:
        archive.extractall(RELEASE_DIR)

    manifest = {
        "backend": backend_manifest,
        "netlify": netlify_manifest,
        "release_dir": str(RELEASE_DIR),
    }
    write_text(RELEASE_DIR / "step2-checksums.json", json.dumps(manifest, indent=2, ensure_ascii=False))

    write_text(
        RELEASE_DIR / "STEP2_UPLOAD_README.md",
        """
# Step 2 Backend Upload

Upload this folder to Render or Railway as the backend service source.

## Recommended Render Settings

- Runtime: Python
- Build command: `pip install -r requirements.txt`
- Start command: `python server.py`
- Health check path: `/health`
- Persistent disk:
  - Mount path: `/var/data`
  - Size: 1GB or higher

## Required Environment Variables

Use `RENDER_ENV_PLACEHOLDERS.txt` in this folder. Replace placeholder values in the Render/Railway dashboard.

## After Deploy

1. Open `https://your-backend-host/health`.
2. Confirm JSON returns `success: true`.
3. In the local project, run:

```powershell
npm run go-live:connect -- https://your-backend-host
```

4. Upload the rebuilt `netlify-deploy-latest.zip` to Netlify.
5. Create one real test order and confirm the ID starts with `ORD-`.
""",
    )

    write_text(
        RELEASE_DIR / "RENDER_ENV_PLACEHOLDERS.txt",
        """
HOST=0.0.0.0
DATABASE_FILE=/var/data/database.db
UPLOADS_DIR=/var/data/uploads
ADMIN_USERNAME=admin
ADMIN_BOOTSTRAP_PASSWORD=REPLACE_WITH_STRONG_PRIVATE_PASSWORD
ADMIN_SESSION_HOURS=8
ADMIN_KEY=OPTIONAL_REPLACE_WITH_PRIVATE_EMERGENCY_KEY_OR_LEAVE_BLANK
COOKIE_SECURE=1
COOKIE_SAMESITE=None
PUBLIC_SITE_URL=https://game-services-hwcy.onrender.com
ADMIN_SITE_URL=https://game-services-hwcy.onrender.com
PUBLIC_API_BASE_URL=https://game-services-hwcy.onrender.com
ALLOWED_ORIGINS=https://game-services-hwcy.onrender.com
ALLOW_FILE_ORIGIN=0
MAX_JSON_BODY_BYTES=5242880
MAX_SLIP_BYTES=3145728
MAX_GAME_IMAGE_BYTES=4194304
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
LINE_NOTIFY_TOKEN=
""",
    )

    print(f"Prepared Step 2 backend release: {RELEASE_DIR}")
    print(f"Backend files: {backend_manifest['file_count']}, game images: {backend_manifest['game_image_count']}")
    print(f"Backend SHA256: {backend_manifest['sha256']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
