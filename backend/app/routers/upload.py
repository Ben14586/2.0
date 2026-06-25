from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
import os
import secrets
from pathlib import Path
from ..dependencies import verify_admin

router = APIRouter()

ROOT = Path(__file__).resolve().parent.parent.parent.parent
UPLOADS_DIR = ROOT / "uploads" / "game-images"
MAX_GAME_IMAGE_BYTES = int(os.getenv("MAX_GAME_IMAGE_BYTES", str(6 * 1024 * 1024)))
ALLOWED_IMAGE_TYPES = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
}

def detect_image_type(content: bytes) -> str:
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if content.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "webp"
    return ""

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), _=Depends(verify_admin)):
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty image")
    if len(content) > MAX_GAME_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image is too large")
    detected = detect_image_type(content)
    if detected not in {"png", "jpeg", "webp"}:
        raise HTTPException(status_code=400, detail="Invalid image")

    stem = "".join(c for c in Path(file.filename).stem.lower() if c.isalnum() or c in "-_")[:50] or "game-image"
    safe_filename = f"{stem}-{secrets.token_hex(6)}.{ALLOWED_IMAGE_TYPES[file.content_type]}"
    file_path = UPLOADS_DIR / safe_filename

    try:
        file_path.write_bytes(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    return {
        "success": True,
        "url": f"/uploads/game-images/{safe_filename}",
        "fileName": safe_filename
    }
