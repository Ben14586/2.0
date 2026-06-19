from __future__ import annotations

import argparse
import secrets
import string
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / ".env"


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


def generate_password(length: int = 24) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()-_=+"
    while True:
        value = "".join(secrets.choice(alphabet) for _ in range(length))
        if (
            any(ch.islower() for ch in value)
            and any(ch.isupper() for ch in value)
            and any(ch.isdigit() for ch in value)
            and any(ch in "!@#$%^&*()-_=+" for ch in value)
        ):
            return value


def mask(value: str) -> str:
    if not value:
        return "empty"
    if len(value) <= 10:
        return "***"
    return f"{value[:4]}...{value[-4:]} ({len(value)} chars)"


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate and manage local admin/deploy token settings safely.")
    parser.add_argument("--write-env", action="store_true", help="Write missing/rotated values to .env")
    parser.add_argument("--rotate-admin-key", action="store_true", help="Generate a new ADMIN_KEY")
    parser.add_argument("--rotate-bootstrap-password", action="store_true", help="Generate a new ADMIN_BOOTSTRAP_PASSWORD")
    parser.add_argument("--print-values", action="store_true", help="Print generated secret values once. Keep this private.")
    args = parser.parse_args()

    current = read_env(ENV_PATH)
    updates: dict[str, str] = {}

    if args.rotate_admin_key or not current.get("ADMIN_KEY"):
        updates["ADMIN_KEY"] = "adm_" + secrets.token_urlsafe(40)
    if args.rotate_bootstrap_password or current.get("ADMIN_BOOTSTRAP_PASSWORD", "").lower() in {"", "change-this-before-first-run", "change_this_strong_password"}:
        updates["ADMIN_BOOTSTRAP_PASSWORD"] = generate_password(28)
    if not current.get("ADMIN_SESSION_HOURS"):
        updates["ADMIN_SESSION_HOURS"] = "8"
    if not current.get("COOKIE_SECURE"):
        updates["COOKIE_SECURE"] = "1" if current.get("PUBLIC_API_BASE_URL", "").startswith("https://") else "0"
    if not current.get("COOKIE_SAMESITE"):
        updates["COOKIE_SAMESITE"] = "None" if current.get("PUBLIC_API_BASE_URL", "").startswith("https://") else "Strict"

    final_values = {**current, **updates}
    print("Token readiness:")
    for key in ["ADMIN_KEY", "ADMIN_BOOTSTRAP_PASSWORD", "ADMIN_SESSION_HOURS", "COOKIE_SECURE", "COOKIE_SAMESITE"]:
        value = final_values.get(key, "")
        display = value if key in {"ADMIN_SESSION_HOURS", "COOKIE_SECURE", "COOKIE_SAMESITE"} else mask(value)
        print(f"- {key}: {display}")

    if args.write_env and updates:
        write_env(ENV_PATH, updates)
        print(f"Updated {ENV_PATH} ({len(updates)} value(s)).")
    elif updates:
        print("Generated values are pending. Re-run with --write-env to save them.")
    else:
        print("No token updates needed.")

    if args.print_values and updates:
        print("\nGenerated secret values:")
        for key, value in updates.items():
            print(f"{key}={value}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
