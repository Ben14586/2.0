from __future__ import annotations

import json
import os
import shutil
import sys
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / ".env"
BACKEND_ZIP = ROOT / "backend-deploy-latest.zip"
NETLIFY_ZIP = ROOT / "netlify-deploy-latest.zip"
RENDER_YAML = ROOT / "render.yaml"
RAILWAY_JSON = ROOT / "railway.json"


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


def record(rows: list[tuple[str, bool, str]], name: str, ok: bool, detail: str = "") -> None:
    rows.append((name, ok, detail))


def zip_contains(path: Path, required: set[str]) -> tuple[bool, str]:
    if not path.exists():
        return False, "missing zip"
    try:
        with zipfile.ZipFile(path) as archive:
            names = set(archive.namelist())
            missing = sorted(required - names)
            return not missing, f"missing={missing}" if missing else ""
    except Exception as exc:
        return False, str(exc)


def main() -> int:
    env = read_env()
    rows: list[tuple[str, bool, str]] = []

    record(rows, "render blueprint", RENDER_YAML.exists(), str(RENDER_YAML))
    record(rows, "railway blueprint", RAILWAY_JSON.exists(), str(RAILWAY_JSON))
    record(rows, "backend zip exists", BACKEND_ZIP.exists() and BACKEND_ZIP.stat().st_size > 0, f"bytes={BACKEND_ZIP.stat().st_size if BACKEND_ZIP.exists() else 0}")
    record(rows, "netlify zip exists", NETLIFY_ZIP.exists() and NETLIFY_ZIP.stat().st_size > 0, f"bytes={NETLIFY_ZIP.stat().st_size if NETLIFY_ZIP.exists() else 0}")

    ok, detail = zip_contains(BACKEND_ZIP, {"server.py", "requirements.txt", "render.yaml", "railway.json"})
    record(rows, "backend zip contents", ok, detail)
    ok, detail = zip_contains(NETLIFY_ZIP, {"index.html", "runtime-config.js", "deploy-manifest.json", "netlify.toml"})
    record(rows, "netlify zip contents", ok, detail)

    public_api = env.get("PUBLIC_API_BASE_URL", "").strip()
    record(rows, "backend url configured", bool(public_api), public_api or "run: npm run go-live:connect -- https://your-backend-url")
    record(rows, "public site configured", bool(env.get("PUBLIC_SITE_URL", "").strip()), env.get("PUBLIC_SITE_URL", ""))
    record(rows, "allowed origins configured", bool(env.get("ALLOWED_ORIGINS", "").strip()), env.get("ALLOWED_ORIGINS", ""))

    for tool in ["netlify", "railway", "render", "gh"]:
        found = shutil.which(tool)
        record(rows, f"{tool} cli", bool(found), found or "not installed")

    if NETLIFY_ZIP.exists():
        with zipfile.ZipFile(NETLIFY_ZIP) as archive:
            if "deploy-manifest.json" in archive.namelist():
                manifest = json.loads(archive.read("deploy-manifest.json").decode("utf-8"))
                record(rows, "netlify game count", int(manifest.get("gameCount", 0)) > 0, f"games={manifest.get('gameCount')}")

    for name, ok, detail in rows:
        status = "PASS" if ok else "TODO"
        suffix = f" - {detail}" if detail else ""
        print(f"[{status}] {name}{suffix}")

    blocking = [
        row for row in rows
        if not row[1] and row[0] in {
            "render blueprint",
            "railway blueprint",
            "backend zip exists",
            "netlify zip exists",
            "backend zip contents",
            "netlify zip contents",
            "netlify game count",
        }
    ]
    if blocking:
        print(f"\nPhase 3 preflight blocked by {len(blocking)} required item(s).")
        return 1

    if not public_api:
        print("\nPhase 3 is packaged. Next external step: deploy backend, then run go-live:connect with the backend URL.")
    else:
        print("\nPhase 3 config is connected to a backend URL. Upload the latest Netlify zip and test a real order.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
