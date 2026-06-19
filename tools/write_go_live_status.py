from __future__ import annotations

import json
import shutil
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / ".env"
BACKEND_ZIP = ROOT / "backend-deploy-latest.zip"
NETLIFY_ZIP = ROOT / "netlify-deploy-latest.zip"
STATUS_PATH = ROOT / "docs" / "production-online-status.md"


def read_env() -> dict[str, str]:
    values: dict[str, str] = {}
    if not ENV_PATH.exists():
        return values
    for raw_line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def zip_has(path: Path, required: set[str]) -> tuple[bool, list[str]]:
    if not path.exists():
        return False, sorted(required)
    try:
        with zipfile.ZipFile(path) as archive:
            names = set(archive.namelist())
            return required.issubset(names), sorted(required - names)
    except Exception:
        return False, sorted(required)


def netlify_counts() -> tuple[int, int]:
    if not NETLIFY_ZIP.exists():
        return 0, 0
    with zipfile.ZipFile(NETLIFY_ZIP) as archive:
        names = archive.namelist()
        image_count = len([name for name in names if name.startswith("uploads/game-images/")])
        game_count = 0
        if "deploy-manifest.json" in names:
            manifest = json.loads(archive.read("deploy-manifest.json").decode("utf-8"))
            game_count = int(manifest.get("gameCount", 0) or 0)
    return game_count, image_count


def status_line(ok: bool, label: str, detail: str = "") -> str:
    box = "x" if ok else " "
    suffix = f" - {detail}" if detail else ""
    return f"- [{box}] {label}{suffix}"


def main() -> int:
    env = read_env()
    public_api = env.get("PUBLIC_API_BASE_URL", "").strip()
    public_site = env.get("PUBLIC_SITE_URL", "").strip()
    allowed_origins = env.get("ALLOWED_ORIGINS", "").strip()

    backend_ok, backend_missing = zip_has(BACKEND_ZIP, {"server.py", "requirements.txt", "render.yaml", "railway.json"})
    netlify_ok, netlify_missing = zip_has(NETLIFY_ZIP, {"index.html", "runtime-config.js", "deploy-manifest.json", "netlify.toml"})
    game_count, image_count = netlify_counts()

    lines = [
        "# Production Online Status",
        "",
        "## Snapshot",
        "",
        status_line(BACKEND_ZIP.exists() and BACKEND_ZIP.stat().st_size > 0, "backend package exists", f"{BACKEND_ZIP.name} ({BACKEND_ZIP.stat().st_size if BACKEND_ZIP.exists() else 0} bytes)"),
        status_line(NETLIFY_ZIP.exists() and NETLIFY_ZIP.stat().st_size > 0, "netlify package exists", f"{NETLIFY_ZIP.name} ({NETLIFY_ZIP.stat().st_size if NETLIFY_ZIP.exists() else 0} bytes)"),
        status_line(backend_ok, "backend package contents", f"missing={backend_missing}" if backend_missing else ""),
        status_line(netlify_ok, "netlify package contents", f"missing={netlify_missing}" if netlify_missing else ""),
        status_line(game_count > 0, "netlify game catalog injected", f"games={game_count}"),
        status_line(image_count >= game_count and game_count > 0, "netlify game images included", f"images={image_count}, games={game_count}"),
        status_line(bool(public_api), "backend URL configured", public_api or "run: npm run go-live:connect -- https://your-backend-url"),
        status_line(bool(public_site), "public site URL configured", public_site or "set PUBLIC_SITE_URL"),
        status_line(bool(allowed_origins), "allowed origins configured", allowed_origins or "set ALLOWED_ORIGINS"),
        "",
        "## External Tools",
        "",
    ]
    for tool in ["netlify", "railway", "render", "gh"]:
        found = shutil.which(tool)
        lines.append(status_line(bool(found), f"{tool} CLI", found or "not installed"))

    lines += [
        "",
        "## Next External Step",
        "",
        "1. Deploy `backend-deploy-latest.zip` to Render or Railway.",
        "2. Confirm online `/health` returns success.",
        "3. Run:",
        "",
        "```powershell",
        "npm run go-live:connect -- https://your-backend-host.example.com",
        "```",
        "",
        "4. Upload the rebuilt `netlify-deploy-latest.zip` to Netlify.",
        "5. Create one real test order from the Netlify site and confirm the order ID starts with `ORD-`.",
        "6. Open admin and verify the order appears, status updates, and tracking can find it.",
        "",
        "## Current Blocker",
        "",
        "The project is packaged locally. The remaining blocker is an external backend host URL/account session. Netlify alone cannot create durable online orders without that backend URL.",
        "",
    ]

    STATUS_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {STATUS_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
