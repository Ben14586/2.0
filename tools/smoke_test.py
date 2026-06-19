from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ZIP_PATH = ROOT / "netlify-deploy-latest.zip"


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def request_json(base_url: str, path: str, token: str = "") -> tuple[int, dict]:
    url = base_url.rstrip("/") + path
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            payload = {"success": False, "error": body}
        return exc.code, payload


def post_json(base_url: str, path: str, payload: dict) -> tuple[int, dict]:
    url = base_url.rstrip("/") + path
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            payload = {"success": False, "error": body}
        return exc.code, payload


def record(results: list[tuple[str, bool, str]], name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok, detail))


def check_zip(results: list[tuple[str, bool, str]]) -> None:
    if not ZIP_PATH.exists():
        record(results, "deploy zip exists", False)
        return
    try:
        with zipfile.ZipFile(ZIP_PATH) as archive:
            names = set(archive.namelist())
            required = {"index.html", "runtime-config.js", "deploy-manifest.json", "netlify.toml"}
            record(results, "deploy zip required files", required.issubset(names), f"missing={sorted(required - names)}")
            manifest = json.loads(archive.read("deploy-manifest.json").decode("utf-8"))
            record(results, "deploy zip game count", int(manifest.get("gameCount", 0)) > 0, f"games={manifest.get('gameCount')}")
    except Exception as exc:
        record(results, "deploy zip readable", False, str(exc))


def main() -> int:
    load_env_file(ROOT / ".env")

    parser = argparse.ArgumentParser(description="Smoke test the Game Services backend and deploy bundle.")
    parser.add_argument("--base-url", default=os.getenv("SMOKE_BASE_URL", "http://127.0.0.1:3000"))
    parser.add_argument("--admin", action="store_true", help="Also test admin login/dashboard when credentials are available.")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    results: list[tuple[str, bool, str]] = []

    status, health = request_json(base_url, "/health")
    record(results, "backend health", status == 200 and health.get("success") is True, f"status={status}")

    status, games = request_json(base_url, "/api/games")
    game_count = len(games.get("data", [])) if isinstance(games.get("data"), list) else 0
    record(results, "public games api", status == 200 and game_count > 0, f"status={status}, games={game_count}")

    status, posts = request_json(base_url, "/api/posts")
    record(results, "public posts api", status == 200 and posts.get("success") is True, f"status={status}")

    status, coupon = request_json(base_url, "/api/coupons/validate?code=__SMOKE_NO_CODE__&price=100")
    record(results, "coupon invalid handled", status in {400, 404} and coupon.get("success") is False, f"status={status}")

    if args.admin:
        username = os.getenv("ADMIN_USERNAME", "")
        password = os.getenv("ADMIN_BOOTSTRAP_PASSWORD", "")
        if not username or not password:
            record(results, "admin credentials available", False, "ADMIN_USERNAME/ADMIN_BOOTSTRAP_PASSWORD missing")
        else:
            status, login = post_json(base_url, "/api/admin/login", {"username": username, "password": password})
            token = (login.get("data") or {}).get("token", "")
            record(results, "admin login", status == 200 and bool(token), f"status={status}")
            if token:
                status, dashboard = request_json(base_url, "/api/admin-dashboard", token=token)
                record(results, "admin dashboard", status == 200 and dashboard.get("success") is True, f"status={status}")

    check_zip(results)

    failed = [item for item in results if not item[1]]
    for name, ok, detail in results:
        status_text = "PASS" if ok else "FAIL"
        suffix = f" - {detail}" if detail else ""
        print(f"[{status_text}] {name}{suffix}")

    if failed:
        print(f"\nSmoke test failed: {len(failed)} check(s) need attention.")
        return 1
    print(f"\nSmoke test passed for {base_url}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
