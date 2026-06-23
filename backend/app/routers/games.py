from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional, Any
from ..database import get_db
from ..dependencies import verify_admin
import json
import secrets
from datetime import datetime

router = APIRouter()

# --- Pydantic Models ---

class CategoryModel(BaseModel):
    name: str
    slug: str

class PackageModel(BaseModel):
    id: str
    name: str
    price: float
    gameId: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    badge: Optional[str] = None
    isRecommended: bool
    items: List[str]
    highlights: List[str]
    delivery: Optional[str] = None
    support: Optional[str] = None
    guarantee: Optional[str] = None
    audience: Optional[str] = None
    adminNotes: Optional[str] = None
    isActive: Optional[bool] = None

class GameModel(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    supportedAndroid: bool
    supportedIos: bool
    warrantyDays: int
    warrantyNote: Optional[str] = None
    isFeatured: bool
    isActive: bool
    referenceTitle: Optional[str] = None
    playImage: Optional[str] = None
    playStore: Optional[str] = None
    catalogType: Optional[str] = None
    category: CategoryModel
    packages: List[PackageModel]
    banStatus: str
    banRiskPercentage: int
    screenshots: Optional[List[str]] = []
    videoUrl: Optional[str] = ""

class GamesResponse(BaseModel):
    success: bool
    data: List[GameModel]

class SaveGameRequest(BaseModel):
    id: Optional[str] = None
    name: str
    slug: Optional[str] = None
    description: str
    category_name: str
    category_slug: str
    supported_android: bool
    supported_ios: bool
    warranty_days: int
    warranty_note: str
    is_featured: bool
    is_active: bool
    play_image: Optional[str] = ""
    banStatus: Optional[str] = "safe"
    banRiskPercentage: Optional[int] = 0
    screenshots: Optional[List[str]] = []
    video_url: Optional[str] = ""

class SavePackageRequest(BaseModel):
    id: Optional[str] = None
    name: str
    game_id: str
    price: float
    subtitle: str
    description: str
    badge: str
    is_recommended: bool
    highlights: List[str]
    delivery: str
    support: str
    guarantee: str
    audience: str
    admin_notes: str
    is_active: bool

# --- Helpers ---

def parse_highlights(highlights_str):
    try:
        return json.loads(highlights_str) if highlights_str else []
    except Exception:
        return []

def package_view(row, is_admin=False):
    payload = {
        "id": row["id"],
        "name": row["name"],
        "price": row["price"],
        "gameId": row["game_id"],
        "subtitle": row["subtitle"],
        "description": row["description"],
        "badge": row["badge"],
        "isRecommended": bool(row["is_recommended"]),
        "items": parse_highlights(row["highlights"]),
        "highlights": parse_highlights(row["highlights"]),
        "delivery": row["delivery"],
        "support": row["support"],
        "guarantee": row["guarantee"],
        "audience": row["audience"]
    }
    if is_admin:
        payload["adminNotes"] = row["admin_notes"]
        payload["isActive"] = bool(row["is_active"])
    return payload

def game_view(row, packages):
    screenshots_raw = row["screenshots"] if "screenshots" in row.keys() else ""
    try:
        screenshots = json.loads(screenshots_raw) if screenshots_raw else []
    except Exception:
        screenshots = []
    
    return {
        "id": row["id"],
        "name": row["name"],
        "slug": row["slug"],
        "description": row["description"],
        "supportedAndroid": bool(row["supported_android"]),
        "supportedIos": bool(row["supported_ios"]),
        "warrantyDays": row["warranty_days"],
        "warrantyNote": row["warranty_note"],
        "isFeatured": bool(row["is_featured"]),
        "isActive": bool(row["is_active"]),
        "referenceTitle": row["reference_title"] if "reference_title" in row.keys() else "",
        "playImage": row["play_image"] if "play_image" in row.keys() else "",
        "playStore": row["play_store"] if "play_store" in row.keys() else "",
        "catalogType": row["catalog_type"] if "catalog_type" in row.keys() else "",
        "category": {"name": row["category_name"], "slug": row["category_slug"]},
        "banStatus": row["ban_status"] if "ban_status" in row.keys() else "safe",
        "banRiskPercentage": row["ban_risk_percentage"] if "ban_risk_percentage" in row.keys() else 0,
        "screenshots": screenshots,
        "videoUrl": row["video_url"] if "video_url" in row.keys() else "",
        "packages": packages
    }

# --- Routes ---

@router.get("/games", response_model=GamesResponse)
def get_public_games(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM games WHERE is_active = 1")
    game_rows = cursor.fetchall()
    games_data = []
    for g in game_rows:
        cursor.execute("SELECT * FROM packages WHERE game_id = ? AND is_active = 1", (g["id"],))
        packages = [package_view(p, is_admin=False) for p in cursor.fetchall()]
        games_data.append(game_view(g, packages))
    return {"success": True, "data": games_data}

@router.get("/admin-games", response_model=GamesResponse)
def get_admin_games(admin_user=Depends(verify_admin), db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM games")
    game_rows = cursor.fetchall()
    games_data = []
    for g in game_rows:
        cursor.execute("SELECT * FROM packages WHERE game_id = ?", (g["id"],))
        packages = [package_view(p, is_admin=True) for p in cursor.fetchall()]
        games_data.append(game_view(g, packages))
    return {"success": True, "data": games_data}

@router.post("/admin-games/{game_id}")
def update_game(game_id: str, game_data: GameModel, db=Depends(verify_admin)):
    return {"success": True}

class ScrapeRequest(BaseModel):
    url: str

@router.post("/admin-scrape-playstore")
def scrape_playstore(req: ScrapeRequest, db=Depends(verify_admin)):
    import urllib.parse
    try:
        from google_play_scraper import app as play_scraper_app
    except ImportError:
        raise HTTPException(status_code=500, detail="google-play-scraper library is not installed.")
        
    url = req.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
        
    app_id = url
    if "play.google.com" in url and "id=" in url:
        try:
            parsed = urllib.parse.urlparse(url)
            qs = urllib.parse.parse_qs(parsed.query)
            if "id" in qs:
                app_id = qs["id"][0]
        except Exception:
            pass

    try:
        result = play_scraper_app(app_id, lang='th', country='th')
        description = result.get('summary') or result.get('description', '')
        if len(description) > 250:
            description = description[:247] + '...'
            
        genre = result.get('genre', 'Mobile')
        
        screenshots = result.get('screenshots', []) or []
        video_url = result.get('video', '') or ''
        
        return {
            "success": True,
            "data": {
                "name": result.get('title', ''),
                "playImage": result.get('icon', ''),
                "description": description,
                "supportedAndroid": True,
                "playStore": f"https://play.google.com/store/apps/details?id={app_id}",
                "catalogType": genre,
                "screenshots": screenshots[:8],
                "videoUrl": video_url
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch data from Play Store: {str(e)}")

@router.post("/admin-games")
def save_admin_game(req: SaveGameRequest, admin_user=Depends(verify_admin), db=Depends(get_db)):
    cursor = db.cursor()
    game_id = req.id
    if not game_id:
        game_id = f"game-{secrets.token_hex(4)}"
        screenshots_json = json.dumps(req.screenshots or [], ensure_ascii=False)
        cursor.execute("""
            INSERT INTO games (
                id, name, slug, description, category_name, category_slug, 
                supported_android, supported_ios, warranty_days, warranty_note, 
                is_featured, is_active, play_image, ban_status, ban_risk_percentage,
                screenshots, video_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            game_id, req.name, req.slug or req.name.lower().replace(" ", "-"), req.description,
            req.category_name, req.category_slug, int(req.supported_android), int(req.supported_ios),
            req.warranty_days, req.warranty_note, int(req.is_featured), int(req.is_active), req.play_image,
            req.banStatus, req.banRiskPercentage, screenshots_json, req.video_url
        ))
    else:
        screenshots_json = json.dumps(req.screenshots or [], ensure_ascii=False)
        cursor.execute("""
            UPDATE games SET
                name=?, slug=?, description=?, category_name=?, category_slug=?,
                supported_android=?, supported_ios=?, warranty_days=?, warranty_note=?,
                is_featured=?, is_active=?, play_image=?, ban_status=?, ban_risk_percentage=?,
                screenshots=?, video_url=?
            WHERE id=?
        """, (
            req.name, req.slug, req.description, req.category_name, req.category_slug,
            int(req.supported_android), int(req.supported_ios), req.warranty_days, req.warranty_note,
            int(req.is_featured), int(req.is_active), req.play_image, req.banStatus, req.banRiskPercentage,
            screenshots_json, req.video_url, game_id
        ))
    db.commit()
    return {"success": True}

@router.post("/admin-packages")
def save_admin_package(req: SavePackageRequest, admin_user=Depends(verify_admin), db=Depends(get_db)):
    cursor = db.cursor()
    pkg_id = req.id
    highlights_json = json.dumps(req.highlights, ensure_ascii=False)
    
    if not pkg_id:
        pkg_id = f"pkg-{secrets.token_hex(4)}"
        cursor.execute("""
            INSERT INTO packages (
                id, game_id, name, price, subtitle, description, badge,
                is_recommended, highlights, delivery, support, guarantee,
                audience, admin_notes, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            pkg_id, req.game_id, req.name, req.price, req.subtitle, req.description,
            req.badge, int(req.is_recommended), highlights_json, req.delivery,
            req.support, req.guarantee, req.audience, req.admin_notes, int(req.is_active)
        ))
    else:
        cursor.execute("""
            UPDATE packages SET
                name=?, price=?, subtitle=?, description=?, badge=?,
                is_recommended=?, highlights=?, delivery=?, support=?,
                guarantee=?, audience=?, admin_notes=?, is_active=?
            WHERE id=?
        """, (
            req.name, req.price, req.subtitle, req.description, req.badge,
            int(req.is_recommended), highlights_json, req.delivery, req.support,
            req.guarantee, req.audience, req.admin_notes, int(req.is_active), pkg_id
        ))
    db.commit()
    return {"success": True}
