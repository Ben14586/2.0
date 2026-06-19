from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        if key.strip() and key.strip() not in os.environ:
            os.environ[key.strip()] = value.strip().strip('"').strip("'")


def request_json(base_url: str, path: str, method: str = "GET", payload: dict | None = None, token: str = "") -> tuple[int, dict]:
    url = base_url.rstrip("/") + path
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Accept": "application/json"}
    if payload is not None:
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(body)
        except json.JSONDecodeError:
            parsed = {"success": False, "error": body}
        return exc.code, parsed


def first_orderable_package(games: list[dict]) -> tuple[dict, dict]:
    for game in games:
        packages = game.get("packages") or []
        for package in packages:
            if package.get("id") and package.get("isActive", True):
                return game, package
    raise RuntimeError("No active game package is available")


def record(rows: list[tuple[str, bool, str]], name: str, ok: bool, detail: str = "") -> None:
    rows.append((name, ok, detail))


def main() -> int:
    load_env_file(ROOT / ".env")
    parser = argparse.ArgumentParser(description="Phase 4 real order UAT for local or online backend.")
    parser.add_argument("--base-url", default=os.getenv("SMOKE_BASE_URL", "http://127.0.0.1:3000"))
    parser.add_argument("--create", action="store_true", help="Actually create a test order. Without this flag, only validates readiness.")
    parser.add_argument("--cancel", action="store_true", help="Cancel the created order through admin API when admin credentials are available.")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    rows: list[tuple[str, bool, str]] = []

    status, health = request_json(base_url, "/health")
    record(rows, "backend health", status == 200 and health.get("success") is True, f"status={status}")

    status, games_response = request_json(base_url, "/api/games")
    games = games_response.get("data") if isinstance(games_response.get("data"), list) else []
    record(rows, "load games", status == 200 and bool(games), f"status={status}, games={len(games)}")

    order_id = ""
    if games:
        try:
            game, package = first_orderable_package(games)
            record(rows, "select package", True, f"{game.get('name')} / {package.get('name')}")
        except Exception as exc:
            game, package = {}, {}
            record(rows, "select package", False, str(exc))

        if game and package and args.create:
            payload = {
                "gameId": game.get("id"),
                "packageId": package.get("id"),
                "gameName": game.get("name"),
                "packageName": package.get("name"),
                "price": float(package.get("price") or 0),
                "discountAmount": 0,
                "finalPrice": float(package.get("price") or 0),
                "platform": "Android",
                "customerNote": "PHASE4-UAT test order. Safe to cancel.",
                "contactMethod": "uat",
                "couponCode": "",
                "slipUrl": "",
                "slipVerified": 0,
            }
            status, created = request_json(base_url, "/api/orders", method="POST", payload=payload)
            order_id = (created.get("data") or {}).get("orderId", "")
            record(rows, "create order", status == 200 and order_id.startswith("ORD-"), f"status={status}, order={order_id or created.get('error')}")

            if order_id:
                track_path = "/api/orders/track?" + urllib.parse.urlencode({"orderId": order_id})
                status, tracked = request_json(base_url, track_path)
                tracked_id = (tracked.get("data") or {}).get("id", "")
                record(rows, "track order", status == 200 and tracked_id == order_id, f"status={status}, tracked={tracked_id}")

                if args.cancel:
                    username = os.getenv("ADMIN_USERNAME", "")
                    password = os.getenv("ADMIN_BOOTSTRAP_PASSWORD", "")
                    if username and password:
                        status, login = request_json(base_url, "/api/admin/login", method="POST", payload={"username": username, "password": password})
                        token = (login.get("data") or {}).get("token", "")
                        record(rows, "admin login", status == 200 and bool(token), f"status={status}")
                        if token:
                            status, cancelled = request_json(
                                base_url,
                                "/api/admin-orders",
                                method="POST",
                                payload={"orderId": order_id, "status": "cancelled"},
                                token=token,
                            )
                            record(rows, "cancel test order", status == 200 and cancelled.get("success") is True, f"status={status}")
                    else:
                        record(rows, "cancel test order", False, "admin credentials are not available")
        elif game and package:
            record(rows, "create order", True, "dry-run only; pass --create to create ORD test order")

    failed = [row for row in rows if not row[1]]
    for name, ok, detail in rows:
        status_text = "PASS" if ok else "FAIL"
        suffix = f" - {detail}" if detail else ""
        print(f"[{status_text}] {name}{suffix}")

    if failed:
        print(f"\nPhase 4 UAT failed: {len(failed)} check(s) need attention.")
        return 1
    print("\nPhase 4 UAT passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
