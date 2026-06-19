from __future__ import annotations

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PYTHON = sys.executable


STEPS = [
    ("Package backend", [PYTHON, "tools/package_backend.py"]),
    ("Export static site", [PYTHON, "tools/export_static.py"]),
    ("QA check", [PYTHON, "tools/qa_check.py"]),
    ("Smoke test", [PYTHON, "tools/smoke_test.py"]),
    ("Phase 3 preflight", [PYTHON, "tools/phase3_preflight.py"]),
]


def main() -> int:
    for label, command in STEPS:
        print(f"\n== {label} ==")
        completed = subprocess.run(command, cwd=ROOT)
        if completed.returncode != 0:
            print(f"\nPhase 3 build stopped at: {label}")
            return completed.returncode
    print("\nPhase 3 build passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
