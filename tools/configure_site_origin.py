from __future__ import annotations

import argparse
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / ".env"


def normalize_origin(value: str) -> str:
    origin = value.strip().rstrip("/")
    parsed = urlparse(origin)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("site URL must start with http:// or https://")
    return origin


def upsert_env(path: Path, updates: dict[str, str]) -> None:
    lines = path.read_text(encoding="utf-8").splitlines() if path.exists() else []
    seen: set[str] = set()
    output: list[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in line:
            output.append(line)
            continue
        key = line.split("=", 1)[0].strip()
        if key in updates:
            output.append(f"{key}={updates[key]}")
            seen.add(key)
        else:
            output.append(line)
    for key, value in updates.items():
        if key not in seen:
            output.append(f"{key}={value}")
    path.write_text("\n".join(output).rstrip() + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Configure public/admin site origins for production CORS.")
    parser.add_argument("site_url", help="Public Netlify site URL, for example https://store-game-0.netlify.app")
    args = parser.parse_args()

    site_url = normalize_origin(args.site_url)
    upsert_env(ENV_PATH, {
        "PUBLIC_SITE_URL": site_url,
        "ADMIN_SITE_URL": site_url,
        "ALLOWED_ORIGINS": site_url,
    })
    print(f"Configured site origin: {site_url}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
