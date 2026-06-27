from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CLI = ROOT / "node_modules" / "@google" / "design.md" / "dist" / "index.js"
DESIGN_FILE = ROOT / "DESIGN.md"


def find_node() -> str | None:
    candidates = [
        shutil.which("node"),
        r"C:\Program Files\nodejs\node.exe",
        Path.home() / ".cache" / "codex-runtimes" / "codex-primary-runtime" / "dependencies" / "node" / "bin" / "node.exe",
    ]
    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return str(candidate)
    return None


def main() -> int:
    node = find_node()
    if not node:
        print("Node.js was not found.")
        return 1
    if not CLI.exists() or not DESIGN_FILE.exists():
        print("Install dependencies and ensure DESIGN.md exists.")
        return 1

    env = os.environ.copy()
    env["PATH"] = str(Path(node).parent) + os.pathsep + env.get("PATH", "")
    return subprocess.run(
        [node, str(CLI), "lint", str(DESIGN_FILE)],
        cwd=ROOT,
        env=env,
    ).returncode


if __name__ == "__main__":
    sys.exit(main())
