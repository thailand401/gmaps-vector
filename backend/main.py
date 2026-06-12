import sys
import os

# Add backend directory to path to import modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from typing import Optional, List
import logging

from config import supabase, settings
from models import (
    Category, CategoryCreate, CategoryUpdate,
    Intent, IntentCreate, IntentUpdate, IntentWithCategory,
    City, CityCreate, CityUpdate,
    District, DistrictCreate, DistrictUpdate,
    Street, StreetCreate, StreetUpdate,
    Position, PositionCreate, PositionUpdate,
)
from services.category_service import CategoryService
from services.intent_service import IntentService
from services.maps_service import MapsService

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Admin Dashboard API",
    description="CRUD API for managing categories and intents",
    version="1.0.0"
)

# API Key authentication middleware
class APIKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        path = request.url.path
        if path.startswith('/api/') and path != '/api/auth/verify':
            api_key = request.headers.get('X-API-Key', '')
            if api_key != settings.admin_api_key:
                return JSONResponse({"detail": "Unauthorized"}, status_code=401)
        return await call_next(request)

app.add_middleware(APIKeyMiddleware)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Auth verify endpoint (no key required)
@app.post("/api/auth/verify")
async def verify_api_key(body: dict = Body(...)):
    key = body.get("key", "")
    return {"valid": key == settings.admin_api_key}


# Map images listing
@app.get("/api/map-images")
async def get_map_images():
    images_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'admin', 'images')
    try:
        files = [f for f in os.listdir(images_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
        files.sort(key=lambda x: int(x.rsplit('.', 1)[0].split('_')[-1]) if x.rsplit('.', 1)[0].split('_')[-1].isdigit() else 0)
        return {"images": [f"images/{f}" for f in files]}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Images directory not found")


# Health check
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test Supabase connection by fetching one record
        result = supabase.table("Categories").select("id").limit(1).execute()
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Database connection failed")


# ==================== CATEGORIES ENDPOINTS ====================

@app.get("/api/categories", response_model=List[Category])
async def list_categories(search: Optional[str] = Query(None)):
    """Get all categories with optional search"""
    try:
        categories = await CategoryService.get_all_categories(search)
        return categories
    except Exception as e:
        logger.error(f"Error fetching categories: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/categories/{category_id}", response_model=Category)
async def get_category(category_id: int):
    """Get a single category by id"""
    try:
        category = await CategoryService.get_category_by_id(category_id)
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        return category
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching category: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/categories", response_model=Category)
async def create_category(category: CategoryCreate):
    """Create a new category"""
    try:
        new_category = await CategoryService.create_category(category)
        return new_category
    except Exception as e:
        logger.error(f"Error creating category: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/categories/{category_id}", response_model=Category)
async def update_category(category_id: int, category: CategoryUpdate):
    """Update an existing category"""
    try:
        updated = await CategoryService.update_category(category_id, category)
        return updated
    except Exception as e:
        logger.error(f"Error updating category: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/categories/{category_id}")
async def delete_category(category_id: int):
    """Delete a category"""
    try:
        await CategoryService.delete_category(category_id)
        return {"message": "Category deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting category: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== INTENTS ENDPOINTS ====================

@app.get("/api/intents", response_model=List[IntentWithCategory])
async def list_intents(
    search: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    priority: Optional[str] = Query(None)
):
    """Get all intents with optional filters"""
    try:
        intents = await IntentService.get_all_intents(search, category_id, priority)
        return intents
    except Exception as e:
        logger.error(f"Error fetching intents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/intents/{intent_id}", response_model=IntentWithCategory)
async def get_intent(intent_id: int):
    """Get a single intent by ID"""
    try:
        intent = await IntentService.get_intent_by_id(intent_id)
        if not intent:
            raise HTTPException(status_code=404, detail="Intent not found")
        return intent
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching intent: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/categories/{category_id}/intents", response_model=List[IntentWithCategory])
async def get_intents_by_category(category_id: int):
    """Get all intents for a specific category"""
    try:
        intents = await IntentService.get_intents_by_category(category_id)
        return intents
    except Exception as e:
        logger.error(f"Error fetching intents for category: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/intents", response_model=IntentWithCategory)
async def create_intent(intent: IntentCreate):
    """Create a new intent"""
    try:
        new_intent = await IntentService.create_intent(intent)
        return new_intent
    except Exception as e:
        logger.error(f"Error creating intent: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/intents/{intent_id}", response_model=IntentWithCategory)
async def update_intent(intent_id: int, intent: IntentUpdate):
    """Update an existing intent"""
    try:
        updated = await IntentService.update_intent(intent_id, intent)
        return updated
    except Exception as e:
        logger.error(f"Error updating intent: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/intents/{intent_id}")
async def delete_intent(intent_id: int):
    """Delete an intent"""
    try:
        await IntentService.delete_intent(intent_id)
        return {"message": "Intent deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting intent: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== MAPS ENDPOINTS ====================

@app.get("/api/cities", response_model=List[City])
async def list_cities():
    """Get all cities"""
    try:
        return await MapsService.get_all_cities()
    except Exception as e:
        logger.error(f"Error fetching cities: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/cities", response_model=City)
async def create_city(city: CityCreate):
    """Create a new city"""
    try:
        return await MapsService.create_city(city)
    except Exception as e:
        logger.error(f"Error creating city: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/cities/{city_id}", response_model=City)
async def get_city(city_id: int):
    try:
        city = await MapsService.get_city_by_id(city_id)
        if not city:
            raise HTTPException(status_code=404, detail="City not found")
        return city
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/cities/{city_id}", response_model=City)
async def update_city(city_id: int, city: CityUpdate):
    try:
        return await MapsService.update_city(city_id, city)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/cities/{city_id}")
async def delete_city(city_id: int):
    try:
        await MapsService.delete_city(city_id)
        return {"message": "City deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/districts", response_model=List[District])
async def list_districts(city_id: Optional[int] = Query(None)):
    """Get districts, optionally filtered by city_id"""
    try:
        return await MapsService.get_districts(city_id)
    except Exception as e:
        logger.error(f"Error fetching districts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/districts", response_model=District)
async def create_district(district: DistrictCreate):
    """Create a new district"""
    try:
        return await MapsService.create_district(district)
    except Exception as e:
        logger.error(f"Error creating district: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/districts/{district_id}", response_model=District)
async def get_district(district_id: int):
    try:
        district = await MapsService.get_district_by_id(district_id)
        if not district:
            raise HTTPException(status_code=404, detail="District not found")
        return district
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/districts/{district_id}", response_model=District)
async def update_district(district_id: int, district: DistrictUpdate):
    try:
        return await MapsService.update_district(district_id, district)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/districts/{district_id}")
async def delete_district(district_id: int):
    try:
        await MapsService.delete_district(district_id)
        return {"message": "District deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/streets", response_model=List[Street])
async def list_streets(
    district_id: Optional[int] = Query(None),
    city_id: Optional[int] = Query(None)
):
    """Get streets, optionally filtered by district_id or city_id"""
    try:
        return await MapsService.get_streets(district_id, city_id)
    except Exception as e:
        logger.error(f"Error fetching streets: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/streets/search")
async def search_streets(payload: dict = Body(...)):
    """Search streets by text.
    Payload: { text: str, district_id?: int, city_id?: int, limit?: int }
    Returns list of matches with score.
    """
    try:
        text = payload.get('text')
        if not text:
            raise HTTPException(status_code=422, detail='text is required')
        district_id = payload.get('district_id')
        city_id = payload.get('city_id')
        limit = int(payload.get('limit') or 10)
        results = await MapsService.search_streets_by_text(text, district_id=district_id, city_id=city_id, limit=limit)
        return { 'results': results }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching streets: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/streets", response_model=Street)
async def create_street(street: StreetCreate):
    """Create a new street. Returns 409 with {error:'duplicate', street:{id,name}} if similar exists."""
    try:
        return await MapsService.create_street(street)
    except Exception as e:
        msg = str(e)
        # Structured duplicate signal: "Failed to create street: DUPLICATE_STREET:<id>:<name>"
        inner = msg.replace("Failed to create street: ", "")
        if inner.startswith("DUPLICATE_STREET:"):
            parts = inner.split(":", 2)  # ["DUPLICATE_STREET", "<id>", "<name>"]
            dup_id   = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else None
            dup_name = parts[2] if len(parts) > 2 else ""
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=409,
                content={"error": "duplicate", "street": {"id": dup_id, "name": dup_name}}
            )
        logger.error(f"Error creating street: {msg}")
        raise HTTPException(status_code=500, detail=msg)


@app.get("/api/streets/{street_id}", response_model=Street)
async def get_street(street_id: int):
    try:
        street = await MapsService.get_street_by_id(street_id)
        if not street:
            raise HTTPException(status_code=404, detail="Street not found")
        return street
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/streets/{street_id}", response_model=Street)
async def update_street(street_id: int, street: StreetUpdate):
    try:
        return await MapsService.update_street(street_id, street)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/streets/{street_id}")
async def delete_street(street_id: int):
    try:
        await MapsService.delete_street(street_id)
        return {"message": "Street deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== POSITIONS ENDPOINTS ====================

@app.get("/api/positions", response_model=List[Position])
async def list_positions(street_id: Optional[int] = Query(None)):
    try:
        return await MapsService.get_positions(street_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/positions/{position_id}", response_model=Position)
async def get_position(position_id: int):
    try:
        pos = await MapsService.get_position_by_id(position_id)
        if not pos:
            raise HTTPException(status_code=404, detail="Position not found")
        return pos
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/positions", response_model=Position)
async def create_position(position: PositionCreate):
    try:
        return await MapsService.create_position(position)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/positions/bulk")
async def create_positions_bulk(payload: List[dict] = Body(...)):
    """Accepts a flat array of unique positions and upserts them.
    Expected payload: [{lat, lon, streets: [street_id, ...], pos_id?}, ...]
    pos_id present → UPDATE; absent → INSERT.
    """
    try:
        created = await MapsService.create_positions_bulk(payload)
        return {"created": created}
    except Exception as e:
        logger.error(f"Error creating positions bulk: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/positions/{position_id}", response_model=Position)
async def update_position(position_id: int, position: PositionUpdate):
    try:
        return await MapsService.update_position(position_id, position)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/positions/{position_id}")
async def delete_position(position_id: int):
    try:
        await MapsService.delete_position(position_id)
        return {"message": "Position deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/positions/{position_id}/cascade")
async def delete_position_cascade(position_id: int):
    try:
        await MapsService.delete_position_cascade(position_id)
        return {"message": "Position deleted and Streets updated"}
    except Exception as e:
        logger.error(f"Error deleting position cascade: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/search")
async def search_nearest(payload: dict = Body(...)):
    """Find the nearest DB position for each query point.
    Expected: {points: [{lat, lon}, ...]}  (1 or 2 points)
    Returns:  {data, label, warning, message}
    """
    try:
        points = payload.get("points") or []
        if not points:
            raise HTTPException(status_code=422, detail="points array is required")
        return await MapsService.search_nearest(points)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching nearest: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Serve admin static files (must be mounted last, after all API routes)
_admin_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'admin')
if os.path.isdir(_admin_dir):
    app.mount("/", StaticFiles(directory=_admin_dir, html=True), name="admin")


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=4000, log_level="info")
