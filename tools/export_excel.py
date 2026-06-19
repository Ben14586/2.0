from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import server


def main():
    output_dir = ROOT / "exports"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "game-services-operations-latest.xlsx"

    conn = server.get_db()
    try:
        data = server.export_operations_excel(conn.cursor())
    finally:
        conn.close()

    output_path.write_bytes(data)
    print(f"Excel export: {output_path}")
    print(f"Size: {output_path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
