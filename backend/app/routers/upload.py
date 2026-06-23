from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
import os
import shutil
from pathlib import Path
from ..dependencies import verify_admin

router = APIRouter()

ROOT = Path(__file__).resolve().parent.parent.parent.parent
UPLOADS_DIR = ROOT / "uploads" / "game-images"

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), _=Depends(verify_admin)):
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
        
    safe_filename = "".join(c for c in file.filename if c.isalnum() or c in "._-")
    file_path = UPLOADS_DIR / safe_filename
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        
    return {
        "success": True,
        "url": f"/uploads/game-images/{safe_filename}",
        "fileName": safe_filename
    }
