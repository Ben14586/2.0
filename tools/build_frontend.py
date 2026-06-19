from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
VITE_BIN = ROOT / "node_modules" / "vite" / "bin" / "vite.js"


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
        print("Node.js was not found. Install Node.js or add node.exe to PATH.")
        return 1
    if not VITE_BIN.exists():
        print("Vite is not installed. Run npm install first.")
        return 1

    env = os.environ.copy()
    env["PATH"] = str(Path(node).parent) + os.pathsep + env.get("PATH", "")
    return subprocess.run([node, str(VITE_BIN), "build"], cwd=ROOT, env=env).returncode


if __name__ == "__main__":
    sys.exit(main())
