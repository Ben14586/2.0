from __future__ import annotations

import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "backend-deploy-latest.zip"

INCLUDE_FILES = (
    "Dockerfile",
    ".dockerignore",
    "render.yaml",
    "Procfile",
    "DESIGN.md",
)

INCLUDE_DIRS = (
    "backend-node/src",
    "dist",
    "uploads/game-images",
)

BACKEND_MANIFESTS = (
    "backend-node/package.json",
    "backend-node/package-lock.json",
)

FORBIDDEN_PARTS = {
    ".git",
    ".env",
    "node_modules",
    "backups",
    "slips",
    "tests",
    "__pycache__",
}

FORBIDDEN_SUFFIXES = {".db", ".sqlite", ".sqlite3", ".zip", ".pyc", ".log"}


def should_include(path: Path) -> bool:
    relative = path.relative_to(ROOT)
    if any(part in FORBIDDEN_PARTS for part in relative.parts):
        return False
    return path.suffix.lower() not in FORBIDDEN_SUFFIXES


def add_file(archive: zipfile.ZipFile, relative_name: str) -> None:
    path = ROOT / relative_name
    if not path.is_file():
        raise FileNotFoundError(f"Required deploy file is missing: {relative_name}")
    archive.write(path, relative_name)


def validate_archive() -> None:
    with zipfile.ZipFile(OUTPUT) as archive:
        names = set(archive.namelist())
        required = {
            "Dockerfile",
            "render.yaml",
            "backend-node/package.json",
            "backend-node/package-lock.json",
            "backend-node/src/server.js",
            "dist/index.html",
        }
        missing = sorted(required - names)
        unsafe = sorted(
            name for name in names
            if any(part in FORBIDDEN_PARTS for part in Path(name).parts)
            or Path(name).suffix.lower() in FORBIDDEN_SUFFIXES
        )
        if missing:
            raise RuntimeError(f"Deploy package is missing: {', '.join(missing)}")
        if unsafe:
            raise RuntimeError(f"Deploy package contains unsafe files: {', '.join(unsafe[:5])}")


def main() -> None:
    if OUTPUT.exists():
        OUTPUT.unlink()

    with zipfile.ZipFile(OUTPUT, "w", zipfile.ZIP_DEFLATED) as archive:
        for relative_name in (*INCLUDE_FILES, *BACKEND_MANIFESTS):
            add_file(archive, relative_name)

        for directory in INCLUDE_DIRS:
            base = ROOT / directory
            if not base.is_dir():
                raise FileNotFoundError(f"Required deploy directory is missing: {directory}")
            for path in base.rglob("*"):
                if path.is_file() and should_include(path):
                    archive.write(path, path.relative_to(ROOT).as_posix())

    validate_archive()
    with zipfile.ZipFile(OUTPUT) as archive:
        print(f"Backend deploy package: {OUTPUT}")
        print(f"Files: {len(archive.namelist())}")
        print(f"Size: {OUTPUT.stat().st_size} bytes")
        print("Validation: passed (Node backend, no databases, secrets, dependencies, tests, or slips)")


if __name__ == "__main__":
    main()
