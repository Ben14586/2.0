from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def npm_command() -> str:
    return shutil.which("npm.cmd" if os.name == "nt" else "npm") or ("npm.cmd" if os.name == "nt" else "npm")


def run_step(label: str, command: list[str]) -> int:
    print(f"\n== {label} ==")
    print(" ".join(command))
    completed = subprocess.run(command, cwd=ROOT, shell=False)
    if completed.returncode != 0:
        print(f"\nStopped at: {label}")
    return completed.returncode


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Connect a live backend URL, rebuild Netlify package, and verify online readiness."
    )
    parser.add_argument("backend_url", help="Live backend base URL, for example https://game-services-backend.onrender.com")
    parser.add_argument("--site-url", default="https://store-game-0.netlify.app", help="Public Netlify site URL")
    parser.add_argument("--skip-health", action="store_true", help="Pass through to configure:backend when the backend is sleeping")
    parser.add_argument("--admin", action="store_true", help="Also run admin smoke checks when admin credentials are configured")
    args = parser.parse_args()

    configure_command = [
        "python",
        "tools/configure_backend.py",
        args.backend_url,
        "--site-url",
        args.site_url,
    ]
    if args.skip_health:
        configure_command.append("--skip-health")

    npm = npm_command()
    steps = [
        ("configure backend and rebuild static package", configure_command),
        ("project QA", [npm, "run", "qa"]),
        ("online smoke test", ["python", "tools/smoke_test.py", "--base-url", args.backend_url]),
        ("phase 4 online dry run", ["python", "tools/phase4_order_uat.py", "--base-url", args.backend_url]),
        ("write production status", [npm, "run", "go-live:status"]),
    ]
    if args.admin:
        steps.insert(3, ("online admin smoke test", ["python", "tools/smoke_test.py", "--base-url", args.backend_url, "--admin"]))

    for label, command in steps:
        code = run_step(label, command)
        if code != 0:
            return code

    print("\nGo-live connection checks passed.")
    print("Upload the refreshed netlify-deploy-latest.zip to Netlify, then create one real browser order.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
