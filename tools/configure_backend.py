from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / ".env"
PUBLIC_SITE_DEFAULT = "https://store-game-0.netlify.app"


def npm_command() -> str:
    return shutil.which("npm.cmd" if os.name == "nt" else "npm") or ("npm.cmd" if os.name == "nt" else "npm")


def normalize_url(value: str) -> str:
    value = (value or "").strip().rstrip("/")
    if not value:
        raise ValueError("URL is required")
    if not value.startswith(("https://", "http://")):
        value = "https://" + value
    return value.rstrip("/")


def read_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def write_env(path: Path, updates: dict[str, str]) -> None:
    existing_lines = path.read_text(encoding="utf-8").splitlines() if path.exists() else []
    seen: set[str] = set()
    output: list[str] = []

    for raw_line in existing_lines:
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            output.append(raw_line)
            continue
        key, _value = raw_line.split("=", 1)
        key = key.strip()
        if key in updates:
            output.append(f"{key}={updates[key]}")
            seen.add(key)
        else:
            output.append(raw_line)

    if output and output[-1].strip():
        output.append("")
    for key, value in updates.items():
        if key not in seen:
            output.append(f"{key}={value}")

    path.write_text("\n".join(output).rstrip() + "\n", encoding="utf-8")


def check_health(base_url: str) -> tuple[bool, str]:
    try:
        with urllib.request.urlopen(base_url + "/health", timeout=10) as response:
            if response.status == 200:
                return True, "health ok"
            return False, f"health returned {response.status}"
    except urllib.error.URLError as exc:
        return False, str(exc)


def run_command(command: list[str]) -> int:
    completed = subprocess.run(command, cwd=ROOT, shell=False)
    return completed.returncode


def main() -> int:
    parser = argparse.ArgumentParser(description="Configure the static site to use an online backend.")
    parser.add_argument("backend_url", help="Backend base URL, for example https://game-services-backend.onrender.com")
    parser.add_argument("--site-url", default=PUBLIC_SITE_DEFAULT, help="Netlify public site URL")
    parser.add_argument("--skip-health", action="store_true", help="Do not require /health to respond before writing config")
    parser.add_argument("--no-export", action="store_true", help="Only update .env; do not export static zip")
    args = parser.parse_args()

    backend_url = normalize_url(args.backend_url)
    site_url = normalize_url(args.site_url)

    if not args.skip_health:
        ok, detail = check_health(backend_url)
        if not ok:
            print(f"Backend health check failed: {detail}")
            print("Use --skip-health only if the backend URL is correct but temporarily sleeping.")
            return 1

    current = read_env(ENV_PATH)
    updates = {
        "PUBLIC_API_BASE_URL": backend_url,
        "PUBLIC_SITE_URL": site_url,
        "ADMIN_SITE_URL": site_url,
        "ALLOWED_ORIGINS": site_url,
        "COOKIE_SECURE": current.get("COOKIE_SECURE", "1") if backend_url.startswith("https://") else "0",
        "COOKIE_SAMESITE": current.get("COOKIE_SAMESITE", "None") if backend_url.startswith("https://") else "Strict",
    }
    write_env(ENV_PATH, updates)
    print(f"Updated {ENV_PATH}")
    print(f"PUBLIC_API_BASE_URL={backend_url}")

    if args.no_export:
        return 0

    npm = npm_command()
    export_code = run_command([npm, "run", "export:static"])
    if export_code != 0:
        return export_code
    qa_code = run_command([npm, "run", "qa"])
    if qa_code != 0:
        return qa_code
    print("Backend URL configured and Netlify zip rebuilt.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
